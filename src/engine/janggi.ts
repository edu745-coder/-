/**
 * Korean Janggi (한국 장기) Game Rules Engine
 * Complete implementation of traditional Korean Chess rules:
 * - 9 files x 10 ranks (90 intersections)
 * - Pieces: Cho (楚 - Green/Blue) moves first, Han (漢 - Red) moves second (+1.5 Komi)
 * - Pieces: Gung (宮/王), Cha (車), Po (包), Ma (馬), Sang (象), Sa (士), Jol/Byeong (卒/兵)
 * - 4 Traditional Setups (포진/차림): 귀마(좌/우), 원앙마, 양귀마, 양귀상
 * - Strict Janggi rules:
 *   * Po cannot jump Po, cannot capture Po, needs exactly 1 bridge
 *   * Ma has 1 block point, Sang has 2 block points
 *   * Cha, Po, Jol can travel along palace diagonals
 *   * Passing turn (한수 쉼) is legal
 *   * Bik-Jang (빅장) detection
 *   * Check (장군) & Checkmate (외통수) detection
 *   * 1.5 Komi score calculation
 */

export type Side = 'cho' | 'han'; // cho: green/blue (bottom initially), han: red (top initially)

export type PieceType = 'GUNG' | 'CHA' | 'PO' | 'MA' | 'SANG' | 'SA' | 'JOL';

export type CharimType = 'gwima_left' | 'gwima_right' | 'wonangma' | 'yanggwima' | 'yanggwisang';

export interface Piece {
  id: string;
  type: PieceType;
  side: Side;
}

export interface Position {
  r: number; // 0 to 9
  c: number; // 0 to 8
}

export interface Move {
  from: Position;
  to: Position;
  piece: Piece;
  captured?: Piece;
  isPass?: boolean;
  notation?: string;
}

export type Board = (Piece | null)[][];

export const BOARD_ROWS = 10;
export const BOARD_COLS = 9;

export const PIECE_VALUES: Record<PieceType, number> = {
  CHA: 13,
  PO: 7,
  MA: 5,
  SANG: 3,
  SA: 3,
  JOL: 2,
  GUNG: 0,
};

export const CHARIM_NAMES: Record<CharimType, string> = {
  gwima_left: '귀마 (좌마우상)',
  gwima_right: '귀마 (우마좌상)',
  wonangma: '원앙마 (상마마상)',
  yanggwima: '양귀마 (마상상마)',
  yanggwisang: '양귀상 (상마상마)',
};

// Check if position is inside palace
export function isInPalace(r: number, c: number, side?: Side): boolean {
  if (c < 3 || c > 5) return false;
  if (side === 'han') return r >= 0 && r <= 2;
  if (side === 'cho') return r >= 7 && r <= 9;
  return (r >= 0 && r <= 2) || (r >= 7 && r <= 9);
}

// Palace diagonals definition
// Han palace: center is (1,4), corners (0,3), (0,5), (2,3), (2,5)
// Cho palace: center is (8,4), corners (7,3), (7,5), (9,3), (9,5)
export function isPalaceDiagonal(from: Position, to: Position): boolean {
  const isHanPalace = from.r <= 2 && to.r <= 2 && from.c >= 3 && from.c <= 5 && to.c >= 3 && to.c <= 5;
  const isChoPalace = from.r >= 7 && to.r >= 7 && from.c >= 3 && from.c <= 5 && to.c >= 3 && to.c <= 5;

  if (!isHanPalace && !isChoPalace) return false;

  const centerR = isHanPalace ? 1 : 8;
  const centerC = 4;

  // From center to corner
  if (from.r === centerR && from.c === centerC) {
    return Math.abs(to.r - centerR) === 1 && Math.abs(to.c - centerC) === 1;
  }
  // From corner to center
  if (to.r === centerR && to.c === centerC) {
    return Math.abs(from.r - centerR) === 1 && Math.abs(from.c - centerC) === 1;
  }
  // From corner to opposite corner through center
  if (
    Math.abs(from.r - centerR) === 1 &&
    Math.abs(from.c - centerC) === 1 &&
    to.r === centerR * 2 - from.r &&
    to.c === centerC * 2 - from.c
  ) {
    return true;
  }

  return false;
}

