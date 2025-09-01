import { NextResponse } from 'next/server';
import { bucket } from '@/lib/firebaseAdmin';
import { cookies, headers as nextHeaders } from 'next/headers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isAuthorized() {
  const cookieToken = cookies().get('admin_upload_token')?.value?.trim();
  const headerToken = nextHeaders().get('x-admin-upload-token')?.trim();
  const envToken = process.env.ADMIN_UPLOAD_TOKEN?.trim();
  return !!envToken && (cookieToken === envToken || headerToken === envToken);
}

export async function POST(req: Request) {
  if (!isAuthorized()) {
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
