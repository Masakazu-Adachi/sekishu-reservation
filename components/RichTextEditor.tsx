"use client";

import "@/app/react-dom-finddomnode-polyfill";
import { useRef } from "react";
import dynamic from "next/dynamic";
import type ReactQuillType from "react-quill";
import "react-quill/dist/quill.snow.css";
import { uploadImageToStorage } from "@/lib/storageImages";
import { validateImage } from "@/lib/validateImage";

interface Props {
  value: string;
  onChange: (value: string) => void;
  storagePath: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ReactQuill = dynamic(() => import("react-quill").then(m => m.default), { ssr: false }) as any;

export default function RichTextEditor({ value, onChange, storagePath }: Props) {
  const quillRef = useRef<ReactQuillType | null>(null);

  const modules = {
    toolbar: {
      container: [
        ["bold", "italic", "underline"],
        [{ align: [] }],
        ["link", "image"],
        ["clean"],
      ],
      handlers: {
        image: () => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = "image/*";
          input.onchange = async () => {
            const file = input.files?.[0];
            if (!file || !validateImage(file)) return;
            try {
              const { url } = await uploadImageToStorage(file, storagePath, { uploadedBy: "admin" });
              const editor = quillRef.current?.getEditor();
              if (editor) {
                const range = editor.getSelection(true) ?? { index: editor.getLength(), length: 0 };
                editor.insertEmbed(range.index, "image", url, "user");
                editor.setSelection(range.index + 1, 0, "user");
              }
            } catch {
              alert("画像のアップロードに失敗しました");
            }
          };
          input.click();
        },
      },
    },
    clipboard: { matchVisual: false },
  };

  const formats = ["bold", "italic", "underline", "align", "link", "image"];

  return <ReactQuill ref={quillRef} value={value} onChange={onChange} modules={modules} formats={formats} />;
}

