# EIC Totempole

The lobby kiosk for TEKsystems Budapest's Innovation Centre — a single-page,
touch-first React app that runs unattended on a wall-mounted Microsoft Surface
Hub 2S, plus the AWS infrastructure that serves it.

```
EIC-Totempole/
├── eic-totempole-code/   The kiosk application (React + TypeScript + Vite)
├── infra/                Terraform: S3 + CloudFront static hosting
└── .github/workflows/    CI: build, test, and deploy to AWS on merge to main
```

## What the kiosk does

A 50-inch touchscreen in the lobby greets visitors and board members with a
welcome header, a live clock, and a single-row tab navigation — no scrolling,
no menus, no keyboard. Tabs today:

- **Board Agenda** — the day's schedule, current session marked live
- **Local Transit** — getting to/from the building
- **Company Highlights** — company info
- **Guest Wi-Fi** — network access details
- **Voice Assistant** — a hands-free voice Q&A agent (tap Start, just talk, tap
  End) answering questions about the Innovation Centre, the company, and a
  curated set of employees, backed by a Microsoft Copilot Studio agent over
  Direct Line

The kiosk auto-resets to Board Agenda after a period of inactivity, and an
ambient "attract mode" animates while idle. English/Hungarian is switchable at
any time via a header toggle.

## Repository layout

### `eic-totempole-code/` — the application

A static, single-page frontend: React 19 + TypeScript (strict) on Vite 6, with
no backend of its own. Every tab is an isolated module registered in
`src/tabs/registry.ts` — adding a tab means adding a folder and one registry
line, nothing else changes.

```
eic-totempole-code/
├── src/
│   ├── app/            App shell composition
│   ├── components/     Shared chrome (HeaderBar, TabNav, LanguageToggle, ...)
│   ├── context/         KioskContext — active tab, locale, idle/reset state
│   ├── hooks/           useIdleReset, useClock, usePreviewScale
│   ├── i18n/            EN/HU locale data
│   ├── tabs/            One folder per tab, each self-contained
│   └── types/           Shared TypeScript contracts (TabModule, etc.)
├── specs/               Spec-driven feature docs (see below)
└── .specify/, .claude/  Spec-Kit tooling and skills
```

Common commands (run from `eic-totempole-code/`):

```sh
npm install
npm run dev         # local dev server (Vite)
npm run typecheck   # tsc --noEmit
npm run test        # Vitest — unit (jsdom) + layout (real Chromium)
npm run build       # typecheck + production build
```

### `infra/` — hosting

Terraform for a private S3 bucket fronted by CloudFront (TLS on a custom
domain), deployed per environment under `infra/envs/<name>/` against a shared
`infra/modules/static-site` module. See [`infra/README.md`](infra/README.md)
for the full rollout, deploy, and teardown steps and the design decisions
behind them (e.g. why `index.html` is never edge-cached).

### `.github/` — CI/CD

`deploy.yml` runs on every push to `main`: install, Playwright (for the
browser-mode layout tests), typecheck, test, build, then deploy the built
`dist/` to the `development` S3 bucket via the `deploy-to-s3` composite action.
A `production` deploy job exists but is commented out pending prod
infrastructure and a required-reviewers gate.

## Development workflow: Spec-Kit

Feature work in this repository follows [GitHub Spec-Kit](https://github.com/github/spec-kit):
each feature gets a `specs/<NNN>-<slug>/` folder with a `spec.md` (what/why),
`plan.md` (how), `research.md`, `data-model.md`, `contracts/`, `quickstart.md`,
and `tasks.md`, produced via the `speckit-*` skills in `.claude/skills/`
(specify → clarify → plan → tasks → analyze → implement). The project
constitution — the non-negotiable rules every feature is checked against
(fixed viewport, touch targets, no popups, unattended reliability, zero
client-side secrets, etc.) — lives at
[`eic-totempole-code/.specify/memory/constitution.md`](eic-totempole-code/.specify/memory/constitution.md).

Shipped/in-progress features:

- **001 — Lobby Kiosk Shell**: the persistent header/nav/content-region shell,
  idle auto-reset, and attract mode.
- **002 — Board Agenda Tab Content**: real schedule content for the Board
  Agenda tab.
- **003 — Voice Information Assistant**: the hands-free voice Q&A tab —
  Chrome's built-in speech recognition in, a Microsoft Copilot Studio agent
  over a direct Bot Framework Direct Line connection out, on-screen transcript
  back. No backend, no credentials: the bot is deployed for unauthenticated
  access and reached via its own public token-provisioning endpoint.

## Target device

Every UI decision is made for exactly one hardware target: a 50-inch Surface
Hub 2S at 3840×2560 (200% scaling → 1920×1280 CSS px), 3:2, touch-only, running
unattended for multiple days between reloads. See the constitution above for
the full set of hard constraints this implies (no scroll, ≥64px touch targets,
no modals/popups, no leaked timers/listeners, no unbounded state growth).
