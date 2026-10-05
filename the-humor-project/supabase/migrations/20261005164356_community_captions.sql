-- Version matches the migration recorded in the connected Supabase project.
begin;

create table public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt text not null check (char_length(btrim(prompt)) between 10 and 2000),
  topic text not null check (topic in ('Campus', 'Dorm life', 'NYC')),
  source text not null default 'pending' check (source in ('pending', 'external_ai', 'app_ai')),
  provider text check (char_length(btrim(provider)) between 1 and 80),
  status text not null default 'queued' check (status in ('queued', 'ready', 'failed')),
  created_at timestamptz not null default now(),
  check ((status = 'ready' and source <> 'pending' and provider is not null)
    or (status <> 'ready' and source = 'pending' and provider is null))
);

create table public.captions (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null unique references public.generations(id) on delete cascade,
  content text not null check (char_length(btrim(content)) between 1 and 500),
  created_at timestamptz not null default now()
);

create table public.caption_votes (
  id uuid primary key default gen_random_uuid(),
  caption_id uuid not null references public.captions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  unique (caption_id, user_id)
);

create index generations_owner_created_idx on public.generations(user_id, created_at desc);
create index captions_created_idx on public.captions(created_at desc);
create index caption_votes_user_idx on public.caption_votes(user_id);

alter table public.generations enable row level security;
alter table public.captions enable row level security;
alter table public.caption_votes enable row level security;

revoke all on public.generations, public.captions, public.caption_votes from public, anon, authenticated;
grant select on public.generations, public.captions, public.caption_votes to authenticated;
grant insert (user_id, prompt, topic, source, provider, status) on public.generations to authenticated;
grant insert (generation_id, content) on public.captions to authenticated;
grant insert (caption_id, user_id, value), update (value), delete on public.caption_votes to authenticated;
grant all on public.generations, public.captions, public.caption_votes to service_role;

create policy generations_read on public.generations for select to authenticated
  using (user_id = (select auth.uid()) or status = 'ready');
create policy generations_create on public.generations for insert to authenticated
  with check (user_id = (select auth.uid()) and
    ((source = 'pending' and status = 'queued' and provider is null)
      or (source = 'external_ai' and status = 'ready' and provider is not null)));

create policy captions_read on public.captions for select to authenticated
  using (exists (select 1 from public.generations g where g.id = generation_id and g.status = 'ready'));
create policy captions_create on public.captions for insert to authenticated
  with check (exists (select 1 from public.generations g where g.id = generation_id
    and g.user_id = (select auth.uid()) and g.status = 'ready' and g.source = 'external_ai'));

create policy votes_read_own on public.caption_votes for select to authenticated
  using (user_id = (select auth.uid()));
create policy votes_insert_own on public.caption_votes for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (
    select 1 from public.captions c join public.generations g on g.id = c.generation_id
    where c.id = caption_id and g.status = 'ready' and g.user_id <> (select auth.uid())));
create policy votes_update_own on public.caption_votes for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and exists (
    select 1 from public.captions c join public.generations g on g.id = c.generation_id
    where c.id = caption_id and g.status = 'ready' and g.user_id <> (select auth.uid())));
create policy votes_delete_own on public.caption_votes for delete to authenticated
  using (user_id = (select auth.uid()));

-- Signup triggers still execute automatically; clients must not call this directly.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Invoker rights preserve RLS. Both rows commit together or neither does.
create function public.publish_external_caption(p_prompt text, p_topic text, p_content text, p_provider text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare generation_uuid uuid; caption_uuid uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  insert into public.generations(user_id, prompt, topic, source, provider, status)
    values (auth.uid(), btrim(p_prompt), p_topic, 'external_ai', btrim(p_provider), 'ready') returning id into generation_uuid;
  insert into public.captions(generation_id, content)
    values (generation_uuid, btrim(p_content)) returning id into caption_uuid;
  return caption_uuid;
end $$;

create function public.submit_caption_vote(p_caption_id uuid, p_value integer)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_value is null or p_value not in (-1, 0, 1) then raise exception 'Invalid vote' using errcode = '22023'; end if;
  if p_value = 0 then
    delete from public.caption_votes where caption_id = p_caption_id and user_id = auth.uid();
  else
    insert into public.caption_votes(caption_id, user_id, value) values (p_caption_id, auth.uid(), p_value)
      on conflict (caption_id, user_id) do update set value = excluded.value;
  end if;
end $$;

-- Counts need access to all votes, not voter identities. Keep that privilege in
-- a non-exposed schema, behind an invoker API wrapper and an explicit UID check.
create schema community_private;
revoke all on schema community_private from public, anon, authenticated;
grant usage on schema community_private to authenticated;

create function community_private.caption_feed(p_view text, p_topic text, p_offset integer)
returns table (id uuid, content text, prompt text, topic text, provider text, user_id uuid,
  created_at timestamptz, upvotes bigint, downvotes bigint, own_vote smallint)
language plpgsql stable security definer set search_path = '' as $$
declare viewer uuid := auth.uid();
begin
  if viewer is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_view is null or p_view not in ('newest', 'top', 'mine') or p_offset is null or p_offset not between 0 and 19980
    or (p_topic is not null and p_topic not in ('Campus', 'Dorm life', 'NYC')) then
    raise exception 'Invalid feed filter' using errcode = '22023';
  end if;
  return query
    select c.id, c.content, g.prompt, g.topic, g.provider, g.user_id, c.created_at,
      count(v.id) filter (where v.value = 1), count(v.id) filter (where v.value = -1),
      coalesce(max(v.value) filter (where v.user_id = viewer), 0)::smallint
    from public.captions c join public.generations g on g.id = c.generation_id
    left join public.caption_votes v on v.caption_id = c.id
    where g.status = 'ready' and (p_topic is null or g.topic = p_topic)
      and (p_view <> 'mine' or g.user_id = viewer)
      and (p_view <> 'top' or c.created_at >= now() - interval '7 days')
    group by c.id, g.id
    order by case when p_view = 'top' then coalesce(sum(v.value), 0) end desc nulls last,
      c.created_at desc, c.id desc
    limit 20 offset p_offset;
end $$;

create function public.get_caption_feed(p_view text default 'newest', p_topic text default null, p_offset integer default 0)
returns table (id uuid, content text, prompt text, topic text, provider text, user_id uuid,
  created_at timestamptz, upvotes bigint, downvotes bigint, own_vote smallint)
language sql stable security invoker set search_path = '' as $$
  select * from community_private.caption_feed(p_view, p_topic, p_offset);
$$;

revoke all on function public.publish_external_caption(text,text,text,text),
  public.submit_caption_vote(uuid,integer), public.get_caption_feed(text,text,integer),
  community_private.caption_feed(text,text,integer) from public, anon, authenticated;
grant execute on function public.publish_external_caption(text,text,text,text),
  public.submit_caption_vote(uuid,integer), public.get_caption_feed(text,text,integer),
  community_private.caption_feed(text,text,integer) to authenticated;

commit;
