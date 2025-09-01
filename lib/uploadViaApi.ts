export type UploadResponse = { url: string; path: string };

export async function uploadViaApi(
  file: Blob,
  basePath: string,
  onProgress?: (p: number) => void
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('basePath', basePath);

  return await new Promise<UploadResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload');
    xhr.setRequestHeader(
      'x-admin-upload-token',
      process.env.NEXT_PUBLIC_ADMIN_UPLOAD_TOKEN || ''
    );
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as UploadResponse);
        } catch (e) {
          reject(e);
        }
      } else {
        reject(new Error('upload failed'));
      }
    };
    xhr.onerror = () => reject(new Error('network error'));
    xhr.send(formData);
  });
}
