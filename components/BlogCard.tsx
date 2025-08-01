import type { BlogPost } from "@/types";

interface Props {
  post: BlogPost;
}

export default function BlogCard({ post }: Props) {
  const date = new Date(post.createdAt).toLocaleDateString("ja-JP");
  return (
    <article className="rounded-lg overflow-hidden shadow-lg bg-white hover:shadow-xl transition-shadow">
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
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-2">{post.title}</h2>
        <p className="whitespace-pre-wrap text-gray-700">{post.body}</p>
        <p className="text-right text-sm text-gray-500 mt-4">{date}</p>
      </div>
    </article>
  );
}
