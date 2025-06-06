import { db } from "./firebase";
import type { Seat } from "@/types";
import {
  doc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  getDoc,
} from "firebase/firestore";

// 特定のイベントの各時間枠ごとの予約数（reserved）を集計し直す
export const updateSeatReservedCount = async (eventId: string) => {
  const eventRef = doc(db, "events", eventId);
  const eventSnap = await getDoc(eventRef);
  if (!eventSnap.exists()) return;

  const eventData = eventSnap.data();
  const seats = eventData?.seats || [];

  const q = query(
    collection(db, "reservations"),
    where("eventId", "==", eventId)
  );
  const snapshot = await getDocs(q);

  const reservedMap: Record<string, number> = {};
  snapshot.forEach((doc) => {
    const data = doc.data();
    if (!reservedMap[data.seatTime]) {
      reservedMap[data.seatTime] = 0;
    }
    reservedMap[data.seatTime] += data.guests || 0;
  });

  const updatedSeats = (seats as Seat[]).map((seat) => ({
    ...seat,
    reserved: reservedMap[seat.time] || 0,
  }));

  await updateDoc(eventRef, { seats: updatedSeats });
};
