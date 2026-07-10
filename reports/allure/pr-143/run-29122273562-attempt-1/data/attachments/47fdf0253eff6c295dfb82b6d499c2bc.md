# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: notes.spec.ts >> notes crud >> create, read, and delete a note
- Location: tests/notes.spec.ts:26:7

# Error details

```
Error: Empty state text should be visible after deleting the note

expect(locator).toBeVisible() failed

Locator: getByText('Select a note or create a new')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Empty state text should be visible after deleting the note with timeout 5000ms
  - waiting for getByText('Select a note or create a new')

```

```yaml
- img "EverFreeNote"
- status "Synchronized"
- heading "EverFreeNote" [level=1]
- button "Toggle theme"
- button "Open search panel": Click to search
- button "New Note"
- paragraph: 50 of 60 notes
- list:
  - button "Pasted Copy Test Note 1783684758993-5e240e Header formattingSerif text, size 18px, centered alignmentMonospace text, standard size, right alignmentFirst element of numbered listSecond element of numbered list 10.07.2026":
    - heading "Pasted Copy Test Note 1783684758993-5e240e" [level=3]
    - paragraph: Header formattingSerif text, size 18px, centered alignmentMonospace text, standard size, right alignmentFirst element of numbered listSecond element of numbered list
    - paragraph: 10.07.2026
  - button "Original Copy Test Note 1783684758993-5e240e Header formattingSerif text, size 18px, centered alignmentMonospace text, standard size, right alignmentFirst element of numbered listSecond element of numbered list 10.07.2026":
    - heading "Original Copy Test Note 1783684758993-5e240e" [level=3]
    - paragraph: Header formattingSerif text, size 18px, centered alignmentMonospace text, standard size, right alignmentFirst element of numbered listSecond element of numbered list
    - paragraph: 10.07.2026
  - button "Export note 1783593045297-6fe9bf-2 Export body 1783593045297-6fe9bf-2 export-tag-1783593045297-6fe9bf-2-1 export-tag-1783593045297-6fe9bf-2-2 09.07.2026":
    - heading "Export note 1783593045297-6fe9bf-2" [level=3]
    - paragraph: Export body 1783593045297-6fe9bf-2
    - text: export-tag-1783593045297-6fe9bf-2-1 export-tag-1783593045297-6fe9bf-2-2
    - paragraph: 09.07.2026
  - button "Export note 1783593045297-6fe9bf-3 Export body 1783593045297-6fe9bf-3 export-tag-1783593045297-6fe9bf-3-1 export-tag-1783593045297-6fe9bf-3-2 09.07.2026":
    - heading "Export note 1783593045297-6fe9bf-3" [level=3]
    - paragraph: Export body 1783593045297-6fe9bf-3
    - text: export-tag-1783593045297-6fe9bf-3-1 export-tag-1783593045297-6fe9bf-3-2
    - paragraph: 09.07.2026
  - button "Export note 1783593045297-6fe9bf-1 Export body 1783593045297-6fe9bf-1 export-tag-1783593045297-6fe9bf-1-1 export-tag-1783593045297-6fe9bf-1-2 09.07.2026":
    - heading "Export note 1783593045297-6fe9bf-1" [level=3]
    - paragraph: Export body 1783593045297-6fe9bf-1
    - text: export-tag-1783593045297-6fe9bf-1-1 export-tag-1783593045297-6fe9bf-1-2
    - paragraph: 09.07.2026
  - button "keep 1783001996950-3cfdc6 keep body ftsq17830019969503cfdc6 search-tag-1783001996950-3cfdc6 02.07.2026":
    - heading "keep 1783001996950-3cfdc6" [level=3]
    - paragraph: keep body ftsq17830019969503cfdc6
    - text: search-tag-1783001996950-3cfdc6
    - paragraph: 02.07.2026
  - button "Pasted Copy Test Note 1782913502333-1dc480 Header formatting&nbsp;Serif text, size 18px, centered alignmentMonospace text, standard size, right alignmentFirst element of numbered listSecond element of numbered list 01.07.2026":
    - heading "Pasted Copy Test Note 1782913502333-1dc480" [level=3]
    - paragraph: Header formatting&nbsp;Serif text, size 18px, centered alignmentMonospace text, standard size, right alignmentFirst element of numbered listSecond element of numbered list
    - paragraph: 01.07.2026
  - button "Pasted Copy Test Note 1782912665522-5a1089 Header formattingSerif text, size 18px, centered alignmentMonospace text, standard size, right alignmentFirst element of numbered listSecond element of numbered list&nbsp; 01.07.2026":
    - heading "Pasted Copy Test Note 1782912665522-5a1089" [level=3]
    - paragraph: Header formattingSerif text, size 18px, centered alignmentMonospace text, standard size, right alignmentFirst element of numbered listSecond element of numbered list&nbsp;
    - paragraph: 01.07.2026
  - button "Pasted Copy Test Note 1782912537587-10f0fe Header formattingSerif text, size 18px, centered alignmentMonospace text, standard size, right alignmentFirst element of numbered listSecond element of numbered list&nbsp; 01.07.2026":
    - heading "Pasted Copy Test Note 1782912537587-10f0fe" [level=3]
    - paragraph: Header formattingSerif text, size 18px, centered alignmentMonospace text, standard size, right alignmentFirst element of numbered listSecond element of numbered list&nbsp;
    - paragraph: 01.07.2026
- text: T test@example.com
- button "Open settings page"
- button "Sign out"
- img "EverFreeNote"
- heading "No Note Selected" [level=3]
- paragraph: Choose a note from the list or create a new one to start writing.
- region "Notifications alt+T"
- alert
```

