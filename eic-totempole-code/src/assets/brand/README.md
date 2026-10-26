# TEKsystems brand assets

Official TEKsystems artwork used by the kiosk. Bundled with the app (Vite
hashes the file names), so nothing is fetched from teksystems.com at runtime
(Constitution VIII).

| File | What it is | Source | Used by |
|------|-----------|--------|---------|
| `teksystems-logo.svg` | Full logo: symbol, "TEKsystems" wordmark, "Own change" tagline. Navy on transparent, so it needs a light background. | `https://www.teksystems.com/-/media/teksystems/images/logos/teksystems-logo.svg` (the teksystems.com site header), downloaded 2026-10-26, kept byte for byte. | Welcome banner (`HeroBanner`) |
| `teksystems-symbol.svg` | The three-colour symbol on its own. | Cut from `teksystems-logo.svg`: the same three paths (ids `K`, `L`, `M`) and the colours that file paints on top, with the view box cropped to the symbol. No shapes redrawn. | Header brand mark (`HeaderBar`), SVG favicon |
| `favicon.ico` | 48 / 32 px symbol icon. | `https://www.teksystems.com/favicon.ico`, downloaded 2026-10-26, kept byte for byte. | Favicon fallback (`index.html`) |

These come from the public website, not from the TEKsystems brand portal. If
marketing supplies approved files, replace these with the same names and
nothing else needs to change.

TEKsystems and its logo are trademarks of TEKsystems, Inc. (an Allegis Group
company). Use them only inside this kiosk, as the brand owner allows.
