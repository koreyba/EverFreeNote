---
phase: implementation
title: Implementation Guide
description: Technical implementation notes, patterns, and code guidelines
---

# Implementation Guide — Force Paste Format

## Development Setup
**How do we get started?**

- No new dependencies required — reuses existing `SmartPasteService`, TipTap, and lucide-react-native.
- Start with Task 1.1 (service layer) to enable isolated unit testing before touching UI.
- Run existing test suite first to establish a green baseline.

## Code Structure
**How is the code organized?**

```
core/
  services/
    smartPaste.ts          ← modify: add forcedType param + extract _resolve helper

ui/
  web/
    components/
      RichTextEditor.tsx           ← modify: add handler, hasSelection state, button
      RichTextEditorWebView.tsx    ← modify: same
      ApplyMarkdownButton.tsx      ← NEW: web toolbar button component
  mobile/
    components/
      EditorToolbar.tsx            ← modify: add button with disabled prop
    tests/
      unit/
        core-services-smartPaste.test.ts   ← modify: add forced-type tests
      integration/
        smartPaste.integration.test.ts     ← modify: add forced markdown test
        fixtures/
          force-markdown.txt               ← NEW: low-score markdown fixture
```

## Implementation Notes

### 1. `SmartPasteService.resolvePaste()` — forced type bypass

Extract the current pipeline body into a private `_resolve()` helper, then branch early:

```typescript
// core/services/smartPaste.ts

static resolvePaste(
  payload: PastePayload,
  options: SmartPasteOptions = {},
  forcedType?: PasteType,
): PasteResult {
  const detection: PasteDetection = forcedType
    ? {
        type: forcedType,
        confidence: 1.0,
        reasons: ['forced-by-user'],
        warnings: [],
      }
    : SmartPasteService.detectPasteType(payload, options)

  return SmartPasteService._resolve(payload, detection, options)
}

private static _resolve(
  payload: PastePayload,
  detection: PasteDetection,
  options: SmartPasteOptions,
): PasteResult {
  // existing pipeline body (html/markdown/plain branches + try/catch fallback)
}
```

### 2. `applySelectionAsMarkdown` handler in editor

```typescript
// RichTextEditor.tsx (mirror in RichTextEditorWebView.tsx)

const [hasSelection, setHasSelection] = useState(false)

// Track selection changes
useEffect(() => {
  if (!editor) return
  const update = () => {
    const { from, to } = editor.state.selection
    setHasSelection(from !== to)
  }
  editor.on('selectionUpdate', update)
  return () => editor.off('selectionUpdate', update)
}, [editor])

const applySelectionAsMarkdown = useCallback(() => {
  const { from, to } = editor.state.selection
  if (from === to) return

  const selectedText = editor.state.doc.textBetween(from, to, '\n')
  const payload: PastePayload = { text: selectedText, html: null, types: ['text/plain'] }
  const result = SmartPasteService.resolvePaste(payload, undefined, 'markdown')

  editor.chain().focus().deleteRange({ from, to }).insertContent(result.html).run()
  onContentChange?.()
}, [editor, onContentChange])
```

### 3. `ApplyMarkdownButton` web component

```tsx
// ui/web/components/ApplyMarkdownButton.tsx

interface Props {
  disabled: boolean
  onClick: () => void
}

export function ApplyMarkdownButton({ disabled, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Apply as Markdown"
      title="Apply as Markdown"
      className="toolbar-button"
    >
      MD
    </button>
  )
}
```

Adjust class names to match the actual design system in `RichTextEditor.tsx`.

### 4. Mobile toolbar button (`EditorToolbar.tsx`)

```tsx
// Add to props interface:
hasSelection: boolean
onApplyMarkdown: () => void

// In render:
<TouchableOpacity
  onPress={onApplyMarkdown}
  disabled={!hasSelection}
  style={[styles.button, !hasSelection && styles.buttonDisabled]}
  accessibilityLabel="Apply as Markdown"
>
  <FileText size={20} color={hasSelection ? color : disabledColor} />
</TouchableOpacity>
```

## Integration Points

- `SmartPasteService.resolvePaste()` ← called from `applySelectionAsMarkdown` in both editor components.
- `ApplyMarkdownButton` ← rendered inside the toolbar JSX in `RichTextEditor`.
- `EditorToolbar` ← receives `hasSelection` + `onApplyMarkdown` from its parent mobile editor.
- Existing `handlePaste` is **not touched** — auto-detection on paste is unchanged.

## Error Handling

- The existing `try/catch` fallback in `resolvePaste` (falls back to plain text on parse error) covers the forced-type path equally.
- If `selectedText` is empty string: markdown-it returns empty output → `insertContent('')` → no visible change. Safe.
- `hasSelection` guard in the button (`disabled` state) prevents calling the handler with an empty selection.

## Performance Considerations

- `onSelectionUpdate` updates only a boolean flag — no heavy computation.
- The forced-type path short-circuits `detectPasteType()` — faster than auto-detection.

## Security Notes

- `selectedText` comes from the editor's own document model — not from an external source. Lower risk than clipboard data.
- Output still passes through `sanitizePasteHtml()` (DOMPurify + allowlist) — no new XSS surface.
- markdown-it is configured with `html: false` — raw HTML in selected markdown text is not rendered.
