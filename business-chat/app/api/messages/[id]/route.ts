import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json(
        { error: "content is required" },
        { status: 400 }
      );
    }

    // Получаем сообщение
    const message = await prisma.message.findUnique({
      where: { id },
      include: { sender: true },
    });

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Проверяем, что отправитель — текущий пользователь
    if (message.senderId !== session.user.id) {
      return NextResponse.json(
        { error: "You can only edit your own messages" },
        { status: 403 }
      );
    }

    // Проверяем, что с момента создания прошло не более 5 секунд
    const now = new Date();
    const createdAt = new Date(message.createdAt);
    const diffSeconds = (now.getTime() - createdAt.getTime()) / 1000;

    if (diffSeconds > 5) {
      return NextResponse.json(
        { error: "Message can only be edited within 5 seconds after sending" },
        { status: 403 }
      );
    }

    // Обновляем сообщение
    const updatedMessage = await prisma.message.update({
      where: { id },
      data: {
        content,
        isEdited: true,
        updatedAt: now,
      },
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
    });

    return NextResponse.json(updatedMessage);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}