import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));

// For GitHub Pages project sites the app is served under /<repo>. The deploy
// workflow sets PAGES_BASE_PATH=/nyzk-site; locally it's empty so `next dev`
// keeps working at the root.
const basePath = process.env.PAGES_BASE_PATH || "";

const nextConfig: NextConfig = {
  // Static HTML export → hostable on GitHub Pages (no Node server).
  // Live Kick/BotRix data is baked at build time and refreshed by the
  // scheduled GitHub Action (see .github/workflows/deploy.yml).
  output: "export",
  basePath,
  trailingSlash: true,
  // Pin the workspace root to this project (the parent folder is its own git repo).
  turbopack: { root },
  images: {
    // No image optimizer on static hosting.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "*.kick.com" },
      { protocol: "https", hostname: "files.kick.com" },
      { protocol: "https", hostname: "clips.kick.com" },
    ],
  },
};

export default nextConfig;
