import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { documentId } = await request.json();
    if (!documentId) {
      return NextResponse.json({ error: "Document ID is required" }, { status: 400 });
    }

    // Log the document access
    const access = await prisma.documentAccess.create({
      data: {
        userId: session.user.id,
        documentId: documentId,
      },
    });

    return NextResponse.json({ success: true, access });
  } catch (error: any) {
    console.error("Failed to log document access:", error);
    return NextResponse.json(
      { error: "Failed to log document access" },
      { status: 500 }
    );
  }
} 