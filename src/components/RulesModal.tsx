import React from 'react';
import { X, BookOpen, ShieldAlert, Sparkles } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-stone-100">한국 정통 장기 규칙 안내</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-stone-300 text-xs sm:text-sm leading-relaxed">
          {/* Section 1: Basic Concept */}
          <div className="space-y-2">
            <h3 className="font-bold text-stone-100 flex items-center gap-1.5 text-sm">
              <Sparkles className="w-4 h-4 text-emerald-400" /> 기본 진행 및 선수 (楚선수 / 漢후수)
            </h3>
            <p className="text-stone-400">
              초(楚, 녹색/청색)가 먼저 두고, 한(漢, 적색)이 나중에 둡니다. 후수인 한(漢)에게는 후수의 불리함을 보정하기 위해 <span className="text-amber-300 font-bold">덤 1.5점</span>이 부여됩니다.
            </p>
          </div>

          {/* Section 2: Piece Movement */}
          <div className="space-y-3">
            <h3 className="font-bold text-stone-100 flex items-center gap-1.5 text-sm">
              <Sparkles className="w-4 h-4 text-amber-400" /> 기물별 행마법 및 멱(길목)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-stone-800/40 border border-stone-800 rounded-lg">
                <span className="font-bold text-amber-300">궁(宮) & 사(士) [3점]</span>
                <p className="text-stone-400 mt-1">3x3 궁성 안에서만 1칸씩 이동합니다. 중심점과 네 귀퉁이를 잇는 대각선으로도 이동 가능합니다.</p>
              </div>
              <div className="p-2.5 bg-stone-800/40 border border-stone-800 rounded-lg">
                <span className="font-bold text-amber-300">차(車) [13점]</span>
                <p className="text-stone-400 mt-1">가로와 세로 직선을 끝까지 이동합니다. 상대 궁성 안에서는 대각선 길을 따라 가로지를 수도 있습니다.</p>
              </div>
              <div className="p-2.5 bg-stone-800/40 border border-stone-800 rounded-lg">
                <span className="font-bold text-amber-300">포(包) [7점] ★핵심 규칙</span>
                <p className="text-stone-400 mt-1">
                  반드시 <span className="text-rose-300 font-semibold">다른 기물 1개</span>를 다리 삼아 뛰어넘어야 합니다. 단, <span className="text-rose-400 font-bold">포는 포를 넘을 수 없고 포를 잡을 수 없습니다</span>.
                </p>
              </div>
              <div className="p-2.5 bg-stone-800/40 border border-stone-800 rounded-lg">
                <span className="font-bold text-amber-300">마(馬) [5점]</span>
                <p className="text-stone-400 mt-1">직선 1칸 전진 후 대각선 1칸(날일자 日). 첫 직선 1칸에 다른 기물이 있으면 <span className="text-rose-300">멱이 막혀</span> 이동할 수 없습니다.</p>
              </div>
              <div className="p-2.5 bg-stone-800/40 border border-stone-800 rounded-lg">
                <span className="font-bold text-amber-300">상(象) [3점]</span>
                <p className="text-stone-400 mt-1">직선 1칸 전진 후 대각선 2칸(쓸용자 用). 직선 1칸과 첫 대각선 1칸 모두 비어있어야 이동 가능합니다.</p>
              </div>
              <div className="p-2.5 bg-stone-800/40 border border-stone-800 rounded-lg">
                <span className="font-bold text-amber-300">졸(卒) / 병(兵) [2점]</span>
                <p className="text-stone-400 mt-1">앞으로 1칸 또는 좌우로 1칸 전진합니다(후진 불가). 상대 궁성 안에서는 앞쪽 대각선으로도 이동합니다.</p>
              </div>
            </div>
          </div>

          {/* Section 3: Special Janggi Rules */}
          <div className="space-y-2">
            <h3 className="font-bold text-stone-100 flex items-center gap-1.5 text-sm">
              <ShieldAlert className="w-4 h-4 text-rose-400" /> 한수 쉼(패스) 및 빅장 규칙
            </h3>
            <ul className="space-y-1.5 text-xs text-stone-400 list-disc list-inside">
              <li><strong className="text-stone-200">한수 쉼:</strong> 자신이 둘 마땅한 수가 없을 때 차례를 패스할 수 있습니다. 단, 장군 상태에서는 한수 쉼을 할 수 없습니다.</li>
              <li><strong className="text-stone-200">연속 한수 쉼:</strong> 양 대국자가 연속으로 한수 쉼을 하면 즉시 점수 계산으로 승패를 가립니다.</li>
              <li><strong className="text-stone-200">빅장:</strong> 양 궁(왕) 사이에 아무런 기물도 없이 마주보게 되는 경우 무승부를 선언할 수 있습니다.</li>
              <li><strong className="text-stone-200">점수제 승부:</strong> 차(13), 포(7), 마(5), 상(3), 사(3), 졸(2)의 합계와 漢의 덤 1.5점을 합산하여 승패를 결정합니다.</li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-stone-800 text-right shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
