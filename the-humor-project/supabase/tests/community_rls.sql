-- Run through Supabase SQL Editor or MCP. All test users and rows are rolled back.
begin;
do $$
declare
  author uuid := gen_random_uuid();
  voter uuid := gen_random_uuid();
  caption uuid;
  draft uuid;
  vote_id uuid;
  before_count bigint;
  score record;
begin
  insert into auth.users(id, raw_user_meta_data) values
    (author, '{"firstname":"Test","lastname":"Author"}'),
    (voter, '{"firstname":"Test","lastname":"Voter"}');
  if (select count(*) from public.profiles where id in (author, voter)) <> 2 then
    raise exception 'Signup trigger did not create both profiles';
  end if;

  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', author::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub',author,'role','authenticated')::text, true);
  caption := public.publish_external_caption('Write a dry caption about subway delays.', 'NYC', 'Test caption, not a real AI generation.', 'Test model');
  insert into public.generations(user_id,prompt,topic) values(author,'A private prompt for testing only.','Dorm life') returning id into draft;
  if (select count(*) from public.generations where id = draft) <> 1 then raise exception 'Owner cannot read draft'; end if;
  select count(*) into before_count from public.generations where user_id = author;
  begin
    perform public.publish_external_caption('Valid prompt for atomicity test.', 'NYC', '', 'Test model');
    raise exception 'Empty caption accepted';
  exception when check_violation then null;
  end;
  if (select count(*) from public.generations where user_id = author) <> before_count then raise exception 'Failed publication left an orphan generation'; end if;
  begin
    perform public.submit_caption_vote(caption,1);
    raise exception 'Self-vote accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.captions set content = 'Changed' where id = caption;
    raise exception 'Published caption can be edited';
  exception when insufficient_privilege then null;
  end;

  perform set_config('request.jwt.claim.sub', voter::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub',voter,'role','authenticated')::text, true);
  if exists(select 1 from public.generations where id = draft) then raise exception 'Private draft leaked'; end if;
  if exists(select 1 from public.profiles where id = author) then raise exception 'Private profile leaked'; end if;
  if not exists(select 1 from public.get_caption_feed('newest',null,0) where id = caption) then raise exception 'Published caption missing from feed'; end if;
  if exists(select 1 from public.get_caption_feed('mine',null,0) where id = caption) then raise exception 'My posts includes another author'; end if;
  if exists(select 1 from public.get_caption_feed('newest','Campus',0) where id = caption) then raise exception 'Topic filter failed'; end if;
  begin
    insert into public.generations(user_id,prompt,topic) values(author,'Attempt to impersonate author.','Campus');
    raise exception 'Generation impersonation allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.caption_votes(caption_id,user_id,value) values(caption,author,1);
    raise exception 'Voter impersonation allowed';
  exception when insufficient_privilege then null;
  end;

  perform public.submit_caption_vote(caption,1);
  select id into vote_id from public.caption_votes where caption_id = caption;
  perform public.submit_caption_vote(caption,1);
  if (select count(*) from public.caption_votes where caption_id = caption) <> 1 then raise exception 'Duplicate votes'; end if;
  perform public.submit_caption_vote(caption,-1);
  if not exists(select 1 from public.caption_votes where id = vote_id and value = -1) then raise exception 'Changing vote replaced row or failed'; end if;
  begin
    update public.caption_votes set user_id = author where id = vote_id;
    raise exception 'Vote identity can be reassigned';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.submit_caption_vote(caption,2);
    raise exception 'Invalid vote accepted';
  exception when invalid_parameter_value then null;
  end;
  select * into score from public.get_caption_feed('top','NYC',0) where id = caption;
  if score.id is null or score.upvotes <> 0 or score.downvotes <> 1 or score.own_vote <> -1 then raise exception 'Voter totals incorrect'; end if;

  perform set_config('request.jwt.claim.sub', author::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub',author,'role','authenticated')::text, true);
  if exists(select 1 from public.caption_votes where id = vote_id) then raise exception 'Other voter record leaked'; end if;
  delete from public.caption_votes where id = vote_id;
  select * into score from public.get_caption_feed('mine',null,0) where id = caption;
  if score.downvotes <> 1 or score.own_vote <> 0 then raise exception 'Author totals incorrect or another vote deleted'; end if;

  perform set_config('request.jwt.claim.sub', voter::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub',voter,'role','authenticated')::text, true);
  perform public.submit_caption_vote(caption,0);
  if exists(select 1 from public.caption_votes where caption_id = caption) then raise exception 'Vote removal failed'; end if;
  select * into score from public.get_caption_feed('newest',null,0) where id = caption;
  if score.upvotes <> 0 or score.downvotes <> 0 or score.own_vote <> 0 then raise exception 'Removal totals incorrect'; end if;

  execute 'set local role anon';
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '{}', true);
  begin
    perform * from public.generations;
    raise exception 'Anonymous can read generations';
  exception when insufficient_privilege then null;
  end;
  begin
    perform * from public.captions;
    raise exception 'Anonymous can read captions';
  exception when insufficient_privilege then null;
  end;
  begin
    perform * from public.caption_votes;
    raise exception 'Anonymous can read votes';
  exception when insufficient_privilege then null;
  end;
  begin
    perform * from public.get_caption_feed('newest',null,0);
    raise exception 'Anonymous can call feed';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.publish_external_caption('Anonymous publication attempt.','NYC','No','Test');
    raise exception 'Anonymous can publish';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.submit_caption_vote(caption,1);
    raise exception 'Anonymous can vote';
  exception when insufficient_privilege then null;
  end;
  execute 'reset role';
end $$;
rollback;
