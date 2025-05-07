// lib/updateParticipantCount.ts
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
} from "firebase/firestore";

export const updateParticipantCount = async (eventId: string) => {
  const reservationsRef = collection(db, "reservations");
  const q = query(reservationsRef, where("eventId", "==", eventId));
  const snapshot = await getDocs(q);

  let total = 0;
  snapshot.forEach((doc) => {
    const data = doc.data();
    total += Number(data.numberOfParticipants || 0);
  });

  const eventRef = doc(db, "events", eventId);
  await updateDoc(eventRef, { currentParticipants: total });
};
