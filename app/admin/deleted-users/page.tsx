"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, doc, getDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

interface DeletedReservation {
  id: string;
  name: string;
  email: string;
  eventId: string;
  seatTime: string;
  guests: number;
  deletedAt: string;
}

export default function DeletedUserListPage() {
  const [reservations, setReservations] = useState<DeletedReservation[]>([]);
  const [eventTitles, setEventTitles] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchData = async () => {
      const snapshot = await getDocs(collection(db, "deletedReservations"));
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as DeletedReservation[];
      setReservations(data);

      const eventIds = Array.from(new Set(data.map((r) => r.eventId)));
      const titles: Record<string, string> = {};
      for (const id of eventIds) {
        const eventSnap = await getDoc(doc(db, "events", id));
        titles[id] = eventSnap.exists() ? eventSnap.data().title || "(不明なイベント)" : "(不明なイベント)";
      }
      setEventTitles(titles);
    };

    fetchData();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("この予約を完全に削除してもよろしいですか？")) return;

    try {
      await deleteDoc(doc(db, "deletedReservations", id));
      setReservations(reservations.filter((r) => r.id !== id));
    } catch (error) {
      console.error("完全削除エラー:", error);
      alert("削除に失敗しました");
    }
  };

  return (
    <main className="p-4 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">削除済み予約一覧</h1>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="border px-2 py-1">名前</th>
            <th className="border px-2 py-1">メール</th>
            <th className="border px-2 py-1">イベント</th>
            <th className="border px-2 py-1">時間/席</th>
            <th className="border px-2 py-1">人数</th>
            <th className="border px-2 py-1">削除日時</th>
            <th className="border px-2 py-1">操作</th>
          </tr>
        </thead>
        <tbody>
          {reservations.map((r) => (
            <tr key={r.id}>
              <td className="border px-2 py-1">{r.name}</td>
              <td className="border px-2 py-1">{r.email}</td>
              <td className="border px-2 py-1">{eventTitles[r.eventId] || ""}</td>
              <td className="border px-2 py-1">{r.seatTime}</td>
              <td className="border px-2 py-1 text-center">{r.guests}</td>
              <td className="border px-2 py-1">
                {format(new Date(r.deletedAt), "yyyy/M/d HH:mm:ss", { locale: ja })}
              </td>
              <td className="border px-2 py-1 text-center">
                <button
                  onClick={() => handleDelete(r.id)}
                  className="bg-red-500 text-white px-2 py-1 rounded text-sm"
                >
                  削除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
