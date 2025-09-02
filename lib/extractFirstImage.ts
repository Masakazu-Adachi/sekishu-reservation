export function extractFirstImageSrc(html?: string | null): string | null {
  if (!html) return null;
  // ・シングル/ダブル両対応  ・属性順不同  ・改行/空白ありでもOK
  // 例: <img ... src="..." ...> / <img\nsrc='...'>
  const m = html.match(/<img\b[^>]*?\bsrc=(['"])(.*?)\1/i);
  return m?.[2] ?? null;
}
