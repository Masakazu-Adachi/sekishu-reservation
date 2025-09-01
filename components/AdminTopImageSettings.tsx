"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { uploadImageToStorage } from "@/lib/storageImages";
import { validateImage } from "@/lib/validateImage";
import { isUnsafeImageSrc } from "@/utils/url";

export default function AdminTopImageSettings() {
  const [imageUrl, setImageUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [storagePath, setStoragePath] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploading, setUploading] = useState(false);
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
    setPreviewUrl((p) => {
      if (p) URL.revokeObjectURL(p);
      return URL.createObjectURL(f);
    });
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

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleSave = async () => {
    setUploading(true);
    try {
      let downloadUrl = imageUrl;
      let path = storagePath;
      if (file) {
        const { url, path: uploadedPath } = await uploadImageToStorage(
          file,
          "images/hero",
          { uploadedBy: "admin" }
        );
        downloadUrl = url;
        path = uploadedPath;
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
      setPreviewUrl("");
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
      {(previewUrl || imageUrl) &&
        !isUnsafeImageSrc(previewUrl || imageUrl) && (
          <Image
            src={previewUrl || imageUrl}
            alt="プレビュー"
            width={800}
            height={600}
            className="w-full h-auto mb-4 rounded"
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
        {uploading ? "保存中..." : "保存"}
      </button>
    </div>
  );
}
