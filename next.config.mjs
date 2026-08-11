/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // ESLint is intentionally not part of the dependency set for this project.
    ignoreDuringBuilds: true,
  },
  experimental: {
    // The cloud-database worker is spawned as an inline eval string, so its
    // runtime imports ('ws' for the WebSocket polyfill) are invisible to the
    // file tracer — explicitly ship them with every serverless function.
    outputFileTracingIncludes: {
      '*': ['./node_modules/ws/**/*'],
    },
  },
};

export default nextConfig;
