# 🔒 Правила разработки

## ✅ Обязательная проверка перед каждым коммитом

Перед тем как считать задачу выполненной, **ОБЯЗАТЕЛЬНО** запускаем:

```powershell
npm run validate
```

Это запустит:
1. **TypeScript проверку** (`tsc --noEmit`) - проверяет типы
2. **ESLint проверку** (`eslint . --max-warnings=0`) - проверяет стиль кода

**❌ Если хотя бы одна проверка не прошла - задача НЕ завершена!**

---

## � Строгие правила TypeScript

### Включены проверки:
- ✅ `strict: true` - все строгие проверки
- ✅ `noUnusedLocals: true` - нет неиспользуемых переменных
- ✅ `noUnusedParameters: true` - нет неиспользуемых параметров
- ✅ `noImplicitReturns: true` - явный return во всех ветках
- ✅ `noFallthroughCasesInSwitch: true` - нет провалов в switch
- ✅ `forceConsistentCasingInFileNames: true` - регистр в именах файлов

### Что это значит:
```typescript
// ❌ ОШИБКА: неиспользуемая переменная
const unused = 123

// ✅ OK: используем или переименовываем в _unused
const _unused = 123

// ❌ ОШИБКА: не все пути возвращают значение
function getValue(x: number) {
  if (x > 0) {
    return x
  }
  // отсутствует return для x <= 0
}

// ✅ OK: явный return везде
function getValue(x: number): number {
  if (x > 0) {
    return x
  }
  return 0
}
```

---

## 🔧 Строгие правила ESLint

### Ошибки (errors):
- ❌ `@typescript-eslint/no-unused-vars` - неиспользуемые переменные
- ❌ `@typescript-eslint/no-explicit-any` - использование `any`
- ❌ `@typescript-eslint/no-floating-promises` - не обработанные Promise
- ❌ `@typescript-eslint/no-misused-promises` - Promise в неправильных местах
- ❌ `no-debugger` - debugger в коде
- ❌ `prefer-const` - используй const вместо let
- ❌ `no-var` - не используй var

### Предупреждения (warnings преобразованы в errors):
- ⚠️ `@typescript-eslint/prefer-nullish-coalescing` - используй ??
- ⚠️ `@typescript-eslint/prefer-optional-chain` - используй ?.
- ⚠️ `no-console` - console.log (разрешены warn и error)

### Примеры ошибок:

```typescript
// ❌ ОШИБКА: Promise в onClick
<Pressable onPress={async () => await doSomething()}>

// ✅ OK: обернули в void или убрали async
<Pressable onPress={() => { void doSomething() }}>
// или
<Pressable onPress={() => doSomething()}>

// ❌ ОШИБКА: использование any
function process(data: any) { }

// ✅ OK: конкретный тип
function process(data: string) { }

// ❌ ОШИБКА: let вместо const
let name = 'John'

// ✅ OK: используем const
const name = 'John'

// ❌ ОШИБКА: console.log
console.log('debug')

// ✅ OK: используем console.warn или console.error
console.warn('warning')
console.error('error')
```

---

## 📋 Workflow для AI агента

### При создании/изменении файлов:

1. **Создаю/редактирую файлы**
2. **Запускаю проверку:**
   ```powershell
   cd ui/mobile
   npm run validate
   ```
3. **Если есть ошибки:**
   - Читаю вывод внимательно
   - Исправляю ВСЕ ошибки
   - Повторяю шаг 2
4. **Проверяю редактор VS Code:**
   - Вызываю `get_errors` для ui/mobile
   - Если есть ошибки - исправляю
5. **Повторяю пока не будет:**
   ```
   > everfreenote-mobile@1.0.0 validate
   > npm run type-check && npm run lint

   > everfreenote-mobile@1.0.0 type-check
   > tsc --noEmit

   > everfreenote-mobile@1.0.0 lint
   > eslint . --max-warnings=0
   ```
   И `get_errors` возвращает "No errors found."
6. **Только тогда сообщаю "Готово!"**

---

## 🚫 Типичные ошибки

### TypeScript
- `❌ 'X' is declared but its value is never read` → удали или переименуй в `_X`
- `❌ Not all code paths return a value` → добавь return во все ветки
- `❌ Property 'X' does not exist` → добавь тип
- `❌ Type 'any' is not assignable` → укажи конкретный тип

### ESLint
- `❌ 'X' is defined but never used` → удали или переименуй в `_X`
- `❌ Unexpected any` → замени на конкретный тип
- `❌ Promise-returning function provided to attribute where a void return was expected` → убери async или оберни в void
- `❌ 'console' is not defined` → используй console.warn или console.error
- `❌ Prefer using ?? instead of ||` → замени на nullish coalescing

---

## 📁 Структура проверки

```
ui/mobile/
├── app/                    # ✅ Проверяется
├── components/             # ✅ Проверяется
├── hooks/                  # ✅ Проверяется
├── adapters/               # ✅ Проверяется
├── providers/              # ✅ Проверяется
├── node_modules/           # ❌ Игнорируется
└── .expo/                  # ❌ Игнорируется
```

---

## 💡 Полезные команды

```powershell
# Полная проверка (запускать ВСЕГДА)
npm run validate

# Только TypeScript
npm run type-check

# Только ESLint
npm run lint

# ESLint с автофиксом (исправляет простые ошибки)
npx eslint . --fix

# Очистить кеш TypeScript
npx tsc --build --clean

# Проверка в VS Code (для AI агента)
# Используй get_errors tool с путем к ui/mobile
```

---

## 🎯 Цель

**100% чистый код:**
- ✅ Нет ошибок TypeScript
- ✅ Нет warnings ESLint (max-warnings=0)
- ✅ Все типы указаны явно (no `any`)
- ✅ Нет неиспользуемых переменных
- ✅ Нет Promise в onClick/onPress без обработки
- ✅ Нет console.log (только warn/error)
- ✅ Используем const вместо let где возможно
- ✅ Используем ?? вместо ||
- ✅ Используем ?. для optional chaining

---

**Помни:** Качество важнее скорости! 🚀
