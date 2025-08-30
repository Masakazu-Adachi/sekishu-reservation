export const IMAGE_MAX_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_EXTS = ["jpg", "jpeg", "png", "gif", "webp"];

export function validateImage(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext || !ALLOWED_EXTS.includes(ext)) {
    alert("jpg/jpeg/png/webp/gif 形式の画像のみアップロードできます");
    return false;
  }
  if (!file.type.startsWith("image/")) {
    alert("画像ファイルのみアップロードできます");
    return false;
  }
  if (file.size > IMAGE_MAX_SIZE) {
    alert("画像サイズは10MB以下にしてください");
    return false;
  }
  return true;
}
