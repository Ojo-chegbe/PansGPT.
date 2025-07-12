import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';
import crypto from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // For security, do not reveal if user exists
      return NextResponse.json({ success: true });
    }
    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    // const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
    // TODO: Store token in DB (create a PasswordResetToken model if needed)
    // await prisma.passwordResetToken.create({
    //   data: {
    //     userId: user.id,
    //     token,
    //     expires,
    //   },
    // });
    // Send email
    const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
    await resend.emails.send({
      from: 'PANSite <onboarding@resend.dev>',
      to: email,
      subject: 'Reset your password',
      html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. This link will expire in 1 hour.</p>`,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 