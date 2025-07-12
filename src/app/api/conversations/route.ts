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
    console.log('Session in POST /api/conversations:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      hasEmail: !!session?.user?.email,
      userId: session?.user?.id,
      email: session?.user?.email
    });
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    console.log('User found in database:', {
      hasUser: !!user,
      userId: user?.id,
      email: user?.email
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const data = await req.json();
    console.log('Request data:', {
      hasId: !!data.id,
      hasTitle: !!data.title,
      messageCount: data.messages?.length || 0,
      userId: data.userId
    });
    
    // Allow creating conversations with no messages (for new conversations)
    // Only require messages when updating existing conversations
    if (data.id && (!data.messages || data.messages.length === 0)) {
      return NextResponse.json({ error: "Cannot update conversation with no messages" }, { status: 400 });
    }

    // If conversation exists, update it
    if (data.id) {
      // First verify the conversation belongs to the user
      const existingConversation = await prisma.conversation.findUnique({
        where: { id: data.id },
        select: { userId: true }
      });

      if (!existingConversation || existingConversation.userId !== user.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      console.log('Updating existing conversation with messages:', {
        conversationId: data.id,
        title: data.title,
        userId: user.id,
        messageCount: data.messages.length,
        messages: data.messages.map((msg: any) => ({
          content: msg.content?.substring(0, 50) + '...',
          role: msg.role,
          userId: user.id,
          createdAt: msg.createdAt
        }))
      });

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

      console.log('Conversation updated successfully:', {
        conversationId: updatedConversation.id,
        title: updatedConversation.title,
        messageCount: updatedConversation.messages.length,
        messages: updatedConversation.messages.map(msg => ({
          id: msg.id,
          content: msg.content?.substring(0, 50) + '...',
          role: msg.role,
          conversationId: msg.conversationId,
          userId: msg.userId
        }))
      });

      return NextResponse.json(updatedConversation);
    }

    // Create new conversation
    console.log('Creating new conversation with messages:', {
      title: data.title,
      userId: user.id,
      messageCount: data.messages?.length || 0,
      messages: data.messages?.map((msg: any) => ({
        content: msg.content?.substring(0, 50) + '...',
        role: msg.role,
        userId: user.id,
        createdAt: msg.createdAt
      })) || []
    });

    const newConversation = await prisma.conversation.create({
      data: {
        title: data.title,
        userId: user.id,
        messages: data.messages ? {
          create: data.messages.map((msg: any) => ({
            content: msg.content,
            role: msg.role,
            userId: user.id,
            createdAt: msg.createdAt ? new Date(msg.createdAt) : undefined
          })),
        } : undefined,
      },
      include: {
        messages: true,
      },
    });

    console.log('New conversation created successfully:', {
      conversationId: newConversation.id,
      title: newConversation.title,
      messageCount: newConversation.messages.length,
      messages: newConversation.messages.map(msg => ({
        id: msg.id,
        content: msg.content?.substring(0, 50) + '...',
        role: msg.role,
        conversationId: msg.conversationId,
        userId: msg.userId
      }))
    });

    return NextResponse.json(newConversation);
  } catch (error) {
    console.error('Error saving conversation:', error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
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