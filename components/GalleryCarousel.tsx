"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import Image from "next/image";
import { isUnsafeImageSrc } from "@/utils/url";

interface ImageItem {
  src: string;
  alt?: string;
}

interface Props {
  images: ImageItem[];
  autoPlayMs?: number;
}

export default function GalleryCarousel({ images, autoPlayMs = 5000 }: Props) {
  const autoplay = useMemo(
    () =>
      Autoplay({
        delay: autoPlayMs,
        stopOnMouseEnter: true,
        stopOnInteraction: false,
      }),
    [autoPlayMs]
  );

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [autoplay]);
  const [selected, setSelected] = useState(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!emblaApi) return;

    setIsReady(true);
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();

    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi]);

  const buttonCls =
    "absolute top-1/2 -translate-y-1/2 bg-black/50 text-white w-8 h-8 rounded-full flex items-center justify-center";

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") scrollPrev();
      if (e.key === "ArrowRight") scrollNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [scrollPrev, scrollNext]);

  if (images.length === 0) {
    return null;
  }

  if (images.length === 1) {
    const [img] = images;
    if (isUnsafeImageSrc(img.src)) return null;

    return (
      <div className="max-w-screen-md">
        <div className="relative w-full h-[240px] sm:h-[360px] rounded-2xl shadow ring-1 ring-black/5 overflow-hidden">
          <Image
            src={img.src}
            alt={img.alt ?? ""}
            fill
            className="object-cover"
            onError={(e) => {
              e.currentTarget.src =
                "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
              e.currentTarget.alt = "読み込めませんでした";
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative max-w-screen-md rounded-2xl shadow ring-1 ring-black/5 overflow-hidden"
    >
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {images.map((img, i) => (
            <div className="flex-[0_0_100%]" key={i}>
              {isUnsafeImageSrc(img.src) ? null : (
                <div className="relative w-full h-[240px] sm:h-[360px]">
                  <Image
                    src={img.src}
                    alt={img.alt ?? ""}
                    fill
                    className="object-cover"
                    onError={(e) => {
                      e.currentTarget.src =
                        "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
                      e.currentTarget.alt = "読み込めませんでした";
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      {isReady && (
        <>
          <button
            type="button"
            onClick={scrollPrev}
            className={`${buttonCls} left-2`}
          >
            ‹
          </button>
          <button
            type="button"
            onClick={scrollNext}
            className={`${buttonCls} right-2`}
          >
            ›
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => scrollTo(i)}
                className={`w-2 h-2 rounded-full bg-white ${
                  selected === i ? "opacity-100" : "opacity-40"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

