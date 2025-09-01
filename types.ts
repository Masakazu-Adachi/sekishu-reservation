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
  /** ごあいさつの HTML */
  greeting?: string | null;
  date: Timestamp;
  description?: string;
  cost?: number;
  seats?: Seat[];
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
  /** greeting 内の先頭画像 URL */
  thumbnailUrl?: string;
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
