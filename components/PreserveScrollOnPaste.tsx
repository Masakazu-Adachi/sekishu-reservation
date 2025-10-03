"use client";

import { useEffect } from "react";

export default function PreserveScrollOnPaste() {
  useEffect(() => {
    let rafId: number | null = null;
    const restoreScroll = () => {
      if (typeof window === "undefined") return;
      const { scrollX, scrollY } = window;

      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }

      let remainingTries = 5;
      const applyScroll = () => {
        window.scrollTo(scrollX, scrollY);
        remainingTries -= 1;
        if (remainingTries > 0) {
          rafId = requestAnimationFrame(applyScroll);
        } else {
          rafId = null;
        }
      };

      rafId = requestAnimationFrame(applyScroll);
    };

    const options = { capture: true } as const;
    const events: Array<keyof DocumentEventMap> = ["paste", "copy", "cut"];
    events.forEach(event => {
      document.addEventListener(event, restoreScroll, options);
    });
    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      events.forEach(event => {
        document.removeEventListener(event, restoreScroll, options);
      });
    };
  }, []);

  return null;
}
