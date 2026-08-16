# Color palette: light & dark mode

The frontend supports a light and a dark theme, toggled from the sun/moon
button in the navbar (and, on the login/register screens, top-right corner).
The choice is persisted in `localStorage` (key `theme`) and re-applied by an
inline script before the page paints, so it survives a reload without a
flash of the wrong theme. See:

- `frontend/src/context/ThemeContext.tsx` — the `light`/`dark` state, toggle,
  and localStorage persistence.
- `frontend/src/app/layout.tsx` — the `beforeInteractive` init script that
  applies the persisted (or OS-default) theme to `<html class="dark">`
  before hydration.
- `frontend/src/app/globals.css` — `@custom-variant dark (&:where(.dark, .dark *));`,
  which switches Tailwind's `dark:` variant from `prefers-color-scheme` to
  the `.dark` class above.

Colors below are Tailwind v4 defaults, referenced by their utility class
(`bg-slate-950`, etc.) throughout the components — this table is the
canonical mapping from role → class → hex, kept here so a color choice can
be looked up or changed without grepping every component.

## Light mode

| Role                          | Class            | Hex       |
|--------------------------------|------------------|-----------|
| Page background                | `bg-slate-50` / `bg-gray-50` | `#f8fafc` / `#f9fafb` |
| Card / surface background      | `bg-white`       | `#ffffff` |
| Inset background (inputs, chips) | `bg-slate-50` / `bg-slate-100` | `#f8fafc` / `#f1f5f9` |
| Module header bar               | `bg-slate-800`   | `#1e293b` |
| Border                         | `bg-slate-200` / `border-slate-100` | `#e2e8f0` / `#f1f5f9` |
| Text — primary                 | `text-slate-900` | `#0f172a` |
| Text — secondary               | `text-slate-600` / `text-slate-700` | `#475569` / `#334155` |
| Text — muted                   | `text-slate-400` / `text-slate-300` | `#94a3b8` / `#cbd5e1` |
| Accent / primary action        | `bg-blue-600` / `text-blue-600` | `#2563eb` |
| Accent hover                   | `bg-blue-700`    | `#1d4ed8` |
| Success (toast, banners)       | `text-emerald-600` on `bg-emerald-50` | `#059669` on `#ecfdf5` |
| Danger (toast, banners, delete)| `text-red-600` on `bg-red-50` | `#dc2626` on `#fef2f2` |

## Dark mode

| Role                          | Class            | Hex       |
|--------------------------------|------------------|-----------|
| Page background                | `bg-slate-950`   | `#020617` |
| Card / surface background      | `bg-slate-900`   | `#0f172a` |
| Inset background (inputs, chips) | `bg-slate-800` | `#1e293b` |
| Module header bar               | `bg-slate-950`   | `#020617` |
| Border                         | `border-slate-800` / `border-slate-700` | `#1e293b` / `#334155` |
| Text — primary                 | `text-slate-100` | `#f1f5f9` |
| Text — secondary               | `text-slate-300` | `#cbd5e1` |
| Text — muted                   | `text-slate-500` / `text-slate-600` | `#64748b` / `#475569` |
| Accent / primary action        | `bg-blue-600` / `text-blue-400` | `#2563eb` / `#60a5fa` |
| Accent hover                   | `bg-blue-500`    | `#3b82f6` |
| Success (toast, banners)       | `text-emerald-400` on `bg-emerald-950/80` | `#34d399` on `#022c22cc` |
| Danger (toast, banners, delete)| `text-red-400` on `bg-red-950/80` | `#f87171` on `#450a0acc` |

## Notes

- Module accent colors (the per-module color swatches users pick in the
  project editor — Blue, Emerald, Violet, ...) are intentionally **not**
  themed: they're user-chosen highlight colors for schedule blocks, defined
  in `PRESET_COLORS` in `frontend/src/app/projects/[id]/page.tsx`, and keep
  the same light pastel look (e.g. `bg-blue-100 text-blue-900`) in both
  modes since they sit inside their own colored badge/block rather than on
  the page background.
- Dark-mode surface colors step up in lightness with elevation (page →
  card → inset element: `slate-950` → `slate-900` → `slate-800`) to keep a
  visible distinction between layered surfaces, mirroring how the light
  theme steps down (`slate-50`/`gray-50` → `white` → `slate-50`).
