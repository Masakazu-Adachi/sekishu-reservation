'use client';
import * as ReactDomNS from 'react-dom';

type DomLike = { nodeType?: number } | null | undefined;
type WithFind = { findDOMNode?: (inst: unknown) => Element | Text | null };
type ReactDomMutable = typeof ReactDomNS & { default?: WithFind } & WithFind;

const mod = ReactDomNS as ReactDomMutable;
const target: WithFind = (mod.default ?? mod) as WithFind;

function shim(inst: unknown): Element | Text | null {
  const i = inst as (DomLike & { current?: DomLike; base?: DomLike }) | undefined;
  if (!i) return null;
  if ((i as DomLike)?.nodeType === 1) return i as unknown as Element;       // 直接DOM
  const cur = (i as { current?: DomLike }).current;
  if (cur && cur.nodeType === 1) return cur as unknown as Element;          // ref.current
  const base = (i as { base?: DomLike }).base;
  if (base && base.nodeType === 1) return base as unknown as Element;       // Preact互換
  return null;
}

if (typeof window !== 'undefined') {
  if (typeof target.findDOMNode !== 'function') target.findDOMNode = shim;  // target（default or ns）
  if (typeof mod.findDOMNode !== 'function') mod.findDOMNode = shim;        // namespace側
  if (mod.default && typeof mod.default.findDOMNode !== 'function') {
    mod.default.findDOMNode = shim;                                         // default側
  }
  (globalThis as { __FIND_DOM_NODE_SHIM__?: boolean }).__FIND_DOM_NODE_SHIM__ = true;
}
