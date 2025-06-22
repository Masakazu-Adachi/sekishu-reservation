// app/admin/page.tsx
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
          onClick={() => router.push("/admin/events")}
        >
          <h2 className="text-xl font-semibold mb-2">📅 イベント一覧</h2>
          <p>イベントの管理と閲覧</p>
        </div>
        <div
          className="border rounded p-4 shadow-md hover:bg-gray-50 cursor-pointer bg-white"
          onClick={() => router.push("/admin/users")}
        >
          <h2 className="text-xl font-semibold mb-2">👤 ユーザー一覧</h2>
          <p>ユーザーの管理と閲覧</p>
        </div>
      </div>
    </main>
  );
}
