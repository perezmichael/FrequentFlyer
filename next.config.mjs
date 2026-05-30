/** @type {import('next').NextConfig} */
const nextConfig = {
  // react-leaflet v4 is incompatible with React StrictMode's dev-only double
  // mount: it re-runs MapContainer's init on a node that already has a Leaflet
  // instance, throwing "Map container is already initialized." Disabling Strict
  // Mode avoids this; production behavior is unchanged (it never double-invokes).
  reactStrictMode: false,
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
