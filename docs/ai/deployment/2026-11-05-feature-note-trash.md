---
phase: deployment
title: Trash rollout
description: Database-first compatibility and scheduled cleanup activation
---

# Trash — rollout

Stage is prepared for [PR #214](https://github.com/koreyba/EverFreeNote/pull/214). Production has not been changed.

## Infrastructure

Existing static Cloudflare Pages and Supabase are sufficient. Supabase `pg_cron` runs small hourly batches; `pg_net` dispatches the Storage Edge worker. An authenticated activity fallback remains available without Cron. No extra Cloudflare Worker or paid service is introduced.

## Deployment Pipeline

Complete local checks, review and exact-head CI, then verify on Stage before Production. Rebuild Android: the APK bundles web assets. Old clients gain server-side archive protection from the migration but require an updated APK for the Trash UI/offline snapshots.

## Environment Configuration

The Edge worker uses managed `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` plus a dedicated `TRASH_CLEANUP_SECRET` for scheduled calls. Ordinary calls validate the user's JWT. Configure the same dedicated secret in Vault as `trash_cleanup_secret`, and the environment's `/functions/v1/trash-cleanup` endpoint as `trash_cleanup_url`. Never reuse another environment's endpoint/secret.

`supabase/config.toml` sets `verify_jwt=false` for this function because it supports dedicated scheduled authentication; the handler itself rejects unauthenticated requests. This setting does not authorize arbitrary owner/global requests.

## Deployment Steps

1. Apply `20261105193000_add_note_trash.sql` to Stage using the normal migration process. Verify old authenticated/service-role DELETE, exact recovery, owner isolation and account cascades with synthetic notes.
2. Deploy `trash-cleanup` using the existing Supabase CLI workflow. Set its dedicated secret through managed secrets; create the two Vault entries through the environment's administrative secret workflow. No secret belongs in the repository, browser bundle or literal cron command.
3. Apply `20261105193001_schedule_note_trash.sql` after local/Stage safety checks. It enables available extensions and calls `configure_note_trash_cron()`. A false result means Cron is unavailable; the activity fallback still works. Re-run the privileged helper after enabling extensions if necessary.
4. Inspect jobs `purge-note-trash` (`17 * * * *`) and `cleanup-note-trash-media` (`27 * * * *`). Confirm successful `cron.job_run_details`, then inspect worker results/outbox progress. Missing Vault/pg_net configuration makes dispatch return NULL; it is not successful file cleanup.
5. Apply `20261105193002_add_trash_card_previews.sql`, then reload the PostgREST schema and verify owner-only reads. Deploy the web bundle and rebuilt Android shell. Verify single/bulk Delete → Trash → open/restore, selected/empty permanent deletion, offline reload/reconnect and expired-note catch-up.
6. Run controlled Stage expiry with synthetic server timestamps; prove no early deletion, bounded progress and shared-image protection through the actual Storage API. Measure HTTP/Storage/cloud load. Repeat the validated rollout in Production and record runtime evidence separately from merge/CI.

## Database Migrations

The migrations are additive. Trash retention starts at server acceptance; earlier deleted notes cannot be recovered. A full `db push` applies the migrations in order, so perform safety validation before that command and verify schedule state afterwards. First rollout has no aged Trash rows by default; never backdate real retention to simulate a test.

The media inventory backfills at most 100 legacy notes per worker claim before file GC is enabled. Large existing datasets can delay physical removal for several scheduled runs. Unknown paths conservatively block file GC and need operator investigation; they do not block database note expiry.

## Secrets Management

Vault contains the dedicated endpoint/maintenance secret; the function gets its service credential only from managed server environment. Use normal secret rotation: update worker/Vault consistently and verify rejection of unauthenticated/wrong-secret calls. Do not print secret values in validation logs.

## Rollback Plan

Disable both jobs with privileged `cron.unschedule('purge-note-trash')` and `cron.unschedule('cleanup-note-trash-media')`; disable scheduled worker dispatch if necessary. Retain snapshots, RLS, ID guards and archive trigger. Do not drop Trash or resume irreversible normal deletion when rolling back the UI. Permanent deletion is irreversible; backups and runtime validation follow the existing release process.

## Stage checkpoint — 2026-11-05

- Cloudflare preview deployed and returned HTTP 200; its Supabase target was verified as EverFreeNoteStage.
- The two Trash migrations were applied to Stage and recorded in migration history after a transactional dry run. PostgREST reloaded the schema.
- The Stage `trash-cleanup` function and its managed secret/Vault entries are configured. Both hourly jobs are active; a manual call through the scheduled dispatcher returned HTTP 200.
- Rolled-back synthetic SQL smoke checks passed for archive, restore, owner isolation, permanent deletion and expiry. Browser acceptance is pending.
