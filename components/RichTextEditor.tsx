"use client";

import "@/app/react-dom-finddomnode-polyfill";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import "react-quill/dist/quill.snow.css";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ReactQuill = dynamic(() => import("react-quill").then(m => m.default), { ssr: false }) as any;

export default function RichTextEditor({ value, onChange }: Props) {
  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          ["bold", "italic", "underline"],
          [{ align: [] }],
          ["link"],
        ],
      },
      clipboard: { matchVisual: false },
    }),
    []
  );

  const formats = useMemo(() => ["bold", "italic", "underline", "align", "link"], []);

  return <ReactQuill value={value} onChange={onChange} modules={modules} formats={formats} />;
}
