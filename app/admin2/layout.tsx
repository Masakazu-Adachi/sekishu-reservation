import type { ReactNode } from "react";
import EnsureAdminCookie from "@/components/EnsureAdminCookie";
import PreserveScrollOnPaste from "@/components/PreserveScrollOnPaste";

export default function Admin2Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <EnsureAdminCookie />
      <PreserveScrollOnPaste />
      {children}
    </>
  );
}
