/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'd3h1d86sioogzh.cloudfront.net',
      },
      {
        protocol: 'https',
        hostname: 'd3h1d86sioogzh.cloudfront.net',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
};

export default nextConfig;