// Generate starting board with chosen Charim for Cho and Han
export function createInitialBoard(choCharim: CharimType = 'gwima_left', hanCharim: CharimType = 'gwima_left'): Board {
  const board: Board = Array(BOARD_ROWS)
    .fill(null)
    .map(() => Array(BOARD_COLS).fill(null));

  // Determine back row pieces for Han (row 0) and Cho (row 9)
  // Back row positions: 0: Cha, 1: ?, 2: ?, 3: Sa, 4: (King in row 1), 5: Sa, 6: ?, 7: ?, 8: Cha
  const getSetupPieces = (charim: CharimType): [PieceType, PieceType, PieceType, PieceType] => {
    switch (charim) {
      case 'gwima_left':
        return ['MA', 'SANG', 'SANG', 'MA']; // Left horse, right elephant
      case 'gwima_right':
        return ['SANG', 'MA', 'MA', 'SANG'];
      case 'wonangma':
        return ['SANG', 'MA', 'MA', 'SANG']; // Horses centralized
      case 'yanggwima':
        return ['MA', 'SANG', 'SANG', 'MA']; // Horses on outside
      case 'yanggwisang':
        return ['SANG', 'MA', 'SANG', 'MA'];
      default:
        return ['MA', 'SANG', 'SANG', 'MA'];
    }
  };

  const hanPieces = getSetupPieces(hanCharim);
  const choPieces = getSetupPieces(choCharim);

  // Han Setup (Red - top, rows 0 to 4)
  board[0][0] = { id: 'h_cha1', type: 'CHA', side: 'han' };
  board[0][1] = { id: 'h_pos1', type: hanPieces[0], side: 'han' };
  board[0][2] = { id: 'h_pos2', type: hanPieces[1], side: 'han' };
  board[0][3] = { id: 'h_sa1', type: 'SA', side: 'han' };
  board[0][5] = { id: 'h_sa2', type: 'SA', side: 'han' };
  board[0][6] = { id: 'h_pos3', type: hanPieces[2], side: 'han' };
  board[0][7] = { id: 'h_pos4', type: hanPieces[3], side: 'han' };
  board[0][8] = { id: 'h_cha2', type: 'CHA', side: 'han' };
  board[1][4] = { id: 'h_gung', type: 'GUNG', side: 'han' };
  board[2][1] = { id: 'h_po1', type: 'PO', side: 'han' };
  board[2][7] = { id: 'h_po2', type: 'PO', side: 'han' };
  for (let c = 0; c < 9; c += 2) {
    board[3][c] = { id: `h_byeong${c}`, type: 'JOL', side: 'han' };
  }

  // Cho Setup (Green/Blue - bottom, rows 5 to 9)
  for (let c = 0; c < 9; c += 2) {
    board[6][c] = { id: `c_jol${c}`, type: 'JOL', side: 'cho' };
  }
  board[7][1] = { id: 'c_po1', type: 'PO', side: 'cho' };
  board[7][7] = { id: 'c_po2', type: 'PO', side: 'cho' };
  board[8][4] = { id: 'c_gung', type: 'GUNG', side: 'cho' };
  board[9][0] = { id: 'c_cha1', type: 'CHA', side: 'cho' };
  board[9][1] = { id: 'c_pos1', type: choPieces[0], side: 'cho' };
  board[9][2] = { id: 'c_pos2', type: choPieces[1], side: 'cho' };
  board[9][3] = { id: 'c_sa1', type: 'SA', side: 'cho' };
  board[9][5] = { id: 'c_sa2', type: 'SA', side: 'cho' };
  board[9][6] = { id: 'c_pos3', type: choPieces[2], side: 'cho' };
  board[9][7] = { id: 'c_pos4', type: choPieces[3], side: 'cho' };
  board[9][8] = { id: 'c_cha2', type: 'CHA', side: 'cho' };

  return board;
}

