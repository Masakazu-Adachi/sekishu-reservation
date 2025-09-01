export function linkifyAndLineBreak(
  text: string,
  opts?: { skipEscape?: boolean }
): string {
  const escaped = opts?.skipEscape
    ? text
    : text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
  const withLinks = escaped.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  );
  return withLinks.replace(/\n/g, '<br>');
}
