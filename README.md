# Cars and Coffee UK

Main website for **www.carsandcoffeeuk.co.uk**: UK car meets, motorsport news, members' community, shop, partners and a business directory.

## What's here

| Path | What it is |
| --- | --- |
| `public/` | The live website. Cloudflare serves this folder as-is (no build step). |
| `public/index.html` | Homepage (19 blocks from the homepage design brief). |
| `public/homepage/` | Homepage images (WebP) and logo. Same paths as `image_path` in the CRM. |
| `public/404.html` | "Page coming soon" page for inner pages not built yet. |
| `public/_headers` | Security and caching headers. |
| `tools/` | Generator: `data.py` (content) + `template.html` (layout) → `index.html`. |
| `supabase/` | CRM schema (`cac`) and seed data, in the Race Car Graphics CRM project. |
| `wrangler.jsonc` | Cloudflare config: serves `./public`. |

## Deploying on Cloudflare

- **Workers (Git-connected):** `wrangler.jsonc` is picked up automatically. Deploy command `npx wrangler deploy`, no build command.
- **Pages:** build command empty, build output directory `public`.

## Editing the homepage

Content lives in the CRM (`cac` schema). Until the site reads it live, edit `tools/data.py` to match, then:

```bash
cd tools
python3 build.py prod ../public/index.html     # live site (images as files)
python3 build.py preview ../preview.html       # single self-contained file for sharing
```

The build also writes `supabase/seed_homepage.sql`, so the CRM seed and the page always match.

## CRM (Supabase)

- Project: **Race Car Graphics CRM**, schema **`cac`** (kept separate from RCG tables).
- Public (anon) can only read published rows. Newsletter sign-ups can be inserted but not read. Business email/phone are hidden.
- **To do:** add `cac` to *Settings → API → Exposed schemas* so the newsletter form (and later the live homepage) can reach it.

## Sample content

Events, stories, directory businesses, the sponsored ad and member figures are sample content for launch preparation. Replace them in the CRM before go-live.
