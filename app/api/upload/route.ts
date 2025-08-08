import { NextResponse } from "next/server";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

export const runtime = 'nodejs';


export const dynamic = 'force-dynamic';
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({
        error: "ファイルが選択されていません",
      }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uniqueName = `${Date.now()}-${file.name}`;
    const storageRef = ref(storage, `images/${uniqueName}`);

    const snapshot = await uploadBytes(storageRef, buffer, {
      contentType: file.type,
    });
    const url = await getDownloadURL(snapshot.ref);
    return NextResponse.json({ url });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "アップロードに失敗しました" }, { status: 500 });
  }
}
