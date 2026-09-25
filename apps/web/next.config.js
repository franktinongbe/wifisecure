/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  async rewrites() {
    const configuredApiOrigin = process.env.API_INTERNAL_URL?.trim();
    const defaultApiOrigin = process.env.NETLIFY
      ? 'https://wifisecure-1.onrender.com'
      : 'http://api:4000';
    const apiOrigin = (configuredApiOrigin || defaultApiOrigin).replace(/\/$/, '');
    return [{ source: '/api/:path*', destination: `${apiOrigin}/api/:path*` }];
  },
}

module.exports = nextConfig
