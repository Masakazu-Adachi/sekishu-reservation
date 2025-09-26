"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import type { BlogPost } from "@/types";
import { deltaToPlainText } from "@/lib/quillDelta";
import { isUnsafeImageSrc } from "@/utils/url";

interface Props {
  post: BlogPost;
  href: string;
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const hasTime = value.includes("T");
  const date = new Date(hasTime ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ja-JP");
}

export default function BlogCard({ post, href }: Props) {
  const dateLabel = useMemo(() => {
    const eventDate = formatDate(post.eventDate ?? undefined);
    if (eventDate) {
      return `実施日: ${eventDate}`;
    }
    const created = formatDate(post.createdAt);
    return created ? created : "";
  }, [post.createdAt, post.eventDate]);
  const [preview, setPreview] = useState("");

  useEffect(() => {
    if (post.bodyDelta) {
      const plain = deltaToPlainText(post.bodyDelta).trim();
      setPreview(plain.length > 60 ? plain.slice(0, 60) + "..." : plain);
    } else if (post.bodyHtmlUrl) {
      fetch(post.bodyHtmlUrl)
        .then(res => res.text())
        .then(html => {
          const plain = html.replace(/<[^>]+>/g, "");
          setPreview(plain.length > 60 ? plain.slice(0, 60) + "..." : plain);
        })
        .catch(() => {
          const plain = (post.body || "").replace(/<[^>]+>/g, "");
          setPreview(plain.length > 60 ? plain.slice(0, 60) + "..." : plain);
        });
    } else {
      const plain = (post.body || "").replace(/<[^>]+>/g, "");
      setPreview(plain.length > 60 ? plain.slice(0, 60) + "..." : plain);
    }
  }, [post]);

  return (
    <Link
      href={href}
      className="block rounded-lg overflow-hidden shadow-lg bg-white hover:shadow-xl transition-shadow"
    >
      {post.imageUrl && !isUnsafeImageSrc(post.imageUrl) && (
        <div className="h-48 w-full overflow-hidden relative">
          <Image
            src={post.imageUrl}
            alt={post.title}
            fill
            className="object-cover"
          />
        </div>
      )}
      <div className="p-6 font-serif">
        <h2 className="text-2xl font-bold mb-2">{post.title}</h2>
        <p className="text-gray-700">{preview}</p>
        {dateLabel && (
          <p className="text-right text-sm text-gray-500 mt-4">{dateLabel}</p>
        )}
      </div>
    </Link>
  );
}
