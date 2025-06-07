"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  addDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { nanoid } from "nanoid";
import { updateParticipantCount } from "@/lib/updateParticipantCount";
import { updateSeatReservedCount } from "@/lib/updateSeatReservedCount";
import type { Event, Seat } from "@/types";


export default function EventDetailPage() {
  const { id } = useParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [guests, setGuests] = useState(1);
  const [selectedTime, setSelectedTime] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const fetchEvent = async () => {
      if (!id) return;
      const docRef = doc(db, "events", id as string);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        setEvent({ id: snapshot.id, ...snapshot.data() } as Event);
      }
    };
    fetchEvent();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event || !selectedTime) return;

    const seat = (event.seats as Seat[]).find((s) => s.time === selectedTime);
    if (!seat) {
      alert("選択された時間枠が無効です");
      return;
    }

    const reservationSnapshot = await getDocs(
      query(
        collection(db, "reservations"),
        where("eventId", "==", event.id),
        where("seatTime", "==", selectedTime)
      )
    );
    const reservedCount = reservationSnapshot.docs.reduce(
      (total, doc) => total + (doc.data().guests || 0),
      0
    );

    if (reservedCount + guests > seat.capacity) {
      alert(`定員(${seat.capacity}名)を超えています。現在の合計: ${reservedCount + guests}名`);
      return;
    }

    const duplicateCheck = await getDocs(
      query(
        collection(db, "reservations"),
        where("eventId", "==", event.id),
        where("email", "==", email)
      )
    );
    if (!duplicateCheck.empty) {
      alert("このメールアドレスでは既に予約済みです");
      return;
    }

    const password = nanoid(8);
    const totalCost = (event.cost || 0) * guests;

    await addDoc(collection(db, "reservations"), {
      name,
      email,
      guests,
      eventId: event.id,
      seatTime: selectedTime,
      notes,
      password,
      createdAt: new Date().toISOString(),
    });

    await updateSeatReservedCount(event.id);
    await updateParticipantCount(event.id);

    const confirmUrl =
      "https://sekishuu-nomura-ochakai.sustirel.com/reservations/confirm";

    await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: email,
        subject: `${event.title} のご予約完了通知`,
        html: `
          <div style="font-family:'Hiragino Mincho Pro', serif; line-height:1.8; font-size:16px;">
            <p>${name} 様</p>
            <p>
              この度は「${event.title}」にお申し込みいただき、誠にありがとうございます。<br/>
              以下の内容でご予約を承りましたのでご確認ください。
            </p>
            <hr/>
            <div>
              <p><strong>会場：</strong>${event.venue}</p>
              <p><strong>日付：</strong>${event.date
                .toDate()
                .toLocaleDateString('ja-JP')}</p>
              <p><strong>時間：</strong>${selectedTime}</p>
              <p><strong>人数：</strong>${guests}名</p>
            </div>
            <hr/>
            <div>
              <p>ご予約内容の確認・変更・キャンセルは下記URLよりお手続きください。</p>
              <p><a href="${confirmUrl}" style="color:#1a73e8;">${confirmUrl}</a></p>
              <p>その際、下記情報が必要となります。</p>
              <p><strong>ご登録メールアドレス：</strong>${email}<br/>
              <strong>パスワード：</strong>${password}</p>
            </div>
            <hr/>
            <div>
              <p><strong>お支払い金額：</strong>${totalCost}円</p>
              <p>お振込み先：</p>
              <p>
                XXX銀行<br/>XXX支店<br/>普通 XXXXXXXX<br/>振込期限：X月X日<br/>
                振込人名義はご予約者様のお名前でお願いいたします。
              </p>
            </div>
            <p>当日お会いできますことを、心より楽しみにしております。</p>
            <p>ご不明点などございましたら、神田（メール：XXX@XXX.co.jp or 電話：000-0000-0000）までお気軽にご連絡ください。</p>
          </div>
        `,
      }),
    });

    await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: "m-adachi@sustirel.com",
        subject: `${event.title} の予約が入りました`,
        html: `

          <div style="font-family:sans-serif; line-height:1.6;">
            <p>${name}様から予約がありました。</p>
            <ul>
              <li><strong>イベント:</strong> ${event.title}</li>
              <li><strong>会場:</strong> ${event.venue}</li>
              <li><strong>日付:</strong> ${event.date
                .toDate()
                .toLocaleDateString("ja-JP")}</li>
              <li><strong>時間:</strong> ${selectedTime}</li>
              <li><strong>人数:</strong> ${guests}名</li>
              <li><strong>メール:</strong> ${email}</li>
              <li><strong>合計金額:</strong> ${totalCost}円</li>
              <li><strong>自由記述:</strong> ${notes || "(なし)"}</li>
            </ul>
          </div>

        `,
      }),
    });

    alert("予約が完了しました！確認メールをご確認ください。");
    setName("");
    setEmail("");
    setGuests(1);
    setSelectedTime("");
    setNotes("");
  };

  if (!event) return <p className="p-6">読み込み中...</p>;

  return (
    <main className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">{event.title}</h1>
      <p>会場: {event.venue}</p>
      <p>日付: {event.date.toDate().toLocaleDateString("ja-JP")}</p>
      <p className="mb-4">説明: {event.description}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1">お名前</label>
          <input
            type="text"
            className="border p-2 w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block mb-1">メールアドレス</label>
          <input
            type="email"
            className="border p-2 w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block mb-1">参加人数</label>
          <input
            type="number"
            className="border p-2 w-full"
            value={guests}
            min={1}
            max={10}
            onChange={(e) => setGuests(Number(e.target.value))}
            required
          />
        </div>
        <div>
          <label className="block mb-1">時間枠選択</label>
          <select
            className="border p-2 w-full"
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
            required
          >
            <option value="">時間を選択</option>
            {(event.seats as Seat[]).map((seat) => (
              <option
                key={seat.time}
                value={seat.time}
                disabled={(seat.reserved || 0) >= seat.capacity}
              >
                {seat.time}（残り {seat.capacity - (seat.reserved || 0)} 名）
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block mb-1">
            自由記述欄：なにか気になることや質問があればご記入ください。
          </label>
          <textarea
            className="border p-2 w-full"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <p className="text-sm text-gray-500">
            *担当者よりメールにてご連絡させていただきます
          </p>
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded w-full"
        >
          予約する
        </button>
      </form>
    </main>
  );
}
