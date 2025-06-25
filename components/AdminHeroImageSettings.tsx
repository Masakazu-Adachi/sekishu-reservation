
"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function AdminHeroImageSettings() {
  const [imageUrl, setImageUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchImageUrl = async () => {
      const ref = doc(db, "settings", "site");
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setImageUrl(snap.data().heroImageUrl || "");
      }
    };
    fetchImageUrl();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);

    const storageRef = ref(storage, `hero-images/${file.name}`);
    await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(storageRef);

    await setDoc(doc(db, "settings", "site"), { heroImageUrl: downloadUrl }, { merge: true });
    setImageUrl(downloadUrl);
    setUploading(false);
    alert("画像をアップロードし、URLを保存しました！");
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">ヒーロー画像設定</h1>

      {imageUrl && (
        <img src={imageUrl} alt="現在のヒーロー画像" className="w-full mb-4 rounded" />
      )}

      <input type="file" accept="image/*" onChange={handleFileChange} className="mb-4" />
      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        {uploading ? "アップロード中..." : "画像をアップロードして設定"}
      </button>
    </div>
  );
}
