import React from 'react';
import { CharimType, Side } from '../engine/janggi.ts';

interface CharimSelectModalProps {
  side: Side;
  selectedCharim: CharimType;
  onSelectCharim: (charim: CharimType) => void;
  onConfirm: () => void;
  isOpponentReady?: boolean;
}

const CHARIM_OPTIONS: {
  id: CharimType;
  title: string;
  pieces: string;
  desc: string;
}[] = [
  {
    id: 'gwima_left',
    title: '귀마 (좌마우상)',
    pieces: '車 馬 象 士 漢/楚 士 象 馬 車',
    desc: '가장 널리 쓰이는 표준 포진. 공수 균형이 뛰어나며 중앙 장악에 유리합니다.',
  },
  {
    id: 'gwima_right',
    title: '귀마 (우마좌상)',
    pieces: '車 象 馬 士 漢/楚 士 馬 象 車',
    desc: '좌우 반전 형태의 귀마 포진. 상대의 포진에 맞춰 수싸움을 전개할 때 유용합니다.',
  },
  {
    id: 'wonangma',
    title: '원앙마 (상마마상)',
    pieces: '車 象 馬 士 漢/楚 士 馬 象 車',
    desc: '두 마(馬)가 서로를 지켜주는 원앙처럼 연계되는 탄탄한 수비형 포진입니다.',
  },
  {
    id: 'yanggwima',
    title: '양귀마 (마상상마)',
    pieces: '車 馬 象 士 漢/楚 士 象 馬 車',
    desc: '양쪽 귀에 마를 배치하여 중앙으로 빠르게 치고 나가는 강력한 공격형 포진입니다.',
  },
  {
    id: 'yanggwisang',
    title: '양귀상 (상마상마)',
    pieces: '車 象 馬 士 漢/楚 士 象 馬 車',
    desc: '두 상(象)이 양 날개에서 상대 진영의 멱을 견제하는 전략적 포진입니다.',
  },
];

export const CharimSelectModal: React.FC<CharimSelectModalProps> = ({
  side,
  selectedCharim,
  onSelectCharim,
  onConfirm,
  isOpponentReady = false,
}) => {
  const isCho = side === 'cho';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-2">
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-sm ${
                isCho ? 'bg-emerald-800 text-emerald-100' : 'bg-red-800 text-red-100'
              }`}
              style={{ fontFamily: "'Noto Serif KR', serif" }}
            >
              {isCho ? '楚' : '漢'}
            </span>
            <h2 className="text-lg font-bold text-stone-100">포진(차림) 선택</h2>
          </div>
          <p className="text-xs text-stone-400">
            대국 시작 전 마(馬)와 상(象)의 배치 방식을 선택하세요.
          </p>
        </div>

        {/* Charim Choices List */}
        <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
          {CHARIM_OPTIONS.map((opt) => {
            const isSelected = selectedCharim === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onSelectCharim(opt.id)}
                className={`
                  w-full text-left p-3 rounded-xl border transition-all
                  ${
                    isSelected
                      ? isCho
                        ? 'bg-emerald-950/60 border-emerald-500 shadow-md ring-1 ring-emerald-500/50'
                        : 'bg-red-950/60 border-red-500 shadow-md ring-1 ring-red-500/50'
                      : 'bg-stone-800/40 border-stone-800 hover:bg-stone-800/70'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-stone-200">{opt.title}</span>
                  {isSelected && (
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        isCho ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                      }`}
                    >
                      선택됨
                    </span>
                  )}
                </div>
                <div className="text-[11px] font-mono text-amber-300/80 mt-1 tracking-wider">
                  {opt.pieces}
                </div>
                <p className="text-[11px] text-stone-400 mt-1 leading-snug">{opt.desc}</p>
              </button>
            );
          })}
        </div>

        {/* Opponent Status */}
        {isOpponentReady && (
          <div className="text-center text-xs text-emerald-400 font-medium bg-emerald-950/30 border border-emerald-800/50 py-1.5 rounded-lg">
            상대방이 차림 준비를 완료했습니다.
          </div>
        )}

        {/* Confirm Button */}
        <button
          type="button"
          onClick={onConfirm}
          className={`
            w-full py-3 rounded-xl font-bold text-sm text-white shadow-lg transition-transform active:scale-98
            ${
              isCho
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30'
                : 'bg-red-600 hover:bg-red-500 shadow-red-900/30'
            }
          `}
        >
          대국 시작 준비 완료
        </button>
      </div>
    </div>
  );
};
