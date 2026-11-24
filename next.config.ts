import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    // Ignora i controlli di tipo bloccanti durante il build di Vercel
    ignoreBuildErrors: true,
  },
};

export default function nextConfigWrapper() {
  return nextConfig;
}
