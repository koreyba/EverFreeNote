const IGNORED_EXCEPTION_PATTERNS: RegExp[] = [
  /ResizeObserver loop limit exceeded/i,
  /ResizeObserver loop completed with undelivered notifications/i,
  /Navigator LockManager lock/i,
]

const isIgnoredException = (message: string): boolean =>
  IGNORED_EXCEPTION_PATTERNS.some((pattern) => pattern.test(message))

/**
 * Registers Cypress exception handling for test support entrypoints.
 * We only suppress known noisy browser/runtime errors and let all other errors fail the test run.
 */
export const registerGlobalErrorHandling = (): void => {
  Cypress.on('uncaught:exception', (err) => {
    const message = err?.message ?? ''

    if (isIgnoredException(message)) {
      Cypress.log({
        name: 'uncaught:exception',
        message: `ignored: ${message}`,
      })
      return false
    }

    return undefined
  })
}
