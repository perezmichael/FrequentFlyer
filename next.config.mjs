/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.squarespace-cdn.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'dice-media.imgix.net',
      },
      {
        protocol: 'https',
        hostname: 'szjwuelaiawmqpbdubtp.supabase.co',
      }
    ],
  },
};

export default nextConfig;
