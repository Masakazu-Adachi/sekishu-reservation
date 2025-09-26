"use client";

import { useEffect, useState } from "react";

import GalleryCarousel from "@/components/GalleryCarousel";
import LinkBackToAdmin2Top from "@/components/LinkBackToAdmin2Top";
import { db } from "@/lib/firebase";
import type { HeroImageSetting } from "@/types";
import { doc, getDoc } from "firebase/firestore";

type CarouselImage = {
  src: string;
  alt?: string;
};

export default function TopImagePreviewPage() {
  const [images, setImages] = useState<CarouselImage[]>([]);

  useEffect(() => {
    const fetchImages = async () => {
      let ref = doc(db, "settings", "publicSite");
      let snap = await getDoc(ref);
      if (!snap.exists()) {
        ref = doc(db, "settings", "site");
        snap = await getDoc(ref);
      }
      if (!snap.exists()) return;

      const data = snap.data();
      const heroImages = Array.isArray(data.heroImages)
        ? (data.heroImages as HeroImageSetting[])
        : [];

      if (heroImages.length > 0) {
        setImages(
          heroImages
            .filter((img) => typeof img?.url === "string")
            .map((img) => ({ src: img.url, alt: img.alt }))
        );
        return;
      }

      if (typeof data.heroImageUrl === "string" && data.heroImageUrl) {
        setImages([
          {
            src: data.heroImageUrl,
            alt: typeof data.heroImageAlt === "string" ? data.heroImageAlt : undefined,
          },
        ]);
      }
    };

    fetchImages();
  }, []);

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-6">
      <LinkBackToAdmin2Top />
      <div>
        <h1 className="text-2xl font-bold mb-2">トップ画像カルーセル プレビュー</h1>
        <p className="text-sm text-gray-600">
          現在登録されている画像をお客様向けの表示に近い形で確認できます。
        </p>
      </div>
      {images.length > 0 ? (
        <GalleryCarousel images={images} autoPlayMs={5000} />
      ) : (
        <p className="text-sm text-gray-500">
          まだ画像が登録されていません。設定ページから画像を追加してください。
        </p>
      )}
    </main>
  );
}
