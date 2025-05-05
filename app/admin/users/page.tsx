"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { format } from "date-fns";
import ja from "date-fns/locale/ja";

interface Reservation {
  id: string;
  name: string;
  guests: number;
  eventId: string;
  seatTime: string;
  createdAt: string;
}

export default function UserListPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [eventTitles, setEventTitles] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchData = async () => {
      const snapshot = await getDocs(collection(db, "reservations"));
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Reservation[];
      setReservations(data);

      const eventIds = Array.from(new Set(data.map((r) => r.eventId)));
      const titles: Record<string, string> = {};

      for (const id of eventIds) {
        const eventSnap = await getDoc(doc(db, "events", id));
        titles[id] = eventSnap.exists() ? eventSnap.data().title : "(不明なイベント)";
      }
      setEventTitles(titles);
    };

    fetchData();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("この予約を削除してもよろしいですか？")) return;

    try {
      const reservationRef = doc(db, "reservations", id);
      const reservationSnap = await getDoc(reservationRef);
      if (!reservationSnap.exists()) throw new Error("予約が存在しません");

      const { eventId, seatTime, guests } = reservationSnap.data();

      // イベントの該当枠からreserved数を減算
      const eventRef = doc(db, "events", eventId);
      const eventSnap = await getDoc(eventRef);
      if (eventSnap.exists()) {
        const eventData = eventSnap.data();
        const updatedSeats = eventData.seats.map((s: any) =>
          s.time === seatTime
            ? { ...s, reserved: Math.max((s.reserved || 0) - guests, 0) }
            : s
        );
        await updateDoc(eventRef, { seats: updatedSeats });
      }

      await deleteDoc(reservationRef);
      setReservations(reservations.filter((r) => r.id !== id));
    } catch (error) {
      console.error("削除エラー:", error);
      alert("削除に失敗しました");
    }
  };

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <Link href="/admin" className="text-blue-600 underline block mb-4">
        ← 管理ダッシュボードに戻る
      </Link>
      <h1 className="text-2xl font-bold mb-4">全ユーザー予約一覧</h1>

      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-2 py-1">名前</th>
            <th className="border px-2 py-1">人数</th>
            <th className="border px-2 py-1">イベント名</th>
            <th className="border px-2 py-1">時間枠</th>
            <th className="border px-2 py-1">予約日時</th>
            <th className="border px-2 py-1">操作</th>
          </tr>
        </thead>
        <tbody>
          {reservations.map((r) => (
            <tr key={r.id}>
              <td className="border px-2 py-1">{r.name}</td>
              <td className="border px-2 py-1">{r.guests}</td>
              <td className="border px-2 py-1">
                {eventTitles[r.eventId] || "(不明なイベント)"}
              </td>
              <td className="border px-2 py-1">{r.seatTime}</td>
              <td className="border px-2 py-1">
                {format(new Date(r.createdAt), "yyyy/M/d HH:mm:ss", { locale: ja })}
              </td>
              <td className="border px-2 py-1 flex gap-1">
                <Link
                  href={`/reservations/confirm?email=&password=`}
                  className="bg-blue-500 text-white px-2 py-1 rounded text-sm"
                >
                  編集
                </Link>
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
