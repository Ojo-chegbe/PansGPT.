import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/conversations?userId=...
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const limit = parseInt(searchParams.get("limit") || "10"); // Limit conversations
    const messageLimit = parseInt(searchParams.get("messageLimit") || "50"); // Limit messages per conversation

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Verify the user is requesting their own conversations
    if (userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conversations = await prisma.conversation.findMany({
      where: { userId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: messageLimit // Limit messages per conversation
        }
      },
      orderBy: { updatedAt: "desc" },
      take: limit // Limit total conversations
    });

    return NextResponse.json({ conversations }, {
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60'
      }
    });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/conversations
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return new Response('Unauthorized', { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return new Response('User not found', { status: 404 });
    }

    const data = await req.json();
    
    // Don't save if there are no messages
    if (!data.messages || data.messages.length === 0) {
      return new Response('No messages to save', { status: 400 });
    }

    // If conversation exists, update it
    if (data.id) {
      // First verify the conversation belongs to the user
      const existingConversation = await prisma.conversation.findUnique({
        where: { id: data.id },
        select: { userId: true }
      });

      if (!existingConversation || existingConversation.userId !== user.id) {
        return new Response('Unauthorized', { status: 401 });
      }

      const updatedConversation = await prisma.conversation.update({
        where: { id: data.id },
        data: {
          title: data.title,
          messages: {
            deleteMany: {},
            create: data.messages.map((msg: any) => ({
              content: msg.content,
              role: msg.role,
              userId: user.id,
              createdAt: msg.createdAt ? new Date(msg.createdAt) : undefined
            })),
          },
        },
        include: {
          messages: true,
        },
      });
      return new Response(JSON.stringify(updatedConversation), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create new conversation
    const newConversation = await prisma.conversation.create({
      data: {
        title: data.title,
        userId: user.id,
        messages: {
          create: data.messages.map((msg: any) => ({
            content: msg.content,
            role: msg.role,
            userId: user.id,
            createdAt: msg.createdAt ? new Date(msg.createdAt) : undefined
          })),
        },
      },
      include: {
        messages: true,
      },
    });

    return new Response(JSON.stringify(newConversation), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error saving conversation:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

// DELETE /api/conversations?id=...
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Conversation ID is required" }, { status: 400 });
    }

    // Verify the conversation belongs to the user
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      select: { userId: true }
    });

    if (!conversation || conversation.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.conversation.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting conversation:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 