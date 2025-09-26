"use client";

import { useEffect, useState } from "react";
import LinkBackToHome from "@/components/LinkBackToHome";
import BlogCard from "@/components/BlogCard";
import { db } from "@/lib/firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import type { BlogPost } from "@/types";

function sortTeaArchives(posts: BlogPost[]): BlogPost[] {
  return [...posts].sort((a, b) => {
    const ao = typeof a.displayOrder === "number" ? a.displayOrder : Number.MAX_SAFE_INTEGER;
    const bo = typeof b.displayOrder === "number" ? b.displayOrder : Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;
    return (b.eventDate ?? b.createdAt ?? "").localeCompare(a.eventDate ?? a.createdAt ?? "");
  });
}

export default function TeaHistoryPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const q = query(
          collection(db, "teaArchives"),
          orderBy("displayOrder", "asc")
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<BlogPost, "id">) }));
        setPosts(sortTeaArchives(data));
      } catch (error) {
        console.warn("Failed to fetch tea archives with displayOrder", error);
        const snapshot = await getDocs(collection(db, "teaArchives"));
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<BlogPost, "id">) }));
        setPosts(sortTeaArchives(data));
      }
    };

    fetchPosts();
  }, []);

  return (
    <main className="p-6 max-w-5xl mx-auto font-serif">
      <LinkBackToHome />
      <h1 className="text-2xl font-bold mb-6 text-center">これまでの茶会</h1>
      <p className="text-center text-sm text-gray-600 mb-8">
        過去に開催した茶会の記録をご覧いただけます。カルーセルには複数の写真を掲載できます。
      </p>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map(post => (
          <BlogCard key={post.id} post={post} href={`/tea-history/${post.id}`} />
        ))}
      </div>
      {posts.length === 0 && (
        <p className="mt-8 text-center text-gray-500">公開中の記事はまだありません。</p>
      )}
    </main>
  );
}
