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
                - generic [ref=e32]:
                  - generic [ref=e33]: Import .enex file
                  - generic [ref=e34]: Bring notes in from Evernote exports.
            - button "Export .enex file Download your notes as an archive." [ref=e35] [cursor=pointer]:
              - generic [ref=e36]:
                - img [ref=e38]
                - generic [ref=e41]:
                  - generic [ref=e42]: Export .enex file
                  - generic [ref=e43]: Download your notes as an archive.
            - button "WordPress settings Site URL, account, and publishing access." [ref=e44] [cursor=pointer]:
              - generic [ref=e45]:
                - img [ref=e47]
                - generic [ref=e50]:
                  - generic [ref=e51]: WordPress settings
                  - generic [ref=e52]: Site URL, account, and publishing access.
            - button "Indexing (RAG) Gemini API key plus indexing and retrieval settings." [ref=e53] [cursor=pointer]:
              - generic [ref=e54]:
                - img [ref=e56]
                - generic [ref=e59]:
                  - generic [ref=e60]: Indexing (RAG)
                  - generic [ref=e61]: Gemini API key plus indexing and retrieval settings.
            - button "AI Index Inspect indexed, stale, and unindexed notes without opening them one by one." [ref=e62] [cursor=pointer]:
              - generic [ref=e63]:
                - img [ref=e65]
                - generic [ref=e69]:
                  - generic [ref=e70]: AI Index
                  - generic [ref=e71]: Inspect indexed, stale, and unindexed notes without opening them one by one.
        - generic [ref=e73]:
          - generic [ref=e75]:
            - img [ref=e77]
            - generic [ref=e80]:
              - heading "Indexing (RAG)" [level=2] [ref=e81]
              - paragraph [ref=e82]: Gemini API key plus indexing and retrieval settings.
          - generic [ref=e84]:
            - generic [ref=e85]:
              - generic [ref=e87]:
                - generic [ref=e88]:
                  - generic [ref=e89]: Gemini API key
                  - generic [ref=e90]: Store the Gemini API key used for note indexing and AI search.
                - generic [ref=e91]: Configured
              - generic [ref=e92]:
                - generic [ref=e93]:
                  - text: Gemini API Key
                  - textbox "Gemini API Key" [ref=e95]:
                    - /placeholder: Leave empty to keep current key
                  - paragraph [ref=e96]: A key is already stored. Enter a new one to replace it, or use Remove key below.
                - generic [ref=e97]: Gemini API key is configured.
                - generic [ref=e98]:
                  - button "Remove key" [ref=e99] [cursor=pointer]
                  - button "Save API key" [ref=e100] [cursor=pointer]
            - generic [ref=e101]:
              - generic [ref=e102]:
                - generic [ref=e103]: RAG indexing
                - generic [ref=e104]: When a note is indexed for AI search, its text is split into chunks — smaller pieces that are embedded and stored as vectors. The parameters below control how that splitting works. All size values are measured in characters. Changes apply only to future indexing — already indexed notes stay as-is until you reindex them manually.
              - generic [ref=e105]:
                - generic [ref=e106]:
                  - generic [ref=e107]:
                    - generic [ref=e108]:
                      - generic [ref=e109]: Minimum chunk size (characters)
                      - img [ref=e110]
                    - spinbutton "Minimum chunk size (characters)" [ref=e112]: "200"
                  - generic [ref=e113]:
                    - generic [ref=e114]:
                      - generic [ref=e115]: Target chunk size (characters)
                      - img [ref=e116]
                    - spinbutton "Target chunk size (characters)" [ref=e118]: "500"
                  - generic [ref=e119]:
                    - generic [ref=e120]:
                      - generic [ref=e121]: Maximum chunk size (characters)
                      - img [ref=e122]
                    - spinbutton "Maximum chunk size (characters)" [ref=e124]: "1500"
                  - generic [ref=e125]:
                    - generic [ref=e126]:
                      - generic [ref=e127]: Overlap (characters)
                      - img [ref=e128]
                    - spinbutton "Overlap (characters)" [ref=e130]: "100"
                - generic [ref=e131]:
                  - text: Embedding model
                  - combobox "Embedding model" [ref=e132] [cursor=pointer]:
                    - generic: Gemini Embedding 1
                    - img [ref=e133]
                  - paragraph [ref=e135]: Controls which Gemini embedding preset is used when you index note chunks.
                - generic [ref=e136]:
                  - generic [ref=e137]:
                    - 'checkbox "Debug: show chunks in console on indexing" [ref=e138] [cursor=pointer]'
                    - generic [ref=e139] [cursor=pointer]: "Debug: show chunks in console on indexing"
                  - button "Reset to default values" [ref=e140] [cursor=pointer]
                - generic [ref=e141]:
                  - generic [ref=e142]:
                    - generic [ref=e143]:
                      - text: Use title for embeddings
                      - paragraph [ref=e144]: Pass the note title to Gemini via the separate title field. The title is not duplicated inside chunk text.
                    - switch "Use title for embeddings" [checked] [ref=e145] [cursor=pointer]
                  - generic [ref=e146]:
                    - generic [ref=e147]:
                      - text: Use section headings
                      - paragraph [ref=e148]: Append a "Section:" line after the chunk body when the note contains h1-h6 headings. Bold or styled text is not treated as a heading.
                    - switch "Use section headings" [checked] [ref=e149] [cursor=pointer]
                  - generic [ref=e150]:
                    - generic [ref=e151]:
                      - text: Use tags
                      - paragraph [ref=e152]: Append a "Tags:" line after the chunk body when the note has tags assigned.
                    - switch "Use tags" [checked] [ref=e153] [cursor=pointer]
                - generic [ref=e154]:
                  - heading "How your notes are chunked" [level=3] [ref=e155]
                  - generic [ref=e156]:
                    - paragraph [ref=e157]: Every note is split into paragraphs. Each paragraph becomes a building block for chunks.
                    - list [ref=e158]:
                      - listitem [ref=e159]:
                        - strong [ref=e160]: Headings as boundaries.
                        - text: If a note has
                        - code [ref=e161]: h1
                        - text: –
                        - code [ref=e162]: h6
                        - text: headings, they act as walls — paragraphs from different sections never end up in the same chunk, and overlap never crosses a heading. Notes without headings are processed as one continuous section. Bold or styled text does not count as a heading.
                      - listitem [ref=e163]:
                        - strong [ref=e164]: Merging small paragraphs.
                        - text: Neighboring paragraphs within the same section are merged together until the chunk reaches
                        - strong [ref=e165]: min chunk size
                        - text: . If the next paragraph would push the chunk past
                        - strong [ref=e166]: max chunk size
                        - text: ", only a portion of it is taken."
                      - listitem [ref=e167]:
                        - strong [ref=e168]: Extending toward target.
                        - text: Once
                        - strong [ref=e169]: min chunk size
                        - text: is reached, the chunk can accept one more whole paragraph — but only if the result stays within
                        - strong [ref=e170]: target chunk size
                        - text: . Otherwise the chunk is closed and the paragraph starts a new one.
                      - listitem [ref=e171]:
                        - strong [ref=e172]: Splitting oversized paragraphs.
                        - text: A paragraph longer than
                        - strong [ref=e173]: max chunk size
                        - text: is split first at sentence boundaries, then by characters. A tiny leftover is merged back so you don't get a useless 20-character chunk.
                      - listitem [ref=e174]:
                        - strong [ref=e175]: Trailing merge.
                        - text: If the very last chunk is smaller than
                        - strong [ref=e176]: min chunk size
                        - text: ", it is merged with the previous one (unless that would exceed"
                        - strong [ref=e177]: max chunk size
                        - text: ).
                      - listitem [ref=e178]:
                        - strong [ref=e179]: Overlap.
                        - text: The tail of each chunk is copied to the beginning of the next one. This helps search find matches near chunk boundaries. Overlap prefers to start at a sentence end and never crosses a section heading.
                    - paragraph [ref=e180]:
                      - text: Notes shorter than
                      - strong [ref=e181]: min chunk size
                      - text: are not indexed — they are too short for meaningful semantic search.
                  - generic [ref=e182]:
                    - generic [ref=e183]: Tuning tips
                    - list [ref=e184]:
                      - listitem [ref=e185]:
                        - strong [ref=e186]: Short notes, lists, quick thoughts
                        - text: — lower
                        - emphasis [ref=e187]: min chunk size
                        - text: (e.g. 100) so they get indexed.
                      - listitem [ref=e188]:
                        - strong [ref=e189]: Long essays, articles
                        - text: — increase
                        - emphasis [ref=e190]: target chunk size
                        - text: (e.g. 800–1000) for more context per chunk.
                      - listitem [ref=e191]:
                        - strong [ref=e192]: Dense text without headings
                        - text: — increase
                        - emphasis [ref=e193]: max chunk size
                        - text: to avoid splitting long paragraphs.
                      - listitem [ref=e194]:
                        - strong [ref=e195]: Better search continuity
                        - text: — increase
                        - emphasis [ref=e196]: overlap
                        - text: (e.g. 150–200). Set to 0 if you want no repetition.
                  - generic [ref=e197]:
                    - generic [ref=e198]: Embedding settings
                    - generic [ref=e199]:
                      - generic [ref=e200]:
                        - generic [ref=e201]: Embedding model
                        - generic [ref=e202]: Gemini Embedding 1
                        - generic [ref=e203]: Selected preset for future indexing.
                      - generic [ref=e204]:
                        - generic [ref=e205]: Vector dimensions
                        - generic [ref=e206]: "1536"
                        - generic [ref=e207]: Size of each embedding vector
                      - generic [ref=e208]:
                        - generic [ref=e209]: Indexing task type
                        - generic [ref=e210]: RETRIEVAL_DOCUMENT
                        - generic [ref=e211]: Used when embedding note chunks
                      - generic [ref=e212]:
                        - generic [ref=e213]: Search task type
                        - generic [ref=e214]: RETRIEVAL_QUERY
                        - generic [ref=e215]: Used when embedding search queries
                  - generic [ref=e216]:
                    - generic [ref=e217]: Each chunk is formatted as
                    - generic [ref=e218]: "{chunk_content} Section: {section_heading} Tags: {tag1}, {tag2}, {tag3}"
                    - paragraph [ref=e219]: The searchable body comes first. Section and Tags lines appear only when enabled above and when the note has the corresponding data. Overlap is added internally for retrieval continuity and is not shown here. Title is never in the chunk text — it is passed separately via the Gemini API title field.
                - button "Save indexing settings" [ref=e221] [cursor=pointer]
            - generic [ref=e222]:
              - generic [ref=e223]:
                - generic [ref=e224]: RAG retrieval
                - generic [ref=e225]: Configure how many semantic search candidates are requested per page. Precision is adjusted directly from the search UI.
              - generic [ref=e226]:
                - generic [ref=e227]:
                  - text: Top K per page
                  - spinbutton "Top K per page" [ref=e228]: "15"
                  - paragraph [ref=e229]: "Controls how many chunk candidates are requested for each AI search page. Default: 15."
                - generic [ref=e230]:
                  - text: Embedding model
                  - combobox "Embedding model" [ref=e231] [cursor=pointer]:
                    - generic: Gemini Embedding 1
                    - img [ref=e232]
                  - paragraph [ref=e234]: Controls which Gemini embedding preset is used when embedding search queries.
                - generic [ref=e235]:
                  - generic [ref=e236]: Search system settings
                  - generic [ref=e237]:
                    - generic [ref=e238]:
                      - generic [ref=e239]: Embedding model
                      - generic [ref=e240]: Gemini Embedding 1
                      - generic [ref=e241]: Selected preset for future AI searches.
                    - generic [ref=e242]:
                      - generic [ref=e243]: Current precision threshold
                      - generic [ref=e244]: "0.55"
                      - generic [ref=e245]: Change this from the Precision slider in AI search.
                    - generic [ref=e246]:
                      - generic [ref=e247]: Vector dimensions
                      - generic [ref=e248]: "1536"
                      - generic [ref=e249]: Embedding vector size.
                    - generic [ref=e250]:
                      - generic [ref=e251]: Document task type
                      - generic [ref=e252]: RETRIEVAL_DOCUMENT
                      - generic [ref=e253]: Used when embedding indexed note chunks.
                    - generic [ref=e254]:
                      - generic [ref=e255]: Query task type
                      - generic [ref=e256]: RETRIEVAL_QUERY
                      - generic [ref=e257]: Used when embedding search queries.
                    - generic [ref=e258]:
                      - generic [ref=e259]: Load more overfetch
                      - generic [ref=e260]: "+1"
                      - generic [ref=e261]: Used to determine whether more backend results exist.
                    - generic [ref=e262]:
                      - generic [ref=e263]: Retrieval max cap
                      - generic [ref=e264]: "100"
                      - generic [ref=e265]: Upper bound for the cumulative AI search result window.
                - button "Save retrieval settings" [ref=e267] [cursor=pointer]
  - region "Notifications alt+T"
  - alert [ref=e268]
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