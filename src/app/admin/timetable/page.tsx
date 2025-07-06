"use client";
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface TimetableEntry {
  id: string;
  level: string;
  day: string;
  timeSlot: string;
  courseCode: string;
  courseTitle: string;
}

export default function AdminTimetablePage() {
  const { data: session, status } = useSession();
  const [timetables, setTimetables] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("100");
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
  const [formData, setFormData] = useState({
    level: "100",
    day: "Monday",
    timeSlot: "",
    courseCode: "",
    courseTitle: ""
  });

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const levels = ["100", "200", "300", "400", "500", "600"];

  useEffect(() => {
    if (session) fetchTimetables();
  }, [session, selectedLevel]);

  async function fetchTimetables() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/timetable?level=${selectedLevel}`);
      if (!res.ok) throw new Error("Failed to fetch timetables");
      const data = await res.json();
      setTimetables(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      const url = editingEntry 
        ? `/api/admin/timetable/${editingEntry.id}`
        : '/api/admin/timetable';
      
      const method = editingEntry ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (!res.ok) throw new Error("Failed to save timetable entry");
      
      await fetchTimetables();
      resetForm();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (entry: TimetableEntry) => {
    setEditingEntry(entry);
    setFormData({
      level: entry.level,
      day: entry.day,
      timeSlot: entry.timeSlot,
      courseCode: entry.courseCode,
      courseTitle: entry.courseTitle
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this timetable entry?")) return;
    
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/timetable/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Failed to delete timetable entry");
      await fetchTimetables();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingEntry(null);
    setFormData({
      level: selectedLevel,
      day: "Monday",
      timeSlot: "",
      courseCode: "",
      courseTitle: ""
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  if (status === "loading") return <div className="p-8 text-center">Loading...</div>;
  if (!session) return <div className="p-8 text-center text-red-500">Please sign in to access this page</div>;

  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Class Timetable Management</h1>
      
      {/* Level Selector */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Level
        </label>
        <select
          value={selectedLevel}
          onChange={(e) => setSelectedLevel(e.target.value)}
          className="border rounded px-3 py-2"
        >
          {levels.map(level => (
            <option key={level} value={level}>{level} Level</option>
          ))}
        </select>
      </div>

      {/* Add/Edit Form */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">
          {editingEntry ? 'Edit Timetable Entry' : 'Add New Timetable Entry'}
        </h2>
        
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
            <select
              name="level"
              value={formData.level}
              onChange={handleChange}
              required
              className="w-full border rounded px-3 py-2"
            >
              {levels.map(level => (
                <option key={level} value={level}>{level} Level</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
            <select
              name="day"
              value={formData.day}
              onChange={handleChange}
              required
              className="w-full border rounded px-3 py-2"
            >
              {days.map(day => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time Slot</label>
            <input
              type="text"
              name="timeSlot"
              value={formData.timeSlot}
              onChange={handleChange}
              required
              placeholder="e.g., 8:00 AM - 9:00 AM"
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Course Code</label>
            <input
              type="text"
              name="courseCode"
              value={formData.courseCode}
              onChange={handleChange}
              required
              placeholder="e.g., CHM 101"
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Course Title</label>
            <input
              type="text"
              name="courseTitle"
              value={formData.courseTitle}
              onChange={handleChange}
              required
              placeholder="e.g., Introduction to Chemistry"
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {editingEntry ? 'Update Entry' : 'Add Entry'}
            </button>
            {editingEntry && (
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      {/* Timetable Display */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">{selectedLevel} Level Timetable</h2>
        
        {loading ? (
          <div className="text-center py-4">Loading...</div>
        ) : (
          <div className="space-y-4">
            {days.map(day => {
              const dayEntries = timetables.filter(entry => entry.day === day);
              return (
                <div key={day} className="border rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-2">{day}</h3>
                  {dayEntries.length > 0 ? (
                    <div className="space-y-2">
                      {dayEntries.map(entry => (
                        <div key={entry.id} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                          <div className="flex-1">
                            <div className="font-medium">{entry.timeSlot}</div>
                            <div className="text-sm text-gray-600">
                              {entry.courseCode} - {entry.courseTitle}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(entry)}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(entry.id)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-500 text-center py-2">No classes scheduled</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
} 