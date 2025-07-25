"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { db, storage } from "@/lib/firebase";
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
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

import type { Seat } from "@/types";


const hourOptions = Array.from({ length: 24 }, (_, i) =>
  String(i).padStart(2, "0")
);
const minuteOptions = ["00", "10", "20", "30", "40", "50"];
const TENTATIVE_LABEL = "仮予約";

const capacityOptions = Array.from({ length: 200 }, (_, i) => i + 1);
const costOptions = Array.from({ length: 101 }, (_, i) => i * 100);

interface EventForm {
  title: string;
  venue: string;
  date: string;
  cost: number;
  description: string;
  seats: Seat[];
  imageUrl: string;
}

export default function EditEventPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [form, setForm] = useState<EventForm>({
    title: "",
    venue: "",
    date: "",
    cost: 0,
    description: "",
    seats: [],
    imageUrl: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
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
          imageUrl: data.imageUrl || "",
        });
        setPreviewUrl(data.imageUrl || "");
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
      const seat = { ...updatedSeats[index] };
      if (name === "seatType") {
        seat.time = value === "tentative" ? TENTATIVE_LABEL : "08:00";
      }
      if (name === "hour") {
        const minute = seat.time.includes(":") ? seat.time.split(":")[1] : "00";
        seat.time = `${value}:${minute}`;
      }
      if (name === "minute") {
        const hour = seat.time.includes(":") ? seat.time.split(":")[0] : "08";
        seat.time = `${hour}:${value}`;
      }
      if (name === "capacity") {
        seat.capacity = Number(value);
      }
      updatedSeats[index] = seat;
      setForm({ ...form, seats: updatedSeats });
    } else {
      setForm({ ...form, [name]: name === "cost" ? Number(value) : value });
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const sortSeats = (seats: Seat[]) =>
    [...seats].sort((a, b) => {
      if (a.time === TENTATIVE_LABEL) return 1;
      if (b.time === TENTATIVE_LABEL) return -1;
      return a.time.localeCompare(b.time);
    });

  const addSeat = () => {
    setForm({
      ...form,
      seats: sortSeats([
        ...form.seats,
        { time: "08:00", capacity: 1, reserved: 0 },
      ]),
    });
  };

  const removeSeat = (index: number) => {
    const updatedSeats = [...form.seats];
    updatedSeats.splice(index, 1);
    setForm({ ...form, seats: updatedSeats });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let imageUrl = form.imageUrl;
    if (imageFile) {
      const storageRef = ref(storage, `event-images/${imageFile.name}`);
      await uploadBytes(storageRef, imageFile);
      imageUrl = await getDownloadURL(storageRef);
    }

    const eventData = {
      ...form,
      imageUrl,
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
          <select
            name="cost"
            value={form.cost}
            onChange={handleChange}
            className="border p-2 w-full"
            required
          >
            {costOptions.map((c) => (
              <option key={c} value={c}>
                {c}円
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block mb-1">イベント画像</label>
          {previewUrl && (
            <img src={previewUrl} alt="preview" className="w-full mb-2 rounded" />
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handleImageFileChange}
            className="border p-2 w-full"
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
          {form.seats.map((seat, i) => {
            const [h, m] = seat.time.includes(":") ? seat.time.split(":") : ["08", "00"];
            const seatType = seat.time === TENTATIVE_LABEL ? "tentative" : "time";
            return (
              <div key={i} className="flex gap-2 items-center">
                <select
                  name="seatType"
                  value={seatType}
                  onChange={(e) => handleChange(e, i)}
                  className="border p-2"
                >
                  <option value="time">時間指定</option>
                  <option value="tentative">仮予約</option>
                </select>
                {seatType === "time" && (
                  <>
                    <select
                      name="hour"
                      value={h}
                      onChange={(e) => handleChange(e, i)}
                      className="border p-2"
                    >
                      {hourOptions.map((hr) => (
                        <option key={hr} value={hr}>
                          {hr}
                        </option>
                      ))}
                    </select>
                    <select
                      name="minute"
                      value={m}
                      onChange={(e) => handleChange(e, i)}
                      className="border p-2"
                    >
                      {minuteOptions.map((mi) => (
                        <option key={mi} value={mi}>
                          {mi}
                        </option>
                      ))}
                    </select>
                  </>
                )}
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
            );
          })}
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
