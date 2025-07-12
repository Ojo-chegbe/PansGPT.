import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { getClient, closeClient } from '@/lib/db';
import { DataAPIClient } from '@datastax/astra-db-ts';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const EMBEDDING_SERVICE_URL = process.env.NEXT_PUBLIC_EMBEDDING_SERVICE_URL || "https://pansgpt.onrender.com";

// Utility function to sanitize filenames
function sanitizeFilename(filename: string): string {
  // Remove square brackets and any other problematic characters
  return filename
    .replace(/[\[\]]/g, '')  // Remove square brackets
    .replace(/[^a-zA-Z0-9._-]/g, '_')  // Replace other special chars with underscore
    .replace(/_{2,}/g, '_');  // Replace multiple consecutive underscores with single one
}

export async function POST(request: Request) {
  let client: ReturnType<typeof DataAPIClient.prototype.db> | null = null;
  
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      client = await getClient();
    } catch (connectError: any) {
      console.error('Failed to connect to Astra DB:', connectError.message);
      return NextResponse.json(
        { error: 'Failed to connect to database. Please check your configuration.' },
        { status: 500 }
      );
    }

    // Get the form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const metadata = {
      title: formData.get('title') as string,
      courseCode: formData.get('courseCode') as string,
      courseTitle: formData.get('courseTitle') as string,
      professorName: formData.get('professorName') as string,
      topic: formData.get('topic') as string,
      uploadedBy: session.user.id,
      uploadedAt: new Date().toISOString(),
      level: formData.get('level') as string || ''
    };
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Check if it's a text file
    if (!file.name.endsWith('.txt')) {
      return NextResponse.json({ error: 'Only .txt files are supported' }, { status: 400 });
    }

    // Generate a unique filename
    const timestamp = Date.now();
    const originalName = file.name;
    const uniqueFilename = `${timestamp}-${sanitizeFilename(originalName)}`;
    const documentId = `doc_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;

    // Convert File to Buffer for Supabase upload
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Get text content for processing
    const text = buffer.toString('utf-8');

    // Split text into chunks
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const chunks = await splitter.createDocuments([text]);

    // Upload file to Supabase Storage
    const { data: storageData, error: storageError } = await supabase.storage
      .from('documents')
      .upload(uniqueFilename, buffer, {
        contentType: 'text/plain',
        cacheControl: '3600',
      });

    if (storageError) {
      console.error('Supabase storage error:', storageError);
      return NextResponse.json({ error: 'Failed to upload to storage' }, { status: 500 });
    }

    try {
      // Get collections
      const documentsCollection = await client.createCollection('documents');
      const chunksCollection = await client.createCollection('document_chunks', {
        vector: {
          dimension: 384,
          metric: 'cosine'
        }
      });

      // Store document metadata
      await documentsCollection.insertOne({
        _id: documentId,
        file_name: originalName,
        title: metadata.title,
        course_code: metadata.courseCode,
        course_title: metadata.courseTitle,
        professor_name: metadata.professorName,
        topic: metadata.topic,
        file_url: storageData.path,
        uploaded_by: metadata.uploadedBy,
        uploaded_at: metadata.uploadedAt,
        level: metadata.level
      });

      // Store document chunks
      const chunkPromises = chunks.map(async (chunk, index) => {
        const chunkId = `${documentId}_chunk_${index}`;
        const chunkMetadata = {
          ...metadata,
          author: metadata.professorName,
          chunkIndex: index,
          totalChunks: chunks.length
        };

        // Generate embedding for the chunk
        const embedResponse = await fetch(`${EMBEDDING_SERVICE_URL}/embed`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ texts: [chunk.pageContent] }),
        });

        if (!embedResponse.ok) {
          throw new Error("Failed to generate chunk embedding");
        }

        const { embeddings } = await embedResponse.json();
        const embedding = embeddings[0];

        return chunksCollection.insertOne({
          _id: chunkId,
          document_id: documentId,
          chunk_text: chunk.pageContent,
          embedding: embedding,
          metadata: chunkMetadata
        });
      });

      await Promise.all(chunkPromises);

    } catch (dbError) {
      console.error('Astra DB error:', dbError);
      return NextResponse.json({ error: 'Failed to store document data' }, { status: 500 });
    }

    // Return success response
    return NextResponse.json({
      success: true,
      documentId,
      fileKey: uniqueFilename,
      url: storageData.path,
      chunks: chunks.length,
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    if (client) {
      await closeClient();
    }
  }
} 