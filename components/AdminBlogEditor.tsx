"use client";

// ポリフィルは最速で適用
import "@/app/react-dom-finddomnode-polyfill";
import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import type ReactQuillType from "react-quill";
import "react-quill/dist/quill.snow.css";
// ReactQuill はクライアントのみ読み込み（SSG/SSRで落ちないように）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ReactQuill = dynamic(() => import("react-quill").then(m => m.default), { ssr: false }) as any;
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { uploadImage } from "@/lib/uploadImage";
import { uploadImageToStorage } from "@/lib/storageImages";
import type { BlogPost } from "@/types";

interface Props {
  collectionName: string;
  heading: string;
  storagePath: string;
}

const IMAGE_MAX_SIZE = 10 * 1024 * 1024;

function validateImage(file: File): boolean {
  if (!file.type.startsWith("image/")) {
    alert("画像ファイルを選択してください");
    return false;
  }
  if (file.size > IMAGE_MAX_SIZE) {
    alert("画像サイズは10MB以下にしてください");
    return false;
  }
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext || !["jpg", "jpeg", "png", "gif", "webp", "svg", "svgz"].includes(ext)) {
    alert("対応していない画像形式です");
    return false;
  }
  return true;
}

function buildImagesHtml(urls: string[]): string {
  const imgs = urls.map(
    url => `<img src="${url}" alt="" class="w-full h-auto rounded-xl sm:w-1/2" />`
  );
  if (urls.length === 1) {
    return `<div class="my-4"><img src="${urls[0]}" alt="" class="w-full h-auto rounded-xl" /></div>`;
  }
  if (urls.length === 2) {
    return `<div class="my-4 flex gap-2 flex-col sm:flex-row">${imgs.join("")}</div>`;
  }
  if (urls.length === 3) {
    const inner = urls
      .map(url => `<img src="${url}" alt="" class="w-full h-auto rounded-xl" />`)
      .join("");
    return `<div class="my-4 grid gap-2 grid-cols-1 sm:grid-cols-3">${inner}</div>`;
  }
  const inner = urls
    .map(
      url =>
        `<img src="${url}" alt="" class="w-full sm:w-[calc(50%-0.25rem)] h-auto rounded-xl" />`
    )
    .join("");
  return `<div class="my-4 flex gap-2 flex-wrap">${inner}</div>`;
}

