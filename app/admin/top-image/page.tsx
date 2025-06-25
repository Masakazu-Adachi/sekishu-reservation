"use client";

import AdminTopImageSettings from "@/components/AdminTopImageSettings";
import LinkBackToAdminTop from "@/components/LinkBackToAdminTop";

export default function TopImagePage() {
  return (
    <main className="p-6 max-w-xl mx-auto">
      <LinkBackToAdminTop />
      <AdminTopImageSettings />
    </main>
  );
}
