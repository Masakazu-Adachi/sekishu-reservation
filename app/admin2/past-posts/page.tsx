export const dynamic = "force-dynamic";
export const revalidate = 0;

import AdminBlogEditor from "@/components/AdminBlogEditor";
import LinkBackToAdmin2Top from "@/components/LinkBackToAdmin2Top";
import { STORAGE_ROOT } from "@/lib/storageImages";

export default function PastPostsAdminPage() {
  return (
    <main className="p-6 max-w-xl mx-auto">
      <LinkBackToAdmin2Top />
      <AdminBlogEditor
        collectionName="pastPosts"
        heading="過去の茶会紹介"
        storagePath={`${STORAGE_ROOT}/past-posts`}
      />
    </main>
  );
}
