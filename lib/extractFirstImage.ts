export function extractFirstImageSrc(html?: string | null): string | null {
  if (!html) return null;
  const m = html.match(/<img[^>]+src=['"]([^'"]+)['"]/i);
  return m?.[1] ?? null;
}
