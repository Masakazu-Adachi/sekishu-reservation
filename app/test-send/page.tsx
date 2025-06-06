"use client";


export default function TestSendPage() {
  const send = async () => {
    const res = await fetch("/api/send-test-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: "m-adachi@sustirel.com", // ✅ Freeプランで確実に届くアドレス
        subject: "Resendテストメール",
        html: "<p>これはテストです</p>",
      }),
    });

    const result = await res.json();
    console.log("📨 送信結果:", result);
  };

  return (
    <main className="p-8">
      <h1 className="text-xl font-bold mb-4">Resend テスト送信</h1>
      <button
        onClick={send}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        テストメールを送信
      </button>
    </main>
  );
}
