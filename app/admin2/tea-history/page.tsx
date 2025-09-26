export const dynamic = "force-dynamic";
export const revalidate = 0;

import AdminBlogEditor from "@/components/AdminBlogEditor";
import LinkBackToAdmin2Top from "@/components/LinkBackToAdmin2Top";
import { STORAGE_ROOT } from "@/lib/storageImages";

export default function TeaHistoryAdminPage() {
  return (
    <main className="p-6 max-w-3xl mx-auto">
      <LinkBackToAdmin2Top />
      <AdminBlogEditor
        collectionName="teaArchives"
        heading="これまでの茶会"
        storagePath={`${STORAGE_ROOT}/tea-history`}
        enableEventDate
        enableGallery
        enableManualOrder
      />
    </main>
  );
}
