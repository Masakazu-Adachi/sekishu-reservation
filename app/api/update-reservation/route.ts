import { db } from "@/lib/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { updateParticipantCount } from "@/lib/updateParticipantCount";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { id, numberOfParticipants } = await req.json();

  const reservationRef = doc(db, "reservations", id);
  const snapshot = await getDoc(reservationRef);

  if (!snapshot.exists()) {
    return NextResponse.json({ status: "error", message: "予約が見つかりません" });
  }

  const data = snapshot.data();
  const eventId = data.eventId;

  await updateDoc(reservationRef, {
    numberOfParticipants,
  });

  await updateParticipantCount(eventId);

  return NextResponse.json({ status: "success" });
}

