"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import type { BlogPost } from "@/types";
import LinkBackToHome from "@/components/LinkBackToHome";

export default function LettersPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);

  useEffect(() => {
    const fetchPosts = async () => {
      const q = query(collection(db, "letters"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<BlogPost,"id">) }));
      setPosts(data);
    };
    fetchPosts();
  }, []);

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <LinkBackToHome />
      <h1 className="text-2xl font-bold mb-6 text-center">通信</h1>
      <div className="space-y-8">
        {posts.map((post) => (
          <article key={post.id} className="border p-4 rounded shadow bg-white">
            <h2 className="text-xl font-semibold mb-2">{post.title}</h2>
            {post.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.imageUrl} alt={post.title} className="mb-2 w-full rounded" />
            )}
            <p className="whitespace-pre-wrap">{post.body}</p>
            <p className="text-right text-sm text-gray-500 mt-2">
              {new Date(post.createdAt).toLocaleDateString("ja-JP")}
            </p>
          </article>
        ))}
      </div>
    </main>
  );
}
