import type { NextConfig } from "next";

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
  webpack: (config: any) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'quill$': require.resolve('quill'),
    };
    return config;
  },
};

export default nextConfig;
