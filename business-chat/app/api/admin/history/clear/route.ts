import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Удаляем все сообщения, вложения, реакции
    // Используем транзакцию для безопасности
    await prisma.$transaction([
      prisma.reaction.deleteMany(),
      prisma.attachment.deleteMany(),
      prisma.message.deleteMany(),
    ]);

    return NextResponse.json(
      { success: true, message: "Вся история сообщений очищена" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Clear history error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}