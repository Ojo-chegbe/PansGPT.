'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// Add import for combobox
import { Combobox } from '@headlessui/react';

interface QuizFormData {
  courseCode: string;
  courseTitle: string;
  topic: string;
  level: string;
  numQuestions: number;
  questionType: 'MCQ' | 'TRUE_FALSE' | 'OBJECTIVE' | 'SHORT_ANSWER';
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimit?: number;
}

interface Course {
  courseCode: string;
  courseTitle: string;
  level: string;
}

export default function QuizSelectionForm() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [formData, setFormData] = useState<QuizFormData>({
    courseCode: '',
    courseTitle: '',
    topic: '',
    level: '',
    numQuestions: 10,
    questionType: 'MCQ',
    difficulty: 'medium',
    timeLimit: undefined
  });
  const [topicOptions, setTopicOptions] = useState<string[]>([]);
  const [filteredTopics, setFilteredTopics] = useState<string[]>([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);

  useEffect(() => {
    async function fetchUserLevel() {
      if (!formData.level && session?.user) {
        try {
          const res = await fetch('/api/user');
          if (res.ok) {
            const data = await res.json();
            setFormData(prev => ({ ...prev, level: data.user?.level || '' }));
          }
        } catch {}
      }
    }
    fetchUserLevel();
  }, [session]);

  useEffect(() => {
    async function fetchAvailableCourses() {
      try {
        const res = await fetch('/api/documents/courses');
        if (res.ok) {
          const data = await res.json();
          setAvailableCourses(data.courses || []);
        }
      } catch (error) {
        console.error('Failed to fetch courses:', error);
      }
    }
    fetchAvailableCourses();
  }, []);

  // Fetch topics for suggestions
  useEffect(() => {
    async function fetchTopics() {
      setIsLoadingTopics(true);
      try {
        // If a course is selected, fetch topics for that course only
        const url = formData.courseCode 
          ? `/api/documents/topics?courseCode=${encodeURIComponent(formData.courseCode)}`
          : '/api/documents/topics';
        
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setTopicOptions(data.topics || []);
        }
      } catch (err) {
        // Ignore errors for now
      } finally {
        setIsLoadingTopics(false);
      }
    }
    fetchTopics();
  }, [formData.courseCode]); // Re-fetch when course changes

  // Filter topics as user types
  useEffect(() => {
    if (!formData.topic) {
      setFilteredTopics(topicOptions);
    } else {
      setFilteredTopics(
        topicOptions.filter(t => t.toLowerCase().includes(formData.topic.toLowerCase()))
      );
    }
  }, [formData.topic, topicOptions]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value
    }));
  };

  const handleCourseSelect = (courseCode: string) => {
    const course = availableCourses.find(c => c.courseCode === courseCode);
    if (course) {
      setFormData(prev => ({
        ...prev,
        courseCode: course.courseCode,
        courseTitle: course.courseTitle,
        level: course.level,
        topic: '' // Clear topic when course changes
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) {
      setError('Please sign in to create quizzes');
      return;
    }

    if (!formData.courseCode || !formData.courseTitle || !formData.level) {
      setError('Please select a course');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate quiz');
      }

      if (data.message) {
        setInfo(data.message);
      }

      // Navigate to the quiz taking page
      router.push(`/quiz/${data.quiz.id}`);

    } catch (err: any) {
      setError(err.message || 'Failed to generate quiz');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!session) {
    return (
      <div className="p-4 bg-[#232625] border border-green-700/30 rounded-lg text-green-300">
        Please sign in to create quizzes
      </div>
    );
  }

  return (
    <div className="bg-[#181A1B] shadow rounded-lg p-6 border border-green-700/20">
      <h2 className="text-2xl font-bold text-green-400 mb-6">Create New Quiz</h2>
      
      {info && (
        <div className="p-4 mb-6 bg-green-900/60 border border-green-700/40 rounded-lg text-green-300">
          {info}
        </div>
      )}

      {error && (
        <div className="p-4 mb-6 bg-red-900/60 border border-red-700/40 rounded-lg text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Course Selection */}
        <div>
          <label htmlFor="courseCode" className="block text-sm font-medium text-white mb-2">
            Select Course *
          </label>
          <select
            id="courseCode"
            name="courseCode"
            required
            value={formData.courseCode}
            onChange={(e) => handleCourseSelect(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-700 bg-[#232625] text-white shadow-sm focus:border-green-500 focus:ring-green-500"
          >
            <option value="">Choose a course</option>
            {availableCourses.map((course) => (
              <option key={course.courseCode} value={course.courseCode} className="text-black">
                {course.courseCode} - {course.courseTitle} (Level {course.level})
              </option>
            ))}
          </select>
        </div>

        {/* Topic - Combobox */}
        <div>
          <label htmlFor="topic" className="block text-sm font-medium text-white">
            Topic (Optional)
          </label>
          <Combobox value={formData.topic} onChange={value => setFormData(prev => ({ ...prev, topic: value || "" }))}>
            <div className="relative mt-1">
              <Combobox.Input
                className="block w-full rounded-md border-gray-700 bg-[#232625] text-white shadow-sm focus:border-green-500 focus:ring-green-500"
                displayValue={(topic: string) => topic}
                onChange={e => setFormData(prev => ({ ...prev, topic: e.target.value || "" }))}
                placeholder="e.g., Drug Metabolism, Titration, etc."
                id="topic"
                name="topic"
                autoComplete="off"
              />
              {isLoadingTopics ? (
                <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                  <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : filteredTopics.length > 0 ? (
                <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-[#232625] py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                  {filteredTopics.map((topic) => (
                    <Combobox.Option
                      key={topic}
                      value={topic}
                      className={({ active }) =>
                        `relative cursor-pointer select-none py-2 pl-3 pr-9 ${active ? 'bg-green-600 text-white' : 'text-gray-200'}`
                      }
                    >
                      {topic}
                    </Combobox.Option>
                  ))}
                </Combobox.Options>
              ) : formData.courseCode && !isLoadingTopics ? (
                <div className="absolute z-10 mt-1 w-full rounded-md bg-[#232625] py-2 px-3 text-sm text-gray-400">
                  No topics found for this course
                </div>
              ) : null}
            </div>
          </Combobox>
          <p className="mt-1 text-sm text-gray-400">
            {formData.courseCode 
              ? `Topics available for ${formData.courseCode}. Leave blank for a general quiz on the course.`
              : 'Select a course first to see available topics. Leave blank for a general quiz on the course.'
            }
          </p>
        </div>

        {/* Level */}
        <div>
          <label htmlFor="level" className="block text-sm font-medium text-white">
            Level *
          </label>
          <select
            id="level"
            name="level"
            required
            value={formData.level}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-700 bg-[#232625] text-white shadow-sm focus:border-green-500 focus:ring-green-500"
          >
            <option value="">Select level</option>
            <option value="100">100</option>
            <option value="200">200</option>
            <option value="300">300</option>
            <option value="400">400</option>
            <option value="500">500</option>
            <option value="600">600</option>
          </select>
        </div>

        {/* Number of Questions */}
        <div>
          <label htmlFor="numQuestions" className="block text-sm font-medium text-white">
            Number of Questions *
          </label>
          <select
            id="numQuestions"
            name="numQuestions"
            required
            value={formData.numQuestions}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-700 bg-[#232625] text-white shadow-sm focus:border-green-500 focus:ring-green-500"
          >
            <option value={5}>5 Questions</option>
            <option value={10}>10 Questions</option>
            <option value={15}>15 Questions</option>
            <option value={20}>20 Questions</option>
            <option value={30}>30 Questions</option>
          </select>
        </div>

        {/* Question Type */}
        <div>
          <label htmlFor="questionType" className="block text-sm font-medium text-white">
            Question Type *
          </label>
          <select
            id="questionType"
            name="questionType"
            required
            value={formData.questionType}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-700 bg-[#232625] text-white shadow-sm focus:border-green-500 focus:ring-green-500"
          >
            <option value="MCQ">Multiple Choice Questions</option>
            <option value="TRUE_FALSE">True/False</option>
            <option value="OBJECTIVE">Objective Questions</option>
            <option value="SHORT_ANSWER">Short Answer</option>
          </select>
        </div>

        {/* Difficulty */}
        <div>
          <label htmlFor="difficulty" className="block text-sm font-medium text-white">
            Difficulty Level *
          </label>
          <select
            id="difficulty"
            name="difficulty"
            required
            value={formData.difficulty}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-700 bg-[#232625] text-white shadow-sm focus:border-green-500 focus:ring-green-500"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        {/* Time Limit */}
        <div>
          <label htmlFor="timeLimit" className="block text-sm font-medium text-white">
            Time Limit (Optional)
          </label>
          <select
            id="timeLimit"
            name="timeLimit"
            value={formData.timeLimit || ''}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-700 bg-[#232625] text-white shadow-sm focus:border-green-500 focus:ring-green-500"
          >
            <option value="">No time limit</option>
            <option value={5}>5 minutes</option>
            <option value={10}>10 minutes</option>
            <option value={15}>15 minutes</option>
            <option value={20}>20 minutes</option>
            <option value={30}>30 minutes</option>
            <option value={45}>45 minutes</option>
            <option value={60}>1 hour</option>
          </select>
        </div>

        <button
          type="submit"
          className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <div className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating Quiz...
            </div>
          ) : (
            'Generate Quiz'
          )}
        </button>
      </form>
    </div>
  );
} 