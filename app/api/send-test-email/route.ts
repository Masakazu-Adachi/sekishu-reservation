// /app/api/send-test-email/route.ts
import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { to, subject, html } = await req.json();

    const htmlBody =
      html ||
      `<div><p>これはテストメールです。</p><p>Resendから送信されました。</p></div>`;

    const result = await resend.emails.send({
      from: "onboarding@resend.dev",
      to,
      subject: subject || "テストメール",
      html: htmlBody,
    });

    console.log("📨 メール送信成功:", result);
    return NextResponse.json({ status: "success", data: result });
  } catch (error) {
    console.error("❌ メール送信失敗:", error);
    return NextResponse.json({ status: "error", error: String(error) });
  }
}
