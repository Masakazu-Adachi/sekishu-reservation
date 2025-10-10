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
import { stripBlobImages } from "@/utils/url";
import { stripMetaLines } from "@/lib/stripMetaLines";
import { preserveLeadingSpaces } from "@/lib/preserveLeadingSpaces";
import { ensureLineBreaks } from "@/lib/ensureLineBreaks";

export default function EventDetailPage() {
  const { id } = useParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [address, setAddress] = useState("");
  const [guests, setGuests] = useState(1);
  const [companionNames, setCompanionNames] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState("");
  const [notes, setNotes] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const escapeHtml = (unsafe: string) =>
    unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const formatVenuesForEmail = (venues?: string[] | null) => {
    const list = Array.isArray(venues)
      ? venues.map((venue) => venue.trim()).filter((venue) => venue)
      : [];
    if (!list.length) return "(未設定)";
    return list
      .map((venue) =>
        escapeHtml(venue.replace(/\r\n?/g, "\n")).replace(/\n/g, "<br/>")
      )
      .join("<br/>");
  };

  useEffect(() => {
    const fetchEvent = async () => {
      if (!id) return;
      const docRef = doc(db, "events", id as string);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        const venues = data.venues || (data.venue ? [data.venue] : []);
        setEvent({
          id: snapshot.id,
          ...data,
          venues,
          greeting: preserveLeadingSpaces(data.greeting || ""),
        } as Event);
      }
    };
    fetchEvent();
  }, [id]);

  const handleOpenConfirmation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;
    if ((event.seats?.length || 0) > 0 && guests > 0 && !selectedTime) return;
    if (email !== confirmEmail) {
      alert("メールアドレスが一致しません");
      return;
    }
    setShowConfirmation(true);
  };

  const handleSubmit = async () => {
    if (!event) return;
    if ((event.seats?.length || 0) > 0 && guests > 0 && !selectedTime) return;
    if (email !== confirmEmail) {
      alert("メールアドレスが一致しません");
      return;
    }
    setIsSubmitting(true);
    try {
      if (event.seats && event.seats.length > 0 && guests > 0) {
        const seat = (event.seats as Seat[]).find((s) => s.time === selectedTime);
        if (!seat) {
          alert("選択された時間枠または席が無効です");
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
    const venueHtmlForEmail = formatVenuesForEmail(event.venues);

    await addDoc(collection(db, "reservations"), {
      name,
      email,
      address,
      guests,
      companions: companionNames,
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
              <p><strong>会場：</strong><br/>${venueHtmlForEmail}</p>
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
            <p>当日お会いできますことを、心より楽しみにしております。</p>
            <p>ご不明点などございましたら、事務局まで（メール：sekishuryu-nomuraha@googlegroups.com）お気軽にご連絡ください。</p>
          </div>
        `,
      }),
    });

    const adminEmailsSnap = await getDoc(
      doc(db, "settings", "notificationEmails")
    );
    const adminEmails =
      adminEmailsSnap.exists() &&
      Array.isArray(adminEmailsSnap.data().emails)
        ? adminEmailsSnap.data().emails
        : [];

    if (adminEmails.length > 0) {
      await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: adminEmails,
          subject: `${event.title} の予約が入りました`,
          html: `

          <div style="font-family:'Noto Serif JP', serif; line-height:1.6;">
            <p>${name}様から予約がありました。</p>
            <ul>
              <li><strong>イベント:</strong> ${event.title}</li>
              <li><strong>会場:</strong><br/>${venueHtmlForEmail}</li>
              <li><strong>日付:</strong> ${event.date
                .toDate()
                .toLocaleDateString("ja-JP")}</li>
              <li><strong>時間/席:</strong> ${selectedTime || "時間指定なし"}</li>
              <li><strong>人数:</strong> ${guests}名</li>
              <li><strong>メール:</strong> ${email}</li>
              <li><strong>住所:</strong> ${address || "(未入力)"}</li>
              <li><strong>同席者:</strong> ${
                companionNames.join("、") || "(なし)"
              }</li>
              <li><strong>合計金額:</strong> ${totalCost}円</li>
              <li><strong>自由記述:</strong> ${notes || "(なし)"}</li>
            </ul>
          </div>

        `,
        }),
      });
    }

    alert("予約が完了しました！確認メールをご確認ください。");
    setName("");
    setEmail("");
    setConfirmEmail("");
    setAddress("");
    setGuests(1);
    setCompanionNames([]);
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
      <h1 className="text-2xl font-bold mb-4">{event.title}</h1>
      {event.greeting && (
        <div
          className="greeting-content mb-4 greeting-html"
          dangerouslySetInnerHTML={{
            __html: ensureLineBreaks(
              stripBlobImages(stripMetaLines(event.greeting))
            ),
          }}
        />
      )}

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
          <p className="text-sm text-gray-600 mb-1">
            キャリアメール（docomo, au, softbank等）をご利用の場合、迷惑メール設定により確認メールが届かないことがありますため、Gmail等のアドレスをご利用を推奨しております。予約後に確認メールが届かない場合は
            <a
              href="mailto:sekishuryu-nomuraha@googlegroups.com"
              className="text-blue-600 underline"
            >
              sekishuryu-nomuraha@googlegroups.com
            </a>
            までご連絡ください。
          </p>
          <input
            type="email"
            className="border p-2 w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block mb-1">メールアドレス（再確認）</label>
          <input
            type="email"
            className="border p-2 w-full"
            value={confirmEmail}
            onChange={(e) => setConfirmEmail(e.target.value)}
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
            onChange={(e) => {
              const count = Number(e.target.value);
              setGuests(count);
              setCompanionNames((prev) =>
                Array.from({ length: Math.max(count - 1, 0) }, (_, i) => prev[i] || "")
              );
              if (count === 0) {
                setSelectedTime("");
              }
            }}
            required
          >
            <option value={0}>0名</option>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
              <option key={num} value={num}>
                {num}名
              </option>
            ))}
          </select>
        </div>
        {guests > 1 && (
          <div>
            <label className="block mb-1">同席者のお名前</label>
            {Array.from({ length: guests - 1 }).map((_, i) => (
              <input
                key={i}
                type="text"
                className="border p-2 w-full mb-2"
                value={companionNames[i] || ""}
                onChange={(e) => {
                  const names = [...companionNames];
                  names[i] = e.target.value;
                  setCompanionNames(names);
                }}
                required
              />
            ))}
            <p className="text-sm text-gray-500">
              ご一緒に参加される方のお名前を記載ください。
            </p>
          </div>
        )}
        {event.seats && event.seats.length > 0 && guests > 0 && (
          <div>
            <label className="block mb-1">時間枠/席選択</label>
            <select
              className="border p-2 w-full"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              required={guests > 0}
            >
              <option value="">時間または席を選択</option>
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
            <p>日付: {event?.date.toDate().toLocaleDateString("ja-JP")}</p>
            {event?.seats && event.seats.length > 0 && (
              <p>時間/席: {selectedTime}</p>
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
