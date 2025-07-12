import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface UserDevice {
  id: string;
  userId: string;
  deviceId: string;
  firstUsed: Date;
  lastUsed: Date;
}

// GET: Fetch user's registered devices
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userDevices = await (prisma as any).userDevice.findMany({
      where: { userId: session.user.id },
      orderBy: { lastUsed: 'desc' },
    }) as UserDevice[];

    return NextResponse.json({
      devices: userDevices.map(device => ({
        id: device.id,
        deviceId: device.deviceId,
        firstUsed: device.firstUsed,
        lastUsed: device.lastUsed,
        isCurrentDevice: device.deviceId === session.user.clientDeviceId
      }))
    });
  } catch (error) {
    console.error('Error fetching user devices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch devices' },
      { status: 500 }
    );
  }
}

// DELETE: Remove a device
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deviceId } = await request.json();
    if (!deviceId) {
      return NextResponse.json({ error: 'Device ID is required' }, { status: 400 });
    }

    // Don't allow removing the current device
    if (deviceId === session.user.clientDeviceId) {
      return NextResponse.json(
        { error: 'Cannot remove current device' },
        { status: 400 }
      );
    }

    // Delete the device
    await (prisma as any).userDevice.deleteMany({
      where: {
        userId: session.user.id,
        deviceId: deviceId
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing device:', error);
    return NextResponse.json(
      { error: 'Failed to remove device' },
      { status: 500 }
    );
  }
} 