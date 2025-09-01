export function isUnsafeImageSrc(src: string | null | undefined): boolean {
  if (!src) return true;
  const s = src.trim();
  return s.startsWith('blob:') || s.startsWith('data:');
}

export function stripBlobImages(html: string): string {
  return html.replace(/<img[^>]+src=["'](?:blob:|data:)[^>]*>/gi, '');
}
