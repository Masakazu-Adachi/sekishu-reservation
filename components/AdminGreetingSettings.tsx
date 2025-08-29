"use client";

import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { uploadImage } from "@/lib/uploadImage";
import { doc, getDoc, setDoc } from "firebase/firestore";

export default function AdminGreetingSettings() {
  const [paragraphs, setParagraphs] = useState<string[]>([""]);
  const [imageUrl, setImageUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragIndex = useRef<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      let refDoc = doc(db, "settings", "publicSite");
      let snap = await getDoc(refDoc);
      if (!snap.exists()) {
        refDoc = doc(db, "settings", "site");
        snap = await getDoc(refDoc);
      }
      if (snap.exists()) {
        const data = snap.data();
        if (data.greetingImageUrl) setImageUrl(data.greetingImageUrl);
        if (data.paragraphs) {
          setParagraphs(data.paragraphs as string[]);
        } else if (data.greetingLines) {
          setParagraphs(
            (data.greetingLines as { text: string }[]).map((l) => l.text)
          );
        } else if (data.greetingText) {
          setParagraphs((data.greetingText as string).split("\n"));
        }
      }
    };
    fetchData();
  }, []);

  const handleFileSelect = () => inputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };
  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    try {
      const downloadUrl = await uploadImage(
        file,
        `images/greeting-images/${file.name}`,
        setProgress
      );
      await setDoc(
        doc(db, "settings", "publicSite"),
        { greetingImageUrl: downloadUrl },
        { merge: true }
      );
      setImageUrl(downloadUrl);
      setFile(null);
      alert("画像をアップロードし、URLを保存しました！");
    } catch (err) {
      console.error(err);
      alert("アップロードでエラーが発生しました");
    } finally {
      setUploading(false);
    }
  };

  const addParagraph = () => setParagraphs((prev) => [...prev, ""]);
  const removeParagraph = (idx: number) =>
    setParagraphs((prev) => prev.filter((_, i) => i !== idx));
  const updateParagraph = (idx: number, value: string) =>
    setParagraphs((prev) => prev.map((p, i) => (i === idx ? value : p)));

  const handleDragStart = (idx: number) => {
    dragIndex.current = idx;
  };
  const handleDragOver = (idx: number) => {
    const from = dragIndex.current;
    if (from === null || from === idx) return;
    setParagraphs((prev) => {
      const arr = [...prev];
      const [moved] = arr.splice(from, 1);
      arr.splice(idx, 0, moved);
      dragIndex.current = idx;
      return arr;
    });
  };
  const handleDragEnd = () => {
    dragIndex.current = null;
  };

  const handleSave = async () => {
    try {
      await setDoc(
        doc(db, "settings", "publicSite"),
        { paragraphs },
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

      {paragraphs.map((p, idx) => (
        <div
          key={idx}
          className="mb-4 border p-3 rounded flex items-start gap-2"
          draggable
          onDragStart={() => handleDragStart(idx)}
          onDragOver={(e) => {
            e.preventDefault();
            handleDragOver(idx);
          }}
          onDragEnd={handleDragEnd}
        >
          <textarea
            value={p}
            onChange={(e) => updateParagraph(idx, e.target.value)}
            className="flex-1 p-2 border rounded"
            rows={3}
          />
          <button
            type="button"
            onClick={() => removeParagraph(idx)}
            className="text-red-600 text-sm"
          >
            削除
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addParagraph}
        className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded mb-4"
      >
        行を追加
      </button>

      <button
        onClick={handleSave}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
      >
        ごあいさつを保存
      </button>
    </div>
  );
}
