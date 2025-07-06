import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: Fetch user's timetable based on their level
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's level from the database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { level: true }
    });

    if (!user?.level) {
      return NextResponse.json({ error: 'User level not set' }, { status: 400 });
    }

    // Fetch timetable for user's level
    const timetables = await prisma.timetable.findMany({
      where: { level: user.level },
      orderBy: [
        { day: 'asc' },
        { timeSlot: 'asc' }
      ]
    });

    return NextResponse.json({
      level: user.level,
      timetables
    });
  } catch (error) {
    console.error('Failed to fetch user timetable:', error);
    return NextResponse.json(
      { error: 'Failed to fetch timetable' },
      { status: 500 }
    );
  }
} 