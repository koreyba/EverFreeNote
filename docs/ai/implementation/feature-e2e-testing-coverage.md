---
phase: implementation
title: Implementation Guide
description: Technical implementation notes, patterns, and code guidelines
---

# Implementation Guide

## Development Setup
**How do we get started?**

### Prerequisites
- Node.js 24+
- Cypress 15.5.0
- Next.js 15 app running on `localhost:3000`
- Supabase (local or test instance)

### Environment Setup
```bash
# Install dependencies (if needed)
npm install

# Start Next.js app
npm run dev

# Run e2e tests
npm run test:e2e

# Open Cypress UI
npx cypress open --e2e
```

## Code Structure
**How is the code organized?**

### Directory Structure
```
cypress/
├── e2e/
│   ├── user-journeys/          # Full end-to-end flows
│   ├── critical-paths/         # Critical features
│   └── integration/            # Component integration
├── support/
│   ├── e2e.js                  # Global config
│   ├── commands.ts             # Custom commands
│   ├── page-objects/           # Page Object classes
│   └── helpers/                # Test helpers
└── fixtures/
    ├── notes/                  # Test note data
    └── enex/                   # ENEX test files
```

## Implementation Notes
**Key technical details to remember:**

### Page Object Pattern

**Structure:**
```javascript
class PageName {
  // 1. Selectors (getters)
  get elementName() { return cy.get('selector') }
  
  // 2. Actions (methods that do something)
  actionName() {
    this.elementName.click()
    return new NextPage() // Chain to next page
  }
  
  // 3. Assertions (verification methods)
  assertSomething() {
    this.elementName.should('be.visible')
  }
}
```

**Example:**
```javascript
// cypress/support/page-objects/Notespage.tsx
export class NotesPage {
  get newNoteButton() { return cy.contains('New Note') }
  get searchInput() { return cy.get('input[placeholder*="Search"]') }
  
  createNewNote() {
    this.newNoteButton.click()
    return new EditorPage()
  }
  
  searchNotes(query) {
    this.searchInput.clear().type(query)
  }
  
  assertOnNotesPage() {
    this.newNoteButton.should('be.visible')
  }
}
```

### Custom Commands Pattern

**Structure:**
```javascript
Cypress.Commands.add('commandName', (param1, param2) => {
  // Implementation
})
```

**Example:**
```javascript
// cypress/support/commands.ts
Cypress.Commands.add('login', () => {
  cy.visit('/')
  cy.contains('Skip Authentication').click()
  cy.contains('New Note', { timeout: 10000 }).should('be.visible')
})

Cypress.Commands.add('createNote', (title, content, tags = '') => {
  cy.contains('New Note').click()
  cy.get('input[placeholder="Note title"]').type(title)
  cy.get('[data-cy="editor-content"]').click().type(content)
  if (tags) {
    cy.get('input[placeholder="work, personal, ideas"]').type(tags)
  }
  cy.contains('button', 'Save').click()
  cy.contains('Note created successfully').should('be.visible')
})
```

### Test Structure Pattern

**Structure:**
```javascript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup
    cy.clearLocalStorage()
    cy.clearCookies()
  })

  it('should do something (full flow)', () => {
    // Arrange
    const loginPage = new LoginPage()
    
    // Act
    const notesPage = loginPage.skipAuth()
    const editorPage = notesPage.createNewNote()
    
    // Assert
    notesPage.assertNoteExists('Note Title')
  })
})
```

### Patterns & Best Practices

#### 1. Chain Page Objects
```javascript
// ✅ GOOD: Chain page transitions
new LoginPage()
  .skipAuth()
  .createNewNote()
  .fillTitle('Test')
  .fillContent('Content')
  .save()
  .assertNoteExists('Test')

// ❌ BAD: Don't break the chain
const loginPage = new LoginPage()
loginPage.skipAuth()
// ... lost reference to NotesPage
```

#### 2. Use Fixtures
```javascript
// ✅ GOOD: Use fixtures
cy.fixture('notes/simple-note').then((note) => {
  cy.createNote(note.title, note.content, note.tags)
})

// ❌ BAD: Hardcode data
cy.createNote('Test Note', 'Test Content', 'test')
```

#### 3. Combine Related Tests
```javascript
// ✅ GOOD: One comprehensive flow
it('should handle complete note lifecycle', () => {
  // create → edit → delete
})

// ❌ BAD: Separate tests with duplicate setup
it('should create note', () => { /* ... */ })
it('should edit note', () => { /* create again → edit */ })
it('should delete note', () => { /* create again → delete */ })
```

#### 4. Use Custom Commands for Common Actions
```javascript
// ✅ GOOD: Use custom command
cy.login()
cy.createNote('Title', 'Content')

// ❌ BAD: Repeat code
cy.visit('/')
cy.contains('Skip Authentication').click()
cy.contains('New Note').click()
// ... много кода
```

#### 5. Proper Wait Strategies
```javascript
// ✅ GOOD: Wait for specific element
cy.contains('Note created successfully', { timeout: 10000 }).should('be.visible')

// ❌ BAD: Arbitrary waits
cy.wait(1000) // Flaky!
```

## Integration Points
**How do pieces connect?**

### Page Objects → Custom Commands
```javascript
// Page Object uses custom command
class NotesPage {
  quickCreateNote(title, content) {
    cy.createNote(title, content) // Use custom command
  }
}
```

### Tests → Page Objects → Custom Commands
```javascript
// Test uses Page Object
it('should create note', () => {
  const notesPage = new NotesPage()
  notesPage.quickCreateNote('Test', 'Content') // Page Object method
})

// Page Object uses Custom Command
class NotesPage {
  quickCreateNote(title, content) {
    cy.createNote(title, content) // Custom command
  }
}
```

