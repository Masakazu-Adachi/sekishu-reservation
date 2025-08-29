export const IMAGE_MAX_SIZE = 10 * 1024 * 1024; // 10MB

export function validateImage(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext || !["jpg", "jpeg", "png"].includes(ext)) {
    alert("jpg/jpeg/png 形式の画像のみアップロードできます");
    return false;
  }
  if (file.size > IMAGE_MAX_SIZE) {
    alert("画像サイズは10MB以下にしてください");
    return false;
  }
  return true;
}
