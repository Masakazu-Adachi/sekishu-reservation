"use client";

import AdminHeroImageSettings from "@/components/AdminHeroImageSettings";
import LinkBackToAdminTop from "@/components/LinkBackToAdminTop";

export default function HeroImagePage() {
  return (
    <main className="p-6 max-w-xl mx-auto">
      <LinkBackToAdminTop />
      <AdminHeroImageSettings />
    </main>
  );
}
