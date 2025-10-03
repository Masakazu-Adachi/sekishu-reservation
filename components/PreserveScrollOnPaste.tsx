"use client";

import { useEffect } from "react";

export default function PreserveScrollOnPaste() {
  useEffect(() => {
    const restoreScroll = () => {
      if (typeof window === "undefined") return;
      const { scrollX, scrollY } = window;
      requestAnimationFrame(() => {
        window.scrollTo(scrollX, scrollY);
        requestAnimationFrame(() => {
          window.scrollTo(scrollX, scrollY);
        });
      });
    };

    const options = { capture: true } as const;
    document.addEventListener("paste", restoreScroll, options);
    return () => {
      document.removeEventListener("paste", restoreScroll, options);
    };
  }, []);

  return null;
}
