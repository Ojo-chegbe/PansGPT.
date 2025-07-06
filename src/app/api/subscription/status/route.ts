import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    console.log('Session in /api/subscription/status:', session);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        subscription: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // If user has no subscription, check if they're eligible for a trial
    if (!user.subscription) {
      const hasUsedTrial = await prisma.subscription.findFirst({
        where: {
          userId: user.id,
          isTrial: true
        }
      });

      if (!hasUsedTrial) {
        // Create a new trial subscription
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 7);

        const trial = await prisma.subscription.create({
          data: {
            userId: user.id,
            isTrial: true,
            planType: 'trial',
            startDate: new Date(),
            endDate: trialEndDate,
            isActive: true
          }
        });

        return NextResponse.json({
          isActive: true,
          isTrial: true,
          trialEndDate: trial.endDate,
          planType: 'trial',
          startDate: trial.startDate
        });
      }

      return NextResponse.json({
        isActive: false,
        isTrial: false,
        planType: 'none',
        startDate: null
      });
    }

    // Return existing subscription status
    return NextResponse.json({
      isActive: user.subscription.isActive,
      isTrial: user.subscription.isTrial,
      trialEndDate: user.subscription.isTrial ? user.subscription.endDate : null,
      planType: user.subscription.planType,
      startDate: user.subscription.startDate
    });
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 