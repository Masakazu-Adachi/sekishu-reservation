"use client";

import React from "react";
import parse, { Element, domToReact, DOMNode } from "html-react-parser";
import GalleryCarousel from "./GalleryCarousel";

interface Props {
  html: string;
  autoPlayMs?: number;
}

export default function RichHtml({ html, autoPlayMs }: Props) {
  return (
    <>{
      parse(html, {
        replace: node => {
          if (node instanceof Element && node.name === "div") {
            const attrs = node.attribs || {};
            const cls = attrs.class || "";
            const isGallery =
              "data-gallery" in attrs || cls.split(/\s+/).includes("image-group");
            if (isGallery) {
              const imgs = (node.children || []).filter(
                c => c instanceof Element && c.name === "img"
              ) as Element[];
              const images = imgs.map(img => ({
                src: img.attribs.src,
                alt: img.attribs.alt,
              }));
              if (images.length > 1) {
                return <GalleryCarousel images={images} autoPlayMs={autoPlayMs} />;
              }
              return <>{domToReact(node.children as DOMNode[])}</>;
            }
          }
          return undefined;
        },
      })
    }</>
  );
}

