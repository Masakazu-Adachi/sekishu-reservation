"use client";

import { useEffect, useState } from "react";
import LinkBackToAdmin2Top from "@/components/LinkBackToAdmin2Top";
import RichTextEditor from "@/components/RichTextEditor";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { preserveLeadingSpaces } from "@/lib/preserveLeadingSpaces";

export default function GreetingPage() {
  const [html, setHtml] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

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

  const handleSave = async () => {
    try {
      await setDoc(
        doc(db, "settings", "publicSite"),
        { greetingHtml: preserveLeadingSpaces(html) },
        { merge: true }
      );
      showToast("ごあいさつを保存しました！");
    } catch (err) {
      console.error(err);
      showToast("保存に失敗しました");
    }
  };

  return (
    <main className="p-6 max-w-xl mx-auto">
      <LinkBackToAdmin2Top />
      <h1 className="text-2xl font-bold mb-4">ごあいさつ設定</h1>
      <RichTextEditor value={html} onChange={setHtml} />
      <button
        onClick={handleSave}
        className="mt-4 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded"
      >
        保存
      </button>
      {toast && (
        <div className="fixed bottom-4 right-4 bg-black text-white px-4 py-2 rounded">
          {toast}
        </div>
      )}
    </main>
  );
}
