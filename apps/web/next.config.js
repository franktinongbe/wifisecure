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
    if (process.env.NETLIFY && !configuredApiOrigin) {
      throw new Error('API_INTERNAL_URL doit pointer vers le serveur Express pour un déploiement Netlify.');
    }
    const apiOrigin = (configuredApiOrigin || 'http://api:4000').replace(/\/$/, '');
    return [{ source: '/api/:path*', destination: `${apiOrigin}/api/:path*` }];
  },
}

module.exports = nextConfig
