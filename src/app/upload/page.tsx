'use client';

import React, { useState, useEffect } from 'react';
import DocumentUploadForm from '../../components/DocumentUploadForm';
import { logDocumentAccess } from '../../lib/document-utils';

// Metadata needs to be in a separate file for client components
// Create a separate layout.tsx or loading.tsx for metadata

export default function UploadPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Upload Document</h1>
          <p className="mt-2 text-sm text-gray-600">
            Upload a document to be processed by our AI system
          </p>
        </div>
        
        <div className="space-y-12">
          <DocumentUploadForm />
          <hr className="border-gray-200" />
      <ManageDocuments />
    </div>
      </div>
    </main>
  );
}

function ManageDocuments() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchDocuments() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (err) {
      setError("Failed to fetch documents");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(document_id: string) {
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    try {
      const response = await fetch("/api/documents", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_id }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete document');
      }
      
      await fetchDocuments();
    } catch (err) {
      alert("Failed to delete document");
    }
  }

  const handleDocumentClick = async (documentId: string) => {
    await logDocumentAccess(documentId);
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">Manage Documents</h2>
      
      {loading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {documents.length > 0 ? (
        <div className="divide-y divide-gray-200">
          {documents.map((doc) => (
            <div key={doc.document_id} className="py-4 flex items-center justify-between">
              <div className="flex-grow">
                <h3 
                  className="text-lg font-medium text-gray-900 cursor-pointer hover:text-blue-600"
                  onClick={() => handleDocumentClick(doc.document_id)}
                >
                  {doc.title}
                </h3>
                <p className="text-sm text-gray-600">
                  {doc.file_name}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Uploaded: {new Date(doc.uploadedAt).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <button
                onClick={() => handleDelete(doc.document_id)}
                className="ml-4 inline-flex items-center px-3 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      ) : (
        !loading && (
          <p className="text-center text-gray-500 py-4">
            No documents found.
          </p>
        )
      )}
    </div>
  );
} 