"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export default function AdminNotificationEmails() {
  const [emails, setEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchEmails = async () => {
      const snap = await getDoc(doc(db, "settings", "notificationEmails"));
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data.emails)) {
          setEmails(data.emails);
        }
      }
    };
    fetchEmails();
  }, []);

  const handleAdd = () => {
    const email = newEmail.trim();
    if (!email) return;
    setEmails((prev) => [...prev, email]);
    setNewEmail("");
  };

  const handleRemove = (index: number) => {
    setEmails((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(
        doc(db, "settings", "notificationEmails"),
        { emails },
        { merge: true }
      );
      alert("保存しました");
    } catch (err) {
      console.error(err);
      alert("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">通知メールアドレス管理</h1>
      <div className="mb-4 flex gap-2">
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="メールアドレスを入力"
          className="flex-1 border p-2 rounded"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          追加
        </button>
      </div>
      <ul className="mb-4">
        {emails.map((email, idx) => (
          <li key={idx} className="flex items-center justify-between border p-2 mb-2 rounded">
            <span>{email}</span>
            <button
              type="button"
              onClick={() => handleRemove(idx)}
              className="text-red-600"
            >
              削除
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {saving ? "保存中..." : "保存"}
      </button>
    </div>
  );
}

