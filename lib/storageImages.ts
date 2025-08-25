import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  getMetadata,
  list,
  deleteObject,
} from "firebase/storage";
import { v4 as uuid } from "uuid";

export const STORAGE_ROOT = "images";

export async function uploadImageToStorage(file: File, basePath: string, opts?: { postId?: string; uploadedBy?: string }) {
  const storage = getStorage();
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const now = new Date();
  const y = String(now.getFullYear());
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const id = uuid();
  const path = `${basePath}/${y}/${m}/${opts?.postId ?? "misc"}/${id}.${ext}`;
  const r = ref(storage, path);
  const metadata = {
    contentType: file.type || "image/jpeg",
    cacheControl: "public,max-age=31536000,immutable",
    customMetadata: {
      uploadedBy: opts?.uploadedBy ?? "",
      postId: opts?.postId ?? "",
      originalName: file.name,
    },
  };
  const snap = await uploadBytes(r, file, metadata);
  const url = await getDownloadURL(r);
  return { path, url, contentType: metadata.contentType!, size: snap.metadata.size ? Number(snap.metadata.size) : file.size };
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
