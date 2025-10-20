---
phase: testing
title: Testing Strategy
description: Define testing approach, test cases, and quality assurance
---

# Testing Strategy

## Test Coverage Goals
**What level of testing do we aim for?**

- Unit test coverage target: 100% для parser и converter logic
- Integration test scope: Full import flow + error scenarios
- End-to-end test scenarios: User imports .enex files через UI
- Alignment with requirements: Все success criteria должны быть протестированы

## Unit Tests
**What individual components need testing?**

### Component 1: EnexParser
- [ ] **Test case 1:** Parse valid .enex with single note
  - Input: Valid .enex XML
  - Expected: ParsedNote object with correct fields
  
- [ ] **Test case 2:** Parse .enex with multiple notes
  - Input: .enex with 3 notes
  - Expected: Array of 3 ParsedNote objects
  
- [ ] **Test case 3:** Parse note with all metadata
  - Input: Note with title, dates, tags, resources
  - Expected: All fields correctly extracted
  
- [ ] **Test case 4:** Handle missing title
  - Input: Note without <title>
  - Expected: Default to "Untitled"
  
- [ ] **Test case 5:** Handle invalid dates
  - Input: Malformed date string
  - Expected: Fallback to current date
  
- [ ] **Test case 6:** Handle invalid XML
  - Input: Malformed XML
  - Expected: Throw descriptive error
  
- [ ] **Test case 7:** Parse resources (images)
  - Input: Note with 2 <resource> tags
  - Expected: Array of 2 ParsedResource objects
  
- [ ] **Test case 8:** Extract content from CDATA
  - Input: CDATA with XML declaration and DOCTYPE
  - Expected: Clean HTML content

### Component 2: ContentConverter
- [ ] **Test case 1:** Convert basic HTML
  - Input: Simple HTML with <b>, <i>, <p>
  - Expected: Same HTML (no changes)
  
- [ ] **Test case 2:** Replace unsupported table
  - Input: HTML with <table>
  - Expected: "[Unsupported content: Table]" + hidden table
  
- [ ] **Test case 3:** Replace unsupported code block
  - Input: HTML with <pre>
  - Expected: "[Unsupported content: Code Block]" + hidden pre
  
- [ ] **Test case 4:** Process <en-media> tags
  - Input: HTML with <en-media hash="...">
  - Expected: <img src="uploaded-url">
  
- [ ] **Test case 5:** Handle image upload failure
  - Input: <en-media> but upload fails
  - Expected: "[Image failed to upload]"
  
- [ ] **Test case 6:** Clean up ENML tags
  - Input: HTML with <en-note>
  - Expected: <en-note> replaced with <div>
  
- [ ] **Test case 7:** Handle multiple images
  - Input: HTML with 3 <en-media> tags
  - Expected: 3 <img> tags with correct URLs

### Component 3: ImageProcessor
- [ ] **Test case 1:** Convert base64 to Blob
  - Input: Valid base64 string
  - Expected: Blob with correct MIME type
  
- [ ] **Test case 2:** Upload image to Supabase
  - Input: Blob, userId, noteId
  - Expected: Public URL returned
  
- [ ] **Test case 3:** Handle upload error
  - Input: Invalid credentials
  - Expected: Throw descriptive error
  
- [ ] **Test case 4:** Generate correct file path
  - Input: userId="123", noteId="456"
  - Expected: Path like "123/456/timestamp_image.png"
  
- [ ] **Test case 5:** Handle large images
  - Input: 10MB base64 image
  - Expected: Successfully upload or fail gracefully

### Component 4: NoteCreator
- [ ] **Test case 1:** Create note with all fields
  - Input: Complete ParsedNote
  - Expected: Note inserted, ID returned
  
- [ ] **Test case 2:** Detect duplicate by title
  - Input: Note with existing title
  - Expected: Title prefixed with "[duplicate]"
  
- [ ] **Test case 3:** Handle DB insert error
  - Input: Invalid user_id
  - Expected: Throw descriptive error
  
- [ ] **Test case 4:** Preserve custom dates
  - Input: Note with created="2020-01-01"
  - Expected: DB record has created_at="2020-01-01"
  
- [ ] **Test case 5:** Handle empty tags array
  - Input: Note with tags=[]
  - Expected: Note created with empty tags

## Integration Tests
**How do we test component interactions?**

- [ ] **Integration scenario 1:** Full single note import
  - Upload .enex with 1 note
  - Parse → Convert → Create
  - Verify note in DB with correct data
  
- [ ] **Integration scenario 2:** Import with images
  - Upload .enex with note containing 2 images
  - Verify images uploaded to Storage
  - Verify note has correct image URLs
  - Verify images are accessible
  
- [ ] **Integration scenario 3:** Batch import (3 files)
  - Upload 3 .enex files
  - Verify progress updates
  - Verify all notes created
  
- [ ] **Integration scenario 4:** Handle partial failure
  - Upload .enex with 3 notes, 2nd note has error
  - Verify 1st and 3rd notes created
  - Verify error logged for 2nd note
  
