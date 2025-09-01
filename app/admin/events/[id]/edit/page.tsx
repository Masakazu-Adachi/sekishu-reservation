"use client";

import { useEffect, useState, useRef, useMemo } from "react";
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
import { deleteImage } from "@/lib/storageImages";
import { uploadViaApi } from "@/lib/uploadViaApi";
import { validateImage } from "@/lib/validateImage";
import Delta from "quill-delta";
import type { Delta as DeltaType } from "quill";

import type { Seat } from "@/types";
import QuillClientEditor, { QuillClientHandle } from "@/components/QuillClientEditor";


const hourOptions = Array.from({ length: 24 }, (_, i) =>
  String(i).padStart(2, "0")
);
const minuteOptions = ["00", "10", "20", "30", "40", "50"];
const TENTATIVE_LABEL = "仮予約";

const capacityOptions = Array.from({ length: 200 }, (_, i) => i + 1);
const costOptions = Array.from({ length: 101 }, (_, i) => i * 100);

async function downscaleIfNeeded(file: File): Promise<Blob | File> {
  return await new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      if (img.width <= 2000) {
        resolve(file);
        return;
      }
      const canvas = document.createElement("canvas");
      const scale = 2000 / img.width;
      canvas.width = 2000;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        resolve(blob || file);
      }, "image/jpeg", 0.85);
    };
    img.src = URL.createObjectURL(file);
  });
}


interface EventForm {
  title: string;
  venues: string[];
  date: string;
  cost: number;
  description: string;
  seats: Seat[];
  coverImageUrl: string;
  coverImagePath: string;
  coverImageAlt: string;
  greetingDelta: DeltaType;
}

