import { NextResponse } from "next/server";
import { getClient } from "@/lib/db";

const ASTRA_DB_COLLECTION = process.env.ASTRA_DB_COLLECTION || 'document_chunks';
const EMBEDDING_SERVICE_URL = process.env.EMBEDDING_SERVICE_URL || 'https://p01--embedding-model--qq4rx7ycpfhm.code.run';

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

    // Search in Astra DB using vector similarity
    console.log('Connecting to AstraDB...');
    const client = await getClient();
    const collection = client.collection(ASTRA_DB_COLLECTION);

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

    let results: any[] = [];

    // Try vector search first if embedding service is available
    try {
      console.log('Getting embedding from service...');
      const embedResponse = await fetch(`${EMBEDDING_SERVICE_URL}/embed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts: [query] }),
      });

      if (embedResponse.ok) {
        const embedData = await embedResponse.json();
        console.log('Got embedding response:', { 
          hasEmbeddings: !!embedData.embeddings,
          embeddingSize: embedData.embeddings?.[0]?.length 
        });

        const queryEmbedding = embedData.embeddings[0];

        console.log('Performing vector search with filters:', filterConditions);
        
        // Perform vector similarity search with metadata filters using correct syntax
        results = await collection.find(
          filterConditions,
          {
            sort: {
              $vector: queryEmbedding
            },
            limit: filters.max_chunks || 5,
            includeSimilarity: true
          }
        ).toArray();

        console.log('Vector search results:', {
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
      } else {
        console.log('Embedding service not available, falling back to text search');
      }
    } catch (embedError) {
      console.log('Embedding service error, falling back to text search:', embedError);
    }

    // If no vector search results or embedding service failed, return empty results
    if (results.length === 0) {
      console.log('No vector search results found, trying text search fallback...');
      
      // Fallback to text search
      const allDocs = await collection.find({}).toArray();
      const textSearchResults = allDocs.filter(doc => 
        doc.chunk_text?.toLowerCase().includes(query.toLowerCase())
      );
      
      if (textSearchResults.length > 0) {
        console.log(`Text search fallback found ${textSearchResults.length} results`);
        results = textSearchResults.slice(0, filters.max_chunks || 5);
      } else {
        console.log('No text search results found either');
        return NextResponse.json({
          chunks: [],
          grouped_results: {},
          total: 0,
          query: query,
          metadata: {
            sources: [],
            topic_areas: [],
            document_types: []
          }
        });
      }
    }

    // Transform results to include similarity scores and enhanced metadata
    const chunks = results.map(doc => ({
      chunk_text: doc.chunk_text,
      metadata: {
        ...doc.metadata,
        author: doc.metadata?.author || doc.metadata?.professorName,
        relevance_score: doc.$similarity || 0.5, // Default score for text search results
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
