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
import { IMAGE_MAX_SIZE } from "./validateImage";

export const STORAGE_ROOT = "images";

export async function uploadImageToStorage(
  file: File,
  basePath: string,
  opts?: { postId?: string; uploadedBy?: string }
) {
  if (file.size > IMAGE_MAX_SIZE) {
    throw new Error("File too large");
  }
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const contentType = ext === "png" ? "image/png" : "image/jpeg";
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
  const snap = await uploadBytes(r, file, metadata);
  const url = await getDownloadURL(r);
  return {
    path,
    url,
    contentType: metadata.contentType!,
    size: snap.metadata.size ? Number(snap.metadata.size) : file.size,
  };
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
