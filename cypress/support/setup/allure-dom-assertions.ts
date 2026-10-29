/** Preserve assertion failures when Allure encounters React's cyclic DOM internals. */
export function normalizeDomAssertionValues(error: Error & { actual?: unknown; expected?: unknown }): void {
  for (const key of ['actual', 'expected'] as const) {
    const value = error[key]
    if (Cypress.dom.isJquery(value) || Cypress.dom.isElement(value)) {
      // Keep the assertion message and a bounded description of the subject;
      // passing the live element to Allure can traverse the entire Fiber graph.
      error[key] = Cypress.dom.stringify(value as JQuery | HTMLElement, 'long').slice(0, 4096)
    }
  }
}

// This listener must run before Allure's `fail` listener. It does not suppress or
// replace the exception; Allure and Cypress still report the original failure.
Cypress.on('fail', (error) => { normalizeDomAssertionValues(error) })
