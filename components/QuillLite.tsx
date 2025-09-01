"use client";

import { useEffect, useMemo, useRef } from "react";
import type QuillType from "quill";
import type { QuillOptionsStatic } from "quill";
import { uploadImage } from "@/lib/uploadImage";

type Props = {
  value: string;
  onChange: (html: string) => void;
  eventId: string;
};

export default function QuillLite({ value, onChange, eventId }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<QuillType | null>(null);

  const toolbar = useMemo(
    () => [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline"],
      [{ list: "ordered" }, { list: "bullet" }],
      ["link", "image"],
      ["clean"],
    ],
    []
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      type QuillConstructor = new (
        element: HTMLElement,
        options?: QuillOptionsStatic
      ) => QuillType;
      const Quill = (await import("quill")).default as unknown as QuillConstructor;
      if (!mounted || !containerRef.current) return;

      const editor = new Quill(containerRef.current, {
        theme: "snow",
        modules: {
          toolbar: {
            container: toolbar,
            handlers: {
              image: async function handleImage() {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "image/*";
                input.onchange = async () => {
                  const file = input.files?.[0];
                  if (!file) return;
                  const ts = Date.now();
                  const safe = file.name.replace(/[^\w.\-]+/g, "_");
                  const path = `images/events/${eventId}/greeting/${ts}_${safe}`;
                  try {
                    const url = await uploadImage(file, path);
                    const range = editor.getSelection(true);
                    editor.insertEmbed(range?.index ?? 0, "image", url, "user");
                    editor.setSelection((range?.index ?? 0) + 1, 0);
                  } catch (e) {
                    console.error("image insert failed", e);
                    alert("画像のアップロードに失敗しました。");
                  }
                };
                input.click();
              },
            },
          },
        },
      });

      quillRef.current = editor;

      if (value) {
        editor.clipboard.dangerouslyPasteHTML(value);
      }

      editor.on("text-change", () => {
        const html = editor.root.innerHTML;
        onChange(html);
      });
    })();

    return () => {
      mounted = false;
      quillRef.current = null;
    };
  }, [eventId, onChange, toolbar, value]);

  return (
    <div className="quill-lite">
      <div ref={containerRef} />
    </div>
  );
}

