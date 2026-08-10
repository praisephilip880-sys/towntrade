/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // ESLint is intentionally not part of the dependency set for this project.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
