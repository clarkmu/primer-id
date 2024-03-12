const runtimeCaching = require("next-pwa/cache");

const withPWA = require("next-pwa")({
  dest: "public",
  runtimeCaching,
  register: true,
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
let nextConfig = withPWA({
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "github.com",
        port: "",
      },
    ],
  },
});

module.exports = nextConfig;
