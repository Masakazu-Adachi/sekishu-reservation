export interface Seat {
  time: string;
  capacity: number;
  reserved?: number;
}

import type { Timestamp } from "firebase/firestore";

export interface Event {
  id: string;
  title: string;
  venue: string;
  date: Timestamp;
  description?: string;
  cost?: number;
  seats?: Seat[];
  imageUrl?: string;
}

export interface EventSummary {
  id: string;
  title: string;
  venue: string;
  date: string;
  cost?: number;
  description?: string;
  participants?: number;
  capacity?: number;
  imageUrl: string;
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
