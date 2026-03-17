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

    const body = await request.json();
    const { messageId, targetChatId, targetUserId } = body;

    if (!messageId || (!targetChatId && !targetUserId)) {
      return NextResponse.json(
        { error: "messageId and target (chat or user) are required" },
        { status: 400 },
      );
    }

    // Получаем оригинальное сообщение
    const originalMessage = await prisma.message.findUnique({
      where: { id: messageId },
      include: { sender: true, attachments: true },
    });

    if (!originalMessage) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Определяем целевой чат
    let chatId = targetChatId;
    if (targetUserId) {
      // Найти или создать прямой чат между текущим пользователем и targetUserId
      const directChat = await prisma.chat.findFirst({
        where: {
          type: "DIRECT",
          members: {
            every: {
              userId: { in: [session.user.id, targetUserId] },
            },
          },
        },
      });
      if (directChat) {
        chatId = directChat.id;
      } else {
        // Создать новый прямой чат
        const newChat = await prisma.chat.create({
          data: {
            name: "Direct Chat",
            type: "DIRECT",
            members: {
              create: [
                { userId: session.user.id, role: "MEMBER" },
                { userId: targetUserId, role: "MEMBER" },
              ],
            },
          },
        });
        chatId = newChat.id;
      }
    }

    // Создаём пересланное сообщение
    const forwardedMessage = await prisma.message.create({
      data: {
        chatId,
        senderId: session.user.id,
        content: `🔀 Переслано от ${originalMessage.sender.name}: ${originalMessage.content}`,
        forwardedFromId: messageId,
        attachments: {
          create: originalMessage.attachments.map((att: any) => ({
            type: att.type,
            url: att.url,
            name: att.name,
            size: att.size,
            isEncrypted: att.isEncrypted,
            encryptionKey: att.encryptionKey,
          })),
        },
      },
      include: {
        sender: true,
        attachments: true,
        forwardedFrom: {
          include: { sender: true },
        },
      },
    });

    // Обновляем время чата
    await prisma.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json(forwardedMessage, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
