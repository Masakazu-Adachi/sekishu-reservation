This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Admin Authentication

The `/admin` area is protected by HTTP Basic authentication. Default credentials can be configured using environment variables:

```
ADMIN_USER=sekishuu
ADMIN_PASS=16731227
```

Create a `.env` file based on `.env.example` to customize these values.

## Email configuration

The application sends reservation confirmations using the [Resend](https://resend.com/) service. Set your Resend API key in the environment so that `/api/send-email` can send emails:

```bash
RESEND_API_KEY=your_resend_api_key
FROM_EMAIL=noreply@sustirel.com
```

By default the sender address is `onboarding@resend.dev`, but you can override it using the `FROM_EMAIL` variable as shown above.

## Firebase Storage の CORS 設定

`sekishu-nomura-ochakai.sustirel.com` からの画像アップロードを許可するには、以下の手順で CORS 設定を行います。

1. `cors.json` を編集し、許可するオリジンを追加します。

```json
[
  {
    "origin": [
      "http://localhost:3000",
      "https://sekishu-nomura-ochakai.sustirel.com"
    ],
    "method": ["GET", "POST", "PUT", "DELETE"],
    "maxAgeSeconds": 3600,
    "responseHeader": ["Content-Type"]
  }
]
```

2. `gsutil` を使って Firebase Storage に設定を反映します。

```bash
npm run set-cors
```

このコマンドは内部で `gsutil cors set cors.json gs://ochakai-reserve.appspot.com` を実行します。

## トップ画像の差し替え

管理画面の `/admin2/top-image` からトップページのヒーロー画像を更新できます。JPG/PNG 形式かつ 10MB 以内の画像を選び、alt テキストを入力して保存してください。アップロードが完了すると Firebase Storage に保存され、即座にサイトに反映されます。

## 挨拶文の編集

`/admin2/greeting` ではリッチテキストエディタを用いて挨拶文を編集できます。太字・斜体・下線・整列・リンク・画像挿入に対応しており、保存すると HTML として `settings/publicSite.greetingHtml` に保存されます。画像は JPG/PNG 形式（10MB 以内）に対応しています。
