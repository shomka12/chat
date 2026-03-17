import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Только администраторы могут делать рассылку
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { content, encryptedContent, userIds, chatIds } = body;

    if (!content && !encryptedContent) {
      return NextResponse.json(
        { error: "content or encryptedContent is required" },
        { status: 400 }
      );
    }

    // Если указаны userIds, отправляем каждому пользователю в его личный чат
    // Для простоты создаём или находим личный чат с каждым пользователем
    const targetChats: string[] = [];

    if (userIds && Array.isArray(userIds)) {
      for (const userId of userIds) {
        // Находим или создаём личный чат между администратором и пользователем
        const existingChat = await prisma.chat.findFirst({
          where: {
            type: "private",
            participants: {
              every: {
                userId: { in: [session.user.id, userId] },
              },
            },
          },
        });
        if (existingChat) {
          targetChats.push(existingChat.id);
        } else {
          // Создаём новый личный чат
          const newChat = await prisma.chat.create({
            data: {
              type: "private",
              name: null,
              description: null,
              createdById: session.user.id,
              participants: {
                create: [
                  { userId: session.user.id, role: "admin" },
                  { userId, role: "member" },
                ],
              },
            },
          });
          targetChats.push(newChat.id);
        }
      }
    }

    if (chatIds && Array.isArray(chatIds)) {
      targetChats.push(...chatIds);
    }

    if (targetChats.length === 0) {
      return NextResponse.json(
        { error: "No target chats or users specified" },
        { status: 400 }
      );
    }

    const messages = [];
    for (const chatId of targetChats) {
      const message = await prisma.message.create({
        data: {
          chatId,
          senderId: session.user.id,
          content: content || "",
          encryptedContent: encryptedContent || null,
          isEncrypted: !!encryptedContent,
          isBroadcast: true,
        },
        include: {
          sender: true,
          attachments: true,
        },
      });
      messages.push(message);

      // Обновляем время обновления чата
      await prisma.chat.update({
        where: { id: chatId },
        data: { updatedAt: new Date() },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Broadcast sent to ${targetChats.length} chats`,
      messages,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}