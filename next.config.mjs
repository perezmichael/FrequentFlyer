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

    /**
     * 31 days. Next 14 defaults this to SIXTY SECONDS, which is the single
     * most expensive line in the whole project.
     *
     * With a 60s TTL every optimized variant expires a minute after it's made,
     * so the next request re-fetches the original from Supabase and re-encodes
     * it from scratch. ~1,000 flyers at ~4 variants each should need about
     * 4,000 transformations ever; a fortnight of this produced 98,200 and 1.36M
     * cache writes — $10.51, about two thirds of the bill, nearly all of it the
     * same handful of images being rebuilt on a loop.
     *
     * A long TTL is safe here because flyers don't change. A past event's
     * artwork is frozen by definition, and shared flyers are already
     * content-addressed by SHA (flyers/shared/<sha1-16>.<ext>) — a different
     * image is a different URL, so nothing stale can be served under an old one.
     */
    minimumCacheTTL: 2_678_400,

    /**
     * Next's default ladder ends [..., 1920, 2048, 3840]. Measured against the
     * real DOM, nothing here asks for those: the picks strip renders at 200px,
     * a feed card at 381px, and the detail hero at 560px — so even at 3x DPR
     * the largest useful width is ~1200. The top two rungs were pure cost,
     * generated and stored for widths no visitor ever requested.
     *
     * 1920 stays as the ceiling for the full-bleed guide hero (sizes="100vw").
     */
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  },
};

export default nextConfig;
