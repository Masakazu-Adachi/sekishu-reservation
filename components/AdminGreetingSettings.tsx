"use client";

import { useState, useEffect, useRef } from "react";
import { db, storage } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

export default function AdminGreetingSettings() {
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      const refSite = doc(db, "settings", "site");
      const snap = await getDoc(refSite);
      if (snap.exists()) {
        const data = snap.data();
        setText(data.greetingText || "");
        setImageUrl(data.greetingImageUrl || "");
      }
    };
    fetchData();
  }, []);

  const handleFileSelect = () => {
    inputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);

    try {
      const storageRef = ref(storage, `greeting-images/${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          setProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        },
        (error) => {
          console.error(error);
          alert("アップロードに失敗しました");
          setUploading(false);
        },
        async () => {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          await setDoc(
            doc(db, "settings", "site"),
            { greetingImageUrl: downloadUrl },
            { merge: true }
          );
          setImageUrl(downloadUrl);
          setUploading(false);
          setFile(null);
          setProgress(0);
          alert("画像をアップロードし、URLを保存しました！");
        }
      );
    } catch (err) {
      console.error(err);
      alert("アップロードでエラーが発生しました");
      setUploading(false);
    }
  };

  const handleSaveText = async () => {
    try {
      await setDoc(
        doc(db, "settings", "site"),
        { greetingText: text },
        { merge: true }
      );
      alert("ごあいさつを保存しました！");
    } catch (err) {
      console.error(err);
      alert("保存に失敗しました");
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">ごあいさつ設定</h1>

      {imageUrl && (
        <img src={imageUrl} alt="ごあいさつ画像" className="w-full mb-4 rounded" />
      )}

      <div className="flex items-center gap-4 mb-4">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          ref={inputRef}
          className="hidden"
        />
        <button
          type="button"
          onClick={handleFileSelect}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded shadow"
        >
          ファイルを選択
        </button>
        {file && <span className="truncate max-w-xs">{file.name}</span>}
      </div>

      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50 mb-6"
      >
        {uploading ? `アップロード中...${progress.toFixed(0)}%` : "画像をアップロードして設定"}
      </button>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full h-40 p-2 border rounded mb-4"
        placeholder="ごあいさつ文を入力"
      />

      <button
        onClick={handleSaveText}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
      >
        ごあいさつを保存
      </button>
    </div>
  );
}
