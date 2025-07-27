'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface UploadFormData {
  title: string;
  courseCode: string;
  courseTitle: string;
  professorName: string;
  topic: string;
  file: File | null;
  aiTrainingEnabled: boolean;
  level?: string;
}

export default function DocumentUploadForm() {
  const sessionResult = useSession();
  const session = sessionResult?.data;
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<UploadFormData>({
    title: '',
    courseCode: '',
    courseTitle: '',
    professorName: '',
    topic: '',
    file: null,
    aiTrainingEnabled: true,
    level: ''
  });

  useEffect(() => {
    async function fetchLevel() {
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
    fetchLevel();
  }, [session]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file && !file.name.endsWith('.txt')) {
      setError('Please upload a TXT file');
      return;
    }
    setFormData(prev => ({ ...prev, file }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) {
      setError('Please sign in to upload documents');
      return;
    }

    if (!formData.file) {
      setError('Please select a file to upload');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // First upload the file to get the fileKey
      const fileData = new FormData();
      fileData.append('file', formData.file);
      // Add metadata to the form data
      fileData.append('title', formData.title);
      fileData.append('courseCode', formData.courseCode);
      fileData.append('courseTitle', formData.courseTitle);
      fileData.append('professorName', formData.professorName);
      fileData.append('topic', formData.topic);
      fileData.append('level', formData.level || '');
      
      const uploadResponse = await fetch('/api/admin/documents/upload', {
        method: 'POST',
        body: fileData,
      });

      const { fileKey, documentId } = await uploadResponse.json();

      if (!uploadResponse.ok || !fileKey) {
        throw new Error('File upload failed');
      }

      // Document processing is already handled by the upload endpoint
      // No need to call process-document separately
      
      // Refresh the current page instead of navigation
      router.refresh();
      
      // Clear the form
      setFormData({
        title: '',
        courseCode: '',
        courseTitle: '',
        professorName: '',
        topic: '',
        file: null,
        aiTrainingEnabled: true,
        level: ''
      });

    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  if (!session) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        Please sign in to upload documents
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6">
      {error && (
        <div className="p-4 mb-6 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Document Title *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            required
            value={formData.title}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            placeholder="Enter document title"
          />
        </div>

        <div>
          <label htmlFor="courseCode" className="block text-sm font-medium text-gray-700">
            Course Code *
          </label>
          <input
            type="text"
            id="courseCode"
            name="courseCode"
            required
            value={formData.courseCode}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            placeholder="e.g., CHM 101"
          />
        </div>

        <div>
          <label htmlFor="courseTitle" className="block text-sm font-medium text-gray-700">
            Course Title *
          </label>
          <input
            type="text"
            id="courseTitle"
            name="courseTitle"
            required
            value={formData.courseTitle}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            placeholder="e.g., Introduction to Chemistry"
          />
        </div>

        <div>
          <label htmlFor="professorName" className="block text-sm font-medium text-gray-700">
            Professor Name *
          </label>
          <input
            type="text"
            id="professorName"
            name="professorName"
            required
            value={formData.professorName}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            placeholder="e.g., Prof. Odumosu"
          />
        </div>

        <div>
          <label htmlFor="topic" className="block text-sm font-medium text-gray-700">
            Topic *
          </label>
          <input
            type="text"
            id="topic"
            name="topic"
            required
            value={formData.topic}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            placeholder="e.g., Titration"
          />
        </div>

        <div>
          <label htmlFor="level" className="block text-sm font-medium text-gray-700">
            Level *
          </label>
          <select
            id="level"
            name="level"
            required
            value={formData.level}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
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

        <div>
          <label htmlFor="file" className="block text-sm font-medium text-gray-700">
            Document File *
          </label>
          <p className="mt-1 text-sm text-gray-500">Upload a TXT file</p>
          <input
            type="file"
            id="file"
            name="file"
            required
            accept=".txt"
            onChange={handleFileChange}
            className="mt-2 block w-full text-sm text-gray-900
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-green-50 file:text-green-700
              hover:file:bg-green-100"
          />
        </div>

        <div>
          <label htmlFor="aiTrainingEnabled" className="block text-sm font-medium text-gray-700 flex items-center">
            <input
              type="checkbox"
              id="aiTrainingEnabled"
              name="aiTrainingEnabled"
              checked={formData.aiTrainingEnabled}
              onChange={handleInputChange}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <span className="ml-2">Enable AI Training (process document for chat)</span>
          </label>
        </div>
      </div>

      <button
        type="submit"
        className={`mt-6 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        disabled={isUploading}
      >
        {isUploading ? 'Uploading...' : 'Upload Document'}
      </button>
    </form>
  );
} 