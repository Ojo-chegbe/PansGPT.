import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: resultId } = await params;

    // Get user ID
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get quiz result with quiz and questions
    const result = await (prisma as any).quizResult.findUnique({
      where: { 
        id: resultId,
        userId: user.id // Ensure user can only access their own results
      },
      include: {
        quiz: {
          include: {
            questions: {
              orderBy: { order: 'asc' }
            }
          }
        }
      }
    });

    if (!result) {
      return NextResponse.json({ error: "Result not found" }, { status: 404 });
    }

    // Format the response
    const formattedResult = {
      id: result.id,
      score: result.score,
      maxScore: result.maxScore,
      percentage: result.percentage,
      timeTaken: result.timeTaken,
      completedAt: result.completedAt,
      quiz: {
        id: result.quiz.id,
        title: result.quiz.title,
        courseCode: result.quiz.courseCode,
        courseTitle: result.quiz.courseTitle,
        topic: result.quiz.topic,
        level: result.quiz.level,
        difficulty: result.quiz.difficulty,
        numQuestions: result.quiz.numQuestions
      },
      questions: result.feedback.map((feedbackItem: any) => {
        const question = result.quiz.questions.find((q: any) => q.id === feedbackItem.questionId);
        return {
          questionId: feedbackItem.questionId,
          questionText: question?.questionText || '',
          userAnswer: feedbackItem.userAnswer,
          correctAnswer: feedbackItem.correctAnswer,
          isCorrect: feedbackItem.isCorrect,
          explanation: feedbackItem.explanation,
          points: feedbackItem.points,
          earnedPoints: feedbackItem.earnedPoints
        };
      })
    };

    return NextResponse.json({
      success: true,
      result: formattedResult
    });

  } catch (error) {
    console.error("Quiz result fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch quiz result" },
      { status: 500 }
    );
  }
} 