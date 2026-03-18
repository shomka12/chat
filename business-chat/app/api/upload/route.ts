import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

function mapMimeToAttachmentType(mime: string): string {
  if (mime.startsWith("image/")) return "IMAGE";
  if (mime.startsWith("video/")) return "VIDEO";
  if (mime.startsWith("audio/")) return "AUDIO";
  if (mime === "application/pdf" || mime.startsWith("text/") || mime.includes("document")) return "DOCUMENT";
  return "OTHER";
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Генерируем уникальное имя файла
    const fileExt = file.name.split(".").pop() || "bin";
    const fileName = `${uuidv4()}.${fileExt}`;
    const uploadDir = join(process.cwd(), "public", "uploads");
    const filePath = join(uploadDir, fileName);

    // Конвертируем File в Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Сохраняем на диск
    await writeFile(filePath, buffer);

    // Формируем публичный URL
    const publicUrl = `/uploads/${fileName}`;

    const attachmentType = mapMimeToAttachmentType(file.type);

    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      attachmentType,
      url: publicUrl,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}