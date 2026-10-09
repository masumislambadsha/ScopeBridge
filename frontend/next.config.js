/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const backend = process.env.BACKEND_URL ?? "http://localhost:4100";
    // First-party /api/* → backend (cookie stays first-party, §3.3).
    // Uploads + Socket.IO go direct via NEXT_PUBLIC_API_URL / NEXT_PUBLIC_SOCKET_URL.
    return [{ source: "/api/:path*", destination: `${backend}/api/:path*` }];
  },
};

module.exports = nextConfig;
