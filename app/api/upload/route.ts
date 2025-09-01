import { NextResponse } from 'next/server';
import { getBucketSafely } from '@/lib/firebaseAdmin';
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
    const bucket = getBucketSafely();
    if (!bucket) {
      return NextResponse.json(
        { error: 'Server not configured (Firebase key/bucket missing)' },
        { status: 500 },
      );
    }
    const form = await req.formData();
    const file = form.get('file') as File | null;
    const basePath = String(form.get('basePath') || '').trim();
    if (!file || !file.size) {
      return NextResponse.json({ error: 'No file' }, { status: 400 });
    }
    if (!basePath) {
      return NextResponse.json({ error: 'No basePath' }, { status: 400 });
    }
    const arrayBuf = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    const ext = ((file.name.split('.').pop() || 'bin').toLowerCase()).slice(0, 10);
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
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
