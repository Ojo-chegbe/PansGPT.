'use client';

import React, { useRef, useEffect, useState } from 'react';
import Image from 'next/image';
import html2canvas from 'html2canvas';

interface QuizShareCardProps {
  result: {
    score: number;
    maxScore: number;
    percentage: number;
    timeTaken?: number;
    completedAt: string;
    quiz: {
      title: string;
      courseCode: string;
      courseTitle: string;
      topic?: string;
    };
  };
  onShare?: (imageUrl: string) => void;
}

export default function QuizShareCard({ result, onShare }: QuizShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const getScoreMessage = (percentage: number) => {
    if (percentage >= 90) return '🔥 Outstanding Performance!';
    if (percentage >= 80) return '🔥 Distinction Level!';
    if (percentage >= 70) return '✅ Great Job!';
    if (percentage >= 60) return '⚠️ You\'re almost there!';
    if (percentage >= 50) return '📚 Keep studying!';
    return '💪 Don\'t give up!';
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins} min ${secs} sec`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getShareText = () => {
    const timeText = result.timeTaken ? ` in ${formatTime(result.timeTaken)}` : '';
    return `${result.score}/${result.maxScore} in ${result.quiz.courseCode} – thanks to PANSGPT! 🎯\n\n${getScoreMessage(result.percentage)}\n\nYou know the best thing to do 📚`;
  };

  const copyShareText = async () => {
    try {
      await navigator.clipboard.writeText(getShareText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  const generateShareImage = async () => {
    if (!cardRef.current) return;

    setIsGenerating(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#000000',
        scale: 2, // Higher quality
        useCORS: true,
        allowTaint: true,
        width: 1080,
        height: 1920,
      });

      const imageUrl = canvas.toDataURL('image/png');
      
      if (onShare) {
        onShare(imageUrl);
      } else {
        // Download the image
        const link = document.createElement('a');
        link.download = `pansgpt-quiz-result-${Date.now()}.png`;
        link.href = imageUrl;
        link.click();
      }
    } catch (error) {
      console.error('Error generating share image:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const shareToWhatsApp = async () => {
    await generateShareImage();
    
    // Create share text for WhatsApp
    const shareText = getShareText();
    
    // Try to use Web Share API first
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'PANSGPT Quiz Results',
          text: shareText,
          url: window.location.origin
        });
      } catch (error) {
        console.log('Web Share API failed, falling back to WhatsApp URL');
        openWhatsAppShare(shareText);
      }
    } else {
      // Fallback to WhatsApp URL scheme
      openWhatsAppShare(shareText);
    }
  };

  const openWhatsAppShare = (text: string) => {
    const encodedText = encodeURIComponent(text);
    const whatsappUrl = `https://wa.me/?text=${encodedText}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="space-y-4">
      {/* Share Card Preview */}
      <div 
        ref={cardRef}
        className="relative w-full max-w-sm mx-auto bg-gradient-to-br from-green-900 via-black to-gray-900 rounded-2xl p-8 text-white shadow-2xl border border-green-500/20"
        style={{ aspectRatio: '9/16' }}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-4 w-20 h-20 bg-green-500 rounded-full blur-xl"></div>
          <div className="absolute bottom-4 left-4 w-16 h-16 bg-blue-500 rounded-full blur-xl"></div>
        </div>

        {/* Header */}
        <div className="relative z-10 text-center mb-6">
          <div className="flex items-center justify-center mb-4">
            <div className="w-24 h-24 relative">
              <Image
                src="/uploads/Logo.png"
                alt="PANSGPT Logo"
                fill
                className="object-contain"
              />
            </div>
          </div>
          <p className="text-green-300 text-sm">Quiz Results</p>
        </div>

        {/* Score Section */}
        <div className="relative z-10 text-center mb-6">
          <div className="text-5xl font-bold text-white mb-2">
            {result.score}/{result.maxScore}
          </div>
          <div className="text-2xl font-bold text-green-400 mb-2">
            {result.percentage.toFixed(1)}%
          </div>
          <div className="text-lg font-semibold text-green-300">
            {getScoreMessage(result.percentage)}
          </div>
        </div>

        {/* Quiz Info */}
        <div className="relative z-10 space-y-3 mb-6">
          <div className="bg-green-900/30 rounded-lg p-4 border border-green-500/20">
            <h3 className="text-lg font-semibold text-white mb-1">
              {result.quiz.title}
            </h3>
            <p className="text-green-300 text-sm">
              {result.quiz.courseCode} - {result.quiz.courseTitle}
            </p>
            {result.quiz.topic && (
              <p className="text-gray-300 text-sm mt-1">
                Topic: {result.quiz.topic}
              </p>
            )}
          </div>

          {/* Time and Date */}
          <div className="flex justify-between text-sm text-gray-300">
            {result.timeTaken && (
              <span>⏱️ {formatTime(result.timeTaken)}</span>
            )}
            <span>📅 {formatDate(result.completedAt)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-center mt-auto">
          <div className="text-xs text-gray-400 mb-2">
            Powered by PANSGPT
          </div>
          <div className="text-xs text-green-400">
            Your AI Study Partner
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute bottom-4 right-4 w-8 h-8 bg-green-500/20 rounded-full"></div>
        <div className="absolute top-1/2 left-4 w-4 h-4 bg-blue-500/20 rounded-full"></div>
      </div>

      {/* Share Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={generateShareImage}
          disabled={isGenerating}
          className="flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Generating...
            </>
          ) : (
            <>
              📷 Download Image
            </>
          )}
        </button>

        <button
          onClick={shareToWhatsApp}
          disabled={isGenerating}
          className="flex items-center justify-center px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          📱 Share to WhatsApp
        </button>

        <button
          onClick={copyShareText}
          className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          {copied ? '✅ Copied!' : '📋 Copy Text'}
        </button>
      </div>

      {/* Share Instructions */}
      <div className="text-center text-sm text-gray-400 mt-4">
        <p>💡 Tip: Download the image and share it to your WhatsApp status!</p>
      </div>
    </div>
  );
} 