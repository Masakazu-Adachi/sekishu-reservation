'use client';
import { useEffect } from 'react';

type MaybeDomLike =
  | { nodeType?: number; current?: unknown; base?: unknown }
  | null
  | undefined;

type ReactDomModule = {
  [k: string]: unknown;
  findDOMNode?: (inst: unknown) => Node | null;
};

export default function FindDomNodeShim() {
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const mod = (await import('react-dom')) as unknown as ReactDomModule;
        if (!mounted) return;

        if (typeof mod.findDOMNode !== 'function') {
          mod.findDOMNode = (inst: unknown): Node | null => {
            const i = inst as MaybeDomLike;
            if (!i) return null;

            // 直接DOMノード
            if ((i as { nodeType?: number }).nodeType === 1) {
              return i as unknown as Node;
            }

            // Reactのref.current
            const cur = (i as { current?: unknown }).current as
              | { nodeType?: number }
              | undefined;
            if (cur && cur.nodeType === 1) return cur as unknown as Node;

            // Preact互換: instance.base
            const base = (i as { base?: unknown }).base as
              | { nodeType?: number }
              | undefined;
            if (base && base.nodeType === 1) return base as unknown as Node;

            return null;
          };

          (globalThis as unknown as { __FIND_DOM_NODE_SHIM__?: boolean })
            .__FIND_DOM_NODE_SHIM__ = true;
        }
      } catch {
        // no-op
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return null;
}
