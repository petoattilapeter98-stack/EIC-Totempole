# Self-hosted fonts

## Status: incomplete — only weight 400 is present

The two files here are static **400 (regular)** faces. The design uses **700
heavily** (14 declarations, including the 72px hero headline and every nav
label), plus 500 and 600. With only a 400 face available the browser renders
*everything* at 400 — verified in-browser: measuring the headline string at
`font-weight: 400` and `700` gives an identical 728.3px, and the page shows no
synthetic bold.

The letterforms are correct; the **weight hierarchy is flat**. Headlines look
like body text at a large size.

## What to download

Same source as before — <https://gwfh.mranftl.com/fonts>, charset
`latin` + `latin-ext`, format `woff2`. Add these four:

| Family | Weight | Needed for |
|---|---|---|
| Space Grotesk | **700** | Hero headline, section headings, nav labels, clock, agenda times, badges |
| Space Grotesk | 500 | Brand mark, lighter display text |
| Plus Jakarta Sans | **700** | Emphasis in body copy, room chips |
| Plus Jakarta Sans | 500 | Muted labels, subheadings |

The 700s are the ones that matter. 500 is a refinement.

Keep the naming convention already in use, e.g.:

```
space-grotesk-v22-latin_latin-ext-700.woff2
plus-jakarta-sans-v12-latin_latin-ext-700.woff2
```

## After adding them

Add one `@font-face` block per weight in `src/styles/fonts.css`, following the
existing pattern and setting `font-weight` to the real weight of each file. Do
**not** declare a range like `300 700` on a static file — that suppresses
weight selection and renders everything at the file's actual weight.

Only the two 700 files are worth preloading in `index.html`; the rest can load
normally.

## Variable fonts as an alternative

A single variable `woff2` per family covers every weight in one request and
would replace all of the above. Both families publish one:

- <https://github.com/floriankarsten/space-grotesk> (wght 300–700)
- <https://github.com/tokotype/PlusJakartaSans> (wght 200–800)

With a variable file, declare the real axis range (`font-weight: 300 700`) —
that is the one case where a range is correct.

## Why self-hosted at all

The kiosk may sit on a restricted network. A CDN font request that fails is a
visibly broken display that nobody is watching. See
`specs/001-lobby-kiosk-shell/research.md` R2 and Constitution Principle VIII.

Both families are **SIL Open Font License 1.1** — self-hosting and
redistribution are permitted. Place each family's `OFL.txt` alongside its files.
