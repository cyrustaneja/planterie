-- Milestone 2: users/roles + audit-log skeleton (PRD.md Section 7, Section 14 #2).

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now()
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor uuid references public.users (id) on delete set null,
  action text not null,
  target text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- Every new Supabase auth user gets a matching public.users row, defaulting to
-- role='member'. Promote the first admin by hand in the SQL editor after signup.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.users enable row level security;
alter table public.audit_log enable row level security;

-- Small trusted internal team: any signed-in user can see who else has access.
create policy "users are readable by any authenticated user"
  on public.users for select
  to authenticated
  using (true);

-- Role changes only happen through the server's service-role client (CLAUDE.md's
-- human-approval-gate rule) — no client-side insert/update/delete policy is defined,
-- so RLS denies those by default.

-- Audit log is admin-readable only; writes only ever happen via the service-role client.
create policy "audit log is readable by admins"
  on public.audit_log for select
  to authenticated
  using (
    exists (
      select 1 from public.users
      where public.users.id = auth.uid()
        and public.users.role = 'admin'
    )
  );
