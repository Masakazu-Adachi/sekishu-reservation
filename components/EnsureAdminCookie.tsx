"use client";

import { useEffect, useRef } from "react";

export default function EnsureAdminCookie() {
  const once = useRef(false);

  useEffect(() => {
    if (once.current) return;
    once.current = true;

    const has = document.cookie.includes("admin_upload_token=");
    if (has) return;

    fetch("/api/admin/session", { method: "POST" }).catch(() => {});
  }, []);

  return null;
}
