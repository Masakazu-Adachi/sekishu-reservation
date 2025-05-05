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
} from "firebase/firestore";
import { updateGuestCount } from "@/lib/updateGuestCount";

export default function ReservationConfirmPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [reservations, setReservations] = useState<any[]>([]);
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
    }));
    setReservations(results);
    setLoading(false);
  };

  const updateReservation = async (id: string, updatedData: any) => {
    const ref = doc(db, "reservations", id);
    await updateDoc(ref, updatedData);
    await updateGuestCount(updatedData.eventId); // ✅ 人数更新
    alert("予約内容を更新しました");
    searchReservation(); // 再取得
  };

  const deleteReservation = async (id: string, eventId: string) => {
    const ref = doc(db, "reservations", id);
    await deleteDoc(ref);
    await updateGuestCount(eventId); // ✅ 人数更新
    alert("予約を削除しました");
    searchReservation(); // 再取得
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
            onClick={() => updateReservation(r.id, { guests: r.guests, eventId: r.eventId })}
          >
            更新
          </button>
          <button
            className="bg-red-600 text-white px-3 py-1 rounded"
            onClick={() => deleteReservation(r.id, r.eventId)}
          >
            削除
          </button>
        </div>
      ))}
    </main>
  );
}
