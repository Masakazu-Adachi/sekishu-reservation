import * as ReactDom from 'react-dom';

// Polyfill for missing ReactDOM.findDOMNode in ESM environments.
// Patches both the namespace and default export of react-dom.

// Type representing values that may hold a DOM like object.
type MaybeDomLike =
  | { nodeType?: number; current?: unknown; base?: unknown }
  | null
  | undefined;

type ReactDomModule = {
  [k: string]: unknown;
  findDOMNode?: (inst: unknown) => Node | null;
  default?: {
    [k: string]: unknown;
    findDOMNode?: (inst: unknown) => Node | null;
  };
};

const mod = ReactDom as unknown as ReactDomModule;

function findDOMNode(inst: unknown): Node | null {
  const i = inst as MaybeDomLike;
  if (!i) return null;

  if ((i as { nodeType?: number }).nodeType === 1) {
    return i as unknown as Node;
  }

  const cur = (i as { current?: unknown }).current as
    | { nodeType?: number }
    | undefined;
  if (cur && cur.nodeType === 1) return cur as unknown as Node;

  const base = (i as { base?: unknown }).base as
    | { nodeType?: number }
    | undefined;
  if (base && base.nodeType === 1) return base as unknown as Node;

  return null;
}

if (typeof mod.findDOMNode !== 'function') {
  mod.findDOMNode = findDOMNode;
}

if (mod.default && typeof mod.default.findDOMNode !== 'function') {
  mod.default.findDOMNode = mod.findDOMNode;
}
