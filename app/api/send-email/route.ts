import { NextResponse } from "next/server";
import { Resend } from "resend";

// .env.local に定義された APIキーを使って Resend を初期化
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  // ✅ 環境変数の読み込み確認（デバッグ用）
  console.log("✅ APIキー:", process.env.RESEND_API_KEY);

  try {
    const { to, subject, html } = await req.json();

    const data = await resend.emails.send({
      // ✅ テスト用の公式送信元（確実に通る）
      from: "onboarding@resend.dev",
      to,
      subject,
      html,
    });

    console.log("📨 メール送信成功:", data); // ✅ 送信成功のレスポンス内容
    return NextResponse.json({ status: "success", data });
  } catch (error) {
    console.error("❌ メール送信エラー:", error); // ✅ エラー出力
    return NextResponse.json({ status: "error", error });
  }
}
