-- Cars and Coffee UK: homepage content managed in the CRM (Supabase project "Race Car Graphics CRM").
-- Already applied on 2026-11-22. Kept in its own schema, separate from the Race Car Graphics tables.
-- To let the website read it, add `cac` to Settings → API → Exposed schemas.
create schema if not exists cac;
comment on schema cac is 'Cars and Coffee UK website and community content (homepage blocks, events, news, shop, partners, directory, ads, newsletter).';

create table cac.homepage_blocks (
  key text primary key,
  title text not null,
  position int not null,
  enabled boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
comment on table cac.homepage_blocks is 'Order, on/off and schedule of each homepage block; the admin drag-and-drop list edits this.';

create table cac.events (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  event_type text not null check (event_type in ('meet','tour','garage','watch','track','show')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  venue text not null,
  region text,
  price_pence int not null default 0,
  ticket_status text not null default 'on_sale' check (ticket_status in ('free_rsvp','on_sale','selling_fast','sold_out')),
  members_only boolean not null default false,
  image_path text,
  image_alt text,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table cac.articles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  category text not null,
  excerpt text,
  body text,
  image_path text,
  image_alt text,
  read_minutes int,
  featured boolean not null default false,
  status text not null default 'published' check (status in ('draft','published')),
  published_at date not null default current_date
);

create table cac.community_highlights (
  id uuid primary key default gen_random_uuid(),
  handle text not null,
  title text not null,
  excerpt text,
  image_path text,
  image_alt text,
  post_url text,
  sort int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
comment on table cac.community_highlights is 'Hand-picked public community posts for the homepage until the community app feeds this directly.';

create table cac.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  price_pence int not null,
  member_price_pence int,
  badge text,
  image_path text,
  image_alt text,
  units_sold_30d int not null default 0,
  partner_id uuid,
  active boolean not null default true
);

create table cac.gallery_items (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  image_path text not null,
  image_alt text not null,
  sort int not null default 0,
  featured boolean not null default true
);

create table cac.directory_regions (id serial primary key, name text unique not null, slug text unique not null, sort int not null default 0);
create table cac.directory_services (id serial primary key, name text unique not null, slug text unique not null, sort int not null default 0);
create table cac.directory_listings (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  services text[] not null default '{}',
  town text,
  region text,
  website text,
  phone text,
  email text,
  image_path text,
  image_alt text,
  featured boolean not null default false,
  featured_until date,
  status text not null default 'published' check (status in ('pending','published','rejected')),
  created_at timestamptz not null default now()
);
comment on column cac.directory_listings.email is 'Business contact, not shown publicly; read via service role only.';

create table cac.partners (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  tagline text,
  page_path text,
  logo_path text,
  sort int not null default 0,
  active boolean not null default true
);
alter table cac.products add constraint products_partner_fk foreign key (partner_id) references cac.partners(id);

create table cac.partner_features (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references cac.partners(id),
  block_key text not null references cac.homepage_blocks(key),
  title text not null,
  body text,
  extra text,
  image_path text,
  image_alt text,
  cta_label text, cta_url text,
  cta2_label text, cta2_url text,
  countdown_to timestamptz,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  active boolean not null default true
);
comment on column cac.partner_features.countdown_to is 'Le Mans 2027 race start set to 12 June 2027 16:00 local (start time to be confirmed by the ACO).';

create table cac.sponsored_slots (
  id uuid primary key default gen_random_uuid(),
  advertiser text not null,
  title text not null,
  body text,
  image_path text,
  image_alt text,
  cta_label text,
  cta_url text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'approved' check (status in ('pending','approved','rejected','paused')),
  impressions bigint not null default 0,
  clicks bigint not null default 0
);

create table cac.faqs (id serial primary key, question text not null, answer text not null, sort int not null default 0, published boolean not null default true);

create table cac.site_stats (key text primary key, label text not null, value text not null, is_sample boolean not null default false, updated_at timestamptz not null default now());

create table cac.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  consent boolean not null check (consent),
  consent_text text not null default 'I’d like to receive emails from Cars and Coffee UK, including events, news and partner offers.',
  source text not null default 'homepage',
  created_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);
create unique index newsletter_subscribers_email_key on cac.newsletter_subscribers (lower(email));

-- Row level security: public can read published content only; nobody public can edit.
do $$ declare t text; begin
  foreach t in array array['homepage_blocks','events','articles','community_highlights','products','gallery_items','directory_regions','directory_services','directory_listings','partners','partner_features','sponsored_slots','faqs','site_stats','newsletter_subscribers'] loop
    execute format('alter table cac.%I enable row level security', t);
  end loop; end $$;

create policy "public read" on cac.homepage_blocks for select to anon, authenticated using (enabled and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()));
create policy "public read" on cac.events for select to anon, authenticated using (published);
create policy "public read" on cac.articles for select to anon, authenticated using (status = 'published' and published_at <= current_date);
create policy "public read" on cac.community_highlights for select to anon, authenticated using (active);
create policy "public read" on cac.products for select to anon, authenticated using (active);
create policy "public read" on cac.gallery_items for select to anon, authenticated using (featured);
create policy "public read" on cac.directory_regions for select to anon, authenticated using (true);
create policy "public read" on cac.directory_services for select to anon, authenticated using (true);
create policy "public read" on cac.directory_listings for select to anon, authenticated using (status = 'published');
create policy "public read" on cac.partners for select to anon, authenticated using (active);
create policy "public read" on cac.partner_features for select to anon, authenticated using (active and starts_at <= now() and (ends_at is null or ends_at > now()));
create policy "public read" on cac.sponsored_slots for select to anon, authenticated using (status = 'approved' and starts_at <= now() and ends_at > now());
create policy "public read" on cac.faqs for select to anon, authenticated using (published);
create policy "public read" on cac.site_stats for select to anon, authenticated using (true);
create policy "public sign up" on cac.newsletter_subscribers for insert to anon, authenticated with check (consent and unsubscribed_at is null);

grant usage on schema cac to anon, authenticated, service_role;
grant select on all tables in schema cac to anon, authenticated;
revoke select on cac.newsletter_subscribers from anon, authenticated;
grant insert (email, consent, source) on cac.newsletter_subscribers to anon, authenticated;
grant all on all tables in schema cac to service_role;
grant usage, select on all sequences in schema cac to service_role;

-- Hide business email/phone from the public API.
revoke select on cac.directory_listings from anon, authenticated;
grant select (id, slug, name, services, town, region, website, image_path, image_alt, featured, featured_until, status, created_at) on cac.directory_listings to anon, authenticated;
