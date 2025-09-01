import { getApps, initializeApp, cert, type App } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import type { Bucket } from '@google-cloud/storage';

let _app: App | null = null;

export function getBucketSafely(): Bucket | null {
  const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!key || !bucketName) return null;

  if (!_app) {
    _app = getApps()[0] ?? initializeApp({
      credential: cert(JSON.parse(key)),
      storageBucket: bucketName,
    });
  }
  return getStorage(_app).bucket(bucketName);
}
