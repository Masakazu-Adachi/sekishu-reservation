import LinkBackToHome from "@/components/LinkBackToHome";
import ContactFormButton from "@/components/ContactFormButton";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "お問い合わせ | 石州流野村派 茶会行事 予約サイト",
  description: "お問い合わせページです",
  openGraph: {
    title: "お問い合わせ | 石州流野村派 茶会行事 予約サイト",
    description: "お問い合わせページです",
  },
  twitter: {
    title: "お問い合わせ | 石州流野村派 茶会行事 予約サイト",
    description: "お問い合わせページです",
  },
};

export default function ContactPage() {
  return (
    <main className="p-6 max-w-5xl mx-auto font-serif">
      <LinkBackToHome />
      <h1 className="text-2xl font-bold mb-6 text-center font-serif">お問い合わせ</h1>
      <div className="text-center">
        <ContactFormButton />
      </div>
    </main>
  );
}
