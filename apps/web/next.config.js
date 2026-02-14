/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@ml-saas/shared', '@ml-saas/ui'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'http2.mlstatic.com',
      },
      {
        protocol: 'https',
        hostname: '*.mlstatic.com',
      },
      {
        protocol: 'https',
        hostname: '*.mercadolibre.com',
      },
      {
        protocol: 'https',
        hostname: '*.mercadolivre.com.br',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
