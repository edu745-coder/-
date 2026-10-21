import React, { useState } from 'react';
import { ScrollText, X, Copy, Check } from 'lucide-react';
import { Move } from '../engine/janggi.ts';

interface MoveHistoryModalProps {
  isOpen: boolean;
  moves: Move[];
  onClose: () => void;
}

export const MoveHistoryModal: React.FC<MoveHistoryModalProps> = ({ isOpen, moves, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Group moves into pairs (Cho, Han)
  const groupedMoves: { turn: number; cho?: string; han?: string }[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    const turn = Math.floor(i / 2) + 1;
    groupedMoves.push({
      turn,
      cho: moves[i]?.notation,
      han: moves[i + 1]?.notation,
    });
  }

  const handleCopy = () => {
    const fullText = groupedMoves
      .map((g) => `${g.turn}. ${g.cho || ''} ${g.han || ''}`)
      .join('\n');
    navigator.clipboard.writeText(`[천하장기 기보]\n${fullText}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-sm bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-stone-100">대국 기보 (棋譜)</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Moves Table */}
        <div className="flex-1 overflow-y-auto p-4">
          {groupedMoves.length === 0 ? (
            <div className="text-center py-8 text-stone-500 text-xs">
              아직 진행된 수가 없습니다.
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-stone-400 border-b border-stone-800">
                  <th className="py-1 text-left w-12 font-semibold">수</th>
                  <th className="py-1 text-left text-emerald-400 font-semibold">초 (楚)</th>
                  <th className="py-1 text-left text-red-400 font-semibold">한 (漢)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 font-mono">
                {groupedMoves.map((g) => (
                  <tr key={g.turn} className="hover:bg-stone-800/30">
                    <td className="py-1.5 text-stone-500">{g.turn}</td>
                    <td className="py-1.5 text-stone-200">{g.cho || '-'}</td>
                    <td className="py-1.5 text-stone-200">{g.han || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-stone-800 flex justify-between items-center shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            disabled={moves.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-stone-200 text-xs font-semibold rounded-lg transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? '복사 완료' : '기보 텍스트 복사'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-700 hover:bg-stone-600 text-stone-100 text-xs font-semibold rounded-lg"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
