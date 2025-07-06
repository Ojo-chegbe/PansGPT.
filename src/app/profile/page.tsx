'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

interface TimetableEntry {
  id: string;
  level: string;
  day: string;
  timeSlot: string;
  courseCode: string;
  courseTitle: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ name: '', bio: '', level: '', image: '' });
  const [profilePic, setProfilePic] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Timetable state
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [timetableLoading, setTimetableLoading] = useState(false);

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  useEffect(() => {
    async function fetchProfile() {
      const res = await fetch('/api/user');
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setForm({
          name: data.name || '',
          bio: data.bio || '',
          level: data.level || '',
          image: data.image || '',
        });
        setProfilePic(data.image || '/uploads/user-placeholder.png');
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

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-3xl bg-[#181A1B] rounded-2xl shadow-xl p-8 flex flex-col gap-8">
        {/* Personal Info */}
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10 border-b border-gray-700 pb-8">
          <div className="relative w-32 h-32">
            <Image
              src={profilePic}
              alt="Profile Picture"
              fill
              className="rounded-full object-cover border-4 border-yellow-400 shadow-lg"
            />
            {editMode && (
              <label className="absolute bottom-2 right-2 bg-black bg-opacity-70 rounded-full p-2 cursor-pointer hover:bg-opacity-90 transition">
                <input type="file" accept="image/*" className="hidden" onChange={handlePicChange} />
                <span role="img" aria-label="Upload">📷</span>
              </label>
            )}
            {uploading && <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-60 rounded-full">Uploading...</div>}
          </div>
          <div className="flex-1 flex flex-col gap-2 items-center md:items-start">
            {editMode ? (
              <>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="text-2xl font-bold tracking-tight bg-gray-800 rounded px-2 py-1 text-white w-full"
                  placeholder="Enter your name"
                />
                <select
                  name="level"
                  value={form.level}
                  onChange={handleChange}
                  className="text-gray-400 text-sm bg-gray-800 rounded px-2 py-1 text-white w-full"
                  required
                >
                  <option value="">Select level</option>
                  <option value="100">100 level</option>
                  <option value="200">200 level</option>
                  <option value="300">300 level</option>
                  <option value="400">400 level</option>
                  <option value="500">500 level</option>
                  <option value="600">600 level</option>
                </select>
                <textarea name="bio" value={form.bio} onChange={handleChange} className="italic text-yellow-300 text-center md:text-left bg-gray-800 rounded px-2 py-1 text-white w-full" placeholder="Bio" />
              </>
            ) : (
              <>
                <div className="flex flex-col items-center md:items-start mb-2">
                  <div className="text-2xl font-bold tracking-tight">{user.name}</div>
                  <div className="text-gray-400 text-sm mt-1">Level: <span className="font-semibold text-white">{user.level}</span></div>
                </div>
                <div className="text-gray-400 text-sm">{user.email}</div>
                <div className="italic text-yellow-300 text-center md:text-left">{user.bio}</div>
              </>
            )}
            {editMode ? (
              <div className="flex gap-2 mt-2">
                <button className="px-4 py-1.5 bg-yellow-400 text-black rounded-lg font-semibold hover:bg-yellow-300 transition" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                <button className="px-4 py-1.5 bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-600 transition" onClick={handleCancel}>Cancel</button>
              </div>
            ) : (
              <button className="mt-2 px-4 py-1.5 bg-yellow-400 text-black rounded-lg font-semibold hover:bg-yellow-300 transition" onClick={handleEdit}>Edit Profile</button>
            )}
          </div>
        </div>

        {/* Academic Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center border-b border-gray-700 pb-8">
          <div>
            <div className="text-3xl font-bold text-green-400">{user.stats?.questions ?? 0}</div>
            <div className="text-xs text-gray-400 mt-1">Questions Asked</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-blue-400">{user.stats?.responses ?? 0}</div>
            <div className="text-xs text-gray-400 mt-1">AI Responses Read</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-purple-400">{user.stats?.docs ?? 0}</div>
            <div className="text-xs text-gray-400 mt-1">Docs Accessed</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-pink-400">{user.stats?.streak ?? 0}d</div>
            <div className="text-xs text-gray-400 mt-1">Streak</div>
          </div>
          <div className="col-span-2 md:col-span-4 mt-2">
            <div className="text-xs text-gray-400">Most Studied Topics:</div>
            <div className="flex flex-wrap gap-2 justify-center mt-1">
              {(user.stats?.topics || []).map((topic: string) => (
                <span key={topic} className="bg-gray-700 px-3 py-1 rounded-full text-xs text-white font-medium">{topic}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Membership Status */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-gray-700 pb-8">
          <div className="flex flex-col gap-1 items-center md:items-start">
            <div className="text-lg font-bold flex items-center gap-2">
              {user.membership?.tier === 'Gold' && <span className="text-yellow-400">🟡</span>}
              {user.membership?.tier === 'Plus' && <span className="text-blue-400">🔵</span>}
              {user.membership?.tier === 'Basic' && <span className="text-green-400">🟢</span>}
              {user.membership?.tier} Member
            </div>
            <div className="text-xs text-gray-400">Member since {user.membership?.since ? new Date(user.membership.since).toLocaleDateString() : ''}</div>
            <div className="text-xs text-gray-400">{user.membership?.expiry ? `${Math.ceil((new Date(user.membership.expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days left` : ''}</div>
          </div>
          <div className="flex flex-col gap-2 items-center md:items-end">
            {user.membership?.tier !== 'Gold' && (
              <Link href="/plan">
                <button className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black rounded-lg font-semibold hover:from-yellow-300 hover:to-yellow-400 transition">Upgrade</button>
              </Link>
            )}
            <div className="text-xs text-gray-400 mt-1">Membership: <span className="font-semibold text-white">{user.membership?.tier}</span></div>
          </div>
        </div>

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
            {(user.achievements || []).map((badge: any) => (
              <div key={badge.label} className="flex flex-col items-center bg-gray-800 px-4 py-3 rounded-xl shadow border border-gray-700">
                <span className="text-3xl mb-1">{badge.icon}</span>
                <span className="text-xs text-gray-300 font-semibold">{badge.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Plan Page Button */}
        <div className="flex justify-center mt-6">
          <Link href="/plan">
            <button className="px-6 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition">Go to Plan Page</button>
          </Link>
        </div>
      </div>
    </div>
  );
} 