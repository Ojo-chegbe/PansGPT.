import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const courseCode = searchParams.get('courseCode');
    const level = searchParams.get('level');

    // Get user ID
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Build where clause for filtering
    const whereClause: any = {
      userId: user.id
    };

    if (courseCode) {
      whereClause.quiz = {
        courseCode: courseCode
      };
    }

    if (level) {
      whereClause.quiz = {
        ...whereClause.quiz,
        level: level
      };
    }

    // Get quiz results with pagination
    const results = await (prisma as any).quizResult.findMany({
      where: whereClause,
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            courseCode: true,
            courseTitle: true,
            topic: true,
            level: true,
            difficulty: true,
            numQuestions: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        completedAt: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    });

    // Get total count for pagination
    const totalCount = await (prisma as any).quizResult.count({
      where: whereClause
    });

    // Get performance analytics
    const analytics = await (prisma as any).quizResult.aggregate({
      where: { userId: user.id },
      _avg: {
        percentage: true
      },
      _count: {
        id: true
      },
      _sum: {
        score: true
      }
    });

    // Get all quiz results for the user, including quiz info
    const allResults = await (prisma as any).quizResult.findMany({
      where: { userId: user.id },
      include: {
        quiz: {
          select: {
            courseCode: true,
            courseTitle: true,
            level: true
          }
        }
      }
    });

    // Group by courseCode, courseTitle, level in JS
    const courseMap = new Map();
    for (const result of allResults) {
      const key = `${result.quiz.courseCode}||${result.quiz.courseTitle}||${result.quiz.level}`;
      if (!courseMap.has(key)) {
        courseMap.set(key, {
          courseCode: result.quiz.courseCode,
          courseTitle: result.quiz.courseTitle,
          level: result.quiz.level,
          totalScore: 0,
          count: 0
        });
      }
      const entry = courseMap.get(key);
      entry.totalScore += result.percentage || 0;
      entry.count += 1;
    }
    const coursePerformance = Array.from(courseMap.values()).map(entry => ({
      courseCode: entry.courseCode,
      courseTitle: entry.courseTitle,
      level: entry.level,
      averageScore: entry.count > 0 ? entry.totalScore / entry.count : 0,
      quizCount: entry.count
    }));

    // Get recent performance trend (last 10 quizzes)
    const recentTrend = await (prisma as any).quizResult.findMany({
      where: { userId: user.id },
      select: {
        percentage: true,
        completedAt: true,
        quiz: {
          select: {
            courseCode: true,
            title: true
          }
        }
      },
      orderBy: {
        completedAt: 'desc'
      },
      take: 10
    });

    // Calculate recent trend average (last 5 quizzes)
    const last5 = recentTrend.slice(0, 5);
    const recentTrendAverage = last5.length > 0 ? last5.reduce((sum: number, q: any) => sum + (q.percentage || 0), 0) / last5.length : 0;

    return NextResponse.json({
      success: true,
      data: {
        results: results.map((result: any) => ({
          id: result.id,
          score: result.score,
          maxScore: result.maxScore,
          percentage: result.percentage,
          timeTaken: result.timeTaken,
          completedAt: result.completedAt,
          quiz: result.quiz
        })),
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        },
        analytics: {
          averageScore: analytics._avg.percentage || 0,
          totalQuizzes: analytics._count.id || 0,
          totalPoints: analytics._sum.score || 0,
          coursePerformance,
          recentTrend: recentTrend.map((rt: any) => ({
            percentage: rt.percentage,
            completedAt: rt.completedAt,
            courseCode: rt.quiz.courseCode,
            title: rt.quiz.title
          })),
          recentTrendAverage
        }
      }
    });

  } catch (error) {
    console.error("Quiz history error:", error);
    return NextResponse.json(
      { error: "Failed to fetch quiz history" },
      { status: 500 }
    );
  }
} 