"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  Timestamp,
  collection,
  getDocs,
  query,
  where,
  writeBatch,
  addDoc,
} from "firebase/firestore";


const timeOptions = Array.from({ length: 22 }, (_, i) => {
  const hour = Math.floor(i / 2) + 8;
  const minute = i % 2 === 0 ? "00" : "30";
  return `${String(hour).padStart(2, "0")}:${minute}`;
});

const capacityOptions = Array.from({ length: 30 }, (_, i) => i + 1);

export default function EditEventPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [form, setForm] = useState({
    title: "",
    venue: "",
    date: "",
    cost: 0,
    description: "",
    seats: [{ time: "", capacity: 1, reserved: 0 }],
  });
  const router = useRouter();

  useEffect(() => {
    if (eventId === "new") return;
    const fetchEvent = async () => {
      const docRef = doc(db, "events", eventId);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        setForm({
          title: data.title,
          venue: data.venue,
          date: data.date.toDate().toISOString().split("T")[0],
          cost: data.cost,
          description: data.description,
          seats: data.seats,
        });
      }
    };
    fetchEvent();
  }, [eventId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    index?: number
  ) => {
    const { name, value } = e.target;
    if (typeof index === "number") {
      const updatedSeats = [...form.seats];
      if (name === "time" || name === "capacity") {
        updatedSeats[index] = {
          ...updatedSeats[index],
          [name]: name === "capacity" ? Number(value) : value,
        };
      }
      setForm({ ...form, seats: updatedSeats });
    } else {
      setForm({ ...form, [name]: name === "cost" ? Number(value) : value });
    }
  };

  const addSeat = () => {
    setForm({ ...form, seats: [...form.seats, { time: "", capacity: 1, reserved: 0 }] });
  };

  const removeSeat = (index: number) => {
    const updatedSeats = [...form.seats];
    updatedSeats.splice(index, 1);
    setForm({ ...form, seats: updatedSeats });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const eventData = {
      ...form,
      cost: Number(form.cost),
      date: Timestamp.fromDate(new Date(form.date)),
      seats: form.seats.map((seat) => ({
        time: seat.time,
        capacity: Number(seat.capacity),
        reserved: 0,
      })),
    };

    if (eventId === "new") {
      await addDoc(collection(db, "events"), eventData);
      alert("新しいイベントを作成しました");
    } else {
      const docRef = doc(db, "events", eventId);
      await updateDoc(docRef, eventData);
      alert("イベントを更新しました");
    }

    router.push("/admin/events");
  };

  const handleDelete = async () => {
    const confirmDelete = confirm("本当にこのイベントを削除しますか？");
    if (!confirmDelete) return;

    const eventRef = doc(db, "events", eventId);
    const q = query(collection(db, "reservations"), where("eventId", "==", eventId));
    const snapshot = await getDocs(q);

    const batch = writeBatch(db);
    snapshot.forEach((doc) => batch.delete(doc.ref));
    batch.delete(eventRef);

    await batch.commit();

    alert("イベントと関連する予約をすべて削除しました");
    router.push("/admin/events");
  };

  return (
    <main className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">イベント 作成/編集</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1">お茶会名</label>
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="例：春のお茶会"
            className="border p-2 w-full"
            required
          />
        </div>
        <div>
          <label className="block mb-1">会場</label>
          <input
            type="text"
            name="venue"
            value={form.venue}
            onChange={handleChange}
            placeholder="例：東京会場"
            className="border p-2 w-full"
            required
          />
        </div>
        <div>
          <label className="block mb-1">日付</label>
          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            className="border p-2 w-full"
            required
          />
        </div>
        <div>
          <label className="block mb-1">会費 (円)</label>
          <input
            type="number"
            name="cost"
            value={form.cost}
            onChange={handleChange}
            placeholder="0"
            min="0"
            step="100"
            className="border p-2 w-full"
            required
          />
        </div>
        <div>
          <label className="block mb-1">備考</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="補足情報や説明を入力してください"
            className="border p-2 w-full"
            rows={3}
            required
          />
        </div>

        <div className="space-y-2">
          <p className="font-semibold">時間枠と定員（複数設定可）</p>
          {form.seats.map((seat, i) => (
            <div key={i} className="flex gap-2 items-center">
              <select
                name="time"
                value={seat.time}
                onChange={(e) => handleChange(e, i)}
                className="border p-2 w-full"
                required
              >
                <option value="">開始時間を選択</option>
                {timeOptions.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
              <select
                name="capacity"
                value={seat.capacity}
                onChange={(e) => handleChange(e, i)}
                className="border p-2 w-full"
                required
              >
                <option value="">定員を選択</option>
                {capacityOptions.map((num) => (
                  <option key={num} value={num}>
                    {num}名
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeSeat(i)}
                className="text-red-500 text-sm"
              >
                削除
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addSeat}
            className="bg-gray-200 px-3 py-1 rounded"
          >
            枠を追加
          </button>
        </div>

        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded w-full"
        >
          保存する
        </button>

        <button
          type="button"
          onClick={handleDelete}
          className="bg-red-500 text-white px-4 py-2 rounded w-full mt-2"
        >
          イベントを削除
        </button>
      </form>
    </main>
  );
}
