import React from 'react';
import { Side, Piece, CharimType, CHARIM_NAMES } from '../engine/janggi.ts';
import { PieceView } from './PieceView.tsx';

interface PlayerInfoBarProps {
  side: Side;
  name: string;
  isCurrentTurn: boolean;
  score: number;
  timeLeft?: number;
  capturedPieces: Piece[];
  charim?: CharimType;
  isCheck?: boolean;
}

export const PlayerInfoBar: React.FC<PlayerInfoBarProps> = ({
  side,
  name,
  isCurrentTurn,
  score,
  timeLeft,
  capturedPieces,
  charim,
  isCheck = false,
}) => {
  const isCho = side === 'cho';

  const formatTime = (seconds?: number) => {
    if (seconds === undefined) return null;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className={`
        w-full max-w-[500px] mx-auto px-3 py-2 rounded-xl border transition-all duration-200
        ${
          isCurrentTurn
            ? isCho
              ? 'bg-emerald-950/40 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
              : 'bg-red-950/40 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
            : 'bg-stone-900/60 border-stone-800'
        }
      `}
    >
      <div className="flex items-center justify-between gap-2">
        {/* Left: Side Badge & Name */}
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`
              w-9 h-9 rounded-full flex items-center justify-center font-black text-base shadow shrink-0
              ${
                isCho
                  ? 'bg-emerald-800 text-emerald-100 border border-emerald-400'
                  : 'bg-red-800 text-red-100 border border-red-400'
              }
            `}
            style={{ fontFamily: "'Noto Serif KR', serif" }}
          >
            {isCho ? '楚' : '漢'}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-stone-100 text-sm truncate">{name}</span>
              {isCurrentTurn && (
                <span
                  className={`text-[11px] font-semibold px-1.5 py-0.2 rounded ${
                    isCho ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                  }`}
                >
                  착수 중
                </span>
              )}
              {isCheck && (
                <span className="text-[11px] font-bold px-1.5 py-0.2 rounded bg-rose-500 text-white animate-bounce">
                  장군!
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-stone-400">
              {charim && <span>{CHARIM_NAMES[charim]}</span>}
              <span aria-hidden="true">·</span>
              <span className="tabular-nums font-mono font-medium text-amber-300/90">
                {score.toFixed(1)}점 {side === 'han' ? '(덤 1.5)' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Timer Clock */}
        {timeLeft !== undefined && (
          <div className="shrink-0 text-right">
            <div
              className={`font-mono text-base font-bold tabular-nums px-2 py-0.5 rounded ${
                timeLeft < 30 ? 'bg-rose-950/80 text-rose-300 animate-pulse' : 'bg-stone-800/80 text-stone-200'
              }`}
            >
              {formatTime(timeLeft)}
            </div>
          </div>
        )}
      </div>

      {/* Captured Pieces Shelf */}
      {capturedPieces.length > 0 && (
        <div className="flex items-center gap-1 mt-1.5 pt-1.5 border-t border-stone-800/60 overflow-x-auto py-0.5 scrollbar-none">
          <span className="text-[10px] text-stone-500 shrink-0">포획:</span>
          <div className="flex items-center gap-1">
            {capturedPieces.map((p, idx) => (
              <div key={`${p.id}_${idx}`} className="shrink-0 transform scale-75 origin-left">
                <PieceView piece={p} size="sm" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
