import type { ReactNode } from "react";
import EnsureAdminCookie from "@/components/EnsureAdminCookie";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <EnsureAdminCookie />
      {children}
    </>
  );
}
