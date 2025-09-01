import { cookies } from "next/headers";
import type { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const token = process.env.ADMIN_UPLOAD_TOKEN;
  if (token) {
    cookies().set({
      name: "admin_upload_token",
      value: token,
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    });
  }
  return <>{children}</>;
}
