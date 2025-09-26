"use client";

import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import Image from "next/image";
import QuillClientEditor, { QuillClientHandle } from "@/components/QuillClientEditor";
import type Quill from "quill";
import type { DeltaOperation } from "quill/core";
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
  deleteField,
} from "firebase/firestore";
import { uploadImage } from "@/lib/uploadImage";
import { uploadImageToStorage } from "@/lib/storageImages";
import type { BlogPost } from "@/types";
import { deltaToHtml } from "@/lib/quillDelta";
import { isUnsafeImageSrc, stripBlobImages } from "@/utils/url";
import { preserveLeadingSpaces } from "@/lib/preserveLeadingSpaces";

interface Props {
  collectionName: string;
  heading: string;
  storagePath: string;
  enableEventDate?: boolean;
  enableGallery?: boolean;
  enableManualOrder?: boolean;
  galleryStoragePath?: string;
}

type GalleryExistingItem = { id: string; type: "existing"; url: string };
type GalleryNewItem = {
  id: string;
  type: "new";
  file: File;
  preview: string;
};

type GalleryItem = GalleryExistingItem | GalleryNewItem;

type ExtendedBlogPost = BlogPost & {
  eventDate?: string | null;
  galleryImages?: string[];
  displayOrder?: number;
};

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function revokeGalleryPreview(item: GalleryItem) {
  if (item.type === "new") {
    URL.revokeObjectURL(item.preview);
  }
}

