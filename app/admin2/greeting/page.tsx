"use client";

import AdminGreetingSettings from "@/components/AdminGreetingSettings";
import LinkBackToAdmin2Top from "@/components/LinkBackToAdmin2Top";

export default function GreetingPage() {
  return (
    <main className="p-6 max-w-xl mx-auto">
      <LinkBackToAdmin2Top />
      <AdminGreetingSettings />
    </main>
  );
}
