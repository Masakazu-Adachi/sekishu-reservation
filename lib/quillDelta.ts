import Quill from "quill";

export function deltaToHtml(delta?: { ops: unknown[] } | null): string {
  if (!delta) return "";
  const q = new Quill(document.createElement("div"));
  q.setContents(delta as never);
  return q.root.innerHTML;
}

export function deltaToPlainText(delta?: { ops: unknown[] } | null): string {
  if (!delta) return "";
  const q = new Quill(document.createElement("div"));
  q.setContents(delta as never);
  return q.getText();
}
