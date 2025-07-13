import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { imageData, resultId } = await req.json();

    if (!imageData || !resultId) {
      return NextResponse.json({ error: "Missing required data" }, { status: 400 });
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'shares');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `quiz-result-${resultId}-${timestamp}.png`;
    const filePath = join(uploadsDir, filename);

    // Remove data URL prefix and convert to buffer
    const base64Data = imageData.replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Save the image
    await writeFile(filePath, buffer);

    // Return the public URL
    const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/uploads/shares/${filename}`;

    return NextResponse.json({
      success: true,
      message: "Image uploaded successfully",
      imageUrl: publicUrl
    });

  } catch (error) {
    console.error("Share API error:", error);
    return NextResponse.json(
      { error: "Failed to process share request" },
      { status: 500 }
    );
  }
} 