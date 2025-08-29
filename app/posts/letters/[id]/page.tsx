"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import type { BlogPost } from "@/types";
import LinkBackToHome from "@/components/LinkBackToHome";
import { deltaToHtml } from "@/lib/quillDelta";

export default function LetterDetailPage() {
  const { id } = useParams();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [html, setHtml] = useState("");

  useEffect(() => {
    const fetchPost = async () => {
      if (!id) return;
      const ref = doc(db, "letters", id as string);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setPost({ id: snap.id, ...(snap.data() as Omit<BlogPost, "id">) });
      }
    };
    fetchPost();
  }, [id]);

  useEffect(() => {
    if (!post) return;
    if (post.bodyDelta) {
      setHtml(deltaToHtml(post.bodyDelta));
    } else if (post.bodyHtmlUrl) {
      fetch(post.bodyHtmlUrl)
        .then(res => res.text())
        .then(setHtml)
        .catch(() => setHtml(post.body || ""));
    } else {
      setHtml(post.body || "");
    }
  }, [post]);

  if (!post) return <p className="p-6 font-serif">読み込み中...</p>;

  const date = new Date(post.createdAt).toLocaleDateString("ja-JP");

  return (
    <main className="p-6 max-w-3xl mx-auto font-serif">
      <LinkBackToHome />
      {post.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.imageUrl}
          alt={post.title}
          className="w-full rounded mb-4"
        />
      )}
      <h1 className="text-3xl font-bold mb-4 font-serif">{post.title}</h1>
      <div
        className="whitespace-pre-wrap text-gray-700 mb-4"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <p className="text-right text-sm text-gray-500">{date}</p>
    </main>
  );
}

