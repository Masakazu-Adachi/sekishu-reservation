"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
} from "firebase/firestore";
import { updateParticipantCount } from "@/lib/updateParticipantCount";
import { updateSeatReservedCount } from "@/lib/updateSeatReservedCount";
import type { Reservation, Seat } from "@/types";

export default function ReservationConfirmPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);

  const searchReservation = async () => {
    setLoading(true);
    const q = query(
      collection(db, "reservations"),
      where("email", "==", email),
      where("password", "==", password)
    );
    const snapshot = await getDocs(q);
    const results = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Reservation[];
    setReservations(results);
    setLoading(false);
  };

  const updateReservation = async (
    id: string,
    updatedData: { eventId: string; guests: number }
  ) => {
    const reservationRef = doc(db, "reservations", id);
    const reservationSnap = await getDoc(reservationRef);
    if (!reservationSnap.exists()) return alert("予約が見つかりません");

    const original = reservationSnap.data();
    const eventRef = doc(db, "events", updatedData.eventId);
    const eventSnap = await getDoc(eventRef);
    if (!eventSnap.exists()) return alert("イベントが見つかりません");

    const event = eventSnap.data();
    const seat = (event.seats as Seat[]).find(
      (s) => s.time === original.seatTime
    );
    if (!seat) return alert("時間枠が無効です");

    const reservationSnapshot = await getDocs(
      query(
        collection(db, "reservations"),
        where("eventId", "==", updatedData.eventId),
        where("seatTime", "==", original.seatTime)
      )
    );

    const reservedCount = reservationSnapshot.docs.reduce((sum, doc) => {
      if (doc.id === id) return sum; // 自分の予約は除外
      return sum + (doc.data().guests || 0);
    }, 0);

    const totalAfterUpdate = reservedCount + (updatedData.guests || 0);
    if (totalAfterUpdate > seat.capacity) {
      return alert(`定員（${seat.capacity}名）を超えています。現在の合計: ${totalAfterUpdate}名`);
    }

    await updateDoc(reservationRef, updatedData);
    await updateParticipantCount(updatedData.eventId);
    await updateSeatReservedCount(updatedData.eventId);
    alert("予約内容を更新しました");
    searchReservation();
  };

  const deleteReservation = async (id: string, eventId: string) => {
    const ref = doc(db, "reservations", id);
    await deleteDoc(ref);
    await updateParticipantCount(eventId);
    await updateSeatReservedCount(eventId);
    alert("予約をキャンセルしました");
    searchReservation();
  };

  return (
    <main className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">予約確認・編集</h1>
      <div className="space-y-2 mb-6">
        <input
          type="email"
          placeholder="メールアドレス"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border p-2 w-full"
        />
        <input
          type="text"
          placeholder="予約時のパスワード"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border p-2 w-full"
        />
        <button
          onClick={searchReservation}
          className="bg-blue-600 text-white px-4 py-2 rounded w-full"
        >
          検索
        </button>
      </div>

      {loading && <p>検索中...</p>}

      {reservations.map((r) => (
        <div key={r.id} className="border p-4 mb-4">
          <p>イベントID: {r.eventId}</p>
          <p>時間枠: {r.seatTime}</p>
          <p>人数: {r.guests}</p>
          <input
            type="number"
            min={1}
            value={r.guests}
            onChange={(e) =>
              setReservations((prev) =>
                prev.map((item) =>
                  item.id === r.id
                    ? { ...item, guests: Number(e.target.value) }
                    : item
                )
              )
            }
            className="border p-1 my-2"
          />
          <button
            className="bg-green-600 text-white px-3 py-1 mr-2 rounded"
            onClick={() =>
              updateReservation(r.id, {
                guests: r.guests,
                eventId: r.eventId,
              })
            }
          >
            更新
          </button>
          <button
            className="bg-red-600 text-white px-3 py-1 rounded"
            onClick={() => deleteReservation(r.id, r.eventId)}
          >
            予約をキャンセル
          </button>
        </div>
      ))}
    </main>
  );
}
