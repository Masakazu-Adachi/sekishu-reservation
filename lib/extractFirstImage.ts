export function extractFirstImageSrc(html?: string | null): string | null {
  if (!html) return null;

  // 1) 正規表現（シングル/ダブル、改行、属性順不同に対応）
  const m = html.match(/<img\b[^>]*?\bsrc=(['"])(.*?)\1/i);
  if (m?.[2]) return m[2];

  // 2) DOM パースでのフォールバック（ブラウザ側）
  if (typeof window !== "undefined") {
    const div = document.createElement("div");
    div.innerHTML = html;
    const img = div.querySelector("img");
    return img?.getAttribute("src") ?? null;
  }
  return null;
}
