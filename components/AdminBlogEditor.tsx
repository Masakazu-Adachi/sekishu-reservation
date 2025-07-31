"use client";

import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";
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
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchPosts = async () => {
    const q = query(collection(db, collectionName), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<BlogPost,"id">) }));
    setPosts(data);
  };

  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async () => {
    setUploading(true);
    let imageUrl = "";
    try {
      if (file) {
        imageUrl = await uploadImage(file, `${storagePath}/${file.name}`, setProgress);
      }
      await addDoc(collection(db, collectionName), {
        title,
        body,
        imageUrl,
        createdAt: new Date().toISOString(),
      });
      setTitle("");
      setBody("");
      setFile(null);
      setProgress(0);
      await fetchPosts();
      alert("投稿を保存しました");
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
        <button
          onClick={handleSubmit}
          disabled={uploading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          {uploading ? `アップロード中...${progress.toFixed(0)}%` : "投稿する"}
        </button>
      </div>
      <div className="space-y-4">
        {posts.map((post) => (
          <div key={post.id} className="border p-3 rounded bg-white">
            <h2 className="font-semibold">{post.title}</h2>
            <p className="text-sm text-gray-500 mb-2">
              {new Date(post.createdAt).toLocaleDateString("ja-JP")}
            </p>
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
