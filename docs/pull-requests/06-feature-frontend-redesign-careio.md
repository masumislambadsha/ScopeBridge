# PR 06 — `feature/frontend-redesign-careio` → `develop`

## Summary
Full frontend redesign ported 1:1 from the care-io design system: warm/sage/teal palette, Inter + Playfair typography, pill navbar with `layoutId` nav pill, dark sidebar shells, animated landing (RevealText, Magnetic, TiltCard, SpotlightCard, BlurFade, Marquee, NumberTicker, ParallaxImage), Lenis smooth scroll, scroll-progress bar, and exact care-io button variants (CustomButton fill-wipe, StyledButton skew-wipe, SlideButton). All 30 routes restyled; zero `zinc-` classes remain. Backend untouched except a one-line dependency pin.

## Changes
- **Theme** (`tailwind.config.js`, `globals.css`): care-io color tokens (warm/sage/teal/clay/ink), radii, shadows, dot/grid patterns, `.dark` class strategy with pre-hydration script, dark-mode remaps.
- **Motion** (new deps `motion@12`, `lenis`): exact ports of care-io's RevealText, Magnetic, TiltCard, SpotlightCard, ParallaxImage, BlurFade, NumberTicker, Marquee, SmoothScroll (Lenis 1.2 + custom easing), SiteShell scroll-progress bar, Navbar `layoutId="nav-pill"` spring.
- **Buttons**: CustomButton (white scaleX fill), StyledButton (skew wipe + text roll, CSS-based — no styled-components), SlideButton — vendored exactly.
- **Pages**: landing (hero with scroll-linked fade, floating badges, stats band, marquee, how-it-works, features, dark portal panel, pricing, CTA), dashboard (dark hero + tickers), agency + portal shells, auth pages (new AuthShell), all 9 project tabs, all 8 portal pages, all list/detail pages.
- **Backend**: `@socket.io/redis-emitter` pinned `^5.2.0` → `^5.1.0` (5.2.0 does not exist on the registry; blocks all `npm install`).

## Merge conflicts resolved (5)
`chore/verify` had moved to Next 15 async `params` (`use(params)`) and extracted `MembersManager`. Resolution: kept `develop`'s logic (async params, MembersManager) and layered the redesign styling on top. Files: `invite/[token]`, `portal/projects/[id]`, `workspaces/[id]/members`, `scope-tab`, `package.json` (kept Next 15 + added motion/lenis).

## Test evidence
- `npm run typecheck --workspace=scopebridge-frontend` ✅
- `npm run build --workspace=scopebridge-frontend` ✅ (all 30 routes)
- Screenshots verified: landing (light + dark), how-it-works, features, portal panel, pricing, login, register.
- `grep -rn "zinc-" frontend/` → 0 matches.

## Known gaps
- `npm run lint` fails repo-wide (pre-existing ESLint 8 vs flat-config mismatch in `eslint.config.mjs`, unrelated to this PR).
- E2E not re-run against the merged result (requires Postgres + Redis + Mailpit).
- `@heroui/react` and `react-icons` not installed — care-io's avatar dropdowns/tooltips/socials replaced with light equivalents (lucide + CSS).

## Checklist
- [x] typecheck + build green on merged `develop`
- [x] no secrets, no dummy data
- [x] all routes restyled, zero old-theme classes
- [ ] human review
- [ ] e2e re-run (needs local services)
