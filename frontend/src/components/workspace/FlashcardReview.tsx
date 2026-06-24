import { useState, useCallback, useEffect } from 'react';
import ReactCardFlip from 'react-card-flip';
import type { ReviewQueueItem } from '../../api/flashcards';
import { useFlashcardStore } from '../../store/useFlashcardStore';

interface Props {
  cards: ReviewQueueItem[];
  onComplete: () => void;
}

const RATING_OPTIONS = [
  { value: 0, label: 'Again', color: 'bg-red-500 hover:bg-red-600' },
  { value: 1, label: 'Hard', color: 'bg-orange-500 hover:bg-orange-600' },
  { value: 2, label: 'Good', color: 'bg-green-500 hover:bg-green-600' },
  { value: 3, label: 'Easy', color: 'bg-emerald-500 hover:bg-emerald-600' },
];

export default function FlashcardReview({ cards, onComplete }: Props) {
  const { currentCardIndex, reviewFlashcard, nextCard } = useFlashcardStore();
  const [flipped, setFlipped] = useState(false);
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, correct: 0 });

  const currentCard = cards[currentCardIndex];
  const isLastCard = currentCardIndex >= cards.length - 1;

  useEffect(() => {
    setFlipped(false);
  }, [currentCardIndex]);

  const handleRate = useCallback(
    async (rating: number) => {
      if (!currentCard) return;
      await reviewFlashcard(currentCard.id, rating);
      setSessionStats((s) => ({
        reviewed: s.reviewed + 1,
        correct: s.correct + (rating >= 2 ? 1 : 0),
      }));
      if (isLastCard) {
        onComplete();
      } else {
        nextCard();
      }
    },
    [currentCard, currentCardIndex, isLastCard, nextCard, reviewFlashcard, onComplete],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (flipped && ['1', '2', '3', '4'].includes(e.key)) {
        handleRate(parseInt(e.key) - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [flipped, handleRate]);

  if (!cards.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <p className="text-lg">No cards due for review!</p>
        <p className="text-sm mt-2">Add more flashcards or come back later.</p>
      </div>
    );
  }

  if (!currentCard) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <p className="text-lg">All caught up!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      {/* Progress */}
      <div className="text-sm text-gray-400">
        Card {currentCardIndex + 1} of {cards.length}
        {' | '}Reviewed: {sessionStats.reviewed}
        {sessionStats.reviewed > 0 && ` | ${Math.round((sessionStats.correct / sessionStats.reviewed) * 100)}%`}
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-md h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 transition-all duration-300"
          style={{ width: `${((currentCardIndex + 1) / cards.length) * 100}%` }}
        />
      </div>

      {/* Card */}
      <ReactCardFlip isFlipped={flipped} flipDirection="vertical">
        {/* Front - Question */}
        <div
          onClick={() => setFlipped(true)}
          className="w-full max-w-lg min-h-[280px] cursor-pointer bg-gray-800 border border-gray-700 rounded-xl p-8 flex flex-col items-center justify-center text-center select-none hover:border-indigo-500/50 transition-colors"
        >
          <span className="text-xs uppercase tracking-wider text-gray-500 mb-4">Question</span>
          <p className="text-xl text-white leading-relaxed">{currentCard.question}</p>
          <p className="text-xs text-gray-500 mt-6">Click or press Space to reveal answer</p>
        </div>

        {/* Back - Answer */}
        <div
          onClick={() => setFlipped(false)}
          className="w-full max-w-lg min-h-[280px] cursor-pointer bg-gray-800 border border-indigo-500/30 rounded-xl p-8 flex flex-col items-center justify-center text-center select-none"
        >
          <span className="text-xs uppercase tracking-wider text-gray-500 mb-4">Answer</span>
          <p className="text-xl text-white leading-relaxed">{currentCard.answer}</p>
          <div className="mt-4">
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              currentCard.difficulty === 'easy' ? 'bg-green-900/50 text-green-400' :
              currentCard.difficulty === 'hard' ? 'bg-red-900/50 text-red-400' :
              'bg-yellow-900/50 text-yellow-400'
            }`}>
              {currentCard.difficulty}
            </span>
          </div>
        </div>
      </ReactCardFlip>

      {/* Rating buttons (only visible when flipped) */}
      {flipped && (
        <div className="flex gap-3 flex-wrap justify-center">
          {RATING_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleRate(opt.value)}
              className={`px-5 py-2.5 rounded-lg text-white text-sm font-medium transition-colors ${opt.color}`}
            >
              {opt.label}
              <span className="ml-2 text-white/60 text-xs">({opt.value === 0 ? '1' : opt.value + 1})</span>
            </button>
          ))}
        </div>
      )}

      {!flipped && (
        <p className="text-xs text-gray-500">Press Space to flip, 1-4 to rate after flipping</p>
      )}
    </div>
  );
}
