"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import {
  listImages,
  getImageMetadata,
  deleteImage,
  STORAGE_ROOT,
} from "@/lib/storageImages";
import { collection, getDocs, query } from "firebase/firestore";
import { getDownloadURL } from "firebase/storage";
import { db } from "@/lib/firebase";
import LinkBackToAdmin2Top from "@/components/LinkBackToAdmin2Top";
import Image from "next/image";
import { isUnsafeImageSrc } from "@/utils/url";

interface ImageItem {
  path: string;
  url: string;
  size: number;
  contentType: string;
  updated: string;
  usedBy: { id: string; title: string }[];
}

export default function ImagesAdmin() {
  const [items, setItems] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUnusedOnly, setShowUnusedOnly] = useState(false);
  const storageRoot = STORAGE_ROOT;

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await listImages(storageRoot);
      const files = res.items ?? [];
      const usedMap = await getUsageMap();
      const rows = await Promise.all(
        files.map(async (item) => {
          const meta = await getImageMetadata(item.fullPath);
          const url = await getDownloadURL(item);
          const usedBy = usedMap.get(item.fullPath) || usedMap.get(url) || [];
          return {
            path: item.fullPath,
            url,
            size: meta.size || 0,
            contentType: meta.contentType || "",
            updated: meta.updated,
            usedBy,
          } as ImageItem;
        })
      );
      setItems(rows);
      setLoading(false);
    })();
  }, [storageRoot]);

  async function getUsageMap() {
    const map = new Map<string, Array<{ id: string; title: string }>>();
    for (const cname of ["letters", "pastPosts"]) {
      const snap = await getDocs(query(collection(db, cname)));
      snap.forEach((docSnap) => {
        const d = docSnap.data() as { images?: string[]; title?: string };
        const arr: string[] = d.images || [];
        arr.forEach((s) => {
          const list = map.get(s) ?? [];
          list.push({ id: docSnap.id, title: d.title || "(no title)" });
          map.set(s, list);
        });
      });
    }
    return map;
  }

  const filtered = showUnusedOnly
    ? items.filter((i) => (i.usedBy?.length ?? 0) === 0)
    : items;

  return (
    <main className="p-6">
      <LinkBackToAdmin2Top />
      <h1 className="text-xl font-bold mb-4">画像管理</h1>
      <label className="flex gap-2 items-center mb-4">
        <input
          type="checkbox"
          checked={showUnusedOnly}
          onChange={(e) => setShowUnusedOnly(e.target.checked)}
        />
        未使用のみ表示
      </label>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          {filtered.map((f) => (
            <div key={f.path} className="rounded-xl p-3 shadow border">
              {!isUnsafeImageSrc(f.url) && (
                <Image
                  src={f.url}
                  alt=""
                  width={400}
                  height={300}
                  className="w-full h-auto rounded"
                />
              )}
              <div className="text-sm mt-2 break-all">{f.path}</div>
              <div className="text-xs opacity-70">
                {f.contentType} / {Math.round((f.size || 0) / 1024)} KB
              </div>
              <div className="text-xs mt-1">使用中: {f.usedBy?.length ?? 0}件</div>
              <div className="flex gap-2 mt-2">
                {(f.usedBy?.length ?? 0) === 0 ? (
                  <button
                    className="px-3 py-1 rounded bg-red-600 text-white"
                    onClick={async () => {
                      if (confirm("削除しますか？")) {
                        await deleteImage(f.path);
                        location.reload();
                      }
                    }}
                  >
                    削除
                  </button>
                ) : (
                  <details className="w-full">
                    <summary className="cursor-pointer select-none">
                      参照中の投稿
                    </summary>
                    <ul className="list-disc pl-5">
                      {f.usedBy.map((p) => (
                        <li key={p.id}>
                          {p.title} ({p.id})
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
