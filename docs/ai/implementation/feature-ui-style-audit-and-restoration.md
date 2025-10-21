---
phase: implementation
title: Implementation Guide
description: Technical implementation notes, patterns, and code guidelines
---

# Implementation Guide

## Development Setup
**How do we get started?**

**Prerequisites:**
- Node.js и npm уже установлены
- Проект уже настроен
- Tailwind CSS уже в проекте

**Environment setup:**
```bash
# Убедиться что все зависимости установлены
npm install

# Запустить dev server для live preview
npm run dev

# В отдельном терминале можно запустить Cypress для component testing
npm run cypress:open
```

**Useful commands:**
```bash
# Build для проверки production bundle size
npm run build

# Запуск всех тестов
npm run test

# Cypress component tests
npm run cypress:component

# Cypress e2e tests
npm run cypress:e2e
```

## Code Structure
**How is the code organized?**

**Файлы для изменения:**
```
app/globals.css                 # @theme tokens + глобальные стили (ГЛАВНЫЙ ФАЙЛ!)
components/RichTextEditor.jsx   # Критический компонент
components/ui/*.jsx             # shadcn/ui компоненты
components/AuthForm.jsx         # Форма авторизации
app/page.js                     # Главная страница
app/layout.js                   # Layout wrapper
```

**ВАЖНО:** В Tailwind v4 НЕТ `tailwind.config.js` для цветов! Все через `@theme` в CSS!

**Naming conventions:**
- Использовать Tailwind utility classes где возможно
- Для custom CSS использовать BEM или descriptive names
- Color names: semantic (primary, secondary) вместо literal (green, blue)

## Implementation Notes
**Key technical details to remember:**

### Core Features

#### Feature 1: Tailwind v4 Theme Setup
**Файл:** `app/globals.css`

**ВАЖНО:** Проект использует Tailwind CSS v4! Конфигурация через `@theme` в CSS, НЕ через JS config!

**Approach:**
```css
@theme {
  /* Primary colors - зеленая палитра Evernote */
  --color-primary: oklch(55% 0.15 145);
  --color-primary-foreground: oklch(100% 0 0);
  
  /* Accent colors */
  --color-accent: oklch(96% 0.01 145);
  --color-accent-foreground: oklch(30% 0.05 145);
  
  /* Muted colors для второстепенных элементов */
  --color-muted: oklch(96% 0.005 264);
  --color-muted-foreground: oklch(54% 0.016 257);
  
  /* Border и input */
  --color-border: oklch(91% 0.012 257);
  --color-input: oklch(91% 0.012 257);
  
  /* Ring для focus states */
  --color-ring: oklch(55% 0.15 145);
}
```

**Key points:**
- Tailwind v4 использует CSS custom properties вместо JS config
- Цвета в oklch() формате (современный цветовой формат)
- Primary = зеленый (Evernote style)
- Ring color = primary для consistent focus states

#### Feature 2: RichTextEditor Styling
**Файл:** `components/RichTextEditor.jsx`

**Current problems:**
- Текст не виден
- Кнопки toolbar не видны
- Нет active states

**Solution approach:**
```jsx
// Toolbar styling
<div className="border-b border-neutral-200 bg-neutral-50 p-2 flex gap-1">
  {/* Buttons */}
</div>

// Editor content area
<EditorContent 
  className="prose prose-neutral min-h-[200px] p-4 focus:outline-none"
  editor={editor}
/>

// Button styles
<button className={cn(
  "p-2 rounded hover:bg-neutral-200 transition-colors",
  isActive && "bg-primary-100 text-primary-700"
)}>
```

**Critical CSS classes:**
- Text color: `text-neutral-900` для основного текста
- Placeholder: `placeholder:text-neutral-400`
- Toolbar background: `bg-neutral-50`
- Active button: `bg-primary-100 text-primary-700`
- Focus: `focus:ring-2 focus:ring-primary-500`

#### Feature 3: Button Component Updates
**Файл:** `components/ui/button.jsx`

**Variants to update:**
```js
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary-600 text-white hover:bg-primary-700",
        secondary: "bg-neutral-200 text-neutral-900 hover:bg-neutral-300",
        ghost: "hover:bg-neutral-100 hover:text-neutral-900",
        // ... other variants
      }
    }
  }
)
```

### Patterns & Best Practices

**Pattern 1: Consistent Color Usage**
- Always use color tokens from `@theme` в globals.css
- Never use arbitrary colors like `text-[#123456]`
- Use semantic naming: `primary`, `accent`, `muted`
- В Tailwind v4 цвета через CSS custom properties: `var(--color-primary)`

**Pattern 2: Focus States**
- All interactive elements must have visible focus states
- Use `focus:ring-2 focus:ring-primary-500` pattern
- Test keyboard navigation after changes

**Pattern 3: Contrast Checking**
- Text on background must have 4.5:1 contrast minimum
- Use browser DevTools or online tools to verify
- Pay special attention to colored buttons

**Pattern 4: Responsive Design**
- Test on mobile, tablet, desktop
- Use Tailwind responsive prefixes: `sm:`, `md:`, `lg:`
- Ensure touch targets are at least 44x44px on mobile

## Integration Points
**How do pieces connect?**

**Tailwind v4 @theme → Components:**
- All components consume colors from `@theme` в globals.css
- Changes in @theme propagate to all components automatically
- Use utility classes (bg-primary, text-primary-foreground, etc.)
- Avoid `@apply` in Tailwind v4 (deprecated pattern)

**globals.css → App:**
- Base styles apply to entire app
- Typography defaults set here
- Focus styles can be global

**shadcn/ui components:**
- Already use Tailwind
- May need to update color tokens in individual component files
- Check `components/ui/` directory

## Error Handling
**How do we handle failures?**

**CSS not applying:**
- Check Tailwind purge isn't removing classes
- Verify class names are correct
- Check CSS specificity conflicts
- Use DevTools to inspect computed styles

**Tests failing:**
- Update Cypress snapshots if visual changes are intentional
- Check selectors still work after className changes
- Verify functionality wasn't broken

**Performance issues:**
- Check bundle size with `npm run build`
- Verify Tailwind purge is working
- Remove unused CSS

## Performance Considerations
**How do we keep it fast?**

**Optimization strategies:**
- Use Tailwind's purge to remove unused styles
- Avoid deep CSS nesting
- Use CSS custom properties for theme values if needed
- Minimize use of `@apply` (it increases bundle size)

**Bundle size monitoring:**
```bash
# Check before changes
npm run build
# Note the CSS bundle size

# After changes, compare
npm run build
# Should not increase more than 10%
```

**Runtime performance:**
- Avoid CSS-in-JS for static styles
- Use Tailwind utilities (they're optimized)
- Minimize repaints/reflows

## Security Notes
**What security measures are in place?**

**No security changes needed** - это purely visual update

**Considerations:**
- Don't expose sensitive data in CSS classes or comments
- Ensure focus states don't reveal sensitive information
- Test that authentication flow still works correctly

## Testing Strategy
**How to verify changes:**

**Visual testing:**
1. Open app in browser
2. Check each component manually
3. Compare with Evernote reference
4. Test on different screen sizes

**Automated testing:**
1. Run Cypress component tests
2. Run Cypress e2e tests
3. Update snapshots if needed

**Accessibility testing:**
1. Use keyboard navigation
2. Check contrast with DevTools
3. Test with screen reader if possible

**Checklist before committing:**
- [ ] All text is readable
- [ ] All buttons are visible
- [ ] Colors are consistent
- [ ] Tests pass
- [ ] No console errors
- [ ] Bundle size acceptable

