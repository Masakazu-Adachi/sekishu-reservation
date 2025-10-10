/**
 * 改行を <br /> に変換してプレーンテキストの段落を保持する。
 * すでにHTMLタグが含まれている場合は改行コードの正規化のみに留める。
 */
export function ensureLineBreaks(input: string | null | undefined): string {
  if (!input) return "";

  const normalised = input.replace(/\r\n?/g, "\n");
  const hasHtmlTag = /<\/?[a-z][\s\S]*>/i.test(normalised);

  if (hasHtmlTag) {
    return normalised;
  }

  return normalised.replace(/\n/g, "<br />");
}
