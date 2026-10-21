/**
 * Full-stack Express + WebSocket Server for Korean Janggi (한국 장기)
 * Manages real-time online game rooms, quick matchmaking, setup synchronization,
 * authoritative move validation, chat, and spectators.
 */

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  Side,
  CharimType,
  Board,
  Move,
  createInitialBoard,
  getAllLegalMoves,
  isCheck,
  isCheckmate,
  calculateScores,
  formatNotation,
} from './src/engine/janggi.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({ server });

interface Player {
  ws: WebSocket;
  id: string;
  name: string;
  side: Side;
  charim: CharimType;
  ready: boolean;
  timeLeft: number; // in seconds
}

interface Spectator {
  ws: WebSocket;
  id: string;
  name: string;
}

interface Room {
  id: string;
  isPrivate: boolean;
  status: 'waiting' | 'setup' | 'playing' | 'ended';
  players: Map<string, Player>;
  spectators: Map<string, Spectator>;
  board: Board;
  turn: Side;
  turnCount: number;
  moves: Move[];
  lastMove?: Move;
  consecutivePasses: number;
  winner?: Side | 'draw';
  winReason?: string;
  drawOfferBy?: Side;
  choCharim: CharimType;
  hanCharim: CharimType;
  createdAt: number;
}

const rooms = new Map<string, Room>();
const clientToRoom = new Map<WebSocket, { roomId: string; playerId: string; isSpectator: boolean }>();

// Broadcast state to all participants in a room
function broadcastRoomState(room: Room) {
  const playersList = Array.from(room.players.values()).map((p) => ({
    id: p.id,
    name: p.name,
    side: p.side,
    charim: p.charim,
    ready: p.ready,
    timeLeft: p.timeLeft,
  }));

  const scores = calculateScores(room.board);

  const payload = JSON.stringify({
    type: 'room_state',
    room: {
      id: room.id,
      status: room.status,
      players: playersList,
      spectatorCount: room.spectators.size,
      board: room.board,
      turn: room.turn,
      turnCount: room.turnCount,
      lastMove: room.lastMove,
      moves: room.moves.map((m) => ({
        notation: m.notation || formatNotation(m),
        isPass: m.isPass,
        piece: m.piece,
      })),
      isCheck: isCheck(room.board, room.turn),
      winner: room.winner,
      winReason: room.winReason,
      drawOfferBy: room.drawOfferBy,
      scores,
    },
  });

  for (const player of room.players.values()) {
    if (player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(payload);
    }
  }

  for (const spectator of room.spectators.values()) {
    if (spectator.ws.readyState === WebSocket.OPEN) {
      spectator.ws.send(payload);
    }
  }
}

// Broadcast chat message
function broadcastChat(room: Room, senderName: string, text: string, side?: Side) {
  const payload = JSON.stringify({
    type: 'chat',
    sender: senderName,
    text,
    side,
    timestamp: Date.now(),
  });

  for (const player of room.players.values()) {
    if (player.ws.readyState === WebSocket.OPEN) player.ws.send(payload);
  }
  for (const spec of room.spectators.values()) {
    if (spec.ws.readyState === WebSocket.OPEN) spec.ws.send(payload);
  }
}

// Timer tick for active game
setInterval(() => {
  for (const room of rooms.values()) {
    if (room.status === 'playing') {
      const activePlayer = Array.from(room.players.values()).find((p) => p.side === room.turn);
      if (activePlayer) {
        activePlayer.timeLeft = Math.max(0, activePlayer.timeLeft - 1);
        if (activePlayer.timeLeft === 0) {
          // Time out! Opponent wins
          const oppSide: Side = room.turn === 'cho' ? 'han' : 'cho';
          room.winner = oppSide;
          room.winReason = '시간초과 승';
          room.status = 'ended';
          broadcastRoomState(room);
        }
      }
    }
  }
}, 1000);

