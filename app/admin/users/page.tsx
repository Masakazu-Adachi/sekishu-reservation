"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  deleteDoc,
  updateDoc,
  addDoc,
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
  address?: string;
  guests: number;
  eventId: string;
  seatTime: string;
  notes?: string;
  createdAt: string;
  password?: string;
  companions?: string[];
}

type Row = {
  id: string;
  representative: string;
  companion: string;
  createdAt: string;
  isCompanion: boolean;
  parentId?: string;
  companionIndex?: number;
  email?: string;
  address?: string;
  guests?: number;
  eventId?: string;
  seatTime?: string;
};

export default function UserListPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [eventTitles, setEventTitles] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    address: "",
    guests: 1,
    seatTime: "",
    companions: [] as string[],
  });
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
    if (!confirm("この予約をキャンセルしてもよろしいですか？")) return;

    try {
      const reservationRef = doc(db, "reservations", id);
      const reservationSnap = await getDoc(reservationRef);
      if (!reservationSnap.exists()) throw new Error("予約が存在しません");

      const data = reservationSnap.data();
      if (!data) throw new Error("予約データが不正です");
      const { eventId } = data;
      await addDoc(collection(db, "deletedReservations"), {
        originalId: id,
        ...data,
        deletedAt: new Date().toISOString(),
      });
      await deleteDoc(reservationRef);
      await updateParticipantCount(eventId);
      await updateSeatReservedCount(eventId);

      setReservations(reservations.filter((r) => r.id !== id));
    } catch (error) {
      console.error("キャンセルエラー:", error);
      alert("キャンセルに失敗しました");
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
      alert("選択された時間枠または席が無効です");
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
    setEditForm({
      name: "",
      email: "",
      address: "",
      guests: 1,
      seatTime: "",
      companions: [],
    });
    const updated = await getDocs(collection(db, "reservations"));
    const dataUpdated = updated.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Reservation[];
    setReservations(dataUpdated);
  };
  const displayReservations: Row[] = reservations.flatMap((r) => {
    const isEditing = editingId === r.id;
    const main: Row = {
      id: r.id,
      representative: isEditing ? editForm.name : r.name,
      companion: "",
      email: isEditing ? editForm.email : r.email,
      address: isEditing ? editForm.address : r.address,
      guests: isEditing ? editForm.guests : r.guests,
      eventId: r.eventId,
      seatTime: isEditing ? editForm.seatTime : r.seatTime,
      createdAt: r.createdAt,
      isCompanion: false,
    };
    const compArray = isEditing ? editForm.companions : r.companions || [];
    const companions: Row[] = compArray.map((name, index) => ({
      id: `${r.id}-c${index}`,
      parentId: r.id,
      representative: isEditing ? editForm.name : r.name,
      companion: name,
      createdAt: r.createdAt,
      isCompanion: true,
      companionIndex: index,
    }));
    return [main, ...companions];
  });

  const handleDownloadCsv = () => {
    const headers = [
      "申込代表者",
      "同席者",
      "メールアドレス",
      "住所",
      "人数",
      "イベント名",
      "時間/席",
      "予約日時",
    ];
    const rows = displayReservations.map((r) => [
      r.representative,
      r.companion,
      r.isCompanion ? "" : r.email ?? "",
      r.isCompanion ? "" : r.address || "",
      r.isCompanion ? "" : r.guests,
      r.isCompanion ? "" : eventTitles[r.eventId || ""] || "",
      r.isCompanion ? "" : r.seatTime || "",
      format(new Date(r.createdAt), "yyyy/M/d HH:mm:ss", { locale: ja }),
    ]);
    const csv = [headers, ...rows]
      .map((row) =>
        row.map((f) => `"${String(f ?? "").replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "reservations.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <Link href="/admin" className="text-blue-600 underline block mb-4">
        ← 管理ダッシュボードに戻る
      </Link>
      <h1 className="text-2xl font-bold mb-4">全予約者一覧</h1>
      <button
        onClick={handleDownloadCsv}
        className="bg-blue-600 text-white px-4 py-2 rounded mb-4"
      >
        CSVダウンロード
      </button>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] border text-sm shadow-md bg-white">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-2 py-1">申込代表者</th>
              <th className="border px-2 py-1">同席者</th>
              <th className="border px-2 py-1">メールアドレス</th>
              <th className="border px-2 py-1">住所</th>
              <th className="border px-2 py-1">人数</th>
              <th className="border px-2 py-1">イベント名</th>
              <th className="border px-2 py-1">時間/席</th>
              <th className="border px-2 py-1">予約日時</th>
              <th className="border px-2 py-1">操作</th>
            </tr>
          </thead>
          <tbody>
            {displayReservations.map((r) => (
              <tr key={r.id}>
              <td className="border px-2 py-1">
                {r.isCompanion ? (
                  r.representative
                ) : editingId === r.id ? (
                  <input
                    className="border p-1 w-full"
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                  />
                ) : (
                  r.representative
                )}
              </td>
              <td className="border px-2 py-1">
                {r.isCompanion ? (
                  editingId && r.parentId === editingId ? (
                    <input
                      className="border p-1 w-full"
                      value={editForm.companions[r.companionIndex!] || ""}
                      onChange={(e) => {
                        const newCompanions = [...editForm.companions];
                        newCompanions[r.companionIndex!] = e.target.value;
                        setEditForm({ ...editForm, companions: newCompanions });
                      }}
                    />
                  ) : (
                    r.companion
                  )
                ) : (
                  ""
                )}
              </td>
              <td className="border px-2 py-1">
                {r.isCompanion ? (
                  <span className="text-gray-400">—</span>
                ) : editingId === r.id ? (
                  <input
                    className="border p-1 w-full"
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm({ ...editForm, email: e.target.value })
                    }
                  />
                ) : (
                  r.email ?? "—"
                )}
              </td>
              <td className="border px-2 py-1">
                {r.isCompanion ? (
                  ""
                ) : editingId === r.id ? (
                  <input
                    className="border p-1 w-full"
                    value={editForm.address}
                    onChange={(e) =>
                      setEditForm({ ...editForm, address: e.target.value })
                    }
                  />
                ) : (
                  r.address || ""
                )}
              </td>
              <td className="border px-2 py-1">
                {r.isCompanion ? (
                  ""
                ) : editingId === r.id ? (
                  <input
                    type="number"
                    className="border p-1 w-full"
                    value={editForm.guests}
                    onChange={(e) => {
                      const newGuests = Number(e.target.value);
                      setEditForm((prev) => {
                        const guests = newGuests;
                        const targetLength = Math.max(guests - 1, 0);
                        let companions = [...prev.companions];
                        if (companions.length < targetLength) {
                          companions = companions.concat(
                            Array(targetLength - companions.length).fill("")
                          );
                        } else if (companions.length > targetLength) {
                          companions = companions.slice(0, targetLength);
                        }
                        return { ...prev, guests, companions };
                      });
                    }}
                  />
                ) : (
                  r.guests
                )}
              </td>
              <td className="border px-2 py-1">
                {r.isCompanion ? "" : eventTitles[r.eventId || ""] || ""}
              </td>
              <td className="border px-2 py-1">
                {r.isCompanion ? (
                  ""
                ) : editingId === r.id ? (
                  <select
                    className="border p-1 w-full"
                    value={editForm.seatTime}
                    onChange={(e) =>
                      setEditForm({ ...editForm, seatTime: e.target.value })
                    }
                  >
                    <option value="">時間または席を選択</option>
                    {(eventSeatTimes[r.eventId || ""] || []).map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                ) : (
                  r.seatTime
                )}
              </td>
              <td className="border px-2 py-1">
                {format(new Date(r.createdAt), "yyyy/M/d HH:mm:ss", { locale: ja })}
              </td>
              <td className="border px-2 py-1 flex flex-wrap gap-1">
                {r.isCompanion ? null : editingId === r.id ? (
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
                        const reservation = reservations.find((res) => res.id === r.id);
                        const guests = reservation?.guests || 1;
                        let companions = reservation?.companions || [];
                        const target = Math.max(guests - 1, 0);
                        if (companions.length < target) {
                          companions = companions.concat(Array(target - companions.length).fill(""));
                        } else if (companions.length > target) {
                          companions = companions.slice(0, target);
                        }
                        setEditingId(r.id);
                        setEditForm({
                          name: reservation?.name || "",
                          email: reservation?.email || "",
                          address: reservation?.address || "",
                          guests,
                          seatTime: reservation?.seatTime || "",
                          companions,
                        });
                      }}
                      className="bg-yellow-400 text-white px-2 py-1 rounded text-sm"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="bg-red-500 text-white px-2 py-1 rounded text-sm"
                    >
                      予約をキャンセル
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
