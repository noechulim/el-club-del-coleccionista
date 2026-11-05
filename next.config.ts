import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export", // <-- Genera la carpeta 'out' para Cloudflare Pages
  allowedDevOrigins: [
    "192.168.1.*",
    "192.168.56.*",
  ],

  images: {
    unoptimized: true, // <-- Requerido para 'output: export' en Cloudflare Pages
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      {
        protocol: "https",
        hostname: "**.supabase.in",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
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