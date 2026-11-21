-- ============================================================================
-- AyuVansha (KinChart) — Multi-Generational Family Medical & Prescription Timeline
-- Complete Supabase PostgreSQL Schema, RLS Policies & Private Storage Setup
-- ============================================================================

create extension if not exists "uuid-ossp";

-- 1. Families (Household Workspace)
create table families (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  subscription_tier text not null default 'free' check (subscription_tier in ('free', 'family_care', 'multi_gen_plus')),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 2. Family Access Control (Maps auth.users to families)
create table family_users (
  family_id uuid not null references families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'editor' check (role in ('admin', 'editor', 'viewer')),
  primary key (family_id, user_id)
);

-- 3. Family Members (Living & Deceased Blood Relatives)
create table family_members (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references families(id) on delete cascade,
  full_name text not null,
  relationship_label text not null, -- e.g., 'Self', 'Mother', 'Paternal Grandfather'
  dob date,
  biological_sex text check (biological_sex in ('male', 'female', 'other')),
  blood_group text,
  is_deceased boolean not null default false,
  cause_of_death text,
  mother_id uuid references family_members(id) on delete set null,
  father_id uuid references family_members(id) on delete set null,
  consent_verified boolean not null default true,
  created_at timestamptz not null default now()
);

-- 4. Uploaded Medical Documents
create table medical_documents (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references families(id) on delete cascade,
  member_id uuid not null references family_members(id) on delete cascade,
  storage_path text not null,
  doc_type text not null check (doc_type in ('prescription', 'lab_report', 'discharge_summary', 'vaccination', 'other')),
  doc_date date,
  hospital_or_doctor text,
  ocr_status text not null default 'pending' check (ocr_status in ('pending', 'needs_review', 'verified', 'failed')),
  raw_extraction jsonb,
  created_at timestamptz not null default now()
);

-- 5. Structured Clinical Timeline Events (Verified by Human-in-the-Loop)
create table timeline_events (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references families(id) on delete cascade,
  member_id uuid not null references family_members(id) on delete cascade,
  document_id uuid references medical_documents(id) on delete set null,
  event_date date not null,
  event_type text not null check (event_type in ('diagnosis', 'medication', 'allergy', 'surgery', 'lab_abnormal')),
  title text not null, -- Standardized name (e.g., 'Metformin 500mg', 'Type 2 Diabetes')
  details jsonb not null default '{}'::jsonb, -- { dosage, frequency, is_active, lab_value, reference_range }
  is_hereditary_flag boolean not null default false,
  verified_by_user boolean not null default false,
  created_at timestamptz not null default now()
);

-- 6. Ephemeral Doctor QR Share Tokens
create table share_tokens (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references families(id) on delete cascade,
  member_id uuid not null references family_members(id) on delete cascade,
  token_hash text not null unique,
  pin_code text, -- Optional 4-digit PIN
  expires_at timestamptz not null,
  revoked boolean not null default false,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

-- 7. Immutable Privacy & Access Audit Logs
create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references families(id) on delete cascade,
  member_id uuid references family_members(id) on delete set null,
  actor_type text not null check (actor_type in ('family_user', 'doctor_qr_session')),
  actor_identifier text not null,
  action text not null, -- e.g., 'VIEWED_QR_BRIEF', 'PURGED_MEMBER', 'VERIFIED_DOC'
  created_at timestamptz not null default now()
);

-- Security Helper Function (SECURITY DEFINER prevents RLS infinite recursion)
create or replace function is_family_member(target_family_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$select exists ( select 1 from family_users where family_id = target_family_id and user_id = auth.uid() );$$;

-- Enable RLS on all tables
alter table families enable row level security;
alter table family_users enable row level security;
alter table family_members enable row level security;
alter table medical_documents enable row level security;
alter table timeline_events enable row level security;
alter table share_tokens enable row level security;
alter table audit_logs enable row level security;

-- Core RLS Policies
create policy "Users view their families" on families for select using (is_family_member(id) or created_by = auth.uid());
create policy "Users create families" on families for insert with check (auth.uid() = created_by);
create policy "Users update their families" on families for update using (is_family_member(id));
create policy "Users view family memberships" on family_users for select using (is_family_member(family_id));
create policy "Creators add initial membership" on family_users for insert with check (auth.uid() = user_id);

create policy "Family access to members" on family_members for all using (is_family_member(family_id));
create policy "Family access to documents" on medical_documents for all using (is_family_member(family_id));
create policy "Family access to timeline" on timeline_events for all using (is_family_member(family_id));
create policy "Family access to share_tokens" on share_tokens for all using (is_family_member(family_id));
create policy "Family read audit_logs" on audit_logs for select using (is_family_member(family_id));

-- Private Storage Bucket Setup: medical-records
-- Path convention: {family_id}/{member_id}/{document_id}.{ext}
insert into storage.buckets (id, name, public)
values ('medical-records', 'medical-records', false)
on conflict (id) do nothing;

create policy "Family members can read medical-records"
on storage.objects for select
using (
  bucket_id = 'medical-records'
  and is_family_member((storage.foldername(name))[1]::uuid)
);

create policy "Family members can upload medical-records"
on storage.objects for insert
with check (
  bucket_id = 'medical-records'
  and is_family_member((storage.foldername(name))[1]::uuid)
);

create policy "Family members can delete medical-records"
on storage.objects for delete
using (
  bucket_id = 'medical-records'
  and is_family_member((storage.foldername(name))[1]::uuid)
);
