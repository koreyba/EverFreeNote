# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: notes.bulk-delete.spec.ts >> notes bulk delete >> bulk delete selected notes
- Location: tests/notes.bulk-delete.spec.ts:38:7

# Error details

```
Error: Bulk delete dialog should be hidden after confirmation

expect(locator).toHaveCount(expected) failed

Locator:  getByTestId('bulk-delete-dialog')
Expected: 0
Received: 1
Timeout:  5000ms

Call log:
  - Bulk delete dialog should be hidden after confirmation with timeout 5000ms
  - waiting for getByTestId('bulk-delete-dialog')
    14 × locator resolved to 1 element
       - unexpected value "1"

```

```
Test timeout of 30000ms exceeded while running "afterEach" hook.
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - navigation "Main Navigation" [ref=e3]:
      - generic [ref=e4]:
        - button "Expand panel" [ref=e6] [cursor=pointer]:
          - img
        - generic [ref=e7]:
          - button "Notes" [ref=e8] [cursor=pointer]:
            - img
          - button "Tags" [ref=e9] [cursor=pointer]:
            - img
      - generic [ref=e10]:
        - button "Search" [ref=e11] [cursor=pointer]:
          - img
        - button "Settings" [ref=e12] [cursor=pointer]:
          - img
    - complementary "Sidebar" [ref=e13]:
      - generic [ref=e14]:
        - generic [ref=e15]:
          - generic [ref=e16]:
            - generic [ref=e17]:
              - img "EverFreeNote" [ref=e18]
              - status "Synchronized" [ref=e19]
            - heading "EverFreeNote" [level=1] [ref=e20]
          - button "Toggle theme" [ref=e21] [cursor=pointer]:
            - img
            - generic [ref=e22]: Toggle theme
        - button "Open search panel" [ref=e23] [cursor=pointer]:
          - img
          - generic [ref=e24]: Click to search
      - generic [ref=e25]:
        - button "New Note" [ref=e26] [cursor=pointer]:
          - img
          - text: New Note
        - paragraph [ref=e27]: 50 of 93 notes
      - list [ref=e32]:
        - listitem [ref=e33]:
          - generic [ref=e34] [cursor=pointer]:
            - checkbox
            - generic [ref=e35]:
              - heading "aa hidden 1789040417211-4361ed" [level=2] [ref=e36]:
                - button "aa hidden 1789040417211-4361ed" [ref=e37]
              - paragraph [ref=e38]: hidden body 1789040417211-4361ed
              - generic [ref=e40]: search-tag-1789040417211-4361ed
              - paragraph [ref=e41]: 10.09.2026
        - listitem [ref=e42]:
          - generic [ref=e43] [cursor=pointer]:
            - checkbox
            - generic [ref=e44]:
              - heading "aa hidden 1789039790187-b0db10" [level=2] [ref=e45]:
                - button "aa hidden 1789039790187-b0db10" [ref=e46]
              - paragraph [ref=e47]: hidden body 1789039790187-b0db10
              - generic [ref=e49]: search-tag-1789039790187-b0db10
              - paragraph [ref=e50]: 10.09.2026
        - listitem [ref=e51]:
          - generic [ref=e52] [cursor=pointer]:
            - checkbox
            - generic [ref=e53]:
              - heading "drop 1789039790187-b0db10" [level=2] [ref=e54]:
                - button "drop 1789039790187-b0db10" [ref=e55]
              - paragraph [ref=e56]: drop body ftsq1789039790187b0db10
              - generic [ref=e58]: search-other-tag-1789039790187-b0db10
              - paragraph [ref=e59]: 10.09.2026
        - listitem [ref=e60]:
          - generic [ref=e61] [cursor=pointer]:
            - checkbox
            - generic [ref=e62]:
              - heading "Export note 1789039648396-abd634-3" [level=2] [ref=e63]:
                - button "Export note 1789039648396-abd634-3" [ref=e64]
              - paragraph [ref=e65]: Export body 1789039648396-abd634-3
              - generic [ref=e66]:
                - generic [ref=e67]: export-tag-1789039648396-abd634-3-1
                - generic [ref=e68]: export-tag-1789039648396-abd634-3-2
              - paragraph [ref=e69]: 10.09.2026
        - listitem [ref=e70]:
          - generic [ref=e71] [cursor=pointer]:
            - checkbox
            - generic [ref=e72]:
              - heading "Export note 1789039648396-abd634-2" [level=2] [ref=e73]:
                - button "Export note 1789039648396-abd634-2" [ref=e74]
              - paragraph [ref=e75]: Export body 1789039648396-abd634-2
              - generic [ref=e76]:
                - generic [ref=e77]: export-tag-1789039648396-abd634-2-1
                - generic [ref=e78]: export-tag-1789039648396-abd634-2-2
              - paragraph [ref=e79]: 10.09.2026
        - listitem [ref=e80]:
          - generic [ref=e81] [cursor=pointer]:
            - checkbox
            - generic [ref=e82]:
              - heading "Export note 1789039648396-abd634-1" [level=2] [ref=e83]:
                - button "Export note 1789039648396-abd634-1" [ref=e84]
              - paragraph [ref=e85]: Export body 1789039648396-abd634-1
              - generic [ref=e86]:
                - generic [ref=e87]: export-tag-1789039648396-abd634-1-1
                - generic [ref=e88]: export-tag-1789039648396-abd634-1-2
              - paragraph [ref=e89]: 10.09.2026
        - listitem [ref=e90]:
          - generic [ref=e91] [cursor=pointer]:
            - checkbox
            - generic [ref=e92]:
              - heading "Bulk delete note 1789039435957-4424ce-3" [level=2] [ref=e93]:
                - button "Bulk delete note 1789039435957-4424ce-3" [ref=e94]
              - paragraph [ref=e95]: Bulk delete body 1789039435957-4424ce-3
              - paragraph [ref=e96]: 10.09.2026
        - listitem [ref=e97]:
          - generic [ref=e98] [cursor=pointer]:
            - checkbox
            - generic [ref=e99]:
              - heading "Bulk delete note 1789039435957-4424ce-2" [level=2] [ref=e100]:
                - button "Bulk delete note 1789039435957-4424ce-2" [ref=e101]
              - paragraph [ref=e102]: Bulk delete body 1789039435957-4424ce-2
              - paragraph [ref=e103]: 10.09.2026
      - generic [ref=e106]:
        - generic [ref=e107]:
          - generic [ref=e108]: T
          - generic [ref=e109]: test@example.com
        - generic [ref=e110]:
          - button "Open settings page" [ref=e111] [cursor=pointer]:
            - img
          - button "Sign out" [ref=e112] [cursor=pointer]:
            - img
    - main [ref=e113]:
      - generic [ref=e115]:
        - img "EverFreeNote" [ref=e116]
        - heading "No Note Selected" [level=2] [ref=e117]
        - paragraph [ref=e118]: Choose a note from the list or create a new one to start writing.
  - region "Notifications alt+T"
  - alert [ref=e119]
```

