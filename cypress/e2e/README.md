# E2E Tests Architecture

## Overview
E2E тесты для EverFreeNote используют **Page Object паттерн** для maintainability и **Custom Commands** для переиспользования кода.

## Structure

```
cypress/e2e/
├── user-journeys/          # Полные end-to-end user flows
│   ├── complete-workflow.cy.js    # Login → CRUD → Search → Logout
│   ├── import-workflow.cy.js      # ENEX import flow
│   └── theme-workflow.cy.js       # Theme switching
├── critical-paths/         # Критические функции
│   ├── notes-crud.cy.js           # Extended CRUD operations
│   ├── tags-management.cy.js      # Tags functionality
│   └── infinite-scroll.cy.js      # Pagination/lazy loading
└── integration/            # Интеграция между компонентами
    └── search-integration.cy.js   # Search UI + filters
```

## Page Objects

Located in `cypress/support/page-objects/`:

### LoginPage
Handles authentication flows.

```javascript
import { LoginPage } from '../../support/page-objects/LoginPage'

const loginPage = new LoginPage()
loginPage.assertOnLoginPage()
const notesPage = loginPage.skipAuth()
```

### NotesPage
Main notes list page with search, tags, and navigation.

```javascript
import { NotesPage } from '../../support/page-objects/NotesPage'

const notesPage = new NotesPage()
notesPage.searchNotes('query')
notesPage.filterByTag('work')
notesPage.assertNoteExists('My Note')
```

### EditorPage
Note creation and editing.

```javascript
import { EditorPage } from '../../support/page-objects/EditorPage'

const editorPage = new EditorPage()
editorPage
  .fillTitle('Title')
  .fillContent('Content')
  .fillTags('tag1, tag2')
  .save()
```

### ImportPage
ENEX import functionality.

```javascript
import { ImportPage } from '../../support/page-objects/ImportPage'

const importPage = new ImportPage()
importPage.importFile('test.enex', 'prefix')
```

## Custom Commands

Located in `cypress/support/commands.ts`:

### Authentication
```javascript
cy.login()  // Skip auth login
```

### Notes CRUD
```javascript
cy.createNote('Title', 'Content', 'tags')
cy.deleteNote('Title')
cy.deleteAllNotes()  // Cleanup
```

### Search & Filter
```javascript
cy.searchNotes('query')
cy.clearSearch()
cy.filterByTag('work')
```

### Theme
```javascript
cy.toggleTheme()
```

### Import
```javascript
cy.importEnex('filename.enex', 'prefix')
```

### Assertions
```javascript
cy.assertNoteExists('Title')
cy.assertNoteNotExists('Title')
cy.assertTagExists('tag')
```

## Usage Examples

### Example 1: Using Page Objects
```javascript
import { LoginPage } from '../../support/page-objects/LoginPage'

it('should create and edit note', () => {
  const loginPage = new LoginPage()
  const notesPage = loginPage.skipAuth()
  
  const editorPage = notesPage.createNewNote()
  editorPage.fillNote('Title', 'Content', 'tags')
  const notesPageAfterSave = editorPage.save()
  
  notesPageAfterSave.assertNoteExists('Title')
})
```

### Example 2: Using Custom Commands
```javascript
it('should create multiple notes', () => {
  cy.login()
  cy.createNote('Note 1', 'Content 1', 'tag1')
  cy.createNote('Note 2', 'Content 2', 'tag2')
  
  cy.assertNoteExists('Note 1')
  cy.assertNoteExists('Note 2')
})
```

### Example 3: Using Fixtures
```javascript
it('should create note from fixture', () => {
  cy.login()
  
  cy.fixture('notes/simple-note').then((note) => {
    cy.createNote(note.title, note.content, note.tags)
  })
  
  cy.assertNoteExists('Simple Test Note')
})
```

## Best Practices

### 1. Use Page Objects for Complex Flows
✅ **GOOD:**
```javascript
const notesPage = loginPage.skipAuth()
const editorPage = notesPage.createNewNote()
editorPage.fillNote('Title', 'Content').save()
```

❌ **BAD:**
```javascript
cy.contains('Skip Authentication').click()
cy.contains('New Note').click()
cy.get('input').type('Title')
// ... много дублирующегося кода
```

### 2. Use Custom Commands for Common Actions
✅ **GOOD:**
```javascript
cy.login()
cy.createNote('Title', 'Content')
```

❌ **BAD:**
```javascript
cy.visit('/')
cy.contains('Skip Authentication').click()
cy.contains('New Note').click()
// ... повторяющийся код
```

### 3. Combine Related Tests
✅ **GOOD:**
```javascript
it('should handle full note lifecycle', () => {
  // create → edit → delete (all in one flow)
})
```

❌ **BAD:**
```javascript
it('should create note', () => { /* ... */ })
it('should edit note', () => { /* create again → edit */ })
it('should delete note', () => { /* create again → delete */ })
```

### 4. Use Fixtures for Test Data
✅ **GOOD:**
```javascript
cy.fixture('notes/tagged-notes').then((notes) => {
  notes.forEach(note => cy.createNote(note.title, note.content, note.tags))
})
```

❌ **BAD:**
```javascript
cy.createNote('Work Note', 'Work content', 'work')
cy.createNote('Personal Note', 'Personal content', 'personal')
// ... hardcoded data
```

## Running Tests

### Run all e2e tests
```bash
npm run test:e2e
# or
npx cypress run --e2e
```

### Run specific test file
```bash
npx cypress run --spec "cypress/e2e/user-journeys/complete-workflow.cy.js"
```

### Open Cypress UI
```bash
npx cypress open --e2e
```

### Run in specific browser
```bash
npx cypress run --browser chrome
```

## Test Coverage

| Feature | E2E Coverage | Component Coverage |
|---------|-------------|-------------------|
| Authentication | ✅ Full flow | ✅ UI only |
| Notes CRUD | ✅ Full flow | ✅ UI only |
| Rich Text | ✅ Integration | ✅ Full |
| Search | ✅ UI + filters | ✅ Component |
| Tags | ✅ Full flow | ✅ UI only |
| Import | ✅ Full flow | ✅ UI only |
| Theme | ✅ Full flow | ✅ UI only |
| Infinite Scroll | ✅ Full flow | ⏭️ Skipped |

## Performance

- Each test: ≤ 3 minutes
- Total execution: ≤ 10 minutes
- Retry strategy: 2 retries in CI, 0 in dev

## Troubleshooting

### Tests failing randomly (flaky)
- Check for proper wait strategies
- Use `cy.contains('text', { timeout: 10000 })` instead of `cy.wait(1000)`
- Verify selectors are stable

### Element not found
- Ensure element exists in DOM
- Check if element is hidden or disabled
- Use `cy.get('selector', { timeout: 10000 }).should('be.visible')`

### Import tests skipped
- Import feature may not be fully implemented
- Remove `.skip()` when feature is ready
- Verify ENEX files exist in `cypress/fixtures/enex/`

## Contributing

When adding new e2e tests:

1. Follow Page Object pattern
2. Use existing Custom Commands
3. Add fixtures for test data
4. Keep tests under 3 minutes
5. Update this README

## References

- [Cypress Documentation](https://docs.cypress.io/)
- [Page Object Pattern](https://martinfowler.com/bliki/PageObject.html)
- [Design Doc](../../docs/ai/design/feature-e2e-testing-coverage.md)
- [Planning Doc](../../docs/ai/planning/feature-e2e-testing-coverage.md)

