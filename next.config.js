/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
      // Cloudflare R2 direct endpoint (server-side uploads; requires auth in browser
      // unless bucket is public — set R2_PUBLIC_BASE_URL in production).
      {
        protocol: 'https',
        hostname: '*.r2.cloudflarestorage.com',
      },
      // Cloudflare R2.dev public subdomain (enabled in R2 bucket settings).
      {
        protocol: 'https',
        hostname: '*.r2.dev',
      },
      // TODO: add custom domain entry when Ahmed binds media.gatewaytooman.com.
      // Example:
      // {
      //   protocol: 'https',
      //   hostname: 'media.gatewaytooman.com',
      // },
    ],
  },
  // I-5: Security headers applied to all routes.
  // NOTE: Content-Security-Policy is intentionally deferred — a strict CSP
  // requires careful tuning to avoid breaking Pexels images, Google OAuth,
  // and Framer Motion inline styles. That is a separate, tested follow-up.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
