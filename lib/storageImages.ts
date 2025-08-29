import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  getMetadata,
  list,
  deleteObject,
} from "firebase/storage";
import type { StorageReference } from "firebase/storage";
import { v4 as uuid } from "uuid";
import { IMAGE_MAX_SIZE } from "./validateImage";

const EXT_TO_TYPE: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  svgz: "image/svg+xml",
};

function inferContentType(file: File, ext: string) {
  if (file.type?.startsWith("image/")) return file.type;
  return EXT_TO_TYPE[ext] ?? "application/octet-stream";
}

async function retryGetDownloadURL(r: StorageReference) {
  const delays = [200, 400, 800, 1600, 3200];
  let lastErr: unknown;
  for (const d of delays) {
    try {
      return await getDownloadURL(r);
    } catch (e) {
      lastErr = e;
      await new Promise(res => setTimeout(res, d));
    }
  }
  throw lastErr;
}

export type UploadResult = { url: string; path: string };

export const STORAGE_ROOT = "images";

export async function uploadImageToStorage(
  file: File,
  basePath: string,
  opts?: { postId?: string; uploadedBy?: string }
): Promise<UploadResult> {
  if (file.size > IMAGE_MAX_SIZE) {
    throw new Error("File too large");
  }
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const contentType = inferContentType(file, ext);
  const storage = getStorage();
  const id = uuid();
  const path = `${basePath}/${id}.${ext}`;
  const r = ref(storage, path);
  const metadata = {
    contentType,
    cacheControl: "public,max-age=31536000,immutable",
    customMetadata: {
      uploadedBy: opts?.uploadedBy ?? "",
      postId: opts?.postId ?? "",
      originalName: file.name,
    },
  };
  await uploadBytes(r, file, metadata);
  const url = await retryGetDownloadURL(r);
  return { url, path };
}

export async function listImages(prefix: string, pageToken?: string) {
  const storage = getStorage();
  const r = ref(storage, prefix);
  return list(r, { maxResults: 1000, pageToken });
}

export async function getImageMetadata(path: string) {
  const storage = getStorage();
  return getMetadata(ref(storage, path));
}

export async function deleteImage(path: string) {
  const storage = getStorage();
  return deleteObject(ref(storage, path));
}
