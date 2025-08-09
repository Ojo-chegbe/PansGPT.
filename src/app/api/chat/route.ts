import { ChatMessage, streamChatResponse } from "@/lib/google-ai";

const GOOGLE_API_KEY = process.env.GOOGLE_AI_API_KEY!;
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://pansgpt.vercel.app';

interface DocumentChunk {
  chunk_text: string;
  metadata: {
    source?: string;
    title?: string;
    author?: string;
    date?: string;
    page?: number;
    section?: string;
    topic?: string;
    type?: string;
    relevance_score?: number;
    // Add the nested context structure that search API returns
    context?: {
      section: string;
      topic_area: string;
      document_type: string;
      course_info: {
        code?: string;
        title?: string;
      };
      professor?: string;
      date?: string;
      related_concepts?: string[];
    };
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
      console.log('Search response received:', {
        hasChunks: !!chunks,
        chunksLength: chunks?.length,
        chunksType: typeof chunks,
        firstChunk: chunks?.[0] ? {
          hasChunkText: !!chunks[0].chunk_text,
          chunkTextLength: chunks[0].chunk_text?.length,
          hasMetadata: !!chunks[0].metadata,
          metadataKeys: chunks[0].metadata ? Object.keys(chunks[0].metadata) : [],
          source: chunks[0].metadata?.source,
          author: chunks[0].metadata?.author
        } : null
      });
      
      if (chunks && chunks.length > 0) {
        // Group chunks by source and metadata
        const sourceGroups = new Map<string, { 
          chunks: DocumentChunk[],
          relevance: number 
        }>();

        // Process and group chunks
        chunks.forEach((chunk: DocumentChunk) => {
          // Handle both old and new metadata structures
          const source = chunk.metadata?.source || 
                        (chunk.metadata?.context?.course_info?.code && chunk.metadata?.context?.professor 
                          ? `${chunk.metadata.context.course_info.code} - ${chunk.metadata.context.professor}`
                          : chunk.metadata?.context?.professor);
          
          console.log('Processing chunk:', {
            hasSource: !!source,
            source: source,
            hasChunkText: !!chunk.chunk_text,
            chunkTextLength: chunk.chunk_text?.length,
            hasContext: !!chunk.metadata?.context,
            contextKeys: chunk.metadata?.context ? Object.keys(chunk.metadata.context) : []
          });
          
          if (!source) {
            // Skip chunks with no valid source
            console.log('Skipping chunk with no source');
            return;
          }
          if (!sourceGroups.has(source)) {
            sourceGroups.set(source, { 
              chunks: [],
              relevance: chunk.metadata?.relevance_score || 0
            });
          }
          sourceGroups.get(source)?.chunks.push(chunk);

          // Track topic areas and document types - handle both structures
          const topic = chunk.metadata?.topic || chunk.metadata?.context?.topic_area;
          const type = chunk.metadata?.type || chunk.metadata?.context?.document_type;
          if (topic) topicAreas.add(topic);
          if (type) documentTypes.add(type);
        });

        console.log('Source groups created:', {
          sourceGroupsSize: sourceGroups.size,
          sourceGroupsKeys: Array.from(sourceGroups.keys())
        });

        // Build enhanced context with source information and metadata
        const contextParts: string[] = [];
        sourceGroups.forEach(({ chunks }, source) => {
          console.log('Building context for source:', source, {
            chunksCount: chunks.length
          });
          
          // Group chunks by section if available
          const sectionGroups = new Map<string, DocumentChunk[]>();
          chunks.forEach(chunk => {
            const section = chunk.metadata?.section || chunk.metadata?.context?.section || 'main';
            if (!sectionGroups.has(section)) {
              sectionGroups.set(section, []);
            }
            sectionGroups.get(section)?.push(chunk);
          });

          // Build source context with metadata - handle both structures
          const metadata = chunks[0].metadata;
          const titleInfo = metadata.title ? ` (${metadata.title})` : '';
          const authorInfo = (metadata.author || metadata.context?.professor) ? ` by ${metadata.author || metadata.context?.professor}` : '';
          const dateInfo = (metadata.date || metadata.context?.date) ? ` - ${metadata.date || metadata.context?.date}` : '';
          const typeInfo = (metadata.type || metadata.context?.document_type) ? ` [${metadata.type || metadata.context?.document_type}]` : '';
          
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

          console.log('Source context built:', {
            sourceContextLength: sourceContext.length,
            sourceContextPreview: sourceContext.substring(0, 100) + '...'
          });

          contextParts.push(sourceContext);
          sources.push(source);
        });
        
        context = contextParts.join("\n\n---\n\n");
        hasRelevantContent = true;
        
        console.log('Final context built:', {
          contextLength: context.length,
          contextPreview: context.substring(0, 200) + '...',
          sourcesCount: sources.length,
          topicAreasCount: topicAreas.size,
          documentTypesCount: documentTypes.size
        });
        
        // Fallback: if no context was built but we have chunks, build a simple context
        if (context.length === 0 && chunks.length > 0) {
          console.log('No context built from source groups, building fallback context');
          const fallbackContext = chunks
            .map((chunk: DocumentChunk) => chunk.chunk_text)
            .filter((text: string) => text && text.trim().length > 0)
            .join("\n\n---\n\n");
          
          if (fallbackContext.length > 0) {
            context = fallbackContext;
            hasRelevantContent = true;
            console.log('Fallback context built:', {
              contextLength: context.length,
              contextPreview: context.substring(0, 200) + '...'
            });
          }
        }
      } else {
        console.log('No chunks found in search response');
      }
    } else {
      console.log('Search response not ok:', searchResponse.status, searchResponse.statusText);
    }

