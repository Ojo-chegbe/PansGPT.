import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    console.log('Session in /api/subscription/create-trial:', session);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user already has a subscription
    const existingSubscription = await prisma.subscription.findUnique({
      where: {
        userId: session.user.id,
      },
    });

    if (existingSubscription) {
      return NextResponse.json(
        { error: 'User already has a subscription' },
        { status: 400 }
      );
    }

    // Create trial subscription
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 7);

    const trial = await prisma.subscription.create({
      data: {
        userId: session.user.id,
        isTrial: true,
        planType: 'trial',
        startDate: new Date(),
        endDate: trialEndDate,
        isActive: true
      }
    });

    return NextResponse.json({
      success: true,
      subscription: {
        isActive: trial.isActive,
        isTrial: trial.isTrial,
        trialEndDate: trial.endDate,
        planType: trial.planType,
        startDate: trial.startDate
      }
    });
  } catch (error) {
    console.error('Error creating trial subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 