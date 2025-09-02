"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import type { BlogPost } from "@/types";
import LinkBackToHome from "@/components/LinkBackToHome";
import { deltaToHtml } from "@/lib/quillDelta";
import RichHtml from "@/components/RichHtml";
import { isUnsafeImageSrc } from "@/utils/url";
import { preserveLeadingSpaces } from "@/lib/preserveLeadingSpaces";

export default function PastPostDetailPage() {
  const { id } = useParams();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [html, setHtml] = useState("");

  useEffect(() => {
    const fetchPost = async () => {
      if (!id) return;
      const ref = doc(db, "pastPosts", id as string);
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
      setHtml(preserveLeadingSpaces(deltaToHtml(post.bodyDelta)));
    } else if (post.bodyHtmlUrl) {
      fetch(post.bodyHtmlUrl)
        .then(res => res.text())
        .then((t) => setHtml(preserveLeadingSpaces(t)))
        .catch(() => setHtml(preserveLeadingSpaces(post.body || "")));
    } else {
      setHtml(preserveLeadingSpaces(post.body || ""));
    }
  }, [post]);

  if (!post) return <p className="p-6 font-serif">読み込み中...</p>;

  const date = new Date(post.createdAt).toLocaleDateString("ja-JP");

  return (
    <main className="p-6 max-w-3xl mx-auto font-serif">
      <LinkBackToHome />
      {post.imageUrl && !isUnsafeImageSrc(post.imageUrl) && (
        <Image
          src={post.imageUrl}
          alt={post.title}
          width={800}
          height={600}
          className="w-full h-auto rounded mb-4"
        />
      )}
      <h1 className="text-3xl font-bold mb-4 font-serif">{post.title}</h1>
      <div className="text-gray-700 mb-4 rich-html">
        <RichHtml html={html} />
      </div>
      <p className="text-right text-sm text-gray-500">{date}</p>
    </main>
  );
}

