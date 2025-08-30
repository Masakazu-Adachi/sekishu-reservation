"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import type Quill from "quill";
import type { Delta } from "quill";

export interface QuillClientHandle {
  getEditor: () => Quill | null;
}

interface Props {
  value?: string | Delta;
  onChange?: (html: string, delta: Delta, source: string, editor: Quill) => void;
  modules?: Record<string, unknown>;
  formats?: string[];
  className?: string;
  placeholder?: string;
}
const QuillClientEditor = forwardRef<QuillClientHandle, Props>(function QuillClientEditor(
  { value, onChange, modules, formats, className, placeholder },
  ref
) {
    const containerRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<Quill | null>(null);

    useImperativeHandle(
      ref,
      () => ({
        getEditor: () => editorRef.current,
      }),
      []
    );

    useEffect(() => {
      let quill: Quill | null = null;
      let mounted = true;
      (async () => {
        const QuillMod = await import("quill");
        const QuillCtor = QuillMod.default as unknown as typeof Quill;
        quill = new QuillCtor(containerRef.current as HTMLDivElement, {
          theme: "snow",
          modules,
          formats,
          placeholder,
        });
        if (value) {
          if (typeof value === "string") {
            quill.clipboard.dangerouslyPasteHTML(value);
          } else {
            quill.setContents(value as Delta);
          }
        }
        quill.on("text-change", (delta, _old, source) => {
          onChange?.(quill!.root.innerHTML, delta, source, quill!);
        });
        if (mounted) editorRef.current = quill;
      })();
      return () => {
        mounted = false;
        if (quill) {
          quill.off("text-change");
          editorRef.current = null;
          quill = null;
        }
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      const quill = editorRef.current;
      if (!quill) return;
      if (!value) {
        quill.setContents([]);
        return;
      }
      if (typeof value === "string") {
        if (quill.root.innerHTML !== value) {
          quill.clipboard.dangerouslyPasteHTML(value);
        }
      } else {
        quill.setContents(value as Delta);
      }
    }, [value]);

    return <div className={className}><div ref={containerRef} /></div>;
  }
);

export default QuillClientEditor;
