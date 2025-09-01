"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { INK_BUTTON } from "@/components/ui/buttonStyles";

export default function HomePage() {
  const [topImageUrl, setTopImageUrl] = useState("/hero-matcha.png");
  const [heroImageAlt, setHeroImageAlt] = useState("");
  const defaultGreeting =
    "の度、お茶会へ参加される皆様の利便性を考慮し、茶会予約のサイトの立ち上げをいたしました。茶会予約参加の登録をはじめ、茶会のご案内や過去の茶会のご紹介などサイトを通じて発信して参ります。\n皆様の役に立つツールとしてご活用いただければ幸いです。どうぞ、宜しくお願い致します。\n石州流野村派　第十三代\n悠瓢庵　堀 一孝";
  const [paragraphs, setParagraphs] = useState<string[]>(
    defaultGreeting.split("\n")
  );
  const [greetingImageUrl, setGreetingImageUrl] = useState("");
  const [greetingHtml, setGreetingHtml] = useState("");

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
        if (data.greetingHtml) {
          setGreetingHtml(data.greetingHtml as string);
        } else if (data.paragraphs) {
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
        {greetingHtml ? (
          <div
            className="text-lg font-serif space-y-4 [&_a]:text-blue-600 [&_a]:underline"
            dangerouslySetInnerHTML={{ __html: greetingHtml }}
          />
        ) : (
          paragraphs.map((text, idx) => (
            <p key={idx} className="text-lg mb-4 font-serif">
              {text}
            </p>
          ))
        )}
      </section>

      {/* 各ページへのリンク */}
      <section className="py-12 max-w-5xl mx-auto px-4 mb-8 sm:mb-10">
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 max-w-4xl mx-auto">
          <Link href="/events" className={`${INK_BUTTON} w-full`}>
            お茶会のご案内
          </Link>
          <Link href="/posts/past" className={`${INK_BUTTON} w-full`}>
            過去の茶会紹介
          </Link>
          <Link href="/posts/letters" className={`${INK_BUTTON} w-full`}>
            お問い合わせ
          </Link>
        </div>
      </section>

      {/* 予約確認セクション */}
      <section className="mt-10 max-w-4xl w-full mx-auto text-center">
        <h3 className="text-sm sm:text-base">すでに予約済みの方はこちら</h3>
        <Link
          href="/reservations/confirm"
          className={`${INK_BUTTON} mx-auto mt-3`}
        >
          予約の確認・変更はこちら
        </Link>
      </section>
    </main>
  );
}
