"use client";

import { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { uploadImage } from "@/lib/uploadImage";
import { validateImage } from "@/lib/validateImage";

export default function AdminTopImageSettings() {
  const [imageUrl, setImageUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [storagePath, setStoragePath] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchImage = async () => {
      let refDoc = doc(db, "settings", "publicSite");
      let snap = await getDoc(refDoc);
      if (!snap.exists()) {
        refDoc = doc(db, "settings", "site");
        snap = await getDoc(refDoc);
      }
      if (snap.exists()) {
        const data = snap.data();
        if (data.heroImageUrl) setImageUrl(data.heroImageUrl);
        if (data.heroImageAlt) setAlt(data.heroImageAlt);
        if (data.heroImageStoragePath) setStoragePath(data.heroImageStoragePath);
      }
    };
    fetchImage();
  }, []);

  const handleFileChange = (f: File) => {
    if (!validateImage(f)) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFileChange(f);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFileChange(f);
  };

  const handleSave = async () => {
    setUploading(true);
    try {
      let downloadUrl = imageUrl;
      let path = storagePath;
      if (file) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        path = `images/hero-images/${uuidv4()}.${ext}`;
        downloadUrl = await uploadImage(file, path, setProgress);
      }
      await setDoc(
        doc(db, "settings", "publicSite"),
        {
          heroImageUrl: downloadUrl,
          heroImageAlt: alt,
          heroImageStoragePath: path,
        },
        { merge: true }
      );
      setImageUrl(downloadUrl);
      setStoragePath(path);
      setFile(null);
      setPreview("");
      setProgress(0);
      alert("保存しました");
    } catch (err) {
      console.error(err);
      alert("保存に失敗しました");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">トップページ画像設定</h1>
      {(preview || imageUrl) && (
        <img
          src={preview || imageUrl}
          alt="プレビュー"
          className="w-full mb-4 rounded"
        />
      )}
      <div
        className="border-2 border-dashed p-4 text-center mb-4 cursor-pointer"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        {file ? file.name : "ここにドラッグ＆ドロップまたはクリックして選択"}
        <input
          type="file"
          accept="image/*"
          ref={inputRef}
          className="hidden"
          onChange={handleInputChange}
        />
      </div>
      <input
        type="text"
        value={alt}
        onChange={(e) => setAlt(e.target.value)}
        placeholder="画像の説明 (alt)"
        className="w-full p-2 border rounded mb-4"
      />
      <button
        onClick={handleSave}
        disabled={uploading}
        className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {uploading ? `保存中...${progress.toFixed(0)}%` : "保存"}
      </button>
    </div>
  );
}
