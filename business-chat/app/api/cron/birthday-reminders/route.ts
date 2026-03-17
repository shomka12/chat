import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  // Проверка секретного ключа для защиты от несанкционированного доступа
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + 2); // день через 2 дня

    // Получаем всех пользователей с указанной датой рождения
    const users = await prisma.user.findMany({
      where: {
        birthDate: { not: null },
      },
      select: {
        id: true,
        fullName: true,
        birthDate: true,
        department: true,
      },
    });

    const birthdayUsers = users.filter((user: any) => {
      if (!user.birthDate) return false;
      const birthDate = new Date(user.birthDate);
      // Сравниваем месяц и день, игнорируя год
      return (
        birthDate.getMonth() === targetDate.getMonth() &&
        birthDate.getDate() === targetDate.getDate()
      );
    });

    if (birthdayUsers.length === 0) {
      return NextResponse.json({
        message: "No birthdays in 2 days",
        count: 0,
      });
    }

    // Находим или создаём чат "Уведомления о днях рождения"
    let notificationChat = await prisma.chat.findFirst({
      where: {
        name: "Birthday Notifications",
        type: "CHANNEL",
      },
    });

    if (!notificationChat) {
      notificationChat = await prisma.chat.create({
        data: {
          name: "Birthday Notifications",
          type: "CHANNEL",
          description: "Автоматические уведомления о днях рождения сотрудников",
        },
      });
    }

    // Отправляем сообщение для каждого именинника
    const messages = [];
    for (const user of birthdayUsers) {
      const message = await prisma.message.create({
        data: {
          content: `🎉 Через 2 дня день рождения у ${user.fullName} (${user.department})! Не забудьте поздравить!`,
          chatId: notificationChat.id,
          senderId: user.id, // отправитель — сам пользователь (или системный)
          isBroadcast: true,
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
      });
      messages.push(message);
    }

    return NextResponse.json({
      message: "Birthday reminders sent",
      count: birthdayUsers.length,
      users: birthdayUsers.map((u: any) => ({
        name: u.fullName,
        department: u.department,
        birthDate: u.birthDate,
      })),
      messages: messages.map((m: any) => m.id),
    });
  } catch (error) {
    console.error("Error sending birthday reminders:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}