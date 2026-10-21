/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Board,
  Side,
  Position,
  Move,
  CharimType,
  createInitialBoard,
  getLegalMoves,
  getAllLegalMoves,
  isCheck,
  isCheckmate,
  calculateScores,
  formatNotation,
  cloneBoard,
} from './engine/janggi.ts';
import { findBestAIMove, AIDifficulty } from './engine/ai.ts';
import { sound } from './utils/sound.ts';
import { JanggiBoardView } from './components/JanggiBoardView.tsx';
import { PlayerInfoBar } from './components/PlayerInfoBar.tsx';
import { CharimSelectModal } from './components/CharimSelectModal.tsx';
import { RulesModal } from './components/RulesModal.tsx';
import { OnlineLobbyModal } from './components/OnlineLobbyModal.tsx';
import { ChatBox, ChatMessage } from './components/ChatBox.tsx';
import { MoveHistoryModal } from './components/MoveHistoryModal.tsx';
import { GameOverModal } from './components/GameOverModal.tsx';
import { TacticsPuzzleView } from './components/TacticsPuzzleView.tsx';
import {
  Volume2,
  VolumeX,
  BookOpen,
  RotateCcw,
  Flag,
  HandMetal,
  ScrollText,
  Users,
  Bot,
  Swords,
  Puzzle,
  ChevronRight,
  Shield,
  RotateCw,
  Share2,
} from 'lucide-react';

type GameMode = 'lobby' | 'online' | 'ai' | 'local' | 'puzzles';

