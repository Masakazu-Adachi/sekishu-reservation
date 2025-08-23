// ⚠️ 応急処置。根本対応はライブラリアップデート推奨。
if (typeof window !== 'undefined') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ReactDOMAny = require('react-dom');
    if (ReactDOMAny && !ReactDOMAny.findDOMNode) {
      ReactDOMAny.findDOMNode = (inst: any) => {
        if (!inst) return null;
        if ((inst as any).nodeType === 1) return inst as any;
        if ((inst as any).current && (inst as any).current.nodeType === 1) return (inst as any).current;
        if ((inst as any).base && (inst as any).base.nodeType === 1) return (inst as any).base;
        return null;
      };
      (window as any).__FIND_DOM_NODE_SHIM__ = true;
    }
  } catch {}
}
