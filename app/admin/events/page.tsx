"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import LinkBackToAdminTop from "@/components/LinkBackToAdminTop";

type Event = {
  id: string;
  title: string;
  date: {
    toDate: () => Date;
  };
  seats: { capacity: number; reserved?: number }[];
};

export default function AdminEventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    const fetchEvents = async () => {
      const snapshot = await getDocs(collection(db, "events"));
      const eventList: Event[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        eventList.push({ id: doc.id, ...data } as Event);
      });
      setEvents(eventList);
    };

    fetchEvents();
  }, []);

  const getTotalSeats = (seats: Event["seats"]) =>
    seats.reduce((sum, seat) => sum + seat.capacity, 0);

  const getTotalReserved = (seats: Event["seats"]) =>
    seats.reduce((sum, seat) => sum + (seat.reserved || 0), 0);

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <LinkBackToAdminTop />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">イベント管理</h1>
        <button
          onClick={() => router.push("/admin/events/new/edit")}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          ＋ イベントを追加
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {events.map((event) => (
          <div key={event.id} className="border rounded p-4 shadow">
            <h2 className="text-xl font-semibold mb-2">{event.title}</h2>
            <p className="text-gray-600 mb-1">
              📅{" "}
              {event.date.toDate().toLocaleDateString("ja-JP", {
                year: "numeric",
                month: "long",
                day: "numeric",
                weekday: "short",
              })}
            </p>
            <p className="text-gray-600 mb-3">
              👥 現在の参加者: {getTotalReserved(event.seats)} /{" "}
              {getTotalSeats(event.seats)}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => router.push(`/admin/events/${event.id}/edit`)}
                className="px-3 py-1 border rounded hover:bg-gray-100"
              >
                編集
              </button>
              <button
                onClick={() => router.push(`/admin/events/${event.id}/reservations`)}
                className="px-3 py-1 bg-blue-600 text-white rounded"
              >
                予約者一覧
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
