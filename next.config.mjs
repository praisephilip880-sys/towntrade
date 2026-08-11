/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // ESLint is intentionally not part of the dependency set for this project.
    ignoreDuringBuilds: true,
  },
  experimental: {
    // The cloud-database worker (lib/db.worker.cjs) is spawned by filesystem
    // path at runtime, so the file-tracer must be told to ship it (and the ws
    // polyfill it uses) with every serverless function on Vercel.
    outputFileTracingIncludes: {
      '*': ['./lib/db.worker.cjs', './node_modules/ws/**/*'],
    },
  },
};

export default nextConfig;
