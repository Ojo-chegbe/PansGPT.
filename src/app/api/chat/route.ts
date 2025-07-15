import { ChatMessage, streamChatResponse } from "@/lib/google-ai";

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
    const { message, conversationHistory = [], userLevel } = await req.json();

    if (!message) {
      return new Response(JSON.stringify({ error: "Message is required" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
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
          const source = chunk.metadata?.source;
          if (!source) {
            // Skip chunks with no valid source
            return;
          }
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

    // Update the system message to be even more explicit about math and chemical formatting
    const systemMessage = `You are an advanced academic assistant with access to a curated database of course materials and documents. \
The user is at the ${userLevel || 'unspecified'} academic level. Tailor your explanations, examples, and language to be appropriate for this level.\
Please format your responses using clear visual hierarchy by employing bold, numbered lists, subheadings, and bullet points. Use line breaks between sections and concepts to reduce visual clutter. Do not use different text sizes or heading tags (like h1/h2); keep all text the same size and rely on formatting and spacing for structure.\
Cite sources only if they are provided. If no source is available, do not use [Source] or "Unknown source" in your response.\
IMPORTANT: For every chemical formula, ion, mathematical equation, calculation, or symbol (even inline), ALWAYS wrap it in LaTeX math delimiters: use $...$ for inline and $$...$$ for block. Do not use plain text for any formulas or symbols. For example: $H_3O^+$, $OH^-$, $x^2 + y^2 = r^2$, $$2H_2O(l) \rightleftharpoons H_3O^+(aq) + OH^-(aq)$$. Repeat: EVERY formula, symbol, or equation must be wrapped in math delimiters.\
IMPORTANT: For all chemical equations, formulas, and mathematical expressions, always wrap them in LaTeX math delimiters: use $$...$$ for display (block) and $...$ for inline. For example: $$HCl(aq) + NaOH(aq) \\rightarrow H_2O(l) + NaCl(aq)$$\
$$${
      hasRelevantContent 
        ? `\n\nI found relevant information in the database for this query across ${sources.length} sources, covering ${Array.from(topicAreas).join(", ") || "various"} topics from ${Array.from(documentTypes).join(", ") || "various"} document types.\n\n${context}\n\n` +
          `IMPORTANT: Provide comprehensive explanations that combine document information with broader academic context. Use clear paragraph structure, cite sources as \"According to [Source]...\", and end with a brief summary. For math, use LaTeX notation ($$...$$ for display, \\(...\\) for inline).`
        : `\n\nI don't have any relevant documents in the database for this query. I can answer based on my general academic knowledge, suggest uploading relevant documents, or help rephrase the query.`
    }`;

    // Use Google Gemma model for chat response with optimized parameters
    const messagesForAI: ChatMessage[] = [
      { role: "system", content: systemMessage },
      ...conversationHistory.slice(-6).map((msg: any) => ({ role: msg.role, content: msg.content })), // Limit history to last 6 messages
      { role: "user", content: message }
    ];
    
    // Streaming response
    const encoder = new TextEncoder();
    let firstChunk = true;
    const stream = new ReadableStream({
      async start(controller) {
        try {
          await streamChatResponse(GOOGLE_API_KEY, messagesForAI, {
            maxOutputTokens: 4096,
            temperature: 0.3,
            topK: 40,
            topP: 0.95,
          }, (chunk) => {
            // Stream as NDJSON for easy client parsing
            const data = JSON.stringify({ chunk });
            if (!firstChunk) controller.enqueue(encoder.encode("\n"));
            controller.enqueue(encoder.encode(data));
            firstChunk = false;
          });
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      }
    });
    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    console.error("Error in chat API:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
