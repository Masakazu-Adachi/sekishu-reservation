"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import type { EventSummary, Seat } from "@/types";

export default function HomePage() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const heroImageUrl = "/hero-matcha.png"; // 固定画像に切り戻し

  useEffect(() => {
    const fetchEvents = async () => {
      const snapshot = await getDocs(collection(db, "events"));
      const data = snapshot.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          title: d.title,
          venue: d.venue,
          date: d.date?.toDate().toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            weekday: "short",
          }),
          cost: d.cost,
          description: d.description,
          participants: (d.seats as Seat[] | undefined)?.reduce(
            (sum: number, seat) => sum + (seat.reserved || 0),
            0
          ),
          capacity: (d.seats as Seat[] | undefined)?.reduce(
            (sum: number, seat) => sum + (seat.capacity || 0),
            0
          ),
          imageUrl: d.imageUrl || "/event1.jpg",
        } as EventSummary;
      });
      setEvents(data);
    };
    fetchEvents();
  }, []);

  return (
    <main>
      {/* ヒーローセクション */}
      <section
        className="bg-cover bg-center h-96 text-white flex flex-col justify-center items-center"
        style={{ backgroundImage: `url('${heroImageUrl}')` }}
      >
        <h1 className="text-5xl font-extrabold mt-2">石州流野村派</h1>
        <p className="mt-2 text-xl">お茶席予約サイト</p>
        <button className="mt-4 bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-4 rounded">
          直近のお茶会
        </button>
        <Link href="/reservations/confirm">
          <button className="mt-2 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded">
            予約の確認・変更はこちら
          </button>
        </Link>
      </section>

      {/* イベント一覧セクション */}
      <section className="py-10 max-w-5xl mx-auto px-4">
        <h3 className="text-xl font-bold text-center mb-6">お茶会のご案内</h3>
        <div className="space-y-8">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex flex-col md:flex-row justify-between border-b pb-6 gap-4"
            >
              <div className="flex-1">
                <h4 className="text-lg font-semibold mb-1">{event.title}</h4>
                <p>会場: {event.venue}</p>
                <p>日時: {event.date}</p>
                <p>参加費用: {event.cost}円</p>
                <p>
                  参加人数: {event.participants}/{event.capacity}人
                </p>
                <p>{event.description}</p>
                <Link href={`/events/${event.id}`}>
                  <button className="mt-2 bg-yellow-500 hover:bg-yellow-600 text-white py-1 px-3 rounded text-sm">
                    予約する
                  </button>
                </Link>
              </div>
              <div className="w-full md:w-1/3">
                <div className="relative w-full aspect-video rounded overflow-hidden">
                  <Image
                    src={event.imageUrl}
                    alt={event.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
