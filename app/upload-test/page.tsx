'use client';

import { useState, FormEvent, useEffect } from 'react';
import Image from 'next/image';
import { isUnsafeImageSrc } from '@/utils/url';

export default function UploadTestPage() {
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [uploading, setUploading] = useState<boolean>(false);

  useEffect(() => {
    fetch('/api/admin/session', { method: 'POST' }).catch(() => {});
  }, []);

  const handleUpload = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setImageUrl(data.url);
      } else {
        setError(data.error || 'アップロードに失敗しました');
      }
    } catch (err) {
      console.error(err);
      setError('アップロードに失敗しました');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <form onSubmit={handleUpload} className="space-y-4">
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="block"
        />
        <button
          type="submit"
          disabled={!file || uploading}
          className={`px-4 py-2 text-white rounded ${
            !file || uploading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {uploading ? 'アップロード中...' : 'アップロード'}
        </button>
      </form>
      {error && <p className="text-red-500">{error}</p>}
      {imageUrl && !isUnsafeImageSrc(imageUrl) && (
        <div>
          <p>アップロードされた画像:</p>
          <Image
            src={imageUrl}
            alt="uploaded"
            width={320}
            height={320}
            className="mt-2 max-w-xs h-auto"
          />
        </div>
      )}
    </div>
  );
}
