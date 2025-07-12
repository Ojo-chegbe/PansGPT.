import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Delete conversations with title "New Conversation"
    const deletedConversations = await prisma.conversation.deleteMany({
      where: {
        userId: user.id,
        title: "New Conversation"
      }
    });

    return NextResponse.json({ 
      success: true, 
      deletedCount: deletedConversations.count 
    });
  } catch (error) {
    console.error("Error cleaning up conversations:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 