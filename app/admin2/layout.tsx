import type { ReactNode } from "react";
import EnsureAdminCookie from "@/components/EnsureAdminCookie";

export default function Admin2Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <EnsureAdminCookie />
      {children}
    </>
  );
}
