"use client";

import "@/app/react-dom-finddomnode-polyfill";
import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import type ReactQuillType from "react-quill";
import "react-quill/dist/quill.snow.css";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { uploadImageToStorage } from "@/lib/storageImages";
import { validateImage } from "@/lib/validateImage";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ReactQuill = dynamic(() => import("react-quill").then(m => m.default), { ssr: false }) as any;

export default function AdminGreetingSettings() {
  const [html, setHtml] = useState("");
  const quillRef = useRef<ReactQuillType | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      let refDoc = doc(db, "settings", "publicSite");
      let snap = await getDoc(refDoc);
      if (!snap.exists()) {
        refDoc = doc(db, "settings", "site");
        snap = await getDoc(refDoc);
      }
      if (snap.exists()) {
        const data = snap.data();
        if (data.greetingHtml) {
          setHtml(data.greetingHtml as string);
        } else if (data.paragraphs) {
          setHtml((data.paragraphs as string[]).map(p => `<p>${p}</p>`).join(""));
        } else if (data.greetingLines) {
          setHtml((data.greetingLines as { text: string }[]).map(l => `<p>${l.text}</p>`).join(""));
        } else if (data.greetingText) {
          setHtml((data.greetingText as string).split("\n").map(t => `<p>${t}</p>`).join(""));
        }
      }
    };
    fetchData();
  }, []);

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
              const { url } = await uploadImageToStorage(file, "images/greeting-editor", { uploadedBy: "admin" });
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

  const handleSave = async () => {
    try {
      await setDoc(doc(db, "settings", "publicSite"), { greetingHtml: html }, { merge: true });
      alert("ごあいさつを保存しました！");
    } catch (err) {
      console.error(err);
      alert("保存に失敗しました");
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">ごあいさつ設定</h1>
      <ReactQuill ref={quillRef} value={html} onChange={setHtml} modules={modules} formats={formats} />
      <button
        onClick={handleSave}
        className="mt-4 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded"
      >
        保存
      </button>
    </div>
  );
}
