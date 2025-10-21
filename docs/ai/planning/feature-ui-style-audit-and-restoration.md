---
phase: planning
title: Project Planning & Task Breakdown
description: Break down work into actionable tasks and estimate timeline
---

# Project Planning & Task Breakdown

## Milestones
**What are the major checkpoints?**

- [ ] **Milestone 1:** Design System Foundation - Tailwind config и цветовая палитра настроены
- [ ] **Milestone 2:** RichTextEditor Restoration - Редактор полностью читаем и функционален
- [ ] **Milestone 3:** UI Components Audit - Все компоненты согласованы и протестированы
- [ ] **Milestone 4:** QA & Polish - Все тесты проходят, визуальные баги исправлены

## Task Breakdown
**What specific work needs to be done?**

### Phase 1: Audit & Foundation (Приоритет: CRITICAL)
**Цель:** Понять текущее состояние и подготовить базу

- [ ] **Task 1.1:** Провести визуальный аудит всех страниц приложения
  - Открыть приложение и сделать скриншоты проблемных мест
  - Составить список всех компонентов с проблемами
  - Приоритизировать по критичности
  - **Estimate:** 30 минут

- [ ] **Task 1.2:** Изучить референс Evernote
  - Проанализировать цветовую палитру Evernote
  - Выделить ключевые паттерны (typography, spacing, colors)
  - Определить применимые элементы для нашего приложения
  - **Estimate:** 30 минут

- [ ] **Task 1.3:** Обновить @theme в globals.css с новой цветовой палитрой
  - Изменить --color-primary на зеленый (Evernote style)
  - Обновить --color-accent для интерактивных элементов
  - Обновить --color-ring для focus states
  - Проверить контрастность всех цветов
  - **ВАЖНО:** Проект использует Tailwind v4 - цвета в @theme, НЕ в JS config!
  - **Estimate:** 1 час

- [ ] **Task 1.4:** Обновить globals.css с базовыми стилями
  - Базовые стили для body, html
  - Typography defaults
  - Focus states
  - Selection colors
  - **Estimate:** 30 минут

### Phase 2: RichTextEditor Restoration (Приоритет: CRITICAL)
**Цель:** Сделать редактор полностью функциональным и читаемым

