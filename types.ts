export interface Seat {
  time: string;
  capacity: number;
  reserved?: number;
}

import type { Timestamp } from "firebase/firestore";

export interface Event {
  id: string;
  title: string;
  /** 単一会場（レガシー） */
  venue?: string;
  /** 複数会場 */
  venues?: string[] | null;
  /** ごあいさつの Quill Delta */
  greetingDelta?: { ops: unknown[] } | null;
  date: Timestamp;
  description?: string;
  cost?: number;
  seats?: Seat[];
  /** カード用の画像 URL */
  coverImageUrl?: string;
  /** Storage 内のパス */
  coverImagePath?: string;
  /** カード画像の代替テキスト */
  coverImageAlt?: string;
}

export interface EventSummary {
  id: string;
  title: string;
  venue: string;
  venues?: string[] | null;
  date: string;
  cost?: number;
  description?: string;
  participants?: number;
  capacity?: number;
  coverImageUrl?: string;
  coverImageAlt?: string;
}

export interface Reservation {
  id: string;
  name: string;
  email: string;
  address?: string;
  guests: number;
  eventId: string;
  seatTime: string;
  notes?: string;
  createdAt: string;
  password?: string;
}

export interface GreetingLine {
  text: string;
  align: "left" | "center" | "right";
  color: string;
  font: "serif" | "sans" | "mono";
}

export interface PublicSiteSettings {
  heroImageUrl?: string;
  heroImageAlt?: string;
  heroImageStoragePath?: string;
  paragraphs?: string[];
}

export interface BlogPost {
  id: string;
  title: string;
  body?: string; // HTML 文字列（レガシー）
  bodyDelta?: { ops: unknown[] } | null; // Quill Delta JSON
  bodyHtmlUrl?: string | null;
  createdAt: string;
  imageUrl?: string;
  images?: string[];
}
