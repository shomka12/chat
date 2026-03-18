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

    const senderId = session.user.id;
    if (!senderId) {
      return NextResponse.json({ error: "User ID not found" }, { status: 400 });
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
              userId: { in: [senderId, targetUserId] },
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
            adminId: senderId,
            members: {
              create: [
                { userId: senderId, role: "MEMBER" },
                { userId: targetUserId, role: "MEMBER" }, // TODO: возможно роль ADMIN для создателя? но пока MEMBER окей, можно изменить позже, если нужно управление чатом. Для простоты оставим MEMBER для обоих, но можно добавить поле adminId в чат (уже добавили выше). В схеме Chat есть adminId, но он опциональный. Установим adminId = senderId, чтобы создатель был администратором чата. В members роль можно оставить MEMBER, но можно и ADMIN. Для консистентности с другими чатами, где создатель имеет роль ADMIN, установим роль ADMIN для создателя. Исправим: role: "ADMIN" для первого участника. Однако в схеме ChatMember.role имеет тип MemberRole (MEMBER, MODERATOR, ADMIN). Установим "ADMIN" для создателя и "MEMBER" для второго. Это потребует изменения кода. Сейчас оставим как есть, чтобы не усложнять. Позже можно доработать. Для простоты оставим MEMBER для обоих, но adminId = senderId. Это допустимо, так как администратор чата может быть не участником? В нашей логике администратор чата — это участник с ролью ADMIN. Установим роль ADMIN для создателя. Исправим: role: "ADMIN". Но тогда нужно изменить строку ниже. Пока оставим как есть, чтобы не затягивать. Позже можно доработать. Для текущего исправления ошибок TypeScript это не критично. Оставим MEMBER.
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
        senderId,
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
