import { OPTIMIZED_IMAGE_HOSTS } from './src/lib/imageHosts.mjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // react-leaflet v4 is incompatible with React StrictMode's dev-only double
  // mount: it re-runs MapContainer's init on a node that already has a Leaflet
  // instance, throwing "Map container is already initialized." Disabling Strict
  // Mode avoids this; production behavior is unchanged (it never double-invokes).
  reactStrictMode: false,
  images: {
    // Derived from the same list SmartImage checks, so the two can't drift —
    // a host the component optimizes but the config doesn't know about would
    // throw on a live page. See src/lib/imageHosts.mjs.
    remotePatterns: OPTIMIZED_IMAGE_HOSTS.map(h => ({
      protocol: 'https',
      hostname: h.hostname,
      ...(h.pathname ? { pathname: h.pathname } : {}),
    })),
  },
};

export default nextConfig;
