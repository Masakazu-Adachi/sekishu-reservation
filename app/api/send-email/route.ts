import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  console.log("✅ APIキー:", process.env.RESEND_API_KEY);

  try {
    const { subject, html } = await req.json();

    // ✅ Freeプラン対応の送信設定
    const to = "m-adachi@sustirel.com"; // 確実に届くアドレス
    const from = "onboarding@resend.dev"; // 認証不要な送信元

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
