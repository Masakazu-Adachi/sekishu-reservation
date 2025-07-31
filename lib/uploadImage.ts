import { storage } from "./firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

// Firebase Storage に画像をアップロードしてダウンロード URL を取得する共通関数

/**
 * Firebase Storage へ画像をアップロードしてURLを取得します
 * @param file アップロードする画像ファイル
 * @param path Storage 上の保存パス (例: `images/greeting.jpg`)
 * @param onProgress 進捗を取得したい場合にコールバックを指定
 * @returns ダウンロードURL
 */
export async function uploadImage(
  file: File,
  path: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  const storageRef = ref(storage, path);
  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        if (onProgress) {
          const pct =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress(pct);
        }
      },
      (error) => {
        reject(error);
      },
      async () => {
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(url);
        } catch (err) {
          reject(err);
        }
      }
    );
  });
}
