import { NextResponse } from "next/server";
import { headers as nextHeaders } from "next/headers";

export async function POST() {
  const envToken = process.env.ADMIN_UPLOAD_TOKEN?.trim();
  if (!envToken) {
    console.warn("ADMIN_UPLOAD_TOKEN is not set");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const headerToken = (await nextHeaders())
    .get("x-admin-upload-token")
    ?.trim();
  if (headerToken !== envToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const res = new NextResponse(null, { status: 204 });
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