## Error Handling
**How do we handle failures?**

### Retry Strategy
```javascript
// cypress.config.ts
e2e: {
  retries: {
    runMode: 2,      // Retry 2 times in CI
    openMode: 0      // No retry in dev
  }
}
```

### Error Messages
```javascript
// ✅ GOOD: Descriptive assertions
cy.contains('Note created successfully')
  .should('be.visible', 'Note creation toast should appear')

// ❌ BAD: Generic assertions
cy.get('.toast').should('exist')
```

### Cleanup on Failure
```javascript
afterEach(function() {
  if (this.currentTest.state === 'failed') {
    // Take screenshot (automatic in Cypress)
    // Log additional debug info
    cy.log('Test failed, check screenshots')
  }
})
```

## Performance Considerations
**How do we keep it fast?**

### Optimization Strategies

#### 1. Skip Unnecessary Waits
```javascript
// ✅ GOOD: Implicit wait
cy.contains('New Note').click()

// ❌ BAD: Explicit wait
cy.wait(1000)
cy.contains('New Note').click()
```

#### 2. Use Fixtures Instead of Creating Data
```javascript
// ✅ GOOD: Load fixture
cy.fixture('notes/tagged-notes').then((notes) => {
  notes.forEach(note => cy.createNote(note.title, note.content, note.tags))
})

// ❌ BAD: Create data manually in each test
it('test 1', () => { cy.createNote(...) })
it('test 2', () => { cy.createNote(...) }) // Duplicate
```

#### 3. Combine Related Tests
```javascript
// ✅ GOOD: 1 test with full flow (2 min)
it('should handle note lifecycle', () => {
  // create → edit → delete
})

// ❌ BAD: 3 separate tests (6 min total)
it('create', () => { /* 2 min */ })
it('edit', () => { /* 2 min */ })
it('delete', () => { /* 2 min */ })
```

#### 4. Parallel Execution (if possible)
```javascript
// cypress.config.ts
e2e: {
  experimentalRunAllSpecs: true // Run specs in parallel
}
```

### Performance Targets
- Each test: ≤ 3 minutes
- Total execution: ≤ 10 minutes
- Page load: ≤ 5 seconds
- API calls: ≤ 2 seconds

## Security Notes
**What security measures are in place?**

### Test Data Security
```javascript
// ✅ GOOD: Use environment variables
const testUser = Cypress.env('TEST_USER_EMAIL')

// ❌ BAD: Hardcode credentials
const testUser = 'real-user@example.com'
```

### Cleanup
```javascript
afterEach(() => {
  // Clean up test data
  cy.deleteAllNotes() // Custom command
})
```

## Testing Strategy
**How do we validate this works?**

### What to Test in E2E
- ✅ User flows (login → action → logout)
- ✅ Navigation between pages
- ✅ Data persistence
- ✅ Integration between components
- ✅ Critical user journeys

### What NOT to Test in E2E
- ❌ UI element styling
- ❌ Form validation
- ❌ Edge cases (covered by component tests)
- ❌ Individual component behavior

### Test Coverage Matrix
| Feature | Component Tests | E2E Tests |
|---------|----------------|-----------|
| Login UI | ✅ | Auth flow only |
| Notes CRUD | ✅ | Full flow only |
| Rich Text | ✅ | Integration only |
| Search | ✅ | UI + filters |
| Tags | ✅ | Full flow |
| Import | ✅ | Full flow |

## Debugging Tips
**How to debug failing tests?**

### 1. Use Cypress UI
```bash
npx cypress open --e2e
```

### 2. Add Debug Points
```javascript
cy.debug() // Pause execution
cy.pause() // Pause and allow stepping
```

### 3. Check Screenshots
```bash
# Screenshots saved to:
cypress/screenshots/
```

### 4. Check Videos
```bash
# Videos saved to:
cypress/videos/
```

### 5. Use Console Logs
```javascript
cy.log('Current step: Creating note')
cy.get('input').then(($input) => {
  console.log('Input value:', $input.val())
})
```

## Common Issues & Solutions

### Issue 1: Element Not Found
```javascript
// ❌ Problem
cy.get('.my-element').click() // Fails immediately

// ✅ Solution
cy.get('.my-element', { timeout: 10000 }).should('be.visible').click()
```

### Issue 2: Flaky Tests
```javascript
// ❌ Problem
cy.wait(1000) // Arbitrary wait

// ✅ Solution
cy.contains('Expected text').should('be.visible') // Wait for specific condition
```

### Issue 3: Stale Element Reference
```javascript
// ❌ Problem
const button = cy.get('button')
// ... do something ...
button.click() // May fail if DOM changed

// ✅ Solution
cy.get('button').click() // Query fresh each time
```

## Implementation Checklist

### Before Starting
- [ ] Read requirements doc
- [ ] Read design doc
- [ ] Understand Page Object pattern
- [ ] Review existing tests

### During Implementation
- [ ] Follow Page Object pattern
- [ ] Use custom commands
- [ ] Use fixtures
- [ ] No duplication with component tests
- [ ] Each test ≤ 3 minutes

### After Implementation
- [ ] All tests pass
- [ ] No flaky tests
- [ ] Documentation updated
- [ ] Code reviewed

## Next Steps

1. **Phase 1:** Setup architecture
2. **Phase 2:** Implement Page Objects
3. **Phase 3:** Refactor existing tests
4. **Phase 4:** Create new tests
5. **Phase 5:** Documentation & cleanup

**Ready? Let's start with Phase 1!**

