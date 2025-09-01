export type UploadResponse = { url: string; path: string };

export async function uploadViaApi(
  file: Blob,
  basePath: string,
  onProgress?: (p: number) => void
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('basePath', basePath);
  onProgress?.(0);
  const token = process.env.NEXT_PUBLIC_ADMIN_UPLOAD_TOKEN;
  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
    headers: token ? { 'x-admin-upload-token': token } : undefined,
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error('upload failed');
  }
  const data = (await res.json()) as UploadResponse;
  onProgress?.(100);
  return data;
}
