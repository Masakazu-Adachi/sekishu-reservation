import { db } from "@/lib/firebase";
import { doc, deleteDoc, getDoc } from "firebase/firestore";
import { updateGuestCount } from "@/lib/updateParticipantCount";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { id } = await req.json();

  const reservationRef = doc(db, "reservations", id);
  const snapshot = await getDoc(reservationRef);

  if (!snapshot.exists()) {
    return NextResponse.json({ status: "error", message: "予約が見つかりません" });
  }

  const eventId = snapshot.data().eventId;

  await deleteDoc(reservationRef);
  await updateGuestCount(eventId);

  return NextResponse.json({ status: "success" });
}
