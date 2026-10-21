/**
 * Korean Janggi AI Engine
 * Provides multi-difficulty AI bot (초급, 중급, 고급) using Alpha-Beta Minimax search
 * with Korean Janggi positional heuristics, piece coordination, and move ordering.
 */

import {
  Board,
  Side,
  Move,
  Position,
  PIECE_VALUES,
  getAllLegalMoves,
  cloneBoard,
  isCheck,
  isCheckmate,
  calculateScores,
} from './janggi.ts';

export type AIDifficulty = 'novice' | 'intermediate' | 'master';

// Positional bonuses based on board coordinates
// Encourage forward mobility for soldiers, centralization for horses, guard proximity to king
function evaluatePosition(board: Board, side: Side): number {
  let score = 0;
  const isCho = side === 'cho';

  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const piece = board[r][c];
      if (!piece) continue;

      const baseVal = PIECE_VALUES[piece.type] * 100;
      let positionalBonus = 0;

      switch (piece.type) {
        case 'JOL': {
          // Soldiers gain value as they march forward into opponent's territory
          const rankAdvancement = piece.side === 'cho' ? 9 - r : r;
          positionalBonus += rankAdvancement * 6;
          // Center file soldier is valuable
          if (c >= 3 && c <= 5) positionalBonus += 8;
          break;
        }
        case 'MA': {
          // Horses prefer center intersections (more mobility)
          const centerDist = Math.abs(c - 4) + (piece.side === 'cho' ? Math.abs(r - 5) : Math.abs(r - 4));
          positionalBonus += (10 - centerDist) * 3;
          break;
        }
        case 'SANG': {
          // Elephants benefit from non-blocked open positions
          if (c >= 2 && c <= 6) positionalBonus += 5;
          break;
        }
        case 'CHA': {
          // Chariots dominate open files and opponent rank 2/3
          const targetEnemyRank = piece.side === 'cho' ? 1 : 8;
          if (Math.abs(r - targetEnemyRank) <= 1) positionalBonus += 15;
          break;
        }
        case 'PO': {
          // Cannons prefer 2nd rank / center palace placement
          if (c === 4) positionalBonus += 10;
          break;
        }
        case 'SA': {
          // Guards protect king inside palace
          positionalBonus += 5;
          break;
        }
        case 'GUNG': {
          // King tucked safely on bottom/top rank
          const isDeep = piece.side === 'cho' ? r === 9 : r === 0;
          if (isDeep) positionalBonus += 10;
          break;
        }
      }

      const totalPieceScore = baseVal + positionalBonus;
      if (piece.side === side) {
        score += totalPieceScore;
      } else {
        score -= totalPieceScore;
      }
    }
  }

  // Check bonuses
  const opponent: Side = isCho ? 'han' : 'cho';
  if (isCheckmate(board, opponent)) score += 50000;
  else if (isCheck(board, opponent)) score += 60;

  if (isCheckmate(board, side)) score -= 50000;
  else if (isCheck(board, side)) score -= 60;

  return score;
}

// Order moves to optimize alpha-beta pruning (captures first, high-value captures first)
function orderMoves(moves: Move[]): Move[] {
  return moves.sort((a, b) => {
    const aCap = a.captured ? PIECE_VALUES[a.captured.type] * 10 - PIECE_VALUES[a.piece.type] : 0;
    const bCap = b.captured ? PIECE_VALUES[b.captured.type] * 10 - PIECE_VALUES[b.piece.type] : 0;
    return bCap - aCap;
  });
}

function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  aiSide: Side,
  currentSide: Side
): number {
  if (depth === 0) {
    return evaluatePosition(board, aiSide);
  }

  const moves = getAllLegalMoves(board, currentSide);
  if (moves.length === 0) {
    // If in check -> checkmate!
    if (isCheck(board, currentSide)) {
      return isMaximizing ? -50000 + (3 - depth) * 100 : 50000 - (3 - depth) * 100;
    }
    // No moves but not in check -> pass situation or draw
    return 0;
  }

  const ordered = orderMoves(moves);
  const nextSide: Side = currentSide === 'cho' ? 'han' : 'cho';

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of ordered) {
      const nextBoard = cloneBoard(board);
      nextBoard[move.to.r][move.to.c] = move.piece;
      nextBoard[move.from.r][move.from.c] = null;

      const evalVal = minimax(nextBoard, depth - 1, alpha, beta, false, aiSide, nextSide);
      maxEval = Math.max(maxEval, evalVal);
      alpha = Math.max(alpha, evalVal);
      if (beta <= alpha) break; // Prune
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of ordered) {
      const nextBoard = cloneBoard(board);
      nextBoard[move.to.r][move.to.c] = move.piece;
      nextBoard[move.from.r][move.from.c] = null;

      const evalVal = minimax(nextBoard, depth - 1, alpha, beta, true, aiSide, nextSide);
      minEval = Math.min(minEval, evalVal);
      beta = Math.min(beta, evalVal);
      if (beta <= alpha) break; // Prune
    }
    return minEval;
  }
}

export function findBestAIMove(board: Board, aiSide: Side, difficulty: AIDifficulty): Move | null {
  const legalMoves = getAllLegalMoves(board, aiSide);
  if (legalMoves.length === 0) return null;

  // Novice: Depth 1 + slight random exploration
  if (difficulty === 'novice') {
    if (Math.random() < 0.25) {
      // 25% chance of random legal move
      return legalMoves[Math.floor(Math.random() * legalMoves.length)];
    }
    let bestMove = legalMoves[0];
    let bestVal = -Infinity;
    for (const move of legalMoves) {
      const nextBoard = cloneBoard(board);
      nextBoard[move.to.r][move.to.c] = move.piece;
      nextBoard[move.from.r][move.from.c] = null;
      let val = evaluatePosition(nextBoard, aiSide);
      // Small jitter so it doesn't play identically every time
      val += (Math.random() - 0.5) * 15;
      if (val > bestVal) {
        bestVal = val;
        bestMove = move;
      }
    }
    return bestMove;
  }

  // Intermediate: Depth 2 minimax with alpha-beta
  if (difficulty === 'intermediate') {
    const oppSide: Side = aiSide === 'cho' ? 'han' : 'cho';
    let bestMove = legalMoves[0];
    let bestVal = -Infinity;
    const ordered = orderMoves(legalMoves);

    for (const move of ordered) {
      const nextBoard = cloneBoard(board);
      nextBoard[move.to.r][move.to.c] = move.piece;
      nextBoard[move.from.r][move.from.c] = null;

      const val = minimax(nextBoard, 1, -Infinity, Infinity, false, aiSide, oppSide);
      if (val > bestVal) {
        bestVal = val;
        bestMove = move;
      }
    }
    return bestMove;
  }

  // Master: Depth 3 search with ordered moves
  const oppSide: Side = aiSide === 'cho' ? 'han' : 'cho';
  let bestMove = legalMoves[0];
  let bestVal = -Infinity;
  const ordered = orderMoves(legalMoves);

  for (const move of ordered) {
    const nextBoard = cloneBoard(board);
    nextBoard[move.to.r][move.to.c] = move.piece;
    nextBoard[move.from.r][move.from.c] = null;

    const val = minimax(nextBoard, 2, -Infinity, Infinity, false, aiSide, oppSide);
    if (val > bestVal) {
      bestVal = val;
      bestMove = move;
    }
  }

  return bestMove;
}
