import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user already has an active subscription
    const existingSubscription = await prisma.subscription.findUnique({
      where: {
        userId: session.user.id,
      },
    });

    if (existingSubscription?.isActive && !existingSubscription.isTrial) {
      return NextResponse.json(
        { error: 'You already have an active subscription' },
        { status: 400 }
      );
    }

    // Initialize payment with Paystack
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
      body: JSON.stringify({
        amount: 2000 * 100, // Convert to kobo (₦2,000)
        email: session.user.email,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/plan`,
        metadata: {
          userId: session.user.id,
        },
      }),
    });

    const data = await response.json();

    if (!data.status) {
      return NextResponse.json(
        { error: 'Failed to initialize payment' },
        { status: 400 }
      );
    }

    // Create or update subscription record
    await prisma.subscription.upsert({
      where: {
        userId: session.user.id,
      },
      update: {
        paymentReference: data.data.reference,
      },
      create: {
        userId: session.user.id,
        paymentReference: data.data.reference,
      },
    });

    return NextResponse.json({
      paymentUrl: data.data.authorization_url,
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 