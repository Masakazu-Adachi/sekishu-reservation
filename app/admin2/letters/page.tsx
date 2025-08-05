"use client";

import AdminBlogEditor from "@/components/AdminBlogEditor";
import LinkBackToAdmin2Top from "@/components/LinkBackToAdmin2Top";

export default function LettersAdminPage() {
  return (
    <main className="p-6 max-w-xl mx-auto">
      <LinkBackToAdmin2Top />
      <AdminBlogEditor
        collectionName="letters"
        heading="通信ページ"
        storagePath="images/letters"
      />
    </main>
  );
}
