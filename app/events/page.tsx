"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import type { EventSummary, Seat } from "@/types";
import LinkBackToHome from "@/components/LinkBackToHome";

export default function EventsPage() {
  const [events, setEvents] = useState<EventSummary[]>([]);

  useEffect(() => {
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
  }, []);

  return (
    <main className="p-6 max-w-5xl mx-auto font-serif">
      <LinkBackToHome />
      <h1 className="text-2xl font-bold text-center mb-6">お茶会のご案内</h1>
      <div className="space-y-8">
        {events.map((event) => (
          <div
            key={event.id}
            className="flex flex-col md:flex-row items-center gap-6 p-6 border rounded-lg shadow-lg bg-white hover:shadow-xl transition-shadow"
          >
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-2">{event.title}</h2>
              <p className="mb-1 font-semibold">
                会場: <span className="font-normal">{event.venue}</span>
              </p>
              <p className="mb-1 font-semibold">
                日時: <span className="font-normal">{event.date}</span>
              </p>
              <p className="mb-1 font-semibold">
                参加費用: <span className="font-normal">{event.cost}円</span>
              </p>
              <p className="mb-3 font-semibold">
                参加人数:
                <span className="font-normal">
                  {event.participants}/{event.capacity}人
                </span>
              </p>
              <p className="mb-4">{event.description}</p>
              <Link href={`/events/${event.id}`}>
                <button className="w-32 mx-auto block bg-[#C1A46F] hover:bg-[#A88C5A] text-white py-2 rounded shadow transition-colors font-serif">
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
    </main>
  );
}
