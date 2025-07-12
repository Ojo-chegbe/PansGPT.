"use client";
import React, { useState, useEffect } from 'react';
import QuizSelectionForm from '@/components/QuizSelectionForm';

export default function QuizPage() {
  const [userSubscription, setUserSubscription] = useState<any>(null);

  useEffect(() => {
    fetch('/api/subscription/status')
      .then(res => res.json())
      .then(setUserSubscription);
  }, []);

  if (!userSubscription?.isActive && !userSubscription?.isTrial) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-black via-gray-900 to-gray-800 text-center px-4">
        <div className="text-2xl md:text-3xl font-bold text-white mb-4">Sorry, this feature is reserved for active members only.</div>
        <div className="text-lg md:text-xl text-gray-300 mb-6 max-w-xl">
          Don’t miss out on smarter revision, AI-powered grading, and the edge your classmates already have.<br />
          <span className="inline-block mt-2 text-green-400 text-xl">👉 Unlock full access now and stay ahead.</span>
        </div>
        <button
          onClick={() => window.location.href = '/plan'}
          className="mt-2 px-8 py-3 bg-green-600 hover:bg-green-700 text-white text-lg font-semibold rounded-full shadow transition-all focus:outline-none focus:ring-2 focus:ring-green-400"
        >
          View Plans
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-green-400 mb-4 drop-shadow-lg">Quiz Platform</h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Test your knowledge with AI-generated quizzes based on your course materials. Choose your course, topic, and difficulty level to get started.
          </p>
        </div>
        <QuizSelectionForm />
      </div>
    </div>
  );
} 