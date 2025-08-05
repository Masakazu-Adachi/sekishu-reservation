"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import type { GreetingLine } from "@/types";

export default function HomePage() {
  const [topImageUrl, setTopImageUrl] = useState("/hero-matcha.png");
  const defaultGreeting =
    "の度、お茶会へ参加される皆様の利便性を考慮し、茶会予約のサイトの立ち上げをいたしました。茶会予約参加の登録をはじめ、茶会のご案内や過去の茶会のご紹介などサイトを通じて発信して参ります。\n皆様の役に立つツールとしてご活用いただければ幸いです。どうぞ、宜しくお願い致します。\n石州流野村派　代表\n悠瓢庵　堀 一孝";
  const [greetingLines, setGreetingLines] = useState<GreetingLine[]>(
    defaultGreeting.split("\n").map((t) => ({
      text: t,
      align: "left",
      color: "#000000",
      font: "serif",
    }))
  );
  const [greetingImageUrl, setGreetingImageUrl] = useState("");

  useEffect(() => {
    const fetchSiteSettings = async () => {
      const ref = doc(db, "settings", "site");
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        if (data.heroImageUrl) setTopImageUrl(data.heroImageUrl);
        if (data.greetingLines) {
          setGreetingLines(data.greetingLines as GreetingLine[]);
        } else if (data.greetingText) {
          const split = (data.greetingText as string).split("\n");
          setGreetingLines(
            split.map((t: string) => ({
              text: t,
              align: "left",
              color: "#000000",
              font: "serif",
            }))
          );
        }
        if (data.greetingImageUrl) setGreetingImageUrl(data.greetingImageUrl);
      }
    };

    fetchSiteSettings();
  }, []);

  return (
    <main>
      {/* トップページセクション */}
      <section
        className="bg-cover bg-center min-h-[500px] sm:min-h-[600px] text-white flex flex-col justify-center items-center px-4"
        style={{ backgroundImage: `url('${topImageUrl}')` }}
      >
        <h1 className="text-5xl sm:text-6xl font-bold mb-4 drop-shadow-md font-serif">
          石州流野村派
        </h1>
        <p className="text-xl sm:text-2xl drop-shadow font-serif">茶会行事 予約サイト</p>
      </section>

      {/* ごあいさつセクション */}
      <section className="py-8 max-w-5xl mx-auto px-4">
        {greetingImageUrl && (
          <img
            src={greetingImageUrl}
            alt="ごあいさつ"
            className="w-full mb-4 rounded"
          />
        )}
        {greetingLines &&
          greetingLines.map((line, idx) => {
            const alignClass =
              line.align === "center"
                ? "text-center"
                : line.align === "right"
                ? "text-right"
                : "text-left";
            return (
              <p
                key={idx}
                className={`text-lg ${alignClass} font-serif`}
                style={{ color: line.color }}
              >
                {line.text}
              </p>
            );
          })}
      </section>

      {/* 各ページへのリンク */}
      <section className="py-12 mb-8 max-w-5xl mx-auto px-4 text-center">
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link href="/events">
            <button className="bg-[#C1A46F] hover:bg-[#A88C5A] text-white py-2 px-6 rounded shadow font-serif">
              お茶会のご案内
            </button>
          </Link>
          <Link href="/posts/past">
            <button className="bg-[#C1A46F] hover:bg-[#A88C5A] text-white py-2 px-6 rounded shadow font-serif">
              過去の茶会紹介
            </button>
          </Link>
          <Link href="/posts/letters">
            <button className="bg-[#C1A46F] hover:bg-[#A88C5A] text-white py-2 px-6 rounded shadow font-serif">
              通信ページ
            </button>
          </Link>
        </div>
      </section>

      {/* 予約確認セクション */}
      <section className="py-8 bg-[#F5F0E6] border-t-4 border-[#C1A46F] text-center px-4 mt-8 max-w-5xl mx-auto">
        <p className="mb-4 text-lg font-semibold text-[#8B5E3C] font-serif">
          すでに予約済みの方はこちら
        </p>
        <Link href="/reservations/confirm">
          <button className="bg-[#C1A46F] hover:bg-[#A88C5A] text-white py-2 px-6 rounded shadow transition-colors font-serif">
            予約の確認・変更はこちら
          </button>
        </Link>
      </section>
    </main>
  );
}
