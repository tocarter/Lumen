import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Electron packages a Node server; Vercel does not want standalone output.
  output: process.env.VERCEL ? undefined : "standalone",
  devIndicators: false,
};

export default nextConfig;
