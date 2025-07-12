'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Question {
  id: string;
  questionText: string;
  questionType: string;
  options?: string[];
  order: number;
}

interface Quiz {
  id: string;
  title: string;
  courseCode: string;
  courseTitle: string;
  topic?: string;
  level: string;
  difficulty: string;
  numQuestions: number;
  timeLimit?: number;
  questions: Question[];
}

interface UserAnswer {
  questionId: string;
  answer: string | string[];
}

export default function QuizTaking({ quizId }: { quizId: string }) {
  const router = useRouter();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);

  useEffect(() => {
    async function fetchQuiz() {
      try {
        const response = await fetch(`/api/quiz/${quizId}`);
        if (!response.ok) {
          throw new Error('Quiz not found');
        }
        const data = await response.json();
        setQuiz(data.quiz);
        
        // Initialize user answers
        const initialAnswers = data.quiz.questions.map((q: Question) => ({
          questionId: q.id,
          answer: ''
        }));
        setUserAnswers(initialAnswers);
        
        // Set time limit if exists
        if (data.quiz.timeLimit) {
          setTimeRemaining(data.quiz.timeLimit * 60); // Convert to seconds
        }
        
        setStartTime(new Date());
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    if (quizId) {
      fetchQuiz();
    }
  }, [quizId]);

  useEffect(() => {
    if (timeRemaining !== null && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev !== null && prev <= 1) {
            // Time's up, auto-submit
            handleSubmit();
            return 0;
          }
          return prev !== null ? prev - 1 : null;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeRemaining]);

  const handleAnswerChange = (questionId: string, answer: string | string[]) => {
    setUserAnswers(prev =>
      prev.map(a =>
        a.questionId === questionId ? { ...a, answer } : a
      )
    );
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async () => {
    if (!quiz || !startTime) return;

    setIsSubmitting(true);
    
    try {
      const timeTaken = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);
      
      const response = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quizId: quiz.id,
          answers: userAnswers,
          timeTaken
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit quiz');
      }

      // Navigate to results page
      router.push(`/quiz/${quizId}/results?resultId=${data.result.id}`);

    } catch (err: any) {
      setError(err.message || 'Failed to submit quiz');
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < (quiz?.questions.length || 0) - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const getProgressPercentage = () => {
    if (!quiz) return 0;
    return ((currentQuestionIndex + 1) / quiz.questions.length) * 100;
  };

  const getAnsweredCount = () => {
    return userAnswers.filter(a => {
      if (typeof a.answer === 'string') {
        return a.answer.trim() !== '';
      } else if (Array.isArray(a.answer)) {
        return a.answer.length > 0;
      }
      return false;
    }).length;
  };

  const canProceed = () => {
    if (currentQuestion.questionType === 'MCQ') {
      return Array.isArray(currentAnswer) && currentAnswer.length === 3;
    }
    if (currentQuestion.questionType === 'SHORT_ANSWER' || currentQuestion.questionType === 'OBJECTIVE') {
      return typeof currentAnswer === 'string' && currentAnswer.trim().length > 0;
    }
    return true;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600">{error || 'Quiz not found'}</p>
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

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const currentAnswer = userAnswers.find(a => a.questionId === currentQuestion.id)?.answer || '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-[#181A1B] rounded-lg shadow-sm p-6 mb-6 border border-green-700/20">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold text-green-400">{quiz.title}</h1>
              <p className="text-white font-medium">{quiz.courseCode} - {quiz.courseTitle}</p>
              {quiz.topic && <p className="text-gray-300">Topic: {quiz.topic}</p>}
            </div>
            <div className="text-right">
              {timeRemaining !== null && (
                <div className={`text-lg font-semibold ${timeRemaining < 300 ? 'text-red-400' : 'text-gray-200'}`}> 
                  {formatTime(timeRemaining)}
                </div>
              )}
              <div className="text-sm text-gray-400">
                Level {quiz.level} 2 {quiz.difficulty}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-200 mb-2">
              <span>Question {currentQuestionIndex + 1} of {quiz.questions.length}</span>
              <span>{getAnsweredCount()} answered</span>
            </div>
            <div className="w-full bg-gray-700/40 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getProgressPercentage()}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Question */}
        <div className="bg-[#232625] rounded-lg shadow-sm p-6 mb-6 border border-green-700/20">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              Question {currentQuestion.order}
            </h2>
            <p className="text-lg text-white mb-6">{currentQuestion.questionText}</p>

            {/* Answer Options */}
            {currentQuestion.questionType === 'MCQ' && currentQuestion.options && (
              <div className="space-y-3">
                {currentQuestion.options.map((option, index) => {
                  const selected = Array.isArray(currentAnswer) ? currentAnswer.includes(option) : false;
                  return (
                    <label key={index} className={`flex items-center p-3 border rounded-lg cursor-pointer ${selected ? 'bg-green-900/40 border-green-500' : 'border-gray-700 hover:bg-gray-800/40'}` }>
                      <input
                        type="checkbox"
                        name={`question-${currentQuestion.id}`}
                        value={option}
                        checked={selected}
                        onChange={e => {
                          let newAnswers = Array.isArray(currentAnswer) ? [...currentAnswer] : [];
                          if (e.target.checked) {
                            if (newAnswers.length < 3) newAnswers.push(option);
                          } else {
                            newAnswers = newAnswers.filter(ans => ans !== option);
                          }
                          handleAnswerChange(currentQuestion.id, newAnswers);
                        }}
                        className="h-4 w-4 text-green-500 focus:ring-green-500 border-gray-700 bg-[#181A1B]"
                        disabled={!selected && Array.isArray(currentAnswer) && currentAnswer.length >= 3}
                      />
                      <span className="ml-3 text-white">{option}</span>
                    </label>
                  );
                })}
                {Array.isArray(currentAnswer) && currentAnswer.length !== 3 && (
                  <div className="text-red-400 text-sm mt-2">Select exactly 3 options.</div>
                )}
              </div>
            )}

            {currentQuestion.questionType === 'TRUE_FALSE' && (
              <div className="space-y-3">
                {['True', 'False'].map((option) => (
                  <label key={option} className="flex items-center p-3 border rounded-lg cursor-pointer border-gray-700 hover:bg-gray-800/40">
                    <input
                      type="radio"
                      name={`question-${currentQuestion.id}`}
                      value={option}
                      checked={currentAnswer === option}
                      onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                      className="h-4 w-4 text-green-500 focus:ring-green-500 border-gray-700 bg-[#181A1B]"
                    />
                    <span className="ml-3 text-white">{option}</span>
                  </label>
                ))}
              </div>
            )}

            {currentQuestion.questionType === 'OBJECTIVE' && currentQuestion.options && (
              <div className="space-y-3">
                {currentQuestion.options.map((option, index) => (
                  <label key={index} className="flex items-center p-3 border rounded-lg cursor-pointer border-gray-700 hover:bg-gray-800/40">
                    <input
                      type="radio"
                      name={`question-${currentQuestion.id}`}
                      value={option}
                      checked={currentAnswer === option}
                      onChange={e => handleAnswerChange(currentQuestion.id, e.target.value)}
                      className="h-4 w-4 text-green-500 focus:ring-green-500 border-gray-700 bg-[#181A1B]"
                    />
                    <span className="ml-3 text-white">{option}</span>
                  </label>
                ))}
              </div>
            )}

            {currentQuestion.questionType === 'SHORT_ANSWER' && (
              <div>
                <textarea
                  value={currentAnswer}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  placeholder={'Write your answer...'}
                  className="w-full p-3 border border-gray-700 rounded-lg focus:ring-green-500 focus:border-green-500 bg-[#181A1B] text-white"
                  rows={4}
                />
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            className={`px-6 py-2 border rounded-md ${
              currentQuestionIndex === 0
                ? 'text-gray-700 border-gray-700 cursor-not-allowed'
                : 'text-green-400 border-green-500 hover:bg-green-900/20'
            }`}
          >
            Previous
          </button>

          <div className="flex space-x-4">
            {currentQuestionIndex < quiz.questions.length - 1 ? (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className={`px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 ${
                  !canProceed() ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canProceed() || isSubmitting}
                className={`px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 ${
                  !canProceed() ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
              </button>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-900/60 border border-red-700/40 rounded-lg text-red-400">
            {error}
          </div>
        )}
      </div>
    </div>
  );
} 