---
phase: testing
title: Testing Strategy
description: Define testing approach, test cases, and quality assurance
---

# Testing Strategy

## Test Coverage Goals
**What level of testing do we aim for?**

- **Visual regression testing:** Ручная проверка всех компонентов
- **Cypress component tests:** Все существующие тесты должны проходить
- **Cypress e2e tests:** Все user flows должны работать
- **Accessibility testing:** WCAG AA compliance для контрастности
- **Cross-browser testing:** Chrome, Firefox, Safari, Edge

**Alignment with requirements:**
- ✅ Текст в редакторе читаем
- ✅ Кнопки видны и различимы
- ✅ Цвета согласованы
- ✅ Интерфейс профессионален

## Unit Tests
**What individual components need testing?**

### Component 1: RichTextEditor
- [ ] **Test case 1:** Текст виден с достаточным контрастом
  - Проверить что text color имеет контраст 4.5:1 минимум
  - Проверить placeholder color
- [ ] **Test case 2:** Toolbar кнопки видны и работают
  - Проверить что все кнопки отображаются
  - Проверить hover states
  - Проверить active states для активных форматов
- [ ] **Test case 3:** Focus state работает
  - Проверить border color при фокусе
  - Проверить outline для accessibility
- [ ] **Existing Cypress test:** `cypress/component/RichTextEditor.cy.js` должен проходить

### Component 2: Button (ui/button.jsx)
- [ ] **Test case 1:** Все варианты кнопок видны
  - default, secondary, ghost, destructive
  - Проверить контрастность текста на фоне
- [ ] **Test case 2:** Hover/active/disabled states работают
- [ ] **Existing Cypress test:** `cypress/component/Button.cy.js` должен проходить

### Component 3: Input (ui/input.jsx)
- [ ] **Test case 1:** Контрастность текста и placeholder
- [ ] **Test case 2:** Focus state виден
- [ ] **Test case 3:** Error state виден
- [ ] **Existing Cypress test:** `cypress/component/Input.cy.js` должен проходить

### Component 4: Card (ui/card.jsx)
- [ ] **Test case 1:** Shadows и borders видны
- [ ] **Test case 2:** Spacing внутри карточек правильный
- [ ] **Existing Cypress test:** `cypress/component/Card.cy.js` должен проходить

### Component 5: Badge (ui/badge.jsx)
- [ ] **Test case 1:** Цвета для тегов контрастны
- [ ] **Test case 2:** Hover states для интерактивных тегов
- [ ] **Existing Cypress test:** `cypress/component/Badge.cy.js` должен проходить

### Component 6: InteractiveTag
- [ ] **Existing Cypress test:** `cypress/component/InteractiveTag.cy.js` должен проходить

### Component 7: AuthForm
- [ ] **Existing Cypress test:** `cypress/component/AuthForm.cy.js` должен проходить

## Integration Tests
**How do we test component interactions?**

- [ ] **Integration scenario 1:** Создание заметки с форматированием
  - Открыть новую заметку
  - Использовать все кнопки форматирования
  - Проверить что форматирование применяется
  - Сохранить заметку
  
- [ ] **Integration scenario 2:** Редактирование существующей заметки
  - Открыть существующую заметку
  - Изменить форматирование
  - Проверить что изменения сохраняются

- [ ] **Integration scenario 3:** Работа с тегами
  - Добавить теги к заметке
  - Проверить видимость тегов
  - Удалить теги

## End-to-End Tests
**What user flows need validation?**

- [ ] **E2E flow 1:** Полный auth flow
  - Existing test: `cypress/e2e/auth-and-notes.cy.js`
  - Проверить что все элементы видны
  - Проверить что можно залогиниться
  
- [ ] **E2E flow 2:** Полный CRUD flow для заметок
  - Existing test: `cypress/e2e/basic-notes.cy.js`
  - Создать заметку
  - Отредактировать заметку
  - Удалить заметку
  
- [ ] **E2E flow 3:** Поиск заметок
  - Создать несколько заметок
  - Использовать поиск
  - Проверить результаты

