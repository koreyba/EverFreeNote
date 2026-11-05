---
phase: monitoring
title: Trash cleanup monitoring
description: Database, Cron and file-cleanup operational checks
---

# Trash — monitoring

The implementation exposes durable gate/outbox state and standard Cron/Edge history. No new external dashboard, alert or notification has been configured.

## Key Metrics

Track retained/expired note bytes/counts, oldest expired age, purge duration/count/timeouts, last successful scheduled execution, relation/TOAST growth, receipt size, media inventory completion, unverified references and outbox attempts/age. A SQL purge success does not prove Storage removal.

## Monitoring Tools

Use Supabase SQL/Cron history and Edge Function logs. Example administrative queries contain counts/state only:

```sql
select count(*) as retained, coalesce(sum(body_bytes),0) as body_bytes,
  count(*) filter (where deleted_at <= now()-interval '720 hours') as expired,
  min(deleted_at) filter (where deleted_at <= now()-interval '720 hours') as oldest_expired
from public.notes_trash;

select complete,last_id from note_trash_private.trash_media_inventory;
select count(*) as unverified_notes from note_trash_private.unverified_note_images;
select state,count(*),max(attempts),min(next_attempt_at)
from note_trash_private.trash_media_cleanup group by state;
select pg_total_relation_size('public.notes_trash') as trash_relation_bytes,
  pg_total_relation_size('note_trash_private.operations') as receipt_relation_bytes;

-- Only when pg_cron is installed:
select jobname,schedule,active from cron.job
where jobname in ('purge-note-trash','cleanup-note-trash-media');
select jobid,status,start_time,end_time,return_message
from cron.job_run_details order by start_time desc limit 20;
```

The worker returns a removal count only after Storage success plus lease acknowledgement; HTTP 503 retains retry work. A zero count can mean referenced files, incomplete inventory, unknown references, throttle or no due work. Inspect durable state before interpreting it.

## Logging Strategy

Log operation/count/duration/error class. Avoid bodies, titles, share tokens, media URLs and credentials. Bound existing Cron history retention so monitoring does not fill the free database. Operation receipts intentionally have no TTL; their account FK handles account deletion.

## Alerts & Notifications

No alert channel has been selected. Release operators should watch repeated Cron failures/missing runs, growing eligible backlog age, stuck inventory/unknown references, repeated file failures and actual database/Storage headroom. Set thresholds from Stage/cloud measurements, not the local timing sample.

## Dashboards

The SQL/Cron view above is sufficient initially; no paid monitoring service is required.

## Incident Response

Disable scheduled destructive work if retention/ownership safety is uncertain. Preserve snapshots/outbox/receipts, reproduce with synthetic data, fix the demonstrated scenario and rerun focused checks. Never broaden a retry's IDs or remove deletion fences just to reduce backlog.

## Health Checks

Verify no-work invocations are cheap, failures do not trigger a tight loop, and resumed schedule/activity performs bounded work. The global expiry lock and per-owner gates prevent duplicate sweeps; file claims/backoff are independent. Include actual Storage and paused/unavailable-project recovery in release smoke checks.
