"use client";

import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { uploadImage } from "@/lib/uploadImage";
import { doc, getDoc, setDoc } from "firebase/firestore";
import type { GreetingLine } from "@/types";

export default function AdminGreetingSettings() {
  const [lines, setLines] = useState<GreetingLine[]>([]);
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
        setImageUrl(data.greetingImageUrl || "");
        if (data.greetingLines) {
          setLines(data.greetingLines as GreetingLine[]);
        } else if (data.greetingText) {
          const split = (data.greetingText as string).split("\n");
          setLines(
            split.map((t: string) => ({
              text: t,
              align: "left",
              color: "#000000",
              font: "serif",
            }))
          );
        } else {
          setLines([{ text: "", align: "left", color: "#000000", font: "serif" }]);
        }
      } else {
        setLines([{ text: "", align: "left", color: "#000000", font: "serif" }]);
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
      const downloadUrl = await uploadImage(
        file,
        `images/greeting-images/${file.name}`,
        (p) => setProgress(p)
      );
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
    } catch (err) {
      console.error(err);
      alert("アップロードでエラーが発生しました");
      setUploading(false);
    }
  };

  const handleLineChange = (
    index: number,
    key: keyof GreetingLine,
    value: string
  ) => {
    setLines((prev) =>
      prev.map((ln, i) => (i === index ? { ...ln, [key]: value } : ln))
    );
  };

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      { text: "", align: "left", color: "#000000", font: "serif" },
    ]);
  };

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveLines = async () => {
    try {
      await setDoc(
        doc(db, "settings", "site"),
        { greetingLines: lines },
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

      {lines.map((line, idx) => (
        <div key={idx} className="mb-4 border p-3 rounded">
          <input
            value={line.text}
            onChange={(e) => handleLineChange(idx, "text", e.target.value)}
            className="w-full p-2 border rounded mb-2"
            placeholder={`行${idx + 1}のテキスト`}
          />
          <div className="flex items-center gap-2">
            <select
              value={line.align}
              onChange={(e) => handleLineChange(idx, "align", e.target.value)}
              className="border rounded p-1"
            >
              <option value="left">左</option>
              <option value="center">中央</option>
              <option value="right">右</option>
            </select>
            <select
              value={line.font}
              onChange={(e) => handleLineChange(idx, "font", e.target.value)}
              className="border rounded p-1"
            >
              <option value="serif">Serif</option>
              <option value="sans">Sans</option>
              <option value="mono">Mono</option>
            </select>
            <input
              type="color"
              value={line.color}
              onChange={(e) => handleLineChange(idx, "color", e.target.value)}
            />
            <button
              type="button"
              onClick={() => removeLine(idx)}
              className="text-red-600 text-sm"
            >
              削除
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addLine}
        className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded mb-4"
      >
        行を追加
      </button>

      <button
        onClick={handleSaveLines}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
      >
        ごあいさつを保存
      </button>
    </div>
  );
}