# Test source

```ts
  1   | import { expect, test } from '../test-elements/fixtures/page-objects.fixture';
  2   | import { deleteNotesWithGivenTitleIfFound } from '../test-api/flows/notes.api.flow';
  3   | 
  4   | let createdNoteTitle = '';
  5   | let shouldCleanupCreatedNote = true;
  6   | 
  7   | test.describe('notes crud', () => {
  8   |   test.beforeEach(async ({ page }) => {
  9   |     shouldCleanupCreatedNote = true;
  10  |     createdNoteTitle = '';
  11  |     await page.goto('/');
  12  |   });
  13  | 
  14  |   test.afterEach(async ({ notesApi }) => {
  15  |     if (!shouldCleanupCreatedNote || !createdNoteTitle) {
  16  |       return;
  17  |     }
  18  | 
  19  |     try {
  20  |       await deleteNotesWithGivenTitleIfFound(notesApi, createdNoteTitle);
  21  |     } catch {
  22  |       // Best-effort cleanup to keep shared environment stable.
  23  |     }
  24  |   });
  25  | 
  26  |   test('create, read, and delete a note', async ({
  27  |     leftPanel,
  28  |     editView,
  29  |     readView,
  30  |     deleteDialog,
  31  |   }) => {
  32  |     const timestamp = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  33  |     createdNoteTitle = `Created by Playwright ${timestamp}`;
  34  |     const noteBodyText = `Text body ${timestamp}`;
  35  | 
  36  |     await test.step('create a new note', async () => {
  37  |       await leftPanel.clickNewNote();
  38  |       await editView.fillNote(createdNoteTitle, noteBodyText);
  39  | 
  40  |       await expect(
  41  |         editView.tiptapEditor,
  42  |         'Editor should contain entered note body text before save',
  43  |       ).toContainText(noteBodyText);
  44  | 
  45  |       await editView.save();
  46  |     });
  47  | 
  48  |     await test.step('read the created note', async () => {
  49  |       await expect(
  50  |         editView.readButton,
  51  |         'Read button should be enabled after saving the note',
  52  |       ).toBeEnabled();
  53  | 
  54  |       await editView.switchToRead();
  55  | 
  56  |       await expect(
  57  |         readView.readingHeading,
  58  |         'Reading view heading should be visible after switching to read mode',
  59  |       ).toBeVisible();
  60  |       await expect(
  61  |         readView.noteText,
  62  |         'Reading view should display the saved note body text',
  63  |       ).toContainText(noteBodyText);
  64  | 
  65  |       const noteCard = leftPanel.getNoteCardNumber(0);
  66  | 
  67  |       await expect(
  68  |         noteCard.titleHeading,
  69  |         'Top note card title should match the created note title',
  70  |       ).toHaveText(createdNoteTitle);
  71  |       await expect(
  72  |         noteCard.bodyParagraph,
  73  |         'Top note card body should match the created note body text',
  74  |       ).toHaveText(noteBodyText);
  75  | 
  76  |       const date = getFormattedDate();
  77  | 
  78  |       await expect(
  79  |         noteCard.dateParagraph,
  80  |         "Top note card date should match today's date",
  81  |       ).toHaveText(date);
  82  |     });
  83  | 
  84  |     await test.step('delete the created note', async () => {
  85  |       await readView.deleteNote();
  86  |       await expect(
  87  |         deleteDialog.dialog,
  88  |         'Delete confirmation dialog should be visible after clicking delete',
  89  |       ).toBeVisible();
  90  | 
  91  |       await deleteDialog.confirm();
  92  |       await expect(
  93  |         readView.emptyStateText,
  94  |         'Empty state text should be visible after deleting the note',
> 95  |       ).toBeVisible();
      |         ^ Error: Empty state text should be visible after deleting the note
  96  | 
  97  |       const deletedNote = leftPanel.getNoteCardByTitle(createdNoteTitle);
  98  |       await expect(deletedNote.root, 'Deleted note was found when not expected').toHaveCount(0);
  99  |       shouldCleanupCreatedNote = false;
  100 |     });
  101 |   });
  102 | });
  103 | 
  104 | function getFormattedDate() {
  105 |   const now = new Date();
  106 |   const dd = String(now.getDate()).padStart(2, '0');
  107 |   const mm = String(now.getMonth() + 1).padStart(2, '0');
  108 |   const yyyy = String(now.getFullYear());
  109 |   const formatted = `${dd}.${mm}.${yyyy}`;
  110 |   return formatted;
  111 | }
  112 | 
```