function formatDisplayDate(value?: string | null) {
  if (!value) return null;
  const hasTime = value.includes("T");
  const date = new Date(hasTime ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("ja-JP");
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
async function dataUrlOrBlobToBlob(src: string): Promise<Blob> {
  if (src.startsWith("data:")) {
    const [meta, data] = src.split(",");
    const mimeMatch = meta.match(/data:(.*?)(;base64)?$/);
    const mime = mimeMatch?.[1] || "application/octet-stream";
    const bin = atob(data);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }
  const res = await fetch(src);
  return res.blob();
}

async function normalizeDataImagesInEditor(editor: Quill, storagePath: string) {
  const root: HTMLElement = editor.root;
  const imgs = Array.from(
    root.querySelectorAll('img[src^="data:"], img[src^="blob:"]')
  ) as HTMLImageElement[];

  for (const img of imgs) {
    const src = img.getAttribute("src") || "";
    try {
      const blob = await dataUrlOrBlobToBlob(src);
      const { url } = await uploadImageToStorage(blob, storagePath, {
        uploadedBy: "admin",
      });
      img.setAttribute("src", url);
    } catch (e) {
      console.error("data/blob upload failed", e);
    }
  }
}

function isPlainJSON(v: unknown): boolean {
  try {
    JSON.stringify(v);
    return true;
  } catch {
    return false;
  }
}


export default function AdminBlogEditor({
  collectionName,
  heading,
  storagePath,
  enableEventDate = false,
  enableGallery = false,
  enableManualOrder = false,
  galleryStoragePath,
}: Props) {
  const [posts, setPosts] = useState<ExtendedBlogPost[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const inputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const quillRef = useRef<QuillClientHandle | null>(null);
  const [isQuillReady, setIsQuillReady] = useState(false); // 登録完了フラグ
  const [toast, setToast] = useState<string | null>(null);
  const [eventDate, setEventDate] = useState("");
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const resolvedGalleryPath = useMemo(
    () => galleryStoragePath ?? `${storagePath}/gallery`,
    [galleryStoragePath, storagePath]
  );

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const uploadingRef = useRef(uploading);
  const showToastRef = useRef(showToast);
  const isPastingRef = useRef(false);
  const galleryItemsRef = useRef<GalleryItem[]>([]);
  useEffect(() => {
    galleryItemsRef.current = galleryItems;
  }, [galleryItems]);
  useEffect(() => {
    return () => {
      galleryItemsRef.current.forEach(revokeGalleryPreview);
    };
  }, []);
  useEffect(() => {
    uploadingRef.current = uploading;
  }, [uploading]);
  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  useEffect(() => {
    if (!isQuillReady) return;
    const editor = quillRef.current?.getEditor();
    if (!editor) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const QuillAny: any = editor.constructor;
    editor.clipboard.addMatcher("IMG", (node, delta) => {
      const el = node as HTMLElement;
      const width = el.getAttribute("width") || el.style.width;
      if (width && delta.ops) {
        (delta.ops as DeltaOperation[]).forEach(op => {
          op.attributes = { ...(op.attributes ?? {}), width };
        });
      }
      return delta;
    });
    editor.clipboard.addMatcher("DIV", (node, delta) => {
      const urls = (node as HTMLElement).getAttribute("data-urls");
      if (urls) {
        const columns = parseInt(
          (node as HTMLElement).getAttribute("data-columns") || "0",
          10
        );
        const Delta = QuillAny.import("delta");
        const d = new Delta();
        d.insert({ "image-group": { urls: JSON.parse(urls), columns } });
        return d;
      }
      return delta;
    });

    const dropHandler = async (e: DragEvent) => {
      const files = Array.from(e.dataTransfer?.files ?? []).filter(f => f.type.startsWith("image/"));
      if (!files.length) return;
      e.preventDefault();
      if (uploadingRef.current) return;
      uploadingRef.current = true;
      setUploading(true);
      const savedIndex = editor.getSelection()?.index ?? editor.getLength();
      const urls: string[] = [];
      for (const f of files) {
        if (!validateImage(f)) continue;
        try {
          const { url } = await uploadImageToStorage(f, storagePath, {
            uploadedBy: "admin",
          });
          urls.push(url);
        } catch (err) {
          console.error(err);
          showToastRef.current("画像のアップロードに失敗しました");
        }
      }
      if (urls.length) {
        isPastingRef.current = true;
        const range = editor.getSelection(true) ?? { index: savedIndex, length: 0 };
        if (urls.length === 1) {
          editor.insertEmbed(range.index, "image", urls[0], "user");
        } else {
          const columns = urls.length === 2 ? 2 : urls.length === 3 ? 3 : 2;
          editor.insertEmbed(range.index, "image-group", { urls, columns }, "user");
        }
        editor.setSelection(range.index + 1, 0, "user");
        requestAnimationFrame(() => {
          isPastingRef.current = false;
        });
      }
      setUploading(false);
      uploadingRef.current = false;
      setTimeout(() => normalizeDataImagesInEditor(editor, storagePath), 0);
    };
    editor.root.addEventListener("drop", dropHandler);
    const pasteHandler = () => {
      setTimeout(() => normalizeDataImagesInEditor(editor, storagePath), 0);
    };
    editor.root.addEventListener("paste", pasteHandler);

    const handler = () => {
      const imgs = editor.root.querySelectorAll("img");
      imgs.forEach(img => {
        const blot = QuillAny.find(img);
        const w = img.getAttribute("width") || (img as HTMLElement).style.width;
        if (blot && w) blot.format("width", w);
      });
    };
    editor.on("text-change", handler);
    return () => {
      editor.off("text-change", handler);
      editor.root.removeEventListener("drop", dropHandler);
      editor.root.removeEventListener("paste", pasteHandler);
    };
  }, [isQuillReady, storagePath]);

  // 画像リサイズ⇒ blot-formatter に切替。Quill に登録し終わるまで描画しない。
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [QMod, BFMod] = await Promise.all([
          import("quill"),
          import("quill-blot-formatter"),
        ]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const QuillAny: any = (QMod as any).default ?? QMod;
        // カスタム Image blot（width フォーマット対応）
        const BaseImage = QuillAny.import("formats/image");
        class ImageEx extends BaseImage {
          static formats(domNode: HTMLElement) {
            const w = domNode.getAttribute("width") || domNode.style.width || null;
            return w ? { width: w } : {};
          }
          format(name: string, value: unknown) {
            if (name === "width") {
              if (value) this.domNode.setAttribute("width", String(value));
              else this.domNode.removeAttribute("width");
            } else {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (BaseImage as any).prototype.format.call(this, name, value);
            }
          }
        }
        QuillAny.register(ImageEx, true);

        // 複数画像用のブロック Blot
        const BlockEmbed = QuillAny.import("blots/block/embed");
        class ImageGroup extends BlockEmbed {
          static blotName = "image-group";
          static tagName = "div";
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          static create(value: any) {
            const node = super.create() as HTMLElement;
            const urls: string[] = value?.urls ?? [];
            const columns: number =
              value?.columns ?? (urls.length === 3 ? 3 : urls.length === 2 ? 2 : 2);
            node.setAttribute("data-urls", JSON.stringify(urls));
            node.setAttribute("data-columns", String(columns));
            if (urls.length >= 2) node.setAttribute("data-gallery", "");
            if (urls.length === 2) {
              node.className = "my-4 grid gap-2 grid-cols-1 sm:grid-cols-2";
            } else if (urls.length === 3) {
              node.className = "my-4 grid gap-2 grid-cols-1 sm:grid-cols-3";
            } else {
              node.className = "my-4 flex gap-2 flex-wrap";
            }
            urls.forEach(url => {
              const img = document.createElement("img");
              img.setAttribute("src", url);
              img.setAttribute("alt", "");
              img.className = "w-full h-auto rounded-xl";
              if (urls.length >= 4) img.classList.add("sm:w-[calc(50%-0.25rem)]");
              node.appendChild(img);
            });
            return node;
          }
          static value(node: HTMLElement) {
            const urls = JSON.parse(node.getAttribute("data-urls") || "[]");
            const columns = parseInt(node.getAttribute("data-columns") || "0", 10) || urls.length;
            return { urls, columns };
          }
        }
        QuillAny.register(ImageGroup);

        // blot-formatter のクラス
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const BlotFormatter: any = (BFMod as any).default ?? BFMod;
        const register = (Q: { register?: (path: string, mod: unknown) => void }) => {
          if (Q && typeof Q.register === "function") {
            try {
              Q.register("modules/blotFormatter", BlotFormatter);
            } catch {}
          }
        };
        register(QuillAny);
        if (mounted) setIsQuillReady(true);
      } catch {
        if (mounted) setIsQuillReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toolbar = editor.getModule("toolbar") as any;
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
          if (urls.length === 1) {
            editor.insertEmbed(range.index, "image", urls[0], "user");
          } else {
            const columns = urls.length === 2 ? 2 : urls.length === 3 ? 3 : 2;
            editor.insertEmbed(
              range.index,
              "image-group",
              { urls, columns },
              "user"
            );
          }
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
    if (toolbar && typeof toolbar.addHandler === "function") {
      toolbar.addHandler("image", onImageClick);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isQuillReady]);

  const formats = useMemo(() => [
    "header",
    "font", "size",
    "bold", "italic", "underline", "strike",
    "color", "background",
    "align",
    "link", "image", "image-group", "width",
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

  const addGalleryFiles = useCallback(
    (fileList: FileList | null) => {
      if (!enableGallery || !fileList) return;
      const items: GalleryItem[] = [];
      Array.from(fileList).forEach((f) => {
        if (!validateImage(f)) return;
        const preview = URL.createObjectURL(f);
        items.push({ id: createId(), type: "new", file: f, preview });
      });
      if (!items.length) return;
      setGalleryItems((prev) => [...prev, ...items]);
    },
    [enableGallery]
  );

  const removeGalleryItem = useCallback((id: string) => {
    setGalleryItems((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) revokeGalleryPreview(target);
      return prev.filter((item) => item.id !== id);
    });
  }, []);

  const moveGalleryItem = useCallback((id: string, dir: "up" | "down") => {
    setGalleryItems((prev) => {
      const index = prev.findIndex((item) => item.id === id);
      if (index === -1) return prev;
      const targetIndex = dir === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  }, []);

  const clearGalleryItems = useCallback(() => {
    setGalleryItems((prev) => {
      prev.forEach(revokeGalleryPreview);
      return [];
    });
  }, []);

  const fetchPosts = useCallback(async () => {
    const orderField = enableManualOrder ? "displayOrder" : "createdAt";
    const orderDirection = enableManualOrder ? "asc" : sortOrder;
    const q = query(collection(db, collectionName), orderBy(orderField, orderDirection));
    const snapshot = await getDocs(q);
    const data = await Promise.all(
      snapshot.docs.map(async (d, idx) => {
        const raw = d.data() as Omit<ExtendedBlogPost, "id">;
        const p: ExtendedBlogPost = {
          id: d.id,
          ...raw,
          displayOrder:
            typeof raw.displayOrder === "number"
              ? raw.displayOrder
              : enableManualOrder
              ? idx
              : raw.displayOrder,
        };
        if (!p.body && p.bodyHtmlUrl) {
          try {
            p.body = preserveLeadingSpaces(
              await (await fetch(p.bodyHtmlUrl)).text()
            );
          } catch {}
        }
        if (p.bodyDelta) {
          p.body = preserveLeadingSpaces(deltaToHtml(p.bodyDelta));
        } else if (p.body) {
          p.body = preserveLeadingSpaces(p.body);
        }
        return p;
      })
    );
    if (enableManualOrder) {
      data.sort((a, b) => {
        const ao = typeof a.displayOrder === "number" ? a.displayOrder : 0;
        const bo = typeof b.displayOrder === "number" ? b.displayOrder : 0;
        if (ao === bo) {
          return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
        }
        return ao - bo;
      });
    }
    setPosts(data);
  }, [collectionName, enableManualOrder, sortOrder]);

  const movePostOrder = useCallback(
    async (id: string, dir: "up" | "down") => {
      if (!enableManualOrder) return;
      const index = posts.findIndex((p) => p.id === id);
      if (index === -1) return;
      const targetIndex = dir === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= posts.length) return;
      const current = posts[index];
      const target = posts[targetIndex];
      const currentOrder =
        typeof current.displayOrder === "number" ? current.displayOrder : index;
      const targetOrder =
        typeof target.displayOrder === "number" ? target.displayOrder : targetIndex;
      try {
        await Promise.all([
          updateDoc(doc(db, collectionName, current.id), {
            displayOrder: targetOrder,
          }),
          updateDoc(doc(db, collectionName, target.id), {
            displayOrder: currentOrder,
          }),
        ]);
        await fetchPosts();
      } catch (err) {
        console.error("failed to reorder posts", err);
        showToast("並び替えに失敗しました");
      }
    },
    [collectionName, enableManualOrder, fetchPosts, posts, showToast]
  );

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleSubmit = async () => {
    if (enableEventDate && !eventDate) {
      alert("実施日を入力してください");
      return;
    }
    setUploading(true);
    let imageUrl = "";
    let deltaSize = 0;
    let htmlSize = 0;
    const gallerySnapshot = enableGallery ? [...galleryItems] : [];
    try {
      if (file) {
        imageUrl = await uploadImage(
          file,
          `${storagePath}/${file.name}`,
          setProgress
        );
      }
      const editor = quillRef.current?.getEditor();
      if (!editor) throw new Error("editor not ready");
      await normalizeDataImagesInEditor(editor, storagePath);
        const html = preserveLeadingSpaces(editor.root.innerHTML ?? "");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const delta = (editor.clipboard as any).convert(html);
        const ops = delta.ops as DeltaOperation[] | undefined;
        const bodyDelta = { ops };
      if (!isPlainJSON(bodyDelta)) {
        console.error("bodyDelta is not serializable JSON", bodyDelta);
        showToast("保存に失敗しました");
        setUploading(false);
        return;
      }
      deltaSize = new Blob([JSON.stringify(bodyDelta)]).size;
      htmlSize = new Blob([html]).size;
      if (deltaSize > 800000) {
        console.warn("delta size exceeds 800kB", { deltaSize });
      }
      const used: string[] = [];
        for (const op of ops ?? []) {
        if (op.insert && typeof op.insert === "object") {
          if ("image" in op.insert) {
            used.push((op.insert as { image: string }).image);
          } else if ("image-group" in op.insert) {
            used.push(...(op.insert as { "image-group": { urls: string[] } })["image-group"].urls);
          }
        }
      }
      const images = Array.from(new Set(used));
      let galleryImages: string[] = [];
      if (enableGallery) {
        galleryImages = [];
        for (const item of gallerySnapshot) {
          if (item.type === "existing") {
            if (item.url) galleryImages.push(item.url);
            continue;
          }
          try {
            const { url } = await uploadImageToStorage(item.file, resolvedGalleryPath, {
              uploadedBy: "admin",
            });
            galleryImages.push(url);
          } catch (err) {
            console.error(err);
            showToast("カルーセル画像のアップロードに失敗しました");
            throw err;
          } finally {
            revokeGalleryPreview(item);
          }
        }
      }
      const data: Record<string, unknown> = {
        title,
        bodyDelta,
        imageUrl,
        images,
        updatedAt: serverTimestamp(),
      };
      if (enableEventDate) {
        data.eventDate = eventDate || null;
      }
      if (enableGallery) {
        data.galleryImages = galleryImages;
      }
      if (enableManualOrder) {
        const current = editingId
          ? posts.find((p) => p.id === editingId)?.displayOrder
          : undefined;
        const nextOrder =
          typeof current === "number"
            ? current
            : posts.reduce((max, p) =>
                Math.max(
                  max,
                  typeof p.displayOrder === "number" ? p.displayOrder : max
                ),
              -1) + 1;
        data.displayOrder = nextOrder;
      }
      try {
        if (editingId) {
          const original = posts.find(p => p.id === editingId);
          await updateDoc(doc(db, collectionName, editingId), {
            ...data,
            imageUrl: imageUrl || original?.imageUrl || "",
            body: deleteField(),
          });
        } else {
          await addDoc(collection(db, collectionName), {
            ...data,
            createdAt: new Date().toISOString(),
          });
        }
      } catch (e) {
        // Firestore エラーを詳細にログ
        console.error("Firestore save error", e, { deltaSize, htmlSize });
        throw e;
      }
      setTitle("");
      setBody("");
      setFile(null);
      setProgress(0);
      setEditingId(null);
      setEventDate("");
      clearGalleryItems();
      if (inputRef.current) inputRef.current.value = "";
      if (galleryInputRef.current) galleryInputRef.current.value = "";
      await fetchPosts();
      alert(editingId ? "投稿を更新しました" : "投稿を保存しました");
    } catch (err) {
      console.error(err, { deltaSize, htmlSize });
      showToast("保存に失敗しました");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">{heading}</h1>
      {!enableManualOrder && (
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
      )}
      <div className="mb-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="タイトル"
          className="border p-2 w-full mb-2"
        />
        {enableEventDate && (
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="border p-2 w-full mb-2"
          />
        )}
        {/* 登録完了まではエディタを描画しない（初期化順序の競合を避ける） */}
        {isQuillReady && (
          <QuillClientEditor
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
        {enableGallery && (
          <div className="mb-4 space-y-2">
            <p className="text-sm text-gray-600">カルーセル用の画像を設定します（ドラッグ＆ドロップで本文にも画像を追加できます）。</p>
            <div className="space-y-2">
              {galleryItems.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 border rounded p-2 bg-gray-50"
                >
                  <div className="relative w-20 h-14 flex-shrink-0 overflow-hidden rounded">
                    {item.type === "existing" ? (
                      <Image
                        src={item.url}
                        alt=""
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <Image
                        src={item.preview}
                        alt={item.file.name}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 text-sm break-all">
                    {item.type === "existing" ? item.url : item.file.name}
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      className="text-xs text-blue-600"
                      onClick={() => moveGalleryItem(item.id, "up")}
                      disabled={index === 0}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="text-xs text-blue-600"
                      onClick={() => moveGalleryItem(item.id, "down")}
                      disabled={index === galleryItems.length - 1}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="text-xs text-red-600"
                      onClick={() => removeGalleryItem(item.id)}
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <input
              type="file"
              multiple
              accept="image/*"
              ref={galleryInputRef}
              onChange={(e) => {
                addGalleryFiles(e.target.files);
                if (e.target) e.target.value = "";
              }}
              className=""
            />
          </div>
        )}
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
                setEventDate("");
                clearGalleryItems();
                if (inputRef.current) inputRef.current.value = "";
                if (galleryInputRef.current) galleryInputRef.current.value = "";
              }}
            >
              キャンセル
            </button>
          )}
        </div>
      </div>
      <div className="space-y-4">
        {posts.map((post, index) => {
          const orderLabel =
            typeof post.displayOrder === "number" ? post.displayOrder + 1 : null;
          const createdLabel = formatDisplayDate(post.createdAt) || "-";
          const eventLabel = formatDisplayDate(post.eventDate) || "未設定";
          return (
            <div key={post.id} className="border p-3 rounded bg-white">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <h2 className="font-semibold">{post.title}</h2>
                  <div className="text-xs text-gray-500 space-y-1 mb-2">
                    <p>作成日: {createdLabel}</p>
                    {enableEventDate && <p>実施日: {eventLabel}</p>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {enableManualOrder && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        表示順:{orderLabel != null ? ` ${orderLabel}` : " -"}
                      </span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className="text-xs text-blue-600"
                          onClick={() => movePostOrder(post.id, "up")}
                          disabled={index === 0}
                        >
                          上へ
                        </button>
                        <button
                          type="button"
                          className="text-xs text-blue-600"
                          onClick={() => movePostOrder(post.id, "down")}
                          disabled={index === posts.length - 1}
                        >
                          下へ
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="space-x-2">
                    <button
                      className="text-xs text-red-600"
                      onClick={async () => {
                        if (confirm("削除してよろしいですか？")) {
                          await deleteDoc(doc(db, collectionName, post.id));
                          await fetchPosts();
                        }
                      }}
                    >
                      削除
                    </button>
                    <button
                      className="text-xs text-blue-600"
                      onClick={async () => {
                        setEditingId(post.id);
                        setTitle(post.title);
                        if (enableEventDate) {
                          setEventDate(post.eventDate ? post.eventDate.slice(0, 10) : "");
                        }
                        if (enableGallery) {
                          setGalleryItems((prev) => {
                            prev.forEach(revokeGalleryPreview);
                            return (post.galleryImages ?? []).map((url) => ({
                              id: createId(),
                              type: "existing",
                              url,
                            }));
                          });
                        }
                        if (post.bodyDelta) {
                          setBody(preserveLeadingSpaces(deltaToHtml(post.bodyDelta)));
                        } else if (post.bodyHtmlUrl) {
                          try {
                            setBody(
                              preserveLeadingSpaces(
                                await (await fetch(post.bodyHtmlUrl)).text()
                              )
                            );
                          } catch {
                            setBody(preserveLeadingSpaces(post.body || ""));
                          }
                        } else {
                          setBody(preserveLeadingSpaces(post.body || ""));
                        }
                        if (inputRef.current) inputRef.current.value = "";
                        if (galleryInputRef.current) galleryInputRef.current.value = "";
                      }}
                    >
                      編集
                    </button>
                  </div>
                </div>
              </div>
              {post.imageUrl && !isUnsafeImageSrc(post.imageUrl) && (
                <Image
                  src={post.imageUrl}
                  alt=""
                  width={800}
                  height={600}
                  className="mb-2 w-full h-auto rounded"
                />
              )}
              {enableGallery && post.galleryImages && post.galleryImages.length > 0 && (
                <div className="mt-2 flex gap-2 overflow-x-auto">
                  {post.galleryImages.map((url, i) =>
                    isUnsafeImageSrc(url) ? null : (
                      <div
                        key={`${post.id}-gallery-${i}`}
                        className="relative w-24 h-16 flex-shrink-0 rounded overflow-hidden"
                      >
                        <Image src={url} alt="" fill className="object-cover" />
                      </div>
                    )
                  )}
                </div>
              )}
              <div
                className="text-sm"
                dangerouslySetInnerHTML={{
                  __html: stripBlobImages(post.body || ""),
                }}
              />
            </div>
          );
        })}
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
