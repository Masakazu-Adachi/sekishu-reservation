import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not set');
}
if (!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) {
  throw new Error('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is not set');
}

const app = getApps()[0] ?? initializeApp({
  credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string)),
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
});

export const storage = getStorage(app);
export const bucket = storage.bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
