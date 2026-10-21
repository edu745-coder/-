import React from 'react';
import { Piece, PieceType } from '../engine/janggi.ts';

interface PieceViewProps {
  piece: Piece;
  isSelected?: boolean;
  isLastMove?: boolean;
  isInCheck?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

const PIECE_HANJA: Record<PieceType, { cho: string; han: string }> = {
  GUNG: { cho: '楚', han: '漢' },
  CHA: { cho: '車', han: '車' },
  PO: { cho: '包', han: '包' },
  MA: { cho: '馬', han: '馬' },
  SANG: { cho: '象', han: '象' },
  SA: { cho: '士', han: '士' },
  JOL: { cho: '卒', han: '兵' },
};

export const PieceView: React.FC<PieceViewProps> = ({
  piece,
  isSelected = false,
  isLastMove = false,
  isInCheck = false,
  size = 'md',
  onClick,
}) => {
  const isCho = piece.side === 'cho';
  const hanja = PIECE_HANJA[piece.type][piece.side];

  // Traditional Janggi size scale: Gung (largest) > Cha, Po, Ma, Sang (mid) > Sa, Jol (small)
  const getScaleClass = () => {
    switch (piece.type) {
      case 'GUNG':
        return 'w-[92%] h-[92%] text-[20px] sm:text-[24px] font-black';
      case 'CHA':
      case 'PO':
        return 'w-[84%] h-[84%] text-[17px] sm:text-[20px] font-extrabold';
      case 'MA':
      case 'SANG':
        return 'w-[82%] h-[82%] text-[16px] sm:text-[19px] font-bold';
      case 'SA':
      case 'JOL':
        return 'w-[75%] h-[75%] text-[15px] sm:text-[18px] font-bold';
    }
  };

  const compactSizeClass = size === 'sm' ? 'w-7 h-7 text-xs' : size === 'lg' ? 'w-12 h-12 text-xl' : '';

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick?.();
        }
      }}
      aria-label={`${isCho ? '초' : '한'} ${hanja}`}
      className={`
        relative flex items-center justify-center select-none cursor-pointer
        transition-all duration-150 transform active:scale-95
        rounded-full aspect-square
        ${compactSizeClass || getScaleClass()}
        ${
          isCho
            ? 'bg-gradient-to-br from-emerald-800 via-emerald-950 to-stone-950 text-emerald-100 border-[2.5px] border-emerald-400/80 shadow-[0_4px_10px_rgba(0,0,0,0.5),inset_0_2px_4px_rgba(255,255,255,0.2)]'
            : 'bg-gradient-to-br from-red-800 via-red-950 to-stone-950 text-red-100 border-[2.5px] border-red-400/80 shadow-[0_4px_10px_rgba(0,0,0,0.5),inset_0_2px_4px_rgba(255,255,255,0.2)]'
        }
        ${isSelected ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-stone-900 scale-105 z-20' : ''}
        ${isLastMove ? 'ring-2 ring-amber-400/70' : ''}
        ${isInCheck ? 'ring-4 ring-rose-500 animate-pulse' : ''}
      `}
      style={{
        fontFamily: "'Noto Serif KR', serif",
      }}
    >
      {/* Wooden disc bevel inner ring */}
      <div
        className={`absolute inset-[3px] rounded-full border border-dashed pointer-events-none ${
          isCho ? 'border-emerald-300/30' : 'border-red-300/30'
        }`}
      />
      {/* Piece Hanja Character */}
      <span className="relative z-10 drop-shadow-[0_2px_3px_rgba(0,0,0,0.8)] tracking-normal">
        {hanja}
      </span>
    </div>
  );
};
