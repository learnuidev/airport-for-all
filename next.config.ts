import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // article.md is read at build time by src/lib/article.ts; keep it out of the
    // client bundle and ensure the file is traced for server output.
    optimizePackageImports: [],
  },
};

export default nextConfig;
