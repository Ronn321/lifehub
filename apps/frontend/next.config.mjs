/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    typedRoutes: false,
  },
  async rewrites() {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3001/api';
    return [
      { source: '/api/proxy/:path*', destination: `${apiBase}/:path*` },
    ];
  },
};

export default nextConfig;
