import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getClient } from "@/lib/db";
import { generateEmbeddings } from "@/lib/embedding-service";

// --- CONFIG ---
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const ASTRA_DB_COLLECTION = process.env.ASTRA_DB_COLLECTION!;

export async function POST(request: Request) {
  try {
    const { 
      fileKey,
      documentId,
      metadata = {
        professorName: "",
        title: "",
        courseCode: "",
        courseTitle: "",
        topic: "",
        course: "",
        level: ""
      } 
    } = await request.json();

    if (!fileKey) {
      return NextResponse.json({ 
        error: "Missing required parameter: fileKey" 
      }, { status: 400 });
    }

    if (!documentId) {
      return NextResponse.json({ 
        error: "Missing required parameter: documentId" 
      }, { status: 400 });
    }

    // Create Supabase client with service role key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { 
      auth: { persistSession: false } 
    });

    // Download file from Supabase
    const { data, error: downloadError } = await supabase.storage
      .from('documents')
      .download(fileKey);

    if (downloadError) {
      console.error("Supabase download error:", downloadError);
      return NextResponse.json({ 
        error: `Failed to download file from Supabase: ${downloadError.message}` 
      }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ 
        error: "Downloaded file data is empty" 
      }, { status: 500 });
    }

    let extractedTexts: string[] = [];
    try {
      // Convert the downloaded data to a buffer
      const buffer = Buffer.from(await data.arrayBuffer());
      
      // For now, just try to read as text
      const text = buffer.toString('utf-8');
      if (text) {
        // Split text into chunks by paragraphs
        extractedTexts = text
          .split(/\n\s*\n/)
          .map(chunk => chunk.trim())
          .filter(chunk => chunk.length > 0);
      }
    } catch (extractError) {
      console.error("Text extraction error:", extractError);
      return NextResponse.json({ 
        error: "Failed to extract text from file" 
      }, { status: 500 });
    }

    if (extractedTexts.length === 0) {
      return NextResponse.json({ 
        error: "No text could be extracted from the file" 
      }, { status: 400 });
    }

    // Get embeddings from hosted service
    let embeddings;
    try {
      embeddings = await generateEmbeddings(extractedTexts);
    } catch (embedError) {
      console.error("Embedding service error:", embedError);
      return NextResponse.json({ 
        error: "Failed to generate embeddings. Please check if the embedding service is available." 
      }, { status: 500 });
    }

    // Store in Astra DB
    try {
      const client = await getClient();
      const chunksCollection = client.collection(ASTRA_DB_COLLECTION);

      // First, delete any existing chunks for this document
      try {
        await chunksCollection.deleteMany({ document_id: documentId });
      } catch (deleteError) {
        console.log('No existing chunks to delete');
      }

      const documents = embeddings.map((embedding: number[], i: number) => ({
        _id: `${documentId}_${Date.now()}_chunk_${i}`, // Make IDs unique with timestamp
        document_id: documentId,
        chunk_index: i,
        chunk_text: extractedTexts[i],
        $vector: embedding,
        created_at: new Date().toISOString(),
        metadata: {
          ...metadata,
          author: metadata.professorName,
          source: `${metadata.professorName}'s notes`,
          fullSource: `${metadata.professorName}'s notes on ${metadata.topic} (${metadata.course})`,
          level: metadata.level || ''
        }
      }));

      // Insert new chunks
      await chunksCollection.insertMany(documents);

      return NextResponse.json({ 
        success: true, 
        document_id: documentId, 
        chunks_count: embeddings.length 
      });
    } catch (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json({ 
        error: "Failed to store document in database" 
      }, { status: 500 });
    }
  } catch (err) {
    console.error("Process document error:", err);
    return NextResponse.json({ 
      error: "An unexpected error occurred while processing the document" 
    }, { status: 500 });
  }
} 