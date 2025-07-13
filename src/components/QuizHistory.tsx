'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface QuizResult {
  id: string;
  score: number;
  maxScore: number;
  percentage: number;
  timeTaken?: number;
  completedAt: string;
  quiz: {
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

interface Analytics {
  averageScore: number;
  totalQuizzes: number;
  totalPoints: number;
  coursePerformance: Array<{
    courseCode: string;
    courseTitle: string;
    level: string;
    averageScore: number;
    quizCount: number;
  }>;
  recentTrend: Array<{
    percentage: number;
    completedAt: string;
    courseCode: string;
    title: string;
  }>;
  recentTrendAverage: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function QuizHistory() {
  const { data: session } = useSession();
  const router = useRouter();
  const [results, setResults] = useState<QuizResult[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    courseCode: '',
    level: ''
  });

  useEffect(() => {
    fetchQuizHistory();
  }, [currentPage, filters]);

  const fetchQuizHistory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10'
      });

      if (filters.courseCode) params.append('courseCode', filters.courseCode);
      if (filters.level) params.append('level', filters.level);

      const response = await fetch(`/api/quiz/history?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch quiz history');
      }

      const data = await response.json();
      setResults(data.data.results);
      setAnalytics(data.data.analytics);
      setPagination(data.data.pagination);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (percentage: number) => {
    if (percentage >= 90) return { text: 'Excellent', color: 'bg-green-100 text-green-800' };
    if (percentage >= 80) return { text: 'Great', color: 'bg-green-100 text-green-800' };
    if (percentage >= 70) return { text: 'Good', color: 'bg-yellow-100 text-yellow-800' };
    if (percentage >= 60) return { text: 'Fair', color: 'bg-yellow-100 text-yellow-800' };
    if (percentage >= 50) return { text: 'Pass', color: 'bg-orange-100 text-orange-800' };
    return { text: 'Needs Work', color: 'bg-red-100 text-red-800' };
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-green-400 mb-4">Quiz History</h2>
            <p className="text-gray-300">Please sign in to view your quiz history</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-green-400 mb-2 drop-shadow-lg">Quiz History</h1>
            <p className="text-gray-300">Track your performance and progress over time</p>
          </div>
          <div className="flex gap-3 mt-4 md:mt-0">
            <button
              onClick={() => router.push('/main')}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gray-700 hover:bg-gray-800"
            >
              Back to AI Chat
            </button>
            <button
              onClick={() => router.push('/quiz')}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
            >
              Take New Quiz
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/60 border border-red-700/40 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Analytics Overview */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-[#232625] rounded-lg shadow-sm p-6 border border-green-700/20">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-900/60 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-green-300">Average Score</p>
                  <p className="text-2xl font-bold text-white">{analytics.averageScore.toFixed(1)}%</p>
                </div>
              </div>
            </div>

            <div className="bg-[#232625] rounded-lg shadow-sm p-6 border border-blue-700/20">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-900/60 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-300">Total Quizzes</p>
                  <p className="text-2xl font-bold text-white">{analytics.totalQuizzes}</p>
                </div>
              </div>
            </div>

            <div className="bg-[#232625] rounded-lg shadow-sm p-6 border border-purple-700/20">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-900/60 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-purple-300">Total Points</p>
                  <p className="text-2xl font-bold text-white">{analytics.totalPoints}</p>
                </div>
              </div>
            </div>

            <div className="bg-[#232625] rounded-lg shadow-sm p-6 border border-orange-700/20">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-orange-900/60 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-orange-300">Recent Trend</p>
                  <p className="text-2xl font-bold text-white">
                    {analytics.recentTrendAverage > 0
                      ? analytics.recentTrendAverage.toFixed(1) + '%'
                      : 'N/A'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-[#232625] rounded-lg shadow-sm p-6 mb-6 border border-green-700/20">
          <h2 className="text-lg font-semibold text-green-400 mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Course Code
              </label>
              <input
                type="text"
                value={filters.courseCode}
                onChange={(e) => handleFilterChange('courseCode', e.target.value)}
                placeholder="Filter by course code"
                className="w-full px-3 py-2 border border-green-700 bg-[#181A1B] text-white rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Level
              </label>
              <select
                value={filters.level}
                onChange={(e) => handleFilterChange('level', e.target.value)}
                className="w-full px-3 py-2 border border-green-700 bg-[#181A1B] text-white rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
              >
                <option value="">All Levels</option>
                <option value="100">100</option>
                <option value="200">200</option>
                <option value="300">300</option>
                <option value="400">400</option>
                <option value="500">500</option>
                <option value="600">600</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilters({ courseCode: '', level: '' });
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Quiz Results */}
        <div className="bg-[#232625] rounded-lg shadow-sm border border-green-700/20">
          <div className="px-6 py-4 border-b border-green-700/20">
            <h2 className="text-lg font-semibold text-green-400">Recent Quizzes</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
              <p className="mt-2 text-green-300">Loading quiz history...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="mx-auto h-12 w-12 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-green-400">No quizzes found</h3>
              <p className="mt-1 text-sm text-green-300">Start by taking your first quiz!</p>
              <div className="mt-6">
                <button
                  onClick={() => router.push('/quiz')}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                >
                  Take a Quiz
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-green-900/40">
              {results.map((result) => {
                const scoreBadge = getScoreBadge(result.percentage);
                return (
                  <div
                    key={result.id}
                    className="p-6 hover:bg-green-900/20 cursor-pointer transition"
                    onClick={() => router.push(`/quiz/${result.quiz.id}/results?resultId=${result.id}`)}
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1 w-full">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium text-white">
                            {result.quiz.title}
                          </h3>
                        </div>
                        <p className="text-sm text-gray-200 mt-1">
                          {result.quiz.courseCode} - {result.quiz.courseTitle}
                        </p>
                        {result.quiz.topic && (
                          <p className="text-sm text-gray-300 mt-1">Topic: {result.quiz.topic}</p>
                        )}
                        <div className="flex flex-wrap items-center mt-2 space-x-4 text-sm text-gray-300">
                          <span>Level {result.quiz.level}</span>
                          <span>•</span>
                          <span>{result.quiz.difficulty}</span>
                          <span>•</span>
                          <span>{result.quiz.numQuestions} questions</span>
                          {result.timeTaken && (
                            <>
                              <span>•</span>
                              <span>{formatTime(result.timeTaken)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end w-full md:w-auto md:ml-6 mt-4 md:mt-0">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${scoreBadge.text === 'Needs Work' ? 'bg-red-900/60 text-red-400' : 'bg-green-900/60 text-green-400'}`}>{scoreBadge.text}</span>
                          <div className={`text-2xl font-bold ${getScoreColor(result.percentage).replace('text-red-800','text-red-400').replace('text-green-600','text-green-400')}`}>
                            {result.percentage.toFixed(1)}%
                          </div>
                        </div>
                        <div className="text-sm text-white">
                          {result.score}/{result.maxScore} points
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {new Date(result.completedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-green-700/20">
              <div className="flex items-center justify-between">
                <div className="text-sm text-green-400">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} results
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className={`px-3 py-2 text-sm font-medium rounded-md ${
                      currentPage === 1
                        ? 'text-green-900/40 cursor-not-allowed'
                        : 'text-green-400 hover:bg-green-900/20'
                    }`}
                  >
                    Previous
                  </button>
                  <span className="px-3 py-2 text-sm text-green-400">
                    Page {currentPage} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                    disabled={currentPage === pagination.totalPages}
                    className={`px-3 py-2 text-sm font-medium rounded-md ${
                      currentPage === pagination.totalPages
                        ? 'text-green-900/40 cursor-not-allowed'
                        : 'text-green-400 hover:bg-green-900/20'
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Course Performance */}
        {analytics && analytics.coursePerformance.length > 0 && (
          <div className="mt-8 bg-[#232625] rounded-lg shadow-sm border border-green-700/20">
            <div className="px-6 py-4 border-b border-green-700/20">
              <h2 className="text-lg font-semibold text-green-400">Performance by Course</h2>
            </div>
            <div className="divide-y divide-green-900/40">
              {analytics.coursePerformance.map((course, index) => (
                <div key={index} className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-white">
                        {course.courseCode} - {course.courseTitle}
                      </h3>
                      <p className="text-sm text-gray-200">Level {course.level}</p>
                    </div>
                    <div className="text-right">
                      <div className={`text-xl font-bold ${getScoreColor(course.averageScore).replace('text-gray-900', 'text-green-400')}`}>
                        {course.averageScore.toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-200">
                        {course.quizCount} quiz{course.quizCount !== 1 ? 'zes' : ''}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 