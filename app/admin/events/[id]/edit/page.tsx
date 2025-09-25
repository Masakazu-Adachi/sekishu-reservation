"use client";

import { useEffect, useState, useRef } from "react";
import type { DragEvent } from "react";
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
  setDoc,
  deleteField,
} from "firebase/firestore";
import type { Seat } from "@/types";
import QuillLite from "@/components/QuillLite";
import { preserveLeadingSpaces } from "@/lib/preserveLeadingSpaces";

const hourOptions = Array.from({ length: 24 }, (_, i) =>
  String(i).padStart(2, "0")
);
const minuteOptions = ["00", "10", "20", "30", "40", "50"];
const TENTATIVE_LABEL = "仮予約";

const capacityOptions = Array.from({ length: 200 }, (_, i) => i + 1);
const costOptions = Array.from({ length: 101 }, (_, i) => i * 100);

interface EventForm {
  title: string;
  venues: string[];
  date: string;
  cost: number;
  description: string;
  seats: Seat[];
  greeting: string;
}

export default function EditEventPage() {
  const params = useParams();
  const paramId = params.id as string;
  const eventIdRef = useRef<string>("");
  if (!eventIdRef.current) {
    eventIdRef.current =
      paramId === "new" ? doc(collection(db, "events")).id : paramId;
  }
  const eventId = eventIdRef.current;

  const [form, setForm] = useState<EventForm>({
    title: "",
    venues: [""],
    date: "",
    cost: 0,
    description: "",
    seats: [],
    greeting: "",
  });
  const [originalSeats, setOriginalSeats] = useState<Seat[]>([]);
  const seatDraggingIndexRef = useRef<number | null>(null);
  const [dragOverSeatIndex, setDragOverSeatIndex] = useState<number | null>(null);
  const [isDraggingSeat, setIsDraggingSeat] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (paramId === "new") return;
    const fetchEvent = async () => {
      const docRef = doc(db, "events", eventId);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        setForm({
          title: data.title,
          venues: data.venues || (data.venue ? [data.venue] : [""]),
          date: data.date.toDate().toISOString().split("T")[0],
          cost: data.cost,
          description: data.description,
          seats: data.seats || [],
          greeting: data.greeting || "",
        });
        setOriginalSeats(data.seats || []);
      }
    };
    fetchEvent();
  }, [paramId, eventId]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
    index?: number
  ) => {
    const { name, value } = e.target;
    if (typeof index === "number") {
      setForm((prev) => {
        const updatedSeats = [...prev.seats];
        const seat = { ...updatedSeats[index] };
        if (name === "seatType") {
          seat.time =
            value === "tentative"
              ? TENTATIVE_LABEL
              : value === "seat"
              ? ""
              : "08:00";
        }
        if (name === "hour") {
          const minute = seat.time.includes(":") ? seat.time.split(":")[1] : "00";
          seat.time = `${value}:${minute}`;
        }
        if (name === "minute") {
          const hour = seat.time.includes(":") ? seat.time.split(":")[0] : "08";
          seat.time = `${hour}:${value}`;
        }
        if (name === "label") {
          seat.time = value;
        }
        if (name === "capacity") {
          seat.capacity = Number(value);
        }
        updatedSeats[index] = seat;
        return { ...prev, seats: updatedSeats };
      });
    } else {
      setForm((prev) => ({
        ...prev,
        [name]: name === "cost" ? Number(value) : value,
      }));
    }
  };

  const handleVenueInput = (index: number) => (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const value = e.target.value;
    setForm((prev) => {
      const venues = [...prev.venues];
      venues[index] = value;
      return { ...prev, venues };
    });
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const addVenueField = () => {
    setForm((prev) => ({ ...prev, venues: [...prev.venues, ""] }));
  };

  const removeVenueField = (index: number) => {
    setForm((prev) => {
      const venues = [...prev.venues];
      venues.splice(index, 1);
      return { ...prev, venues: venues.length ? venues : [""] };
    });
  };

  const handleGreetingChange = (html: string) => {
    setForm((prev) => ({ ...prev, greeting: html }));
  };

  const addSeat = () => {
    setForm((prev) => ({
      ...prev,
      seats: [...prev.seats, { time: "08:00", capacity: 1, reserved: 0 }],
    }));
  };

  const removeSeat = (index: number) => {
    setForm((prev) => {
      const updatedSeats = [...prev.seats];
      updatedSeats.splice(index, 1);
      return { ...prev, seats: updatedSeats };
    });
  };

  const resetSeatDragState = () => {
    seatDraggingIndexRef.current = null;
    setDragOverSeatIndex(null);
    setIsDraggingSeat(false);
  };

  const handleSeatDragStart = (index: number) => (e: DragEvent<HTMLButtonElement>) => {
    seatDraggingIndexRef.current = index;
    setIsDraggingSeat(true);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleSeatDragEnd = () => {
    resetSeatDragState();
  };

  const handleSeatDragOver = (index: number) => (e: DragEvent<HTMLDivElement>) => {
    if (seatDraggingIndexRef.current === null) return;
    e.preventDefault();
    if (dragOverSeatIndex !== index) {
      setDragOverSeatIndex(index);
    }
  };

  const moveSeatToIndex = (targetIndex: number) => {
    const fromIndex = seatDraggingIndexRef.current;
    if (fromIndex === null) return;
    setForm((prev) => {
      const updatedSeats = [...prev.seats];
      const [moved] = updatedSeats.splice(fromIndex, 1);
      let insertIndex = targetIndex;
      if (fromIndex < targetIndex) {
        insertIndex = Math.max(targetIndex - 1, 0);
      }
      updatedSeats.splice(insertIndex, 0, moved);
      return { ...prev, seats: updatedSeats };
    });
  };

  const handleSeatDrop = (index: number) => (e: DragEvent<HTMLDivElement>) => {
    if (seatDraggingIndexRef.current === null) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const shouldInsertAfter = e.clientY > rect.top + rect.height / 2;
    const targetIndex = shouldInsertAfter ? index + 1 : index;
    const fromIndex = seatDraggingIndexRef.current;
    if (!shouldInsertAfter && fromIndex === index) {
      resetSeatDragState();
      return;
    }
    if (shouldInsertAfter && fromIndex === index + 1) {
      resetSeatDragState();
      return;
    }
    moveSeatToIndex(targetIndex);
    resetSeatDragState();
  };

  const handleSeatDropAtEnd = (e: DragEvent<HTMLDivElement>) => {
    if (seatDraggingIndexRef.current === null) return;
    e.preventDefault();
    moveSeatToIndex(form.seats.length);
    resetSeatDragState();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const venues = form.venues.map((v) => v.trim()).filter((v) => v);

    let seatsData: Seat[] = [];
    if (paramId === "new") {
      seatsData = form.seats.map((seat) => ({
        time: seat.time,
        capacity: Number(seat.capacity),
        reserved: 0,
      }));
    } else {
      const existingMap = new Map(
        originalSeats.map((s) => [s.time, s.reserved || 0])
      );
      const newTimes = form.seats.map((s) => s.time);
      for (const [time, reserved] of existingMap.entries()) {
        if (reserved > 0 && !newTimes.includes(time)) {
          alert(`${time}には既に${reserved}名の申込みがあるため削除できません。`);
          return;
        }
      }
      for (const seat of form.seats) {
        const reserved = existingMap.get(seat.time) || 0;
        if (reserved > seat.capacity) {
          alert(`${seat.time}には既に${reserved}名の申込みがあるため、${seat.capacity}名に変更できません。`);
          return;
        }
        seatsData.push({
          time: seat.time,
          capacity: Number(seat.capacity),
          reserved,
        });
      }
    }

    const baseData = {
      title: form.title,
      venues: venues.length ? venues : null,
      greeting: preserveLeadingSpaces(form.greeting) || "",
      cost: Number(form.cost),
      date: Timestamp.fromDate(new Date(form.date)),
      description: form.description,
      seats: seatsData,
    };

    if (paramId === "new") {
      await setDoc(doc(db, "events", eventId), baseData);
      alert("新しいイベントを作成しました");
    } else {
      const docRef = doc(db, "events", eventId);
      await updateDoc(docRef, {
        ...baseData,
        coverImageUrl: deleteField(),
        coverImagePath: deleteField(),
        coverImageAlt: deleteField(),
      });
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
          <label className="block mb-1">ごあいさつ</label>
          <QuillLite
            value={form.greeting}
            onChange={handleGreetingChange}
            eventId={eventId}
          />
        </div>
        <div>
          <label className="block mb-1">会場</label>
          {form.venues.map((v, i) => (
            <div key={i} className="flex items-start gap-2 mb-2">
              <textarea
                value={v}
                onChange={handleVenueInput(i)}
                className="border p-2 w-full"
                rows={1}
                maxLength={1000}
                style={{ overflow: "hidden" }}
              />
              {form.venues.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeVenueField(i)}
                  className="text-red-500 text-sm"
                >
                  削除
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addVenueField}
            className="bg-gray-200 px-3 py-1 rounded"
          >
            行を追加
          </button>
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
          <p className="font-semibold">時間枠/席と定員（複数設定可）</p>
          <p className="text-sm text-gray-500">ドラッグで表示順を並び替えできます。</p>
          {form.seats.map((seat, i) => {
            const [h, m] = seat.time.includes(":") ? seat.time.split(":") : ["08", "00"];
            const seatType = seat.time === TENTATIVE_LABEL
              ? "tentative"
              : seat.time.includes(":")
              ? "time"
              : "seat";
            return (
              <div
                key={i}
                className={`flex gap-2 items-center rounded border p-2 transition-colors ${
                  dragOverSeatIndex === i ? "border-blue-400 bg-blue-50" : "border-transparent"
                }`}
                onDragOver={handleSeatDragOver(i)}
                onDrop={handleSeatDrop(i)}
              >
                <button
                  type="button"
                  className="cursor-move text-gray-500 hover:text-gray-700"
                  draggable
                  onDragStart={handleSeatDragStart(i)}
                  onDragEnd={handleSeatDragEnd}
                  aria-label="席の並び替え"
                >
                  ☰
                </button>
                <select
                  name="seatType"
                  value={seatType}
                  onChange={(e) => handleChange(e, i)}
                  className="border p-2"
                >
                  <option value="time">時間指定</option>
                  <option value="seat">席指定</option>
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
                {seatType === "seat" && (
                  <input
                    type="text"
                    name="label"
                    value={seat.time}
                    onChange={(e) => handleChange(e, i)}
                    maxLength={5}
                    className="border p-2 w-20"
                    placeholder="席名"
                  />
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
          {isDraggingSeat && (
            <div
              onDragOver={(e) => {
                if (seatDraggingIndexRef.current === null) return;
                e.preventDefault();
              }}
              onDrop={handleSeatDropAtEnd}
              className="border-2 border-dashed border-blue-300 bg-blue-50 text-blue-600 text-center py-2 rounded"
            >
              ここにドロップして最後に移動
            </div>
          )}
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

        {paramId !== "new" && (
          <button
            type="button"
            onClick={handleDelete}
            className="bg-red-500 text-white px-4 py-2 rounded w-full mt-2"
          >
            イベントを削除
          </button>
        )}
      </form>
    </main>
  );
}
