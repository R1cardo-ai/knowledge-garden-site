import type { NextConfig } from 'next';

const basePath = process.env.SITE_BASE_PATH ?? '';

const nextConfig: NextConfig = {
  basePath,
  // Cloudflare Pages serves this project at the domain root. Keep older
  // GitHub project-site URLs usable there by sending their prefix to the
  // equivalent root route. GitHub Pages uses the configured basePath instead.
  ...(basePath
    ? {}
    : {
        async redirects() {
          return [
            {
              source: '/knowledge-garden-site/:path*',
              destination: '/:path*',
              permanent: true,
              basePath: false,
            },
          ];
        },
      }),
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
