import type { Metadata } from "next";
import "./globals.css";
import "./react-dom-finddomnode-polyfill";

export const metadata: Metadata = {
  title: "石州流野村派 茶会行事 予約サイト",
  description: "石州流野村派の茶会行事を予約するサイトです",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;700&display=swap"
          rel="stylesheet"
        />
        {/* TODO: WOFF2 を追加して self-host に戻したら、この <link> と <style> を削除し、next/font/local に差し替える */}
        <style>{`
          :root {
            --font-serif-fallback: "Hiragino Mincho ProN", "Yu Mincho", "YuMincho", serif;
          }
          .with-noto-serif {
            font-family: "Noto Serif JP", var(--font-serif-fallback);
          }
        `}</style>
      </head>
      <body className={`with-noto-serif font-serif antialiased`}>
        {children}
      </body>
    </html>
  );
}
