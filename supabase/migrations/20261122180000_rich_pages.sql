-- Event, news and guide pages: rich text bodies, extra event details, SEO fields, and a guides table.
alter table site.events
  add column if not exists summary text,
  add column if not exists body_html text,
  add column if not exists schedule text[] not null default '{}',
  add column if not exists what_to_bring text[] not null default '{}',
  add column if not exists accessibility text,
  add column if not exists ticket_url text,
  add column if not exists meta_title text,
  add column if not exists meta_description text;

alter table site.articles
  add column if not exists body_html text,
  add column if not exists author text,
  add column if not exists meta_title text,
  add column if not exists meta_description text;

create table if not exists site.guides (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title text not null,
  intro text,
  body_html text,
  image_path text,
  image_alt text,
  read_minutes integer,
  sort integer not null default 100,
  meta_title text,
  meta_description text,
  status text not null default 'draft' check (status in ('draft','published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table site.guides enable row level security;
create policy "public read" on site.guides for select to anon, authenticated using (status = 'published');
create policy "team manage" on site.guides for all to authenticated using ((select private.is_moderator())) with check ((select private.is_moderator()));
grant select on site.guides to anon;
grant select, insert, update, delete on site.guides to authenticated;
grant all on site.guides to service_role;

create or replace function site.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
create trigger guides_touch before update on site.guides for each row execute function site.touch_updated_at();

-- article photo galleries: [{ "src": "...", "alt": "...", "caption": "..." }]
alter table site.articles add column if not exists gallery jsonb not null default '[]'::jsonb;
alter table site.articles add constraint articles_gallery_is_array check (jsonb_typeof(gallery) = 'array');

-- focus keywords so events, news and guides can be scored in Admin → Marketing
alter table site.events add column if not exists focus_keyword text;
alter table site.articles add column if not exists focus_keyword text;
alter table site.guides add column if not exists focus_keyword text;
