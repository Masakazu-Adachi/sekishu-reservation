"use client";

import { useMemo } from "react";
import QuillClientEditor from "@/components/QuillClientEditor";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

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

  return <QuillClientEditor value={value} onChange={onChange} modules={modules} formats={formats} />;
}