export default function App() {
  // App state
  const [mode, setMode] = useState<GameMode>('lobby');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showRules, setShowRules] = useState(false);
  const [showOnlineLobby, setShowOnlineLobby] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showCharimModal, setShowCharimModal] = useState(false);

  // Player Settings
  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem('janggi_player_name') || `기사_${Math.floor(100 + Math.random() * 900)}`;
  });
  const [playerCharim, setPlayerCharim] = useState<CharimType>('gwima_left');
  const [aiCharim, setAiCharim] = useState<CharimType>('gwima_left');
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('intermediate');
  const [playerColor, setPlayerColor] = useState<Side>('cho');

  // Board and match state
  const [board, setBoard] = useState<Board>(() => createInitialBoard('gwima_left', 'gwima_left'));
  const [turn, setTurn] = useState<Side>('cho');
  const [selectedPos, setSelectedPos] = useState<Position | null>(null);
  const [legalMoves, setLegalMoves] = useState<Position[]>([]);
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [movesHistory, setMovesHistory] = useState<Move[]>([]);
  const [capturedPiecesCho, setCapturedPiecesCho] = useState<any[]>([]);
  const [capturedPiecesHan, setCapturedPiecesHan] = useState<any[]>([]);
  const [consecutivePasses, setConsecutivePasses] = useState(0);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [boardFlipped, setBoardFlipped] = useState(false);

  // Timers (in seconds)
  const [choTime, setChoTime] = useState(300);
  const [hanTime, setHanTime] = useState(300);

  // Game over state
  const [winner, setWinner] = useState<Side | 'draw' | null>(null);
  const [winReason, setWinReason] = useState<string>('');

  // Online Multiplayer State
  const [onlineRoomId, setOnlineRoomId] = useState<string | null>(null);
  const [myOnlineRole, setMyOnlineRole] = useState<Side | 'spectator' | null>(null);
  const [onlineStatus, setOnlineStatus] = useState<string>('disconnected');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [drawOfferedBy, setDrawOfferedBy] = useState<Side | null>(null);
  const [spectatorCount, setSpectatorCount] = useState(0);
  const [opponentName, setOpponentName] = useState('상대 대국자');
  const wsRef = useRef<WebSocket | null>(null);

  // Persist name
  useEffect(() => {
    localStorage.setItem('janggi_player_name', playerName);
  }, [playerName]);

  // Sync sound manager
  useEffect(() => {
    sound.enabled = soundEnabled;
  }, [soundEnabled]);

  // Turn Timer tick
  useEffect(() => {
    if (mode === 'lobby' || mode === 'puzzles' || winner !== null) return;
    if (mode === 'online') return; // Server handles online timer

    const interval = setInterval(() => {
      if (turn === 'cho') {
        setChoTime((t) => {
          if (t <= 1) {
            handleTimeout('cho');
            return 0;
          }
          return t - 1;
        });
      } else {
        setHanTime((t) => {
          if (t <= 1) {
            handleTimeout('han');
            return 0;
          }
          return t - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [mode, turn, winner]);

  // Timeout handler
  const handleTimeout = (timedOutSide: Side) => {
    const opp: Side = timedOutSide === 'cho' ? 'han' : 'cho';
    setWinner(opp);
    setWinReason(`${timedOutSide === 'cho' ? '초(楚)' : '한(漢)'} 시간초과 패`);
    sound.playVictory();
  };

  // Check URL params for room invite on initial mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      handleJoinOnlineRoom(roomParam, false);
    }
  }, []);

  // AI Turn Trigger
  useEffect(() => {
    if (mode === 'ai' && turn !== playerColor && winner === null && !isAiThinking) {
      setIsAiThinking(true);
      const delay = aiDifficulty === 'novice' ? 400 : aiDifficulty === 'intermediate' ? 700 : 900;

      const timer = setTimeout(() => {
        const aiMove = findBestAIMove(board, turn, aiDifficulty);
        if (aiMove) {
          executeMove(aiMove.from, aiMove.to);
        } else {
          // AI must pass
          handlePassTurn();
        }
        setIsAiThinking(false);
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [mode, turn, board, winner, isAiThinking, playerColor, aiDifficulty]);

  // Online WebSocket Connection
  const connectOnline = (roomId: string, isPrivate: boolean) => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setOnlineStatus('connected');
      ws.send(
        JSON.stringify({
          type: 'join_room',
          roomId,
          name: playerName,
          isPrivate,
          charim: playerCharim,
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case 'assigned_role': {
            setMyOnlineRole(msg.role);
            setOnlineRoomId(msg.roomId);
            if (msg.role === 'han') {
              setBoardFlipped(true);
            }
            setShowCharimModal(true);
            break;
          }

          case 'room_state': {
            const { room } = msg;
            setBoard(room.board);
            setTurn(room.turn);
            setSpectatorCount(room.spectatorCount || 0);

            // Update opponents
            const me = room.players.find((p: any) => p.id === (myOnlineRole === 'cho' ? 'p_cho' : 'p_han'));
            const opponent = room.players.find((p: any) => p.side !== myOnlineRole);
            if (opponent) setOpponentName(opponent.name);

            const pCho = room.players.find((p: any) => p.side === 'cho');
            const pHan = room.players.find((p: any) => p.side === 'han');
            if (pCho) setChoTime(pCho.timeLeft);
            if (pHan) setHanTime(pHan.timeLeft);

            if (room.lastMove) {
              setLastMove(room.lastMove);
              if (room.lastMove.captured) sound.playCapture();
              else sound.playMove();
            }

            if (room.isCheck) {
              sound.playCheck();
            }

            if (room.moves) {
              setMovesHistory(room.moves);
            }

            if (room.winner) {
              setWinner(room.winner);
              setWinReason(room.winReason || '대국 종료');
              sound.playVictory();
            }

            setDrawOfferedBy(room.drawOfferBy || null);

            if (room.status === 'playing') {
              setShowCharimModal(false);
            }
            break;
          }

          case 'chat': {
            setChatMessages((prev) => [
              ...prev,
              { sender: msg.sender, text: msg.text, side: msg.side, timestamp: msg.timestamp },
            ]);
            break;
          }

          case 'error': {
            // handle error
            break;
          }
        }
      } catch (err) {
        console.error('WS parse error:', err);
      }
    };

    ws.onclose = () => {
      setOnlineStatus('disconnected');
    };
  };

  // Start new local / AI match
  const startNewLocalOrAIMatch = (newMode: 'ai' | 'local') => {
    setMode(newMode);
    const initial = createInitialBoard(playerCharim, aiCharim);
    setBoard(initial);
    setTurn('cho');
    setSelectedPos(null);
    setLegalMoves([]);
    setLastMove(null);
    setMovesHistory([]);
    setCapturedPiecesCho([]);
    setCapturedPiecesHan([]);
    setConsecutivePasses(0);
    setChoTime(300);
    setHanTime(300);
    setWinner(null);
    setWinReason('');
    setBoardFlipped(playerColor === 'han');
  };

  // Handle Join Online Room
  const handleJoinOnlineRoom = (roomId: string, isPrivate: boolean) => {
    setMode('online');
    setShowOnlineLobby(false);
    setOnlineRoomId(roomId);
    setWinner(null);
    setWinReason('');
    setMovesHistory([]);
    setChatMessages([]);
    connectOnline(roomId, isPrivate);
  };

  // Piece Selection Handler
  const handleSelectPiece = (pos: Position) => {
    if (winner !== null) return;
    if (mode === 'online' && myOnlineRole !== turn) return;
    if (mode === 'ai' && turn !== playerColor) return;

    const piece = board[pos.r][pos.c];
    if (piece && piece.side === turn) {
      setSelectedPos(pos);
      const moves = getLegalMoves(board, pos.r, pos.c);
      setLegalMoves(moves);
    } else {
      setSelectedPos(null);
      setLegalMoves([]);
    }
  };

  // Move Execution
  const executeMove = (from: Position, to: Position) => {
    if (mode === 'online' && wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'make_move', from, to }));
      setSelectedPos(null);
      setLegalMoves([]);
      return;
    }

    const currentPiece = board[from.r][from.c]!;
    const captured = board[to.r][to.c] || undefined;

    const nextBoard = cloneBoard(board);
    nextBoard[to.r][to.c] = currentPiece;
    nextBoard[from.r][from.c] = null;

    const executedMove: Move = {
      from,
      to,
      piece: currentPiece,
      captured,
      notation: formatNotation({ from, to, piece: currentPiece, captured }),
    };

    if (captured) {
      sound.playCapture();
      if (captured.side === 'han') setCapturedPiecesCho((p) => [...p, captured]);
      else setCapturedPiecesHan((p) => [...p, captured]);
    } else {
      sound.playMove();
    }

    setBoard(nextBoard);
    setLastMove(executedMove);
    setMovesHistory((prev) => [...prev, executedMove]);
    setSelectedPos(null);
    setLegalMoves([]);
    setConsecutivePasses(0);

    const nextSide: Side = turn === 'cho' ? 'han' : 'cho';

    // Checkmate check
    if (isCheckmate(nextBoard, nextSide)) {
      setWinner(turn);
      setWinReason('외통승 (체크메이트)');
      sound.playVictory();
    } else {
      if (isCheck(nextBoard, nextSide)) {
        sound.playCheck();
      }
      setTurn(nextSide);
    }
  };

  // Pass Turn (한수 쉼)
  const handlePassTurn = () => {
    if (winner !== null) return;

    if (isCheck(board, turn)) {
      alert('장군 상태에서는 한수 쉼을 할 수 없습니다!');
      return;
    }

    sound.playPass();

    if (mode === 'online' && wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'pass_turn' }));
      return;
    }

    const passMove: Move = {
      from: { r: 0, c: 0 },
      to: { r: 0, c: 0 },
      piece: { id: 'pass', type: 'GUNG', side: turn },
      isPass: true,
      notation: `${turn === 'cho' ? '楚' : '漢'} 한수 쉼`,
    };

    setMovesHistory((prev) => [...prev, passMove]);
    setLastMove(passMove);

    const nextPassCount = consecutivePasses + 1;
    setConsecutivePasses(nextPassCount);

    if (nextPassCount >= 2) {
      // 2 consecutive passes: Determine winner by score!
      const scores = calculateScores(board);
      if (scores.cho > scores.han) {
        setWinner('cho');
        setWinReason(`점수 판정승 (楚 ${scores.cho.toFixed(1)}점 : 漢 ${scores.han.toFixed(1)}점)`);
      } else if (scores.han > scores.cho) {
        setWinner('han');
        setWinReason(`점수 판정승 (漢 ${scores.han.toFixed(1)}점 : 楚 ${scores.cho.toFixed(1)}점)`);
      } else {
        setWinner('draw');
        setWinReason('무승부 (동점)');
      }
      sound.playVictory();
    } else {
      setTurn(turn === 'cho' ? 'han' : 'cho');
    }
  };

  // Undo (무르기) in AI or local mode
  const handleUndo = () => {
    if (mode === 'online' || movesHistory.length === 0 || winner !== null) return;

    // In AI mode, undo 2 moves (AI move + player move)
    const stepsToUndo = mode === 'ai' ? 2 : 1;
    const newHistory = movesHistory.slice(0, Math.max(0, movesHistory.length - stepsToUndo));

    // Rebuild board from initial state
    let reconstructed = createInitialBoard(playerCharim, aiCharim);
    let currentTurn: Side = 'cho';
    const newChoCaptured: any[] = [];
    const newHanCaptured: any[] = [];

    for (const m of newHistory) {
      if (!m.isPass) {
        const p = reconstructed[m.from.r][m.from.c]!;
        const cap = reconstructed[m.to.r][m.to.c];
        if (cap) {
          if (cap.side === 'han') newChoCaptured.push(cap);
          else newHanCaptured.push(cap);
        }
        reconstructed[m.to.r][m.to.c] = p;
        reconstructed[m.from.r][m.from.c] = null;
      }
      currentTurn = currentTurn === 'cho' ? 'han' : 'cho';
    }

    setBoard(reconstructed);
    setMovesHistory(newHistory);
    setLastMove(newHistory.length > 0 ? newHistory[newHistory.length - 1] : null);
    setTurn(currentTurn);
    setCapturedPiecesCho(newChoCaptured);
    setCapturedPiecesHan(newHanCaptured);
    setSelectedPos(null);
    setLegalMoves([]);
  };

  // Resign (기권)
  const handleResign = () => {
    if (winner !== null) return;
    if (!window.confirm('정말 기권하시겠습니까?')) return;

    if (mode === 'online' && wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'resign' }));
    } else {
      const opp = turn === 'cho' ? 'han' : 'cho';
      setWinner(opp);
      setWinReason('상대 기권승');
      sound.playVictory();
    }
  };

  // Draw Offer
  const handleOfferDraw = () => {
    if (mode === 'online' && wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'offer_draw' }));
    } else {
      if (window.confirm('무승부로 경기를 끝내시겠습니까?')) {
        setWinner('draw');
        setWinReason('상호 합의 무승부');
        sound.playVictory();
      }
    }
  };

  // Respond to Online Draw Offer
  const handleRespondDraw = (accept: boolean) => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'respond_draw', accept }));
    }
    setDrawOfferedBy(null);
  };

  // Send Chat message
  const handleSendMessage = (text: string) => {
    if (mode === 'online' && wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'send_chat', text }));
    } else {
      // Local chat note
      setChatMessages((prev) => [
        ...prev,
        { sender: playerName, text, side: turn, timestamp: Date.now() },
      ]);
    }
  };

  // Confirm Charim Selection
  const handleConfirmCharim = () => {
    if (mode === 'online' && wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'update_charim', charim: playerCharim }));
      wsRef.current.send(JSON.stringify({ type: 'player_ready' }));
    }
    setShowCharimModal(false);
  };

  // Copy share invite link
  const handleCopyInviteLink = () => {
    if (!onlineRoomId) return;
    const url = `${window.location.origin}${window.location.pathname}?room=${onlineRoomId}`;
    navigator.clipboard.writeText(url);
    alert('대국 초대 링크가 복사되었습니다! 친구에게 전달하여 접속하게 하세요.');
  };

  const scores = calculateScores(board);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-500/30">
      {/* Universal Top Bar Contract: 3 Zones */}
      <header className="sticky top-0 z-40 bg-stone-900/95 backdrop-blur-md border-b border-stone-800 px-4 py-2.5 flex items-center justify-between gap-4">
        {/* Zone 1: Single text element wordmark */}
        <div
          onClick={() => setMode('lobby')}
          className="cursor-pointer flex items-center gap-2 shrink-0 select-none"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center font-black text-stone-950 text-base shadow border border-amber-400">
            將
          </div>
          <span
            className="text-base sm:text-lg font-black tracking-tight text-amber-100 whitespace-nowrap"
            style={{ fontFamily: "'Noto Serif KR', serif" }}
          >
            천하장기 (天下將棋)
          </span>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden sm:flex items-center gap-5 text-xs font-semibold text-stone-400">
          <button
            type="button"
            onClick={() => setMode('lobby')}
            className={`transition-colors whitespace-nowrap ${
              mode === 'lobby' ? 'text-amber-400 font-bold' : 'hover:text-stone-100'
            }`}
          >
            대국 로비
          </button>
          <button
            type="button"
            onClick={() => setShowOnlineLobby(true)}
            className={`transition-colors whitespace-nowrap ${
              mode === 'online' ? 'text-amber-400 font-bold' : 'hover:text-stone-100'
            }`}
          >
            온라인 대국
          </button>
          <button
            type="button"
            onClick={() => startNewLocalOrAIMatch('ai')}
            className={`transition-colors whitespace-nowrap ${
              mode === 'ai' ? 'text-amber-400 font-bold' : 'hover:text-stone-100'
            }`}
          >
            AI 인공지능
          </button>
          <button
            type="button"
            onClick={() => setMode('puzzles')}
            className={`transition-colors whitespace-nowrap ${
              mode === 'puzzles' ? 'text-amber-400 font-bold' : 'hover:text-stone-100'
            }`}
          >
            묘수풀이
          </button>
        </nav>

        {/* Zone 3: Primary Utility Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            aria-label={soundEnabled ? '효과음 끄기' : '효과음 켜기'}
            className="p-2 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-stone-300 transition-colors"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-stone-500" />}
          </button>
          <button
            type="button"
            onClick={() => setShowRules(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 transition-colors whitespace-nowrap"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xs:inline">규칙 안내</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-4xl mx-auto p-2 sm:p-4 flex flex-col items-center justify-start">
        {/* LOBBY VIEW */}
        {mode === 'lobby' && (
          <div className="w-full max-w-2xl space-y-6 py-4 animate-in fade-in">
            {/* Hero Banner with Generated Cover Art */}
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-stone-800 aspect-[16/9] flex items-end p-5 sm:p-8">
              <img
                src="/src/assets/images/janggi_cover_art_1792546893513.jpg"
                alt="전통 한국 장기"
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/60 to-transparent" />
              <div className="relative z-10 space-y-2 max-w-lg">
                <span className="text-amber-400 font-bold text-xs tracking-wider uppercase">
                  정통 한국 장기 (Korean Chess)
                </span>
                <h1
                  className="text-2xl sm:text-4xl font-black text-stone-100 tracking-tight"
                  style={{ fontFamily: "'Noto Serif KR', serif" }}
                >
                  지략과 수읽기의 정점,<br />천하장기 온라인
                </h1>
                <p className="text-stone-300 text-xs sm:text-sm leading-relaxed">
                  마(馬)와 상(象)의 포진 선택, 멱의 법칙, 1.5점 덤 규칙이 살아 숨 쉬는 모바일 최적화 실시간 대국
                </p>
              </div>
            </div>

            {/* Nickname Setting Bar */}
            <div className="bg-stone-900 border border-stone-800 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-xs text-stone-400 font-medium">나의 대국 닉네임</div>
                <div className="font-bold text-stone-100 text-sm">{playerName}</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const newName = prompt('새로운 대국 닉네임을 입력하세요:', playerName);
                  if (newName && newName.trim()) setPlayerName(newName.trim());
                }}
                className="px-3.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-xl self-start sm:self-auto transition-colors"
              >
                닉네임 변경
              </button>
            </div>

            {/* Game Mode Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Online Mode */}
              <div
                onClick={() => setShowOnlineLobby(true)}
                className="group p-5 bg-gradient-to-br from-stone-900 to-stone-900/60 border border-stone-800 hover:border-emerald-500/60 rounded-3xl cursor-pointer shadow-lg hover:shadow-emerald-950/30 transition-all flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Users className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-bold text-stone-100 group-hover:text-emerald-400 transition-colors">
                    실시간 온라인 대국
                  </h2>
                  <p className="text-xs text-stone-400 leading-relaxed">
                    전국의 기사들과 실시간으로 맞붙는 빠른 대국 및 친구 초대 비밀방 대국
                  </p>
                </div>
                <div className="pt-4 flex items-center text-xs font-bold text-emerald-400">
                  <span>대국실 입장하기</span>
                  <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* AI Match Mode */}
              <div
                onClick={() => startNewLocalOrAIMatch('ai')}
                className="group p-5 bg-gradient-to-br from-stone-900 to-stone-900/60 border border-stone-800 hover:border-amber-500/60 rounded-3xl cursor-pointer shadow-lg hover:shadow-amber-950/30 transition-all flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Bot className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-bold text-stone-100 group-hover:text-amber-400 transition-colors">
                    인공지능(AI) 대국
                  </h2>
                  <p className="text-xs text-stone-400 leading-relaxed">
                    초급, 중급, 고급 난이도의 스마트 장기 인공지능과 무르기 연습 대국
                  </p>
                </div>
                <div className="pt-4 flex items-center text-xs font-bold text-amber-400">
                  <span>AI 대국 시작</span>
                  <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Local Pass & Play */}
              <div
                onClick={() => startNewLocalOrAIMatch('local')}
                className="group p-5 bg-gradient-to-br from-stone-900 to-stone-900/60 border border-stone-800 hover:border-blue-500/60 rounded-3xl cursor-pointer shadow-lg hover:shadow-blue-950/30 transition-all flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <Swords className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-bold text-stone-100 group-hover:text-blue-400 transition-colors">
                    친구와 한 화면 대국
                  </h2>
                  <p className="text-xs text-stone-400 leading-relaxed">
                    스마트폰이나 태블릿을 사이에 두고 친구와 번갈아 착수하는 오프라인 1:1 대국
                  </p>
                </div>
                <div className="pt-4 flex items-center text-xs font-bold text-blue-400">
                  <span>로컬 대국 시작</span>
                  <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Tactics Puzzles */}
              <div
                onClick={() => setMode('puzzles')}
                className="group p-5 bg-gradient-to-br from-stone-900 to-stone-900/60 border border-stone-800 hover:border-purple-500/60 rounded-3xl cursor-pointer shadow-lg hover:shadow-purple-950/30 transition-all flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                    <Puzzle className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-bold text-stone-100 group-hover:text-purple-400 transition-colors">
                    장기 묘수풀이
                  </h2>
                  <p className="text-xs text-stone-400 leading-relaxed">
                    궁성 돌파, 양차 연타, 마포 연계 등 엄선된 외통수 실전 묘수 문제 풀이
                  </p>
                </div>
                <div className="pt-4 flex items-center text-xs font-bold text-purple-400">
                  <span>묘수풀이 도전</span>
                  <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TACTICS PUZZLE VIEW */}
        {mode === 'puzzles' && <TacticsPuzzleView onBackToLobby={() => setMode('lobby')} />}

        {/* ACTIVE GAME VIEW (Online / AI / Local) */}
        {(mode === 'online' || mode === 'ai' || mode === 'local') && (
          <div className="w-full flex flex-col items-center space-y-2 sm:space-y-3 pb-24">
            {/* Top Match Bar / Room Info */}
            <div className="w-full max-w-[500px] flex items-center justify-between text-xs text-stone-400 px-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-stone-300">
                  {mode === 'online'
                    ? `온라인 대국 [${onlineRoomId}]`
                    : mode === 'ai'
                    ? `AI 대국 (${aiDifficulty === 'novice' ? '초급' : aiDifficulty === 'intermediate' ? '중급' : '고급'})`
                    : '1:1 로컬 대국'}
                </span>
                {mode === 'online' && (
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/50 px-1.5 py-0.2 rounded border border-emerald-800">
                    관전 {spectatorCount}명
                  </span>
                )}
                {isAiThinking && (
                  <span className="text-[10px] text-amber-300 bg-amber-950/50 px-1.5 py-0.2 rounded border border-amber-800 animate-pulse">
                    AI 수읽기 중...
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {mode === 'online' && onlineRoomId && (
                  <button
                    type="button"
                    onClick={handleCopyInviteLink}
                    className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300"
                  >
                    <Share2 className="w-3.5 h-3.5" /> 초대 링크
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowCharimModal(true)}
                  className="hover:text-stone-200"
                >
                  포진 설정
                </button>
                <button
                  type="button"
                  onClick={() => setBoardFlipped(!boardFlipped)}
                  aria-label="보드 180도 회전"
                  className="p-1 hover:text-stone-200"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Draw Offer Banner in Online Mode */}
            {drawOfferedBy && drawOfferedBy !== myOnlineRole && (
              <div className="w-full max-w-[500px] bg-amber-950/80 border border-amber-500 p-2.5 rounded-xl flex items-center justify-between text-xs">
                <span className="text-amber-200 font-bold">상대방이 무승부를 제안했습니다.</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleRespondDraw(true)}
                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg"
                  >
                    수락
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRespondDraw(false)}
                    className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg"
                  >
                    거절
                  </button>
                </div>
              </div>
            )}

            {/* Top Player Info Bar (Han when normal, Cho when flipped) */}
            <PlayerInfoBar
              side={boardFlipped ? 'cho' : 'han'}
              name={
                boardFlipped
                  ? mode === 'online' && myOnlineRole === 'cho'
                    ? playerName
                    : '초(楚) 대국자'
                  : mode === 'online'
                  ? opponentName
                  : mode === 'ai'
                  ? '인공지능 (漢)'
                  : '한(漢) 대국자'
              }
              isCurrentTurn={turn === (boardFlipped ? 'cho' : 'han')}
              score={boardFlipped ? scores.cho : scores.han}
              timeLeft={boardFlipped ? choTime : hanTime}
              capturedPieces={boardFlipped ? capturedPiecesCho : capturedPiecesHan}
              charim={boardFlipped ? playerCharim : aiCharim}
              isCheck={isCheck(board, boardFlipped ? 'cho' : 'han')}
            />

            {/* The Janggi Wooden Board */}
            <JanggiBoardView
              board={board}
              selectedPos={selectedPos}
              legalMoves={legalMoves}
              lastMove={lastMove}
              turn={turn}
              flipped={boardFlipped}
              onSelectPiece={handleSelectPiece}
              onMakeMove={executeMove}
              disabled={winner !== null || (mode === 'ai' && turn !== playerColor)}
            />

            {/* Bottom Player Info Bar (Cho when normal, Han when flipped) */}
            <PlayerInfoBar
              side={boardFlipped ? 'han' : 'cho'}
              name={
                boardFlipped
                  ? mode === 'online' && myOnlineRole === 'han'
                    ? playerName
                    : '한(漢) 대국자'
                  : mode === 'online' && myOnlineRole === 'cho'
                  ? playerName
                  : mode === 'ai'
                  ? `${playerName} (楚)`
                  : '초(楚) 대국자'
              }
              isCurrentTurn={turn === (boardFlipped ? 'han' : 'cho')}
              score={boardFlipped ? scores.han : scores.cho}
              timeLeft={boardFlipped ? hanTime : choTime}
              capturedPieces={boardFlipped ? capturedPiecesHan : capturedPiecesCho}
              charim={boardFlipped ? aiCharim : playerCharim}
              isCheck={isCheck(board, boardFlipped ? 'han' : 'cho')}
            />

            {/* Chat Box (for online or local emote sharing) */}
            <div className="w-full max-w-[500px]">
              <ChatBox messages={chatMessages} onSendMessage={handleSendMessage} />
            </div>
          </div>
        )}
      </main>

      {/* Sticky Bottom Action Bar for Natural Thumb Zone Ergonomics */}
      {(mode === 'online' || mode === 'ai' || mode === 'local') && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-stone-900/95 backdrop-blur-md border-t border-stone-800 p-2 sm:p-3">
          <div className="max-w-[500px] mx-auto grid grid-cols-5 gap-1.5">
            {/* 1. Pass Turn (한수 쉼) */}
            <button
              type="button"
              onClick={handlePassTurn}
              disabled={winner !== null || (mode === 'online' && myOnlineRole !== turn)}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-stone-200 transition-colors"
            >
              <HandMetal className="w-4 h-4 text-amber-400 mb-0.5" />
              <span className="text-[11px] font-bold">한수 쉼</span>
            </button>

            {/* 2. Undo Move (무르기) */}
            <button
              type="button"
              onClick={handleUndo}
              disabled={mode === 'online' || movesHistory.length === 0 || winner !== null}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-30 text-stone-200 transition-colors"
            >
              <RotateCcw className="w-4 h-4 text-blue-400 mb-0.5" />
              <span className="text-[11px] font-bold">무르기</span>
            </button>

            {/* 3. Offer Draw (무승부) */}
            <button
              type="button"
              onClick={handleOfferDraw}
              disabled={winner !== null}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-stone-200 transition-colors"
            >
              <Shield className="w-4 h-4 text-emerald-400 mb-0.5" />
              <span className="text-[11px] font-bold">무승부</span>
            </button>

            {/* 4. Resign (기권) */}
            <button
              type="button"
              onClick={handleResign}
              disabled={winner !== null}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-stone-200 transition-colors"
            >
              <Flag className="w-4 h-4 text-rose-400 mb-0.5" />
              <span className="text-[11px] font-bold">기권</span>
            </button>

            {/* 5. Move History (기보) */}
            <button
              type="button"
              onClick={() => setShowHistory(true)}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 transition-colors"
            >
              <ScrollText className="w-4 h-4 text-amber-300 mb-0.5" />
              <span className="text-[11px] font-bold">기보</span>
            </button>
          </div>
        </div>
      )}

      {/* Charim (Setup) Selection Modal */}
      {showCharimModal && (
        <CharimSelectModal
          side={myOnlineRole === 'han' ? 'han' : playerColor}
          selectedCharim={playerCharim}
          onSelectCharim={(c) => {
            setPlayerCharim(c);
            if (mode !== 'online') {
              setBoard(createInitialBoard(c, aiCharim));
            }
          }}
          onConfirm={handleConfirmCharim}
        />
      )}

      {/* Rules Modal */}
      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />

      {/* Online Lobby Modal */}
      <OnlineLobbyModal
        isOpen={showOnlineLobby}
        playerName={playerName}
        onClose={() => setShowOnlineLobby(false)}
        onJoinRoom={handleJoinOnlineRoom}
        onUpdateName={setPlayerName}
      />

      {/* Move History Modal */}
      <MoveHistoryModal
        isOpen={showHistory}
        moves={movesHistory}
        onClose={() => setShowHistory(false)}
      />

      {/* Game Over Modal */}
      {winner && (
        <GameOverModal
          winner={winner}
          winReason={winReason}
          choScore={scores.cho}
          hanScore={scores.han}
          playerSide={mode === 'online' && myOnlineRole !== 'spectator' ? myOnlineRole || undefined : playerColor}
          onRematch={() => {
            if (mode === 'online' && onlineRoomId) {
              handleJoinOnlineRoom(onlineRoomId, false);
            } else {
              startNewLocalOrAIMatch(mode as 'ai' | 'local');
            }
          }}
          onGoLobby={() => {
            setWinner(null);
            setMode('lobby');
          }}
        />
      )}
    </div>
  );
}
