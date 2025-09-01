import { NextResponse } from "next/server";

export async function POST() {
  const token = process.env.ADMIN_UPLOAD_TOKEN?.trim();
  if (!token) {
    return NextResponse.json(
      { error: "ADMIN_UPLOAD_TOKEN is not set" },
      { status: 500 }
    );
  }
  const res = new NextResponse(null, { status: 204 });
  res.cookies.set({
    name: "admin_upload_token",
    value: token,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return res;
}
