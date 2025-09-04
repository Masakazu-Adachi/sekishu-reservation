"use client";

import AdminNotificationEmails from "@/components/AdminNotificationEmails";
import LinkBackToAdmin2Top from "@/components/LinkBackToAdmin2Top";

export default function NotificationEmailsPage() {
  return (
    <main className="p-6 max-w-xl mx-auto">
      <LinkBackToAdmin2Top />
      <AdminNotificationEmails />
    </main>
  );
}

