"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  addDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { nanoid } from "nanoid";
import { updateParticipantCount } from "@/lib/updateParticipantCount";
import { updateSeatReservedCount } from "@/lib/updateSeatReservedCount";


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
    if (!seat) {
      alert("選択された時間枠が無効です");
      return;
    }

    const reservationSnapshot = await getDocs(
      query(
        collection(db, "reservations"),
        where("eventId", "==", event.id),
        where("seatTime", "==", selectedTime)
      )
    );
    const reservedCount = reservationSnapshot.docs.reduce(
      (total, doc) => total + (doc.data().guests || 0),
      0
    );

    if (reservedCount + guests > seat.capacity) {
      alert(`定員(${seat.capacity}名)を超えています。現在の合計: ${reservedCount + guests}名`);
      return;
    }

    const duplicateCheck = await getDocs(
      query(
        collection(db, "reservations"),
        where("eventId", "==", event.id),
        where("email", "==", email)
      )
    );
    if (!duplicateCheck.empty) {
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

    await updateSeatReservedCount(event.id);
    await updateParticipantCount(event.id);

    await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: email,
        subject: `${event.title} のご予約完了通知`,
        html: `
          <p>${name}様</p>
          <p>以下の内容でご予約を承りました。</p>
          <ul>
            <li>会場: ${event.venue}</li>
            <li>日付: ${event.date.toDate().toLocaleDateString("ja-JP")}</li>
            <li>時間: ${selectedTime}</li>
            <li>人数: ${guests}名</li>
          </ul>
          <p>予約内容の確認・変更には下記の情報をご利用ください。</p>
          <p><strong>予約時メールアドレス:</strong> ${email}<br/>
          <strong>パスワード:</strong> ${password}</p>
        `,
      }),
    });

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
