# Cars and Coffee admin

The team back office at **https://admin.carsandcoffee.uk**. Only approved club members with the **admin** or **moderator** role can use it.

- **Website:** SEO pages (location, sector, audience, guide, standard) with a live SEO optimiser and Google result preview; Google Ads landing pages with headline/description limits, display path, UTM builder and ad preview; homepage blocks, events, news, FAQs, partners, partner features, directory, sponsored slots and the newsletter list (CSV export).
- **Club:** application queue, members (roles, invite rights, ban/unban), sign-up list and open/invite-only switch, member invites, and the email log with retry.

## How it works
- Static single-page app in `public/` (no build step). Styling: CoreUI 5 from cdnjs (falls back to jsDelivr, then unpkg).
- Data: Supabase project **Cars and Coffee Community** at `auth.carsandcoffee.uk`. Website content lives in the `site` schema; club data in `public`.
- Security is in the database (row level security): anyone can read published content; only admins and moderators can change it. Some club screens are admin-only.
- Every save of an SEO page keeps the previous version in `site.page_revisions`.

## Test mode
Add `?mock=admin` (or `?mock=moderator`, `?mock=member`, `?mock=signedout`) to any URL to click through with sample data. Nothing is saved.

## Deploy
Cloudflare Worker `carsandcoffee-admin`, built from this repo with root directory `admin` (see `wrangler.jsonc`). Custom domain: admin.carsandcoffee.uk.
