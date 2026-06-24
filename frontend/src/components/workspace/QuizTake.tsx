import { useState, useCallback, useEffect, useMemo } from 'react';
import { Check, X, ChevronRight, ChevronLeft, Clock, Loader2, Send, Brain } from 'lucide-react';
import type { QuizItem, QuizType } from '../../api/quiz';
import { useQuizStore } from '../../store/useQuizStore';

interface Props {
  quiz: QuizItem;
  onBack: () => void;
}

interface Question {
  id: string;
  type?: string;
  question?: string;
  scenario?: string;
  options?: string[];
  correct_answer?: number;
  expected_answer?: string;
  expected_solution?: string;
  explanation?: string;
  key_points?: string[];
  rubric?: { criterion: string; points: number }[];
  expected_key_points?: string[];
  suggested_length?: string;
  sub_questions?: { id: string; question: string; expected_answer: string }[];
  difficulty?: string;
  language?: string;
  starter_code?: string;
  test_cases?: { input: string; expected_output: string }[];
  role?: string;
  category?: string;
  tips?: string[];
  follow_up?: string[];
}

export function QuizTake({ quiz, onBack }: Props) {
  const { submitQuiz, submitResult } = useQuizStore();
  const questions: Question[] = useMemo(() => {
    try { return JSON.parse(quiz.questions); } catch { return []; }
  }, [quiz.questions]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | number | null>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(
    quiz.time_limit_minutes ? quiz.time_limit_minutes * 60 : null,
  );

  // Timer
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || done) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t === null || t <= 1) {
          clearInterval(timer);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, done]);

  const current = questions[currentIndex];
  const isLast = currentIndex >= questions.length - 1;
  const allAnswered = questions.every((q) => answers[q.id] !== undefined);

  const setAnswer = useCallback((qId: string, value: string | number | null) => {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
  }, []);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const formatted = Object.entries(answers).map(([question_id, answer]) => ({
        question_id,
        answer: answer ?? null,
      }));
      await submitQuiz(quiz.id, formatted);
      setDone(true);
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  // Auto-submit when time runs out
  useEffect(() => {
    if (timeLeft === 0 && !done && !submitting) {
      handleSubmit();
    }
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Results view
  if (done && submitResult) {
    const passed = submitResult.percentage >= 60;
    const grade =
      submitResult.percentage >= 90 ? 'A' :
      submitResult.percentage >= 80 ? 'B' :
      submitResult.percentage >= 70 ? 'C' :
      submitResult.percentage >= 60 ? 'D' : 'F';

    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${
          passed ? 'bg-emerald-100' : 'bg-rose-100'
        }`}>
          {passed ? (
            <Check size={40} className="text-emerald-600" />
          ) : (
            <X size={40} className="text-rose-600" />
          )}
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Quiz Complete!</h2>
        <div className="text-5xl font-black text-indigo-600 mb-2">
          {submitResult.percentage}%
        </div>
        <div className="flex items-center gap-2 mb-6">
          <span className="text-sm text-gray-500">Grade:</span>
          <span className={`text-lg font-bold px-3 py-0.5 rounded-lg ${
            grade === 'A' ? 'bg-emerald-100 text-emerald-700' :
            grade === 'B' ? 'bg-blue-100 text-blue-700' :
            grade === 'C' ? 'bg-amber-100 text-amber-700' :
            grade === 'D' ? 'bg-orange-100 text-orange-700' :
            'bg-rose-100 text-rose-700'
          }`}>{grade}</span>
        </div>
        <p className="text-gray-500 text-sm mb-1">
          Score: {submitResult.score} / {submitResult.max_score}
        </p>
        <p className="text-gray-400 text-xs mb-8">
          Completed at {new Date(submitResult.completed_at).toLocaleString()}
        </p>

        {/* Review questions */}
        <div className="w-full max-w-lg space-y-3 mb-6">
          {questions.map((q, i) => {
            const userAns = answers[q.id];
            const options = q.options;
            const isCorrect = options
              ? userAns === q.correct_answer
              : false;
            return (
              <div key={q.id} className="border border-gray-200 rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <span className={`text-xs font-mono mt-0.5 px-1.5 py-0.5 rounded ${
                    isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                  }`}>
                    {isCorrect ? '✓' : '✗'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 mb-1">{i + 1}. {q.question || q.scenario}</p>
                    {options && (
                      <div className="text-xs text-gray-500 space-y-0.5 mt-1">
                        {options.map((opt, oi) => (
                          <div key={oi} className={`px-2 py-0.5 rounded ${
                            oi === q.correct_answer ? 'bg-emerald-50 text-emerald-700 font-medium' :
                            oi === userAns ? 'bg-rose-50 text-rose-600' : ''
                          }`}>
                            {String.fromCharCode(65 + oi)}. {opt}
                            {oi === q.correct_answer && ' ✓'}
                          </div>
                        ))}
                      </div>
                    )}
                    {q.explanation && (
                      <p className="text-xs text-gray-400 mt-1 italic">{q.explanation}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={onBack}
          className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-all"
        >
          Back to Quizzes
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
          >
            <X size={16} />
          </button>
          <div>
            <h2 className="text-sm font-semibold text-gray-800">{quiz.title}</h2>
            <p className="text-[10px] text-gray-400 capitalize">{quiz.quiz_type.replace('_', ' ')} · {questions.length} questions</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {timeLeft !== null && (
            <div className={`flex items-center gap-1.5 text-xs font-mono font-semibold px-2.5 py-1 rounded-lg ${
              timeLeft < 60 ? 'text-rose-600 bg-rose-50' : 'text-gray-600 bg-gray-100'
            }`}>
              <Clock size={12} />
              {formatTime(timeLeft)}
            </div>
          )}
          <span className="text-xs text-gray-400">
            {currentIndex + 1}/{questions.length}
          </span>
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100">
        <div
          className="h-full bg-indigo-500 transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question content */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-3">
              Question {currentIndex + 1}
            </p>
            <p className="text-lg text-gray-900 font-medium leading-relaxed mb-6">
              {current?.question || current?.scenario}
            </p>

            {/* MCQ Options */}
            {current?.options && (
              <div className="space-y-2">
                {current.options.map((opt, oi) => (
                  <button
                    key={oi}
                    onClick={() => setAnswer(current.id, oi)}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      answers[current.id] === oi
                        ? 'bg-indigo-100 border-2 border-indigo-400 text-indigo-700'
                        : 'bg-gray-50 border-2 border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    <span className="inline-block w-6 h-6 rounded-full bg-gray-200 text-center text-xs leading-6 mr-3 font-bold text-gray-600">
                      {String.fromCharCode(65 + oi)}
                    </span>
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {/* Coding / Short Answer / Long Answer - Text input */}
            {!current?.options && (
              <div>
                {current?.language && (
                  <p className="text-xs text-indigo-500 font-medium mb-2">
                    Language: {current.language}
                  </p>
                )}
                {current?.starter_code && (
                  <pre className="bg-gray-900 text-gray-100 text-xs p-3 rounded-lg mb-3 overflow-x-auto">
                    <code>{current.starter_code}</code>
                  </pre>
                )}
                {current?.suggested_length && (
                  <p className="text-xs text-gray-400 mb-2">
                    Suggested length: {current.suggested_length}
                  </p>
                )}
                <textarea
                  autoFocus
                  value={(answers[current?.id] as string) || ''}
                  onChange={(e) => setAnswer(current.id, e.target.value)}
                  placeholder={
                    current?.type === 'coding'
                      ? 'Write your code here...'
                      : current?.type === 'short_answer'
                      ? 'Type your answer (1-3 sentences)...'
                      : current?.type === 'long_answer'
                      ? 'Write your essay here...'
                      : 'Type your answer...'
                  }
                  rows={current?.type === 'long_answer' ? 8 : 4}
                  className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 resize-none"
                />
              </div>
            )}

            {/* Case study sub-questions */}
            {current?.sub_questions && (
              <div className="space-y-4 mt-4">
                {current.sub_questions.map((sq, si) => (
                  <div key={sq.id}>
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      {si + 1}. {sq.question}
                    </p>
                    <textarea
                      value={(answers[`${current.id}_${sq.id}`] as string) || ''}
                      onChange={(e) => setAnswer(`${current.id}_${sq.id}`, e.target.value)}
                      placeholder="Your analysis..."
                      rows={3}
                      className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 resize-none"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Interview tips shown for context */}
            {current?.tips && current?.tips.length > 0 && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider mb-1">Tips</p>
                <ul className="space-y-0.5">
                  {current.tips.map((tip, ti) => (
                    <li key={ti} className="text-xs text-amber-700">• {tip}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer navigation */}
      <div className="border-t border-gray-100 px-6 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all disabled:opacity-30"
          >
            <ChevronLeft size={14} />
            Previous
          </button>

          <div className="flex items-center gap-1">
            {questions.map((q, i) => (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(i)}
                className={`w-6 h-6 rounded text-[10px] font-semibold transition-all ${
                  i === currentIndex
                    ? 'bg-indigo-600 text-white'
                    : answers[q.id] !== undefined
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          {isLast ? (
            <button
              onClick={handleSubmit}
              disabled={submitting || !allAnswered}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all"
            >
              {submitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          ) : (
            <button
              onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
            >
              Next
              <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
