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
import { ja } from "date-fns/locale";
import { updateParticipantCount } from "@/lib/updateParticipantCount";
import { updateSeatReservedCount } from "@/lib/updateSeatReservedCount";
import type { Seat } from "@/types";

interface Reservation {
  id: string;
  name: string;
  email: string;
  guests: number;
  eventId: string;
  seatTime: string;
  createdAt: string;
}

export default function UserListPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [eventTitles, setEventTitles] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", guests: 1, seatTime: "" });
  const [eventSeatTimes, setEventSeatTimes] = useState<Record<string, string[]>>({});
  const [eventSeatMap, setEventSeatMap] = useState<Record<string, Seat[]>>({});

  useEffect(() => {
    const fetchData = async () => {
      const snapshot = await getDocs(collection(db, "reservations"));
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Reservation[];
      setReservations(data);

      const eventIds = Array.from(new Set(data.map((r) => r.eventId)));
      const titles: Record<string, string> = {};
      const seatTimes: Record<string, string[]> = {};
      const seatMap: Record<string, Seat[]> = {};

      for (const id of eventIds) {
        const eventSnap = await getDoc(doc(db, "events", id));
        if (eventSnap.exists()) {
          const data = eventSnap.data();
          titles[id] = data.title || "(不明なイベント)";
          const seats: Seat[] = data.seats || [];
          seatTimes[id] = seats.map((s: Seat) => s.time);
          seatMap[id] = seats;
        } else {
          titles[id] = "(不明なイベント)";
          seatTimes[id] = [];
          seatMap[id] = [];
        }
      }
      setEventTitles(titles);
      setEventSeatTimes(seatTimes);
      setEventSeatMap(seatMap);
    };

    fetchData();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("この予約を削除してもよろしいですか？")) return;

    try {
      const reservationRef = doc(db, "reservations", id);
      const reservationSnap = await getDoc(reservationRef);
      if (!reservationSnap.exists()) throw new Error("予約が存在しません");

      const data = reservationSnap.data();
      if (!data) throw new Error("予約データが不正です");
      const { eventId } = data;

      await deleteDoc(reservationRef);
      await updateParticipantCount(eventId);
      await updateSeatReservedCount(eventId);

      setReservations(reservations.filter((r) => r.id !== id));
    } catch (error) {
      console.error("削除エラー:", error);
      alert("削除に失敗しました");
    }
  };

  const handleEditSubmit = async () => {
    if (!editingId) return;
    const ref = doc(db, "reservations", editingId);
    const reservationSnap = await getDoc(ref);

    const data = reservationSnap.data();
    if (!data) {
      alert("予約データが見つかりません");
      return;
    }
    const { eventId } = data;

    const seats = eventSeatMap[eventId];
    const selectedSeat = seats.find((s: Seat) => s.time === editForm.seatTime);
    if (!selectedSeat) {
      alert("選択された時間枠が無効です");
      return;
    }

    const existingReservations = reservations.filter(
      (r) => r.eventId === eventId && r.seatTime === editForm.seatTime && r.id !== editingId
    );
    const reservedSum = existingReservations.reduce((sum, r) => sum + r.guests, 0);
    const totalGuests = reservedSum + editForm.guests;

    if (totalGuests > selectedSeat.capacity) {
      alert(`定員(${selectedSeat.capacity}名)を超えています。現在の合計: ${totalGuests}名`);
      return;
    }

    await updateDoc(ref, editForm);
    await updateParticipantCount(eventId);
    await updateSeatReservedCount(eventId);
    setEditingId(null);
    setEditForm({ name: "", email: "", guests: 1, seatTime: "" });
    const updated = await getDocs(collection(db, "reservations"));
    const dataUpdated = updated.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Reservation[];
    setReservations(dataUpdated);
  };

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <Link href="/admin" className="text-blue-600 underline block mb-4">
        ← 管理ダッシュボードに戻る
      </Link>
      <h1 className="text-2xl font-bold mb-4">全ユーザー予約一覧</h1>

      <table className="w-full border text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-2 py-1">名前</th>
            <th className="border px-2 py-1">メールアドレス</th>
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
              <td className="border px-2 py-1">
                {editingId === r.id ? (
                  <input
                    className="border p-1 w-full"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                ) : (
                  r.name
                )}
              </td>
              <td className="border px-2 py-1">
                {editingId === r.id ? (
                  <input
                    className="border p-1 w-full"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  />
                ) : (
                  r.email
                )}
              </td>
              <td className="border px-2 py-1">
                {editingId === r.id ? (
                  <input
                    type="number"
                    className="border p-1 w-full"
                    value={editForm.guests}
                    onChange={(e) => setEditForm({ ...editForm, guests: Number(e.target.value) })}
                  />
                ) : (
                  r.guests
                )}
              </td>
              <td className="border px-2 py-1">{eventTitles[r.eventId] || "(不明なイベント)"}</td>
              <td className="border px-2 py-1">
                {editingId === r.id ? (
                  <select
                    className="border p-1 w-full"
                    value={editForm.seatTime}
                    onChange={(e) => setEditForm({ ...editForm, seatTime: e.target.value })}
                  >
                    <option value="">時間を選択</option>
                    {(eventSeatTimes[r.eventId] || []).map((time) => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                ) : (
                  r.seatTime
                )}
              </td>
              <td className="border px-2 py-1">
                {format(new Date(r.createdAt), "yyyy/M/d HH:mm:ss", { locale: ja })}
              </td>
              <td className="border px-2 py-1 flex gap-1">
                {editingId === r.id ? (
                  <>
                    <button
                      onClick={handleEditSubmit}
                      className="bg-green-600 text-white px-2 py-1 rounded text-sm"
                    >
                      保存
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="bg-gray-400 text-white px-2 py-1 rounded text-sm"
                    >
                      キャンセル
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setEditingId(r.id);
                        setEditForm({ name: r.name, email: r.email, guests: r.guests, seatTime: r.seatTime });
                      }}
                      className="bg-yellow-400 text-white px-2 py-1 rounded text-sm"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="bg-red-500 text-white px-2 py-1 rounded text-sm"
                    >
                      削除
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