export default function AdminBlogEditor({ collectionName, heading, storagePath }: Props) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const inputRef = useRef<HTMLInputElement>(null);
  const quillRef = useRef<ReactQuillType | null>(null);
  const [isQuillReady, setIsQuillReady] = useState(false); // 登録完了フラグ
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const uploadingRef = useRef(uploading);
  useEffect(() => {
    uploadingRef.current = uploading;
  }, [uploading]);
  const showToastRef = useRef(showToast);
  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);
  const isPastingRef = useRef(false);

  // 画像リサイズ⇒ blot-formatter に切替。
  // 「ReactQuill が使う Quill」に登録。完了まで描画しない。
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [ReactQuillMod, BFMod] = await Promise.all([
          import("react-quill"),
          import("quill-blot-formatter"),
        ]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rqAny: any = (ReactQuillMod as any).default ?? ReactQuillMod;
        // ReactQuillが保持するQuill（無ければ quill を fallback）
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let QuillAny: any = (ReactQuillMod as any).Quill;
        if (!QuillAny) {
          const QMod = await import("quill");
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          QuillAny = (QMod as any).default ?? QMod;
        }
        // blot-formatter のクラス
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const BlotFormatter: any = (BFMod as any).default ?? BFMod;
        if (!mounted) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const register = (Q: any) => {
          if (Q && typeof Q.register === "function") {
            try { Q.register("modules/blotFormatter", BlotFormatter); } catch {}
          }
        };
        if (rqAny?.Quill && rqAny.Quill !== QuillAny) register(rqAny.Quill);
        register(QuillAny);
        setIsQuillReady(true);
      } catch {
        setIsQuillReady(true);
      }
    })();
    return () => { mounted = false; };
  }, []);


  // 軽量デバウンス
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function useDebouncedCallback<T extends (...args: any[]) => void>(fn: T, delay: number) {
    const fnRef = useRef(fn);
    useEffect(() => {
      fnRef.current = fn;
    }, [fn]);
    return useMemo(() => {
      let t: ReturnType<typeof setTimeout> | undefined;
      return (...args: Parameters<T>) => {
        if (t) clearTimeout(t);
        t = setTimeout(() => fnRef.current(...args), delay);
      };
    }, [delay]);
  }


  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ header: [1, 2, 3, false] }],
          [{ font: ["sans-serif", "serif", "monospace"] }],
          [{ size: [] }],
          ["bold", "italic", "underline", "strike"],
          [{ color: [] }, { background: [] }],
          [{ align: [] }],
          ["link", "image"],
          ["clean"],
        ],
      },
      clipboard: { matchVisual: false },
      // 画像リサイズの代わりに blot-formatter を使用（登録完了後のみ）
      ...(isQuillReady ? { blotFormatter: {} } : {}),
    }),
    [isQuillReady]
  );

  useEffect(() => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;
    const toolbar = editor.getModule("toolbar");
    if (!toolbar) return;
    const onImageClick = () => {
      if (uploadingRef.current) return;
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.multiple = true;
      const savedIndex = editor.getSelection()?.index ?? editor.getLength();
      input.onchange = async () => {
        const files = Array.from(input.files ?? []);
        const valid = files.filter(validateImage);
        if (!valid.length) return;
        uploadingRef.current = true;
        setUploading(true);
        editor.focus();
        const urls: string[] = [];
        for (const f of valid) {
          try {
            const { url } = await uploadImageToStorage(f, storagePath, {
              uploadedBy: "admin",
            });
            if (url) urls.push(url);
          } catch (err) {
            console.error(err);
            showToastRef.current("画像のアップロードに失敗しました");
          }
        }
        if (urls.length) {
          isPastingRef.current = true;
          const range =
            editor.getSelection(true) ?? { index: savedIndex, length: 0 };
          const html = buildImagesHtml(urls);
          editor.clipboard.dangerouslyPasteHTML(range.index, html);
          editor.setSelection(range.index + 1, 0, "user");
          requestAnimationFrame(() => {
            isPastingRef.current = false;
          });
        } else {
          showToastRef.current("画像のアップロードに失敗しました");
        }
        setUploading(false);
        uploadingRef.current = false;
      };
      input.click();
    };
    toolbar.addHandler("image", onImageClick);
  }, [storagePath, isQuillReady]);

  const formats = useMemo(() => [
    "header",
    "font", "size",
    "bold", "italic", "underline", "strike",
    "color", "background",
    "align",
    "link", "image",
    "list", "blockquote", "code-block",
  ], []);

  const debouncedSave = useDebouncedCallback((html: string) => {
    setBody(html);
  }, 800);

  const handleChange = useCallback(
    (html: string) => {
      if (isPastingRef.current) return;
      debouncedSave(html);
    },
    [debouncedSave]
  );

  const fetchPosts = async () => {
    const q = query(
      collection(db, collectionName),
      orderBy("createdAt", sortOrder)
    );
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<BlogPost,"id">) }));
    setPosts(data);
  };

  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortOrder]);

  const handleSubmit = async () => {
    setUploading(true);
    let imageUrl = "";
    try {
      if (file) {
        imageUrl = await uploadImage(
          file,
          `${storagePath}/${file.name}`,
          setProgress
        );
      }
      const editor = quillRef.current?.getEditor();
      const delta = editor?.getContents();
      const used: string[] = [];
      if (delta) {
        for (const op of delta.ops ?? []) {
          if (op.insert && typeof op.insert === "object" && "image" in op.insert) {
            used.push((op.insert as { image: string }).image);
          }
        }
      }
      const images = Array.from(new Set(used));
      if (editingId) {
        const original = posts.find((p) => p.id === editingId);
        await updateDoc(doc(db, collectionName, editingId), {
          title,
          body,
          imageUrl: imageUrl || original?.imageUrl || "",
          images,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, collectionName), {
          title,
          body,
          imageUrl,
          images,
          createdAt: new Date().toISOString(),
          updatedAt: serverTimestamp(),
        });
      }
      setTitle("");
      setBody("");
      setFile(null);
      setProgress(0);
      setEditingId(null);
      await fetchPosts();
      alert(editingId ? "投稿を更新しました" : "投稿を保存しました");
    } catch (err) {
      console.error(err);
      alert("保存に失敗しました");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">{heading}</h1>
      <div className="mb-4 flex items-center space-x-2">
        <label className="text-sm">並び順:</label>
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
          className="border p-1 text-sm"
        >
          <option value="desc">新しい順</option>
          <option value="asc">古い順</option>
        </select>
      </div>
      <div className="mb-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="タイトル"
          className="border p-2 w-full mb-2"
        />
        {/* 登録完了まではエディタを描画しない（初期化順序の競合を避ける） */}
        {isQuillReady && (
          <ReactQuill
            ref={quillRef}
            value={body}
            onChange={handleChange}
            modules={modules}
            formats={formats}
            placeholder="ここに本文を入力してください…"
            className="mb-2"
          />
        )}
        <input
          type="file"
          accept="image/*"
          ref={inputRef}
          onChange={(e) => {
            const f = e.target.files ? e.target.files[0] : null;
            if (f && validateImage(f)) {
              setFile(f);
            } else {
              setFile(null);
              if (e.target) e.target.value = "";
            }
          }}
          className="mb-2"
        />
        <div className="flex items-center space-x-2">
          <button
            onClick={handleSubmit}
            disabled={uploading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            {uploading
              ? `アップロード中...${progress.toFixed(0)}%`
              : editingId
              ? "更新する"
              : "投稿する"}
          </button>
          {editingId && (
            <button
              type="button"
              className="text-sm underline"
              onClick={() => {
                setEditingId(null);
                setTitle("");
                setBody("");
                setFile(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
            >
              キャンセル
            </button>
          )}
        </div>
      </div>
      <div className="space-y-4">
        {posts.map((post) => (
          <div key={post.id} className="border p-3 rounded bg-white">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="font-semibold">{post.title}</h2>
                <p className="text-sm text-gray-500 mb-2">
                  {new Date(post.createdAt).toLocaleDateString("ja-JP")}
                </p>
              </div>
              <div className="space-x-2">
                <button
                  className="text-xs text-red-600"
                  onClick={async () => {
                    if (confirm("削除してよろしいですか？")) {
                      await deleteDoc(doc(db, collectionName, post.id));
                      fetchPosts();
                    }
                  }}
                >
                  削除
                </button>
                <button
                  className="text-xs text-blue-600"
                  onClick={() => {
                    setEditingId(post.id);
                    setTitle(post.title);
                    setBody(post.body);
                    if (inputRef.current) inputRef.current.value = "";
                  }}
                >
                  編集
                </button>
              </div>
            </div>
            {post.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.imageUrl} alt="" className="mb-2 w-full rounded" />
            )}
            <div
              className="text-sm"
              dangerouslySetInnerHTML={{ __html: post.body }}
            />
          </div>
        ))}
      </div>
      {toast && (
        <div className="fixed bottom-4 right-4 bg-black text-white px-4 py-2 rounded">
          {toast}
        </div>
      )}
      {uploading && (
        <div className="fixed bottom-4 right-4" aria-label="loading">
          <svg
            className="animate-spin h-6 w-6 text-gray-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            ></path>
          </svg>
        </div>
      )}
    </div>
  );
}
