import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'GOS — Glaring Operating System',
    short_name: 'GOS',
    description: 'Piattaforma operativa e commerciale GOS',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#030712',
    theme_color: '#FF5500',
    icons: [
      {
        src: '/favicon.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/favicon.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
