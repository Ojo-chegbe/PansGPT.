'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import QuizShareCard from './QuizShareCard';

interface QuestionResult {
  questionId: string;
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  partiallyCorrect?: boolean;
  explanation: string;
  points: number;
  earnedPoints: number;
}

interface QuizResult {
  id: string;
  score: number;
  maxScore: number;
  percentage: number;
  timeTaken?: number;
  completedAt: string;
  questions: QuestionResult[];
  quiz?: {
    id: string;
    title: string;
    courseCode: string;
    courseTitle: string;
    topic?: string;
    level: string;
    difficulty: string;
    numQuestions: number;
  };
}

export default function QuizResults({ quizId }: { quizId: string }) {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const resultId = searchParams.get('resultId');
  
  const [result, setResult] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showExplanations, setShowExplanations] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchResult() {
      try {
        if (!resultId) {
          throw new Error('Result ID not found');
        }

        const response = await fetch(`/api/quiz/results/${resultId}`);
        if (!response.ok) {
          throw new Error('Result not found');
        }
        const data = await response.json();
        setResult(data.result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    if (resultId) {
      fetchResult();
    }
  }, [resultId]);

  useEffect(() => {
    if (showShareCard && shareCardRef.current) {
      shareCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [showShareCard]);

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreMessage = (percentage: number) => {
    if (percentage >= 90) return 'Excellent! Outstanding performance!';
    if (percentage >= 80) return 'Great job! Well done!';
    if (percentage >= 70) return 'Good work! Keep it up!';
    if (percentage >= 60) return 'Not bad! Room for improvement.';
    if (percentage >= 50) return 'You passed! Study more for better results.';
    return 'Keep studying! You can do better next time.';
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getCorrectCount = () => {
    return result?.questions.filter(q => q.isCorrect).length || 0;
  };

  const getIncorrectCount = () => {
    return result?.questions.filter(q => !q.isCorrect).length || 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600">{error || 'Result not found'}</p>
          <button
            onClick={() => router.push('/quiz')}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Back to Quiz Selection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Score Summary */}
        <div className="bg-[#181A1B] rounded-lg shadow-sm p-8 mb-6 text-center border border-green-700/20">
          <h1 className="text-3xl font-bold text-green-400 mb-4">Quiz Results</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="text-center">
              <div className={`text-4xl font-bold ${getScoreColor(result.percentage)}`.replace('text-gray-900', 'text-green-400')}>
                {result.percentage.toFixed(1)}%
              </div>
              <div className="text-gray-200">Score</div>
            </div>
            
            <div className="text-center">
              <div className="text-4xl font-bold text-green-400">
                {result.score}/{result.maxScore}
              </div>
              <div className="text-gray-200">Points</div>
            </div>
            
            <div className="text-center">
              <div className="text-4xl font-bold text-green-400">
                {getCorrectCount()}/{result.questions.length}
              </div>
              <div className="text-gray-200">Correct</div>
            </div>
          </div>

          <div className="mb-6">
            <p className={`text-lg font-semibold ${getScoreColor(result.percentage)}`.replace('text-gray-900', 'text-green-400')}>
              {getScoreMessage(result.percentage)}
            </p>
          </div>

          {result.timeTaken && (
            <div className="text-gray-300">
              Time taken: {formatTime(result.timeTaken)}
            </div>
          )}

          <div className="text-sm text-gray-400 mt-2">
            Completed on {new Date(result.completedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
          </div>

          {/* Share Button */}
          <div className="mt-6">
            <button
              onClick={() => setShowShareCard(!showShareCard)}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              {showShareCard ? 'Hide Share Card' : '📱 Share Results'}
            </button>
          </div>
        </div>

        {/* Share Card */}
        {showShareCard && result.quiz && (
          <div ref={shareCardRef} className="bg-[#181A1B] rounded-lg shadow-sm p-8 mb-6 border border-green-700/20">
            <h2 className="text-xl font-semibold text-green-400 mb-4 text-center">Share Your Results</h2>
            <QuizShareCard 
              result={{
                score: result.score,
                maxScore: result.maxScore,
                percentage: result.percentage,
                timeTaken: result.timeTaken,
                completedAt: result.completedAt,
                quiz: result.quiz
              }}
            />
          </div>
        )}

        {/* Performance Breakdown */}
        <div className="bg-[#232625] rounded-lg shadow-sm p-6 mb-6 border border-green-700/20">
          <h2 className="text-xl font-semibold text-green-400 mb-4">Performance Breakdown</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 bg-green-900/40 rounded-lg">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <span className="text-green-200">Correct Answers</span>
              </div>
              <span className="font-semibold text-green-400">{getCorrectCount()}</span>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-red-900/40 rounded-lg">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                <span className="text-red-200">Incorrect Answers</span>
              </div>
              <span className="font-semibold text-red-400">{getIncorrectCount()}</span>
            </div>
          </div>
        </div>

        {/* Question Review */}
        <div className="bg-[#232625] rounded-lg shadow-sm p-6 mb-6 border border-green-700/20">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-green-400">Question Review</h2>
            <button
              onClick={() => setShowExplanations(!showExplanations)}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
            >
              {showExplanations ? 'Hide Explanations' : 'Show Explanations'}
            </button>
          </div>

          <div className="space-y-6">
            {result.questions.map((question, index) => (
              <div key={question.questionId} className="border border-green-700/20 rounded-lg p-4 bg-[#181A1B]">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-medium text-green-200">
                    Question {index + 1}
                  </h3>
                  <div className="flex items-center">
                    {question.isCorrect ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/60 text-green-400">
                        ✓ Correct
                      </span>
                    ) : question.partiallyCorrect ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-900/60 text-yellow-400">
                        ~ Partially Correct
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-900/60 text-red-400">
                        ✗ Incorrect
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-green-200 mb-4">{question.questionText}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="block text-sm font-medium text-green-300 mb-1">
                      Your Answer:
                    </label>
                    <div className={`p-3 rounded-lg border ${
                      question.isCorrect 
                        ? 'bg-green-900/40 border-green-500 text-green-400' 
                        : 'bg-red-900/40 border-red-400 text-red-400'
                    }`}>
                      {question.userAnswer || 'No answer provided'}
                    </div>
                  </div>

                  {!question.isCorrect && (
                    <div>
                      <label className="block text-sm font-medium text-green-300 mb-1">
                        Correct Answer:
                      </label>
                      <div className="p-3 rounded-lg border bg-green-900/40 border-green-500 text-green-400">
                        {question.correctAnswer}
                      </div>
                    </div>
                  )}
                </div>

                {/* Show AI feedback only when explanations are toggled */}
                {showExplanations && question.explanation && (
                  <div className="mt-3 p-3 bg-blue-900/40 border border-blue-700/40 rounded-lg">
                    <label className="block text-sm font-medium text-blue-300 mb-1">
                      Feedback:
                    </label>
                    <p className="text-blue-200">{question.explanation}</p>
                  </div>
                )}

                <div className="mt-3 text-sm text-green-500">
                  Points: {question.earnedPoints}/{question.points}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => router.push('/quiz')}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
          >
            Take Another Quiz
          </button>
          
          <button
            onClick={() => router.push('/quiz/history')}
            className="px-6 py-3 border border-green-700 text-green-400 rounded-lg hover:bg-green-900/20 font-medium"
          >
            View Quiz History
          </button>
        </div>
      </div>
    </div>
  );
} 