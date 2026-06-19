/** @type {import('next').NextConfig} */
const nextConfig = {
  // @react-pdf/renderer uses Node.js APIs — exclude from client bundle
  experimental: {
    serverComponentsExternalPackages: ["@react-pdf/renderer"],
  },
};
export default nextConfig;