// Clone board
export function cloneBoard(board: Board): Board {
  return board.map((row) => [...row]);
}

// Get pseudo-legal candidate moves for a piece at (r, c)
export function getPseudoLegalMoves(board: Board, r: number, c: number): Position[] {
  const piece = board[r][c];
  if (!piece) return [];
  const moves: Position[] = [];
  const side = piece.side;

  const addIfValid = (nr: number, nc: number) => {
    if (nr < 0 || nr >= BOARD_ROWS || nc < 0 || nc >= BOARD_COLS) return false;
    const dest = board[nr][nc];
    if (!dest) {
      moves.push({ r: nr, c: nc });
      return true; // continue sliding if empty
    }
    if (dest.side !== side) {
      // cannot capture Po with Po
      if (piece.type === 'PO' && dest.type === 'PO') {
        return false;
      }
      moves.push({ r: nr, c: nc });
    }
    return false; // hit a piece, stop sliding
  };

  switch (piece.type) {
    case 'GUNG':
    case 'SA': {
      // Must stay in palace. Orthogonal 1 step
      const dirs = [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ];
      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (isInPalace(nr, nc, side)) {
          const dest = board[nr][nc];
          if (!dest || dest.side !== side) {
            moves.push({ r: nr, c: nc });
          }
        }
      }
      // Diagonal in palace
      const isHanPalace = r <= 2;
      const centerR = isHanPalace ? 1 : 8;
      const centerC = 4;

      if (r === centerR && c === centerC) {
        // Can move to all 4 corners
        const corners = [
          [-1, -1],
          [-1, 1],
          [1, -1],
          [1, 1],
        ];
        for (const [dr, dc] of corners) {
          const nr = r + dr;
          const nc = c + dc;
          const dest = board[nr][nc];
          if (!dest || dest.side !== side) moves.push({ r: nr, c: nc });
        }
      } else if (Math.abs(r - centerR) === 1 && Math.abs(c - centerC) === 1) {
        // Corner can move to center
        const dest = board[centerR][centerC];
        if (!dest || dest.side !== side) moves.push({ r: centerR, c: centerC });
      }
      break;
    }

    case 'CHA': {
      // Orthogonal sliding in 4 directions
      const dirs = [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ];
      for (const [dr, dc] of dirs) {
        let nr = r + dr;
        let nc = c + dc;
        while (nr >= 0 && nr < BOARD_ROWS && nc >= 0 && nc < BOARD_COLS) {
          const dest = board[nr][nc];
          if (!dest) {
            moves.push({ r: nr, c: nc });
          } else {
            if (dest.side !== side) moves.push({ r: nr, c: nc });
            break;
          }
          nr += dr;
          nc += dc;
        }
      }

      // Palace diagonal sliding
      const isHan = r <= 2 && c >= 3 && c <= 5;
      const isCho = r >= 7 && c >= 3 && c <= 5;
      if (isHan || isCho) {
        const centerR = isHan ? 1 : 8;
        const centerC = 4;

        if (r === centerR && c === centerC) {
          // Center can move 1 step to any 4 corners
          const corners = [
            [-1, -1],
            [-1, 1],
            [1, -1],
            [1, 1],
          ];
          for (const [dr, dc] of corners) {
            const nr = r + dr;
            const nc = c + dc;
            const dest = board[nr][nc];
            if (!dest || dest.side !== side) moves.push({ r: nr, c: nc });
          }
        } else if (Math.abs(r - centerR) === 1 && Math.abs(c - centerC) === 1) {
          // Corner can move to center
          const centerDest = board[centerR][centerC];
          if (!centerDest) {
            moves.push({ r: centerR, c: centerC });
            // And can continue through center to opposite corner
            const oppR = centerR * 2 - r;
            const oppC = centerC * 2 - c;
            const oppDest = board[oppR][oppC];
            if (!oppDest || oppDest.side !== side) {
              moves.push({ r: oppR, c: oppC });
            }
          } else if (centerDest.side !== side) {
            moves.push({ r: centerR, c: centerC });
          }
        }
      }
      break;
    }

    case 'PO': {
      // Orthogonal jumping over exactly ONE piece (which is NOT a Po), and cannot capture a Po!
      const dirs = [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ];
      for (const [dr, dc] of dirs) {
        let nr = r + dr;
        let nc = c + dc;
        let foundBridge = false;

        while (nr >= 0 && nr < BOARD_ROWS && nc >= 0 && nc < BOARD_COLS) {
          const dest = board[nr][nc];
          if (!foundBridge) {
            if (dest) {
              // Po CANNOT use another Po as a bridge
              if (dest.type === 'PO') break;
              foundBridge = true;
            }
          } else {
            // After bridge:
            if (!dest) {
              moves.push({ r: nr, c: nc });
            } else {
              // Cannot capture a Po
              if (dest.side !== side && dest.type !== 'PO') {
                moves.push({ r: nr, c: nc });
              }
              break; // Cannot jump past a 2nd piece
            }
          }
          nr += dr;
          nc += dc;
        }
      }

      // Palace diagonal jumping
      const isHan = r <= 2 && c >= 3 && c <= 5;
      const isCho = r >= 7 && c >= 3 && c <= 5;
      if (isHan || isCho) {
        const centerR = isHan ? 1 : 8;
        const centerC = 4;
        // From corner jumping over center to opposite corner
        if (Math.abs(r - centerR) === 1 && Math.abs(c - centerC) === 1) {
          const bridge = board[centerR][centerC];
          if (bridge && bridge.type !== 'PO') {
            const oppR = centerR * 2 - r;
            const oppC = centerC * 2 - c;
            const oppDest = board[oppR][oppC];
            if (!oppDest || (oppDest.side !== side && oppDest.type !== 'PO')) {
              moves.push({ r: oppR, c: oppC });
            }
          }
        }
      }
      break;
    }

    case 'MA': {
      // 1 orthogonal + 1 diagonal outward
      // 4 orthogonal paths, each branching into 2 diagonals
      const maSteps = [
        { ortho: [-1, 0], diags: [[-2, -1], [-2, 1]] }, // Up
        { ortho: [1, 0], diags: [[2, -1], [2, 1]] },   // Down
        { ortho: [0, -1], diags: [[-1, -2], [1, -2]] }, // Left
        { ortho: [0, 1], diags: [[-1, 2], [1, 2]] },   // Right
      ];

      for (const step of maSteps) {
        const or = r + step.ortho[0];
        const oc = c + step.ortho[1];
        // Orthogonal block check ("멱")
        if (or >= 0 && or < BOARD_ROWS && oc >= 0 && oc < BOARD_COLS && !board[or][oc]) {
          for (const diag of step.diags) {
            const tr = r + diag[0];
            const tc = c + diag[1];
            if (tr >= 0 && tr < BOARD_ROWS && tc >= 0 && tc < BOARD_COLS) {
              const dest = board[tr][tc];
              if (!dest || dest.side !== side) {
                moves.push({ r: tr, c: tc });
              }
            }
          }
        }
      }
      break;
    }

    case 'SANG': {
      // 1 orthogonal + 2 diagonal outward (Sang moves 3 rows/cols)
      // Has TWO block points: the orthogonal step AND the 1st diagonal step!
      const sangSteps = [
        // Up
        {
          ortho: [-1, 0],
          branches: [
            { diag1: [-2, -1], dest: [-3, -2] },
            { diag1: [-2, 1], dest: [-3, 2] },
          ],
        },
        // Down
        {
          ortho: [1, 0],
          branches: [
            { diag1: [2, -1], dest: [3, -2] },
            { diag1: [2, 1], dest: [3, 2] },
          ],
        },
        // Left
        {
          ortho: [0, -1],
          branches: [
            { diag1: [-1, -2], dest: [-2, -3] },
            { diag1: [1, -2], dest: [2, -3] },
          ],
        },
        // Right
        {
          ortho: [0, 1],
          branches: [
            { diag1: [-1, 2], dest: [-2, 3] },
            { diag1: [1, 2], dest: [2, 3] },
          ],
        },
      ];

      for (const step of sangSteps) {
        const or = r + step.ortho[0];
        const oc = c + step.ortho[1];
        // 1st block point
        if (or >= 0 && or < BOARD_ROWS && oc >= 0 && oc < BOARD_COLS && !board[or][oc]) {
          for (const b of step.branches) {
            const d1r = r + b.diag1[0];
            const d1c = c + b.diag1[1];
            // 2nd block point
            if (d1r >= 0 && d1r < BOARD_ROWS && d1c >= 0 && d1c < BOARD_COLS && !board[d1r][d1c]) {
              const tr = r + b.dest[0];
              const tc = c + b.dest[1];
              if (tr >= 0 && tr < BOARD_ROWS && tc >= 0 && tc < BOARD_COLS) {
                const dest = board[tr][tc];
                if (!dest || dest.side !== side) {
                  moves.push({ r: tr, c: tc });
                }
              }
            }
          }
        }
      }
      break;
    }

    case 'JOL': {
      // Cho moves forward (r - 1), left (c - 1), right (c + 1)
      // Han moves forward (r + 1), left (c - 1), right (c + 1)
      const fwd = side === 'cho' ? -1 : 1;
      const jolDirs = [
        [fwd, 0],
        [0, -1],
        [0, 1],
      ];
      for (const [dr, dc] of jolDirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < BOARD_ROWS && nc >= 0 && nc < BOARD_COLS) {
          const dest = board[nr][nc];
          if (!dest || dest.side !== side) {
            moves.push({ r: nr, c: nc });
          }
        }
      }

      // In opponent's palace: can move forward diagonally along palace diagonals!
      const oppPalaceCenterR = side === 'cho' ? 1 : 8;
      const centerC = 4;
      const isEnteringOppPalace = side === 'cho' ? r <= 2 && c >= 3 && c <= 5 : r >= 7 && c >= 3 && c <= 5;

      if (isEnteringOppPalace) {
        if (r === (side === 'cho' ? 2 : 7) && (c === 3 || c === 5)) {
          // From palace entrance corners towards center
          const dest = board[oppPalaceCenterR][centerC];
          if (!dest || dest.side !== side) moves.push({ r: oppPalaceCenterR, c: centerC });
        } else if (r === oppPalaceCenterR && c === centerC) {
          // From center towards forward corners
          const forwardR = side === 'cho' ? 0 : 9;
          for (const targetC of [3, 5]) {
            const dest = board[forwardR][targetC];
            if (!dest || dest.side !== side) moves.push({ r: forwardR, c: targetC });
          }
        }
      }
      break;
    }
  }

  return moves;
}

