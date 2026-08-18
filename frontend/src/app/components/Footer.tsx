import Link from 'next/link';

// Rendered on every page (see layout.tsx) - Impressum must be reachable
// from anywhere on the site with minimal clicks (§5 TMG), not just from
// pages behind login.
export default function Footer() {
  return (
    <footer className="mt-auto py-6 px-8 flex items-center justify-center gap-6 text-xs font-semibold text-slate-400 dark:text-slate-500">
      <Link href="/impressum" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
        Impressum
      </Link>
      <Link href="/datenschutz" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
        Datenschutz
      </Link>
    </footer>
  );
}
