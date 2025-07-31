import Link from "next/link";

export default function LinkBackToHome() {
  return (
    <Link
      href="/"
      className="text-sm text-blue-600 underline hover:text-blue-800 mb-4 block"
    >
      ← トップページへ戻る
    </Link>
  );
}