## Test Data
**What data do we use for testing?**

- Используются существующие Cypress fixtures
- Test users для auth flow
- Sample notes с различным форматированием
- Различные наборы тегов

## Test Reporting & Coverage
**How do we verify and communicate test results?**

**Commands:**
```bash
# Запустить все component tests
npm run test:component

# Запустить все e2e tests
npm run test:e2e

# Запустить все тесты
npm run test:all

# Открыть Cypress UI для отладки
npm run cypress
```

**Coverage gaps:**
- Visual regression testing - только ручное
- Accessibility testing - частично ручное
- Cross-browser testing - ручное

**Expected results:**
- ✅ Все существующие Cypress тесты проходят
- ✅ Никаких новых ошибок в консоли
- ✅ Визуальные изменения соответствуют дизайну

## Manual Testing
**What requires human validation?**

### UI/UX Testing Checklist

**RichTextEditor:**
- [ ] Текст виден и читаем
- [ ] Placeholder виден
- [ ] Все кнопки toolbar видны
- [ ] Hover states работают
- [ ] Active states показывают текущее форматирование
- [ ] Focus state виден
- [ ] Курсор виден при наборе текста

**Buttons:**
- [ ] Все варианты кнопок видны (default, secondary, ghost, destructive)
- [ ] Hover states работают
- [ ] Active states работают
- [ ] Disabled state виден
- [ ] Focus ring виден при keyboard navigation

**Inputs:**
- [ ] Текст виден
- [ ] Placeholder виден
- [ ] Border виден
- [ ] Focus state виден
- [ ] Error state виден (если применимо)

**Cards (список заметок):**
- [ ] Borders/shadows видны
- [ ] Текст заголовка виден
- [ ] Дата видна
- [ ] Теги видны
- [ ] Hover state работает

**AuthForm:**
- [ ] Текст на темном фоне виден
- [ ] Google button виден
- [ ] Test login buttons видны
- [ ] Focus states работают

**Layout:**
- [ ] Sidebar виден
- [ ] Search bar виден и работает
- [ ] New Note button виден
- [ ] Общая структура согласована

### Browser/Device Compatibility
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile view (responsive)
- [ ] Tablet view (responsive)

### Accessibility Checklist
- [ ] Keyboard navigation работает
- [ ] Tab order логичен
- [ ] Focus indicators видны
- [ ] Контрастность текста WCAG AA (4.5:1 минимум)
- [ ] Контрастность UI элементов WCAG AA (3:1 минимум)
- [ ] Screen reader friendly (опционально)

## Performance Testing
**How do we validate performance?**

**Bundle size check:**
```bash
npm run build
# Проверить размер CSS bundle
# Не должен увеличиться более чем на 10%
```

**Runtime performance:**
- [ ] Рендеринг компонентов не замедлился
- [ ] Нет layout shifts
- [ ] Нет лишних repaints

**Tools:**
- Chrome DevTools Performance tab
- Lighthouse audit
- Bundle analyzer (если необходимо)

## Bug Tracking
**How do we manage issues?**

**Issue severity levels:**
- **CRITICAL:** Текст не виден, приложение неюзабельно
- **HIGH:** Кнопки не видны, плохой UX
- **MEDIUM:** Небольшие визуальные несоответствия
- **LOW:** Косметические улучшения

**Process:**
1. Найти баг во время testing
2. Документировать (скриншот, шаги воспроизведения)
3. Исправить немедленно если CRITICAL/HIGH
4. Создать task для MEDIUM/LOW если необходимо

**Regression testing:**
- После каждого fix запускать все Cypress тесты
- Проверять что fix не сломал другие компоненты
- Обновлять snapshots если визуальные изменения ожидаемы

## Sign-off Criteria
**When can we consider testing complete?**

- ✅ Все Cypress тесты проходят
- ✅ Manual testing checklist завершен
- ✅ Accessibility audit пройден
- ✅ Cross-browser testing завершено
- ✅ Performance не пострадала
- ✅ Никаких CRITICAL/HIGH багов
- ✅ Визуальные изменения соответствуют Evernote reference

