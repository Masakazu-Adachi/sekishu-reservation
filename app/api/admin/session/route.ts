import { NextResponse } from "next/server";

export async function POST() {
  const disabled = (process.env.DISABLE_UPLOAD_AUTH ?? "1") === "1";
  const envToken = process.env.ADMIN_UPLOAD_TOKEN?.trim();

  // 認可無効フラグONの場合はクッキー不要
  if (disabled) {
    return NextResponse.json({ ok: true });
  }

  // 従来運用：トークンがあればCookie発行、なければ500
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
