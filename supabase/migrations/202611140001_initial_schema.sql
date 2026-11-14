-- Initial Rush schema. Apply through Supabase CLI migrations.

create extension if not exists pgcrypto;

create type public.rush_cycle_status as enum ('draft', 'active', 'completed', 'cancelled');
create type public.membership_role as enum ('pnm', 'member', 'chapter_admin', 'ifc_admin');
create type public.membership_status as enum ('active', 'inactive', 'pending');
create type public.event_status as enum ('draft', 'published', 'cancelled', 'completed');
create type public.rsvp_status as enum ('yes', 'no', 'maybe', 'cancelled');
create type public.attendance_method as enum ('nfc', 'qr', 'manual');
create type public.invitation_status as enum ('pending', 'sent', 'accepted', 'declined', 'rescinded');
create type public.pnm_round_status as enum ('open_invite', 'closed_invite_d1', 'closed_invite_d2', 'closed_invite_d3', 'bid_night');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 2 and 120),
  hometown text,
  major text,
  phone text not null,
  photo_path text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  short_name text not null,
  primary_color text,
  secondary_color text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rush_cycles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.rush_cycle_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rush_cycles_dates_valid check (ends_at > starts_at),
  constraint rush_cycles_name_unique unique (name)
);

create table public.chapter_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  chapter_id uuid references public.chapters (id) on delete cascade,
  role public.membership_role not null,
  status public.membership_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint membership_chapter_required check (
    (role in ('chapter_admin', 'member') and chapter_id is not null)
    or (role in ('pnm', 'ifc_admin'))
  ),
  constraint memberships_scope_unique unique nulls not distinct (user_id, chapter_id, role)
);

create table public.rush_registrations (
  id uuid primary key default gen_random_uuid(),
  rush_cycle_id uuid not null references public.rush_cycles (id) on delete restrict,
  pnm_id uuid not null references public.profiles (id) on delete cascade,
  phone_consent_at timestamptz,
  phone_consent_text_version text,
  funny_question_answer text,
  registered_at timestamptz not null default now(),
  constraint rush_registration_unique unique (rush_cycle_id, pnm_id),
  constraint consent_version_requires_consent check (phone_consent_text_version is null or phone_consent_at is not null)
);

create table public.rush_cycle_settings (
  rush_cycle_id uuid primary key references public.rush_cycles (id) on delete cascade,
  funny_question_prompt text,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pnm_chapter_progress (
  id uuid primary key default gen_random_uuid(),
  rush_cycle_id uuid not null references public.rush_cycles (id) on delete restrict,
  chapter_id uuid not null references public.chapters (id) on delete restrict,
  pnm_id uuid not null references public.profiles (id) on delete cascade,
  round_status public.pnm_round_status not null default 'open_invite',
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pnm_chapter_progress_unique unique (rush_cycle_id, chapter_id, pnm_id)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters (id) on delete restrict,
  rush_cycle_id uuid not null references public.rush_cycles (id) on delete restrict,
  title text not null check (char_length(trim(title)) between 1 and 160),
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location_name text,
  address text,
  capacity integer check (capacity is null or capacity > 0),
  status public.event_status not null default 'draft',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_dates_valid check (ends_at > starts_at)
);

create table public.event_plans (
  event_id uuid not null references public.events (id) on delete cascade,
  pnm_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, pnm_id)
);

create table public.event_rsvps (
  event_id uuid not null references public.events (id) on delete cascade,
  pnm_id uuid not null references public.profiles (id) on delete cascade,
  status public.rsvp_status not null,
  responded_at timestamptz not null default now(),
  primary key (event_id, pnm_id)
);

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete restrict,
  pnm_id uuid not null references public.profiles (id) on delete restrict,
  checked_in_at timestamptz not null default now(),
  method public.attendance_method not null,
  checked_in_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint attendance_once_per_event unique (event_id, pnm_id)
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters (id) on delete restrict,
  rush_cycle_id uuid not null references public.rush_cycles (id) on delete restrict,
  pnm_id uuid not null references public.profiles (id) on delete restrict,
  status public.invitation_status not null default 'pending',
  created_by uuid references public.profiles (id) on delete set null,
  decided_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint invitation_decision_consistent check (
    (status in ('accepted', 'declined', 'rescinded') and decided_at is not null)
    or (status in ('pending', 'sent'))
  )
);

create table public.shortlists (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  pnm_id uuid not null references public.profiles (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint shortlist_unique unique (chapter_id, pnm_id)
);

create index chapter_memberships_user_idx on public.chapter_memberships (user_id);
create index chapter_memberships_chapter_idx on public.chapter_memberships (chapter_id);
create index rush_registrations_pnm_idx on public.rush_registrations (pnm_id);
create index pnm_chapter_progress_lookup_idx on public.pnm_chapter_progress (rush_cycle_id, chapter_id, round_status);
create index pnm_chapter_progress_pnm_idx on public.pnm_chapter_progress (pnm_id, rush_cycle_id);
create index events_cycle_start_idx on public.events (rush_cycle_id, starts_at);
create index events_chapter_start_idx on public.events (chapter_id, starts_at);
create index event_plans_pnm_idx on public.event_plans (pnm_id, created_at desc);
create index event_rsvps_pnm_idx on public.event_rsvps (pnm_id, responded_at desc);
create index attendance_pnm_idx on public.attendance (pnm_id, checked_in_at desc);
create index invitations_pnm_idx on public.invitations (pnm_id, created_at desc);
create index shortlists_pnm_idx on public.shortlists (pnm_id);

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger chapters_set_updated_at before update on public.chapters
for each row execute function public.set_updated_at();
create trigger rush_cycles_set_updated_at before update on public.rush_cycles
for each row execute function public.set_updated_at();
create trigger rush_cycle_settings_set_updated_at before update on public.rush_cycle_settings
for each row execute function public.set_updated_at();
create trigger chapter_memberships_set_updated_at before update on public.chapter_memberships
for each row execute function public.set_updated_at();
create trigger pnm_chapter_progress_set_updated_at before update on public.pnm_chapter_progress
for each row execute function public.set_updated_at();
create trigger events_set_updated_at before update on public.events
for each row execute function public.set_updated_at();
create trigger invitations_set_updated_at before update on public.invitations
for each row execute function public.set_updated_at();

-- Enable RLS everywhere before exposing tables through the Supabase API.
alter table public.profiles enable row level security;
alter table public.chapters enable row level security;
alter table public.rush_cycles enable row level security;
alter table public.chapter_memberships enable row level security;
alter table public.rush_registrations enable row level security;
alter table public.rush_cycle_settings enable row level security;
alter table public.pnm_chapter_progress enable row level security;
alter table public.events enable row level security;
alter table public.event_plans enable row level security;
alter table public.event_rsvps enable row level security;
alter table public.attendance enable row level security;
alter table public.invitations enable row level security;
alter table public.shortlists enable row level security;

-- The chapter directory is public; private participant and recruitment data has no client policies yet.
grant select on public.chapters to anon, authenticated;
create policy "Anyone can read active chapters"
  on public.chapters
  for select
  to anon, authenticated
  using (is_active);
