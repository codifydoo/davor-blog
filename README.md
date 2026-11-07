# davor-blog

Personal blog styled as a till receipt. Astro 7 static build, zero client-side JavaScript, served by Caddy from a two-stage Docker image.

## Develop

```bash
pnpm install
pnpm dev        # http://localhost:4321, drafts visible
pnpm build      # static output in dist/, drafts excluded
pnpm preview
```

## Write a post

Add a markdown file under `src/content/posts/`:

```md
---
title: Moving DNS off the router
date: 2026-10-27T10:00:00+01:00   # include the offset; dates print in Europe/Zagreb
number: 41              # printed as #0041, keep it sequential
tags: [networking, dns]
lang: en                # or hr (feeds into /hr/feed.xml)
minutes: 5              # optional; computed from word count when omitted
draft: false            # true hides it from production builds
---
```

Fenced code blocks become receipt "attachments". Give them a filename with `title`:

````md
```bash title="rotate-keys.sh"
set -euo pipefail
```
````

Every post also gets a 1200x630 link-preview image at `/og/<post id>.png`, drawn at build time from its title, number, date and tags (`src/lib/og.ts`). Nothing to do per post.

## Site settings

Name, tagline, email, PGP fingerprint, accent colour and the projects on the About page live in `src/site.ts`. The public URL is `site` in `astro.config.mjs`.

## Deploy

Pushing to `main` builds the Dockerfile on Sproobo (app `davor-blog`, server `codify`) and serves it at https://davor.codify.hr. Caddy config is in `Caddyfile`.
