// lib/stripMetaLines.ts
// ごあいさつHTMLから「会場/日付/説明/備考」で始まる1行（<p>…</p> など）を除去
export function stripMetaLines(html: string): string {
  if (!html) return html;

  // 正規化（全角コロン対応）
  const labels = ["会場", "日付", "説明", "備考"];
  const labelRe = labels.join("|"); // 会場|日付|説明|備考

  let out = html;

  // <p>会場: ...</p> / <p>会場：...</p> の行ごと削除（改行や空白にも強め）
  out = out.replace(
    new RegExp(
      String.raw`<p[^>]*>\s*(?:${labelRe})\s*[:：][\s\S]*?<\/p>`,
      "gi"
    ),
    ""
  );

  // <li>会場: ...</li> などの箇条書き対応（必要なら）
  out = out.replace(
    new RegExp(
      String.raw`<li[^>]*>\s*(?:${labelRe})\s*[:：][\s\S]*?<\/li>`,
      "gi"
    ),
    ""
  );

  // <dt>会場</dt><dd>…</dd> の定義リスト対応（ペアごと削除）
  out = out.replace(
    new RegExp(
      String.raw`<dt[^>]*>\s*(?:${labelRe})\s*<\/dt>\s*<dd[^>]*>[\s\S]*?<\/dd>`,
      "gi"
    ),
    ""
  );

  return out;
}
