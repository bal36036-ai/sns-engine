-- 2026-09-28 Supabase に適用済み（MCP apply_migration: sns_cron_dispatch_to_github）。記録用の写し。
-- pg_cron が 7/22/37/52分に GitHub API へ repository_dispatch(event_type=cron-live) を送る。
-- GitHub トークンは Supabase Vault の 'github_dispatch_token' に保管（ばるが登録）。未登録の間は何もしない。
-- 止めるとき：select cron.unschedule('sns-cron-engine-dispatch');
create extension if not exists pg_net;
create extension if not exists pg_cron with schema pg_catalog;

create or replace function sns.dispatch_cron_engine()
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  token text;
  req_id bigint;
begin
  select decrypted_secret into token from vault.decrypted_secrets where name = 'github_dispatch_token' limit 1;
  if token is null or length(token) = 0 then
    raise notice 'github_dispatch_token is not set; skip';
    return null;
  end if;
  select net.http_post(
    url := 'https://api.github.com/repos/bal36036-ai/sns-engine/dispatches',
    body := jsonb_build_object('event_type', 'cron-live', 'client_payload', jsonb_build_object('source', 'supabase-pg_cron', 'at', now())),
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || token,
      'Accept', 'application/vnd.github+json',
      'X-GitHub-Api-Version', '2022-11-28',
      'User-Agent', 'sns-engine-supabase-cron',
      'Content-Type', 'application/json'
    ),
    timeout_milliseconds := 10000
  ) into req_id;
  return req_id;
end;
$$;

revoke all on function sns.dispatch_cron_engine() from public;
revoke all on function sns.dispatch_cron_engine() from anon, authenticated;

select cron.schedule('sns-cron-engine-dispatch', '7,22,37,52 * * * *', $$select sns.dispatch_cron_engine();$$);
