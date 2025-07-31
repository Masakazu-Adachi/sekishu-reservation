// app/admin2/page.tsx
"use client";

import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const router = useRouter();

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">管理ダッシュボード</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div
          className="border rounded p-4 shadow-md hover:bg-gray-50 cursor-pointer bg-white"
          onClick={() => router.push("/admin2/top-image")}
        >
          <h2 className="text-xl font-semibold mb-2">🖼 トップ画像設定</h2>
          <p>サイトのトップページに表示する画像を設定します</p>
        </div>
        <div
          className="border rounded p-4 shadow-md hover:bg-gray-50 cursor-pointer bg-white"
          onClick={() => router.push("/admin2/greeting")}
        >
          <h2 className="text-xl font-semibold mb-2">💬 ごあいさつ設定</h2>
          <p>トップページのごあいさつ文と画像を設定します</p>
        </div>
      </div>
    </main>
  );
}
