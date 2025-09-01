import { NextResponse } from 'next/server';
import { getBucketSafely } from '@/lib/firebaseAdmin';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function isAuthorized() {
  // 今回は「まず通す」が最優先 → 既定で無効化ON
  const disabled = (process.env.DISABLE_UPLOAD_AUTH ?? '1') === '1';
  if (disabled) return true;

  const envToken = process.env.ADMIN_UPLOAD_TOKEN?.trim();
  if (!envToken) return false;

  const cookieToken = (await cookies()).get('admin_upload_token')?.value?.trim();
  return cookieToken === envToken;
}

export async function POST(req: Request) {
  try {
    // 1) 認可
    if (!(await isAuthorized())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2) Firebase バケット取得（未設定なら理由付き 500）
    const bucket = getBucketSafely();
    if (!bucket) {
      return NextResponse.json(
        {
          error: 'Server not configured',
          reason:
            'FIREBASE_SERVICE_ACCOUNT_KEY or NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is missing',
        },
        { status: 500 },
      );
    }

    // 3) 入力
    const form = await req.formData();
    const file = form.get('file');
    const basePath = String(form.get('basePath') || '').trim();

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file' }, { status: 400 });
    }
    if (!basePath) {
      return NextResponse.json({ error: 'No basePath' }, { status: 400 });
    }

    const f = file as File;
    const arrayBuf = await f.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    const rawExt = (f.name.split('.').pop() || 'bin').toLowerCase().slice(0, 10);
    const ext = rawExt.replace(/[^a-z0-9]/g, '') || 'bin';
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const path = `images/${basePath}/${unique}.${ext}`;

    // 4) 保存
    const object = bucket.file(path);
    await object.save(buffer, {
      resumable: false,
      metadata: {
        contentType: f.type || 'application/octet-stream',
        cacheControl: 'public, max-age=31536000, immutable',
      },
    });

    // 5) 公開URL（Uniform bucket-level access でもOKな署名URL）
    const [url] = await object.getSignedUrl({
      action: 'read',
      expires: '2500-01-01',
    });

    return NextResponse.json({ url, path });
  } catch (err: unknown) {
    console.error('UPLOAD ERROR', err);
    const error = err as { message?: string; code?: unknown };
    return NextResponse.json(
      {
        error: 'アップロードに失敗しました',
        reason: error.message || String(err),
        code: error.code,
      },
      { status: 500 },
    );
  }
}