// Find king position
export function findKing(board: Board, side: Side): Position | null {
  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const p = board[r][c];
      if (p && p.side === side && p.type === 'GUNG') {
        return { r, c };
      }
    }
  }
  return null;
}

// Check if King of given side is currently under attack (장군)
export function isCheck(board: Board, side: Side): boolean {
  const kingPos = findKing(board, side);
  if (!kingPos) return false;

  const opponentSide: Side = side === 'cho' ? 'han' : 'cho';

  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const piece = board[r][c];
      if (piece && piece.side === opponentSide) {
        const moves = getPseudoLegalMoves(board, r, c);
        if (moves.some((m) => m.r === kingPos.r && m.c === kingPos.c)) {
          return true;
        }
      }
    }
  }
  return false;
}

// Check if a move would leave the player's own King in check
export function doesMoveLeaveInCheck(board: Board, from: Position, to: Position, side: Side): boolean {
  const simulated = cloneBoard(board);
  const piece = simulated[from.r][from.c];
  simulated[to.r][to.c] = piece;
  simulated[from.r][from.c] = null;
  return isCheck(simulated, side);
}

// Get all legal moves for a piece at (r, c)
export function getLegalMoves(board: Board, r: number, c: number): Position[] {
  const piece = board[r][c];
  if (!piece) return [];
  const pseudoMoves = getPseudoLegalMoves(board, r, c);
  return pseudoMoves.filter((to) => !doesMoveLeaveInCheck(board, { r, c }, to, piece.side));
}

