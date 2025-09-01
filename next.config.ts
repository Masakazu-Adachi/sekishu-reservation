import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // ✅ outputは指定しない（デフォルトのまま）
  reactStrictMode: true,
  experimental: {
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
  webpack: (config: any, { isServer }: { isServer: boolean }) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "quill$": require.resolve("quill"),
    };
    if (!isServer) {
      config.resolve.alias["react-dom$"] = path.resolve(
        __dirname,
        "polyfills/react-dom-default.ts"
      );
    }
    return config;
  },
};

export default nextConfig;
