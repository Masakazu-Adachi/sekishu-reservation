import { NextResponse } from "next/server";
import { headers as nextHeaders } from "next/headers";

export async function POST() {
  const envToken = process.env.ADMIN_UPLOAD_TOKEN?.trim();
  if (!envToken) {
    return NextResponse.json(
      { error: "ADMIN_UPLOAD_TOKEN is not set" },
      { status: 500 }
    );
  }

  const headerToken = (await nextHeaders())
    .get("x-admin-upload-token")
    ?.trim();
  if (!headerToken) {
    return NextResponse.json(
      { error: "x-admin-upload-token header is required" },
      { status: 400 }
    );
  }
  if (headerToken !== envToken) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true }, { status: 200 });
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
