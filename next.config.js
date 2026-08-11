/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // NOTE: DO NOT add sensitive keys here — this exposes them to the browser.
  // Server-side env vars are accessed via process.env in API routes and server components only.
};

module.exports = nextConfig;
