import { NextResponse } from 'next/server';
import { bucket } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const token = req.headers.get('x-admin-upload-token');
  if (token !== process.env.ADMIN_UPLOAD_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const basePath = formData.get('basePath')?.toString();
    if (!file || typeof file === 'string' || !basePath) {
      return NextResponse.json({ error: 'ファイルが選択されていません' }, { status: 400 });
    }
    const arrayBuffer = await (file as Blob).arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filename = (file as File).name || 'file';
    const uniqueName = `${Date.now()}-${filename}`;
    const path = `images/${basePath}/${uniqueName}`;
    const f = bucket.file(path);
    await f.save(buffer, {
      resumable: false,
      metadata: { contentType: (file as File).type },
    });
    await f.makePublic();
    const url = f.publicUrl();
    return NextResponse.json({ url, path });
  } catch (err) {
    console.error('UPLOAD ERROR', err);
    return NextResponse.json({ error: 'アップロードに失敗しました' }, { status: 500 });
  }
}
