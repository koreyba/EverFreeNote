/**
 * a11y-scan-authenticated.mjs
 *
 * Сканирование WCAG AA для авторизованных страниц EverFreeNote.
 * Использует Puppeteer + axe-core (тот же движок что и axe DevTools).
 *
 * Запуск: node scripts/a11y-scan-authenticated.mjs
 */

import puppeteer from "puppeteer-core"
import { writeFileSync } from "fs"
import { readFile } from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const CHROME_PATH = "C:\\Users\\DenysKoreiba\\.browser-driver-manager\\chrome\\win64-150.0.7871.115\\chrome-win64\\chrome.exe"
const BASE_URL = "http://localhost:3000"
const REPORT_PATH = path.join(__dirname, "..", "a11y-report-authenticated.json")
const AXE_SOURCE = path.join(__dirname, "..", "node_modules", "axe-core", "axe.min.js")

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function runAxe(page) {
  const axeSource = await readFile(AXE_SOURCE, "utf-8")
  await page.evaluate(axeSource)
  return page.evaluate(() => {
    return new Promise((resolve) => {
      window.axe.run(document, {
        runOnly: { type: "tag", values: ["wcag2aa"] },
        reporter: "v1",
      }, (err, results) => {
        if (err) resolve({ error: err.message, violations: [], passes: [] })
        else resolve(results)
      })
    })
  })
}

function printViolations(label, results) {
  const { violations = [], passes = [] } = results
  console.log("\n" + "=".repeat(60))
  console.log("Страница: " + label)
  console.log("=".repeat(60))
  console.log("Passes:     " + passes.length)
  console.log("Violations: " + violations.length)

  if (violations.length === 0) {
    console.log("\n  Нарушений нет!")
    return
  }

  for (const v of violations) {
    console.log("\n  [" + (v.impact || "").toUpperCase() + "] " + v.id)
    console.log("  " + v.description)
    console.log("  Справка: " + v.helpUrl)
    for (const node of v.nodes) {
      console.log("    Элемент: " + node.html.slice(0, 120))
      const reason = node.failureSummary?.split("\n")[1]?.trim() ?? node.failureSummary
      console.log("    Причина: " + reason)
      const d = node.any?.[0]?.data
      if (d?.contrastRatio) {
        console.log("    Контраст: " + d.contrastRatio + " (нужно " + d.expectedContrastRatio + "), fg:" + d.fgColor + " bg:" + d.bgColor)
      }
    }
  }
}

async function main() {
  console.log("Запускаю браузер...")
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--window-size=1280,900"],
  })

  const allResults = []

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1280, height: 900 })

    console.log("Перехожу на " + BASE_URL + "...")
    await page.goto(BASE_URL, { waitUntil: "networkidle0", timeout: 30000 })
    await sleep(2000)

    const testLoginBtn = await page.$("[data-cy=\"test-login-button\"]")
    if (!testLoginBtn) {
      throw new Error("Кнопка Test Login не найдена! Проверь NEXT_PUBLIC_ENABLE_TEST_AUTH=true в .env.local")
    }

    console.log("Нажимаю Test Login...")
    await testLoginBtn.click()

    console.log("Жду загрузки notes-shell...")
    await page.waitForSelector("[data-testid=\"notes-shell\"]", { timeout: 20000 })
    await sleep(3000)

    // --- Скан 1: список заметок ---
    console.log("Сканирую: Notes Shell (список заметок)...")
    const listResults = await runAxe(page)
    listResults._label = "Notes Shell — список заметок"
    allResults.push(listResults)
    printViolations(listResults._label, listResults)

    // --- Скан 2: открытая заметка ---
    const firstNote = await page.$("[data-testid=\"note-card\"]")
    if (firstNote) {
      console.log("Открываю первую заметку...")
      await firstNote.click()
      await sleep(4000)

      console.log("Сканирую: Открытая заметка (NoteView / NoteEditor)...")
      const noteResults = await runAxe(page)
      noteResults._label = "Notes Shell — открытая заметка"
      allResults.push(noteResults)
      printViolations(noteResults._label, noteResults)
    } else {
      console.log("Заметок нет — пропускаю. Создай хотя бы одну заметку и запусти снова.")
    }

  } finally {
    await browser.close()
  }

  writeFileSync(REPORT_PATH, JSON.stringify(allResults, null, 2), "utf-8")
  console.log("\nОтчёт сохранён: " + REPORT_PATH)

  const total = allResults.reduce((s, r) => s + (r.violations?.length ?? 0), 0)
  console.log("\n" + "=".repeat(60))
  console.log("ИТОГ: " + (total === 0 ? "0 нарушений WCAG AA" : total + " нарушений WCAG AA"))
  console.log("=".repeat(60))

  if (total > 0) process.exit(1)
}

main().catch(err => {
  console.error("Ошибка скрипта:", err.message)
  process.exit(1)
})
