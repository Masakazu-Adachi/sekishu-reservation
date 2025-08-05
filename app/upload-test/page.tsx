'use client';

import { useState } from 'react';

export default function UploadTestPage() {
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');

  const handleUpload = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    if (data.url) {
      setImageUrl(data.url);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="block"
      />
      <button
        onClick={handleUpload}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        アップロード
      </button>
      {imageUrl && (
        <div>
          <p>アップロードされた画像:</p>
          <img src={imageUrl} alt="uploaded" className="mt-2 max-w-xs" />
        </div>
      )}
    </div>
  );
}
