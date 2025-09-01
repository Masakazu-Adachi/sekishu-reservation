"use client";
import dynamic from "next/dynamic";
import { useMemo, useRef } from "react";
import { uploadImage } from "@/lib/uploadImage";
import type ReactQuillType from "react-quill";
const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

type Props = {
  value: string;
  onChange: (html: string) => void;
  eventId: string;
};

export default function GreetingEditor({ value, onChange, eventId }: Props) {
  const quillRef = useRef<ReactQuillType | null>(null);

  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ header: [1, 2, 3, false] }],
          ["bold", "italic", "underline"],
          [{ list: "ordered" }, { list: "bullet" }],
          ["link", "image"],
          ["clean"],
        ],
        handlers: {
          image: async () => {
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
                const editor = quillRef.current?.getEditor();
                if (!editor) return;
                const range = editor.getSelection(true);
                editor.insertEmbed(range.index, "image", url, "user");
                editor.setSelection(range.index + 1, 0);
              } catch (e) {
                console.error("image insert failed", e);
                alert("画像のアップロードに失敗しました。");
              }
            };
            input.click();
          },
        },
      },
    }),
    [eventId]
  );

  return (
    <ReactQuill
      // @ts-expect-error ReactQuill supports ref
      ref={quillRef}
      theme="snow"
      value={value}
      onChange={onChange}
      modules={modules}
    />
  );
}