// Get all legal moves for the active side
export function getAllLegalMoves(board: Board, side: Side): Move[] {
  const allMoves: Move[] = [];
  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const piece = board[r][c];
      if (piece && piece.side === side) {
        const legalDestinations = getLegalMoves(board, r, c);
        for (const to of legalDestinations) {
          allMoves.push({
            from: { r, c },
            to,
            piece,
            captured: board[to.r][to.c] || undefined,
          });
        }
      }
    }
  }
  return allMoves;
}

// Checkmate (외통수) check
export function isCheckmate(board: Board, side: Side): boolean {
  if (!isCheck(board, side)) return false;
  return getAllLegalMoves(board, side).length === 0;
}

// Check Bik-Jang (빅장 - facing kings with no intervening pieces)
export function isBikJang(board: Board): boolean {
  const choKing = findKing(board, 'cho');
  const hanKing = findKing(board, 'han');
  if (!choKing || !hanKing) return false;

  // Must be in the exact same column
  if (choKing.c !== hanKing.c) return false;

  const col = choKing.c;
  const minR = Math.min(choKing.r, hanKing.r);
  const maxR = Math.max(choKing.r, hanKing.r);

  // Check if all squares between kings are empty
  for (let r = minR + 1; r < maxR; r++) {
    if (board[r][col] !== null) return false;
  }

  return true;
}

