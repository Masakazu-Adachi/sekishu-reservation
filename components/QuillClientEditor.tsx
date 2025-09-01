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
      const handleChange = (delta: Delta, _old: Delta, source: string) => {
        onChange?.(quill!.root.innerHTML, delta, source, quill!);
      };
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
        quill.on("text-change", handleChange);
        if (mounted) editorRef.current = quill;
      })();
      return () => {
        mounted = false;
        if (quill) {
          quill.off("text-change", handleChange);
          editorRef.current = null;
          quill = null;
        }
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      const quill = editorRef.current;
      if (!quill) return;
      const currentRange = quill.getSelection();
      if (!value) {
        quill.setContents([] as unknown as Delta);
        if (currentRange) quill.setSelection(currentRange);
        return;
      }
      if (typeof value === "string") {
        if (quill.root.innerHTML !== value) {
          quill.clipboard.dangerouslyPasteHTML(value);
          if (currentRange) quill.setSelection(currentRange);
        }
      } else {
        const current = quill.getContents();
        if (JSON.stringify(current.ops) !== JSON.stringify((value as Delta).ops)) {
          quill.setContents(value as Delta);
          if (currentRange) quill.setSelection(currentRange);
        }
      }
    }, [value]);

    return <div className={className}><div ref={containerRef} /></div>;
  }
);

export default QuillClientEditor;
