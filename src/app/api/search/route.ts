import { NextResponse } from "next/server";
import { DataAPIClient as AstraDB } from "@datastax/astra-db-ts";

const ASTRA_DB_APPLICATION_TOKEN = process.env.ASTRA_DB_APPLICATION_TOKEN!;
const ASTRA_DB_ENDPOINT = process.env.ASTRA_DB_ENDPOINT!;
const ASTRA_DB_COLLECTION = process.env.ASTRA_DB_COLLECTION || 'document_chunks';

export async function GET(req: Request) {
  return new Response("Hello, world!");
}

// Export a POST handler that returns 501 for unsupported methods
export async function POST(request: Request) {
  try {
    const { query, filters = {} } = await request.json();
    console.log('Search request:', { query, filters });

    if (!query) {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    // Get embedding for the query from Python service
    console.log('Getting embedding from service...');
    const embedResponse = await fetch("http://localhost:8000/embed", {
      method: "POST",
    headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts: [query] }),
    });

    if (!embedResponse.ok) {
      console.error('Embedding service error:', await embedResponse.text());
      throw new Error("Failed to generate query embedding");
    }

    const embedData = await embedResponse.json();
    console.log('Got embedding response:', { 
      hasEmbeddings: !!embedData.embeddings,
      embeddingSize: embedData.embeddings?.[0]?.length 
    });

    const queryEmbedding = embedData.embeddings[0];

    // Search in Astra DB using vector similarity
    console.log('Connecting to AstraDB...');
    const astraClient = new AstraDB(ASTRA_DB_APPLICATION_TOKEN);
    const db = astraClient.db(ASTRA_DB_ENDPOINT);
    const collection = db.collection(ASTRA_DB_COLLECTION);

    // Build filter conditions based on source filters
    const filterConditions: any = {};
    
    if (filters.author) {
      filterConditions["metadata.professorName"] = filters.author;
    }
    
    if (filters.topic) {
      filterConditions["metadata.topic"] = filters.topic;
    }

    // Add level filter if provided
    if (filters.level) {
      filterConditions["metadata.level"] = filters.level;
    }

    console.log('Performing vector search with filters:', filterConditions);
    
    // Perform vector similarity search with metadata filters
    const results = await collection.find(
      filterConditions,
      {
        sort: {
          embedding: queryEmbedding
        },
        limit: filters.max_chunks || 5,
        includeSimilarity: true
      }
    ).toArray();

    console.log('Search results:', {
      count: results.length,
      firstResult: results[0] ? {
        hasChunkText: !!results[0].chunk_text,
        hasMetadata: !!results[0].metadata,
        hasSimilarity: !!results[0].$similarity,
        embeddingPresent: !!results[0].embedding,
        similarityScore: results[0].$similarity,
        textPreview: results[0].chunk_text?.substring(0, 100)
      } : null
    });

    if (results.length === 0) {
      console.log('No results found. Query embedding:', {
        size: queryEmbedding.length,
        sample: queryEmbedding.slice(0, 5)
      });
    }

    // Transform results to include similarity scores and enhanced metadata
    const chunks = results.map(doc => ({
      chunk_text: doc.chunk_text,
      metadata: {
        ...doc.metadata,
        relevance_score: doc.$similarity,
        context: {
          section: doc.metadata?.section || 'main',
          topic_area: doc.metadata?.topic || 'general',
          document_type: doc.metadata?.type || 'unknown',
          course_info: {
            code: doc.metadata?.courseCode,
            title: doc.metadata?.courseTitle
          },
          professor: doc.metadata?.professorName,
          date: doc.metadata?.date,
          related_concepts: doc.metadata?.relatedConcepts || []
        }
      }
    }));

    interface GroupedChunks {
      [key: string]: {
        source_info: {
          course: {
            code: string | undefined;
            title: string | undefined;
          };
          professor: string | undefined;
          document_type: string;
          date: string | undefined;
        };
        chunks: typeof chunks[0][];
      };
    }

    // Group chunks by document/source for better context
    const groupedChunks = chunks.reduce<GroupedChunks>((acc, chunk) => {
      const sourceKey = `${chunk.metadata.context.course_info.code || ''} - ${chunk.metadata.context.professor || 'Unknown'}`;
      if (!acc[sourceKey]) {
        acc[sourceKey] = {
          source_info: {
            course: chunk.metadata.context.course_info,
            professor: chunk.metadata.context.professor,
            document_type: chunk.metadata.context.document_type,
            date: chunk.metadata.context.date
          },
          chunks: []
        };
      }
      acc[sourceKey].chunks.push(chunk);
      return acc;
    }, {});

    return NextResponse.json({
      chunks: chunks,
      grouped_results: groupedChunks,
      total: chunks.length,
      query: query,
      metadata: {
        sources: Object.keys(groupedChunks),
        topic_areas: [...new Set(chunks.map(c => c.metadata.context.topic_area))],
        document_types: [...new Set(chunks.map(c => c.metadata.context.document_type))]
      }
    });

  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Failed to search documents", details: error.message },
      { status: 500 }
    );
  }
}
