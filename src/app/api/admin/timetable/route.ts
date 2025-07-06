import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: Fetch timetables by level
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level');

    if (!level) {
      return NextResponse.json({ error: 'Level parameter is required' }, { status: 400 });
    }

    const timetables = await prisma.timetable.findMany({
      where: { level },
      orderBy: [
        { day: 'asc' },
        { timeSlot: 'asc' }
      ]
    });

    return NextResponse.json(timetables);
  } catch (error) {
    console.error('Failed to fetch timetables:', error);
    return NextResponse.json(
      { error: 'Failed to fetch timetables' },
      { status: 500 }
    );
  }
}

// POST: Create new timetable entry
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { level, day, timeSlot, courseCode, courseTitle } = body;

    if (!level || !day || !timeSlot || !courseCode || !courseTitle) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // Check for existing entry with same level, day, and time slot
    const existingEntry = await prisma.timetable.findFirst({
      where: {
        level,
        day,
        timeSlot
      }
    });

    if (existingEntry) {
      return NextResponse.json({ error: 'A timetable entry already exists for this level, day, and time slot' }, { status: 409 });
    }

    const timetable = await prisma.timetable.create({
      data: {
        level,
        day,
        timeSlot,
        courseCode,
        courseTitle
      }
    });

    return NextResponse.json(timetable);
  } catch (error) {
    console.error('Error creating timetable entry:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT: Update existing timetable entry
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'ID parameter is required' }, { status: 400 });
    }

    const body = await request.json();
    const { level, day, timeSlot, courseCode, courseTitle } = body;

    if (!level || !day || !timeSlot || !courseCode || !courseTitle) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // Check if entry exists
    const existingEntry = await prisma.timetable.findUnique({
      where: { id }
    });

    if (!existingEntry) {
      return NextResponse.json({ error: 'Timetable entry not found' }, { status: 404 });
    }

    // Check for conflicts with other entries (same level, day, time slot but different ID)
    const conflictingEntry = await prisma.timetable.findFirst({
      where: {
        level,
        day,
        timeSlot,
        id: { not: id }
      }
    });

    if (conflictingEntry) {
      return NextResponse.json({ error: 'A timetable entry already exists for this level, day, and time slot' }, { status: 409 });
    }

    const updatedTimetable = await prisma.timetable.update({
      where: { id },
      data: {
        level,
        day,
        timeSlot,
        courseCode,
        courseTitle
      }
    });

    return NextResponse.json(updatedTimetable);
  } catch (error) {
    console.error('Error updating timetable entry:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 