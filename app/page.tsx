"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function HomePage() {
  const [topImageUrl, setTopImageUrl] = useState("/hero-matcha.png");
  const [heroImageAlt, setHeroImageAlt] = useState("");
  const defaultGreeting =
    "の度、お茶会へ参加される皆様の利便性を考慮し、茶会予約のサイトの立ち上げをいたしました。茶会予約参加の登録をはじめ、茶会のご案内や過去の茶会のご紹介などサイトを通じて発信して参ります。\n皆様の役に立つツールとしてご活用いただければ幸いです。どうぞ、宜しくお願い致します。\n石州流野村派　第十三代\n悠瓢庵　堀 一孝";
  const [paragraphs, setParagraphs] = useState<string[]>(
    defaultGreeting.split("\n")
  );
  const [greetingImageUrl, setGreetingImageUrl] = useState("");

  useEffect(() => {
    const fetchSiteSettings = async () => {
      let ref = doc(db, "settings", "publicSite");
      let snap = await getDoc(ref);
      if (!snap.exists()) {
        ref = doc(db, "settings", "site");
        snap = await getDoc(ref);
      }
      if (snap.exists()) {
        const data = snap.data();
        if (data.heroImageUrl) setTopImageUrl(data.heroImageUrl);
        if (data.heroImageAlt) setHeroImageAlt(data.heroImageAlt);
        if (data.paragraphs) {
          setParagraphs(data.paragraphs as string[]);
        } else if (data.greetingLines) {
          setParagraphs(
            (data.greetingLines as { text: string }[]).map((l) => l.text)
          );
        } else if (data.greetingText) {
          setParagraphs((data.greetingText as string).split("\n"));
        }
        if (data.greetingImageUrl) setGreetingImageUrl(data.greetingImageUrl);
      }
    };

    fetchSiteSettings();
  }, []);

  return (
    <main>
      {/* トップページセクション */}
      <section className="relative min-h-[500px] sm:min-h-[600px]">
        <img
          src={topImageUrl}
          alt={heroImageAlt}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="relative z-10 text-white flex flex-col justify-center items-center px-4 min-h-[500px] sm:min-h-[600px]">
          <h1 className="text-5xl sm:text-6xl font-bold mb-4 drop-shadow-md font-serif">
            石州流野村派
          </h1>
          <p className="text-xl sm:text-2xl drop-shadow font-serif">
            茶会行事 予約サイト
          </p>
        </div>
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
        {paragraphs.map((text, idx) => (
          <p key={idx} className="text-lg mb-4 font-serif">
            {text}
          </p>
        ))}
      </section>

      {/* 各ページへのリンク */}
      <section className="py-12 mb-8 max-w-5xl mx-auto px-4 text-center">
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link href="/events">
            <button className="bg-[--color-primary] hover:bg-[--color-primary-hover] text-white py-2 px-6 rounded shadow font-serif">
              お茶会のご案内
            </button>
          </Link>
          <Link href="/posts/past">
            <button className="bg-[--color-primary] hover:bg-[--color-primary-hover] text-white py-2 px-6 rounded shadow font-serif">
              過去の茶会紹介
            </button>
          </Link>
          <Link href="/posts/letters">
            <button className="bg-[--color-primary] hover:bg-[--color-primary-hover] text-white py-2 px-6 rounded shadow font-serif">
              通信ページ
            </button>
          </Link>
        </div>
      </section>

      {/* 予約確認セクション */}
      <section className="py-8 bg-[--color-primary] border-t-4 border-[--color-border] text-center px-4 mt-8 max-w-5xl mx-auto text-white">
        <p className="mb-4 text-lg font-semibold font-serif">
          すでに予約済みの方はこちら
        </p>
        <Link href="/reservations/confirm">
          <button className="bg-[--color-primary-hover] hover:bg-[--color-border] text-white py-2 px-6 rounded shadow transition-colors font-serif border border-[--color-border]">
            予約の確認・変更はこちら
          </button>
        </Link>
      </section>
    </main>
  );
}
