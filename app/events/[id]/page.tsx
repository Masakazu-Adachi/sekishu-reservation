"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
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
import { deltaToHtml } from "@/lib/quillDelta";
import { linkifyAndLineBreak } from "@/lib/text";
import { isUnsafeImageSrc, stripBlobImages } from "@/utils/url";


export default function EventDetailPage() {
  const { id } = useParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [guests, setGuests] = useState(1);
  const [selectedTime, setSelectedTime] = useState("");
  const [notes, setNotes] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!id) return;
      const docRef = doc(db, "events", id as string);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        const venues = data.venues || (data.venue ? [data.venue] : []);
        setEvent({ id: snapshot.id, ...data, venues } as Event);
      }
    };
    fetchEvent();
  }, [id]);

  const handleOpenConfirmation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;
    if ((event.seats?.length || 0) > 0 && !selectedTime) return;
    setShowConfirmation(true);
  };

  const handleSubmit = async () => {
    if (!event) return;
    if ((event.seats?.length || 0) > 0 && !selectedTime) return;
    setIsSubmitting(true);
    try {

    const seat = (event.seats as Seat[]).find((s) => s.time === selectedTime);
    if (event.seats && event.seats.length > 0) {
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
      address,
      guests,
      eventId: event.id,
      seatTime: selectedTime || "",
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
          <div style="font-family:'Noto Serif JP', serif; line-height:1.8; font-size:16px;">
            <p>${name} 様</p>
            <p>
              この度は「${event.title}」にお申し込みいただき、誠にありがとうございます。<br/>
              以下の内容でご予約を承りましたのでご確認ください。
            </p>
            <hr/>
            <div>
              <p><strong>会場：</strong>${(event.venues || []).join('<br/>')}</p>
              <p><strong>日付：</strong>${event.date
                .toDate()
                .toLocaleDateString('ja-JP')}</p>
              <p><strong>時間：</strong>${selectedTime || "時間指定なし"}</p>
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
            <p>ご不明点などございましたら、事務局の神田まで（メール：kandatoshi1@gmail.com）お気軽にご連絡ください。</p>
          </div>
        `,
      }),
    });

    await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: [
          "m-adachi@sustirel.com",
          "kandatoshi1@gmail.com",
          "linkshori@gmail.com",
        ],
        subject: `${event.title} の予約が入りました`,
        html: `
          
          <div style="font-family:'Noto Serif JP', serif; line-height:1.6;">
            <p>${name}様から予約がありました。</p>
            <ul>
              <li><strong>イベント:</strong> ${event.title}</li>
              <li><strong>会場:</strong> ${(event.venues || []).join('<br/>')}</li>
              <li><strong>日付:</strong> ${event.date
                .toDate()
                .toLocaleDateString("ja-JP")}</li>
              <li><strong>時間:</strong> ${selectedTime || "時間指定なし"}</li>
              <li><strong>人数:</strong> ${guests}名</li>
              <li><strong>メール:</strong> ${email}</li>
              <li><strong>住所:</strong> ${address || "(未入力)"}</li>
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
    setAddress("");
    setGuests(1);
    setSelectedTime("");
    setNotes("");
    } finally {
    setIsSubmitting(false);
    setShowConfirmation(false);
  }
  };

  if (!event) return <p className="p-6">読み込み中...</p>;

  return (
    <main className="p-6 max-w-xl mx-auto font-serif">
      {event.coverImageUrl && !isUnsafeImageSrc(event.coverImageUrl) && (
        <div className="mb-4">
          <Image
            src={event.coverImageUrl}
            alt={event.coverImageAlt || ""}
            width={800}
            height={600}
            className="w-full h-auto rounded"
          />
        </div>
      )}
      <h1 className="text-2xl font-bold mb-4">{event.title}</h1>
      {event.greetingDelta && (
        <div
          className="greeting-content mb-4"
          dangerouslySetInnerHTML={{ __html: stripBlobImages(deltaToHtml(event.greetingDelta)) }}
        />
      )}
      {event.venues && event.venues.length === 1 ? (
        <p>
          会場: <span dangerouslySetInnerHTML={{ __html: stripBlobImages(linkifyAndLineBreak(event.venues[0])) }} />
        </p>
      ) : event.venues && event.venues.length > 1 ? (
        <div className="mb-2">
          <p>会場:</p>
          <ul className="list-disc pl-5">
            {event.venues.map((v, i) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: stripBlobImages(linkifyAndLineBreak(v)) }} />
            ))}
          </ul>
        </div>
      ) : null}
      <p>日付: {event.date.toDate().toLocaleDateString("ja-JP")}</p>
      <p className="mb-4">説明: {event.description}</p>

      <form onSubmit={handleOpenConfirmation} className="space-y-4">
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
          <label className="block mb-1">住所（任意）</label>
          <input
            type="text"
            className="border p-2 w-full"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
        <div>
          <label className="block mb-1">参加人数</label>
          <select
            className="border p-2 w-full"
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            required
          >
            {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
              <option key={num} value={num}>
                {num}名
              </option>
            ))}
          </select>
        </div>
        {event.seats && event.seats.length > 0 && (
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
        )}
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
          className="bg-blue-600 text-white px-4 py-2 rounded w-full font-serif"
        >
          予約する
        </button>
      </form>
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded space-y-4 text-lg max-w-sm w-full">
            <h2 className="text-xl font-bold">ご予約内容の確認</h2>
            <p>会場: {(event?.venues || []).join(" / ")}</p>
            <p>日付: {event?.date.toDate().toLocaleDateString("ja-JP")}</p>
            {event?.seats && event.seats.length > 0 && (
              <p>時間: {selectedTime}</p>
            )}
            {address && <p>住所: {address}</p>}
            <p>人数: {guests}名</p>
            <p>合計金額: {(event?.cost || 0) * guests}円</p>
            <div className="flex gap-4 pt-2">
              <button
                type="button"
                className="bg-gray-500 text-white px-4 py-2 rounded flex-1 font-serif"
                onClick={() => setShowConfirmation(false)}
              >
                戻る（修正する）
              </button>
              <button
                type="button"
                className="bg-blue-600 text-white px-4 py-2 rounded flex-1 font-serif"
                onClick={handleSubmit}
              >
                この内容で予約する
              </button>
            </div>
          </div>
        </div>
      )}
      {isSubmitting && (
        <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-75 text-2xl z-50">
          予約手続き中...
        </div>
      )}
    </main>
  );
}
