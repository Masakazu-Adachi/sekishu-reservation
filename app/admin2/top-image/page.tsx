"use client";

import AdminTopImageSettings from "@/components/AdminTopImageSettings";
import LinkBackToAdmin2Top from "@/components/LinkBackToAdmin2Top";

export default function TopImagePage() {
  return (
    <main className="p-6 max-w-4xl mx-auto">
      <LinkBackToAdmin2Top />
      <AdminTopImageSettings />
    </main>
  );
}
