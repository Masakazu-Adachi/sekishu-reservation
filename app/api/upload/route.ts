import { NextResponse } from "next/server";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

export const runtime = 'nodejs';


export const dynamic = 'force-dynamic';
export async function POST(req: Request) {
  try {
    console.log('upload start');
    const formData = await req.formData();
    console.log('formData parsed');
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      console.error('no file provided');
      return NextResponse.json({
        error: "ファイルが選択されていません",
      }, { status: 400 });
    }

    console.log('file info', { name: file.name, type: file.type, size: file.size });
    const bytes = await file.arrayBuffer();
    console.log('arrayBuffer length', bytes.byteLength);
    const buffer = Buffer.from(bytes);

    const uniqueName = `${Date.now()}-${file.name}`;
    const storageRef = ref(storage, `images/${uniqueName}`);
    console.log('uploading to bucket', process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, 'path', storageRef.fullPath);

    const snapshot = await uploadBytes(storageRef, buffer, {
      contentType: file.type,
    });
    console.log('upload complete');
    const url = await getDownloadURL(snapshot.ref);
    console.log('download url', url);
    return NextResponse.json({ url });
  } catch (err) {
    console.error('upload error', err);
    return NextResponse.json({ error: "アップロードに失敗しました" }, { status: 500 });
  }
}
