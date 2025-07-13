import { NextResponse } from "next/server";
import { generateChatResponse, ChatMessage } from "@/lib/google-ai";

const GOOGLE_API_KEY = process.env.GOOGLE_AI_API_KEY!;
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://pansgpt.vercel.app';

interface DocumentChunk {
  chunk_text: string;
  metadata: {
    source: string;
    title?: string;
    author?: string;
    date?: string;
    page?: number;
    section?: string;
    topic?: string;
    type?: string;
    relevance_score?: number;
  };
}

export async function POST(req: Request) {
  try {
    const { message, conversationHistory = [] } = await req.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Search for relevant document chunks with expanded query context
    const searchResponse = await fetch(`${BASE_URL}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        query: message,
        // Include conversation history for better context
        context: conversationHistory.slice(-3).map((msg: ChatMessage) => msg.content).join(" "),
        filters: {
          min_relevance: 0.7,
          max_chunks: 8,
          // Extract potential source filters from the query
          source_filters: extractSourceFilters(message)
        }
      }),
    });

    let context = "";
    let sources: string[] = [];
    let hasRelevantContent = false;
    let topicAreas: Set<string> = new Set();
    let documentTypes: Set<string> = new Set();

    if (searchResponse.ok) {
      const { chunks } = await searchResponse.json();
      if (chunks && chunks.length > 0) {
        // Group chunks by source and metadata
        const sourceGroups = new Map<string, { 
          chunks: DocumentChunk[],
          relevance: number 
        }>();

        // Process and group chunks
        chunks.forEach((chunk: DocumentChunk) => {
          const source = chunk.metadata?.source || "Unknown source";
          if (!sourceGroups.has(source)) {
            sourceGroups.set(source, { 
              chunks: [],
              relevance: chunk.metadata?.relevance_score || 0
            });
          }
          sourceGroups.get(source)?.chunks.push(chunk);

          // Track topic areas and document types
          if (chunk.metadata?.topic) topicAreas.add(chunk.metadata.topic);
          if (chunk.metadata?.type) documentTypes.add(chunk.metadata.type);
        });

        // Build enhanced context with source information and metadata
        const contextParts: string[] = [];
        sourceGroups.forEach(({ chunks }, source) => {
          // Group chunks by section if available
          const sectionGroups = new Map<string, DocumentChunk[]>();
          chunks.forEach(chunk => {
            const section = chunk.metadata?.section || 'main';
            if (!sectionGroups.has(section)) {
              sectionGroups.set(section, []);
            }
            sectionGroups.get(section)?.push(chunk);
          });

          // Build source context with metadata
          const metadata = chunks[0].metadata;
          const titleInfo = metadata.title ? ` (${metadata.title})` : '';
          const authorInfo = metadata.author ? ` by ${metadata.author}` : '';
          const dateInfo = metadata.date ? ` - ${metadata.date}` : '';
          const typeInfo = metadata.type ? ` [${metadata.type}]` : '';
          
          let sourceContext = `Source: ${source}${titleInfo}${authorInfo}${dateInfo}${typeInfo}\n`;
          
          // Add section-organized content
          sectionGroups.forEach((sectionChunks, section) => {
            if (section !== 'main') {
              sourceContext += `\nSection: ${section}\n`;
            }
            sourceContext += sectionChunks
              .map(chunk => chunk.chunk_text.trim())
              .join("\n\n");
          });

          contextParts.push(sourceContext);
          sources.push(source);
        });
        
        context = contextParts.join("\n\n---\n\n");
        hasRelevantContent = true;
      }
    }

    // Add this helper function above the POST handler
    function extractSourceFilters(query: string): Record<string, string> {
      const filters: Record<string, string> = {};
      
      // Check for professor/author mentions
      const authorMatch = query.match(/according to (\w+)'s/i) || 
                         query.match(/from (\w+)'s/i) ||
                         query.match(/by professor (\w+)/i) ||
                         query.match(/prof\.? (\w+)/i);
      if (authorMatch) {
        filters.author = authorMatch[1];
      }

      // Check for document type mentions
      const typeMatch = query.match(/(notes?|slides?|lecture|document|paper) on/i);
      if (typeMatch) {
        filters.type = typeMatch[1].toLowerCase();
      }

      // Check for topic mentions
      const topicMatch = query.match(/on ([^,\.]+?)(?:,|\.|define|explain|describe|what|how)/i);
      if (topicMatch) {
        filters.topic = topicMatch[1].trim();
      }

      return filters;
    }

    // Limit context length to prevent token overflow
    const maxContextLength = 2000; // characters
    if (context.length > maxContextLength) {
      context = context.substring(0, maxContextLength) + "...\n\n[Context truncated for length]";
    }

    // Update the system message to be more specific about source handling and response style
    const systemMessage = `You are an advanced academic assistant with access to a curated database of course materials and documents. ${
      hasRelevantContent 
        ? `\n\nI found relevant information in the database for this query across ${sources.length} sources, covering ${Array.from(topicAreas).join(", ") || "various"} topics from ${Array.from(documentTypes).join(", ") || "various"} document types.\n\n${context}\n\n` +
          `IMPORTANT: Provide comprehensive explanations that combine document information with broader academic context. Use clear paragraph structure, cite sources as "According to [Source]...", and end with a brief summary. For math, use LaTeX notation ($$...$$ for display, \\(...\\) for inline).`
        : `\n\nI don't have any relevant documents in the database for this query. I can answer based on my general academic knowledge, suggest uploading relevant documents, or help rephrase the query.`
    }`;

    // Use Google Gemma model for chat response with optimized parameters
    const messagesForAI: ChatMessage[] = [
      { role: "system", content: systemMessage },
      ...conversationHistory.slice(-6).map((msg: any) => ({ role: msg.role, content: msg.content })), // Limit history to last 6 messages
      { role: "user", content: message }
    ];
    
    const aiResponse = await generateChatResponse(GOOGLE_API_KEY, messagesForAI, {
      maxOutputTokens: 4096,  // Increased significantly for complete responses
      temperature: 0.3,      // Reduced for more focused responses
      topK: 40,
      topP: 0.95,
    });

    // Log response length for debugging
    console.log('AI Response length:', aiResponse.length, 'characters');
    
    // Check if response seems incomplete (ends abruptly)
    if (aiResponse.length < 50 || aiResponse.trim().endsWith('...') || aiResponse.trim().endsWith('..')) {
      console.warn('Response appears incomplete:', aiResponse.substring(aiResponse.length - 100));
    }

    return NextResponse.json({
      response: aiResponse,
      hasContext: hasRelevantContent,
      sources: sources,
      metadata: {
        topicAreas: Array.from(topicAreas),
        documentTypes: Array.from(documentTypes),
        sourceCount: sources.length
      }
    });
  } catch (error) {
    console.error("Error in chat API:", error);
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    );
  }
}
