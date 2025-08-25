export const dynamic = "force-dynamic";
export const revalidate = 0;

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
