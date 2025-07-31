"use client";

import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { uploadImage } from "@/lib/uploadImage";
import type { BlogPost } from "@/types";

interface Props {
  collectionName: string;
  heading: string;
  storagePath: string;
}

export default function AdminBlogEditor({ collectionName, heading, storagePath }: Props) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchPosts = async () => {
    const q = query(
      collection(db, collectionName),
      orderBy("createdAt", sortOrder)
    );
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<BlogPost,"id">) }));
    setPosts(data);
  };

  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortOrder]);

  const handleSubmit = async () => {
    setUploading(true);
    let imageUrl = "";
    try {
      if (file) {
        imageUrl = await uploadImage(
          file,
          `${storagePath}/${file.name}`,
          setProgress
        );
      }
      if (editingId) {
        const original = posts.find((p) => p.id === editingId);
        await updateDoc(doc(db, collectionName, editingId), {
          title,
          body,
          imageUrl: imageUrl || original?.imageUrl || "",
        });
      } else {
        await addDoc(collection(db, collectionName), {
          title,
          body,
          imageUrl,
          createdAt: new Date().toISOString(),
        });
      }
      setTitle("");
      setBody("");
      setFile(null);
      setProgress(0);
      setEditingId(null);
      await fetchPosts();
      alert(editingId ? "投稿を更新しました" : "投稿を保存しました");
    } catch (err) {
      console.error(err);
      alert("保存に失敗しました");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">{heading}</h1>
      <div className="mb-4 flex items-center space-x-2">
        <label className="text-sm">並び順:</label>
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
          className="border p-1 text-sm"
        >
          <option value="desc">新しい順</option>
          <option value="asc">古い順</option>
        </select>
      </div>
      <div className="mb-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="タイトル"
          className="border p-2 w-full mb-2"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="本文"
          className="border p-2 w-full h-40 mb-2"
        />
        <input
          type="file"
          accept="image/*"
          ref={inputRef}
          onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
          className="mb-2"
        />
        <div className="flex items-center space-x-2">
          <button
            onClick={handleSubmit}
            disabled={uploading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            {uploading
              ? `アップロード中...${progress.toFixed(0)}%`
              : editingId
              ? "更新する"
              : "投稿する"}
          </button>
          {editingId && (
            <button
              type="button"
              className="text-sm underline"
              onClick={() => {
                setEditingId(null);
                setTitle("");
                setBody("");
                setFile(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
            >
              キャンセル
            </button>
          )}
        </div>
      </div>
      <div className="space-y-4">
        {posts.map((post) => (
          <div key={post.id} className="border p-3 rounded bg-white">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="font-semibold">{post.title}</h2>
                <p className="text-sm text-gray-500 mb-2">
                  {new Date(post.createdAt).toLocaleDateString("ja-JP")}
                </p>
              </div>
              <div className="space-x-2">
                <button
                  className="text-xs text-red-600"
                  onClick={async () => {
                    if (confirm("削除してよろしいですか？")) {
                      await deleteDoc(doc(db, collectionName, post.id));
                      fetchPosts();
                    }
                  }}
                >
                  削除
                </button>
                <button
                  className="text-xs text-blue-600"
                  onClick={() => {
                    setEditingId(post.id);
                    setTitle(post.title);
                    setBody(post.body);
                    if (inputRef.current) inputRef.current.value = "";
                  }}
                >
                  編集
                </button>
              </div>
            </div>
            {post.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.imageUrl} alt="" className="mb-2 w-full rounded" />
            )}
            <p className="whitespace-pre-wrap text-sm">{post.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
