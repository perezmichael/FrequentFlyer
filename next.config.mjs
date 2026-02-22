/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        // Supabase storage for event flyers, guide covers, and venue images
        protocol: 'https',
        hostname: 'szjwuelaiawmqpbdubtp.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
