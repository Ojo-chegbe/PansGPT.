import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface DocumentAccess {
  id: string;
  userId: string;
  documentId: string;
  accessedAt: Date;
  document: {
    id: string;
    courseCode?: string;
  };
}

// GET: Fetch user profile, stats, and achievements
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's document access stats
    const documentAccess = await prisma.documentAccess.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        document: true,
      },
    }) as DocumentAccess[];

    // Calculate stats
    const totalDocumentsViewed = documentAccess.length;
    const uniqueDocumentsViewed = new Set(documentAccess.map(access => access.documentId)).size;
    const lastViewedAt = documentAccess.length > 0 
      ? Math.max(...documentAccess.map(access => new Date(access.accessedAt).getTime()))
      : null;

    // Calculate achievements
    const achievements = [];
    if (totalDocumentsViewed >= 1) achievements.push("First Document");
    if (totalDocumentsViewed >= 5) achievements.push("Document Explorer");
    if (totalDocumentsViewed >= 10) achievements.push("Document Master");
    if (uniqueDocumentsViewed >= 5) achievements.push("Diverse Reader");
    if (uniqueDocumentsViewed >= 10) achievements.push("Knowledge Seeker");

    // Get user's courses from viewed documents
    const courses = new Set(
      documentAccess
        .map(access => access.document.courseCode)
        .filter(Boolean)
    );

    return NextResponse.json({
      stats: {
        totalDocumentsViewed,
        uniqueDocumentsViewed,
        lastViewedAt,
        courses: Array.from(courses),
      },
      achievements,
    });
  } catch (error: any) {
    console.error("Failed to fetch user stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch user stats" },
      { status: 500 }
    );
  }
}

// POST: Update user profile fields (name, bio, level, image, achievements)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const data = await request.json();
    const update: any = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.bio !== undefined) update.bio = data.bio;
    if (data.level !== undefined) update.level = data.level;
    if (data.image !== undefined) update.image = data.image;
    if (data.achievements !== undefined) update.achievements = data.achievements;
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: update,
    });
    return NextResponse.json({ success: true, user });
  } catch (err) {
    console.error('User profile POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 