# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: settings-a11y.spec.ts >> settings accessibility audits >> audit Indexing RAG tab accessibility
- Location: tests/settings-a11y.spec.ts:61:7

# Error details

```
Error: Accessibility scan on "Indexing (RAG) Tab" should have no violations

expect(received).toBe(expected) // Object.is equality

Expected: false
Received: true
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - generic [ref=e4]:
      - generic [ref=e6]:
        - button "Back" [ref=e7] [cursor=pointer]:
          - img
        - heading "Settings" [level=1] [ref=e9]
        - generic [ref=e10]:
          - button "Toggle theme" [ref=e11] [cursor=pointer]:
            - img
            - generic [ref=e12]: Toggle theme
          - button "Close settings" [ref=e13] [cursor=pointer]:
            - img
      - generic [ref=e14]:
        - complementary [ref=e15]:
          - generic [ref=e16]:
            - button "My Account Email and account management." [ref=e17] [cursor=pointer]:
              - generic [ref=e18]:
                - img [ref=e20]
                - generic [ref=e23]:
                  - generic [ref=e24]: My Account
                  - generic [ref=e25]: Email and account management.
            - button "Import .enex file Bring notes in from Evernote exports." [ref=e26] [cursor=pointer]:
              - generic [ref=e27]:
                - img [ref=e29]
                - generic [ref=e33]:
                  - generic [ref=e34]: Import .enex file
                  - generic [ref=e35]: Bring notes in from Evernote exports.
            - button "Export .enex file Download your notes as an archive." [ref=e36] [cursor=pointer]:
              - generic [ref=e37]:
                - img [ref=e39]
                - generic [ref=e43]:
                  - generic [ref=e44]: Export .enex file
                  - generic [ref=e45]: Download your notes as an archive.
            - button "WordPress settings Site URL, account, and publishing access." [ref=e46] [cursor=pointer]:
              - generic [ref=e47]:
                - img [ref=e49]
                - generic [ref=e53]:
                  - generic [ref=e54]: WordPress settings
                  - generic [ref=e55]: Site URL, account, and publishing access.
            - button "Indexing (RAG) Gemini API key plus indexing and retrieval settings." [ref=e56] [cursor=pointer]:
              - generic [ref=e57]:
                - img [ref=e59]
                - generic [ref=e62]:
                  - generic [ref=e63]: Indexing (RAG)
                  - generic [ref=e64]: Gemini API key plus indexing and retrieval settings.
            - button "AI Index Inspect indexed, stale, and unindexed notes without opening them one by one." [ref=e65] [cursor=pointer]:
              - generic [ref=e66]:
                - img [ref=e68]
                - generic [ref=e72]:
                  - generic [ref=e73]: AI Index
                  - generic [ref=e74]: Inspect indexed, stale, and unindexed notes without opening them one by one.
        - generic [ref=e76]:
          - generic [ref=e78]:
            - img [ref=e80]
            - generic [ref=e83]:
              - heading "Indexing (RAG)" [level=2] [ref=e84]
              - paragraph [ref=e85]: Gemini API key plus indexing and retrieval settings.
          - generic [ref=e87]:
            - generic [ref=e88]:
              - generic [ref=e90]:
                - generic [ref=e91]:
                  - generic [ref=e92]: Gemini API key
                  - generic [ref=e93]: Store the Gemini API key used for note indexing and AI search.
                - generic [ref=e94]: Configured
              - generic [ref=e95]:
                - generic [ref=e96]:
                  - text: Gemini API Key
                  - textbox "Gemini API Key" [ref=e98]:
                    - /placeholder: Leave empty to keep current key
                  - paragraph [ref=e99]: A key is already stored. Enter a new one to replace it, or use Remove key below.
                - generic [ref=e100]: Gemini API key is configured.
                - generic [ref=e101]:
                  - button "Remove key" [ref=e102] [cursor=pointer]
                  - button "Save API key" [ref=e103] [cursor=pointer]
            - generic [ref=e104]:
              - generic [ref=e105]:
                - generic [ref=e106]: RAG indexing
                - generic [ref=e107]: When a note is indexed for AI search, its text is split into chunks — smaller pieces that are embedded and stored as vectors. The parameters below control how that splitting works. All size values are measured in characters. Changes apply only to future indexing — already indexed notes stay as-is until you reindex them manually.
              - generic [ref=e108]:
                - generic [ref=e109]:
                  - generic [ref=e110]:
                    - generic [ref=e111]:
                      - generic [ref=e112]: Minimum chunk size (characters)
                      - img [ref=e113]
                    - spinbutton "Minimum chunk size (characters)" [ref=e117]: "200"
                  - generic [ref=e118]:
                    - generic [ref=e119]:
                      - generic [ref=e120]: Target chunk size (characters)
                      - img [ref=e121]
                    - spinbutton "Target chunk size (characters)" [ref=e125]: "500"
                  - generic [ref=e126]:
                    - generic [ref=e127]:
                      - generic [ref=e128]: Maximum chunk size (characters)
                      - img [ref=e129]
                    - spinbutton "Maximum chunk size (characters)" [ref=e133]: "1500"
                  - generic [ref=e134]:
                    - generic [ref=e135]:
                      - generic [ref=e136]: Overlap (characters)
                      - img [ref=e137]
                    - spinbutton "Overlap (characters)" [ref=e141]: "100"
                - generic [ref=e142]:
                  - text: Embedding model
                  - combobox "Embedding model" [ref=e143] [cursor=pointer]:
                    - generic: Gemini Embedding 1
                    - img [ref=e144]
                  - paragraph [ref=e146]: Controls which Gemini embedding preset is used when you index note chunks.
                - generic [ref=e147]:
                  - generic [ref=e148]:
                    - 'checkbox "Debug: show chunks in console on indexing" [ref=e149] [cursor=pointer]'
                    - generic [ref=e150] [cursor=pointer]: "Debug: show chunks in console on indexing"
                  - button "Reset to default values" [ref=e151] [cursor=pointer]
                - generic [ref=e152]:
                  - generic [ref=e153]:
                    - generic [ref=e154]:
                      - text: Use title for embeddings
                      - paragraph [ref=e155]: Pass the note title to Gemini via the separate title field. The title is not duplicated inside chunk text.
                    - switch "Use title for embeddings" [checked] [ref=e156] [cursor=pointer]
                  - generic [ref=e157]:
                    - generic [ref=e158]:
                      - text: Use section headings
                      - paragraph [ref=e159]: Append a "Section:" line after the chunk body when the note contains h1-h6 headings. Bold or styled text is not treated as a heading.
                    - switch "Use section headings" [checked] [ref=e160] [cursor=pointer]
                  - generic [ref=e161]:
                    - generic [ref=e162]:
                      - text: Use tags
                      - paragraph [ref=e163]: Append a "Tags:" line after the chunk body when the note has tags assigned.
                    - switch "Use tags" [checked] [ref=e164] [cursor=pointer]
                - generic [ref=e165]:
                  - heading "How your notes are chunked" [level=3] [ref=e166]
                  - generic [ref=e167]:
                    - paragraph [ref=e168]: Every note is split into paragraphs. Each paragraph becomes a building block for chunks.
                    - list [ref=e169]:
                      - listitem [ref=e170]:
                        - strong [ref=e171]: Headings as boundaries.
                        - text: If a note has
                        - code [ref=e172]: h1
                        - text: –
                        - code [ref=e173]: h6
                        - text: headings, they act as walls — paragraphs from different sections never end up in the same chunk, and overlap never crosses a heading. Notes without headings are processed as one continuous section. Bold or styled text does not count as a heading.
                      - listitem [ref=e174]:
                        - strong [ref=e175]: Merging small paragraphs.
                        - text: Neighboring paragraphs within the same section are merged together until the chunk reaches
                        - strong [ref=e176]: min chunk size
                        - text: . If the next paragraph would push the chunk past
                        - strong [ref=e177]: max chunk size
                        - text: ", only a portion of it is taken."
                      - listitem [ref=e178]:
                        - strong [ref=e179]: Extending toward target.
                        - text: Once
                        - strong [ref=e180]: min chunk size
                        - text: is reached, the chunk can accept one more whole paragraph — but only if the result stays within
                        - strong [ref=e181]: target chunk size
                        - text: . Otherwise the chunk is closed and the paragraph starts a new one.
                      - listitem [ref=e182]:
                        - strong [ref=e183]: Splitting oversized paragraphs.
                        - text: A paragraph longer than
                        - strong [ref=e184]: max chunk size
                        - text: is split first at sentence boundaries, then by characters. A tiny leftover is merged back so you don't get a useless 20-character chunk.
                      - listitem [ref=e185]:
                        - strong [ref=e186]: Trailing merge.
                        - text: If the very last chunk is smaller than
                        - strong [ref=e187]: min chunk size
                        - text: ", it is merged with the previous one (unless that would exceed"
                        - strong [ref=e188]: max chunk size
                        - text: ).
                      - listitem [ref=e189]:
                        - strong [ref=e190]: Overlap.
                        - text: The tail of each chunk is copied to the beginning of the next one. This helps search find matches near chunk boundaries. Overlap prefers to start at a sentence end and never crosses a section heading.
                    - paragraph [ref=e191]:
                      - text: Notes shorter than
                      - strong [ref=e192]: min chunk size
                      - text: are not indexed — they are too short for meaningful semantic search.
                  - generic [ref=e193]:
                    - generic [ref=e194]: Tuning tips
                    - list [ref=e195]:
                      - listitem [ref=e196]:
                        - strong [ref=e197]: Short notes, lists, quick thoughts
                        - text: — lower
                        - emphasis [ref=e198]: min chunk size
                        - text: (e.g. 100) so they get indexed.
                      - listitem [ref=e199]:
                        - strong [ref=e200]: Long essays, articles
                        - text: — increase
                        - emphasis [ref=e201]: target chunk size
                        - text: (e.g. 800–1000) for more context per chunk.
                      - listitem [ref=e202]:
                        - strong [ref=e203]: Dense text without headings
                        - text: — increase
                        - emphasis [ref=e204]: max chunk size
                        - text: to avoid splitting long paragraphs.
                      - listitem [ref=e205]:
                        - strong [ref=e206]: Better search continuity
                        - text: — increase
                        - emphasis [ref=e207]: overlap
                        - text: (e.g. 150–200). Set to 0 if you want no repetition.
                  - generic [ref=e208]:
                    - generic [ref=e209]: Embedding settings
                    - generic [ref=e210]:
                      - generic [ref=e211]:
                        - generic [ref=e212]: Embedding model
                        - generic [ref=e213]: Gemini Embedding 1
                        - generic [ref=e214]: Selected preset for future indexing.
                      - generic [ref=e215]:
                        - generic [ref=e216]: Vector dimensions
                        - generic [ref=e217]: "1536"
                        - generic [ref=e218]: Size of each embedding vector
                      - generic [ref=e219]:
                        - generic [ref=e220]: Indexing task type
                        - generic [ref=e221]: RETRIEVAL_DOCUMENT
                        - generic [ref=e222]: Used when embedding note chunks
                      - generic [ref=e223]:
                        - generic [ref=e224]: Search task type
                        - generic [ref=e225]: RETRIEVAL_QUERY
                        - generic [ref=e226]: Used when embedding search queries
                  - generic [ref=e227]:
                    - generic [ref=e228]: Each chunk is formatted as
                    - generic [ref=e229]: "{chunk_content} Section: {section_heading} Tags: {tag1}, {tag2}, {tag3}"
                    - paragraph [ref=e230]: The searchable body comes first. Section and Tags lines appear only when enabled above and when the note has the corresponding data. Overlap is added internally for retrieval continuity and is not shown here. Title is never in the chunk text — it is passed separately via the Gemini API title field.
                - button "Save indexing settings" [ref=e232] [cursor=pointer]
            - generic [ref=e233]:
              - generic [ref=e234]:
                - generic [ref=e235]: RAG retrieval
                - generic [ref=e236]: Configure how many semantic search candidates are requested per page. Precision is adjusted directly from the search UI.
              - generic [ref=e237]:
                - generic [ref=e238]:
                  - text: Top K per page
                  - spinbutton "Top K per page" [ref=e239]: "15"
                  - paragraph [ref=e240]: "Controls how many chunk candidates are requested for each AI search page. Default: 15."
                - generic [ref=e241]:
                  - text: Embedding model
                  - combobox "Embedding model" [ref=e242] [cursor=pointer]:
                    - generic: Gemini Embedding 1
                    - img [ref=e243]
                  - paragraph [ref=e245]: Controls which Gemini embedding preset is used when embedding search queries.
                - generic [ref=e246]:
                  - generic [ref=e247]: Search system settings
                  - generic [ref=e248]:
                    - generic [ref=e249]:
                      - generic [ref=e250]: Embedding model
                      - generic [ref=e251]: Gemini Embedding 1
                      - generic [ref=e252]: Selected preset for future AI searches.
                    - generic [ref=e253]:
                      - generic [ref=e254]: Current precision threshold
                      - generic [ref=e255]: "0.55"
                      - generic [ref=e256]: Change this from the Precision slider in AI search.
                    - generic [ref=e257]:
                      - generic [ref=e258]: Vector dimensions
                      - generic [ref=e259]: "1536"
                      - generic [ref=e260]: Embedding vector size.
                    - generic [ref=e261]:
                      - generic [ref=e262]: Document task type
                      - generic [ref=e263]: RETRIEVAL_DOCUMENT
                      - generic [ref=e264]: Used when embedding indexed note chunks.
                    - generic [ref=e265]:
                      - generic [ref=e266]: Query task type
                      - generic [ref=e267]: RETRIEVAL_QUERY
                      - generic [ref=e268]: Used when embedding search queries.
                    - generic [ref=e269]:
                      - generic [ref=e270]: Load more overfetch
                      - generic [ref=e271]: "+1"
                      - generic [ref=e272]: Used to determine whether more backend results exist.
                    - generic [ref=e273]:
                      - generic [ref=e274]: Retrieval max cap
                      - generic [ref=e275]: "100"
                      - generic [ref=e276]: Upper bound for the cumulative AI search result window.
                - button "Save retrieval settings" [ref=e278] [cursor=pointer]
  - region "Notifications alt+T"
  - alert [ref=e279]
```

