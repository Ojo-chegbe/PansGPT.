"use client";
import React, { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { logDocumentAccess } from "../../../lib/document-utils";

interface DocumentMeta {
  _id: string;
  title: string;
  url: string;
  uploadedAt: string;
  uploadedBy: string;
}

export default function AdminDocumentsPage() {
  const { data: session, status } = useSession();
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (session) fetchDocuments();
  }, [session]);

  async function fetchDocuments() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/documents");
      if (!res.ok) throw new Error("Failed to fetch documents");
      const docs = await res.json();
      setDocuments(docs);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const file = fileInputRef.current?.files?.[0];
    if (!file) return setError("Please select a PDF file.");
    if (file.type !== "application/pdf") return setError("Only PDF files are allowed.");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", file.name);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/documents/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      await fetchDocuments();
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/documents/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setDocuments(docs => docs.filter(doc => doc._id !== id));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const handleDocumentClick = async (documentId: string) => {
    await logDocumentAccess(documentId);
  };

  if (status === "loading") return <div className="p-8 text-center">Loading...</div>;
  if (!session) return <div className="p-8 text-center text-red-500">Please sign in to access this page</div>;

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Admin Document Management</h1>
      
      <div className="mb-8 p-4 bg-green-50 rounded-lg border border-green-200">
        <h2 className="text-lg font-semibold text-blue-800 mb-2">Upload New Document</h2>
        <p className="text-sm text-blue-600 mb-4">
          To upload a document with full metadata (course code, lecturer name, etc.), please use the 
          <a href="/admin/documents/upload" className="text-blue-800 underline font-medium ml-1">
            Advanced Upload Form
          </a>
        </p>
        <div className="text-sm text-gray-600">
          Or use the quick upload below (limited metadata):
        </div>
      </div>

      <form onSubmit={handleUpload} className="mb-6 flex gap-2 items-center">
        <input ref={fileInputRef} type="file" accept="application/pdf" className="border rounded px-2 py-1" />
        <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded" disabled={loading}>Upload</button>
      </form>
      {error && <div className="text-red-500 mb-4">{error}</div>}
      <div>
        <h2 className="text-lg font-semibold mb-2">Uploaded Documents</h2>
        {loading ? <div>Loading...</div> : null}
        <ul className="space-y-2">
          {documents.map(doc => (
            <li key={doc._id} className="flex items-center justify-between border-b py-2">
              <div>
                <a 
                  href={doc.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-blue-700 underline"
                  onClick={() => handleDocumentClick(doc._id)}
                >
                  {doc.title}
                </a>
                <div className="text-xs text-gray-500">Uploaded: {new Date(doc.uploadedAt).toLocaleString()}</div>
              </div>
              <button onClick={() => handleDelete(doc._id)} className="text-red-600 hover:underline text-sm" disabled={loading}>Delete</button>
            </li>
          ))}
        </ul>
        {documents.length === 0 && !loading && <div className="text-gray-500">No documents uploaded yet.</div>}
      </div>
    </div>
  );
} 