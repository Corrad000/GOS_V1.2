import type { MetadataRoute } from 'next';

const FAVICON_URL = 'https://www.glaring.world/wp-content/uploads/2026/10/fav.png?v=3';

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
        src: FAVICON_URL,
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: FAVICON_URL,
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