export default function EditEventPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [form, setForm] = useState<EventForm>({
    title: "",
    venues: [""],
    date: "",
    cost: 0,
    description: "",
    seats: [],
    coverImageUrl: "",
    coverImagePath: "",
    coverImageAlt: "",
    greetingDelta: new Delta() as DeltaType,
  });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
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
          venues: data.venues || (data.venue ? [data.venue] : [""]),
          date: data.date.toDate().toISOString().split("T")[0],
          cost: data.cost,
          description: data.description,
          seats: data.seats || [],
          coverImageUrl: data.coverImageUrl || "",
          coverImagePath: data.coverImagePath || "",
          coverImageAlt: data.coverImageAlt || "",
          greetingDelta: data.greetingDelta
            ? (new Delta(data.greetingDelta) as DeltaType)
            : (new Delta() as DeltaType),
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

  const handleCoverImageChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    if (!validateImage(file)) return;
    setCoverFile(file);
    const preview = URL.createObjectURL(file);
    const prevUrl = form.coverImageUrl;
    const prevPath = form.coverImagePath;
    setForm({ ...form, coverImageUrl: preview });
    if (eventId !== "new") {
      setUploading(true);
      const blob = await downscaleIfNeeded(file);
      try {
        const { url, path } = await uploadViaApi(blob, `events/${eventId}`, setUploadProgress);
        await updateDoc(doc(db, "events", eventId), {
          coverImageUrl: url,
          coverImagePath: path,
        });
        if (form.coverImagePath) {
          try {
            await deleteImage(form.coverImagePath);
          } catch {
            alert("旧画像の削除に失敗しました");
          }
        }
        setForm((prev) => ({
          ...prev,
          coverImageUrl: url,
          coverImagePath: path,
        }));
        setCoverFile(null);
      } catch {
        alert("画像のアップロードに失敗しました");
        setForm((prev) => ({ ...prev, coverImageUrl: prevUrl, coverImagePath: prevPath }));
        setCoverFile(null);
      } finally {
        setUploading(false);
      }
    }
  };

  const handleDeleteCoverImage = async () => {
    if (eventId !== "new" && form.coverImagePath) {
      setUploading(true);
      try {
        await deleteImage(form.coverImagePath);
        await updateDoc(doc(db, "events", eventId), {
          coverImageUrl: "",
          coverImagePath: "",
          coverImageAlt: "",
        });
      } catch {
        alert("画像の削除に失敗しました");
      } finally {
        setUploading(false);
      }
    }
    setForm((prev) => ({
      ...prev,
      coverImageUrl: "",
      coverImagePath: "",
      coverImageAlt: "",
    }));
    setCoverFile(null);
  };

  const handleVenueInput = (index: number) => (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const venues = [...form.venues];
    venues[index] = e.target.value;
    setForm({ ...form, venues });
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const addVenueField = () => {
    setForm({ ...form, venues: [...form.venues, ""] });
  };

  const removeVenueField = (index: number) => {
    const venues = [...form.venues];
    venues.splice(index, 1);
    setForm({ ...form, venues: venues.length ? venues : [""] });
  };

  const quillRef = useRef<QuillClientHandle | null>(null);
  const quillModules = useMemo(
    () => ({
      toolbar: { container: [["bold", "italic", "underline"], [{ align: [] }], ["link"]] },
      clipboard: { matchVisual: false },
    }),
    []
  );
  const quillFormats = useMemo(
    () => ["bold", "italic", "underline", "align", "link"],
    []
  );
  const greetingTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleGreetingChange = (
    _value: string,
    _delta: DeltaType,
    _source: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    editor: any
  ) => {
    if (greetingTimeout.current) clearTimeout(greetingTimeout.current);
    greetingTimeout.current = setTimeout(() => {
      setForm((prev) => ({ ...prev, greetingDelta: editor.getContents() }));
    }, 500);
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
    if (uploading) return;

    const venues = form.venues.map((v) => v.trim()).filter((v) => v);
    const baseData = {
      title: form.title,
      venues: venues.length ? venues : null,
      greetingDelta:
        form.greetingDelta.ops && form.greetingDelta.ops.length
          ? { ops: form.greetingDelta.ops }
          : null,
      cost: Number(form.cost),
      date: Timestamp.fromDate(new Date(form.date)),
      description: form.description,
      seats: form.seats.map((seat) => ({
        time: seat.time,
        capacity: Number(seat.capacity),
        reserved: 0,
      })),
    };

    if (eventId === "new") {
      const docRef = await addDoc(collection(db, "events"), baseData);
      if (coverFile) {
        setUploading(true);
        const blob = await downscaleIfNeeded(coverFile);
        try {
          const { url, path } = await uploadViaApi(blob, `events/${docRef.id}`, setUploadProgress);
          await updateDoc(docRef, {
            coverImageUrl: url,
            coverImagePath: path,
            coverImageAlt: form.coverImageAlt || "",
          });
          setForm((prev) => ({ ...prev, coverImageUrl: url, coverImagePath: path }));
          setCoverFile(null);
        } catch {
          alert("画像のアップロードに失敗しました");
          setForm((prev) => ({ ...prev, coverImageUrl: "", coverImagePath: "" }));
          setCoverFile(null);
        } finally {
          setUploading(false);
        }
      } else if (form.coverImageAlt) {
        await updateDoc(docRef, { coverImageAlt: form.coverImageAlt });
      }
      alert("新しいイベントを作成しました");
    } else {
      const docRef = doc(db, "events", eventId);
      await updateDoc(docRef, {
        ...baseData,
        coverImageUrl: form.coverImageUrl || "",
        coverImagePath: form.coverImagePath || "",
        coverImageAlt: form.coverImageAlt || "",
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
          <QuillClientEditor
            ref={quillRef}
            value={form.greetingDelta}
            onChange={handleGreetingChange}
            modules={quillModules}
            formats={quillFormats}
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
          <label className="block mb-1">カード画像</label>
          {form.coverImageUrl && (
            <img
              src={form.coverImageUrl}
              alt={form.coverImageAlt || ""}
              className="w-full mb-2 rounded border"
            />
          )}
          {uploading && (
            <div className="mb-2">
              <div className="w-full bg-gray-200 rounded h-2">
                <div
                  className="bg-blue-500 h-2 rounded"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-center">{uploadProgress}%</p>
            </div>
          )}
          <div className="flex gap-2 items-center">
            <input
              type="file"
              accept="image/*"
              onChange={handleCoverImageChange}
              className="border p-2 flex-1"
              disabled={uploading}
            />
            {form.coverImageUrl && (
              <button
                type="button"
                onClick={handleDeleteCoverImage}
                className="px-3 py-1 border rounded"
                disabled={uploading}
              >
                画像を削除
              </button>
            )}
          </div>
          <input
            type="text"
            value={form.coverImageAlt}
            onChange={(e) => setForm({ ...form, coverImageAlt: e.target.value })}
            placeholder="Alt テキスト（任意）"
            className="border p-2 w-full mt-2"
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
          className="bg-blue-600 text-white px-4 py-2 rounded w-full disabled:opacity-50"
          disabled={uploading}
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
