import React from 'react';
import { Trophy, RotateCcw, Home } from 'lucide-react';
import { Side } from '../engine/janggi.ts';

interface GameOverModalProps {
  winner: Side | 'draw';
  winReason?: string;
  choScore: number;
  hanScore: number;
  playerSide?: Side;
  onRematch: () => void;
  onGoLobby: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  winner,
  winReason,
  choScore,
  hanScore,
  playerSide,
  onRematch,
  onGoLobby,
}) => {
  const isDraw = winner === 'draw';
  const isChoWinner = winner === 'cho';
  const isPlayerWinner = playerSide ? winner === playerSide : false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
      <div className="w-full max-w-sm bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-2xl text-center space-y-4">
        {/* Trophy / Result Icon */}
        <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center bg-amber-500/10 border-2 border-amber-400/40 shadow-inner">
          <Trophy className="w-8 h-8 text-amber-400 animate-bounce" />
        </div>

        {/* Victory Title */}
        <div className="space-y-1">
          <h2
            className={`text-2xl font-black ${
              isDraw
                ? 'text-stone-200'
                : isChoWinner
                ? 'text-emerald-400'
                : 'text-red-400'
            }`}
            style={{ fontFamily: "'Noto Serif KR', serif" }}
          >
            {isDraw
              ? '무승부 (동점)'
              : isChoWinner
              ? '초 (楚) 대국자 승리!'
              : '한 (漢) 대국자 승리!'}
          </h2>
          {winReason && <p className="text-sm text-stone-400 font-medium">{winReason}</p>}
        </div>

        {/* Score Breakdown Card */}
        <div className="p-3 bg-stone-800/50 border border-stone-800 rounded-2xl flex items-center justify-around font-mono">
          <div className="text-center">
            <div className="text-xs text-emerald-400 font-bold mb-0.5">초 (楚)</div>
            <div className="text-lg font-black text-stone-100">{choScore.toFixed(1)}점</div>
          </div>
          <div className="text-stone-600 font-light text-xl">vs</div>
          <div className="text-center">
            <div className="text-xs text-red-400 font-bold mb-0.5">한 (漢) <span className="text-[10px] text-stone-500 font-normal">+덤1.5</span></div>
            <div className="text-lg font-black text-stone-100">{hanScore.toFixed(1)}점</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={onRematch}
            className="w-full py-3 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-bold text-sm rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> 다시 대국하기
          </button>
          <button
            type="button"
            onClick={onGoLobby}
            className="w-full py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" /> 대국 로비로 이동
          </button>
        </div>
      </div>
    </div>
  );
};
