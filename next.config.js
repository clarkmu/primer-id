const runtimeCaching = require("next-pwa/cache");

const withPWA = require("next-pwa")({
  dest: "public",
  runtimeCaching,
  register: true,
  disable: process.env.NODE_ENV !== "production",
});

/** @type {import('next').NextConfig} */
let nextConfig = withPWA({
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: true,
  },
});

module.exports = nextConfig;
