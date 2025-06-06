"use client";

import { useState } from "react";

export default function AdminHeroImagePage() {
  const [imageUrl, setImageUrl] = useState("/hero-matcha.jpg");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageUrl(e.target.value);
  };

  const handleSave = () => {
    alert(`画像パスを保存（仮機能）: ${imageUrl}`);
  };

  return (
    <main className="p-6 max-w-xl mx-auto text-center">
      <h1 className="text-2xl font-bold mb-4">ヒーロー画像パス設定</h1>

      <input
        type="text"
        value={imageUrl}
        onChange={handleInputChange}
        className="border p-2 w-full mb-4"
        placeholder="例: /hero-matcha.jpg"
      />

      <img
        src={imageUrl}
        alt="プレビュー"
        className="w-full h-64 object-cover rounded border mb-4"
      />

      <button
        onClick={handleSave}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
      >
        保存（仮動作）
      </button>
    </main>
  );
}