- [ ] **Task 2.1:** Исправить видимость текста в редакторе
  - Установить правильный цвет текста (#1f2937 или темнее)
  - Настроить placeholder color
  - Проверить контрастность (WCAG AA)
  - **Estimate:** 30 минут

- [ ] **Task 2.2:** Исправить toolbar и кнопки форматирования
  - Стилизовать toolbar (background, border)
  - Сделать иконки кнопок видимыми
  - Добавить hover states
  - Добавить active states для активных форматов
  - **Estimate:** 1 час

- [ ] **Task 2.3:** Настроить focus states для редактора
  - Border color при фокусе
  - Outline для accessibility
  - **Estimate:** 20 минут

- [ ] **Task 2.4:** Протестировать все функции редактора
  - Bold, italic, underline
  - Списки (ordered, unordered)
  - Заголовки разных уровней
  - Проверить на разных размерах экрана
  - **Estimate:** 30 минут

### Phase 3: UI Components Audit (Приоритет: HIGH)
**Цель:** Привести все компоненты к единому стилю

- [ ] **Task 3.1:** Аудит и исправление Button компонента
  - Проверить все варианты (default, primary, secondary, ghost, destructive)
  - Обновить цвета согласно новой палитре
  - Проверить hover/active/disabled states
  - **Estimate:** 45 минут

- [ ] **Task 3.2:** Аудит и исправление Input компонента
  - Контрастность текста
  - Border colors (default, focus, error)
  - Placeholder styling
  - **Estimate:** 30 минут

- [ ] **Task 3.3:** Аудит и исправление Card компонента
  - Shadows
  - Borders
  - Background colors
  - Spacing внутри карточек заметок
  - **Estimate:** 30 минут

- [ ] **Task 3.4:** Аудит и исправление Badge компонента (теги)
  - Цвета для тегов
  - Контрастность текста на цветном фоне
  - Hover states для интерактивных тегов
  - **Estimate:** 30 минут

- [ ] **Task 3.5:** Аудит остальных UI компонентов
  - Dialog/Alert
  - Dropdown
  - Checkbox/Radio
  - Switch
  - **Estimate:** 1 час

### Phase 4: Layout & Pages (Приоритет: MEDIUM)
**Цель:** Согласовать общий layout приложения

- [ ] **Task 4.1:** Исправить стили главной страницы (page.js)
  - Sidebar styling
  - Список заметок
  - Search bar
  - **Estimate:** 45 минут

- [ ] **Task 4.2:** Исправить стили AuthForm
  - Контрастность на темном фоне
  - Кнопки Google OAuth
  - Test login buttons
  - **Estimate:** 30 минут

- [ ] **Task 4.3:** Проверить responsive design
  - Mobile view
  - Tablet view
  - Desktop view
  - **Estimate:** 30 минут

### Phase 5: Testing & QA (Приоритет: HIGH)
**Цель:** Убедиться что все работает и выглядит правильно

- [ ] **Task 5.1:** Запустить Cypress component tests
  - Проверить что все тесты проходят
  - Обновить snapshots если необходимо
  - **Estimate:** 30 минут

- [ ] **Task 5.2:** Запустить Cypress e2e tests
  - Проверить auth flow
  - Проверить notes CRUD
  - **Estimate:** 30 минут

- [ ] **Task 5.3:** Manual testing всего приложения
  - Пройти все user flows
  - Проверить edge cases
  - Проверить на разных браузерах
  - **Estimate:** 1 час

- [ ] **Task 5.4:** Accessibility audit
  - Проверить keyboard navigation
  - Проверить контрастность с помощью инструментов
  - Проверить focus indicators
  - **Estimate:** 30 минут

### Phase 6: Documentation & Cleanup (Приоритет: LOW)
**Цель:** Документировать изменения

- [ ] **Task 6.1:** Создать style guide (опционально)
  - Документировать цветовую палитру
  - Примеры использования компонентов
  - **Estimate:** 1 час

- [ ] **Task 6.2:** Обновить README если необходимо
  - **Estimate:** 15 минут

## Dependencies
**What needs to happen in what order?**

**Critical path:**
1. Task 1.3 (Tailwind config) → блокирует все остальные задачи
2. Task 1.4 (globals.css) → должен быть после 1.3
3. Phase 2 (RichTextEditor) → может начаться после 1.3 и 1.4
4. Phase 3 (UI Components) → может идти параллельно с Phase 2
5. Phase 4 (Layout) → после Phase 2 и 3
6. Phase 5 (Testing) → после всех implementation tasks

**No external dependencies** - все работы внутри проекта

## Timeline & Estimates
**When will things be done?**

**Total estimated effort:** ~12-14 часов

**Breakdown by phase:**
- Phase 1: 2.5 часа
- Phase 2: 2.5 часа (CRITICAL)
- Phase 3: 3.5 часа
- Phase 4: 2 часа
- Phase 5: 2.5 часа
- Phase 6: 1.5 часа

**Realistic timeline:**
- Day 1: Phase 1 + Phase 2 (5 часов) - RichTextEditor работает
- Day 2: Phase 3 + Phase 4 (5.5 часов) - Все компоненты обновлены
- Day 3: Phase 5 + Phase 6 (4 часа) - Testing и документация

**Buffer:** +20% для непредвиденных проблем

## Risks & Mitigation
**What could go wrong?**

**Risk 1: Поломка существующих тестов**
- **Impact:** HIGH
- **Probability:** MEDIUM
- **Mitigation:** Запускать тесты после каждого major change, иметь возможность rollback

**Risk 2: Конфликты со стилями shadcn/ui**
- **Impact:** MEDIUM
- **Probability:** MEDIUM
- **Mitigation:** Использовать CSS specificity правильно, тестировать каждый компонент

**Risk 3: Проблемы с Tiptap editor styling**
- **Impact:** HIGH (это критический компонент)
- **Probability:** LOW
- **Mitigation:** Изучить документацию Tiptap по стилизации, использовать их рекомендованные подходы

**Risk 4: Увеличение размера CSS bundle**
- **Impact:** LOW
- **Probability:** LOW
- **Mitigation:** Использовать Tailwind purge, проверить bundle size после изменений

**Risk 5: Accessibility regression**
- **Impact:** MEDIUM
- **Probability:** LOW
- **Mitigation:** Проводить accessibility audit на каждом этапе

## Resources Needed
**What do we need to succeed?**

**Tools:**
- ✅ Browser DevTools для инспекции стилей
- ✅ Contrast checker для WCAG compliance
- ✅ Cypress для тестирования
- ✅ Evernote (web version) для референса

**Documentation:**
- ✅ Tailwind CSS docs
- ✅ shadcn/ui docs
- ✅ Tiptap docs (для editor styling)
- ✅ WCAG guidelines

**No additional team members or infrastructure needed**