# Test source

```ts
  1   | import { expect, test } from '../test-elements/fixtures/page-objects.fixture';
  2   | 
  3   | test.describe('settings accessibility audits', () => {
  4   |   test('audit Export tab accessibility', async ({
  5   |     page,
  6   |     settingsView,
  7   |     analyzeA11y,
  8   |   }, testInfo) => {
  9   |     await page.goto('/settings/?tab=export');
  10  |     await expect(
  11  |       settingsView.tabHeading,
  12  |       'Export tab heading should be visible',
  13  |     ).toHaveText('Export .enex file');
  14  | 
  15  |     const a11y = await analyzeA11y();
  16  |     if (a11y.hasViolations()) {
  17  |       await testInfo.attach('a11y-report-export-tab.md', {
  18  |         body: a11y.format(),
  19  |         contentType: 'text/markdown',
  20  |       });
  21  |       await a11y.captureViolationScreenshots(page, testInfo);
  22  |     }
  23  | 
  24  |     expect(
  25  |       a11y.hasViolations(),
  26  |       'Accessibility scan on "Export Tab" should have no violations',
  27  |     ).toBe(false);
  28  |   });
  29  | 
  30  |   test('audit WordPress settings tab accessibility', async ({
  31  |     page,
  32  |     settingsView,
  33  |     analyzeA11y,
  34  |   }, testInfo) => {
  35  |     await page.goto('/settings/?tab=wordpress');
  36  |     await expect(
  37  |       settingsView.tabHeading,
  38  |       'WordPress settings tab heading should be visible',
  39  |     ).toHaveText('WordPress settings');
  40  | 
  41  |     await expect(
  42  |       settingsView.saveSettingsButton,
  43  |       'Save settings button should be enabled after loading settings',
  44  |     ).toBeEnabled();
  45  | 
  46  |     const a11y = await analyzeA11y();
  47  |     if (a11y.hasViolations()) {
  48  |       await testInfo.attach('a11y-report-wordpress-tab.md', {
  49  |         body: a11y.format(),
  50  |         contentType: 'text/markdown',
  51  |       });
  52  |       await a11y.captureViolationScreenshots(page, testInfo);
  53  |     }
  54  | 
  55  |     expect(
  56  |       a11y.hasViolations(),
  57  |       'Accessibility scan on "WordPress Settings Tab" should have no violations',
  58  |     ).toBe(false);
  59  |   });
  60  | 
  61  |   test('audit Indexing RAG tab accessibility', async ({
  62  |     page,
  63  |     settingsView,
  64  |     analyzeA11y,
  65  |   }, testInfo) => {
  66  |     await page.goto('/settings/?tab=api-keys');
  67  |     await expect(
  68  |       settingsView.tabHeading,
  69  |       'Indexing RAG tab heading should be visible',
  70  |     ).toHaveText('Indexing (RAG)');
  71  | 
  72  |     await expect(
  73  |       settingsView.saveApiKeyButton,
  74  |       'Save API key button should be enabled after loading settings',
  75  |     ).toBeEnabled();
  76  | 
  77  |     const a11y = await analyzeA11y();
  78  |     if (a11y.hasViolations()) {
  79  |       await testInfo.attach('a11y-report-indexing-tab.md', {
  80  |         body: a11y.format(),
  81  |         contentType: 'text/markdown',
  82  |       });
  83  |       await a11y.captureViolationScreenshots(page, testInfo);
  84  |     }
  85  | 
  86  |     expect(
  87  |       a11y.hasViolations(),
  88  |       'Accessibility scan on "Indexing (RAG) Tab" should have no violations',
> 89  |     ).toBe(false);
      |       ^ Error: Accessibility scan on "Indexing (RAG) Tab" should have no violations
  90  |   });
  91  | 
  92  |   test('audit AI Index tab accessibility', async ({
  93  |     page,
  94  |     settingsView,
  95  |     analyzeA11y,
  96  |   }, testInfo) => {
  97  |     await page.goto('/settings/?tab=ai-index');
  98  |     await expect(
  99  |       settingsView.aiIndexSearchInput,
  100 |       'AI Index search input should be visible',
  101 |     ).toBeVisible();
  102 | 
  103 |     const a11y = await analyzeA11y();
  104 |     if (a11y.hasViolations()) {
  105 |       await testInfo.attach('a11y-report-ai-index-tab.md', {
  106 |         body: a11y.format(),
  107 |         contentType: 'text/markdown',
  108 |       });
  109 |       await a11y.captureViolationScreenshots(page, testInfo);
  110 |     }
  111 | 
  112 |     expect(
  113 |       a11y.hasViolations(),
  114 |       'Accessibility scan on "AI Index Tab" should have no violations',
  115 |     ).toBe(false);
  116 |   });
  117 | });
  118 | 
```