-- Rollback: sns_skip_idle_cron_dispatch. NOT applied to production.
-- Only edit the existing function body; pg_get_functiondef preserves its attributes.
-- No Vault read, HTTP call, cron change, GRANT/REVOKE or owner change during installation.
-- DO is one atomic statement; let the migration runner control its transaction.
DO $migration$
DECLARE
  function_oid regprocedure := 'sns.dispatch_cron_engine()'::regprocedure;
  original_source text;
  normalized_source text;
  base_source text;
  function_definition text;
  gate constant text := $gate$  -- sns-idle-dispatch-gate-v1: keep equivalent to cron-engine.js selectors.
  IF NOT EXISTS (
    SELECT 1 FROM sns.posts
    WHERE status IN ('ready', 'scheduled')
      AND external_post_id IS NULL
      AND (scheduled_at IS NULL OR scheduled_at <= now())
      AND (claimed_at IS NULL OR claimed_at < now() - interval '10 minutes')
  ) AND NOT EXISTS (
    SELECT 1 FROM sns.posts
    WHERE external_service = 'buffer' AND external_post_id IS NOT NULL AND is_historical = false
      AND (target_sns <> ALL(ARRAY['instagram']::text[])
           OR post_result->'buffer_lookup'->>'state' IS DISTINCT FROM 'not_found'
           OR post_result->'buffer_lookup'->>'external_post_id' IS DISTINCT FROM external_post_id
           OR CASE WHEN jsonb_typeof(post_result->'buffer_lookup'->'next_check_after') = 'number'
                   THEN (post_result->'buffer_lookup'->>'next_check_after')::numeric ELSE 0 END <= EXTRACT(EPOCH FROM now()) * 1000)
      AND (status IN ('ready', 'scheduled', 'failed', 'needs_review')
           OR post_result->>'status' IS DISTINCT FROM 'sent'
           OR matched_external_link IS NULL)
  ) THEN
    RETURN NULL;
  END IF;
  -- /sns-idle-dispatch-gate-v1
$gate$;
BEGIN
  SELECT prosrc, pg_get_functiondef(oid) INTO original_source, function_definition
    FROM pg_proc WHERE oid = function_oid
      AND prorettype = 'bigint'::regtype AND prolang = (SELECT oid FROM pg_language WHERE lanname = 'plpgsql');
  IF original_source IS NULL THEN
    RAISE EXCEPTION 'unexpected dispatch_cron_engine signature/language';
  END IF;
  normalized_source := replace(original_source, E'\r\n', E'\n');
  base_source := replace(normalized_source, gate, '');
  -- Fingerprint of the recorded 20260928 function body after trim/CRLF normalization.
  -- Stop on drift; never print a function body that could contain sensitive values.
  IF md5(btrim(base_source, E' \t\r\n')) <> 'c49a3bc4b80c815f4b4911807784172c' THEN
    RAISE EXCEPTION 'unexpected dispatch_cron_engine body; inspect safely before applying';
  END IF;
  IF normalized_source = base_source THEN
    RAISE NOTICE 'idle dispatch gate already absent';
    RETURN;
  END IF;
  normalized_source := base_source;
  -- The definition is never returned or logged. CREATE OR REPLACE retains OID/owner/ACL.
  EXECUTE replace(function_definition, original_source, normalized_source);
END;
$migration$;
