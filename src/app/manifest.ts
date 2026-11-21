import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'GOS — Glaring Operating System',
    short_name: 'GOS',
    description: 'Strategic & Operation Advisors Infrastructure',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#050B14',
    theme_color: '#FF5500',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
