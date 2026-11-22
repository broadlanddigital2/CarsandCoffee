# Cars and Coffee Club (club.carsandcoffee.uk)

The members' community. Phase 1a: sign in, apply, application status, welcome/profile,
Recommend a mate, and the team approval queue and invite list.

- **Hosting:** separate Cloudflare Worker `carsandcoffee-club`, root directory `club/`, no build step.
  `wrangler.jsonc` serves `./public` as a single-page app and attaches `club.carsandcoffee.uk`.
- **Data and sign-in:** Supabase project **Cars and Coffee Community** (`mslidnchoopgsnbraaxe`),
  publishable key only in the browser; every rule is enforced by row level security and database functions.
- **Sign-in:** Google and email sign-in links. Invite-only until `signups_open` is switched on in Team → Invite list.
- **Emails:** application emails are queued in `email_outbox` and sent once an email provider is connected.
- **Analytics:** Google Tag Manager GTM-T7LC4SL8 with Consent Mode (off until the visitor accepts).

## Test mode

Add `?mock=<scenario>` to any URL to see a screen with sample data and no real account:
`signedout`, `apply`, `pending`, `fasttrack`, `moreinfo`, `rejected`, `reapply`, `banned`, `member`, `admin`.
Example: `/admin?mock=admin`, `/recommend?mock=member`.
