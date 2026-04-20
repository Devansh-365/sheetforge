import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'sheetforge',
    short_name: 'sheetforge',
    description: 'Race-condition-safe Google Sheets backend with typed TypeScript/Python SDKs.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0c0c0e',
    theme_color: '#22c55e',
    categories: ['developer', 'productivity', 'utilities'],
    icons: [
      { src: '/icon', sizes: '32x32', type: 'image/png' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  };
}
