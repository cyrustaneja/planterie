-- Milestone 3: full asset data model + storage plumbing (PRD.md Section 7, Section 14 #3).

create table public.catalog_plants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  aliases text[] not null default '{}',
  active boolean not null default true
);

create table public.catalog_pots (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  aliases text[] not null default '{}',
  active boolean not null default true
);

create table public.batches (
  id uuid primary key default gen_random_uuid(),
  asset_type text not null check (
    asset_type in (
      'website_product',
      'stock_plants',
      'stock_pots_jars',
      'customer_sends',
      'social',
      'raw_clips',
      'plantscaping_projects',
      'event_coverage'
    )
  ),
  event_name text,
  event_date date,
  project_name text,
  purpose text,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  storage_key text not null,
  thumbnail_key text,
  type text not null check (type in ('photo', 'video')),
  asset_type text not null check (
    asset_type in (
      'website_product',
      'stock_plants',
      'stock_pots_jars',
      'customer_sends',
      'social',
      'raw_clips',
      'plantscaping_projects',
      'event_coverage'
    )
  ),
  mime text not null,
  width int,
  height int,
  size_bytes bigint not null,
  caption text,
  taken_at timestamptz,
  uploaded_by uuid references public.users (id) on delete set null,
  batch_id uuid references public.batches (id) on delete set null,
  status text not null default 'processing' check (
    status in ('processing', 'tagged', 'needs_review', 'failed')
  ),
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  value text not null,
  in_catalog boolean not null default true,
  confidence text check (confidence in ('high', 'medium', 'low')),
  source text not null check (source in ('ai', 'batch', 'manual'))
);

create table public.asset_tags (
  asset_id uuid not null references public.assets (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (asset_id, tag_id)
);

create table public.share_links (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  asset_ids uuid[] not null,
  created_by uuid references public.users (id) on delete set null,
  expires_at timestamptz not null,
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets (id) on delete cascade,
  kind text not null check (kind in ('tag', 'thumbnail')),
  status text not null default 'pending' check (
    status in ('pending', 'processing', 'done', 'failed')
  ),
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now()
);

alter table public.catalog_plants enable row level security;
alter table public.catalog_pots enable row level security;
alter table public.batches enable row level security;
alter table public.assets enable row level security;
alter table public.tags enable row level security;
alter table public.asset_tags enable row level security;
alter table public.share_links enable row level security;
alter table public.jobs enable row level security;

-- Catalog, batches, assets, and tags are readable by any signed-in team member —
-- needed for tagging, review-queue dropdowns, and the library. No client-side write
-- policies yet: upload (Milestone 4) and catalog management (Milestone 9) define
-- their own insert/update rules when those features actually ship.
create policy "catalog_plants readable by authenticated users"
  on public.catalog_plants for select
  to authenticated
  using (true);

create policy "catalog_pots readable by authenticated users"
  on public.catalog_pots for select
  to authenticated
  using (true);

create policy "batches readable by authenticated users"
  on public.batches for select
  to authenticated
  using (true);

create policy "assets readable by authenticated users"
  on public.assets for select
  to authenticated
  using (true);

create policy "tags readable by authenticated users"
  on public.tags for select
  to authenticated
  using (true);

create policy "asset_tags readable by authenticated users"
  on public.asset_tags for select
  to authenticated
  using (true);

-- share_links and jobs have no client policies at all: share links must work for
-- unauthenticated recipients (validated server-side via the service-role client in
-- Milestone 8), and jobs is a server-only queue table (Milestone 5).
