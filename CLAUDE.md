# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Davor's personal blog at https://davor.codify.hr. It is an Astro 7 static site styled as a till receipt, and it ships zero client-side JavaScript. Node 22+ and pnpm.

## Commands

```bash
pnpm install
pnpm dev       # http://localhost:4321; drafts are visible here
pnpm build     # static output in dist/; drafts excluded
pnpm preview   # serve dist/
```

There is no test suite, linter or type-check script. `astro check` was removed because it does not support the installed TypeScript. `pnpm build` is the check. It validates every post's frontmatter against the schema and fails on errors. After a build, the feeds can be checked with `xmllint --noout dist/feed.xml dist/hr/feed.xml dist/tags/*/feed.xml`.

## Publishing rules

- **Approval first.** Show Davor the full text of any new or changed post and wait for an explicit yes before committing or pushing it. Until then, keep it uncommitted or set `draft: true`.
- **A push to `main` is a publish.** Sproobo auto-deploys every push to `main`. The Sproobo app id is `vxz8ngpkitt2z5y1w78z4k1d` on server "codify", in the codify org.

## Architecture

**Content.**
- Posts are Markdown files in `src/content/posts/`, loaded by a glob collection whose schema is in `src/content.config.ts`.
- The file name is the URL slug: `/posts/<id>/`.
- `number` is a hand-assigned sequential item number, printed as `#0001`.
- `lang: hr` posts also go into the Croatian feed.
- Give `date` an explicit UTC offset, for example `2026-11-07T21:30:00+01:00`.

**Dates and receipt numbers.**
- `src/lib/posts.ts` holds the shared helpers. All formatting goes through `Intl` with `SITE.timeZone` (Europe/Zagreb), so output doesn't depend on the build machine's zone.
- The home and archive pages group posts by calendar month.
- Each month's "RECEIPT #000113" number is computed from `SITE.firstMonth` and `SITE.receiptBase`. Numbers never shift when posts are added or removed, so don't change those two settings.

**Site settings.** `src/site.ts` holds the name, description, email, PGP lines, accent colour, and the project list on the About page.
- An empty `pgp` array hides the PGP row.
- An email ending in `.example` makes the mail page show "TBA" instead of a button.

**Markdown pipeline.** `astro.config.mjs` uses `unified()` from `@astrojs/markdown-remark` explicitly, because Astro 7's default processor does not take rehype plugins.
- A custom two-colour Shiki theme colours the code.
- A Shiki transformer copies `title="file.ts"` from the code fence onto `<pre data-title>`.
- `src/lib/rehype-attachments.mjs` then wraps every code block in a figure captioned "ATTACHMENT n/N · title".

**Pages.**
- Pages live in `src/pages/`. Every page composes the same receipt components from `src/components/`: Receipt, Masthead, Stamp, Barcode, ReceiptNav and Thanks, inside `src/layouts/Base.astro`.
- Base owns all the meta tags. Its `noindex` prop drops the canonical and og:url tags, and the 404 page uses it.
- RSS feeds come from one helper in `src/lib/feed.ts`, used for three outputs: `/feed.xml`, `/hr/feed.xml`, and one feed per tag at `/tags/<tag>/feed.xml`.

**Styling.**
- All CSS is in `src/styles/global.css`, and it is inlined into each page (`build.inlineStylesheets: 'always'`). Colours are custom properties on `:root`.
- The accent colour is injected from `SITE.accent` on `<body>`.
- Fonts are self-hosted IBM Plex Mono through `@fontsource`, including `latin-ext` for Croatian diacritics.
- `Stamp` is absolutely positioned and set per page with props. On narrow screens, check that it doesn't cover text. The About page reserves space for it with `padding-right` on the line beside it.

**Design source.** `design/receipt-blog.html` is the original Claude Design mockup, kept for reference only. It is not part of the build.

## Deployment

- **Container.** The two-stage `Dockerfile` runs the Astro build in `node:22-slim`. Caddy (`caddy:2-alpine`) then serves `dist/` on port 3000.
- **Caddy settings.** It compresses responses with zstd and gzip, marks `/_astro/*` as immutable, uses `try_files` for trailing-slash routes, and serves `/404.html` for misses. TLS is terminated by Sproobo in front of it.
- **`.dockerignore`.** It excludes `*.md`, which only matches files at the repo root. Don't widen it to `**/*.md`, or the posts disappear from the build.
- **Domains.** `davor.codify.hr` is canonical. `www.davor.codify.hr` 301-redirects to it.
- **DNS.** The codify.hr zone is hosted at Hetzner, not Cloudflare. Records there are added by hand.
