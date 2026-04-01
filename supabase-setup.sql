create extension if not exists pgcrypto;

create table if not exists public.papers (
  id uuid primary key default gen_random_uuid(),
  year integer not null check (year between 1900 and 2100),
  title text not null,
  authors text not null,
  target_journal text not null default 'OOO',
  status text not null default 'working'
    check (status in ('working', 'with-editor', 'under-review', 'under-rr')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_papers_updated_at on public.papers;

create trigger set_papers_updated_at
before update on public.papers
for each row
execute function public.set_updated_at();

alter table public.papers enable row level security;

drop policy if exists "papers_select_public" on public.papers;
drop policy if exists "papers_insert_public" on public.papers;
drop policy if exists "papers_update_public" on public.papers;

create policy "papers_select_public"
on public.papers
for select
to anon, authenticated
using (true);

create policy "papers_insert_public"
on public.papers
for insert
to anon, authenticated
with check (true);

create policy "papers_update_public"
on public.papers
for update
to anon, authenticated
using (true)
with check (true);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'papers'
  ) then
    alter publication supabase_realtime add table public.papers;
  end if;
end;
$$;

insert into public.papers (
  year,
  title,
  authors,
  target_journal,
  status,
  sort_order
)
select *
from (
  values
    (
      2026,
      'CEO digital background and firm value: Evidence from Korea',
      'Moonseok Choi, Jeongkwon Seo, Seokjin Choi, and Seung Hun Han',
      'OOO',
      'working',
      1
    ),
    (
      2026,
      'Which firm is less important? Evidence from business group-interlocked independent directors',
      'Moonseok Choi, Jeongkwon Seo, Seokjin Choi, and Seung Hun Han',
      'OOO',
      'working',
      2
    ),
    (
      2026,
      'Betting on Chaos: Political uncertainty and lottery demand',
      'Moonseok Choi, Jeongkwon Seo, and Seung Hun Han',
      'OOO',
      'under-review',
      3
    ),
    (
      2026,
      'CEO facial masculinity, CEO power, and long-term compensation: Moderating role of monitoring intensity',
      'Moonseok Choi, Jeongkwon Seo, Dongjoon Kim, Seokjin Choi, and Seung Hun Han',
      'OOO',
      'under-rr',
      4
    )
) as seed_data (
  year,
  title,
  authors,
  target_journal,
  status,
  sort_order
)
where not exists (
  select 1 from public.papers
);