    // Add this helper function above the POST handler
    function extractSourceFilters(query: string): Record<string, string> {
      const filters: Record<string, string> = {};
      
      // Check for professor/author mentions - improved patterns
      const authorMatch = query.match(/according to (?:dr\.? )?(\w+)/i) || 
                         query.match(/from (?:dr\.? )?(\w+)/i) ||
                         query.match(/by (?:professor|prof\.? )?(\w+)/i) ||
                         query.match(/prof\.? (\w+)/i) ||
                         query.match(/dr\.? (\w+)/i);
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

    // Determine if the user explicitly requests document references - improved logic
    const docKeywords = [
      'document', 'source', 'notes', 'reference', 'slide', 'paper', 'according to', 'from', 'by professor', 'prof.', 'dr.'
    ];
    const messageLower = message.toLowerCase();
    const userWantsDocs = docKeywords.some(kw => messageLower.includes(kw)) || 
                         messageLower.includes('according to') ||
                         messageLower.includes('dr.') ||
                         messageLower.includes('professor');

    // Debug logging
    console.log('Chat request debug:', {
      message,
      userWantsDocs,
      hasRelevantContent,
      contextLength: context.length,
      sources: sources.length,
      extractedFilters: extractSourceFilters(message)
    });

    // Limit context length to prevent token overflow
    const maxContextLength = 2000; // characters
    if (context.length > maxContextLength) {
      context = context.substring(0, maxContextLength) + "...\n\n[Context truncated for length]";
    }

    // Update the system message to only reference documents if user requests it
    let systemMessage = "You are an advanced academic assistant.";
    
    // Always use document context if we have relevant content and user is asking for specific sources
    const shouldUseDocs = (userWantsDocs && hasRelevantContent) || 
                         (hasRelevantContent && (messageLower.includes('according to') || messageLower.includes('dr.') || messageLower.includes('professor')));
    
    if (shouldUseDocs) {
      systemMessage = `You are an advanced academic assistant. You have access to a curated database of course materials and documents.
The user is asking for specific information from documents or sources. Use the provided context below to answer their question accurately.
IMPORTANT: The context below contains the actual document content that the user is asking about. You MUST use this information to provide your answer. Do not say you don't have access to the documents - you do have access through the context provided below.

The user is at the ${userLevel || 'unspecified'} academic level. Tailor your explanations, examples, and language to be appropriate for this level.

RESPONSE STYLE: Be direct, concise, and to-the-point. Give clear, simple answers unless the user specifically asks for detailed explanations. Avoid unnecessary academic verbosity.

Please format your responses using clear visual hierarchy by employing bold, numbered lists, subheadings, and bullet points. Use line breaks between sections and concepts to reduce visual clutter. Do not use different text sizes or heading tags (like h1/h2); keep all text the same size and rely on formatting and spacing for structure.
IMPORTANT: For every chemical formula, ion, mathematical equation, calculation, or symbol (even inline), ALWAYS wrap it in LaTeX math delimiters: use $...$ for inline and $$...$$ for block. Do not use plain text for any formulas or symbols. For example: $H_3O^+$, $OH^-$, $x^2 + y^2 = r^2$, $$2H_2O(l) \rightleftharpoons H_3O^+(aq) + OH^-(aq)$$. Repeat: EVERY formula, symbol, or equation must be wrapped in math delimiters.
IMPORTANT: For all chemical equations, formulas, and mathematical expressions, always wrap them in LaTeX math delimiters: use $$...$$ for display (block) and $...$ for inline. For example: $$HCl(aq) + NaOH(aq) \\rightarrow H_2O(l) + NaCl(aq)$$

I found relevant information in the database for this query across ${sources.length} sources, covering ${Array.from(topicAreas).join(", ") || "various"} topics from ${Array.from(documentTypes).join(", ") || "various"} document types.

CONTEXT FROM DOCUMENTS:
${context}

IMPORTANT: Provide direct, clear answers using document information. Be concise unless asked for details. Cite sources as "According to [Source]..." when relevant. For math, use LaTeX notation ($$...$$ for display, \\(...\\) for inline).`;
    } else if (hasRelevantContent) {
      // If we have content but user didn't explicitly ask for docs, offer it
      systemMessage = `You are an advanced academic assistant. You have access to a curated database of course materials and documents.
The user is at the ${userLevel || 'unspecified'} academic level. Tailor your explanations, examples, and language to be appropriate for this level.

RESPONSE STYLE: Be direct, concise, and to-the-point. Give clear, simple answers unless the user specifically asks for detailed explanations. Avoid unnecessary academic verbosity.

Please format your responses using clear visual hierarchy by employing bold, numbered lists, subheadings, and bullet points. Use line breaks between sections and concepts to reduce visual clutter. Do not use different text sizes or heading tags (like h1/h2); keep all text the same size and rely on formatting and spacing for structure.
IMPORTANT: For every chemical formula, ion, mathematical equation, calculation, or symbol (even inline), ALWAYS wrap it in LaTeX math delimiters: use $...$ for inline and $$...$$ for block. Do not use plain text for any formulas or symbols. For example: $H_3O^+$, $OH^-$, $x^2 + y^2 = r^2$, $$2H_2O(l) \rightleftharpoons H_3O^+(aq) + OH^-(aq)$$. Repeat: EVERY formula, symbol, or equation must be wrapped in math delimiters.
IMPORTANT: For all chemical equations, formulas, and mathematical expressions, always wrap them in LaTeX math delimiters: use $$...$$ for display (block) and $...$ for inline. For example: $$HCl(aq) + NaOH(aq) \\rightarrow H_2O(l) + NaCl(aq)$$

I found some relevant information in the database that might be helpful:

${context}

You can use this information to enhance your response, but also draw from your general knowledge to provide a comprehensive answer.`;
    } else {
      systemMessage = `You are an advanced academic assistant. Reply neutrally and conversationally to greetings, general, or non-document questions. Only reference documents if the user explicitly asks for them.
The user is at the ${userLevel || 'unspecified'} academic level. Tailor your explanations, examples, and language to be appropriate for this level.

RESPONSE STYLE: Be direct, concise, and to-the-point. Give clear, simple answers unless the user specifically asks for detailed explanations. Avoid unnecessary academic verbosity.

Please format your responses using clear visual hierarchy by employing bold, numbered lists, subheadings, and bullet points. Use line breaks between sections and concepts to reduce visual clutter. Do not use different text sizes or heading tags (like h1/h2); keep all text the same size and rely on formatting and spacing for structure.
Do not cite sources or reference documents unless the user requests it.
IMPORTANT: For every chemical formula, ion, mathematical equation, calculation, or symbol (even inline), ALWAYS wrap it in LaTeX math delimiters: use $...$ for inline and $$...$$ for block. Do not use plain text for any formulas or symbols. For example: $H_3O^+$, $OH^-$, $x^2 + y^2 = r^2$, $$2H_2O(l) \rightleftharpoons H_3O^+(aq) + OH^-(aq)$$. Repeat: EVERY formula, symbol, or equation must be wrapped in math delimiters.
IMPORTANT: For all chemical equations, formulas, and mathematical expressions, always wrap them in LaTeX math delimiters: use $$...$$ for display (block) and $...$ for inline. For example: $$HCl(aq) + NaOH(aq) \\rightarrow H_2O(l) + NaCl(aq)$$`;
    }

    // Use Google Gemma model for chat response with optimized parameters
    const messagesForAI: ChatMessage[] = [
      { role: "system", content: systemMessage },
      ...conversationHistory.slice(-6).map((msg: any) => ({ role: msg.role, content: msg.content })), // Limit history to last 6 messages
      { role: "user", content: message }
    ];
    
    // Debug logging for AI context
    console.log('AI Context Debug:', {
      shouldUseDocs,
      hasRelevantContent,
      contextLength: context.length,
      systemMessageLength: systemMessage.length,
      contextPreview: context.substring(0, 200) + '...',
      userMessage: message
    });
    
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
