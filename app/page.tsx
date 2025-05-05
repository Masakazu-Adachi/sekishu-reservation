"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

export default function HomePage() {
  const [events, setEvents] = useState<any[]>([]);

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
          participants: d.seats?.reduce(
            (sum: number, seat: any) => sum + (seat.reserved || 0),
            0
          ),
          capacity: d.seats?.reduce(
            (sum: number, seat: any) => sum + (seat.capacity || 0),
            0
          ),
          imageUrl: d.imageUrl || "/event1.jpg",
        };
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
        style={{ backgroundImage: "url('/hero-matcha.jpg')" }}
      >
        <h1 className="text-4xl font-bold">WELCOME TO</h1>
        <h2 className="text-5xl font-extrabold mt-2">sekishu</h2>
        <p className="mt-2">石州流野村派のお茶席予約サイト</p>
        <button className="mt-4 bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-4 rounded">
          直近のお茶会
        </button>
        {/* 🔽 予約確認・変更ボタンを追加 */}
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
                <Image
                  src={event.imageUrl}
                  alt={event.title}
                  width={400}
                  height={250}
                  className="object-cover w-full h-48 rounded"
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
