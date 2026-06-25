/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure the catalog datasets are bundled into the API serverless functions
  experimental: {
    outputFileTracingIncludes: {
      '/api/cigars': ['./src/data/cigars.json'],
      '/api/stores': ['./src/data/stores.json'],
      '/api/stores/nearby': ['./src/data/stores.json'],
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
  async headers() {
    // Baseline security headers applied to every response. (A strict CSP is left
    // as a follow-up since it needs per-source allow-listing for Mapbox, Supabase,
    // HLS, and inline styles without breaking the app.)
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(self), interest-cohort=()' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ];
  },
};

export default nextConfig;