- [ ] **Integration scenario 5:** Duplicate handling
  - Import note with title "Test"
  - Import again with same title
  - Verify 2nd note has "[duplicate] Test"
  
- [ ] **Integration scenario 6:** Unsupported elements
  - Import note with table and code block
  - Verify placeholders in content
  - Verify note still created

## End-to-End Tests
**What user flows need validation?**

- [ ] **E2E flow 1:** Import single .enex file
  - User clicks "Import from Evernote"
  - Selects single .enex file
  - Sees unsupported features dialog
  - Confirms import
  - Sees progress dialog
  - Sees success notification
  - Sees imported note in list
  
- [ ] **E2E flow 2:** Import multiple files
  - User selects 3 .enex files
  - Sees progress "1 of 3 files"
  - All files processed
  - All notes appear in list
  
- [ ] **E2E flow 3:** View imported note
  - Import note with formatting
  - Open note in editor
  - Verify bold, italic, headings work
  - Verify images display
  - Verify tags display
  
- [ ] **E2E flow 4:** Edit imported note
  - Import note
  - Open in editor
  - Make changes
  - Save
  - Verify changes persist
  
- [ ] **E2E flow 5:** Error handling
  - Try to import invalid file
  - See error message
  - Try again with valid file
  - Import succeeds

## Test Data
**What data do we use for testing?**

**Test fixtures:**
```
cypress/fixtures/enex/
  simple-note.enex          # Single note, text only
  formatted-note.enex       # Bold, italic, lists, headings
  note-with-images.enex     # 2 images
  multiple-notes.enex       # 5 notes
  unsupported-elements.enex # Tables, code blocks
  large-file.enex           # 100 notes (performance)
  invalid.enex              # Malformed XML
  empty.enex                # No notes
```

**Mock data:**
- Mock Supabase client for unit tests
- Mock image upload responses
- Mock DB insert responses

## Test Reporting & Coverage
**How do we verify and communicate test results?**

**Commands:**
```bash
# Run unit tests
npm run test:unit -- lib/enex

# Run integration tests
npm run test:integration -- enex-import

# Run E2E tests
npm run test:e2e -- enex-import

# Coverage report
npm run test -- --coverage
```

**Coverage targets:**
- EnexParser: 100%
- ContentConverter: 100%
- ImageProcessor: 90% (network mocking limitations)
- NoteCreator: 100%

**Coverage gaps:**
- Browser File API (hard to mock)
- Supabase Storage upload (integration tests cover this)

## Manual Testing
**What requires human validation?**

**UI/UX testing checklist:**
- [ ] Import button visible and accessible
- [ ] File picker opens correctly
- [ ] Multiple file selection works
- [ ] Progress dialog shows accurate progress
- [ ] Progress dialog can be closed (but import continues)
- [ ] Success notification is clear
- [ ] Error messages are helpful
- [ ] Notes list refreshes after import
- [ ] Imported notes have correct dates
- [ ] Imported notes have correct tags
- [ ] Images in notes display correctly
- [ ] Formatting is preserved

**Browser compatibility:**
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

**Performance testing:**
- [ ] Import 1 note: < 1 second
- [ ] Import 10 notes: < 5 seconds
- [ ] Import 100 notes: < 30 seconds
- [ ] UI remains responsive during import
- [ ] Memory usage acceptable

**Accessibility:**
- [ ] Keyboard navigation works
- [ ] Screen reader announces progress
- [ ] Focus management correct
- [ ] Error messages are announced

## Performance Testing
**How do we validate performance?**

**Load testing scenarios:**
- Small file (1 note, no images): < 1s
- Medium file (10 notes, 5 images): < 5s
- Large file (100 notes, 50 images): < 30s
- Very large file (1000 notes): Warn user, allow proceed

**Stress testing:**
- Multiple concurrent imports
- Large images (10MB each)
- Many images (100 per note)
- Browser memory limits

**Performance benchmarks:**
- XML parsing: < 100ms per file
- Image upload: < 500ms per image
- DB insert: < 100ms per note
- Total throughput: > 3 notes/second

## Bug Tracking
**How do we manage issues?**

**Issue severity levels:**
- **CRITICAL:** Import fails completely, data loss
- **HIGH:** Import succeeds but data corrupted
- **MEDIUM:** Some notes fail to import
- **LOW:** Minor UI issues, formatting issues

**Regression testing:**
- After each bug fix, run full test suite
- Add test case for the bug
- Verify fix doesn't break other features

**Known limitations (document, not bugs):**
- Tables not supported → placeholder
- Code blocks not supported → placeholder
- Attachments not supported → skipped
- Max file size: 100MB
- Max images per note: 50

## Sign-off Criteria
**When can we consider testing complete?**

- ✅ All unit tests pass (100% coverage)
- ✅ All integration tests pass
- ✅ All E2E tests pass
- ✅ Manual testing checklist complete
- ✅ Performance benchmarks met
- ✅ No CRITICAL or HIGH bugs
- ✅ Browser compatibility verified
- ✅ Accessibility audit passed
- ✅ Real .enex files from Evernote tested successfully

