-- CommissionChain PH Database Schema
-- Run with: supabase db push or via SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table
create table public.users (
  id uuid primary key default uuid_generate_v4(),
  wallet_address text unique not null,
  full_name text,
  role text not null default 'agent' check (role in ('agent', 'business', 'admin')),
  nonce text,
  nonce_expires_at timestamp with time zone,
  avatar_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Organizations table
create table public.organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text default 'business',
  wallet_address text unique not null,
  user_id uuid references public.users(id) on delete set null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Campaigns table
create table public.campaigns (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references public.organizations(id) on delete cascade,
  title text not null,
  description text,
  commission_amount numeric not null check (commission_amount > 0),
  commission_asset text not null default 'USDC',
  escrow_amount numeric not null default 0,
  max_referrals integer not null default 10 check (max_referrals > 0),
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'completed', 'cancelled')),
  soroban_campaign_id text,
  soroban_contract_address text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Referrals table with unique constraint on campaign_id + referral_hash
create table public.referrals (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid references public.campaigns(id) on delete cascade,
  agent_id uuid references public.users(id) on delete set null,
  referral_hash text not null,
  status text not null default 'pending' check (status in ('pending', 'verified', 'disputed', 'paid', 'rejected')),
  verified_at timestamp with time zone,
  verified_by text,
  disputed boolean default false,
  dispute_reason text,
  dispute_resolved_at timestamp with time zone,
  dispute_resolved_by text,
  paid boolean default false,
  paid_at timestamp with time zone,
  stellar_tx_hash text,
  soroban_tx_hash text,
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(campaign_id, referral_hash)
);

-- Transactions table
create table public.transactions (
  id uuid primary key default uuid_generate_v4(),
  wallet_address text not null,
  stellar_tx_hash text unique,
  transaction_type text not null check (transaction_type in ('escrow_fund', 'commission_payout', 'refund')),
  amount numeric not null,
  asset_code text not null default 'USDC',
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'failed')),
  campaign_id uuid references public.campaigns(id) on delete set null,
  referral_id uuid references public.referrals(id) on delete set null,
  created_at timestamp with time zone default now()
);

-- Feedback table
create table public.feedback (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete set null,
  rating integer not null check (rating >= 1 and rating <= 5),
  feedback text,
  category text check (category in ('wallet_onboarding', 'referral_submission', 'business_verification', 'commission_tracking', 'mobile_usability', 'general')),
  created_at timestamp with time zone default now()
);

-- Analytics events table
create table public.analytics_events (
  id uuid primary key default uuid_generate_v4(),
  event_name text not null,
  wallet_address text,
  metadata jsonb,
  created_at timestamp with time zone default now()
);

-- Indexes
create index idx_users_wallet on public.users(wallet_address);
create index idx_campaigns_org on public.campaigns(organization_id);
create index idx_campaigns_status on public.campaigns(status);
create index idx_referrals_campaign on public.referrals(campaign_id);
create index idx_referrals_agent on public.referrals(agent_id);
create index idx_referrals_hash on public.referrals(referral_hash);
create index idx_referrals_status on public.referrals(status);
create index idx_transactions_wallet on public.transactions(wallet_address);
create index idx_transactions_stellar_hash on public.transactions(stellar_tx_hash);
create index idx_transactions_campaign on public.transactions(campaign_id);
create index idx_feedback_user on public.feedback(user_id);
create index idx_analytics_events_name on public.analytics_events(event_name);
create index idx_analytics_events_wallet on public.analytics_events(wallet_address);

-- Updated_at trigger function
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply updated_at triggers
create trigger update_users_updated_at before update on public.users
  for each row execute function update_updated_at_column();
create trigger update_organizations_updated_at before update on public.organizations
  for each row execute function update_updated_at_column();
create trigger update_campaigns_updated_at before update on public.campaigns
  for each row execute function update_updated_at_column();
create trigger update_referrals_updated_at before update on public.referrals
  for each row execute function update_updated_at_column();

-- Row Level Security
alter table public.users enable row level security;
alter table public.organizations enable row level security;
alter table public.campaigns enable row level security;
alter table public.referrals enable row level security;
alter table public.transactions enable row level security;
alter table public.feedback enable row level security;
alter table public.analytics_events enable row level security;

-- RLS Policies: Users can read their own data, service role manages writes
create policy "Users can view own profile" on public.users
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.users
  for update using (auth.uid() = id);

create policy "Service role manages users" on public.users
  for all using (true);

create policy "Anyone can read campaigns" on public.campaigns
  for select using (true);

create policy "Service role manages campaigns" on public.campaigns
  for all using (true);

create policy "Anyone can read referrals" on public.referrals
  for select using (true);

create policy "Service role manages referrals" on public.referrals
  for all using (true);

create policy "Anyone can read transactions" on public.transactions
  for select using (true);

create policy "Service role manages transactions" on public.transactions
  for all using (true);

create policy "Anyone can read feedback" on public.feedback
  for select using (true);

create policy "Service role manages feedback" on public.feedback
  for all using (true);

create policy "Service role manages analytics" on public.analytics_events
  for all using (true);
