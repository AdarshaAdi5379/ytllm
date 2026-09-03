# SEO Plan — Scritur

## Current State (Audit)

| Item | Status |
|------|--------|
| Crawlable HTML | **Empty** — SPA serves only `<div id="root">`. Google's JS render may eventually see it, but GPTBot/ClaudeBot/Perplexity/Bing don't run JS and see nothing |
| `robots.txt` | 404 (no `public/` dir) |
| `sitemap.xml` | 404 |
| Favicon | Broken — `index.html` references `/favicon.svg` that doesn't exist |
| Title/description | Present but generic |
| OG tags | Title + description only; **no image**, no URL, no type=site |
| Twitter card | Missing entirely |
| Canonical | Missing |
| JSON-LD structured data | Missing |
| URLs | Only `/` — no per-page landing URLs, real router unused |

## Recommended Approach: Build-Time Prerendering

No Next.js migration. The landing page renders unauthenticated (`App.tsx:149` shows landing when `!isAuthenticated`), so headless Chromium can capture it at build time. Vercel serves the prerendered HTML to crawlers; users still get the hydrated SPA.

---

## Phase 1 — Seed the Basics (no arch change, ships today)

1. Create `frontend/public/` directory:
   - `favicon.svg` — indigo "K" mark matching the brand
   - `og-image.png` — branded social image (1200x630)
   - `robots.txt` — allow all, point to sitemap
   - `sitemap.xml` — index the landing URL
2. Expand `frontend/index.html` head tags:
   - `og:image`, `og:url`, `og:site_name`, `og:locale`
   - Twitter card tags (`summary_large_image`)
   - `<link rel="canonical" href="https://www.scritur.space/">`
   - JSON-LD `Organization` + `WebSite` schema
   - `<meta name="robots" content="index, follow">`
   - `<link rel="apple-touch-icon">`

## Phase 2 — Prerender the Landing Page (the real ranking fix)

4. Add dev deps: `puppeteer-core`, `@sparticuz/chromium`
5. Write `scripts/prerender.ts`:
   - Builds `dist/` with Vite
   - Serves `dist/` locally
   - Launches headless Chromium, visits `/`
   - Waits for real signal: `#root` children present + `document.title` non-empty
   - Serializes `document.documentElement.outerHTML` → overwrites `dist/index.html`
   - Also writes `dist/404.html`
6. Wire into build: `vite build` → prerender script (add to `package.json` `"build"` or add separate `"build:seo"` script)
7. Verify `dist/index.html` contains Hero copy ("Stop chatting with content…") so crawlers see it
8. Keep `showLanding`-true default in `App.tsx` so bots hit the landing; workspace stays client-only gated by auth

## Phase 3 — Per-Page SEO Head Management (React side)

9. Add a `<Seo>` component or `usePageSeo` hook that writes `title`/`description`/`canonical`/JSON-LD **synchronously during render** (not in `useEffect`) so prerender's DOM capture includes per-page tags. Current tags live only in static `index.html`.
10. Apply it to the landing sections and any future real URLs (pricing, blog).

## Phase 4 — Content & Keyword Strategy

11. Refine title/description with target terms:
    - "AI study app", "turn YouTube/PDF into flashcards and quizzes", "AI tutor for learning"
12. Optional: `FAQPage` schema if adding an FAQ block to the landing
13. Optional: build 1–2 public marketing/content pages (pricing, blog, about) as prerendered routes to build topical authority — more URLs = more ranking surface

## Phase 5 — Verification & Submit

14. Test: `npm run build`, confirm `dist/index.html` has full landing HTML; confirm robots/sitemap/favicon resolve in build output
15. Manual checks:
    - `curl` the prerendered HTML (verify title + landing copy present)
    - View-source in browser
    - Social-sharing preview (og image)
    - Lighthouse SEO audit (target 95+)
16. Submit sitemap in Google Search Console + Bing Webmaster; register domain property

---

## Notes / Open Decisions

- **Prerender scope:** Landing `/` only for now, or also build public content pages?
- **OG image:** Generate simple branded one, or use a marketing image?
- **Content pages:** Blog posts or feature pages are the main path to sustained ranking gains beyond the landing page fix
