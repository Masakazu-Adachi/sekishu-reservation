"use client";

// SSG を止めてサーバー側での静的プリレンダを回避
export const dynamic = "force-dynamic";

import AdminBlogEditor from "@/components/AdminBlogEditor";
import LinkBackToAdmin2Top from "@/components/LinkBackToAdmin2Top";
import { STORAGE_ROOT } from "@/lib/storageImages";

export default function LettersAdminPage() {
  return (
    <main className="p-6 max-w-xl mx-auto">
      <LinkBackToAdmin2Top />
      <AdminBlogEditor
        collectionName="letters"
        heading="通信ページ"
        storagePath={`${STORAGE_ROOT}/letters`}
      />
    </main>
  );
}
