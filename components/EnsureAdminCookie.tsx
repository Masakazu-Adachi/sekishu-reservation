"use client";

import { useEffect, useRef } from "react";

export default function EnsureAdminCookie() {
  const once = useRef(false);

  useEffect(() => {
    if (once.current) return;
    once.current = true;
    fetch("/api/admin/session", {
      method: "POST",
      credentials: "include",
    }).catch(() => {});
  }, []);

  return null;
}