// WebSocket connection handler
wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());

      switch (msg.type) {
        case 'join_room': {
          const { roomId, name = '무명기사', isPrivate = false, charim = 'gwima_left' } = msg;
          let room = rooms.get(roomId);

          if (!room) {
            // Create new room
            room = {
              id: roomId,
              isPrivate,
              status: 'waiting',
              players: new Map(),
              spectators: new Map(),
              board: createInitialBoard('gwima_left', 'gwima_left'),
              turn: 'cho',
              turnCount: 0,
              moves: [],
              consecutivePasses: 0,
              choCharim: 'gwima_left',
              hanCharim: 'gwima_left',
              createdAt: Date.now(),
            };
            rooms.set(roomId, room);
          }

          const playerId = `p_${Math.random().toString(36).substring(2, 8)}`;

          if (room.players.size === 0) {
            // First player is Cho (Green/Blue)
            const player: Player = {
              ws,
              id: playerId,
              name,
              side: 'cho',
              charim,
              ready: false,
              timeLeft: 300, // 5 minutes
            };
            room.players.set(playerId, player);
            room.choCharim = charim;
            clientToRoom.set(ws, { roomId, playerId, isSpectator: false });
            ws.send(JSON.stringify({ type: 'assigned_role', role: 'cho', playerId, roomId }));
          } else if (room.players.size === 1) {
            // Second player is Han (Red)
            const player: Player = {
              ws,
              id: playerId,
              name,
              side: 'han',
              charim,
              ready: false,
              timeLeft: 300,
            };
            room.players.set(playerId, player);
            room.hanCharim = charim;
            room.status = 'setup';
            clientToRoom.set(ws, { roomId, playerId, isSpectator: false });
            ws.send(JSON.stringify({ type: 'assigned_role', role: 'han', playerId, roomId }));
          } else {
            // Room is full -> join as spectator
            const specId = `spec_${Math.random().toString(36).substring(2, 8)}`;
            room.spectators.set(specId, { ws, id: specId, name });
            clientToRoom.set(ws, { roomId, playerId: specId, isSpectator: true });
            ws.send(JSON.stringify({ type: 'assigned_role', role: 'spectator', playerId: specId, roomId }));
          }

          broadcastRoomState(room);
          break;
        }

        case 'update_charim': {
          const mapping = clientToRoom.get(ws);
          if (!mapping || mapping.isSpectator) return;
          const room = rooms.get(mapping.roomId);
          if (!room || room.status === 'playing' || room.status === 'ended') return;

          const player = room.players.get(mapping.playerId);
          if (player) {
            player.charim = msg.charim;
            if (player.side === 'cho') room.choCharim = msg.charim;
            else room.hanCharim = msg.charim;
            // Update preview board
            room.board = createInitialBoard(room.choCharim, room.hanCharim);
            broadcastRoomState(room);
          }
          break;
        }

        case 'player_ready': {
          const mapping = clientToRoom.get(ws);
          if (!mapping || mapping.isSpectator) return;
          const room = rooms.get(mapping.roomId);
          if (!room || room.status === 'playing' || room.status === 'ended') return;

          const player = room.players.get(mapping.playerId);
          if (player) {
            player.ready = true;
            // If both players are ready, start game!
            const allReady = Array.from(room.players.values()).every((p) => p.ready) && room.players.size === 2;
            if (allReady) {
              room.status = 'playing';
              room.board = createInitialBoard(room.choCharim, room.hanCharim);
              room.turn = 'cho';
              room.turnCount = 1;
            }
            broadcastRoomState(room);
          }
          break;
        }

        case 'make_move': {
          const mapping = clientToRoom.get(ws);
          if (!mapping || mapping.isSpectator) return;
          const room = rooms.get(mapping.roomId);
          if (!room || room.status !== 'playing') return;

          const player = room.players.get(mapping.playerId);
          if (!player || player.side !== room.turn) return;

          const { from, to } = msg;
          const legalMoves = getAllLegalMoves(room.board, room.turn);
          const validMove = legalMoves.find(
            (m) => m.from.r === from.r && m.from.c === from.c && m.to.r === to.r && m.to.c === to.c
          );

          if (!validMove) {
            ws.send(JSON.stringify({ type: 'error', message: '유효하지 않은 장기 수입니다.' }));
            return;
          }

          // Execute move
          const piece = room.board[from.r][from.c]!;
          const captured = room.board[to.r][to.c] || undefined;
          room.board[to.r][to.c] = piece;
          room.board[from.r][from.c] = null;

          const executedMove: Move = {
            from,
            to,
            piece,
            captured,
            notation: formatNotation(validMove),
          };

          room.lastMove = executedMove;
          room.moves.push(executedMove);
          room.consecutivePasses = 0;
          room.turnCount++;

          const nextSide: Side = room.turn === 'cho' ? 'han' : 'cho';

          // Check for checkmate
          if (isCheckmate(room.board, nextSide)) {
            room.winner = room.turn;
            room.winReason = '외통승 (체크메이트)';
            room.status = 'ended';
          } else {
            room.turn = nextSide;
          }

          broadcastRoomState(room);
          break;
        }

        case 'pass_turn': {
          const mapping = clientToRoom.get(ws);
          if (!mapping || mapping.isSpectator) return;
          const room = rooms.get(mapping.roomId);
          if (!room || room.status !== 'playing') return;

          const player = room.players.get(mapping.playerId);
          if (!player || player.side !== room.turn) return;

          // Cannot pass if king is in check
          if (isCheck(room.board, room.turn)) {
            ws.send(JSON.stringify({ type: 'error', message: '장군 상태에서는 한수 쉼을 할 수 없습니다.' }));
            return;
          }

          room.consecutivePasses++;
          const passMove: Move = {
            from: { r: 0, c: 0 },
            to: { r: 0, c: 0 },
            piece: { id: 'pass', type: 'GUNG', side: room.turn },
            isPass: true,
            notation: `${room.turn === 'cho' ? '楚' : '漢'} 한수 쉼`,
          };
          room.moves.push(passMove);
          room.lastMove = passMove;

          // If two consecutive passes, game ends by score!
          if (room.consecutivePasses >= 2) {
            const scores = calculateScores(room.board);
            room.status = 'ended';
            if (scores.cho > scores.han) {
              room.winner = 'cho';
              room.winReason = `점수 판정승 (楚 ${scores.cho}점 : 漢 ${scores.han}점)`;
            } else if (scores.han > scores.cho) {
              room.winner = 'han';
              room.winReason = `점수 판정승 (漢 ${scores.han}점 : 楚 ${scores.cho}점)`;
            } else {
              room.winner = 'draw';
              room.winReason = '무승부 (동점)';
            }
          } else {
            room.turn = room.turn === 'cho' ? 'han' : 'cho';
          }

          broadcastRoomState(room);
          break;
        }

        case 'resign': {
          const mapping = clientToRoom.get(ws);
          if (!mapping || mapping.isSpectator) return;
          const room = rooms.get(mapping.roomId);
          if (!room || room.status !== 'playing') return;

          const player = room.players.get(mapping.playerId);
          if (player) {
            room.winner = player.side === 'cho' ? 'han' : 'cho';
            room.winReason = '상대 기권승';
            room.status = 'ended';
            broadcastRoomState(room);
          }
          break;
        }

        case 'offer_draw': {
          const mapping = clientToRoom.get(ws);
          if (!mapping || mapping.isSpectator) return;
          const room = rooms.get(mapping.roomId);
          if (!room || room.status !== 'playing') return;

          const player = room.players.get(mapping.playerId);
          if (player) {
            room.drawOfferBy = player.side;
            broadcastRoomState(room);
          }
          break;
        }

        case 'respond_draw': {
          const mapping = clientToRoom.get(ws);
          if (!mapping || mapping.isSpectator) return;
          const room = rooms.get(mapping.roomId);
          if (!room || room.status !== 'playing' || !room.drawOfferBy) return;

          const { accept } = msg;
          if (accept) {
            room.winner = 'draw';
            room.winReason = '상호 합의 무승부';
            room.status = 'ended';
          }
          room.drawOfferBy = undefined;
          broadcastRoomState(room);
          break;
        }

        case 'send_chat': {
          const mapping = clientToRoom.get(ws);
          if (!mapping) return;
          const room = rooms.get(mapping.roomId);
          if (!room) return;

          let senderName = '관전자';
          let side: Side | undefined;

          if (!mapping.isSpectator) {
            const player = room.players.get(mapping.playerId);
            if (player) {
              senderName = player.name;
              side = player.side;
            }
          } else {
            const spec = room.spectators.get(mapping.playerId);
            if (spec) senderName = spec.name;
          }

          broadcastChat(room, senderName, msg.text, side);
          break;
        }
      }
    } catch (e) {
      console.error('WS message error:', e);
    }
  });

  ws.on('close', () => {
    const mapping = clientToRoom.get(ws);
    if (!mapping) return;

    const room = rooms.get(mapping.roomId);
    if (room) {
      if (mapping.isSpectator) {
        room.spectators.delete(mapping.playerId);
      } else {
        const player = room.players.get(mapping.playerId);
        if (player) {
          if (room.status === 'playing') {
            room.winner = player.side === 'cho' ? 'han' : 'cho';
            room.winReason = '상대 접속 종료 기권승';
            room.status = 'ended';
          }
          room.players.delete(mapping.playerId);
        }
      }

      // Cleanup room if empty
      if (room.players.size === 0 && room.spectators.size === 0) {
        rooms.delete(mapping.roomId);
      } else {
        broadcastRoomState(room);
      }
    }

    clientToRoom.delete(ws);
  });
});

// REST API for public room list
app.get('/api/rooms', (_req, res) => {
  const publicRooms = Array.from(rooms.values())
    .filter((r) => !r.isPrivate)
    .map((r) => ({
      id: r.id,
      status: r.status,
      playerCount: r.players.size,
      spectatorCount: r.spectators.size,
      players: Array.from(r.players.values()).map((p) => ({ name: p.name, side: p.side })),
    }));
  res.json({ rooms: publicRooms });
});

// Quick match finder
app.get('/api/quick-match', (_req, res) => {
  for (const room of rooms.values()) {
    if (!room.isPrivate && room.status === 'waiting' && room.players.size === 1) {
      res.json({ roomId: room.id });
      return;
    }
  }
  // No waiting room -> generate new random room code
  const newRoomId = `천하-${Math.floor(1000 + Math.random() * 9000)}`;
  res.json({ roomId: newRoomId, isNew: true });
});

// Full-stack Vite / Static integration
if (!isProduction) {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

server.listen(PORT, () => {
  console.log(`천하장기 서버가 포트 ${PORT}에서 실행 중입니다.`);
});
