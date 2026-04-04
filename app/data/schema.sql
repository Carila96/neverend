-- ============================================================
-- neverEND — Supabase Database Schema
-- Run this entire file in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. SUBSCRIPTION CONTRACTS
-- One record per purchase agreement
-- ============================================================
create table subscription_contracts (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid references auth.users(id) on delete set null,
  plan_type              text not null check (plan_type in ('monthly', 'annual')),
  zone_type              text not null check (zone_type in ('standard', 'creator')),
  stripe_subscription_id text unique,
  stripe_customer_id     text,
  stripe_session_id      text,
  status                 text not null default 'pending'
                           check (status in ('pending', 'active', 'canceled', 'past_due', 'incomplete')),
  block_count            integer not null check (block_count > 0),
  base_price_usd         numeric(10,2) not null,
  monthly_total_usd      numeric(10,2) not null,
  current_period_start   timestamptz,
  current_period_end     timestamptz,
  canceled_at            timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- ============================================================
-- 2. OWNED BLOCKS
-- One record per grid block per contract
-- ============================================================
create table owned_blocks (
  id          uuid primary key default gen_random_uuid(),
  contract_id uuid references subscription_contracts(id) on delete cascade,  -- null until payment confirmed
  stage_id    integer not null check (stage_id >= 1),
  x           integer not null check (x >= 0 and x < 80),
  y           integer not null check (y >= 0 and y < 45),
  status      text not null default 'reserved'
                check (status in ('reserved', 'claimed', 'released')),
  reserved_at timestamptz,
  expires_at  timestamptz,  -- reservation TTL (30 min)
  claimed_at  timestamptz,
  created_at  timestamptz not null default now(),

  -- No two active contracts can own the same block on same stage
  unique (stage_id, x, y)
);

-- Index for fast grid queries
create index idx_owned_blocks_stage on owned_blocks(stage_id);
create index idx_owned_blocks_contract on owned_blocks(contract_id);
create index idx_owned_blocks_expires on owned_blocks(expires_at) where status = 'reserved';

-- ============================================================
-- 3. PLACEMENTS
-- Display unit — one record per logo placement
-- ============================================================
create table placements (
  id           uuid primary key default gen_random_uuid(),
  contract_id  uuid not null references subscription_contracts(id) on delete cascade,
  stage_id     integer not null,
  anchor_x     integer not null,  -- top-left column (0-indexed)
  anchor_y     integer not null,  -- top-left row (0-indexed)
  width        integer not null,  -- in blocks
  height       integer not null,  -- in blocks
  image_url    text,              -- stored in Supabase Storage
  image_data   text,             -- base64 fallback (small logos only)
  zone_type    text not null check (zone_type in ('standard', 'creator')),
  is_active    boolean not null default false,
  approved_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index idx_placements_stage on placements(stage_id);
create index idx_placements_contract on placements(contract_id);

-- ============================================================
-- 4. RESERVATION SESSIONS
-- Short-term checkout locks (separate from future hold feature)
-- ============================================================
create table reservation_sessions (
  id           uuid primary key default gen_random_uuid(),
  session_key  text not null unique,  -- random token stored in browser
  stage_id     integer not null,
  anchor_x     integer not null,
  anchor_y     integer not null,
  width        integer not null,
  height       integer not null,
  zone_type    text not null,
  plan_type    text not null,
  block_count  integer not null,
  expires_at   timestamptz not null,
  stripe_session_id text,
  status       text not null default 'pending'
                 check (status in ('pending', 'completed', 'expired', 'failed')),
  created_at   timestamptz not null default now()
);

create index idx_reservation_expires on reservation_sessions(expires_at) where status = 'pending';

-- ============================================================
-- 5. WEBHOOK EVENTS LOG
-- Idempotency + debugging
-- ============================================================
create table stripe_webhook_events (
  id            uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  event_type    text not null,
  processed     boolean not null default false,
  error         text,
  payload       jsonb,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- 6. HELPER FUNCTION: expire stale reservations
-- Call this periodically or via Supabase pg_cron
-- ============================================================
create or replace function expire_stale_reservations()
returns void
language sql
as $$
  -- Release owned_blocks whose reservation has expired
  delete from owned_blocks
  where status = 'reserved'
    and expires_at < now();

  -- Mark reservation_sessions as expired
  update reservation_sessions
  set status = 'expired'
  where status = 'pending'
    and expires_at < now();
$$;

-- ============================================================
-- 7. ROW LEVEL SECURITY
-- ============================================================

alter table subscription_contracts enable row level security;
alter table owned_blocks enable row level security;
alter table placements enable row level security;
alter table reservation_sessions enable row level security;
alter table stripe_webhook_events enable row level security;

-- Contracts: users can read their own
create policy "users read own contracts"
  on subscription_contracts for select
  using (auth.uid() = user_id);

-- Owned blocks: public read for grid display (needed for sales page)
create policy "public read owned blocks"
  on owned_blocks for select
  using (true);

-- Placements: public read for grid display
create policy "public read placements"
  on placements for select
  using (true);

-- Reservation sessions: service role only (via API)
-- No direct client access — all reservation writes go through API

-- Webhook events: service role only
-- No client access

-- ============================================================
-- 8. UPDATED_AT TRIGGER
-- ============================================================
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_contracts_updated_at
  before update on subscription_contracts
  for each row execute function update_updated_at();

create trigger trg_placements_updated_at
  before update on placements
  for each row execute function update_updated_at();

-- ============================================================
-- DONE
-- After running this, copy your Project URL and anon key
-- from Supabase Settings > API
-- ============================================================