// Calculate remaining piece points for score determination (Komi: Han gets +1.5)
export function calculateScores(board: Board): { cho: number; han: number } {
  let choScore = 0;
  let hanScore = 1.5; // Komi (덤)

  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const p = board[r][c];
      if (p) {
        const val = PIECE_VALUES[p.type] || 0;
        if (p.side === 'cho') choScore += val;
        else hanScore += val;
      }
    }
  }

  return { cho: choScore, han: hanScore };
}

// Traditional Janggi move notation (e.g. "楚 77卒-67")
export function formatNotation(move: Move): string {
  if (move.isPass) {
    return `${move.piece.side === 'cho' ? '楚' : '漢'} 한수 쉼`;
  }
  const sideHanja = move.piece.side === 'cho' ? '楚' : '漢';
  const typeHanja: Record<PieceType, { cho: string; han: string }> = {
    GUNG: { cho: '楚', han: '漢' },
    CHA: { cho: '車', han: '車' },
    PO: { cho: '包', han: '包' },
    MA: { cho: '馬', han: '馬' },
    SANG: { cho: '象', han: '象' },
    SA: { cho: '士', han: '士' },
    JOL: { cho: '卒', han: '兵' },
  };

  const pieceName = typeHanja[move.piece.type][move.piece.side];
  const fromStr = `${move.from.r + 1}${move.from.c + 1}`;
  const action = move.captured ? 'x' : '-';
  const toStr = `${move.to.r + 1}${move.to.c + 1}`;

  return `${sideHanja} ${fromStr}${pieceName}${action}${toStr}`;
}
