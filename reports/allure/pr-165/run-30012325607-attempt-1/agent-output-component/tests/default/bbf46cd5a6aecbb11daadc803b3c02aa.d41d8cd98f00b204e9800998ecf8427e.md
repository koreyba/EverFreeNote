# Test Result

- Name: invokes rag-index with action=reindex when already indexed
- Full Name: everfreenote:cypress/component/features/notes/RagIndexPanel.cy.tsx#RagIndexPanel Component invokes rag-index with action=reindex when already indexed
- Environment: default
- History ID: bbf46cd5a6aecbb11daadc803b3c02aa.d41d8cd98f00b204e9800998ecf8427e
- Test Result ID: ed1eeacd9b9a54e12d35ba6402f91bb0
- Status: PASSED
- Duration: 139ms
- Started: 2026-07-23T13:47:40.666Z
- Stopped: 2026-07-23T13:47:40.805Z
- Flaky: false
- Known: false
- Muted: false
- Retries in This Run: 0
- Title Path: everfreenote / cypress / component / features / notes / RagIndexPanel.cy.tsx / RagIndexPanel Component

## Labels

- language: javascript
- framework: cypress
- parentSuite: RagIndexPanel Component
- host: runnervm3jd5f
- thread: pid-3007-worker-main
- package: everfreenote.cypress.component.features.notes.RagIndexPanel.cy.tsx
- \_fallbackTestCaseId: d11ef9e1332ae04c9f20956cf1e79e77

## Parameters

- Retry: 2 (excluded)

## Links

None

## Expectation Comparison

- Scope Match: unknown
- Match Reasons: None
- Expected References: None
- Metadata Mismatches: None

## Attachments Manifest

None

## Quality Findings

None

## Current Attempt

- Status: PASSED
- Duration: 139ms
- Started: 2026-07-23T13:47:40.666Z
- Stopped: 2026-07-23T13:47:40.805Z
- Steps Recorded: 17
- Attachments Recorded: 0

### Error

None

### Fixtures

### Before Fixture: "before each" hook

- Status: PASSED
- Duration: 11ms
- Started: 2026-07-23T13:47:40.670Z
- Stopped: 2026-07-23T13:47:40.681Z

#### Error

None

#### Steps

- [PASSED] window (0s)
  - Parameters: Yielded=<window>

### Before Fixture: "before each" hook

- Status: PASSED
- Duration: 1ms
- Started: 2026-07-23T13:47:40.687Z
- Stopped: 2026-07-23T13:47:40.688Z

#### Error

None

#### Steps

- No steps

### Attachments

None

### Steps

- [PASSED] mount \<SupabaseTestProvider ... /\> (0s)
  - Parameters: description=Mounts React component, home=https://github.com/cypress-io/cypress, supabase={"auth":{},"functions":{}}, user={"id":"test-user"}, loading=false, children={"type":{"_currentValue":null,"_currentValue2":null,"_threadCount":0,"Consumer":{},"_currentRenderer":null,"_currentRenderer2":n...
- [PASSED] contains button, Re-index (9ms)
  - Parameters: Content=Re-index, Applied To=<body>...</body>, Yielded=<button class="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 cursor-pointer border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 rounded-full px-3 text-xs" title="Re-index this note">...</button>, Elements=1
- [PASSED] assert expected note\_embeddings to equal note\_embeddings (0s)
  - Parameters: actual=note_embeddings, expected=note_embeddings
- [PASSED] assert expected note\_id to equal note\_id (0s)
  - Parameters: actual=note_id, expected=note_id
- [PASSED] assert expected note-1 to equal note-1 (0s)
  - Parameters: actual=note-1, expected=note-1
- [PASSED] assert expected user\_id to equal user\_id (0s)
  - Parameters: actual=user_id, expected=user_id
- [PASSED] assert expected user-1 to equal user-1 (0s)
  - Parameters: actual=user-1, expected=user-1
- [PASSED] click (24ms)
  - Parameters: Applied To=<button class="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 cursor-pointer border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 rounded-full px-3 text-xs" title="Re-index this note">...</button>, Elements=1, Coords={"x":54,"y":24}
- [PASSED] assert expected rag-index to equal rag-index (0s)
  - Parameters: actual=rag-index, expected=rag-index
- [PASSED] assert expected { Object (body) } to deeply equal { Object (body) } (0s)
  - Parameters: actual={"body":{"noteId":"note-1","action":"reindex"}}, expected={"body":{"noteId":"note-1","action":"reindex"}}
- [PASSED] assert expected note\_embeddings to equal note\_embeddings (0s)
  - Parameters: actual=note_embeddings, expected=note_embeddings
- [PASSED] assert expected note\_id to equal note\_id (0s)
  - Parameters: actual=note_id, expected=note_id
- [PASSED] assert expected note-1 to equal note-1 (0s)
  - Parameters: actual=note-1, expected=note-1
- [PASSED] assert expected user\_id to equal user\_id (0s)
  - Parameters: actual=user_id, expected=user_id
- [PASSED] assert expected user-1 to equal user-1 (0s)
  - Parameters: actual=user-1, expected=user-1
- [PASSED] wrap function(){} (0s)
  - Parameters: Yielded=invoke
  - [PASSED] assert expected invoke to have been called with arguments "rag-index", {body: {noteid: note-1, action: reindex}} (0s)
