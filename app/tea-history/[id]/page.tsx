"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import LinkBackToHome from "@/components/LinkBackToHome";
import GalleryCarousel from "@/components/GalleryCarousel";
import RichHtml from "@/components/RichHtml";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import type { BlogPost } from "@/types";
import { deltaToHtml } from "@/lib/quillDelta";
import { isUnsafeImageSrc, stripBlobImages } from "@/utils/url";
import { preserveLeadingSpaces } from "@/lib/preserveLeadingSpaces";

function formatDate(value?: string | null) {
  if (!value) return "";
  const hasTime = value.includes("T");
  const date = new Date(hasTime ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ja-JP");
}

export default function TeaHistoryDetailPage() {
  const { id } = useParams();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [html, setHtml] = useState("");

  useEffect(() => {
    const fetchPost = async () => {
      if (!id) return;
      const ref = doc(db, "teaArchives", id as string);
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
        .then(t => setHtml(preserveLeadingSpaces(t)))
        .catch(() => setHtml(preserveLeadingSpaces(post.body || "")));
    } else {
      setHtml(preserveLeadingSpaces(post.body || ""));
    }
  }, [post]);

  const galleryImages = useMemo(() => {
    return (post?.galleryImages ?? [])
      .filter(url => !isUnsafeImageSrc(url))
      .map(url => ({ src: url, alt: post?.title ?? "" }));
  }, [post]);

  if (!post) {
    return <p className="p-6 font-serif">読み込み中...</p>;
  }

  const createdDate = formatDate(post.createdAt);
  const eventDate = formatDate(post.eventDate);

  return (
    <main className="p-6 max-w-3xl mx-auto font-serif">
      <LinkBackToHome />
      <article className="space-y-6">
        <header className="space-y-2">
          {createdDate && (
            <p className="text-sm text-gray-500">公開日: {createdDate}</p>
          )}
          {eventDate && (
            <p className="text-base text-gray-700">実施日: {eventDate}</p>
          )}
          <h1 className="text-3xl font-bold">{post.title}</h1>
        </header>
        {post.imageUrl && !isUnsafeImageSrc(post.imageUrl) && (
          <div className="relative w-full h-[240px] sm:h-[360px] rounded-2xl overflow-hidden shadow">
            <Image src={post.imageUrl} alt={post.title} fill className="object-cover" />
          </div>
        )}
        <div className="text-gray-700 leading-relaxed rich-html">
          <RichHtml html={stripBlobImages(html)} autoPlayMs={5000} />
        </div>
        {galleryImages.length > 0 && (
          <GalleryCarousel images={galleryImages} autoPlayMs={5000} />
        )}
      </article>
    </main>
  );
}
