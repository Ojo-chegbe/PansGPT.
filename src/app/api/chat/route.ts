import { NextResponse } from "next/server";
import { generateChatResponse, ChatMessage } from "@/lib/google-ai";

const GOOGLE_API_KEY = process.env.GOOGLE_AI_API_KEY!;

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
    const searchResponse = await fetch("http://localhost:3000/api/search", {
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
        sourceGroups.forEach(({ chunks, relevance }, source) => {
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

    // Update the system message to be more specific about source handling and response style
    const systemMessage = `You are an advanced academic assistant with access to a curated database of course materials and documents. ${
      hasRelevantContent 
        ? `\n\nI found relevant information in the database for this query across ${sources.length} sources, covering ${Array.from(topicAreas).join(", ") || "various"} topics from ${Array.from(documentTypes).join(", ") || "various"} document types.\n\n${context}\n\n` +
          `IMPORTANT INSTRUCTIONS FOR RESPONSE GENERATION:\n` +
          `1. ALWAYS provide comprehensive explanations that combine document information with broader academic context.\n` +
          `2. Break down complex concepts into clear, simple terms while maintaining accuracy.\n` +
          `3. Use clear paragraph structure with topic sentences and supporting details.\n` +
          `4. When citing sources, use this format: "According to [Document Title/Source]..." and explain how it connects to the broader topic.\n` +
          `5. If the document information is incomplete, supplement with relevant academic knowledge while clearly indicating what comes from where.\n` +
          `6. Use examples and analogies to illustrate complex concepts when appropriate.\n` +
          `7. Address both the "what" and the "why" - explain not just what something is, but why it matters and how it's used.\n` +
          `8. If there are related concepts not mentioned in the documents but important for understanding, briefly explain those too.\n` +
          `9. Maintain an academic yet accessible tone - formal but not overly technical.\n` +
          `10. End with a brief summary that ties everything together.\n` +
          `11. For mathematical equations and chemical formulas:\n` +
          `    - Use LaTeX notation between $$ for display (block) equations (e.g., $$...$$)\n` +
          `    - Use LaTeX notation between \\( ... \\) for inline equations (e.g., \\( ... \\))\n` +
          `    - Do NOT use single $ for inline math.\n` +
          `    - Format subscripts using LaTeX notation (e.g., N_{acid} instead of N<sub>acid</sub>)\n` +
          `    - Include proper spacing in equations using LaTeX spacing commands\n` +
          `    - Define all variables after equations using a "Where:" section\n` +
          `    - Format chemical equations using proper LaTeX notation\n` +
          `12. When formatting "Where:" sections:\n` +
          `    - List each variable on a new line\n` +
          `    - Use consistent formatting for all variables\n` +
          `    - Include units where applicable\n` +
          `    - Use LaTeX notation for any mathematical symbols in the definitions\n` +
          `13. For the specific equation N_{acid} \times V_{acid} = N_{base} \times V_{base}:\n` +
          `    - Format it as: $$N_{acid} \\times V_{acid} = N_{base} \\times V_{base}$$\n` +
          `    - In the "Where:" section, format each variable as: \\(N_{acid}\\) = Normality of the acid\n`
        : `\n\nI don't have any relevant documents in the database for this query. I can:\n` +
          `1. Answer based on my general academic knowledge\n` +
          `2. Suggest uploading relevant documents through the upload form\n` +
          `3. Help rephrase the query to better match available documents\n\n` +
          `Would you like to try any of these options?`
    }`;

    // Use Google Gemma model for chat response with optimized parameters
    const messagesForAI: ChatMessage[] = [
      { role: "system", content: systemMessage },
      ...conversationHistory.map((msg: any) => ({ role: msg.role, content: msg.content })),
      { role: "user", content: message }
    ];
    
    const aiResponse = await generateChatResponse(GOOGLE_API_KEY, messagesForAI, {
      maxOutputTokens: 1024,  // Increased for more comprehensive responses
      temperature: 0.3,      // Reduced for more focused responses
      topK: 40,
      topP: 0.95,
    });

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
