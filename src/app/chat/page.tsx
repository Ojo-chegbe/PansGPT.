'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import AchievementPopup from '../../components/AchievementPopup';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatPage() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [achievementPopup, setAchievementPopup] = useState<{
    isOpen: boolean;
    achievement: string;
  }>({ isOpen: false, achievement: '' });
  const [previousAchievements, setPreviousAchievements] = useState<string[]>([]);

  // Add this function to check for new achievements
  const checkAchievements = async () => {
    try {
      const res = await fetch('/api/user');
      if (res.ok) {
        const data = await res.json();
        const currentAchievements = data.achievements || [];
        
        // Find new achievements
        const newAchievements = currentAchievements.filter(
          (achievement: string) => !previousAchievements.includes(achievement)
        );

        if (newAchievements.length > 0) {
          // Show popup for the first new achievement
          setAchievementPopup({
            isOpen: true,
            achievement: newAchievements[0]
          });
        }

        setPreviousAchievements(currentAchievements);
      }
    } catch (error) {
      console.error('Failed to check achievements:', error);
    }
  };

  // Add this effect to check achievements periodically
  useEffect(() => {
    const interval = setInterval(checkAchievements, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [previousAchievements]);

  // Add this effect to check achievements after each message
  useEffect(() => {
    if (messages.length > 0) {
      checkAchievements();
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* ... existing chat UI code ... */}

      {/* Add the AchievementPopup component */}
      <AchievementPopup
        achievement={achievementPopup.achievement}
        isOpen={achievementPopup.isOpen}
        onClose={() => setAchievementPopup({ isOpen: false, achievement: '' })}
      />
    </div>
  );
} 