import React, { useState } from 'react';
import { JANGGI_PUZZLES, JanggiPuzzle } from '../engine/puzzles.ts';
import { Board, Position, getLegalMoves, cloneBoard, isCheckmate } from '../engine/janggi.ts';
import { JanggiBoardView } from './JanggiBoardView.tsx';
import { sound } from '../utils/sound.ts';
import { Lightbulb, RotateCcw, ArrowRight, CheckCircle2, HelpCircle } from 'lucide-react';

interface TacticsPuzzleViewProps {
  onBackToLobby: () => void;
}

export const TacticsPuzzleView: React.FC<TacticsPuzzleViewProps> = ({ onBackToLobby }) => {
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
  const puzzle = JANGGI_PUZZLES[currentPuzzleIndex];

  const [currentBoard, setCurrentBoard] = useState<Board>(() => cloneBoard(puzzle.board));
  const [selectedPos, setSelectedPos] = useState<Position | null>(null);
  const [legalMoves, setLegalMoves] = useState<Position[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Position; to: Position } | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [isSolved, setIsSolved] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const resetPuzzle = (p: JanggiPuzzle) => {
    setCurrentBoard(cloneBoard(p.board));
    setSelectedPos(null);
    setLegalMoves([]);
    setLastMove(null);
    setShowHint(false);
    setIsSolved(false);
    setFeedbackMsg(null);
  };

  const handleSelectPuzzle = (index: number) => {
    setCurrentPuzzleIndex(index);
    resetPuzzle(JANGGI_PUZZLES[index]);
  };

  const handleSelectPiece = (pos: Position) => {
    if (isSolved) return;
    const piece = currentBoard[pos.r][pos.c];
    if (piece && piece.side === puzzle.side) {
      setSelectedPos(pos);
      const moves = getLegalMoves(currentBoard, pos.r, pos.c);
      setLegalMoves(moves);
    } else {
      setSelectedPos(null);
      setLegalMoves([]);
    }
  };

  const handleMakeMove = (from: Position, to: Position) => {
    if (isSolved) return;

    // Check if matches the puzzle solution
    const expected = puzzle.solutionMoves[0];
    const isCorrect = expected.from.r === from.r && expected.from.c === from.c && expected.to.r === to.r && expected.to.c === to.c;

    const nextBoard = cloneBoard(currentBoard);
    const piece = nextBoard[from.r][from.c]!;
    nextBoard[to.r][to.c] = piece;
    nextBoard[from.r][from.c] = null;

    setCurrentBoard(nextBoard);
    setLastMove({ from, to });
    setSelectedPos(null);
    setLegalMoves([]);

    if (isCorrect) {
      sound.playVictory();
      setIsSolved(true);
      setFeedbackMsg('🎉 정답입니다! 완벽한 외통수입니다!');
    } else {
      sound.playMove();
      setFeedbackMsg('❌ 아쉽습니다! 상대 궁을 외통시키지 못했습니다. 다시 시도해보세요.');
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-4 px-2 pb-6">
      {/* Puzzle Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {JANGGI_PUZZLES.map((p, idx) => (
          <button
            key={p.id}
            type="button"
            onClick={() => handleSelectPuzzle(idx)}
            className={`
              px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-colors
              ${
                idx === currentPuzzleIndex
                  ? 'bg-amber-500 text-stone-950 shadow-md font-bold'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }
            `}
          >
            {p.title}
          </button>
        ))}
      </div>

      {/* Puzzle Card Header */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-stone-100 text-sm flex items-center gap-2">
            <span>{puzzle.title}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium">
              {puzzle.difficulty}
            </span>
          </h3>
          <button
            type="button"
            onClick={() => resetPuzzle(puzzle)}
            className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> 다시 풀기
          </button>
        </div>
        <p className="text-xs text-stone-300 leading-relaxed">{puzzle.description}</p>

        {/* Hint Section */}
        <div className="pt-1">
          {!showHint ? (
            <button
              type="button"
              onClick={() => setShowHint(true)}
              className="flex items-center gap-1 text-xs text-amber-400/90 hover:text-amber-300"
            >
              <Lightbulb className="w-3.5 h-3.5" /> 힌트 보기
            </button>
          ) : (
            <div className="text-xs text-amber-300/90 bg-amber-950/30 border border-amber-800/40 p-2.5 rounded-xl flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>{puzzle.hint}</span>
            </div>
          )}
        </div>
      </div>

      {/* Board */}
      <div className="w-full">
        <JanggiBoardView
          board={currentBoard}
          selectedPos={selectedPos}
          legalMoves={legalMoves}
          lastMove={lastMove}
          turn={puzzle.side}
          onSelectPiece={handleSelectPiece}
          onMakeMove={handleMakeMove}
          disabled={isSolved}
        />
      </div>

      {/* Feedback & Solution Card */}
      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-2xl border text-xs leading-relaxed ${
            isSolved
              ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
          }`}
        >
          <div className="font-bold text-sm mb-1">{feedbackMsg}</div>
          {isSolved && <p className="text-stone-300 mt-1">{puzzle.explanation}</p>}
        </div>
      )}

      {/* Next Puzzle CTA */}
      {isSolved && currentPuzzleIndex < JANGGI_PUZZLES.length - 1 && (
        <button
          type="button"
          onClick={() => handleSelectPuzzle(currentPuzzleIndex + 1)}
          className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg flex items-center justify-center gap-2"
        >
          <span>다음 묘수풀이 도전</span> <ArrowRight className="w-4 h-4" />
        </button>
      )}

      {/* Back to Lobby */}
      <div className="text-center pt-2">
        <button
          type="button"
          onClick={onBackToLobby}
          className="text-xs text-stone-400 hover:text-stone-200 underline"
        >
          대국 로비로 돌아가기
        </button>
      </div>
    </div>
  );
};
