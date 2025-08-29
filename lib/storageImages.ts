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

const TYPE_TO_EXT: Record<string, string> = Object.fromEntries(
  Object.entries(EXT_TO_TYPE).map(([ext, type]) => [type, ext])
);

function inferContentType(type: string, ext: string) {
  if (type?.startsWith("image/")) return type;
  return EXT_TO_TYPE[ext] ?? "application/octet-stream";
}

function getExt(name: string | undefined, type: string | undefined) {
  const ext = name?.split(".").pop()?.toLowerCase();
  if (ext) return ext;
  if (type && TYPE_TO_EXT[type]) return TYPE_TO_EXT[type];
  return "jpg";
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
  input: File | Blob | { dataUrl: string },
  basePath: string,
  opts?: { postId?: string; uploadedBy?: string }
): Promise<UploadResult> {
  let blob: Blob;
  let name: string | undefined;
  if ("dataUrl" in (input as { dataUrl?: string })) {
    const { dataUrl } = input as { dataUrl: string };
    const m = dataUrl.match(/^data:(.*?);base64,(.*)$/);
    const mime = m?.[1] || "image/jpeg";
    const bin = atob(m?.[2] || "");
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    blob = new Blob([arr], { type: mime });
    name = `image.${getExt(undefined, mime)}`;
  } else if (input instanceof File) {
    blob = input;
    name = input.name;
  } else {
    blob = input as Blob;
  }
  if (blob.size > IMAGE_MAX_SIZE) throw new Error("File too large");
  const ext = getExt(name, blob.type);
  const contentType = inferContentType(blob.type, ext);
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
      originalName: name ?? "image",
    },
  };
  await uploadBytes(r, blob, metadata);
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
