import React from 'react';
import { Board, Position, Side, Piece, isCheck, findKing } from '../engine/janggi.ts';
import { PieceView } from './PieceView.tsx';

interface JanggiBoardViewProps {
  board: Board;
  selectedPos: Position | null;
  legalMoves: Position[];
  lastMove?: { from: Position; to: Position } | null;
  turn: Side;
  playerSide?: Side;
  flipped?: boolean;
  onSelectPiece: (pos: Position) => void;
  onMakeMove: (from: Position, to: Position) => void;
  disabled?: boolean;
}

export const JanggiBoardView: React.FC<JanggiBoardViewProps> = ({
  board,
  selectedPos,
  legalMoves,
  lastMove,
  turn,
  flipped = false,
  onSelectPiece,
  onMakeMove,
  disabled = false,
}) => {
  // Check if current turn king is in check
  const inCheck = isCheck(board, turn);
  const checkedKingPos = inCheck ? findKing(board, turn) : null;

  // Grid coordinates: rows 0..9, cols 0..8
  // If flipped, invert indices
  const getDisplayCoords = (displayR: number, displayC: number): Position => {
    return {
      r: flipped ? 9 - displayR : displayR,
      c: flipped ? 8 - displayC : displayC,
    };
  };

  const handleIntersectionClick = (r: number, c: number) => {
    if (disabled) return;

    // Check if clicking on an active legal move destination
    const isLegalTarget = legalMoves.some((m) => m.r === r && m.c === c);
    if (selectedPos && isLegalTarget) {
      onMakeMove(selectedPos, { r, c });
      return;
    }

    const clickedPiece = board[r][c];
    if (clickedPiece) {
      onSelectPiece({ r, c });
    }
  };

  // SVG grid calculations
  // Board has 9 columns (index 0 to 8) and 10 rows (index 0 to 9)
  // Padding around grid intersections: 5% left/right, 5% top/bottom
  const paddingX = 5.5; // percent
  const paddingY = 5.0; // percent
  const widthPerCol = (100 - paddingX * 2) / 8; // percent per column
  const heightPerRow = (100 - paddingY * 2) / 9; // percent per row

  const getColPercent = (c: number) => paddingX + (flipped ? 8 - c : c) * widthPerCol;
  const getRowPercent = (r: number) => paddingY + (flipped ? 9 - r : r) * heightPerRow;

  return (
    <div className="relative w-full max-w-[500px] aspect-[9/10] mx-auto select-none touch-manipulation">
      {/* Board Wooden Slab Container with authentic wood background and bevel */}
      <div
        className="relative w-full h-full rounded-2xl overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.85)] border-4 border-amber-900/60"
        style={{
          backgroundImage: `url('/src/assets/images/janggi_wood_texture_1792546893660.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Subtle warm amber/wood stain grading overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-transparent to-amber-950/30 pointer-events-none" />

        {/* Board Outer Inset Border Line */}
        <div className="absolute inset-[3%] border-2 border-amber-950/70 pointer-events-none rounded" />

        {/* SVG Grid Lines, Palace Diagonals, and Intersection Crosshairs */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {/* 10 Horizontal Lines across the entire board */}
          {Array.from({ length: 10 }).map((_, r) => {
            const y = paddingY + r * heightPerRow;
            return (
              <line
                key={`h_${r}`}
                x1={paddingX}
                y1={y}
                x2={100 - paddingX}
                y2={y}
                stroke="#451a03"
                strokeWidth={r === 0 || r === 9 ? '0.7' : '0.45'}
                opacity={0.85}
              />
            );
          })}

          {/* 9 Vertical Lines running through without river cut (Korean Janggi standard) */}
          {Array.from({ length: 9 }).map((_, c) => {
            const x = paddingX + c * widthPerCol;
            return (
              <line
                key={`v_${c}`}
                x1={x}
                y1={paddingY}
                x2={x}
                y2={100 - paddingY}
                stroke="#451a03"
                strokeWidth={c === 0 || c === 8 ? '0.7' : '0.45'}
                opacity={0.85}
              />
            );
          })}

          {/* Han Palace Diagonals (rows 0 to 2, cols 3 to 5) */}
          <line
            x1={getColPercent(3)}
            y1={getRowPercent(0)}
            x2={getColPercent(5)}
            y2={getRowPercent(2)}
            stroke="#451a03"
            strokeWidth="0.5"
            opacity={0.85}
          />
          <line
            x1={getColPercent(5)}
            y1={getRowPercent(0)}
            x2={getColPercent(3)}
            y2={getRowPercent(2)}
            stroke="#451a03"
            strokeWidth="0.5"
            opacity={0.85}
          />

          {/* Cho Palace Diagonals (rows 7 to 9, cols 3 to 5) */}
          <line
            x1={getColPercent(3)}
            y1={getRowPercent(7)}
            x2={getColPercent(5)}
            y2={getRowPercent(9)}
            stroke="#451a03"
            strokeWidth="0.5"
            opacity={0.85}
          />
          <line
            x1={getColPercent(5)}
            y1={getRowPercent(7)}
            x2={getColPercent(3)}
            y2={getRowPercent(9)}
            stroke="#451a03"
            strokeWidth="0.5"
            opacity={0.85}
          />

          {/* Palace Center Dots */}
          <circle cx={getColPercent(4)} cy={getRowPercent(1)} r="0.6" fill="#451a03" opacity={0.7} />
          <circle cx={getColPercent(4)} cy={getRowPercent(8)} r="0.6" fill="#451a03" opacity={0.7} />
        </svg>

        {/* 90 Intersections Grid for Interactive Hitboxes & Piece Placement */}
        <div className="absolute inset-0 grid grid-rows-10 grid-cols-9 p-[4.2%]">
          {Array.from({ length: 10 }).map((_, displayR) =>
            Array.from({ length: 9 }).map((_, displayC) => {
              const { r, c } = getDisplayCoords(displayR, displayC);
              const piece = board[r][c];
              const isSelected = selectedPos?.r === r && selectedPos?.c === c;
              const isLegal = legalMoves.some((m) => m.r === r && m.c === c);
              const isLastMoveFrom = lastMove?.from.r === r && lastMove?.from.c === c;
              const isLastMoveTo = lastMove?.to.r === r && lastMove?.to.c === c;
              const isKingInCheck = checkedKingPos?.r === r && checkedKingPos?.c === c;

              return (
                <div
                  key={`${r}_${c}`}
                  onClick={() => handleIntersectionClick(r, c)}
                  className="relative flex items-center justify-center w-full h-full cursor-pointer z-10"
                >
                  {/* Last move indicator marker */}
                  {(isLastMoveFrom || isLastMoveTo) && (
                    <div className="absolute w-[86%] h-[86%] border-2 border-amber-400/80 rounded-full bg-amber-400/15 pointer-events-none animate-pulse" />
                  )}

                  {/* King in check danger aura */}
                  {isKingInCheck && (
                    <div className="absolute w-[96%] h-[96%] rounded-full bg-rose-600/30 border-2 border-rose-500 animate-ping pointer-events-none" />
                  )}

                  {/* Legal move target indicators */}
                  {isLegal && !piece && (
                    <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/90 shadow-[0_0_8px_rgba(16,185,129,0.9)] ring-2 ring-emerald-300 pointer-events-none transform active:scale-125 transition-transform" />
                  )}

                  {isLegal && piece && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                      <div className="w-[90%] h-[90%] rounded-full border-[3px] border-rose-500/90 shadow-[0_0_12px_rgba(244,63,94,0.9)] bg-rose-500/20 animate-pulse" />
                    </div>
                  )}

                  {/* The Janggi Piece */}
                  {piece && (
                    <PieceView
                      piece={piece}
                      isSelected={isSelected}
                      isLastMove={isLastMoveTo}
                      isInCheck={isKingInCheck}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
