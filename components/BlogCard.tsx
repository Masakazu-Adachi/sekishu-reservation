"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { BlogPost } from "@/types";
import { deltaToPlainText } from "@/lib/quillDelta";

interface Props {
  post: BlogPost;
  href: string;
}

export default function BlogCard({ post, href }: Props) {
  const date = new Date(post.createdAt).toLocaleDateString("ja-JP");
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
      {post.imageUrl && (
        <div className="h-48 w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.imageUrl}
            alt={post.title}
            className="object-cover w-full h-full"
          />
        </div>
      )}
      <div className="p-6 font-serif">
        <h2 className="text-2xl font-bold mb-2">{post.title}</h2>
        <p className="text-gray-700">{preview}</p>
        <p className="text-right text-sm text-gray-500 mt-4">{date}</p>
      </div>
    </Link>
  );
}
