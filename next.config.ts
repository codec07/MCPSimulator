import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Kept exactly as the Next 16 scaffold generated it: Tailwind v4 is wired in
  // through the Turbopack CSS loader rather than a PostCSS config.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
