import Link from "next/link";
import type { BlogPost } from "@/types";

interface Props {
  post: BlogPost;
  href: string;
}

export default function BlogCard({ post, href }: Props) {
  const date = new Date(post.createdAt).toLocaleDateString("ja-JP");
  const plain = post.body.replace(/<[^>]+>/g, "");
  const preview = plain.length > 60 ? plain.slice(0, 60) + "..." : plain;
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
