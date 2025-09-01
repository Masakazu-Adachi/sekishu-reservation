"use client";

import { useEffect, useRef } from "react";

export default function EnsureAdminCookie() {
  const once = useRef(false);

  useEffect(() => {
    if (once.current) return;
    once.current = true;

    const has = document.cookie.includes("admin_upload_token=");
    if (has) return;

    const token = process.env.NEXT_PUBLIC_ADMIN_UPLOAD_TOKEN;
    fetch("/api/admin/session", {
      method: "POST",
      headers: token ? { "x-admin-upload-token": token } : undefined,
    }).catch(() => {});
  }, []);

  return null;
}
