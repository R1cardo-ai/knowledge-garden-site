import type { NextConfig } from 'next';

const basePath = process.env.SITE_BASE_PATH ?? '';

const nextConfig: NextConfig = {
  basePath,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
