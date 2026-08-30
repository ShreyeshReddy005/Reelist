/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Enable support for rendering movie poster images from standard sources safely
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
      },
      {
        protocol: 'https',
        hostname: 'm.media-amazon.com',
      },
    ],
  },
  experimental: {
  },
  async rewrites() {
    return [
      {
        source: '/__/auth/:path*',
        destination: 'https://reelist-9d75b.firebaseapp.com/__/auth/:path*',
      },
    ];
  },
};

export default nextConfig;
