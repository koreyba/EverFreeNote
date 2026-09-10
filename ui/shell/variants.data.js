/**
 * The one variant table.
 *
 * CommonJS on purpose: it has three consumers with different loaders — the build
 * scripts (plain Node, running before any TypeScript exists), variants.ts (bundled into
 * the web app by Next.js), and capacitor.config.ts (transpiled by the Capacitor CLI,
 * whose loader does not resolve JSON imports). A .js module is the only form all three
 * read without ceremony.
 *
 * Adding a variant here is enough for the scripts; TypeScript then points at whatever
 * else needs updating in variants.ts.
 */
module.exports = {
  dev: {
    appName: 'EverFreeNote Shell Dev',
    appId: 'com.everfreenote.shell.dev',
    scheme: 'everfreenote-dev',
  },
  stage: {
    appName: 'EverFreeNote Shell Stage',
    appId: 'com.everfreenote.shell.stage',
    scheme: 'everfreenote-stage',
  },
  prod: {
    appName: 'EverFreeNote Shell',
    appId: 'com.everfreenote.shell',
    scheme: 'everfreenote',
  },
}
