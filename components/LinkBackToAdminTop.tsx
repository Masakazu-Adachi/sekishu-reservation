// components/LinkBackToAdminTop.tsx


import { useRouter } from "next/navigation";

export default function LinkBackToAdminTop() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push("/admin")}
      className="text-sm text-blue-600 underline hover:text-blue-800 mb-4 block"
    >
      ← 管理ダッシュボードへ戻る
    </button>
  );
}
