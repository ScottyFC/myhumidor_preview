/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure the catalog datasets are bundled into the API serverless functions
  experimental: {
    outputFileTracingIncludes: {
      '/api/cigars': ['./src/data/cigars.json'],
      '/api/stores': ['./src/data/stores.json'],
    },
  },
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
