'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import QuizSummaryCards from '../../components/QuizSummaryCards';
import DeviceManagement from '../../components/DeviceManagement';
import { clearDeviceId } from '../../lib/device-id';

interface TimetableEntry {
  id: string;
  level: string;
  day: string;
  timeSlot: string;
  courseCode: string;
  courseTitle: string;
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ name: '', bio: '', level: '', image: '' });
  const [profilePic, setProfilePic] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  
  // Timetable state
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [timetableLoading, setTimetableLoading] = useState(false);

  const [quizAnalytics, setQuizAnalytics] = useState<any>(null);

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  // Achievement icon mapping
  const achievementIcons: Record<string, string> = {
    "First Document": "📄",
    "Document Explorer": "🧭",
    "Document Master": "🏆",
    "Diverse Reader": "🌐",
    "Knowledge Seeker": "🔎"
  };

  useEffect(() => {
    async function fetchProfile() {
      const res = await fetch('/api/user');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user || data); // Always use data.user for profile fields
        setForm({
          name: (data.user || data).name || '',
          bio: (data.user || data).bio || '',
          level: (data.user || data).level || '',
          image: (data.user || data).image || '',
        });
        setProfilePic((data.user || data).image || '/uploads/user-placeholder.png');
      }
    }
    fetchProfile();
  }, []);

  // Fetch timetable when user level is available
  useEffect(() => {
    if (user?.level) {
      fetchTimetable();
    }
  }, [user?.level]);

  useEffect(() => {
    async function fetchQuizAnalytics() {
      try {
        const res = await fetch('/api/quiz/history?page=1&limit=1');
        if (res.ok) {
          const data = await res.json();
          setQuizAnalytics(data.data.analytics);
        }
      } catch (err) {
        // ignore
      }
    }
    fetchQuizAnalytics();
  }, []);

  const fetchTimetable = async () => {
    if (!user?.level) return;
    
    setTimetableLoading(true);
    try {
      const res = await fetch('/api/timetable');
      if (res.ok) {
        const data = await res.json();
        setTimetable(data.timetables || []);
      }
    } catch (error) {
      console.error('Failed to fetch timetable:', error);
    } finally {
      setTimetableLoading(false);
    }
  };

  const handlePicChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploading(true);
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('file', file);
      // Upload to /api/upload (reuse existing logic)
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.fileKey) {
        const url = `/uploads/${data.fileKey.split('/').pop()}`;
        setProfilePic(url);
        setForm(f => ({ ...f, image: url }));
      }
      setUploading(false);
    }
  };

  const handleEdit = () => setEditMode(true);
  const handleCancel = () => {
    setEditMode(false);
    setForm({
      name: user?.name || '',
      bio: user?.bio || '',
      level: user?.level || '',
      image: user?.image || '',
    });
    setProfilePic(user?.image || '/uploads/user-placeholder.png');
  };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };
  const handleSave = async () => {
    setSaving(true);
    const res = await fetch('/api/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const data = await res.json();
      setUser(data.user);
      setEditMode(false);
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    if (!window.confirm('Are you sure you want to log out?')) {
      return;
    }

    setLoggingOut(true);
    try {
      // Remove device from UserDevice table
      const deviceId = localStorage.getItem('pansgpt_device_id');
      if (deviceId) {
        await fetch('/api/user/devices', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceId }),
        });
      }

      // Clear device ID from localStorage
      clearDeviceId();
      
      // Sign out using NextAuth
      await signOut({ 
        redirect: true, 
        callbackUrl: '/' 
      });
    } catch (error) {
      console.error('Logout error:', error);
      setLoggingOut(false);
    }
  };

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>;
  }

  // Use user object for all profile fields, and data.stats/achievements for stats
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-3xl bg-[#181A1B] rounded-2xl shadow-xl p-8 flex flex-col gap-8">
        {/* Personal Info - Modern Revamp */}
        <div className="flex flex-col items-center gap-6 border-b border-gray-700 pb-10">
          <div className="w-full max-w-lg mx-auto bg-gradient-to-br from-gray-900/80 via-gray-800/70 to-gray-900/80 rounded-3xl shadow-2xl p-8 flex flex-col items-center backdrop-blur-md border border-gray-700">
            <div className="text-3xl md:text-4xl font-extrabold tracking-tight text-white text-center mb-2 drop-shadow-lg">{user.name}</div>
            <span className="inline-block px-4 py-1 rounded-full bg-green-500/20 text-green-400 font-bold text-base mb-2 shadow">Level {user.level}</span>
            <div className="text-base text-gray-400 text-center mb-4 select-all">{user.email}</div>
            {user.bio && (
              <div className="w-full bg-white/5 border border-green-400/20 rounded-xl px-5 py-3 text-green-200 text-center italic mb-4 shadow-inner backdrop-blur-sm">
                {user.bio}
              </div>
            )}
            {/* Removed Edit Profile button as all data is from the database */}
          </div>
        </div>

        {/* Quiz Summary Cards */}
        {quizAnalytics && <QuizSummaryCards analytics={quizAnalytics} />}

        {/* Class Timetable */}
        <div className="border-b border-gray-700 pb-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
            <div className="text-lg font-bold">Class Timetable</div>
            <div className="flex gap-2">
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="bg-gray-800 border border-gray-600 rounded px-3 py-1 text-white text-sm"
              >
                {days.map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>
          </div>
          
          {timetableLoading ? (
            <div className="text-center py-8 text-gray-400">Loading timetable...</div>
          ) : (
            <div className="space-y-3">
              {(() => {
                const dayEntries = timetable.filter(entry => entry.day === selectedDay);
                return dayEntries.length > 0 ? (
                  dayEntries.map(entry => (
                    <div key={entry.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div className="flex-1">
                          <div className="font-semibold text-yellow-400">{entry.timeSlot}</div>
                          <div className="text-sm text-gray-300">
                            {entry.courseCode} - {entry.courseTitle}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 bg-gray-700 px-2 py-1 rounded">
                          {entry.level} Level
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    No classes scheduled for {selectedDay}
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Achievements/Badges */}
        <div className="flex flex-col gap-2 items-center">
          <div className="text-lg font-bold mb-2">Achievements</div>
          <div className="flex flex-wrap gap-4 justify-center">
            {(user.achievements && user.achievements.length > 0) ? (
              user.achievements.map((ach: string) => (
                <div key={ach} className="flex flex-col items-center bg-gray-800 px-4 py-3 rounded-xl shadow border border-gray-700">
                  <span className="text-3xl mb-1">{achievementIcons[ach] || "🎖️"}</span>
                  <span className="text-xs text-gray-300 font-semibold">{ach}</span>
              </div>
              ))
            ) : (
              <div className="text-gray-400 text-sm italic py-4">No achievements yet. Keep using the app to unlock them!</div>
            )}
          </div>
        </div>

        {/* Device Management */}
        <div className="border-b border-gray-700 pb-8">
          <DeviceManagement />
        </div>

        {/* Plan Page Button */}
        <div className="flex justify-center gap-4 mt-6">
          <Link href="/plan">
            <button className="px-6 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition">
              Go to Plan Page
            </button>
          </Link>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="px-6 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loggingOut ? 'Logging out...' : 'Logout'}
          </button>
        </div>
      </div>
    </div>
  );
} 