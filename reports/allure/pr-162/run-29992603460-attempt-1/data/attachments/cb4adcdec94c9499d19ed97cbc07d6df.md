# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: notes.copy.spec.ts >> notes copy and paste >> copy note via UI button and paste into a new note preserves all formatting
- Location: tests/notes.copy.spec.ts:34:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: apiRequestContext.get: Request context disposed.
Call log:
  - → GET https://yabcuywqxgjlruuyhwin.supabase.co/functions/v1/get-notes?title=Original+Copy+Test+Note+1784796682656-8d7d19
    - user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.55 Safari/537.36
    - accept: */*
    - accept-encoding: gzip,deflate,br
    - Authorization: Bearer eyJhbGciOiJIUzI1NiIsImtpZCI6ImhNeWhleVJZcjJQd1EzRWkiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3lhYmN1eXdxeGdqbHJ1dXlod2luLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI5YzQ2YzBlNy1kOTM3LTQwMjktYTA5Ny0yYTk0MDJlY2ViMTgiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzg0ODAwMjcwLCJpYXQiOjE3ODQ3OTY2NzAsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiZW1haWxfdmVyaWZpZWQiOnRydWV9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzg0Nzk2NjcwfV0sInNlc3Npb25faWQiOiI1ZDJkZDBhNi1kMTI3LTQ3MDYtOWJmMC1lZWE3NjEzYzc1ZTkiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.u7e81A-hlYTi4CFho_mU50OExt4BEmo3NQc5K0uipQ8
    - cookie: __cf_bm=y8lBjYOYSvA6_vpweEw3gYh7TgsSZHIqqX5SOmZu29o-1784796682.6607726-1.0.1.1-86I5gsGn2pPnao.UvHJX3RBQ_Dt9Ft1xpZ_0.kk7WJVnDUsc0bP_OoQ.QHIEBiJsmqZeLbwOxOKJ4JqZWw9ZIFSawTliUJNAFpwoCbK5EO8foyUVOzA.FF_M3onq6PkE

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - complementary "Sidebar" [ref=e3]:
      - generic [ref=e4]:
        - generic [ref=e5]:
          - generic [ref=e6]:
            - generic [ref=e7]:
              - img "EverFreeNote" [ref=e8]
              - status "Synchronized" [ref=e9]
            - heading "EverFreeNote" [level=1] [ref=e10]
          - button "Toggle theme" [ref=e11] [cursor=pointer]:
            - img
            - generic [ref=e12]: Toggle theme
        - button "Open search panel" [ref=e13] [cursor=pointer]:
          - img
          - generic [ref=e14]: Click to search
      - generic [ref=e15]:
        - button "New Note" [ref=e16] [cursor=pointer]:
          - img
          - text: New Note
        - paragraph [ref=e17]: 50 of 58 notes
      - list [ref=e22]:
        - listitem [ref=e23]:
          - generic [ref=e24] [cursor=pointer]:
            - checkbox
            - generic [ref=e25]:
              - heading "Pasted Copy Test Note 1784796682656-8d7d19" [level=2] [ref=e26]:
                - button "Pasted Copy Test Note 1784796682656-8d7d19" [ref=e27]
              - paragraph [ref=e28]: Header formattingSerif text, size 18px, centered alignmentMonospace text, standard size, right alignmentFirst element of numbered listSecond element of numbered list
              - paragraph [ref=e29]: 23.07.2026
        - listitem [ref=e30]:
          - generic [ref=e31] [cursor=pointer]:
            - checkbox
            - generic [ref=e32]:
              - heading "Original Copy Test Note 1784796682656-8d7d19" [level=2] [ref=e33]:
                - button "Original Copy Test Note 1784796682656-8d7d19" [ref=e34]
              - paragraph [ref=e35]: Header formattingSerif text, size 18px, centered alignmentMonospace text, standard size, right alignmentFirst element of numbered listSecond element of numbered list
              - paragraph [ref=e36]: 23.07.2026
        - listitem [ref=e37]:
          - generic [ref=e38] [cursor=pointer]:
            - checkbox
            - generic [ref=e39]:
              - heading "Export note 1784795206073-3ee75f-2" [level=2] [ref=e40]:
                - button "Export note 1784795206073-3ee75f-2" [ref=e41]
              - paragraph [ref=e42]: Export body 1784795206073-3ee75f-2
              - generic [ref=e43]:
                - generic [ref=e44]: export-tag-1784795206073-3ee75f-2-1
                - generic [ref=e45]: export-tag-1784795206073-3ee75f-2-2
              - paragraph [ref=e46]: 23.07.2026
        - listitem [ref=e47]:
          - generic [ref=e48] [cursor=pointer]:
            - checkbox
            - generic [ref=e49]:
              - heading "Export note 1784795206073-3ee75f-1" [level=2] [ref=e50]:
                - button "Export note 1784795206073-3ee75f-1" [ref=e51]
              - paragraph [ref=e52]: Export body 1784795206073-3ee75f-1
              - generic [ref=e53]:
                - generic [ref=e54]: export-tag-1784795206073-3ee75f-1-1
                - generic [ref=e55]: export-tag-1784795206073-3ee75f-1-2
              - paragraph [ref=e56]: 23.07.2026
        - listitem [ref=e57]:
          - generic [ref=e58] [cursor=pointer]:
            - checkbox
            - generic [ref=e59]:
              - heading "aa hidden 1784795103650-cc2e6c" [level=2] [ref=e60]:
                - button "aa hidden 1784795103650-cc2e6c" [ref=e61]
              - paragraph [ref=e62]: hidden body 1784795103650-cc2e6c
              - generic [ref=e64]: search-tag-1784795103650-cc2e6c
              - paragraph [ref=e65]: 23.07.2026
        - listitem [ref=e66]:
          - generic [ref=e67] [cursor=pointer]:
            - checkbox
            - generic [ref=e68]:
              - heading "Pasted Copy Test Note 1782912665522-5a1089" [level=2] [ref=e69]:
                - button "Pasted Copy Test Note 1782912665522-5a1089" [ref=e70]
              - paragraph [ref=e71]: Header formattingSerif text, size 18px, centered alignmentMonospace text, standard size, right alignmentFirst element of numbered listSecond element of numbered list&nbsp;
              - paragraph [ref=e72]: 01.07.2026
        - listitem [ref=e73]:
          - generic [ref=e74] [cursor=pointer]:
            - checkbox
            - generic [ref=e75]:
              - heading "Pasted Copy Test Note 1782912537587-10f0fe" [level=2] [ref=e76]:
                - button "Pasted Copy Test Note 1782912537587-10f0fe" [ref=e77]
              - paragraph [ref=e78]: Header formattingSerif text, size 18px, centered alignmentMonospace text, standard size, right alignmentFirst element of numbered listSecond element of numbered list&nbsp;
              - paragraph [ref=e79]: 01.07.2026
        - listitem [ref=e80]:
          - generic [ref=e81] [cursor=pointer]:
            - checkbox
            - generic [ref=e82]:
              - heading "Pasted Copy Test Note 1782903527215-9736f5" [level=2] [ref=e83]:
                - button "Pasted Copy Test Note 1782903527215-9736f5" [ref=e84]
              - paragraph [ref=e85]: Header formattingSerif text, size 18px, centered alignmentMonospace text, standard size, right alignmentFirst element of numbered listSecond element of numbered list
              - paragraph [ref=e86]: 01.07.2026
      - generic [ref=e89]:
        - generic [ref=e90]:
          - generic [ref=e91]: T
          - generic [ref=e92]: test@example.com
        - generic [ref=e93]:
          - button "Open settings page" [ref=e94] [cursor=pointer]:
            - img
          - button "Sign out" [ref=e95] [cursor=pointer]:
            - img
    - main [ref=e96]:
      - generic [ref=e97]:
        - generic [ref=e98]:
          - heading "Editing" [level=2] [ref=e100]
          - generic [ref=e101]:
            - generic [ref=e102]:
              - button "Read" [ref=e103] [cursor=pointer]:
                - img
                - text: Read
              - button "Copy note" [ref=e104] [cursor=pointer]:
                - img
                - generic [ref=e105]: Copy
              - button "Save" [ref=e106] [cursor=pointer]
              - button "More actions" [ref=e107] [cursor=pointer]:
                - img
            - generic [ref=e108]: Saved at 8:51:25 AM
        - generic [ref=e109]:
          - generic [ref=e110]:
            - textbox "Note title" [ref=e112]: Pasted Copy Test Note 1784796682656-8d7d19
            - generic [ref=e113]:
              - generic [ref=e114]:
                - img [ref=e115]
                - generic [ref=e118]: Tags
              - button "Add tag" [ref=e120] [cursor=pointer]:
                - img [ref=e121]
          - generic [ref=e123]:
            - generic [ref=e124]:
              - button "Undo" [disabled]:
                - img
              - button "Redo" [disabled]:
                - img
              - button "Bold (Ctrl+B)" [ref=e126] [cursor=pointer]:
                - img
              - button "Italic (Ctrl+I)" [ref=e127] [cursor=pointer]:
                - img
              - button "Underline (Ctrl+U)" [ref=e128] [cursor=pointer]:
                - img
              - button "Strikethrough" [ref=e129] [cursor=pointer]:
                - img
              - button "Highlight" [ref=e130] [cursor=pointer]:
                - img
              - button "Text color" [ref=e131] [cursor=pointer]:
                - img
              - combobox "Font family" [ref=e132] [cursor=pointer]:
                - generic: Sans Serif
                - img [ref=e133]
              - combobox "Font size" [ref=e135] [cursor=pointer]:
                - generic: 12 pt
                - img [ref=e136]
              - button "Heading 1" [ref=e138] [cursor=pointer]:
                - img
              - button "Heading 2" [ref=e139] [cursor=pointer]:
                - img
              - button "Heading 3" [ref=e140] [cursor=pointer]:
                - img
              - button "Paragraph" [ref=e141] [cursor=pointer]: P
              - button "Horizontal rule" [ref=e142] [cursor=pointer]:
                - img
              - button "Bullet list" [ref=e143] [cursor=pointer]:
                - img
              - button "Numbered list" [ref=e144] [cursor=pointer]:
                - img
              - button "Task list" [ref=e145] [cursor=pointer]:
                - img
              - button "Insert link" [ref=e146] [cursor=pointer]:
                - img
              - button "Insert image" [ref=e147] [cursor=pointer]:
                - img
              - button "Align left" [ref=e148] [cursor=pointer]:
                - img
              - button "Align center" [ref=e149] [cursor=pointer]:
                - img
              - button "Align right" [ref=e150] [cursor=pointer]:
                - img
              - button "Indent" [disabled]:
                - img
              - button "Outdent" [disabled]:
                - img
              - button "Superscript" [ref=e151] [cursor=pointer]:
                - img
              - button "Subscript" [ref=e152] [cursor=pointer]:
                - img
              - button "Clear formatting" [ref=e153] [cursor=pointer]:
                - img
              - button "Apply as Markdown" [disabled]: MD
              - button "Toggle Spellcheck" [ref=e154] [cursor=pointer]:
                - img
            - generic [ref=e156]:
              - heading "Header formatting" [level=1] [ref=e157]
              - paragraph [ref=e158]: Serif text, size 18px, centered alignment
              - paragraph [ref=e159]
              - paragraph [ref=e160]: Monospace text, standard size, right alignment
              - list [ref=e161]:
                - listitem [ref=e162]:
                  - paragraph [ref=e163]: First element of numbered list
                - listitem [ref=e164]:
                  - paragraph [ref=e165]: Second element of numbered list
              - paragraph [ref=e166]
  - region "Notifications alt+T"
  - alert [ref=e167]
```

# Test source

```ts
  1   | ﻿import type { APIRequestContext } from '@playwright/test';
  2   | import type { CreateNotePayload, GetNotesQuery, Note } from './notes.types';
  3   | 
  4   | /**
  5   |  * Generic wrapper for API responses.
  6   |  * @property status - HTTP status code (e.g. 200, 400, 404).
  7   |  * @property data - Parsed JSON body of the response.
  8   |  */
  9   | export type ApiResponse<T> = {
  10  |   status: number;
  11  |   data: T;
  12  | };
  13  | 
  14  | /**
  15  |  * Typed client for the Notes Edge Functions API.
  16  |  * Wraps Playwright's {@link APIRequestContext} and returns parsed, typed responses.
  17  |  *
  18  |  * @example
  19  |  * ```ts
  20  |  * const api = new NotesApi(apiContext);
  21  |  * const { status, data } = await api.createNote({ title: 'Hello' });
  22  |  * ```
  23  |  */
  24  | export class NotesApi {
  25  |   constructor(
  26  |     private api: APIRequestContext,
  27  |     private readonly recreateContext: (options?: {
  28  |       forceRefresh?: boolean;
  29  |     }) => Promise<APIRequestContext>,
  30  |   ) {}
  31  | 
  32  |   /** POST `create-note` - creates a new note. */
  33  |   async createNote(payload: CreateNotePayload = {}) {
  34  |     const res = await this.requestWithAuthRetry((ctx) =>
  35  |       ctx.post('create-note', { data: payload }),
  36  |     );
  37  |     return this.parse<{ note: Note }>(res);
  38  |   }
  39  | 
  40  |   /**
  41  |    * GET `get-notes` - fetches notes by query params.
  42  |    * Always returns normalized payload shape: `{ notes: Note[] }`.
  43  |    */
  44  |   async getNotes(query: GetNotesQuery = {}): Promise<ApiResponse<{ notes: Note[] }>> {
> 45  |     const res = await this.requestWithAuthRetry((ctx) => ctx.get('get-notes', { params: query }));
      |                                                              ^ Error: apiRequestContext.get: Request context disposed.
  46  |     const parsed = await this.parse<{ note: Note } | { notes: Note[] }>(res);
  47  |     const notes = 'notes' in parsed.data ? parsed.data.notes : [parsed.data.note];
  48  | 
  49  |     return {
  50  |       status: parsed.status,
  51  |       data: { notes },
  52  |     };
  53  |   }
  54  | 
  55  |   /** POST `delete-note` - deletes a note by id. */
  56  |   async deleteNote(id: string) {
  57  |     const res = await this.requestWithAuthRetry((ctx) => ctx.post('delete-note', { data: { id } }));
  58  |     return this.parse<{ id: string }>(res);
  59  |   }
  60  | 
  61  |   /** Disposes the underlying Playwright request context. Call in teardown. */
  62  |   async dispose() {
  63  |     await this.api.dispose();
  64  |   }
  65  | 
  66  |   /** Parses the raw Playwright response into `{ status, data }`. */
  67  |   private async parse<T>(
  68  |     res: Awaited<ReturnType<APIRequestContext['get']>>,
  69  |   ): Promise<ApiResponse<T>> {
  70  |     const status = res.status();
  71  |     let data: T;
  72  | 
  73  |     try {
  74  |       data = (await res.json()) as T;
  75  |     } catch {
  76  |       const text = await res.text();
  77  |       throw new Error(`Expected JSON response but got status ${status}: ${text.slice(0, 200)}`);
  78  |     }
  79  | 
  80  |     return { status, data };
  81  |   }
  82  | 
  83  |   /**
  84  |    * Retries once after HTTP 401 by recreating API context with forced token refresh.
  85  |    * If the retry also returns 401, the error response is returned as-is (no further retries).
  86  |    */
  87  |   private async requestWithAuthRetry(
  88  |     makeRequest: (ctx: APIRequestContext) => Promise<Awaited<ReturnType<APIRequestContext['get']>>>,
  89  |   ): Promise<Awaited<ReturnType<APIRequestContext['get']>>> {
  90  |     const firstResponse = await makeRequest(this.api);
  91  |     if (firstResponse.status() !== 401) {
  92  |       return firstResponse;
  93  |     }
  94  | 
  95  |     await this.api.dispose();
  96  |     this.api = await this.recreateContext({ forceRefresh: true });
  97  | 
  98  |     return makeRequest(this.api);
  99  |   }
  100 | }
  101 | 
```