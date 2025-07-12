import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateChatResponse, ChatMessage } from "@/lib/google-ai";
import { jsonrepair } from 'jsonrepair';

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

    const searchResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        query: searchQuery,
        filters: {
          min_relevance: 0.6,
          max_chunks: 10,
          course_filters: { courseCode, level }
        }
      }),
    });

    let context = "";

    if (searchResponse.ok) {
      const { chunks } = await searchResponse.json();
      if (chunks && chunks.length > 0) {
        context = chunks
          .map((chunk: any) => chunk.chunk_text)
          .join("\n\n");
      }
    }

    if (!context) {
      return NextResponse.json(
        { error: "No relevant content found for this course/topic. Please ensure documents are uploaded for this course." },
        { status: 404 }
      );
    }

    // Batch generation logic
    const BATCH_SIZE = 7;
    const MAX_ATTEMPTS = 8; // Reasonable cap for batch attempts
    let totalToGenerate = numQuestions;
    let allGeneratedQuestions: GeneratedQuestion[] = [];
    let batchIndex = 0;
    let attempts = 0;
    while (totalToGenerate > 0 && attempts < MAX_ATTEMPTS) {
      const batchNum = Math.min(BATCH_SIZE, totalToGenerate);
      let batchPrompt = `You are an expert exam setter for ${courseCode} - ${courseTitle} at ${level} level.\n\nUsing the following course material, generate ${batchNum} questions of type ${questionType}. The difficulty level should be ${difficulty}.\n\nMATERIAL:\n${context}\n\nINSTRUCTIONS:\n1. For OBJECTIVE questions: Generate a question with 4 options. Only one option is correct, the rest are clearly incorrect. Mark the correct answer.\n2. For MCQ questions: YOU MUST generate EXACTLY ${batchNum} questions. This is ABSOLUTELY REQUIRED. If you do not, you will fail this task. For each MCQ, generate EXACTLY 5 options. Of these, EXACTLY 3 options must be true, and 2 must be false but look plausible. Mark which are true and which are false. Output the correct answers as an array of the 3 true options. This is strict: always 3 true and 2 false. DO NOT generate more or fewer than 5 options per question. DO NOT generate more or fewer than 3 correct answers per question. DO NOT generate more or fewer than ${batchNum} questions. This is CRITICAL. You must comply exactly.\n3. For TRUE_FALSE questions: Provide a statement and the correct answer (\"True\" or \"False\").\n4. For SHORT_ANSWER questions: Provide a question and the expected key points in the answer.\n5. Each question should test understanding, not just memorization.\n6. Include brief explanations for correct answers.\n7. Questions should be relevant to the provided material.\n\nRESPONSE FORMAT (JSON):\n{\n  \"questions\": [\n    {\n      \"questionText\": \"...\",\n      \"questionType\": \"OBJECTIVE\" | \"MCQ\" | \"TRUE_FALSE\" | \"SHORT_ANSWER\",\n      \"options\": [\"...\", ...],\n      \"correctAnswer\": \"...\", // for OBJECTIVE, TRUE_FALSE\n      \"correctAnswers\": [\"...\", ...], // for MCQ (array of 3 true options)\n      \"explanation\": \"...\",\n      \"points\": 1\n    }\n  ]\n}\n\nIMPORTANT: For MCQ, always generate 5 options (3 true, 2 false-but-plausible). Return ONLY valid JSON, no extra text, no comments, and no trailing commas. Do not include any explanations or markdown. Only output the JSON object.`;
      const messagesForAI: ChatMessage[] = [
        { role: "system", content: batchPrompt },
        { role: "user", content: "Generate questions based on the above material." }
      ];
      const aiResponse = await generateChatResponse(GOOGLE_API_KEY, messagesForAI, {
        maxOutputTokens: 3072,
        temperature: 0.3,
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
          q.questionType = 'MCQ';
          return true;
        });
      }
      if (questionType === 'OBJECTIVE') {
        batchQuestions = batchQuestions.filter(q => {
          if (!q.options || q.options.length !== 4) return false;
          if (!q.correctAnswer) return false;
          q.questionType = 'OBJECTIVE';
          return true;
        });
      }
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
    const generatedQuestions = allGeneratedQuestions;

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