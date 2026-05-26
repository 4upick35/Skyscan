import type {NextConfig} from 'next';

/**
 * SkyScan Web Configuration
 * - STANDALONE: for Docker / Node.js server deployment
 * - EXPORT: for Capacitor static APK build
 */
const isExportBuild = process.env.NEXT_EXPORT === 'true';

const nextConfig: NextConfig = {
  output: isExportBuild ? 'export' : 'standalone',
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  ...(isExportBuild && {
    trailingSlash: true,
    skipTrailingSlashRedirect: true,
  }),
};

export default nextConfig;
