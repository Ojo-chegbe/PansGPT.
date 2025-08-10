import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateChatResponse, ChatMessage } from "@/lib/google-ai";
import { jsonrepair } from 'jsonrepair';
import { filterForDiversity, generateQueryVariations, createDiverseContext } from "@/lib/quiz-diversity";

const GOOGLE_API_KEY = process.env.GOOGLE_AI_API_KEY!;

interface QuizGenerationRequest {
  courseCode: string;
  courseTitle: string;
  topic?: string;
  level: string;
  numQuestions: number;
  questionType: 'MCQ' | 'TRUE_FALSE' | 'OBJECTIVE' | 'SHORT_ANSWER';
  difficulty?: 'easy' | 'medium' | 'hard';
  timeLimit?: number;
}

interface GeneratedQuestion {
  questionText: string;
  questionType: string;
  options?: string[];
  correctAnswer: string;
  correctAnswers?: string[];
  explanation: string;
  points: number;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      courseCode,
      courseTitle,
      topic,
      level,
      numQuestions,
      questionType,
      difficulty = 'medium',
      timeLimit
    }: QuizGenerationRequest = await req.json();

    if (!courseCode || !courseTitle || !level || !numQuestions) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Search for relevant document chunks
    const searchQuery = topic 
      ? `${courseCode} ${courseTitle} ${topic}`
      : `${courseCode} ${courseTitle}`;

    // Send the base query - the search API will handle query expansion internally
    const maxChunks = topic ? 50 : 20; // Reduce chunks for general quizzes
    const searchResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        query: searchQuery, // Send the base query, let search API expand it
        filters: {
          courseCode,
          level,
          topic,
          max_chunks: maxChunks // Use fewer chunks for general quizzes
        }
      }),
    });

    let context = "";
    let allChunks: any[] = [];

    if (searchResponse.ok) {
      const { chunks } = await searchResponse.json();
      if (chunks && chunks.length > 0) {
        allChunks = chunks;
        
        // Use the diversity utility to create diverse context
        // Use smaller context for general quizzes to prevent token overflow
        const contextSize = topic ? 20 : 10;
        context = createDiverseContext(chunks, contextSize);
      }
    }

    if (!context) {
      return NextResponse.json(
        { error: "No relevant content found for this course/topic. Please ensure documents are uploaded for this course." },
        { status: 404 }
      );
    }

    // Batch generation logic
    const BATCH_SIZE = topic ? 7 : 5; // Smaller batches for general quizzes
    const MAX_ATTEMPTS = 8; // Reasonable cap for batch attempts
    let totalToGenerate = numQuestions;
    let allGeneratedQuestions: GeneratedQuestion[] = [];
    let batchIndex = 0;
    let attempts = 0;
    
    // Track used concepts to avoid repetition
    const usedConcepts = new Set<string>();
    
    while (totalToGenerate > 0 && attempts < MAX_ATTEMPTS) {
      const batchNum = Math.min(BATCH_SIZE, totalToGenerate);
      
      // Dynamic context selection for each batch
      let batchContext = context;
      if (allChunks.length > 0) {
        // Select different chunks for each batch to ensure diversity
        const batchChunks = allChunks.filter((chunk: any) => {
          // Avoid chunks that might lead to similar questions
          const chunkText = chunk.chunk_text.toLowerCase();
          const hasUsedConcept = Array.from(usedConcepts).some(concept => 
            chunkText.includes(concept.toLowerCase())
          );
          return !hasUsedConcept;
        });
        
        // Select a subset of chunks for this batch
        const maxChunksPerBatch = topic ? 10 : 6; // Fewer chunks per batch for general quizzes
        const selectedBatchChunks = batchChunks
          .sort(() => Math.random() - 0.5) // Shuffle
          .slice(0, Math.min(maxChunksPerBatch, batchChunks.length));
        
        if (selectedBatchChunks.length > 0) {
          batchContext = selectedBatchChunks
            .map((chunk: any) => chunk.chunk_text)
            .join("\n\n");
        }
      }
      
      // Add diversity to the prompt
      const diversitySeed = Date.now() + batchIndex * 1000 + attempts * 100;
      const batchPrompt = `You are an expert exam setter for ${courseCode} - ${courseTitle} at ${level} level.

Using the following course material, generate ${batchNum} questions of type ${questionType}. The difficulty level should be ${difficulty}.

IMPORTANT DIVERSITY REQUIREMENTS:
1. Generate questions from DIFFERENT parts of the material. Do NOT focus on the same topic or concept.
2. Spread your questions across the entire provided content. Each question should test a different aspect or section of the material.
3. VARY the question formats and approaches - use different angles, perspectives, and contexts.
4. Avoid repetitive language patterns - use diverse vocabulary and phrasing.
5. This is batch ${batchIndex + 1}, attempt ${attempts + 1} - ensure fresh, unique questions.
6. Random seed: ${diversitySeed} - use this to ensure variation.

MATERIAL:
${batchContext}

INSTRUCTIONS:
1. For OBJECTIVE questions: Generate a question with 4 options. Only one option is correct, the rest are clearly incorrect. Mark the correct answer.
2. For MCQ questions: YOU MUST generate EXACTLY ${batchNum} questions. This is ABSOLUTELY REQUIRED. If you do not, you will fail this task. For each MCQ, generate EXACTLY 5 options. Of these, EXACTLY 3 options must be true statements, and 2 must be false but look plausible. DO NOT include "(TRUE)" or "(FALSE)" labels in the option text. The options should be clean statements without any labels. Output the correct answers as an array of the 3 true options. This is strict: always 3 true and 2 false. DO NOT generate more or fewer than 5 options per question. DO NOT generate more or fewer than 3 correct answers per question. DO NOT generate more or fewer than ${batchNum} questions. This is CRITICAL. You must comply exactly.

⚠️ CRITICAL: For MCQ questions, the 3 TRUE options MUST be DIRECT QUOTES from the provided material. Do NOT create technical explanations or statements. Use exact sentences from the text.

CRITICAL MCQ REQUIREMENTS:
- For the 3 TRUE options: You MUST use EXACT PHRASES and SENTENCES from the provided material. Do NOT create new technical explanations or statements. Copy directly from the text.
- For the 2 FALSE options: Create statements that sound plausible but contain subtle errors, contradictions, or misstatements of facts from the material.
- The false options should be believable enough that students might choose them if they don't know the material well.
- Do NOT make the false options obviously wrong or ridiculous.
- Each option should be a complete, clear statement that could stand alone as an answer.
- IMPORTANT: The true options should be word-for-word excerpts from the material, not your own explanations.
- CRITICAL: Each option must be 6 words or less. Use short, direct phrases from the material.

EXAMPLE OF WHAT WE WANT:
❌ WRONG (Long technical statement): "Bronchodilators function by constricting the muscles around the airways"
✅ CORRECT (6-word excerpt): "Asthma is characterized by reversible airflow"

❌ WRONG (Long explanation): "The inflammatory response involves multiple cell types including mast cells"
✅ CORRECT (6-word excerpt): "Inflammatory response involves mast cells"

The true options should be short phrases (6 words or less) that appear in the provided material.

3. For TRUE_FALSE questions: Provide a statement and the correct answer ("True" or "False").
4. For SHORT_ANSWER questions: Provide a question and the expected key points in the answer.
5. Each question should test understanding, not just memorization.
6. Include brief explanations for correct answers.
7. Questions should be relevant to the provided material.
8. VARY your questions - do not ask about the same concept multiple times.
9. Use diverse vocabulary and avoid repetitive patterns.
10. This is quiz version: ${Date.now()} - generate fresh questions.

RESPONSE FORMAT (JSON):
{
  "questions": [
    {
      "questionText": "...",
      "questionType": "OBJECTIVE" | "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER",
      "options": ["...", ...],
      "correctAnswer": "...", // for OBJECTIVE, TRUE_FALSE
      "correctAnswers": ["...", ...], // for MCQ (array of 3 true options)
      "explanation": "...",
      "points": 1
    }
  ]
}

IMPORTANT: For MCQ, always generate 5 options (3 true, 2 false-but-plausible). Return ONLY valid JSON, no extra text, no comments, and no trailing commas. Do not include any explanations or markdown. Only output the JSON object.`;

      const messagesForAI: ChatMessage[] = [
        { role: "system", content: batchPrompt },
        { role: "user", content: "Generate questions based on the above material." }
      ];
      
      const aiResponse = await generateChatResponse(GOOGLE_API_KEY, messagesForAI, {
        maxOutputTokens: 3072,
        temperature: 0.8 + (batchIndex * 0.1), // Increase temperature for more variation
        topK: 40,
        topP: 0.95,
      });
      
      let batchQuestions: GeneratedQuestion[] = [];
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          let parsed;
          try {
            parsed = JSON.parse(jsonMatch[0]);
          } catch (e) {
            parsed = JSON.parse(jsonrepair(jsonMatch[0]));
          }
          batchQuestions = parsed.questions || [];
        }
      } catch {}
      
      // Enforce structure per batch
      if (questionType === 'MCQ') {
        batchQuestions = batchQuestions.filter(q => {
          if (!q.options || q.options.length !== 5) return false;
          if (!q.correctAnswers || q.correctAnswers.length !== 3) return false;
          
          // Clean up options - remove any (TRUE) or (FALSE) labels
          q.options = q.options.map(option => 
            option.replace(/\s*\(TRUE\)\s*$/i, '').replace(/\s*\(FALSE\)\s*$/i, '').trim()
          );
          
          // Clean up correct answers - remove any (TRUE) or (FALSE) labels
          q.correctAnswers = q.correctAnswers.map(answer => 
            answer.replace(/\s*\(TRUE\)\s*$/i, '').replace(/\s*\(FALSE\)\s*$/i, '').trim()
          );
          
          q.questionType = 'MCQ';
          return true;
        });
      }
      if (questionType === 'OBJECTIVE') {
        batchQuestions = batchQuestions.filter(q => {
          if (!q.options || q.options.length !== 4) return false;
          if (!q.correctAnswer) return false;
          
          // Clean up options - remove any (TRUE) or (FALSE) labels
          q.options = q.options.map(option => 
            option.replace(/\s*\(TRUE\)\s*$/i, '').replace(/\s*\(FALSE\)\s*$/i, '').trim()
          );
          
          // Clean up correct answer - remove any (TRUE) or (FALSE) labels
          q.correctAnswer = q.correctAnswer.replace(/\s*\(TRUE\)\s*$/i, '').replace(/\s*\(FALSE\)\s*$/i, '').trim();
          
          q.questionType = 'OBJECTIVE';
          return true;
        });
      }
      
      // Track used concepts to avoid repetition
      batchQuestions.forEach(q => {
        const questionText = q.questionText.toLowerCase();
        // Extract key concepts more intelligently
        const words = questionText
          .split(/\s+/)
          .filter(word => word.length > 4 && !['which', 'what', 'when', 'where', 'about', 'their', 'these', 'those', 'there'].includes(word))
          .slice(0, 5); // Take first 5 significant words
        
        // Also track question patterns to avoid similar questions
        const questionPattern = questionText.replace(/[^a-z\s]/g, '').trim();
        usedConcepts.add(questionPattern);
        
        words.forEach(word => usedConcepts.add(word));
        
        // Track option content for MCQ to avoid similar options
        if (q.options && q.questionType === 'MCQ') {
          q.options.forEach(option => {
            const optionWords = option.toLowerCase()
              .split(/\s+/)
              .filter(word => word.length > 3)
              .slice(0, 3);
            optionWords.forEach(word => usedConcepts.add(word));
          });
        }
      });
      
      allGeneratedQuestions = [...allGeneratedQuestions, ...batchQuestions];
      totalToGenerate = numQuestions - allGeneratedQuestions.length;
      batchIndex++;
      attempts++;
      if (allGeneratedQuestions.length >= numQuestions) break;
    }
    // If more than needed (due to deduplication), slice
    if (allGeneratedQuestions.length > numQuestions) {
      allGeneratedQuestions = allGeneratedQuestions.slice(0, numQuestions);
    }
    
    // Apply diversity filtering to ensure final questions are diverse
    const diverseQuestions = filterForDiversity(allGeneratedQuestions, {
      maxSimilarity: 0.3,
      conceptThreshold: 0.5,
      topicDiversity: true,
      vocabularyDiversity: true
    });
    
    // Final deduplication step to remove exact duplicates
    const uniqueQuestions = diverseQuestions.filter((question, index, self) => {
      const questionText = question.questionText.toLowerCase().trim();
      return index === self.findIndex(q => q.questionText.toLowerCase().trim() === questionText);
    });
    
    // If we have enough diverse questions, use them; otherwise use the original
    const generatedQuestions = uniqueQuestions.length >= Math.ceil(numQuestions * 0.7) 
      ? uniqueQuestions.slice(0, numQuestions)
      : allGeneratedQuestions.slice(0, numQuestions);

    // If not enough questions after all attempts, but at least 50%, return partial with message
    if (generatedQuestions.length < numQuestions) {
      if (generatedQuestions.length >= Math.ceil(numQuestions / 2)) {
        // Get user ID
        const user = await prisma.user.findUnique({
          where: { email: session.user.email }
        });
        if (!user) {
          return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        // Parse timeLimit to number or null
        const parsedTimeLimit = timeLimit ? Number(timeLimit) : null;
        // Create quiz in database
        const quiz = await (prisma as any).quiz.create({
          data: {
            title: `${courseCode} - ${topic || 'General'} Quiz`,
            courseCode,
            courseTitle,
            topic,
            level,
            difficulty,
            numQuestions: generatedQuestions.length,
            timeLimit: parsedTimeLimit,
            userId: user.id,
            questions: {
              create: generatedQuestions.map((q, index) => ({
                questionText: q.questionText,
                questionType: q.questionType,
                options: q.options ? q.options : null,
                correctAnswer:
                  q.questionType === 'MCQ'
                    ? JSON.stringify(q.correctAnswers || [])
                    : q.correctAnswer || '',
                explanation: q.explanation,
                points: q.points,
                order: index + 1
              }))
            }
          },
          include: {
            questions: {
              orderBy: { order: 'asc' }
            }
          }
        });
        return NextResponse.json({
          success: true,
          message: "Quality over quantity. We've generated the first set of questions for you. Finish these and refresh for a fresh challenge!",
          quiz: {
            id: quiz.id,
            title: quiz.title,
            courseCode: quiz.courseCode,
            courseTitle: quiz.courseTitle,
            topic: quiz.topic,
            level: quiz.level,
            difficulty: quiz.difficulty,
            numQuestions: quiz.numQuestions,
            timeLimit: quiz.timeLimit,
            questions: quiz.questions.map((q: any) => ({
              id: q.id,
              questionText: q.questionText,
              questionType: q.questionType,
              options: q.options,
              order: q.order
            }))
          }
        });
      } else {
        return NextResponse.json({ error: `Could not generate enough unique questions after ${MAX_ATTEMPTS} attempts. Try reducing the number of questions or broadening your topic.` }, { status: 500 });
      }
    }

    // Get user ID
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Parse timeLimit to number or null
    const parsedTimeLimit = timeLimit ? Number(timeLimit) : null;

    // Create quiz in database
    const quiz = await (prisma as any).quiz.create({
      data: {
        title: `${courseCode} - ${topic || 'General'} Quiz`,
        courseCode,
        courseTitle,
        topic,
        level,
        difficulty,
        numQuestions: generatedQuestions.length,
        timeLimit: parsedTimeLimit,
        userId: user.id,
        questions: {
          create: generatedQuestions.map((q, index) => ({
            questionText: q.questionText,
            questionType: q.questionType,
            options: q.options ? q.options : null,
            correctAnswer:
              q.questionType === 'MCQ'
                ? JSON.stringify(q.correctAnswers || [])
                : q.correctAnswer || '',
            explanation: q.explanation,
            points: q.points,
            order: index + 1
          }))
        }
      },
      include: {
        questions: {
          orderBy: { order: 'asc' }
        }
      }
    });

    return NextResponse.json({
      success: true,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        courseCode: quiz.courseCode,
        courseTitle: quiz.courseTitle,
        topic: quiz.topic,
        level: quiz.level,
        difficulty: quiz.difficulty,
        numQuestions: quiz.numQuestions,
        timeLimit: quiz.timeLimit,
        questions: quiz.questions.map((q: any) => ({
          id: q.id,
          questionText: q.questionText,
          questionType: q.questionType,
          options: q.options,
          order: q.order
        }))
      }
    });

  } catch (error) {
    console.error("Quiz generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate quiz" },
      { status: 500 }
    );
  }
} 