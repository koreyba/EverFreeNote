import { execFile, execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { attachment, step } from 'allure-js-commons'

// Explicit opt-in: disposable PostgreSQL only, no ports, volumes or remote credentials.
const localPostgres =
  process.env.TRASH_TEST_POSTGRES === '1' ? describe : describe.skip
const withVectors = process.env.TRASH_TEST_VECTOR === '1'
const container = `everfreenote-trash-test-${process.pid}`
const owner = '11111111-1111-4111-8111-111111111111'
const other = '22222222-2222-4222-8222-222222222222'
const noteId = '33333333-3333-4333-8333-333333333333'

function execute(statement: string): string {
  // TCP becomes ready only after the image's temporary initialization server has stopped.
  return execFileSync(
    'docker',
    [
      'exec',
      '-i',
      container,
      'psql',
      '-h',
      '127.0.0.1',
      '-XqAt',
      '-v',
      'ON_ERROR_STOP=1',
      '-U',
      'postgres',
    ],
    {
      input: statement,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    },
  ).trim()
}

async function sql(statement: string, actor: string | null = null) {
  return step('Execute PostgreSQL statement', async () => {
    const query = actor
      ? `SET ROLE authenticated; SET request.jwt.claim.sub = '${actor}'; ${statement}`
      : statement
    await attachment('SQL', query, 'text/plain')
    try {
      const result = execute(query)
      await attachment('PostgreSQL result', result || '(no rows)', 'text/plain')
      return result
    } catch (error) {
      await attachment(
        'PostgreSQL failure',
        error instanceof Error ? error.message : String(error),
        'text/plain',
      )
      throw error
    }
  })
}

async function seed(body = '<p>Recover this</p>') {
  await sql(`INSERT INTO public.notes(id,user_id,title,description,tags,created_at,updated_at)
    VALUES('${noteId}','${owner}','Recover me','${body.replaceAll("'", "''")}',ARRAY['work'],'2026-01-01','2026-01-02')`)
}

localPostgres('Trash lifecycle in PostgreSQL', () => {
  beforeAll(async () => {
    execFileSync(
      'docker',
      [
        'run',
        '--detach',
        '--rm',
        '--name',
        container,
        '--network',
        'none',
        '--cpus',
        '1',
        '--memory',
        '512m',
        '--env',
        'POSTGRES_HOST_AUTH_METHOD=trust',
        withVectors
          ? 'pgvector/pgvector:pg18@sha256:c29f30688a9ad961691bdf0ec1650717cc132a5814619d80f80463d6e4c42e47'
          : 'postgres:18.3-alpine',
        '-c',
        'shared_buffers=64MB',
      ],
      { stdio: 'pipe' },
    )
    const deadline = Date.now() + 30000
    while (true) {
      try {
        execute('SELECT 1')
        break
      } catch (error) {
        if (Date.now() > deadline) throw error
        await new Promise((done) => setTimeout(done, 200))
      }
    }
    execute(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      GRANT USAGE ON SCHEMA auth, public TO authenticated, anon, service_role;
      CREATE SCHEMA storage; CREATE TABLE storage.objects(id uuid DEFAULT gen_random_uuid(),bucket_id text,name text, PRIMARY KEY(bucket_id,name));`)
    execute(
      readFileSync(
        resolve('supabase/migrations/20250101000000_initial_schema.sql'),
        'utf8',
      ),
    )
    execute(
      readFileSync(
        resolve('supabase/migrations/20250101000001_enable_rls.sql'),
        'utf8',
      ),
    )
    execute(
      readFileSync(
        resolve('supabase/migrations/20260428000001_add_public_note_links.sql'),
        'utf8',
      ),
    )
    execute(
      'GRANT SELECT,INSERT,UPDATE,DELETE ON public.notes TO authenticated,service_role;',
    )
    if (withVectors)
      execute(
        readFileSync(
          resolve(
            'supabase/migrations/20260302000002_update_note_embeddings_chunking.sql',
          ),
          'utf8',
        ),
      )
    // An absent migration leaves the legacy schema so the initial red run tests the missing behavior.
    for (const file of [
      '20261105193000_add_note_trash.sql',
      '20261105193001_schedule_note_trash.sql',
    ]) {
      const migration = resolve('supabase/migrations', file)
      if (existsSync(migration)) execute(readFileSync(migration, 'utf8'))
    }
  }, 45000)

  afterAll(() => {
    execFileSync('docker', ['rm', '--force', '--volumes', container], {
      stdio: 'pipe',
    })
  })

  beforeEach(async () => {
    await sql(`TRUNCATE auth.users CASCADE;
      TRUNCATE storage.objects,note_trash_private.trash_media_cleanup;
      UPDATE note_trash_private.trash_media_inventory SET last_id=NULL,complete=true;
      INSERT INTO auth.users VALUES('${owner}'),('${other}')`)
  })

  it('archives a legacy authenticated DELETE with exact content and timestamps', async () => {
    await seed()
    await sql(`DELETE FROM public.notes WHERE id='${noteId}'`, owner)
    expect(await sql("SELECT to_regclass('public.notes_trash')::text")).toBe(
      'notes_trash',
    )
    const row = JSON.parse(
      await sql(
        `SELECT row_to_json(t) FROM public.notes_trash t WHERE original_note_id='${noteId}'`,
        owner,
      ),
    )
    expect(row).toMatchObject({
      original_note_id: noteId,
      user_id: owner,
      title: 'Recover me',
      description: '<p>Recover this</p>',
      tags: ['work'],
    })
    expect(
      await sql(`SELECT count(*) FROM public.notes WHERE id='${noteId}'`),
    ).toBe('0')
    expect(Date.parse(row.deleted_at)).toBeGreaterThan(Date.now() - 10000)
  })

  it('restores the original ID and content without restoring public sharing', async () => {
    await seed()
    await sql(
      `INSERT INTO public.note_share_links(note_id,user_id,token) VALUES('${noteId}','${owner}','synthetic-share')`,
    )
    await sql(`DELETE FROM public.notes WHERE id='${noteId}'`, owner)
    const id = await sql(
      `SELECT trash_id FROM public.notes_trash WHERE original_note_id='${noteId}'`,
      owner,
    )
    expect(
      JSON.parse(
        await sql(`SELECT public.restore_notes(ARRAY['${id}']::uuid[])`, owner),
      ),
    ).toMatchObject([{ id: noteId, status: 'restored' }])
    expect(
      await sql(
        `SELECT description FROM public.notes WHERE id='${noteId}'`,
        owner,
      ),
    ).toBe('<p>Recover this</p>')
    expect(
      await sql(
        `SELECT count(*) FROM public.note_share_links WHERE note_id='${noteId}'`,
      ),
    ).toBe('0')
    expect(
      await sql(
        `SELECT count(*) FROM public.notes_trash WHERE trash_id='${id}'`,
        owner,
      ),
    ).toBe('0')
  })

  it('rolls back the active deletion if storing its recoverable snapshot fails', async () => {
    await seed()
    await sql(
      `INSERT INTO public.note_share_links(note_id,user_id,token) VALUES('${noteId}','${owner}','rollback-share')`,
    )
    await expect(
      sql(`BEGIN;ALTER TABLE public.notes_trash ADD CONSTRAINT fixture_archive_failure CHECK(false) NOT VALID;
      DELETE FROM public.notes WHERE id='${noteId}';ROLLBACK;`),
    ).rejects.toThrow(/check constraint/)
    expect(
      await sql(
        `SELECT description FROM public.notes WHERE id='${noteId}'`,
        owner,
      ),
    ).toBe('<p>Recover this</p>')
    expect(await sql('SELECT count(*) FROM public.note_share_links')).toBe('1')
    expect(await sql('SELECT count(*) FROM public.notes_trash', owner)).toBe(
      '0',
    )
  })

  it('archives the owned service-role DELETE used by older API clients', async () => {
    await seed()
    await sql(
      `SET ROLE service_role;DELETE FROM public.notes WHERE id='${noteId}' AND user_id='${owner}'`,
    )
    expect(await sql('SELECT description FROM public.notes_trash', owner)).toBe(
      '<p>Recover this</p>',
    )
  })

  it('does not let an old permanent-deletion confirmation remove a new deletion cycle', async () => {
    await seed()
    await sql(`DELETE FROM public.notes WHERE id='${noteId}'`, owner)
    const original = await sql(
      `SELECT trash_id FROM public.notes_trash WHERE original_note_id='${noteId}'`,
      owner,
    )
    await sql(
      `SELECT public.restore_notes(ARRAY['${original}']::uuid[]);DELETE FROM public.notes WHERE id='${noteId}'`,
      owner,
    )
    expect(
      JSON.parse(
        await sql(
          `SELECT public.purge_notes(ARRAY['${original}']::uuid[])`,
          owner,
        ),
      ),
    ).toMatchObject([{ status: 'missing' }])
    expect(await sql('SELECT count(*) FROM public.notes_trash', owner)).toBe(
      '1',
    )
    expect(
      await sql('SELECT trash_id FROM public.notes_trash', owner),
    ).not.toBe(original)
  })

  it('uses 720 elapsed hours as the inclusive server-side expiry boundary', async () => {
    expect(
      await sql(`BEGIN;
      INSERT INTO public.notes_trash(original_note_id,user_id,title,deleted_at) VALUES
        (gen_random_uuid(),'${owner}','At boundary',now()-interval '720 hours'),
        (gen_random_uuid(),'${owner}','One second young',now()-interval '720 hours'+interval '1 second');
      SELECT public.purge_expired_note_trash();SELECT title FROM public.notes_trash;ROLLBACK;`),
    ).toBe('1\nOne second young')
  })

  it('isolates Trash reads and destructive actions by the authenticated owner', async () => {
    await seed()
    await sql(`DELETE FROM public.notes WHERE id='${noteId}'`, owner)
    const id = await sql(
      `SELECT trash_id FROM public.notes_trash WHERE original_note_id='${noteId}'`,
      owner,
    )
    expect(await sql('SELECT count(*) FROM public.notes_trash', other)).toBe(
      '0',
    )
    expect(
      JSON.parse(
        await sql(`SELECT public.purge_notes(ARRAY['${id}']::uuid[])`, other),
      ),
    ).toMatchObject([{ status: 'missing' }])
    expect(await sql('SELECT count(*) FROM public.notes_trash', owner)).toBe(
      '1',
    )
  })

  it('expires only entries at least 720 hours old and limits each purge to 100', async () => {
    await sql(`INSERT INTO public.notes_trash(original_note_id,user_id,title,description,deleted_at)
      SELECT gen_random_uuid(),'${owner}','Expired','body',now()-interval '721 hours' FROM generate_series(1,150);
      INSERT INTO public.notes_trash(original_note_id,user_id,title,description,deleted_at)
      VALUES(gen_random_uuid(),'${owner}','Recent','body',now()-interval '719 hours')`)
    expect(await sql('SELECT public.purge_expired_note_trash()')).toBe('100')
    expect(await sql('SELECT count(*) FROM public.notes_trash')).toBe('51')
    expect(await sql('SELECT public.purge_expired_note_trash()')).toBe('50')
    expect(await sql('SELECT title FROM public.notes_trash')).toBe('Recent')
  })

  it('does not archive notes again during an auth-user cascade', async () => {
    await seed()
    await sql(`DELETE FROM auth.users WHERE id='${owner}'`)
    expect(
      await sql(`SELECT count(*) FROM public.notes WHERE user_id='${owner}'`),
    ).toBe('0')
    expect(
      await sql(
        `SELECT count(*) FROM public.notes_trash WHERE user_id='${owner}'`,
      ),
    ).toBe('0')
  })

  it('idempotently accepts a never-synced note without making it active', async () => {
    const input = JSON.stringify([
      {
        id: noteId,
        snapshot: {
          title: 'Local',
          description: 'Unsynced body',
          tags: ['offline'],
        },
      },
    ])
    const first = JSON.parse(
      await sql(`SELECT public.trash_notes('${input}'::jsonb)`, owner),
    )
    expect(first).toMatchObject([{ id: noteId, status: 'trashed' }])
    const deadline = await sql(
      `SELECT deleted_at FROM public.notes_trash WHERE original_note_id='${noteId}'`,
      owner,
    )
    expect(
      JSON.parse(
        await sql(`SELECT public.trash_notes('${input}'::jsonb)`, owner),
      ),
    ).toMatchObject([
      { trash_id: first[0].trash_id, status: 'already_trashed' },
    ])
    expect(
      await sql(
        `SELECT deleted_at FROM public.notes_trash WHERE original_note_id='${noteId}'`,
        owner,
      ),
    ).toBe(deadline)
    expect(await sql('SELECT count(*) FROM public.notes', owner)).toBe('0')
  })

  it('preserves a concurrently edited active note on a stale deletion request', async () => {
    await seed()
    const input = JSON.stringify([
      { id: noteId, expected_updated_at: '2025-01-01' },
    ])
    expect(
      JSON.parse(
        await sql(`SELECT public.trash_notes('${input}'::jsonb)`, owner),
      ),
    ).toMatchObject([{ status: 'conflict' }])
    expect(
      await sql(
        `SELECT description FROM public.notes WHERE id='${noteId}'`,
        owner,
      ),
    ).toBe('<p>Recover this</p>')
    expect(await sql('SELECT count(*) FROM public.notes_trash', owner)).toBe(
      '0',
    )
  })

  it('rejects raw Trash writes and authenticated access to the global purger', async () => {
    await expect(sql('DELETE FROM public.notes_trash', owner)).rejects.toThrow(
      'permission denied',
    )
    await expect(
      sql('SELECT public.purge_expired_note_trash()', owner),
    ).rejects.toThrow('permission denied')
    await expect(
      sql('SET ROLE anon; SELECT public.restore_notes(ARRAY[]::uuid[])'),
    ).rejects.toThrow('permission denied')
  })

  it('throttles activity sweeps across tabs while allowing five bounded chunks per run', async () => {
    await sql(`INSERT INTO public.notes_trash(original_note_id,user_id,title,description,deleted_at)
      SELECT gen_random_uuid(),'${owner}','Expired','body',now()-interval '721 hours' FROM generate_series(1,550)`)
    expect(
      await sql(`SELECT public.cleanup_my_trash('${noteId}')`, owner),
    ).toBe('100')
    expect(await sql(`SELECT public.cleanup_my_trash('${other}')`, owner)).toBe(
      '0',
    )
    expect(
      await sql(`SELECT public.cleanup_my_trash('${noteId}')`, other),
    ).toBe('0')
    expect(
      await sql(`SELECT public.cleanup_my_trash('${noteId}')`, owner),
    ).toBe('100')
  })

  it('retains an imported image while another note still references it', async () => {
    const path = `${owner}/${noteId}/image.png`
    const body = `<img src="https://example.supabase.co/storage/v1/object/public/note-images/${path}">`
    await sql(
      `INSERT INTO storage.objects(bucket_id,name) VALUES('note-images','${path}')`,
    )
    await seed(body)
    await sql(
      `INSERT INTO public.notes(id,user_id,description) VALUES(gen_random_uuid(),'${owner}','${body}')`,
    )
    await sql(`DELETE FROM public.notes WHERE id='${noteId}'`, owner)
    const id = await sql(
      `SELECT trash_id FROM public.notes_trash WHERE original_note_id='${noteId}'`,
      owner,
    )
    await sql(`SELECT public.purge_notes(ARRAY['${id}']::uuid[])`, owner)
    expect(
      await sql(
        `SELECT count(*) FROM public.note_image_refs WHERE object_path='${path}'`,
      ),
    ).toBe('1')
    expect(
      await sql('SELECT count(*) FROM public.claim_trash_media_cleanup()'),
    ).toBe('0')
    await sql(`DELETE FROM public.notes WHERE user_id='${owner}'`, owner)
    await sql(
      "UPDATE public.notes_trash SET deleted_at=now()-interval '721 hours'; SELECT public.purge_expired_note_trash()",
    )
    expect(
      await sql(
        `SELECT count(*) FROM public.claim_trash_media_cleanup('${owner}')`,
      ),
    ).toBe('1')
  })

  it('keeps failed file removals queued and rejects stale completion leases', async () => {
    const path = `${owner}/${noteId}/retry.png`
    await sql(
      `INSERT INTO storage.objects(bucket_id,name) VALUES('note-images','${path}')`,
    )
    await seed(
      `<img src="https://example.supabase.co/storage/v1/object/public/note-images/${path}">`,
    )
    await sql(`DELETE FROM public.notes WHERE id='${noteId}'`, owner)
    await sql(
      `SELECT public.purge_notes(ARRAY(SELECT trash_id FROM public.notes_trash))`,
      owner,
    )
    const claimed = JSON.parse(
      await sql(
        `SELECT coalesce(json_agg(c),'[]'::json) FROM public.claim_trash_media_cleanup('${owner}') c`,
      ),
    )
    expect(claimed).toHaveLength(1)
    await sql(
      `SELECT public.complete_trash_media_cleanup_batch('${JSON.stringify(claimed)}'::jsonb,false)`,
    )
    expect(
      await sql(
        `SELECT state FROM note_trash_private.trash_media_cleanup WHERE object_path='${path}'`,
      ),
    ).toBe('deleting')
    await expect(
      sql(
        `INSERT INTO public.notes(id,user_id,description) VALUES(gen_random_uuid(),'${owner}',
      '<img src="https://example.supabase.co/storage/v1/object/public/note-images/${path}">')`,
        owner,
      ),
    ).rejects.toThrow(/image|retry/i)
    await sql(
      `SELECT public.complete_trash_media_cleanup_batch('[{"object_path":"${path}","lease_id":"${noteId}"}]'::jsonb,true)`,
    )
    expect(
      await sql(
        `SELECT count(*) FROM note_trash_private.trash_media_cleanup WHERE object_path='${path}'`,
      ),
    ).toBe('1')
  })

  it('provides a scheduler configuration that reports unavailable pg_cron explicitly', async () => {
    expect(await sql('SELECT public.configure_note_trash_cron()')).toBe('f')
    await expect(
      sql('SELECT public.configure_note_trash_cron()', owner),
    ).rejects.toThrow('permission denied')
  })

  it('does not re-trash a restored note when the same offline operation is retried', async () => {
    await seed()
    const request = JSON.stringify([
      { id: noteId, operation_id: 'durable-delete-operation' },
    ])
    const first = JSON.parse(
      await sql(`SELECT public.trash_notes('${request}'::jsonb)`, owner),
    )
    await sql(
      `SELECT public.restore_notes(ARRAY['${first[0].trash_id}']::uuid[])`,
      owner,
    )
    await sql(`SELECT public.trash_notes('${request}'::jsonb)`, owner)
    expect(
      await sql(
        `SELECT count(*) FROM public.notes WHERE id='${noteId}'`,
        owner,
      ),
    ).toBe('1')
    expect(await sql('SELECT count(*) FROM public.notes_trash', owner)).toBe(
      '0',
    )
  })

  it('cannot bypass Trash identity protection with an UPDATE of the active ID', async () => {
    await seed()
    await sql(`DELETE FROM public.notes WHERE id='${noteId}'`, owner)
    await sql(
      `INSERT INTO public.notes(id,user_id,title) VALUES('${other}','${owner}','Another')`,
    )
    await expect(
      sql(`UPDATE public.notes SET id='${noteId}' WHERE id='${other}'`, owner),
    ).rejects.toThrow(/identity|Trash/i)
  })

  it('keeps ambiguous image edits local while a Storage deletion is leased', async () => {
    await seed()
    await sql(
      `INSERT INTO note_trash_private.trash_media_cleanup(object_path,user_id,state) VALUES('${owner}/other/leased.png','${owner}','deleting')`,
    )
    await expect(
      sql(
        `UPDATE public.notes SET description='<img src="/unknown/note-images/opaque">' WHERE id='${noteId}'`,
        owner,
      ),
    ).rejects.toThrow(/image|cleanup|retry/i)
    expect(
      await sql(
        `SELECT description FROM public.notes WHERE id='${noteId}'`,
        owner,
      ),
    ).toBe('<p>Recover this</p>')
  })

  it('rejects an incomplete snapshot before changing an existing note', async () => {
    await seed()
    const input = JSON.stringify([
      {
        id: noteId,
        expected_updated_at: '2026-01-02',
        snapshot: { title: 'Partial' },
      },
    ])
    await expect(
      sql(`SELECT public.trash_notes('${input}'::jsonb)`, owner),
    ).rejects.toThrow(/snapshot|content/i)
    expect(
      await sql(
        `SELECT description FROM public.notes WHERE id='${noteId}'`,
        owner,
      ),
    ).toBe('<p>Recover this</p>')
    expect(await sql('SELECT count(*) FROM public.notes_trash', owner)).toBe(
      '0',
    )
  })

  it('blocks file cleanup when a body mixes known and unrecognized image references', async () => {
    const path = `${owner}/${noteId}/mixed.png`
    await sql(
      `INSERT INTO storage.objects(bucket_id,name) VALUES('note-images','${path}')`,
    )
    await seed(
      `<img src="https://example.supabase.co/storage/v1/object/public/note-images/${path}">`,
    )
    await sql(`DELETE FROM public.notes WHERE id='${noteId}'`, owner)
    await sql(
      'SELECT public.purge_notes(ARRAY(SELECT trash_id FROM public.notes_trash))',
      owner,
    )
    await sql(`INSERT INTO public.notes(user_id,description) VALUES('${owner}',
      '<img src="https://example.supabase.co/storage/v1/object/public/note-images/${owner}/known.png"><img src="/unknown/note-images/opaque">')`)
    expect(
      await sql('SELECT count(*) FROM public.claim_trash_media_cleanup()'),
    ).toBe('0')
    expect(
      await sql(
        'SELECT count(*) FROM note_trash_private.unverified_note_images',
      ),
    ).toBe('1')
  })

  it('backfills at most 100 legacy notes before allowing physical file cleanup', async () => {
    await sql(`INSERT INTO public.notes(user_id,description)
      SELECT '${owner}','<img src="https://example.supabase.co/storage/v1/object/public/note-images/${owner}/legacy-'||g||'.png">'
      FROM generate_series(1,201) g;
      TRUNCATE public.note_image_refs;
      UPDATE note_trash_private.trash_media_inventory SET complete=false,last_id=NULL`)
    await sql('SELECT count(*) FROM public.claim_trash_media_cleanup()')
    expect(await sql('SELECT count(*) FROM public.note_image_refs')).toBe('100')
    expect(
      await sql(
        'SELECT complete FROM note_trash_private.trash_media_inventory',
      ),
    ).toBe('f')
    await sql(
      'SELECT count(*) FROM public.claim_trash_media_cleanup();SELECT count(*) FROM public.claim_trash_media_cleanup()',
    )
    expect(await sql('SELECT count(*) FROM public.note_image_refs')).toBe('201')
    expect(
      await sql(
        'SELECT complete FROM note_trash_private.trash_media_inventory',
      ),
    ).toBe('t')
  })
  ;(withVectors ? it : it.skip)(
    'measures real migration batches with large bodies, vector cascades and concurrent activity',
    async () => {
      for (let offset = 0; offset < 10000; offset += 1000) {
        execute(`INSERT INTO public.notes(id,user_id,title,description)
        SELECT md5('active-'||g)::uuid,'${owner}','Active '||g,repeat('x',2048) FROM generate_series(${offset + 1},${offset + 1000}) g`)
      }
      execute(`INSERT INTO public.notes(id,user_id,title,description)
      SELECT md5('move-'||g)::uuid,'${owner}','Move candidate',repeat('y',2048) FROM generate_series(1,100) g;
      INSERT INTO public.note_share_links(note_id,user_id,token)
        SELECT id,user_id,'synthetic-'||id FROM public.notes WHERE title='Move candidate';
      INSERT INTO public.note_embeddings(note_id,user_id,chunk_index,char_offset,content,embedding)
        SELECT n.id,n.user_id,g,0,'Synthetic vector chunk',
          ARRAY(SELECT sin(i)::real FROM generate_series(1,1536) i)::vector(1536)
        FROM public.notes n CROSS JOIN generate_series(0,3) g WHERE title='Move candidate';
      INSERT INTO public.notes_trash(original_note_id,user_id,title,description,deleted_at)
        SELECT md5('expired-'||g)::uuid,'${owner}','Expired',repeat('z',2048)||
          '<img src="https://example.supabase.co/storage/v1/object/public/note-images/${owner}/'||md5('expired-'||g)::uuid||'/image.png">',
          now()-interval '721 hours' FROM generate_series(1,500) g;
      INSERT INTO public.notes_trash(original_note_id,user_id,title,description,deleted_at)
        SELECT md5('recent-'||g)::uuid,'${owner}','Recent',repeat('r',2048),now()-interval '719 hours' FROM generate_series(1,500) g;
      INSERT INTO public.notes_trash(original_note_id,user_id,title,description,deleted_at)
        SELECT md5('large-'||g)::uuid,'${other}','Large',
          (SELECT string_agg(md5(g::text||':'||block::text),'') FROM generate_series(1,8192) block)||
          '<img src="https://example.supabase.co/storage/v1/object/public/note-images/${other}/'||md5('large-'||g)::uuid||'/image.png">',
          now()-interval '722 hours' FROM generate_series(1,100) g;
      INSERT INTO storage.objects(bucket_id,name)
        SELECT 'note-images',object_path FROM public.note_image_refs;
      ANALYZE public.notes;ANALYZE public.notes_trash;ANALYZE public.note_image_refs;ANALYZE storage.objects;`)

      const measure = (query: string, actor?: string) =>
        Array.from({ length: 7 }, () => {
          const explain = JSON.parse(
            execute(`SET statement_timeout='2s';BEGIN;
        ${actor ? `SET LOCAL ROLE authenticated;SET LOCAL request.jwt.claim.sub='${actor}';` : ''}
        EXPLAIN(ANALYZE,BUFFERS,WAL,FORMAT JSON) ${query};ROLLBACK;`),
          )
          return explain[0]['Execution Time'] as number
        })
      const move = `SELECT public.trash_notes((SELECT jsonb_agg(jsonb_build_object('id',id)) FROM public.notes WHERE title='Move candidate'))`
      const metrics = {
        generated_at: new Date().toISOString(),
        version: execute('SELECT version()'),
        fixture: {
          active: 10100,
          expired_regular: 500,
          expired_large: 100,
          recent_trash: 500,
          large_body_bytes: 262144,
          vector_chunks: 400,
          dimensions: 1536,
          images: 600,
        },
        limits: {
          cpu: 1,
          memory_mib: 512,
          shared_buffers_mib: 64,
          notes_per_call: 100,
          statement_timeout_ms: 2000,
        },
        move_100_ms: measure(move, owner),
        purge_100_regular_ms: measure(
          `SELECT public.purge_expired_note_trash('${owner}')`,
        ),
        purge_100_large_ms: measure(
          `SELECT public.purge_expired_note_trash('${other}')`,
        ),
        concurrent_purge_ms: [] as number[],
        vacuum_wall_ms: 0,
        limitations: [
          'Local PostgreSQL with real pgvector/HNSW; synthetic auth.uid and Storage metadata. No HTTP, Storage API, pg_cron runtime or cloud load.',
        ],
      }
      execute(
        `SET ROLE authenticated;SET request.jwt.claim.sub='${owner}';${move}`,
      )
      const activity = new Promise<void>((done, reject) => {
        const child = execFile(
          'docker',
          [
            'exec',
            '-i',
            container,
            'psql',
            '-h',
            '127.0.0.1',
            '-XqAt',
            '-v',
            'ON_ERROR_STOP=1',
            '-U',
            'postgres',
          ],
          (error) => (error ? reject(error) : done()),
        )
        child.stdin!
          .end(`SET statement_timeout='5s';SET ROLE authenticated;SET request.jwt.claim.sub='${owner}';
        DO $$BEGIN FOR i IN 1..100 LOOP
          PERFORM title FROM public.notes WHERE user_id='${owner}' ORDER BY updated_at DESC LIMIT 50;
          UPDATE public.notes SET title='Edited during cleanup' WHERE id=md5('active-1')::uuid;
          PERFORM pg_sleep(0.002);
        END LOOP;END$$;`)
      })
      try {
        for (let i = 0; i < 6; i++)
          metrics.concurrent_purge_ms.push(
            JSON.parse(
              execute(
                `SET statement_timeout='2s';EXPLAIN(ANALYZE,BUFFERS,WAL,FORMAT JSON) SELECT public.purge_expired_note_trash()`,
              ),
            )[0]['Execution Time'],
          )
      } finally {
        await activity
      }
      const vacuumStarted = performance.now()
      execute('VACUUM(ANALYZE) public.notes_trash,public.note_embeddings')
      metrics.vacuum_wall_ms = performance.now() - vacuumStarted
      await attachment(
        'Real migration workload',
        JSON.stringify(metrics, null, 2),
        'application/json',
      )
      if (process.env.TRASH_BENCHMARK_OUTPUT)
        writeFileSync(
          process.env.TRASH_BENCHMARK_OUTPUT,
          JSON.stringify(metrics, null, 2) + '\n',
        )
      expect(execute('SELECT count(*) FROM public.notes')).toBe('10000')
      expect(
        execute(
          "SELECT count(*) FROM public.notes_trash WHERE deleted_at<=now()-interval '720 hours'",
        ),
      ).toBe('0')
      expect(execute('SELECT count(*) FROM public.notes_trash')).toBe('600')
      expect(execute('SELECT count(*) FROM public.note_embeddings')).toBe('0')
      expect(execute('SELECT count(*) FROM public.note_share_links')).toBe('0')
      expect(
        execute('SELECT count(*) FROM note_trash_private.trash_media_cleanup'),
      ).toBe('600')
      expect(execute('SELECT count(*) FROM storage.objects')).toBe('600')
    },
    90000,
  )
})
