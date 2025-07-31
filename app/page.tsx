"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import type { EventSummary, Seat } from "@/types";

export default function HomePage() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [topImageUrl, setTopImageUrl] = useState("/hero-matcha.png");
  const [greetingText, setGreetingText] = useState(
    "の度、お茶会へ参加される皆様の利便性を考慮し、茶会予約のサイトの立ち上げをいたしました。茶会予約参加の登録をはじめ、茶会のご案内や過去の茶会のご紹介などサイトを通じて発信して参ります。\n皆様の役に立つツールとしてご活用いただければ幸いです。どうぞ、宜しくお願い致します。\n石州流野村派　代表\n悠瓢庵　堀 一孝"
  );
  const [greetingImageUrl, setGreetingImageUrl] = useState("");

  useEffect(() => {
    const fetchSiteSettings = async () => {
      const ref = doc(db, "settings", "site");
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        if (data.heroImageUrl) setTopImageUrl(data.heroImageUrl);
        if (data.greetingText) setGreetingText(data.greetingText);
        if (data.greetingImageUrl) setGreetingImageUrl(data.greetingImageUrl);
      }
    };

    const fetchEvents = async () => {
      const snapshot = await getDocs(collection(db, "events"));
      const data = snapshot.docs
        .map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            title: d.title,
            venue: d.venue,
            rawDate: d.date?.toDate() as Date,
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
          };
        })
        .sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime())
        .map((ev) => {
          return {
            id: ev.id,
            title: ev.title,
            venue: ev.venue,
            date: ev.rawDate.toLocaleDateString("ja-JP", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              weekday: "short",
            }),
            cost: ev.cost,
            description: ev.description,
            participants: ev.participants,
            capacity: ev.capacity,
            imageUrl: ev.imageUrl,
          } as EventSummary;
        });
      setEvents(data);
    };
    fetchEvents();
    fetchSiteSettings();
  }, []);

  return (
    <main>
      {/* トップページセクション */}
      <section
        className="bg-cover bg-center min-h-[500px] sm:min-h-[600px] text-white flex flex-col justify-center items-center px-4"
        style={{ backgroundImage: `url('${topImageUrl}')` }}
      >
        <h1 className="text-5xl sm:text-6xl font-extrabold mb-4 drop-shadow-md">
          石州流野村派
        </h1>
        <p className="text-xl sm:text-2xl drop-shadow">茶会行事 予約サイト</p>
      </section>

      {/* ごあいさつセクション */}
      <section className="py-8 max-w-5xl mx-auto px-4 text-center">
        {greetingImageUrl && (
          <img
            src={greetingImageUrl}
            alt="ごあいさつ"
            className="w-full mb-4 rounded"
          />
        )}
        <p className="whitespace-pre-line text-lg">{greetingText}</p>
      </section>

      {/* イベント一覧セクション */}
      <section className="py-12 mb-8 max-w-5xl mx-auto px-4 bg-amber-50 border-b-4 border-amber-500 rounded">
        <h3 className="text-lg font-semibold text-amber-700 text-center mb-6">お茶会のご案内</h3>
        <div className="space-y-8">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex flex-col md:flex-row items-center gap-6 p-6 border rounded-lg shadow-lg bg-white hover:shadow-xl transition-shadow"
            >
              <div className="flex-1">
                <h4 className="text-xl font-bold mb-2">{event.title}</h4>
                <p className="mb-1 font-semibold">会場: <span className="font-normal">{event.venue}</span></p>
                <p className="mb-1 font-semibold">日時: <span className="font-normal">{event.date}</span></p>
                <p className="mb-1 font-semibold">参加費用: <span className="font-normal">{event.cost}円</span></p>
                <p className="mb-3 font-semibold">
                  参加人数: <span className="font-normal">{event.participants}/{event.capacity}人</span>
                </p>
                <p className="mb-4">{event.description}</p>
                <Link href={`/events/${event.id}`}>
                  <button className="w-32 mx-auto block bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded shadow transition-colors">
                    予約する
                  </button>
                </Link>
              </div>
              <div className="w-full md:w-1/3">
                <div className="relative w-full h-48 md:h-64 rounded overflow-hidden">
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

      {/* 予約確認セクション */}
      <section className="py-8 bg-amber-50 border-t-4 border-amber-500 text-center px-4 mt-8 max-w-5xl mx-auto">
        <p className="mb-4 text-lg font-semibold text-amber-700">
          すでに予約済みの方はこちら
        </p>
        <Link href="/reservations/confirm">
          <button className="bg-amber-500 hover:bg-amber-600 text-white py-2 px-6 rounded shadow transition-colors">
            予約の確認・変更はこちら
          </button>
        </Link>
      </section>
    </main>
  );
}
