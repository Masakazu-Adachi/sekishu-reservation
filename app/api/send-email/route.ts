import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// 送信元アドレスを環境変数から取得（未設定時はResendのデフォルトを使用）
const FROM_EMAIL = process.env.FROM_EMAIL || "onboarding@resend.dev";

export async function POST(req: Request) {
  console.log("✅ APIキー:", process.env.RESEND_API_KEY);
  console.log("✅ 送信元:", FROM_EMAIL);

  try {
    const { to, subject, html } = await req.json();

    if (!to) {
      throw new Error("送信先メールアドレスが指定されていません");
    }

    // ✅ Freeプラン対応の送信設定
    const from = FROM_EMAIL;

    // HTML未指定ならデフォルトに置き換え
    const htmlBody =
      html ||
      `
        <div style="font-family: sans-serif; line-height: 1.6;">
          <p>これはテストメールです。</p>
          <p>Resendの設定確認用として送信されました。</p>
        </div>
      `;

    const result = await resend.emails.send({
      from,
      to,
      subject: subject || "Resendテストメール",
      html: htmlBody,
    });

    console.log("📨 メール送信結果:", result);

    // ✅ Resendエラーも返すように明示
    if (result.error) {
      throw new Error(JSON.stringify(result.error));
    }

    return NextResponse.json({ status: "success", data: result });
  } catch (error) {
    console.error("❌ メール送信エラー:", error);
    return NextResponse.json({ status: "error", error: String(error) });
  }
}
