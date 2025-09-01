import { NextResponse } from "next/server";

export async function POST() {
  const envToken = process.env.ADMIN_UPLOAD_TOKEN?.trim();
  if (!envToken) {
    console.warn("ADMIN_UPLOAD_TOKEN is not set");
    return NextResponse.json({ error: "No token configured" }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: "admin_upload_token",
    value: envToken,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return res;
}
