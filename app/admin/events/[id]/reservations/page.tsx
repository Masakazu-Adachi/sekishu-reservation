"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  getDoc,
  query,
  where,
} from "firebase/firestore";
import LinkBackToAdminTop from "@/components/LinkBackToAdminTop";
import { updateParticipantCount } from "@/lib/updateParticipantCount";
import { updateSeatReservedCount } from "@/lib/updateSeatReservedCount";
import type { Seat, Reservation } from "@/types";


export default function EventReservationsPage() {
  const params = useParams();
  const eventId = params?.id as string;
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    guests: 1,
    seatTime: "",
    address: "",
  });
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const snapshot = await getDocs(collection(db, "reservations"));
      const filtered = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() })) as Reservation[];
      const byEvent = filtered.filter((res) => res.eventId === eventId);
      setReservations(byEvent);

      const eventRef = doc(db, "events", eventId);
      const eventSnap = await getDoc(eventRef);
      if (eventSnap.exists()) {
        const data = eventSnap.data();
        if (data && data.seats) {
          const times = (data.seats as Seat[]).map((seat) => seat.time);
          setAvailableTimes(times);
        }
      }
    };
    fetchData();
  }, [eventId]);

  const handleDelete = async (id: string) => {
    const confirmDelete = confirm("この予約をキャンセルしてもよろしいですか？");
    if (!confirmDelete) return;
    await deleteDoc(doc(db, "reservations", id));
    await updateParticipantCount(eventId);
    await updateSeatReservedCount(eventId);
    setReservations(reservations.filter((r) => r.id !== id));
  };

  const handleEditSubmit = async () => {
    if (!editingId) return;
    const reservationRef = doc(db, "reservations", editingId);
    const reservationSnap = await getDoc(reservationRef);
    if (!reservationSnap.exists()) return alert("予約が見つかりません");

    const eventRef = doc(db, "events", eventId);
    const eventSnap = await getDoc(eventRef);
    if (!eventSnap.exists()) return alert("イベントが見つかりません");

    const event = eventSnap.data();
    const seat = (event.seats as Seat[]).find(
      (s) => s.time === editForm.seatTime
    );
    if (!seat) return alert("時間枠が無効です");

    const reservationSnapshot = await getDocs(
      query(
        collection(db, "reservations"),
        where("eventId", "==", eventId),
        where("seatTime", "==", editForm.seatTime)
      )
    );

    const reservedCount = reservationSnapshot.docs.reduce((sum, doc) => {
      if (doc.id === editingId) return sum;
      return sum + (doc.data().guests || 0);
    }, 0);

    const totalAfterUpdate = reservedCount + (editForm.guests || 0);
    if (totalAfterUpdate > seat.capacity) {
      return alert(`定員（${seat.capacity}名）を超えています。現在の合計: ${totalAfterUpdate}名`);
    }

    await updateDoc(reservationRef, editForm);
    await updateParticipantCount(eventId);
    await updateSeatReservedCount(eventId);
    alert("予約を更新しました");
    setEditingId(null);
    setEditForm({ name: "", guests: 1, seatTime: "", address: "" });

    const snapshot = await getDocs(collection(db, "reservations"));
    const refreshed = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Reservation[];
    setReservations(refreshed.filter((res) => res.eventId === eventId));
  };

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <LinkBackToAdminTop />
      <h1 className="text-2xl font-bold mb-4">予約者一覧</h1>
      {reservations.length === 0 ? (
        <p>まだ予約がありません。</p>
      ) : (
        <ul className="space-y-4">
          {reservations.map((res) => (
            <li
              key={res.id}
              className="border p-4 rounded shadow-md bg-white flex flex-col gap-2"
            >
              {editingId === res.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="border p-2 w-full"
                    placeholder="名前"
                  />
                  <input
                    type="number"
                    value={editForm.guests}
                    onChange={(e) => setEditForm({ ...editForm, guests: Number(e.target.value) })}
                    className="border p-2 w-full"
                    placeholder="人数"
                    min={1}
                  />
                  <select
                    value={editForm.seatTime}
                    onChange={(e) => setEditForm({ ...editForm, seatTime: e.target.value })}
                    className="border p-2 w-full"
                  >
                    <option value="">時間を選択</option>
                    {availableTimes.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={editForm.address}
                    onChange={(e) =>
                      setEditForm({ ...editForm, address: e.target.value })
                    }
                    className="border p-2 w-full"
                    placeholder="住所(任意)"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleEditSubmit}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded"
                    >
                      保存
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1 text-sm bg-gray-400 text-white rounded"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full">
                  <div>
                    <p className="font-semibold">
                      👤 {res.name}（{res.guests}名）
                    </p>
                    <p className="text-sm text-gray-500">時間枠: {res.seatTime}</p>
                    <p className="text-sm text-gray-500">
                      住所: {res.address || "(未入力)"}
                    </p>
                  </div>
                  <div className="flex gap-2 mt-2 sm:mt-0">
                    <button
                      onClick={() => {
                        setEditingId(res.id);
                        setEditForm({
                          name: res.name,
                          guests: res.guests,
                          seatTime: res.seatTime,
                          address: res.address || "",
                        });
                      }}
                      className="px-3 py-1 text-sm bg-yellow-400 text-white rounded"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDelete(res.id)}
                      className="px-3 py-1 text-sm bg-red-500 text-white rounded"
                    >
                      予約をキャンセル
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
