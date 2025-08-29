import { QuillDeltaToHtmlConverter } from 'quill-delta-to-html';

export function deltaToHtml(delta?: { ops: unknown[] } | null): string {
  if (!delta) return '';
  // quill-delta-to-html's type definition uses `any`; ignore explicit-any rule
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const converter = new QuillDeltaToHtmlConverter(delta.ops as any[], {});
  return converter.convert();
}

export function deltaToPlainText(delta?: { ops: unknown[] } | null): string {
  if (!delta) return '';
  return delta.ops
    .map((op) => (typeof (op as { insert: unknown }).insert === 'string' ? (op as { insert: string }).insert : ''))
    .join('');
}
