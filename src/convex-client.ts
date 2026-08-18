import { ConvexReactClient } from 'convex/react';

const convexUrl = import.meta.env.VITE_CONVEX_URL;

if (!convexUrl) {
  console.warn(
    '[crawlX] VITE_CONVEX_URL is not set. Convex integration will not work. ' +
    'Create a .env.local file with: VITE_CONVEX_URL=https://your-deployment.convex.cloud'
  );
}

export const convex = new ConvexReactClient(convexUrl || '');

export function isConvexConfigured(): boolean {
  return Boolean(convexUrl);
}
