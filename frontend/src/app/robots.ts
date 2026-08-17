import type { MetadataRoute } from 'next';

// Beta-phase choice, paired with the `robots: { index: false }` metadata in
// layout.tsx: block all crawling until the app is ready for a public
// launch. Flip `disallow` to something narrower (or drop this file) once
// out of beta.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      disallow: '/',
    },
  };
}
