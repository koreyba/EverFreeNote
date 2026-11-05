import { execFile, execFileSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import * as allure from 'allure-js-commons'

const container = process.env.MCP_DATABASE_CONTAINER
const databaseSuite = container ? describe : describe.skip
const OWNER = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const FOREIGN = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const C = '33333333-3333-4333-8333-333333333333'
const D = '44444444-4444-4444-8444-444444444444'
const E = '55555555-5555-4555-8555-555555555555'
const vector = `'[1,' || repeat('0,', 1534) || '0]'`

async function sql(statement: string): Promise<string> {
  return allure.step('Execute SQL in isolated notebook database', async () => {
    await allure.attachment('SQL request', statement, 'text/plain')
    try {
      const output = await new Promise<string>((resolve, reject) => {
        const child = execFile('docker', ['exec', '-i', container!, 'psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-U', 'supabase_admin', '-d', 'mcp_workflows'], { encoding: 'utf8', maxBuffer: 2_000_000 }, (error, stdout, stderr) => {
          if (error) reject(Object.assign(error, { stderr }))
          else resolve(stdout)
        })
        child.stdin?.end(statement)
      })
      await allure.attachment('SQL response', output, 'text/plain')
      return output.trim()
    } catch (error) {
      const failure = error as Error & { stderr?: string }
      await allure.attachment('SQL error', failure.stderr?.toString() ?? failure.message, 'text/plain')
      throw failure
    }
  })
}
async function asUser(statement: string, owner = OWNER): Promise<Record<string, unknown>> {
  const output = await sql(`SET ROLE authenticated; SET request.jwt.claim.sub = '${owner}'; ${statement}`)
  return JSON.parse(output)
}

databaseSuite('MCP notebook database contracts', () => {
  beforeAll(async () => {
    // Never run destructive fixtures in an arbitrary application container.
    const purpose = execFileSync('docker', ['inspect', '--format', '{{ index .Config.Labels "com.everfreenote.test-purpose" }}', container!], { encoding: 'utf8' }).trim()
    if (purpose !== 'mcp-note-workflows') throw new Error('MCP database fixtures require a disposable container labelled com.everfreenote.test-purpose=mcp-note-workflows')
    await sql(readFileSync(join(process.cwd(), 'core/tests/fixtures/mcpNotebookDatabase.sql'), 'utf8'))
    for (const name of ['20250101000000_initial_schema.sql', '20250101000001_enable_rls.sql', '20260302000002_update_note_embeddings_chunking.sql', '20260302000004_enable_note_embeddings_rls.sql', '20260318000001_add_note_embedding_body_fields.sql']) {
      await sql(readFileSync(join(process.cwd(), 'supabase/migrations', name), 'utf8'))
    }
    for (const name of readdirSync('supabase/migrations').filter(name => name.endsWith('_mcp_note_workflows.sql'))) {
      await sql(readFileSync(join(process.cwd(), 'supabase/migrations', name), 'utf8'))
    }
    await sql('GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes, public.note_embeddings TO authenticated;')
  })

  beforeEach(async () => {
    await allure.label('feature', 'mcp-note-workflows-db')
    await sql(`TRUNCATE public.note_embeddings, public.notes, auth.users CASCADE;
      INSERT INTO auth.users(id) VALUES ('${OWNER}'), ('${FOREIGN}');
      INSERT INTO public.notes(id,user_id,title,description,tags,created_at,updated_at) VALUES
      ('${A}','${OWNER}','Interview','<p>Hiring plan</p>',ARRAY['Work','urgent'],'2026-10-10Z','2026-10-11Z'),
      ('${B}','${OWNER}','Daily notes','<p>Interview reminder</p>',ARRAY['work','urgent'],'2026-10-20Z','2026-10-21Z'),
      ('${C}','${FOREIGN}','Interview secret','<p>Private interview</p>',ARRAY['work','urgent'],'2026-10-20Z','2026-10-21Z'),
      ('${D}','${OWNER}','Interview old','<p>Old interview</p>',ARRAY['work'],'2026-09-20Z','2026-09-21Z'),
      ('${E}','${OWNER}','Different wording','<p>Recruitment discussion</p>',ARRAY['work'],'2026-10-25Z','2026-10-26Z');
      INSERT INTO public.note_embeddings(note_id,user_id,chunk_index,char_offset,content,body_content,embedding)
      SELECT '${A}','${OWNER}',i,0,'Hiring plan','Hiring plan',(${vector})::vector FROM generate_series(0,9) i;
      INSERT INTO public.note_embeddings(note_id,user_id,chunk_index,char_offset,content,body_content,embedding) VALUES
      ('${B}','${OWNER}',0,0,'Interview reminder','Interview reminder',('[1,0.1,' || repeat('0,',1533) || '0]')::vector),
      ('${C}','${FOREIGN}',0,0,'Private interview','Private interview',(${vector})::vector),
      ('${E}','${OWNER}',0,0,'Recruitment discussion','Recruitment discussion',('[1,0.2,' || repeat('0,',1533) || '0]')::vector);`)
  })

  it('updates the requested owner note only when its exact version matches', async () => {
    const result = await asUser(`SELECT public.mcp_update_note('${A}','2026-10-11Z','{"description":"<p>New</p>"}'::jsonb);`)
    expect(result.status).toBe('updated')
    expect(result.note).toMatchObject({ description: '<p>New</p>', title: 'Interview', tags: ['Work', 'urgent'] })
  })

  it('rejects a stale version without overwriting the newer body', async () => {
    await asUser(`SELECT public.mcp_update_note('${A}','2026-10-11Z','{"description":"<p>First writer</p>"}'::jsonb);`)
    const result = await asUser(`SELECT public.mcp_update_note('${A}','2026-10-11Z','{"description":"<p>Stale writer</p>"}'::jsonb);`)
    expect(result.status).toBe('conflict')
    expect(await sql(`SELECT description FROM public.notes WHERE id='${A}';`)).toBe('<p>First writer</p>')
  })

  it('does not disclose or update a foreign note', async () => {
    const result = await asUser(`SELECT public.mcp_update_note('${C}','2026-10-21Z','{"title":"Changed"}'::jsonb);`)
    expect(result).toEqual({ status: 'not_found' })
    expect(await sql(`SELECT title FROM public.notes WHERE id='${C}';`)).toBe('Interview secret')
  })

  it('denies anonymous execution of both RPCs', async () => {
    await expect(sql(`SET ROLE anon; SELECT public.mcp_update_note('${A}',NULL,'{}'::jsonb);`)).rejects.toThrow('permission denied for function')
    await expect(sql(`SET ROLE anon; SELECT public.search_notebook_notes('interview');`)).rejects.toThrow('permission denied for function')
  })

  it('filters dates and case-insensitive all-tags before text ranking', async () => {
    const result = await asUser(`SELECT public.search_notebook_notes('interview', tag_filters => ARRAY['WORK','urgent'], created_after => '2026-10-01Z', created_before => '2026-11-01Z');`)
    expect(result.total).toBe(2)
    expect((result.notes as { id: string }[]).map(note => note.id)).toEqual([A, B])
    expect(result.has_more).toBe(false)
  })

  it('returns totals even for a page beyond the last match', async () => {
    const result = await asUser(`SELECT public.search_notebook_notes('interview', result_limit => 1, result_offset => 100);`)
    expect(result).toMatchObject({ notes: [], total: 3, has_more: false })
  })

  it('ranks different notes rather than allowing ten chunks to consume the note limit', async () => {
    const result = await asUser(`SELECT public.search_notebook_notes('hiring', search_mode => 'semantic', query_embedding => (${vector})::vector, tag_filters => ARRAY['urgent'], result_limit => 2);`)
    expect(result.total).toBe(2)
    expect((result.notes as { id: string }[]).map(note => note.id)).toEqual([A, B])
  })

  it('combines lexical and semantic candidates with reciprocal rank fusion', async () => {
    const result = await asUser(`SELECT public.search_notebook_notes('interview', search_mode => 'hybrid', query_embedding => (${vector})::vector, created_after => '2026-10-01Z');`)
    expect((result.notes as { id: string }[]).map(note => note.id)).toEqual(expect.arrayContaining([A, B, E]))
    expect((result.notes as { id: string }[])[0].id).toBe(A)
    expect(JSON.stringify(result)).not.toContain(C)
  })

  it('uses exclusive upper bounds and sorts eligible notes by recency', async () => {
    const result = await asUser(`SELECT public.search_notebook_notes('interview', created_before => '2026-10-20Z', sort_by => 'updated_at');`)
    expect((result.notes as { id: string }[]).map(note => note.id)).toEqual([A, D])
  })
  it('serializes two concurrent writes so exactly one old-version update succeeds', async () => {
    const results = await Promise.all([
      asUser(`BEGIN; SELECT public.mcp_update_note('${A}','2026-10-11Z','{"description":"<p>Writer one</p>"}'::jsonb); SELECT pg_sleep(0.2); COMMIT;`),
      asUser(`BEGIN; SELECT public.mcp_update_note('${A}','2026-10-11Z','{"description":"<p>Writer two</p>"}'::jsonb); SELECT pg_sleep(0.2); COMMIT;`),
    ])
    expect(results.map(result => result.status).sort()).toEqual(['conflict', 'updated'])
    const persisted = await sql(`SELECT description FROM public.notes WHERE id='${A}';`)
    expect(['<p>Writer one</p>', '<p>Writer two</p>']).toContain(persisted)
  })

  it('allows an explicit null token only while the legacy timestamp is still null', async () => {
    await sql(`BEGIN; ALTER TABLE public.notes DISABLE TRIGGER update_notes_updated_at; UPDATE public.notes SET updated_at=NULL WHERE id='${A}'; ALTER TABLE public.notes ENABLE TRIGGER update_notes_updated_at; COMMIT;`)
    const first = await asUser(`SELECT public.mcp_update_note('${A}',NULL,'{"title":"Legacy updated"}'::jsonb);`)
    const stale = await asUser(`SELECT public.mcp_update_note('${A}',NULL,'{"title":"Stale"}'::jsonb);`)
    expect(first.status).toBe('updated')
    expect(stale.status).toBe('conflict')
  })

  it('normalizes nullable titles and tags in search results', async () => {
    await sql(`INSERT INTO public.notes(id,user_id,title,description,tags) VALUES ('66666666-6666-4666-8666-666666666666','${OWNER}',NULL,'<p>Nullable interview</p>',NULL);`)
    const result = await asUser(`SELECT public.search_notebook_notes('nullable');`)
    expect(result.notes).toEqual([expect.objectContaining({ title: '', tags: [] })])
  })

  it('rejects unsupported patch fields and invalid date ranges at the SQL boundary', async () => {
    await expect(asUser(`SELECT public.mcp_update_note('${A}','2026-10-11Z','{"user_id":"${FOREIGN}"}'::jsonb);`)).rejects.toThrow('patch must contain only')
    await expect(asUser(`SELECT public.search_notebook_notes('interview', created_after => '2026-11-01Z', created_before => '2026-10-01Z');`)).rejects.toThrow('Invalid notebook search parameters')
    expect(await sql(`SELECT user_id FROM public.notes WHERE id='${A}';`)).toBe(OWNER)
  })

  it('stems Russian search words and combines any-tags filters', async () => {
    await sql(`INSERT INTO public.notes(id,user_id,title,description,tags) VALUES ('66666666-6666-4666-8666-666666666666','${OWNER}','Собеседование','<p>План собеседования</p>',ARRAY['Личное']);`)
    const russian = await asUser(`SELECT public.search_notebook_notes('собеседования', tag_filters => ARRAY['ЛИЧНОЕ','absent'], tag_match => 'any');`)
    expect((russian.notes as { id: string }[]).map(note => note.id)).toEqual(['66666666-6666-4666-8666-666666666666'])
  })

})
