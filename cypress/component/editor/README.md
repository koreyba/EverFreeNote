# Editor Component Tests

Component specs for the editor-related web UI.

## Scope

### Core editor
- `RichTextEditor` covers rich-text formatting, lists, alignment, colors, links, images, and history controls.

### Supporting components
- `Textarea`
- `Input`
- `Form`
- `InteractiveTag`

## Test priorities

1. `RichTextEditor`
2. `Textarea` and `Input`
3. `Form`
4. `InteractiveTag`

## Running the specs

```bash
npm run test:component -- --spec "cypress/component/editor/**/*.cy.tsx"
```

## Spec layout

```text
cypress/component/editor/
|-- RichTextEditor.rendering.cy.tsx   # render and caret placement coverage
|-- RichTextEditor.formatting.cy.tsx  # formatting, lists, alignment
|-- RichTextEditor.advanced.cy.tsx    # color, embeds, edge cases, clear formatting
|-- RichTextEditor.history.cy.tsx     # undo/redo toolbar behavior
|-- RichTextEditorApplyMarkdown.cy.tsx
|-- RichTextEditorPaste.cy.tsx
|-- Textarea.cy.tsx
|-- Input.cy.tsx
|-- Form.cy.tsx
|-- InteractiveTag.cy.tsx
`-- README.md
```
