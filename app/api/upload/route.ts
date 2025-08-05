import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const runtime = 'nodejs';


export const dynamic = 'force-dynamic';
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "ファイルが選択されていません" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const uniqueName = `${Date.now()}-${file.name}`;
    const filePath = path.join(uploadDir, uniqueName);
    await writeFile(filePath, buffer);

    const url = `/uploads/${uniqueName}`;
    return NextResponse.json({ url });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "アップロードに失敗しました" }, { status: 500 });
  }
}
