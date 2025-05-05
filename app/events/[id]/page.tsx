"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  addDoc,
  collection,
  updateDoc,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { nanoid } from "nanoid";
import { updateGuestCount } from "@/lib/updateGuestCount"; // ← 追加

export default function EventDetailPage() {
  const { id } = useParams();
  const [event, setEvent] = useState<any | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [guests, setGuests] = useState(1);
  const [selectedTime, setSelectedTime] = useState("");

  useEffect(() => {
    const fetchEvent = async () => {
      if (!id) return;
      const docRef = doc(db, "events", id as string);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        setEvent({ id: snapshot.id, ...snapshot.data() });
      }
    };
    fetchEvent();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event || !selectedTime) return;

    const seat = event.seats.find((s: any) => s.time === selectedTime);
    if (!seat || (seat.reserved || 0) + guests > seat.capacity) {
      alert("この枠は満席です");
      return;
    }

    const q = query(
      collection(db, "reservations"),
      where("eventId", "==", event.id),
      where("email", "==", email)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      alert("このメールアドレスでは既に予約済みです");
      return;
    }

    const password = nanoid(8);

    await addDoc(collection(db, "reservations"), {
      name,
      email,
      guests,
      eventId: event.id,
      seatTime: selectedTime,
      password,
      createdAt: new Date().toISOString(),
    });

    const updatedSeats = event.seats.map((s: any) =>
      s.time === selectedTime
        ? { ...s, reserved: (s.reserved || 0) + guests }
        : s
    );
    await updateDoc(doc(db, "events", event.id), { seats: updatedSeats });

    // ✅ 参加人数を更新
    await updateGuestCount(event.id);

    alert("予約が完了しました！確認メールをご確認ください。");
    setName("");
    setEmail("");
    setGuests(1);
    setSelectedTime("");
  };

  if (!event) return <p className="p-6">読み込み中...</p>;

  return (
    <main className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">{event.title}</h1>
      <p>会場: {event.venue}</p>
      <p>日付: {event.date.toDate().toLocaleDateString("ja-JP")}</p>
      <p className="mb-4">説明: {event.description}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1">お名前</label>
          <input
            type="text"
            className="border p-2 w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block mb-1">メールアドレス</label>
          <input
            type="email"
            className="border p-2 w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block mb-1">参加人数</label>
          <input
            type="number"
            className="border p-2 w-full"
            value={guests}
            min={1}
            max={10}
            onChange={(e) => setGuests(Number(e.target.value))}
            required
          />
        </div>
        <div>
          <label className="block mb-1">時間枠選択</label>
          <select
            className="border p-2 w-full"
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
            required
          >
            <option value="">時間を選択</option>
            {event.seats.map((seat: any) => (
              <option
                key={seat.time}
                value={seat.time}
                disabled={(seat.reserved || 0) >= seat.capacity}
              >
                {seat.time}（残り {seat.capacity - (seat.reserved || 0)} 名）
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded w-full"
        >
          予約する
        </button>
      </form>
    </main>
  );
}
