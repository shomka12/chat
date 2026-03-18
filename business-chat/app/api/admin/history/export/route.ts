import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Получаем все сообщения с вложениями и отправителями
    const messages = await prisma.message.findMany({
      include: {
        sender: {
          select: { id: true, email: true, name: true },
        },
        attachments: true,
        reactions: true,
        chat: {
          select: { id: true, name: true },
        },
        forwardedFrom: {
          select: { id: true, content: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Формируем JSON
    const exportData = {
      exportDate: new Date().toISOString(),
      totalMessages: messages.length,
      messages,
    };

    // Возвращаем как файл
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="messages_export_${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}