// lib/preserveLeadingSpaces.ts
// ブロック要素直後や <br> 直後の連続スペースを &nbsp; に変換して保持する
export function preserveLeadingSpaces(html: string): string {
  if (!html) return html;

  // ① <p|div|li|h1..h6>直後の先頭スペース群
  html = html.replace(
    /<(p|div|li|h[1-6])(\s[^>]*)?>(\s+)/g,
    (_m, tag, attrs = "", spaces) =>
      `<${tag}${attrs || ""}>` + spaces.replace(/ /g, "&nbsp;")
  );

  // ② <br>直後の行頭スペース群（複数行対応）
  html = html.replace(
    /(<br\s*\/?>(?:\s*\n)?)(\s+)/g,
    (_m, br, spaces) => br + spaces.replace(/ /g, "&nbsp;")
  );

  return html;
}
