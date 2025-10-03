import type { ReactNode } from "react";
import EnsureAdminCookie from "@/components/EnsureAdminCookie";
import PreserveScrollOnPaste from "@/components/PreserveScrollOnPaste";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="bg-white text-black min-h-screen"
      style={{ colorScheme: "light" }}
    >
      <EnsureAdminCookie />
      <PreserveScrollOnPaste />
      {children}
    </div>
  );
}
