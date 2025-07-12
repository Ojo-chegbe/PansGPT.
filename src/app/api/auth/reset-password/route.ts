import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();
    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password are required' }, { status: 400 });
    }
    // Find the reset token
    const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });
    if (!resetToken || resetToken.expires < new Date()) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
    }
    // Update the user's password
    const hashed = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: hashed },
    });
    // Delete the token
    await prisma.passwordResetToken.delete({ where: { token } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 