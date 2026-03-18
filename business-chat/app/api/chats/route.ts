import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const chats = await prisma.chat.findMany({
      where: {
        members: {
          some: {
            userId: session.user.id,
          },
        },
        isArchived: false,
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: { messages: true, members: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(chats);
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

    const body = await request.json();
    const { name, description, type, parentId, isEncrypted } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    if (!userId) {
      return NextResponse.json({ error: "User ID not found" }, { status: 400 });
    }

    const chat = await prisma.chat.create({
      data: {
        name,
        description,
        type: type || "GROUP",
        parentId: parentId || null,
        adminId: userId,
        isEncrypted: isEncrypted || false,
        members: {
          create: {
            userId,
            role: "ADMIN",
          },
        },
      },
      include: {
        members: true,
        _count: {
          select: { messages: true, members: true },
        },
      },
    });

    return NextResponse.json(chat, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}