// lib/stripMetaLines.ts
// ごあいさつHTMLから「会場/日付/説明/備考」で始まる1行（<p>…</p> など）を除去
export function stripMetaLines(html: string): string {
  if (!html) return html;

  // 正規化（全角コロン対応）
  const labels = ["会場", "日付", "説明", "備考"];
  let out = html;

  const shouldStrip = (text: string) => {
    if (!text) return false;
    const normalized = text
      .replace(/&nbsp;/gi, " ")
      .replace(/\s+/g, "")
      .trim();
    return labels.some((label) =>
      normalized === label ||
      normalized.startsWith(`${label}：`) ||
      normalized.startsWith(`${label}:`)
    );
  };

  const stripBlock = (html: string, tag: string) => {
    const pattern = new RegExp(
      `<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`,
      "gi"
    );
    return html.replace(pattern, (match) => {
      const text = match.replace(/<[^>]+>/g, "");
      return shouldStrip(text) ? "" : match;
    });
  };

  out = stripBlock(out, "p");
  out = stripBlock(out, "li");

  // <dt>会場</dt><dd>…</dd> の定義リスト対応（ペアごと削除）
  out = out.replace(
    new RegExp(String.raw`<dt[^>]*>[\s\S]*?<\/dt>\s*<dd[^>]*>[\s\S]*?<\/dd>`, "gi"),
    (match) => {
      const dtMatch = match.match(/<dt[^>]*>([\s\S]*?)<\/dt>/i);
      const dtText = dtMatch ? dtMatch[1].replace(/<[^>]+>/g, "") : "";
      return shouldStrip(dtText) ? "" : match;
    }
  );

  return out;
}