# Test source

```ts
  1   | import { expect, test } from '../test-elements/fixtures/page-objects.fixture';
  2   | import { createNotesViaApi } from '../test-api/flows/notes.api.flow';
  3   | 
  4   | 
  5   | const NOTES_TO_CREATE = 3;
  6   | 
  7   | let createdNoteIds: string[] = [];
  8   | let createdNoteTitles: string[] = [];
  9   | let needAPINotesCleanup: boolean;
  10  | 
  11  | test.describe('notes bulk delete', () => {
  12  |   test.beforeEach(async ({ notesApi, page }) => {
  13  |     needAPINotesCleanup = true;
  14  |     const createdNotes = await createNotesViaApi(notesApi, {
  15  |       count: NOTES_TO_CREATE,
  16  |       titlePrefix: 'Bulk delete note',
  17  |       bodyPrefix: 'Bulk delete body',
  18  |     });
  19  | 
  20  |     createdNoteIds = createdNotes.map((note) => note.id);
  21  |     createdNoteTitles = createdNotes.map((note) => note.title);
  22  | 
  23  |     await page.goto('/');
  24  |   });
  25  | 
> 26  |   test.afterEach(async ({ notesApi }) => {
      |        ^ Test timeout of 30000ms exceeded while running "afterEach" hook.
  27  |     if (needAPINotesCleanup) {
  28  |       for (const noteId of createdNoteIds) {
  29  |         try {
  30  |           await notesApi.deleteNote(noteId);
  31  |         } catch {
  32  |           // Best-effort cleanup to keep shared environment stable.
  33  |         }
  34  |       }
  35  |     }
  36  |   });
  37  | 
  38  |   test('bulk delete selected notes', async ({
  39  |     page,
  40  |     notesApi,
  41  |     leftPanel,
  42  |     bulkDeleteDialog,
  43  |     analyzeA11y,
  44  |   }, testInfo) => {
  45  | 
  46  |     await test.step('select notes to delete', async () => {
  47  |       for (const title of createdNoteTitles) {
  48  |         await expect(
  49  |           leftPanel.getNoteCardByTitle(title).root,
  50  |           `Note card with title "${title}" should be visible`,
  51  |         ).toBeVisible();
  52  |       }
  53  | 
  54  |       for (const title of createdNoteTitles) {
  55  |         const noteCard = leftPanel.getNoteCardByTitle(title);
  56  |         await noteCard.select();
  57  |         await expect(
  58  |           noteCard.checkbox,
  59  |           `Checkbox for note "${title}" should be checked`,
  60  |         ).toBeChecked();
  61  |       }
  62  |     });
  63  | 
  64  |     await test.step('Accessibility scan: Selection Mode', async () => {
  65  |       const a11y = await analyzeA11y();
  66  |       if (a11y.hasViolations()) {
  67  |         await testInfo.attach('a11y-report-selection-mode.md', {
  68  |           body: a11y.format(),
  69  |           contentType: 'text/markdown',
  70  |         });
  71  |         await a11y.captureViolationScreenshots(page, testInfo);
  72  |       }
  73  |       expect.soft(
  74  |         a11y.hasViolations(),
  75  |         'Accessibility scan on "Selection Mode" should have no violations',
  76  |       ).toBe(false);
  77  |     });
  78  | 
  79  |     await test.step('delete selected notes', async () => {
  80  |       await expect(
  81  |         leftPanel.deleteSelectedButton,
  82  |         `"Delete" action should show ${NOTES_TO_CREATE} selected notes`,
  83  |       ).toHaveText(`Delete (${NOTES_TO_CREATE})`);
  84  |       await leftPanel.clickDeleteSelected();
  85  | 
  86  |       await expect(bulkDeleteDialog.dialog, 'Bulk delete dialog should be visible').toBeVisible();
  87  |       await expect(
  88  |         bulkDeleteDialog.titleHeading,
  89  |         'Bulk delete dialog title should be visible',
  90  |       ).toBeVisible();
  91  |     });
  92  | 
  93  |     await test.step('Accessibility scan: Bulk Delete Dialog', async () => {
  94  |       const a11y = await analyzeA11y();
  95  |       if (a11y.hasViolations()) {
  96  |         await testInfo.attach('a11y-report-bulk-delete.md', {
  97  |           body: a11y.format(),
  98  |           contentType: 'text/markdown',
  99  |         });
  100 |         await a11y.captureViolationScreenshots(page, testInfo);
  101 |       }
  102 |       expect.soft(
  103 |         a11y.hasViolations(),
  104 |         'Accessibility scan on "Bulk Delete Dialog" should have no violations',
  105 |       ).toBe(false);
  106 |     });
  107 | 
  108 |     await test.step('confirm bulk deletion', async () => {
  109 |       await bulkDeleteDialog.fillCount(NOTES_TO_CREATE);
  110 |       await expect(
  111 |         bulkDeleteDialog.confirmButton,
  112 |         'Confirm button should be enabled after entering correct count',
  113 |       ).toBeEnabled();
  114 |       await bulkDeleteDialog.confirm();
  115 |       await expect(
  116 |         bulkDeleteDialog.dialog,
  117 |         'Bulk delete dialog should be hidden after confirmation',
  118 |       ).toHaveCount(0);
  119 |     });
  120 | 
  121 |     await test.step('verify notes are deleted', async () => {
  122 |       for (const title of createdNoteTitles) {
  123 |         await expect(
  124 |           leftPanel.getNoteCardByTitle(title).root,
  125 |           `Deleted note "${title}" is still visible in the left panel.`,
  126 |         ).toHaveCount(0);
```