"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import type { BlogPost } from "@/types";
import LinkBackToHome from "@/components/LinkBackToHome";
import BlogCard from "@/components/BlogCard";

export default function PastPostsPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);

  useEffect(() => {
    const fetchPosts = async () => {
      const q = query(collection(db, "pastPosts"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<BlogPost,"id">) }));
      setPosts(data);
    };
    fetchPosts();
  }, []);

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <LinkBackToHome />
      <h1 className="text-2xl font-bold mb-6 text-center">過去の茶会紹介</h1>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <BlogCard key={post.id} post={post} href={`/posts/past/${post.id}`} />
        ))}
      </div>
    </main>
  );
}
