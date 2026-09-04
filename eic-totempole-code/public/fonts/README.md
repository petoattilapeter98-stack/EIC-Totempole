# Self-hosted fonts

Two **variable** `woff2` files belong in this directory. They are deliberately not
committed by the scaffolding step — download them once and drop them here.

| File name (exact) | Family | Used for |
|---|---|---|
| `space-grotesk-variable.woff2` | Space Grotesk | Headlines, numeric stats (clock, temperature, countdown) |
| `plus-jakarta-sans-variable.woff2` | Plus Jakarta Sans | Body and UI copy |

## Why self-hosted

The kiosk may sit on a restricted network. A CDN font request that fails is a
visibly broken display that nobody is watching (see `specs/001-lobby-kiosk-shell/research.md` R2,
and Constitution Principle VIII).

## Where to get them

Both families are **SIL Open Font License 1.1**, so self-hosting and redistribution
are permitted. Fetch the variable `woff2` from either:

- <https://fonts.google.com/specimen/Space+Grotesk> / <https://fonts.google.com/specimen/Plus+Jakarta+Sans>
- <https://github.com/floriankarsten/space-grotesk> / <https://github.com/tokotype/PlusJakartaSans>
- or `https://gwfh.mranftl.com/fonts` (google-webfonts-helper) for a direct `woff2` download

Rename the downloaded files to the exact names in the table above.

Place the `OFL.txt` license text for each family alongside them in this directory.

## Verify the weight axis

`src/styles/fonts.css` declares a `font-weight` **range** per family. Confirm it
matches the axis range of the file you actually downloaded:

- Space Grotesk — typically `300 700`
- Plus Jakarta Sans — typically `200 800`

If the range is wrong, browsers clamp or synthesize weights and the type scale
will look subtly off.

## Until the files are present

The app still runs. `src/styles/tokens.css` declares full fallback stacks
(`system-ui`, `Segoe UI`, …), so the shell renders with system fonts and correct
layout — only the typeface identity is missing. Nothing crashes, and no network
request is attempted.
