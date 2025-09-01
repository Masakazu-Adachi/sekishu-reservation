import { NextResponse } from 'next/server';
import { bucket } from '@/lib/firebaseAdmin';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function isAuthorized() {
  // アップロード認可を無効化できるフラグ
  const disabled = (process.env.DISABLE_UPLOAD_AUTH ?? '1') === '1';
  if (disabled) return true;

  const envToken = process.env.ADMIN_UPLOAD_TOKEN?.trim();
  if (!envToken) {
    console.warn('ADMIN_UPLOAD_TOKEN is not set');
    return false; // フラグ無効時は従来どおり拒否
  }
  const cookieToken = (await cookies()).get('admin_upload_token')?.value?.trim();
  return cookieToken === envToken;
}

export async function POST(req: Request) {
  if (!(await isAuthorized())) {
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
      metadata: { contentType: (file as File).type || 'application/octet-stream' },
    });
    // Uniform bucket-level access でも動くように署名URLを返す
    const [url] = await f.getSignedUrl({
      action: 'read',
      expires: '2500-01-01',
    });
    return NextResponse.json({ url, path });
  } catch (err) {
    console.error('UPLOAD ERROR', err);
    return NextResponse.json({ error: 'アップロードに失敗しました' }, { status: 500 });
  }
}
