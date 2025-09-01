"use client";

import { useEffect, useMemo, useRef } from "react";
import type QuillType from "quill";
// テーマCSSはグローバルに読み込まれているためここでは未インポート
import { uploadImage } from "@/lib/uploadImage";

type Props = {
  value: string;
  onChange: (html: string) => void;
  eventId: string;
};

export default function QuillLite({ value, onChange, eventId }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<QuillType | null>(null);
  const onChangeRef = useRef(onChange);
  const initialAppliedRef = useRef(false);

  // onChange は ref 経由で最新を参照（effectを再走らせない）
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // ツールバー定義（安定化のため useMemo。依存は空配列）
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

  // 初期化は一度だけ。value/onChange を依存に入れない
  useEffect(() => {
    if (!containerRef.current) return;
    if (quillRef.current) return; // 既に初期化済みなら何もしない

    (async () => {
      const Quill = (await import("quill")).default as unknown as typeof import("quill");
      // 念のため空にしてから初期化（増殖防止）
      containerRef.current!.innerHTML = "";

      const editor = new Quill(containerRef.current!, {
        theme: "snow",
        modules: {
          toolbar: {
            container: toolbar,
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

      // 初期値は一度だけ反映
      if (value && !initialAppliedRef.current) {
        editor.clipboard.dangerouslyPasteHTML(value);
        initialAppliedRef.current = true;
      }

      // text-change は1回だけ登録。最新の onChange は ref から読む
      editor.on("text-change", () => {
        const html = editor.root.innerHTML;
        onChangeRef.current(html);
      });
    })();
    // 依存は空配列（=1度だけ）。StrictMode 下でも quillRef ガードで多重初期化を抑止
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- ★ここを [] にするのが肝

  // 外部から value が変わった時だけ（かつエディタが非フォーカス時）同期
  useEffect(() => {
    const editor = quillRef.current;
    if (!editor) return;

    // 初期適用がまだならここで一度だけ適用
    if (value && !initialAppliedRef.current) {
      editor.clipboard.dangerouslyPasteHTML(value);
      initialAppliedRef.current = true;
      return;
    }

    // エディタ未フォーカス時のみ同期（編集中の上書きを避ける）
    const focused = editor.hasFocus ? editor.hasFocus() : document.activeElement === editor.root;
    const current = editor.root.innerHTML;
    if (!focused && value != null && value !== current) {
      editor.root.innerHTML = value;
    }
  }, [value]);

  return <div ref={containerRef} />;
}

