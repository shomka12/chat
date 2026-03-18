import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function mapToAttachmentType(type: string): string {
  const upper = type.toUpperCase();
  if (["IMAGE", "DOCUMENT", "VIDEO", "AUDIO", "OTHER"].includes(upper)) {
    return upper;
  }
  if (type.startsWith("image/")) return "IMAGE";
  if (type.startsWith("video/")) return "VIDEO";
  if (type.startsWith("audio/")) return "AUDIO";
  if (type.includes("pdf") || type.startsWith("text/") || type.includes("document")) return "DOCUMENT";
  return "OTHER";
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get("chatId");
    const cursor = searchParams.get("cursor");
    const limit = parseInt(searchParams.get("limit") || "50");

    if (!chatId) {
      return NextResponse.json(
        { error: "chatId is required" },
        { status: 400 }
      );
    }

    const messages = await prisma.message.findMany({
      where: {
        chatId,
        isDeleted: false,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        attachments: true,
        reactions: true,
        _count: {
          select: { replies: true },
        },
        replies: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
            attachments: true,
            reactions: true,
          },
          orderBy: { createdAt: 'asc' },
          take: 20,
        },
      },
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: "desc" },
    });

    const nextCursor = messages.length === limit ? messages[messages.length - 1].id : null;

    return NextResponse.json({
      messages: messages.reverse(),
      nextCursor,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const senderId = session.user.id;
    if (!senderId) {
      return NextResponse.json({ error: "User ID not found" }, { status: 400 });
    }

    const body = await request.json();
    const { chatId, content, encryptedContent, parentId, attachments } = body;

    if (!chatId || (!content && !encryptedContent)) {
      return NextResponse.json(
        { error: "chatId and content are required" },
        { status: 400 }
      );
    }

    const message = await prisma.message.create({
      data: {
        chatId,
        senderId,
        content: content || "",
        encryptedContent: encryptedContent || null,
        isEncrypted: !!encryptedContent,
        parentId: parentId || null,
        attachments: {
          create: attachments?.map((att: any) => ({
            type: mapToAttachmentType(att.type),
            url: att.url,
            name: att.name,
            size: att.size,
            isEncrypted: att.isEncrypted || false,
            encryptionKey: att.encryptionKey || null,
          })) || [],
        },
      },
      include: {
        sender: true,
        attachments: true,
      },
    });

    // Обновляем время обновления чата
    await prisma.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}