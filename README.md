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
