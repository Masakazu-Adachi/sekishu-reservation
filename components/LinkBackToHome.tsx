import Link from "next/link";

export default function LinkBackToHome() {
  return (
    <Link
      href="/"
      className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 mb-4 font-medium"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="w-4 h-4 mr-1"
      >
        <path
          fillRule="evenodd"
          d="M15.75 19.5a.75.75 0 01-1.06 0l-7.5-7.5a.75.75 0 010-1.06l7.5-7.5a.75.75 0 011.06 1.06L9.06 12l6.69 6.69a.75.75 0 010 1.06z"
          clipRule="evenodd"
        />
      </svg>
      トップページへ戻る
    </Link>
  );
}
