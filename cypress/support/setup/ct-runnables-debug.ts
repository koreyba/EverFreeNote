type MinimalMochaSuite = {
  tests?: unknown[]
  suites?: MinimalMochaSuite[]
}

const countTests = (suite?: MinimalMochaSuite): number => {
  if (!suite) return 0
  const own = Array.isArray(suite.tests) ? suite.tests.length : 0
  const nested = Array.isArray(suite.suites)
    ? suite.suites.reduce((acc, child) => acc + countTests(child), 0)
    : 0
  return own + nested
}

const countSuites = (suite?: MinimalMochaSuite): number => {
  if (!suite || !Array.isArray(suite.suites)) return 0
  return suite.suites.reduce((acc, child) => acc + 1 + countSuites(child), 0)
}

const logRunnerSnapshot = (stage: string, spec: string): void => {
  try {
    // `Cypress.mocha` is internal but stable enough for temporary CI diagnostics.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const runner = (Cypress as any).mocha?.getRunner?.()
    const suite = runner?.suite as MinimalMochaSuite | undefined
    const tests = countTests(suite)
    const suites = countSuites(suite)

    // eslint-disable-next-line no-console
    console.error(
      `[ct-debug] runnables-probe spec=${spec} stage=${stage} hasRunner=${Boolean(runner)} tests=${tests} suites=${suites}`,
    )
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`[ct-debug] runnables-probe-error spec=${spec} stage=${stage}`, error)
  }
}

export const registerCtRunnablesDebug = (): void => {
  const spec = Cypress.spec?.relative ?? 'unknown-spec'

  // eslint-disable-next-line no-console
  console.error(`[ct-debug] support-loaded spec=${spec}`)

  // eslint-disable-next-line no-console
  console.error(
    `[ct-debug] runtime-config spec=${spec} isInteractive=${String(Cypress.config('isInteractive'))} isTextTerminal=${String(Cypress.config('isTextTerminal'))}`,
  )

  let firstTestLogged = false

  Cypress.on('test:before:run', (test) => {
    if (firstTestLogged) return
    firstTestLogged = true

    const titlePath = typeof test?.titlePath === 'function' ? test.titlePath() : [test?.title]
    // eslint-disable-next-line no-console
    console.error(`[ct-debug] first-test spec=${spec} title="${titlePath.join(' > ')}"`)
  })

  window.addEventListener('error', (event) => {
    // eslint-disable-next-line no-console
    console.error(
      `[ct-debug] window-error spec=${spec} message="${event.message}" filename="${event.filename}" lineno=${event.lineno}`,
    )
  })

  window.addEventListener('unhandledrejection', (event) => {
    // eslint-disable-next-line no-console
    console.error(`[ct-debug] unhandled-rejection spec=${spec}`, event.reason)
  })

  logRunnerSnapshot('immediate', spec)
  setTimeout(() => logRunnerSnapshot('t+0ms', spec), 0)
  setTimeout(() => logRunnerSnapshot('t+200ms', spec), 200)
}
