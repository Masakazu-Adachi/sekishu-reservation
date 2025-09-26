"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { doc, getDoc, setDoc } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { uploadImageToStorage } from "@/lib/storageImages";
import { validateImage } from "@/lib/validateImage";

type ExistingImageItem = {
  id: string;
  type: "existing";
  url: string;
  alt: string;
  storagePath?: string;
};

type NewImageItem = {
  id: string;
  type: "new";
  file: File;
  preview: string;
  alt: string;
};

type ImageItem = ExistingImageItem | NewImageItem;

const STORAGE_PATH = "images/hero";

const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export default function AdminTopImageSettings() {
  const [items, setItems] = useState<ImageItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef<ImageItem[]>([]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    const fetchImages = async () => {
      let refDoc = doc(db, "settings", "publicSite");
      let snap = await getDoc(refDoc);
      if (!snap.exists()) {
        refDoc = doc(db, "settings", "site");
        snap = await getDoc(refDoc);
      }
      if (!snap.exists()) return;
      const data = snap.data();
      const heroImagesRaw = Array.isArray(data.heroImages)
        ? (data.heroImages as { url?: string; alt?: string; storagePath?: string }[])
        : [];
      const normalized: ExistingImageItem[] = heroImagesRaw
        .filter((img) => typeof img?.url === "string")
        .map((img) => ({
          id: createId(),
          type: "existing",
          url: img.url as string,
          alt: img.alt ?? "",
          storagePath: img.storagePath,
        }));

      if (normalized.length > 0) {
        setItems(normalized);
        return;
      }

      if (typeof data.heroImageUrl === "string" && data.heroImageUrl) {
        setItems([
          {
            id: createId(),
            type: "existing",
            url: data.heroImageUrl,
            alt: typeof data.heroImageAlt === "string" ? data.heroImageAlt : "",
            storagePath:
              typeof data.heroImageStoragePath === "string"
                ? data.heroImageStoragePath
                : undefined,
          },
        ]);
      }
    };

    fetchImages();
  }, []);

  useEffect(() => {
    return () => {
      itemsRef.current.forEach((item) => {
        if (item.type === "new") URL.revokeObjectURL(item.preview);
      });
    };
  }, []);

  const addFiles = (files: FileList | File[]) => {
    const list = Array.from(files ?? []);
    if (list.length === 0) return;
    const newItems: ImageItem[] = [];
    for (const file of list) {
      if (!validateImage(file)) continue;
      const preview = URL.createObjectURL(file);
      const baseName = file.name.replace(/\.[^.]+$/, "");
      newItems.push({
        id: createId(),
        type: "new",
        file,
        preview,
        alt: baseName,
      });
    }
    if (newItems.length > 0) {
      setItems((prev) => [...prev, ...newItems]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      addFiles(e.dataTransfer.files);
    }
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target && target.type === "new") {
        URL.revokeObjectURL(target.preview);
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  const moveItem = (id: string, direction: "up" | "down") => {
    setItems((prev) => {
      const index = prev.findIndex((item) => item.id === id);
      if (index === -1) return prev;
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  const handleAltChange = (id: string, alt: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, alt } : item))
    );
  };

  const handleSave = async () => {
    const snapshot = [...items];
    setUploading(true);
    const newItems = snapshot.filter((item): item is NewImageItem => item.type === "new");
    try {
      const saved = [] as {
        url: string;
        alt: string;
        storagePath?: string;
      }[];
      for (const item of snapshot) {
        if (item.type === "existing") {
          saved.push({
            url: item.url,
            alt: item.alt,
            storagePath: item.storagePath,
          });
          continue;
        }
        const { url, path } = await uploadImageToStorage(item.file, STORAGE_PATH, {
          uploadedBy: "admin",
        });
        saved.push({
          url,
          alt: item.alt,
          storagePath: path,
        });
      }

      await setDoc(
        doc(db, "settings", "publicSite"),
        {
          heroImages: saved,
          heroImageUrl: saved[0]?.url ?? "",
          heroImageAlt: saved[0]?.alt ?? "",
          heroImageStoragePath: saved[0]?.storagePath ?? "",
        },
        { merge: true }
      );

      const normalized: ExistingImageItem[] = saved.map((img) => ({
        id: createId(),
        type: "existing",
        url: img.url,
        alt: img.alt,
        storagePath: img.storagePath,
      }));

      newItems.forEach((item) => URL.revokeObjectURL(item.preview));
      setItems(normalized);
      alert("保存しました");
    } catch (err) {
      console.error(err);
      alert("保存に失敗しました");
    } finally {
      setUploading(false);
    }
  };

  const hasImages = items.length > 0;

  const dropText = useMemo(() => {
    if (!hasImages) return "ここにドラッグ＆ドロップまたはクリックして画像を追加";
    return "追加の画像をドラッグ＆ドロップまたはクリックで選択";
  }, [hasImages]);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">トップページ画像設定</h1>
      <p className="text-sm text-gray-600 mb-4">
        複数枚の画像を登録してカルーセル表示できます。表示順は上から順番になります。
      </p>
      <div
        className="border-2 border-dashed border-gray-300 rounded p-6 text-center mb-6 cursor-pointer bg-white"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <p className="text-sm text-gray-600">{dropText}</p>
        <p className="text-xs text-gray-400 mt-1">jpg / jpeg / png / webp / gif ・ 10MB まで</p>
        <input
          type="file"
          accept="image/*"
          multiple
          ref={inputRef}
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            if (e.target) e.target.value = "";
          }}
        />
      </div>

      <div className="space-y-4 mb-6">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="flex flex-col sm:flex-row gap-4 border rounded-lg p-4 bg-gray-50"
          >
            <div className="relative w-full sm:w-56 h-40 flex-shrink-0 overflow-hidden rounded">
              {item.type === "existing" ? (
                <Image src={item.url} alt="カルーセル画像" fill className="object-cover" />
              ) : (
                <Image
                  src={item.preview}
                  alt={item.file.name}
                  fill
                  unoptimized
                  className="object-cover"
                />
              )}
            </div>
            <div className="flex-1 space-y-2">
              <div>
                <label className="block text-sm font-medium">代替テキスト (alt)</label>
                <input
                  type="text"
                  value={item.alt}
                  onChange={(e) => handleAltChange(item.id, e.target.value)}
                  className="w-full mt-1 p-2 border rounded"
                />
              </div>
              {item.type === "existing" && (
                <p className="text-xs text-gray-500 break-all">{item.url}</p>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="text-xs text-blue-600 disabled:text-gray-400"
                  onClick={() => moveItem(item.id, "up")}
                  disabled={index === 0}
                >
                  ↑ 上へ
                </button>
                <button
                  type="button"
                  className="text-xs text-blue-600 disabled:text-gray-400"
                  onClick={() => moveItem(item.id, "down")}
                  disabled={index === items.length - 1}
                >
                  ↓ 下へ
                </button>
                <button
                  type="button"
                  className="text-xs text-red-600"
                  onClick={() => removeItem(item.id)}
                >
                  削除
                </button>
              </div>
            </div>
          </div>
        ))}
        {!hasImages && (
          <p className="text-sm text-gray-500">
            まだ画像が登録されていません。上の枠から画像を追加してください。
          </p>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={uploading}
        className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {uploading ? "保存中..." : "保存"}
      </button>
      <Link
        href="/admin2/top-image/preview"
        className="text-sm text-blue-600 underline hover:text-blue-800 mt-4 block"
      >
        カルーセルのプレビューを見る
      </Link>
    </div>
  );
}
