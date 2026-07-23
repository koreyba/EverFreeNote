# Allure Report – Pull request #165

- Format: Allure Agent Markdown
- Generated: 2026-07-23T13:42:24.365Z
- Report UUID: a13214c3-2c3a-48ab-805e-c1788842699f
- Phase: done
- Exit Code: 1
- Command: npm run test:unit:core --verbose --ci --json --outputFile=core-unit-results.json

## Run Summary

- total: 534
- failed: 2
- broken: 0
- unknown: 0
- skipped: 0
- passed: 532
- retries: 0
- flaky: 0
- total duration: 3s 713ms
- average duration: 7ms
- max duration: 2s 255ms

## Environment Summary

- default: 534 total (2 failed, 0 broken, 0 unknown, 0 skipped, 532 passed)

## Runtime Modeling Summary

- completeness: partial
- visible results from stats: 534
- logical tests rendered: 534
- unmodeled visible results: 0 total (0 failed, 0 broken, 0 unknown, 0 skipped, 0 passed)
- runner failures outside logical tests: 1
- actionable stderr signals: 0
- repeated low-value warnings: 0
- reasons: 1 runner-level failures were detected outside logical test files.

### High-Signal Runner Issues

- [global error/global-error] Test process has failed

### Repeated Low-Value Warnings

None

## Human Report

- Status: disabled
- Mode: off
- Result Count: unknown
- Threshold: 1000
- Reason: disabled by --report off

## Expected Scope

- Goal: Core Unit Tests
- Feature / Task: unknown
- Expectations Source: CLI options (normalized: [manifest/expected.json](manifest/expected.json))
- Expected selectors: None
- Forbidden selectors: None
- Evidence expectations: None

## Expectation Result

- Status: not_requested
- Impact: advisory
- Recognized Controls: 1
- Source: inline
- Expected Tests: 0
- Observed Tests: 534
- Missing Expected: 0
- Forbidden Observed: 0
- Evidence Mismatches: 0
- Run Manifest: [manifest/run.json](manifest/run.json)
- Findings Manifest: [manifest/findings.jsonl](manifest/findings.jsonl)

## Advisory Check Summary

- modeling completeness: partial
- total findings: 1
- high: 1
- warning: 0
- info: 0
- bootstrap: 1
- scope: 0
- metadata: 0
- evidence: 0
- smells: 0

## Needs Attention First

- [HIGH] Runner-level failures were detected outside logical test results.

## Process Logs

- [stdout.txt](artifacts/global/stdout.txt) (text/plain, 137 bytes)
- [stderr.txt](artifacts/global/stderr.txt) (text/plain, 38830 bytes)

## Global Errors

### Error 1

- Message: Test process has failed
- Trace:

~~~text
npm verbose cli /opt/hostedtoolcache/node/24.18.0/x64/bin/node /opt/hostedtoolcache/node/24.18.0/x64/bin/npm
npm info using npm@11.16.0
npm info using node@v24.18.0
npm warn Expanding --ci to --cidr. This will stop working in the next major version of npm.
npm verbose title npm run test:unit:core
npm verbose argv "run" "test:unit:core" "--loglevel" "verbose" "--ci" "--json" "--outputFile" "core-unit-results.json"
npm verbose logfile logs-max:10 dir:/home/runner/.npm/_logs/2026-07-23T13_42_24_465Z-
npm verbose logfile /home/runner/.npm/_logs/2026-07-23T13_42_24_465Z-debug-0.log
npm warn Unknown cli config "--outputFile". This will stop working in the next major version of npm.
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mcore-services-noteClipboard.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mcore-rag-chunking.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mcore-services-offlineQueue.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mcore-services-search.test.ts[22m
  [1m● [22mConsole

    [2m[31mconsole.error[39m[22m
[31m      FTS search RPC failed: { message: 'FTS error' }[39m
[2m[22m
[2m    [0m [90m 50 |[39m[22m
[2m     [90m 51 |[39m     [36mif[39m (error) {[22m
[2m    [31m[1m>[22m[2m[39m[90m 52 |[39m       console[33m.[39merror([32m'FTS search RPC failed:'[39m[33m,[39m error)[22m
[2m     [90m    |[39m               [31m[1m^[22m[2m[39m[22m
[2m     [90m 53 |[39m       [36mreturn[39m [36mnull[39m[22m
[2m     [90m 54 |[39m     }[22m
[2m     [90m 55 |[39m     [36mif[39m ([33m![39mdata) [36mreturn[39m [36mnull[39m[0m[22m
[2m[22m
[2m      [2mat SearchService.error [as executeFtsSearch] ([22m[2mcore/services/search.ts[2m:52:15)[22m[2m[22m
[2m      [2mat SearchService.searchNotes ([22m[2mcore/services/search.ts[2m:122:25)[22m[2m[22m
[2m      [2mat Object.<anonymous> ([22m[2mcore/tests/unit/core-services-search.test.ts[2m:357:22)[22m[2m[22m

[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mcore-services-sanitizer.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1moffline-sync-additional-branches.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mcore-helpers-and-notes.test.ts[22m
  [1m● [22mConsole

    [2m[31mconsole.error[39m[22m
[31m      Failed to fetch existing titles for prefix import: Error: Failed to fetch existing titles: db unavailable[39m
[31m          at fetchExistingTitles (/home/runner/work/EverFreeNote/EverFreeNote/core/enex/import-shared.ts:45:11)[39m
[31m          at processTicksAndRejections (node:internal/process/task_queues:104:5)[39m
[31m          at resolveExistingTitlesForImport (/home/runner/work/EverFreeNote/EverFreeNote/core/enex/import-shared.ts:66:12)[39m
[31m          at Object.<anonymous> (/home/runner/work/EverFreeNote/EverFreeNote/core/tests/unit/core-helpers-and-notes.test.ts:90:5)[39m
[2m[22m
[2m    [0m [90m 67 |[39m   } [36mcatch[39m (error) {[22m
[2m     [90m 68 |[39m     [36mif[39m (duplicateStrategy [33m===[39m [32m'prefix'[39m) {[22m
[2m    [31m[1m>[22m[2m[39m[90m 69 |[39m       console[33m.[39merror([32m'Failed to fetch existing titles for prefix import:'[39m[33m,[39m error)[22m
[2m     [90m    |[39m               [31m[1m^[22m[2m[39m[22m
[2m     [90m 70 |[39m       [36mreturn[39m [36mnull[39m[22m
[2m     [90m 71 |[39m     }[22m
[2m     [90m 72 |[39m[0m[22m
[2m[22m
[2m      [2mat error ([22m[2mcore/enex/import-shared.ts[2m:69:15)[22m[2m[22m
[2m      [2mat Object.<anonymous> ([22m[2mcore/tests/unit/core-helpers-and-notes.test.ts[2m:90:5)[22m[2m[22m

[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1moffline-queue-additional-branches.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mcore-utils-search.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mcore-services-offlineCache.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mdebounced-overlay-additional-branches.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1menex-converter-export.test.ts[22m
  [1m● [22mConsole

    [2m[31mconsole.error[39m[22m
[31m      Failed to upload image: Error: upload failed[39m
[31m          at Object.<anonymous> (/home/runner/work/EverFreeNote/EverFreeNote/core/tests/unit/enex-converter-export.test.ts:22:30)[39m
[31m          at Promise.finally.completed (/home/runner/work/EverFreeNote/EverFreeNote/node_modules/jest-circus/build/jestAdapterInit.js:1557:28)[39m
[31m          at new Promise (<anonymous>)[39m
[31m          at callAsyncCircusFn (/home/runner/work/EverFreeNote/EverFreeNote/node_modules/jest-circus/build/jestAdapterInit.js:1497:10)[39m
[31m          at _callCircusTest (/home/runner/work/EverFreeNote/EverFreeNote/node_modules/jest-circus/build/jestAdapterInit.js:1007:40)[39m
[31m          at processTicksAndRejections (node:internal/process/task_queues:104:5)[39m
[31m          at _runTest (/home/runner/work/EverFreeNote/EverFreeNote/node_modules/jest-circus/build/jestAdapterInit.js:947:3)[39m
[31m          at /home/runner/work/EverFreeNote/EverFreeNote/node_modules/jest-circus/build/jestAdapterInit.js:849:7[39m
[31m          at _runTestsForDescribeBlock (/home/runner/work/EverFreeNote/EverFreeNote/node_modules/jest-circus/build/jestAdapterInit.js:862:11)[39m
[31m          at _runTestsForDescribeBlock (/home/runner/work/EverFreeNote/EverFreeNote/node_modules/jest-circus/build/jestAdapterInit.js:857:11)[39m
[31m          at run (/home/runner/work/EverFreeNote/EverFreeNote/node_modules/jest-circus/build/jestAdapterInit.js:761:3)[39m
[31m          at runAndTransformResultsToJestFormat (/home/runner/work/EverFreeNote/EverFreeNote/node_modules/jest-circus/build/jestAdapterInit.js:1918:21)[39m
[31m          at jestAdapter (/home/runner/work/EverFreeNote/EverFreeNote/node_modules/jest-circus/build/runner.js:101:19)[39m
[31m          at runTestInternal (/home/runner/work/EverFreeNote/EverFreeNote/node_modules/jest-runner/build/testWorker.js:275:16)[39m
[31m          at runTest (/home/runner/work/EverFreeNote/EverFreeNote/node_modules/jest-runner/build/testWorker.js:343:7)[39m
[31m          at Object.worker (/home/runner/work/EverFreeNote/EverFreeNote/node_modules/jest-runner/build/testWorker.js:497:12)[39m
[2m[22m
[2m    [0m [90m 110 |[39m             [36mreturn[39m url[22m
[2m     [90m 111 |[39m           } [36mcatch[39m (error) {[22m
[2m    [31m[1m>[22m[2m[39m[90m 112 |[39m             console[33m.[39merror([32m'Failed to upload image:'[39m[33m,[39m error)[22m
[2m     [90m     |[39m                     [31m[1m^[22m[2m[39m[22m
[2m     [90m 113 |[39m             [36mreturn[39m [36mnull[39m[22m
[2m     [90m 114 |[39m           }[22m
[2m     [90m 115 |[39m         })[0m[22m
[2m[22m
[2m      [2mat error ([22m[2mcore/enex/converter.ts[2m:112:21)[22m[2m[22m
[2m          at async Promise.all (index 1)[22m
[2m      [2mat ContentConverter.processImages ([22m[2mcore/enex/converter.ts[2m:100:28)[22m[2m[22m
[2m      [2mat ContentConverter.convert ([22m[2mcore/enex/converter.ts[2m:23:17)[22m[2m[22m
[2m      [2mat Object.<anonymous> ([22m[2mcore/tests/unit/enex-converter-export.test.ts[2m:29:20)[22m[2m[22m

    [2m[33mconsole.warn[39m[22m
[33m      [import] missing resource for en-media { hash: 'unknown', noteTitle: 'Title' }[39m
[2m[22m
[2m    [0m [90m 133 |[39m         replacement [33m=[39m [32m`<img src="data:${resource.mime};base64,${resource.data}" alt="Image ${idx + 1}" data-original-hash="${hash}" data-original-order="${idx}" />`[39m[22m
[2m     [90m 134 |[39m       } [36melse[39m {[22m
[2m    [31m[1m>[22m[2m[39m[90m 135 |[39m         console[33m.[39mwarn([32m'[import] missing resource for en-media'[39m[33m,[39m { hash[33m,[39m noteTitle })[22m
[2m     [90m     |[39m                 [31m[1m^[22m[2m[39m[22m
[2m     [90m 136 |[39m         replacement [33m=[39m [32m`[Image missing: ${hash}]`[39m[22m
[2m     [90m 137 |[39m       }[22m
[2m     [90m 138 |[39m[0m[22m
[2m[22m
[2m      [2mat warn ([22m[2mcore/enex/converter.ts[2m:135:17)[22m[2m[22m
[2m          at Array.forEach (<anonymous>)[22m
[2m      [2mat ContentConverter.forEach [as processImages] ([22m[2mcore/enex/converter.ts[2m:124:18)[22m[2m[22m
[2m      [2mat ContentConverter.convert ([22m[2mcore/enex/converter.ts[2m:23:17)[22m[2m[22m
[2m      [2mat Object.<anonymous> ([22m[2mcore/tests/unit/enex-converter-export.test.ts[2m:29:20)[22m[2m[22m

[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mexport-service-additional-branches.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mrag-chunking-dom.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mnote-creator-additional-branches.test.ts[22m
  [1m● [22mConsole

    [2mconsole.log[22m
      Skipping duplicate note:  Untitled
[2m[22m
[2m      [2mat NoteCreator.log [as create] ([22m[2mcore/enex/note-creator.ts[2m:75:17)[22m[2m[22m

[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mrag-chunking-additional-branches.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mwordpress-export-additional-branches.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1msettings-search-additional-branches.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mcore-services-smartPaste.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mnoteAutosaveSession.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mrag-settings-services-branches.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mcore-utils-debouncedLatest.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mcore-services-notes-delete.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mcore-services-publicNoteShare.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mnotes-additional-branches.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mcore-utility-edge-cases.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mcore-services-basic.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mwordpress-services.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1menex-image-services.test.ts[22m
  [1m● [22mConsole

    [2mconsole.debug[22m
      [image-downloader] direct fetch ok { host: 'cdn.test', mime: 'image/png', size: 3 }
[2m[22m
[2m      [2mat ImageDownloader.fetchBuffer ([22m[2mcore/enex/image-downloader.ts[2m:47:20)[22m[2m[22m

    [2mconsole.debug[22m
      [image-downloader] direct fetch failed, try proxy { host: 'cdn.test', url: 'https://cdn.test/a.jpg', reason: 'CORS' }
[2m[22m
[2m      [2mat ImageDownloader.fetchBuffer ([22m[2mcore/enex/image-downloader.ts[2m:56:20)[22m[2m[22m

    [2mconsole.debug[22m
      [image-downloader] proxy fetch ok { host: 'cdn.test', mime: 'image/jpeg', size: 1 }
[2m[22m
[2m      [2mat ImageDownloader.fetchBuffer ([22m[2mcore/enex/image-downloader.ts[2m:66:20)[22m[2m[22m

    [2mconsole.debug[22m
      [image-downloader] skipped image { url: 'https://cdn.test/b.png', reason: 'blocked' }
[2m[22m
[2m      [2mat ImageDownloader.downloadImage ([22m[2mcore/enex/image-downloader.ts[2m:21:20)[22m[2m[22m

    [2mconsole.debug[22m
      [image-downloader] direct fetch failed, try proxy {
        host: 'cdn.test',
        url: 'https://cdn.test/missing.png',
        reason: 'HTTP 404'
      }
[2m[22m
[2m      [2mat ImageDownloader.fetchBuffer ([22m[2mcore/enex/image-downloader.ts[2m:56:20)[22m[2m[22m

    [2mconsole.debug[22m
      [image-downloader] skipped image { url: 'https://cdn.test/missing.png', reason: 'Proxy HTTP 502' }
[2m[22m
[2m      [2mat ImageDownloader.downloadImage ([22m[2mcore/enex/image-downloader.ts[2m:21:20)[22m[2m[22m

    [2mconsole.debug[22m
      [image-downloader] direct fetch failed, try proxy {
        host: 'cdn.test',
        url: 'https://cdn.test/fail.png',
        reason: 'HTTP 500'
      }
[2m[22m
[2m      [2mat ImageDownloader.fetchBuffer ([22m[2mcore/enex/image-downloader.ts[2m:56:20)[22m[2m[22m

    [2mconsole.debug[22m
      [image-downloader] skipped image {
        url: 'https://cdn.test/fail.png',
        reason: "Cannot read properties of undefined (reading 'ok')"
      }
[2m[22m
[2m      [2mat ImageDownloader.downloadImage ([22m[2mcore/enex/image-downloader.ts[2m:21:20)[22m[2m[22m

    [2mconsole.debug[22m
      [image-downloader] direct fetch ok { host: 'invalid-host', mime: 'application/octet-stream', size: 2 }
[2m[22m
[2m      [2mat ImageDownloader.fetchBuffer ([22m[2mcore/enex/image-downloader.ts[2m:47:20)[22m[2m[22m

    [2m[31mconsole.error[39m[22m
[31m      Image upload failed: { message: 'storage denied' }[39m
[2m[22m
[2m    [0m [90m 46 |[39m       [36mreturn[39m publicUrlData[33m.[39mpublicUrl[22m
[2m     [90m 47 |[39m     } [36mcatch[39m (error[33m:[39m unknown) {[22m
[2m    [31m[1m>[22m[2m[39m[90m 48 |[39m       console[33m.[39merror([32m'Image upload failed:'[39m[33m,[39m error)[22m
[2m     [90m    |[39m               [31m[1m^[22m[2m[39m[22m
[2m     [90m 49 |[39m       [36mlet[39m message [33m=[39m [32m'Unknown error'[39m[22m
[2m     [90m 50 |[39m       [36mif[39m (error [36minstanceof[39m [33mError[39m) {[22m
[2m     [90m 51 |[39m         message [33m=[39m error[33m.[39mmessage[0m[22m
[2m[22m
[2m      [2mat ImageProcessor.error [as upload] ([22m[2mcore/enex/image-processor.ts[2m:48:15)[22m[2m[22m
[2m      [2mat Object.<anonymous> ([22m[2mcore/tests/unit/enex-image-services.test.ts[2m:98:5)[22m[2m[22m

    [2m[31mconsole.error[39m[22m
[31m      Image upload failed: Error: Failed to get public URL[39m
[31m          at ImageProcessor.upload (/home/runner/work/EverFreeNote/EverFreeNote/core/enex/image-processor.ts:43:15)[39m
[31m          at processTicksAndRejections (node:internal/process/task_queues:104:5)[39m
[31m          at Object.<anonymous> (/home/runner/work/EverFreeNote/EverFreeNote/core/tests/unit/enex-image-services.test.ts:100:5)[39m
[2m[22m
[2m    [0m [90m 46 |[39m       [36mreturn[39m publicUrlData[33m.[39mpublicUrl[22m
[2m     [90m 47 |[39m     } [36mcatch[39m (error[33m:[39m unknown) {[22m
[2m    [31m[1m>[22m[2m[39m[90m 48 |[39m       console[33m.[39merror([32m'Image upload failed:'[39m[33m,[39m error)[22m
[2m     [90m    |[39m               [31m[1m^[22m[2m[39m[22m
[2m     [90m 49 |[39m       [36mlet[39m message [33m=[39m [32m'Unknown error'[39m[22m
[2m     [90m 50 |[39m       [36mif[39m (error [36minstanceof[39m [33mError[39m) {[22m
[2m     [90m 51 |[39m         message [33m=[39m error[33m.[39mmessage[0m[22m
[2m[22m
[2m      [2mat ImageProcessor.error [as upload] ([22m[2mcore/enex/image-processor.ts[2m:48:15)[22m[2m[22m
[2m      [2mat Object.<anonymous> ([22m[2mcore/tests/unit/enex-image-services.test.ts[2m:100:5)[22m[2m[22m

[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1menex-image-additional-branches.test.ts[22m
  [1m● [22mConsole

    [2mconsole.debug[22m
      [image-downloader] direct fetch ok { host: 'cdn.test', mime: 'image/avif', size: 3 }
[2m[22m
[2m      [2mat ImageDownloader.fetchBuffer ([22m[2mcore/enex/image-downloader.ts[2m:47:20)[22m[2m[22m

    [2mconsole.debug[22m
      [image-downloader] direct fetch failed, try proxy {
        host: 'cdn.test',
        url: 'https://cdn.test/assets/photo.gif',
        reason: 'CORS'
      }
[2m[22m
[2m      [2mat ImageDownloader.fetchBuffer ([22m[2mcore/enex/image-downloader.ts[2m:56:20)[22m[2m[22m

    [2mconsole.debug[22m
      [image-downloader] proxy fetch ok { host: 'cdn.test', mime: 'image/gif', size: 1 }
[2m[22m
[2m      [2mat ImageDownloader.fetchBuffer ([22m[2mcore/enex/image-downloader.ts[2m:66:20)[22m[2m[22m

    [2mconsole.debug[22m
      [image-downloader] skipped image { url: 'https://cdn.test/image.png', reason: 'network unavailable' }
[2m[22m
[2m      [2mat ImageDownloader.downloadImage ([22m[2mcore/enex/image-downloader.ts[2m:21:20)[22m[2m[22m

    [2mconsole.debug[22m
      [image-downloader] direct fetch failed, try proxy { host: 'invalid-host', url: 'not a URL', reason: 'invalid URL' }
[2m[22m
[2m      [2mat ImageDownloader.fetchBuffer ([22m[2mcore/enex/image-downloader.ts[2m:56:20)[22m[2m[22m

    [2mconsole.debug[22m
      [image-downloader] proxy fetch ok { host: 'invalid-host', mime: 'application/octet-stream', size: 1 }
[2m[22m
[2m      [2mat ImageDownloader.fetchBuffer ([22m[2mcore/enex/image-downloader.ts[2m:66:20)[22m[2m[22m

    [2m[31mconsole.error[39m[22m
[31m      Image upload failed: DOMException {}[39m
[2m[22m
[2m    [0m [90m 46 |[39m       [36mreturn[39m publicUrlData[33m.[39mpublicUrl[22m
[2m     [90m 47 |[39m     } [36mcatch[39m (error[33m:[39m unknown) {[22m
[2m    [31m[1m>[22m[2m[39m[90m 48 |[39m       console[33m.[39merror([32m'Image upload failed:'[39m[33m,[39m error)[22m
[2m     [90m    |[39m               [31m[1m^[22m[2m[39m[22m
[2m     [90m 49 |[39m       [36mlet[39m message [33m=[39m [32m'Unknown error'[39m[22m
[2m     [90m 50 |[39m       [36mif[39m (error [36minstanceof[39m [33mError[39m) {[22m
[2m     [90m 51 |[39m         message [33m=[39m error[33m.[39mmessage[0m[22m
[2m[22m
[2m      [2mat ImageProcessor.error [as upload] ([22m[2mcore/enex/image-processor.ts[2m:48:15)[22m[2m[22m
[2m      [2mat Object.upload ([22m[2mcore/tests/unit/enex-image-additional-branches.test.ts[2m:112:28)[22m[2m[22m

    [2m[31mconsole.error[39m[22m
[31m      Image upload failed: Error: Image too large: 10.0MB (max 10MB)[39m
[31m          at ImageProcessor.upload (/home/runner/work/EverFreeNote/EverFreeNote/core/enex/image-processor.ts:21:15)[39m
[31m          at Object.upload (/home/runner/work/EverFreeNote/EverFreeNote/core/tests/unit/enex-image-additional-branches.test.ts:122:28)[39m
[31m          at Promise.finally.completed (/home/runner/work/EverFreeNote/EverFreeNote/node_modules/jest-circus/build/jestAdapterInit.js:1557:28)[39m
[31m          at new Promise (<anonymous>)[39m
[31m          at callAsyncCircusFn (/home/runner/work/EverFreeNote/EverFreeNote/node_modules/jest-circus/build/jestAdapterInit.js:1497:10)[39m
[31m          at _callCircusTest (/home/runner/work/EverFreeNote/EverFreeNote/node_modules/jest-circus/build/jestAdapterInit.js:1007:40)[39m
[31m          at processTicksAndRejections (node:internal/process/task_queues:104:5)[39m
[31m          at _runTest (/home/runner/work/EverFreeNote/EverFreeNote/node_modules/jest-circus/build/jestAdapterInit.js:947:3)[39m
[31m          at /home/runner/work/EverFreeNote/EverFreeNote/node_modules/jest-circus/build/jestAdapterInit.js:849:7[39m
[31m          at _runTestsForDescribeBlock (/home/runner/work/EverFreeNote/EverFreeNote/node_modules/jest-circus/build/jestAdapterInit.js:862:11)[39m
[31m          at _runTestsForDescribeBlock (/home/runner/work/EverFreeNote/EverFreeNote/node_modules/jest-circus/build/jestAdapterInit.js:857:11)[39m
[31m          at run (/home/runner/work/EverFreeNote/EverFreeNote/node_modules/jest-circus/build/jestAdapterInit.js:761:3)[39m
[31m          at runAndTransformResultsToJestFormat (/home/runner/work/EverFreeNote/EverFreeNote/node_modules/jest-circus/build/jestAdapterInit.js:1918:21)[39m
[31m          at jestAdapter (/home/runner/work/EverFreeNote/EverFreeNote/node_modules/jest-circus/build/runner.js:101:19)[39m
[31m          at runTestInternal (/home/runner/work/EverFreeNote/EverFreeNote/node_modules/jest-runner/build/testWorker.js:275:16)[39m
[31m          at runTest (/home/runner/work/EverFreeNote/EverFreeNote/node_modules/jest-runner/build/testWorker.js:343:7)[39m
[31m          at Object.worker (/home/runner/work/EverFreeNote/EverFreeNote/node_modules/jest-runner/build/testWorker.js:497:12)[39m
[2m[22m
[2m    [0m [90m 46 |[39m       [36mreturn[39m publicUrlData[33m.[39mpublicUrl[22m
[2m     [90m 47 |[39m     } [36mcatch[39m (error[33m:[39m unknown) {[22m
[2m    [31m[1m>[22m[2m[39m[90m 48 |[39m       console[33m.[39merror([32m'Image upload failed:'[39m[33m,[39m error)[22m
[2m     [90m    |[39m               [31m[1m^[22m[2m[39m[22m
[2m     [90m 49 |[39m       [36mlet[39m message [33m=[39m [32m'Unknown error'[39m[22m
[2m     [90m 50 |[39m       [36mif[39m (error [36minstanceof[39m [33mError[39m) {[22m
[2m     [90m 51 |[39m         message [33m=[39m error[33m.[39mmessage[0m[22m
[2m[22m
[2m      [2mat ImageProcessor.error [as upload] ([22m[2mcore/enex/image-processor.ts[2m:48:15)[22m[2m[22m
[2m      [2mat Object.upload ([22m[2mcore/tests/unit/enex-image-additional-branches.test.ts[2m:122:28)[22m[2m[22m

[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1meditorWebViewBridge.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mcore-enex-noteCreator.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mwordpress-settings-additional-branches.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mrag-debug-log-additional-branches.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1msearch-service-additional-branches.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mapi-keys-settings-additional-branches.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mrag-index-settings-additional-branches.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mrag-search-settings-model-additional-branches.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mbulk-index-additional.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mcore-utils-prosemirrorCaret.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mrag-search-settings-additional-branches.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mcompact-queue-additional-branches.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1menex-parser-additional-branches.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mrag-indexing-settings-additional.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mimage-processor-additional-branches.test.ts[22m
  [1m● [22mConsole

    [2m[31mconsole.error[39m[22m
[31m      Image upload failed: { message: 'storage rejected' }[39m
[2m[22m
[2m    [0m [90m 46 |[39m       [36mreturn[39m publicUrlData[33m.[39mpublicUrl[22m
[2m     [90m 47 |[39m     } [36mcatch[39m (error[33m:[39m unknown) {[22m
[2m    [31m[1m>[22m[2m[39m[90m 48 |[39m       console[33m.[39merror([32m'Image upload failed:'[39m[33m,[39m error)[22m
[2m     [90m    |[39m               [31m[1m^[22m[2m[39m[22m
[2m     [90m 49 |[39m       [36mlet[39m message [33m=[39m [32m'Unknown error'[39m[22m
[2m     [90m 50 |[39m       [36mif[39m (error [36minstanceof[39m [33mError[39m) {[22m
[2m     [90m 51 |[39m         message [33m=[39m error[33m.[39mmessage[0m[22m
[2m[22m
[2m      [2mat ImageProcessor.error [as upload] ([22m[2mcore/enex/image-processor.ts[2m:48:15)[22m[2m[22m
[2m      [2mat Object.<anonymous> ([22m[2mcore/tests/unit/image-processor-additional-branches.test.ts[2m:88:5)[22m[2m[22m

    [2m[31mconsole.error[39m[22m
[31m      Image upload failed: Error: Failed to get public URL[39m
[31m          at ImageProcessor.upload (/home/runner/work/EverFreeNote/EverFreeNote/core/enex/image-processor.ts:43:15)[39m
[31m          at processTicksAndRejections (node:internal/process/task_queues:104:5)[39m
[31m          at Object.<anonymous> (/home/runner/work/EverFreeNote/EverFreeNote/core/tests/unit/image-processor-additional-branches.test.ts:92:5)[39m
[2m[22m
[2m    [0m [90m 46 |[39m       [36mreturn[39m publicUrlData[33m.[39mpublicUrl[22m
[2m     [90m 47 |[39m     } [36mcatch[39m (error[33m:[39m unknown) {[22m
[2m    [31m[1m>[22m[2m[39m[90m 48 |[39m       console[33m.[39merror([32m'Image upload failed:'[39m[33m,[39m error)[22m
[2m     [90m    |[39m               [31m[1m^[22m[2m[39m[22m
[2m     [90m 49 |[39m       [36mlet[39m message [33m=[39m [32m'Unknown error'[39m[22m
[2m     [90m 50 |[39m       [36mif[39m (error [36minstanceof[39m [33mError[39m) {[22m
[2m     [90m 51 |[39m         message [33m=[39m error[33m.[39mmessage[0m[22m
[2m[22m
[2m      [2mat ImageProcessor.error [as upload] ([22m[2mcore/enex/image-processor.ts[2m:48:15)[22m[2m[22m
[2m      [2mat Object.<anonymous> ([22m[2mcore/tests/unit/image-processor-additional-branches.test.ts[2m:92:5)[22m[2m[22m

[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1msmart-paste-additional-branches.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1msmart-paste-clipboard-branches.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1msettings-error-additional-branches.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mrag-index-result-additional-branches.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mnote-creator-branches.test.ts[22m
  [1m● [22mConsole

    [2mconsole.log[22m
      Skipping duplicate note: New
[2m[22m
[2m      [2mat NoteCreator.log [as create] ([22m[2mcore/enex/note-creator.ts[2m:75:17)[22m[2m[22m

    [2mconsole.log[22m
      Skipping duplicate note: Title
[2m[22m
[2m      [2mat NoteCreator.log [as create] ([22m[2mcore/enex/note-creator.ts[2m:75:17)[22m[2m[22m

[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mcore-rag-indexResult.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1moffline-sync-manager.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mnote-copy-additional-branches.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mconverter-additional-branches.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mcore-rag-searchSettings.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1menex-builder-additional-branches.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mnote-clipboard-additional-branches.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1menex-builder-parser.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mcore-services-noteCopy.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mnote-snapshot-additional-branches.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mcore-services-notes-getNoteStatus.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mcore-rag-indexingSettings.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mwordpress-utils-additional-branches.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mcore-services-settingsErrorMessage.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mcore-utils-wordpress.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mcore-utils-normalize-html.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1membedding-models-additional.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mcompact-queue-branches.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mcore-services-ragSettings.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mcore-services-apiKeysSettings.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1msearch.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mnote-copy-dom.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mcore-utils-noteBody.test.ts[22m
[0m[7m[1m[32m PASS [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mcore-utils-postgrest.test.ts[22m
[0m[7m[1m[31m FAIL [39m[22m[27m[0m [0m[7m[37m unit-core [39m[27m[0m [2mcore/tests/unit/[22m[1mdemo-failing-allure.test.ts[22m
[1m[31m  [1m● [22m[1mDemo Intentional Failing Tests for Allure Action Verification › should fail with math assertion mismatch to verify Allure report output[39m[22m

    [2mexpect([22m[31mreceived[39m[2m).[22mtoBe[2m([22m[32mexpected[39m[2m) // Object.is equality[22m

    Expected: [32m100[39m
    Received: [31m42[39m
[2m[22m
[2m    [0m [90m  5 |[39m     [36mconst[39m expectedValue [33m=[39m [35m100[39m[33m;[39m[22m
[2m     [90m  6 |[39m     [36mconst[39m actualValue [33m=[39m [35m42[39m[33m;[39m[22m
[2m    [31m[1m>[22m[2m[39m[90m  7 |[39m     expect(actualValue)[33m.[39mtoBe(expectedValue)[33m;[39m[22m
[2m     [90m    |[39m                         [31m[1m^[22m[2m[39m[22m
[2m     [90m  8 |[39m   })[33m;[39m[22m
[2m     [90m  9 |[39m[22m
[2m     [90m 10 |[39m   it([32m"should fail with object mismatch to verify Allure report diff rendering"[39m[33m,[39m () [33m=>[39m {[0m[22m
[2m[22m
[2m      [2mat Object.toBe ([22m[2m[0m[36mcore/tests/unit/demo-failing-allure.test.ts[39m[0m[2m:7:25)[22m[2m[22m

[1m[31m  [1m● [22m[1mDemo Intentional Failing Tests for Allure Action Verification › should fail with object mismatch to verify Allure report diff rendering[39m[22m

    [2mexpect([22m[31mreceived[39m[2m).[22mtoEqual[2m([22m[32mexpected[39m[2m) // deep equality[22m

    [32m- Expected  - 6[39m
    [31m+ Received  + 3[39m

    [2m  Object {[22m
    [32m-   "count": 10,[39m
    [32m-   "items": Array [[39m
    [32m-     "note-1",[39m
    [32m-     "note-2",[39m
    [32m-   ],[39m
    [32m-   "status": "SUCCESS",[39m
    [31m+   "count": 0,[39m
    [31m+   "items": Array [],[39m
    [31m+   "status": "FAILED",[39m
    [2m  }[22m
[2m[22m
[2m    [0m [90m 11 |[39m     [36mconst[39m expectedObject [33m=[39m { status[33m:[39m [32m"SUCCESS"[39m[33m,[39m count[33m:[39m [35m10[39m[33m,[39m items[33m:[39m [[32m"note-1"[39m[33m,[39m [32m"note-2"[39m] }[33m;[39m[22m
[2m     [90m 12 |[39m     [36mconst[39m actualObject [33m=[39m { status[33m:[39m [32m"FAILED"[39m[33m,[39m count[33m:[39m [35m0[39m[33m,[39m items[33m:[39m [] }[33m;[39m[22m
[2m    [31m[1m>[22m[2m[39m[90m 13 |[39m     expect(actualObject)[33m.[39mtoEqual(expectedObject)[33m;[39m[22m
[2m     [90m    |[39m                          [31m[1m^[22m[2m[39m[22m
[2m     [90m 14 |[39m   })[33m;[39m[22m
[2m     [90m 15 |[39m })[33m;[39m[22m
[2m     [90m 16 |[39m[0m[22m
[2m[22m
[2m      [2mat Object.toEqual ([22m[2m[0m[36mcore/tests/unit/demo-failing-allure.test.ts[39m[0m[2m:13:26)[22m[2m[22m

[1mSummary of all failing tests[22m
[0m[7m[1m[31m FAIL [39m[22m[27m[0m [2mcore/tests/unit/[22m[1mdemo-failing-allure.test.ts[22m
[1m[31m  [1m● [22m[1mDemo Intentional Failing Tests for Allure Action Verification › should fail with math assertion mismatch to verify Allure report output[39m[22m

    [2mexpect([22m[31mreceived[39m[2m).[22mtoBe[2m([22m[32mexpected[39m[2m) // Object.is equality[22m

    Expected: [32m100[39m
    Received: [31m42[39m
[2m[22m
[2m    [0m [90m  5 |[39m     [36mconst[39m expectedValue [33m=[39m [35m100[39m[33m;[39m[22m
[2m     [90m  6 |[39m     [36mconst[39m actualValue [33m=[39m [35m42[39m[33m;[39m[22m
[2m    [31m[1m>[22m[2m[39m[90m  7 |[39m     expect(actualValue)[33m.[39mtoBe(expectedValue)[33m;[39m[22m
[2m     [90m    |[39m                         [31m[1m^[22m[2m[39m[22m
[2m     [90m  8 |[39m   })[33m;[39m[22m
[2m     [90m  9 |[39m[22m
[2m     [90m 10 |[39m   it([32m"should fail with object mismatch to verify Allure report diff rendering"[39m[33m,[39m () [33m=>[39m {[0m[22m
[2m[22m
[2m      [2mat Object.toBe ([22m[2m[0m[36mcore/tests/unit/demo-failing-allure.test.ts[39m[0m[2m:7:25)[22m[2m[22m

[1m[31m  [1m● [22m[1mDemo Intentional Failing Tests for Allure Action Verification › should fail with object mismatch to verify Allure report diff rendering[39m[22m

    [2mexpect([22m[31mreceived[39m[2m).[22mtoEqual[2m([22m[32mexpected[39m[2m) // deep equality[22m

    [32m- Expected  - 6[39m
    [31m+ Received  + 3[39m

    [2m  Object {[22m
    [32m-   "count": 10,[39m
    [32m-   "items": Array [[39m
    [32m-     "note-1",[39m
    [32m-     "note-2",[39m
    [32m-   ],[39m
    [32m-   "status": "SUCCESS",[39m
    [31m+   "count": 0,[39m
    [31m+   "items": Array [],[39m
    [31m+   "status": "FAILED",[39m
    [2m  }[22m
[2m[22m
[2m    [0m [90m 11 |[39m     [36mconst[39m expectedObject [33m=[39m { status[33m:[39m [32m"SUCCESS"[39m[33m,[39m count[33m:[39m [35m10[39m[33m,[39m items[33m:[39m [[32m"note-1"[39m[33m,[39m [32m"note-2"[39m] }[33m;[39m[22m
[2m     [90m 12 |[39m     [36mconst[39m actualObject [33m=[39m { status[33m:[39m [32m"FAILED"[39m[33m,[39m count[33m:[39m [35m0[39m[33m,[39m items[33m:[39m [] }[33m;[39m[22m
[2m    [31m[1m>[22m[2m[39m[90m 13 |[39m     expect(actualObject)[33m.[39mtoEqual(expectedObject)[33m;[39m[22m
[2m     [90m    |[39m                          [31m[1m^[22m[2m[39m[22m
[2m     [90m 14 |[39m   })[33m;[39m[22m
[2m     [90m 15 |[39m })[33m;[39m[22m
[2m     [90m 16 |[39m[0m[22m
[2m[22m
[2m      [2mat Object.toEqual ([22m[2m[0m[36mcore/tests/unit/demo-failing-allure.test.ts[39m[0m[2m:13:26)[22m[2m[22m


[1mTest Suites: [22m[1m[31m1 failed[39m[22m, [1m[32m74 passed[39m[22m, 75 total
[1mTests:       [22m[1m[31m2 failed[39m[22m, [1m[32m606 passed[39m[22m, 608 total
[1mSnapshots:   [22m0 total
[1mTime:[22m        6.103 s
[2mRan all test suites[22m[2m.[22m
npm verbose cwd /home/runner/work/EverFreeNote/EverFreeNote
npm verbose os Linux 6.17.0-1020-azure
npm verbose node v24.18.0
npm verbose npm  v11.16.0
npm verbose exit 1
npm verbose code 1
~~~

## Failed / Broken

- [everfreenote:core/tests/unit/demo-failing-allure.test.ts#Demo Intentional Failing Tests for Allure Action Verification should fail with math assertion mismatch to verify Allure report output](tests/default/43697d603a6c8fc51883c414be5261ec.d41d8cd98f00b204e9800998ecf8427e.md) | status: FAILED | env: default | duration: 5ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/demo-failing-allure.test.ts#Demo Intentional Failing Tests for Allure Action Verification should fail with object mismatch to verify Allure report diff rendering](tests/default/964469b4701a4dfbdfd79d2306b0fd00.d41d8cd98f00b204e9800998ecf8427e.md) | status: FAILED | env: default | duration: 5ms | retries: 0 | scope: unknown | findings: 0

## Unknown / Skipped

None

## Passed

- [everfreenote:core/tests/unit/api-keys-settings-additional-branches.test.ts#ApiKeysSettingsService additional branch behavior handles configured status variants and sends exact status, key, and remove payloads](tests/default/ec588258d40070143022be04874024b8.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/api-keys-settings-additional-branches.test.ts#ApiKeysSettingsService additional branch behavior passes an empty API key through the exact upsert payload](tests/default/8509fee64043646d0b0e56b4d66d6502.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/api-keys-settings-additional-branches.test.ts#ApiKeysSettingsService additional branch behavior preserves ordinary Error messages from status and upsert requests](tests/default/be2da3152dd857b04e84027693c14b74.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/api-keys-settings-additional-branches.test.ts#ApiKeysSettingsService additional branch behavior rejects malformed status and upsert response shapes](tests/default/b3aee63cf589e90c55e87be60bd5c6a9.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 6ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/api-keys-settings-additional-branches.test.ts#ApiKeysSettingsService additional branch behavior uses context messages, unavailable status fallbacks, and operation-specific fallbacks](tests/default/fad8e48303fa6e37c9b5056d6fad26d5.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/bulk-index-additional.test.ts#bulk index additional branches aggregates successful, skipped and failed results with only intended side effects](tests/default/e890f0b2fc5166e5f77fa2bf98c4e955.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 3ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/bulk-index-additional.test.ts#bulk index additional branches formats zero counters as an empty summary](tests/default/5fad0b4f37140f09ac074e9f7e17eac3.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/bulk-index-additional.test.ts#bulk index additional branches turns thrown invocations and truthy backend errors into failed outcomes without mutation](tests/default/5320deeba0f7d7426eb5a003e1af8f65.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/bulk-index-additional.test.ts#bulk index additional branches uses the exact index/reindex payload and applies successful status mutations](tests/default/9a994df1df3fe913578379a62f2d95c9.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 3ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/compact-queue-additional-branches.test.ts#compactQueue additional branch behavior collapses create-update-delete chains to a real no-op](tests/default/27cef1278daf25ca602fd186096d10f7.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/compact-queue-additional-branches.test.ts#compactQueue additional branch behavior compacts create plus multiple updates into one create with the final payload and metadata](tests/default/2c5542a86eabdfbb44772ffcf9e08cbd.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/compact-queue-additional-branches.test.ts#compactQueue additional branch behavior drops an unsupported runtime operation instead of emitting an invalid queue item](tests/default/2081241a4933c65a14fd07a123246a8b.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 4ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/compact-queue-additional-branches.test.ts#compactQueue additional branch behavior keeps the final operation for update/delete chains](tests/default/91df30a0a59c6307b301557c5c75d3ff.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/compact-queue-additional-branches.test.ts#compactQueue additional branch behavior orders the final compacted queue by the surviving operation timestamps](tests/default/f1801f42b8eab1fffcc9cfcf08ca2700.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/compact-queue-branches.test.ts#compactQueue state transitions collapses create/update and update/update to the latest payload](tests/default/56212579119e112c9dd2492589a00719.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/compact-queue-branches.test.ts#compactQueue state transitions removes create/delete pairs and keeps a standalone delete pending](tests/default/93521c64ce834e7e19976eb7b548db53.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 6ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-enex-noteCreator.test.ts#core/enex/note-creator does not fall back to a live lookup when the pre-import snapshot is available and misses the title](tests/default/e1b5cc9da3de868e6881e73e712bdb6f.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-enex-noteCreator.test.ts#core/enex/note-creator fails note creation when duplicate lookup errors instead of treating the note as new](tests/default/e394b1c61ac1adf1f44a356886f7603b.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 4ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-enex-noteCreator.test.ts#core/enex/note-creator keeps prefix behavior stable across repeated titles when a pre-import duplicate exists](tests/default/093abad8ba7f73f0b819c896ab6a7f44.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-enex-noteCreator.test.ts#core/enex/note-creator reuses the first pre-write lookup result when snapshot lookup is unavailable and no pre-import duplicate exists](tests/default/784c5863125f6d4a453a51ab48250a2c.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 7ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-helpers-and-notes.test.ts#core helper modules defines shared AI search configuration values](tests/default/e7d538507353e905e5bcac9f0519c2d9.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-helpers-and-notes.test.ts#core helper modules exports immutable note snapshot and overlay behavior](tests/default/f4ddc6b5f17710067bc9b701d12e817a.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 6ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-helpers-and-notes.test.ts#core helper modules loads import titles, deduplicates them, and handles strategy-specific failures](tests/default/7a7c6e7df2c6f0cf7a05590268325adb.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 8ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-helpers-and-notes.test.ts#core helper modules logs empty and populated RAG debug chunks](tests/default/f6b7e7a8535f7af3b375571276cc4c3b.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 6ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-helpers-and-notes.test.ts#NoteService builds paged filtered searches and returns hasMore metadata](tests/default/c808492043b529c9cd8298f383f42450.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 3ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-helpers-and-notes.test.ts#NoteService creates, updates and deletes notes and propagates errors](tests/default/2b78c16c2cecfd52879842152543c432.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 6ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-helpers-and-notes.test.ts#NoteService distinguishes found, missing and transient note status and handles empty ids](tests/default/d88b41fe4d232a2c2746bf0f5ed2533e.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 4ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-chunking.test.ts#core/rag/chunking — pairwise test suite A — Порог индексации A1: заметка \< min → 0 чанков](tests/default/58d1ce8bf9995db9197c5ea940165594.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 13ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-chunking.test.ts#core/rag/chunking — pairwise test suite A — Порог индексации A2: заметка = min → 1 чанк](tests/default/5dac77c26001669d78ea62231da384b0.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-chunking.test.ts#core/rag/chunking — pairwise test suite B — Paragraph-first аккумуляция B2: 3 мелких абзаца, сумма ≤ target → 1 чанк](tests/default/3b31f4ec98baf09357b4d7f6048f29eb.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-chunking.test.ts#core/rag/chunking — pairwise test suite B — Paragraph-first аккумуляция B3: P1+P2 ≥ min, +P3 \> target → 2 чанка (не добавляем даже если ≤ max)](tests/default/9eb7c02571206d696fe22a5adc52517e.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-chunking.test.ts#core/rag/chunking — pairwise test suite C — Partial split C1: P1 \< min, P2 ≤ max, P1+P2 \> max → частичный разрез P2](tests/default/691dec01eb00823b074d3a96ac2bc44c.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-chunking.test.ts#core/rag/chunking — pairwise test suite D — Oversized paragraph + backward merge D4: абзац max+min-2 символов → backward merge → 1 чанк (≤ max+min-1)](tests/default/5426eff02f9d6d9e3da5fc6bd03d0724.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-chunking.test.ts#core/rag/chunking — pairwise test suite D — Oversized paragraph + backward merge D5: абзац max+min символов → remainder ≥ min → 2 чанка (без merge)](tests/default/6776846cd05c81d52d9170405416b6c2.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-chunking.test.ts#core/rag/chunking — pairwise test suite D — Oversized paragraph + backward merge D7: oversized из предложений → разрез по границам предложений](tests/default/d99645420b2c60f1b91d5a3745b8fbfd.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-chunking.test.ts#core/rag/chunking — pairwise test suite E — Trailing undersized merge E1: trailing \< min, merge ≤ max → merge происходит](tests/default/13bfd5bfce3d4538bc60f80abb85a470.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-chunking.test.ts#core/rag/chunking — pairwise test suite E — Trailing undersized merge E3: trailing \< min, merge \> max → остаётся undersized](tests/default/e6d18c5a664e65c9fb9d0e87dd9ddee1.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-chunking.test.ts#core/rag/chunking — pairwise test suite E — Trailing undersized merge E4: trailing из другой секции → merge запрещён](tests/default/ac80aa20483a4e45eeed22697c3dc6cf.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-chunking.test.ts#core/rag/chunking — pairwise test suite F — Секции и заголовки F1: две секции h2 → разрыв чанка на границе секций](tests/default/ea15507d113206d6dbb25e1c9efdbd50.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-chunking.test.ts#core/rag/chunking — pairwise test suite F — Секции и заголовки F2: абзац после heading наследует его sectionHeading](tests/default/ed3236e1f10e47e46f44726b33686339.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-chunking.test.ts#core/rag/chunking — pairwise test suite F — Секции и заголовки F3: \<strong\> не создаёт секцию](tests/default/30287c25ed93c95202d3f538067cc95c.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-chunking.test.ts#core/rag/chunking — pairwise test suite G — Overlap G1: overlap=0 → нет overlap текста](tests/default/fe8b65c8000f7d4e07824d1f39481ed1.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-chunking.test.ts#core/rag/chunking — pairwise test suite G — Overlap G2: overlap=100 → предпочитает границу предложения](tests/default/77f882ed4e20798be2ef4ea723a09dd3.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-chunking.test.ts#core/rag/chunking — pairwise test suite G — Overlap G3: overlap \> длины предыдущего чанка → берёт весь текст](tests/default/324866ef5554d279e3262cdcc144f4ae.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-chunking.test.ts#core/rag/chunking — pairwise test suite G — Overlap G4: overlap между секциями → не применяется](tests/default/8af7977fd268858b03ea9c571d29a340.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 0s | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-chunking.test.ts#core/rag/chunking — pairwise test suite H — Chunk template H1: section + tags + content → полный шаблон](tests/default/04ca0f56a62aa498f8d0c687a6a97479.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-chunking.test.ts#core/rag/chunking — pairwise test suite H — Chunk template H2: heading=null → строка Section: опущена](tests/default/f4621259c03b65fce081d39d3598d78b.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-chunking.test.ts#core/rag/chunking — pairwise test suite H — Chunk template H3: body text that starts with metadata-like labels stays intact](tests/default/afda3e181aa5eb0a4109b53d3718fd3b.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 4ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-chunking.test.ts#core/rag/chunking — pairwise test suite H — Chunk template H4: heading есть, use\_section\_headings=false → Section: скрыта](tests/default/6c8bb096694171c16fdac50a70071001.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-chunking.test.ts#core/rag/chunking — pairwise test suite H — Chunk template H5: tags есть, use\_tags=false → Tags: скрыта](tests/default/492361f82bbd0df2c0e81109cbe0c77d.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-chunking.test.ts#core/rag/chunking — pairwise test suite H — Chunk template H7: use\_title=true → title передаётся](tests/default/16bdb2feda158ca1a205b91f97c0a9a5.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 0s | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-chunking.test.ts#core/rag/chunking — pairwise test suite H — Chunk template H8: use\_title=false → title = null](tests/default/42f4857e29a72832b83324ed08d0ee4a.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-chunking.test.ts#core/rag/chunking — pairwise test suite H — Depth-aware lists does not treat similarly prefixed tags as nested list items](tests/default/4ae51ed6cdd9f8c8f21229accae1e7cf.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-chunking.test.ts#core/rag/chunking — pairwise test suite H — Depth-aware lists preserves correct prefixes for nested ordered lists](tests/default/6f6b918e2528046cb7a1dc431a88a99d.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-chunking.test.ts#core/rag/chunking — pairwise test suite H — Depth-aware lists preserves unordered bullet lists nested inside ordered lists](tests/default/db650c61ab12462d989a92c44ef8e73a.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-chunking.test.ts#core/rag/chunking — pairwise test suite I — Cross-factor pairwise I1: oversized в секции A + абзац в B + overlap → overlap не пересекает секцию](tests/default/701438968fdc91e25995de8eb973063c.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-chunking.test.ts#core/rag/chunking — pairwise test suite I — Cross-factor pairwise I2: узкие настройки (min≈target≈max) → форсируют partial split](tests/default/c84c9af9349605db9e31016b8e363234.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-chunking.test.ts#core/rag/chunking — pairwise test suite J — HTML parsing J1: nested \<div\> с \<p\> → отдельные блоки](tests/default/ddf290558b3d75ed9a9c626ba3d44fd2.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-chunking.test.ts#core/rag/chunking — pairwise test suite J — HTML parsing J2: \<li\> элементы → отдельные блоки](tests/default/c5dbffbed48c6fa81b20feaecbcc15d4.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-chunking.test.ts#core/rag/chunking — pairwise test suite J — HTML parsing J3: \<br\> внутри \<p\> → один блок (не разделяет на параграфы)](tests/default/698bc15db5cb531ca58168fbcb6670b9.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-chunking.test.ts#core/rag/chunking — pairwise test suite J — HTML parsing J4: \<ol\> нумерованный список → нумерация сохраняется в тексте](tests/default/4930176fad52bbdcc71c2e14f1f5f5df.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-chunking.test.ts#core/rag/chunking — pairwise test suite J — HTML parsing J5: \<ul\> маркированный список → маркеры сохраняются в тексте](tests/default/d096678170c5ed4e0180568c6fd9d884.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-chunking.test.ts#core/rag/chunking — pairwise test suite J — HTML parsing preserves text after an unmatched opening bracket in the regex fallback](tests/default/2c6fc59dd74ba698b1f282c35efb0212.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-chunking.test.ts#core/rag/chunking — pairwise test suite Regression — реальная заметка (4 абзаца, русский текст) 3 чанка из 4 абзацев: \[P1+P2\], \[P3\], \[P4\]](tests/default/b4b1315004262f44d8527300676a13ba.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-chunking.test.ts#core/rag/chunking — pairwise test suite Regression — реальная заметка (4 абзаца, русский текст) не пересекает границы абзацев когда чанк ≥ min](tests/default/a5bf6372b1d27c1fc832686b796ede1b.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-chunking.test.ts#core/rag/chunking — pairwise test suite Regression — реальная заметка (4 абзаца, русский текст) объединяет два первых мелких абзаца в один чанк (≥ min)](tests/default/2da278d48c15b8522c1bb37d81c322cf.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-chunking.test.ts#core/rag/chunking — pairwise test suite Regression — реальная заметка (4 абзаца, русский текст) создаёт несколько чанков, не один](tests/default/9794f41cc5f7b753bf3f1cc086bb1416.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-indexingSettings.test.ts#core/rag/indexingSettings allows overlap = 0](tests/default/55ebe1192fe44fb354a871bb70d8567d.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-indexingSettings.test.ts#core/rag/indexingSettings rejects invalid ordering for chunk sizes](tests/default/dd42f36bb2218ba9bf967a7d40553811.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 3ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-indexingSettings.test.ts#core/rag/indexingSettings rejects non-boolean flags](tests/default/d0eb0ea24bf46aef82e0f65f449749aa.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 3ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-indexingSettings.test.ts#core/rag/indexingSettings rejects numeric values outside the allowed range](tests/default/642fd8164ae8cf02c9f6388cf637b0aa.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 13ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-indexingSettings.test.ts#core/rag/indexingSettings rejects overlap \>= min\_chunk\_size](tests/default/29d0ae79dd4d542c7c6ae9f4470cc434.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 3ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-indexingSettings.test.ts#core/rag/indexingSettings rejects unsupported embedding model presets](tests/default/1b38770d16e6dd8931b679cd38b27c33.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-indexingSettings.test.ts#core/rag/indexingSettings returns defaults plus read-only settings when no editable overrides exist](tests/default/4fc0968bc72731ad7ab134fef92c92c5.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 4ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-indexResult.test.ts#parseRagIndexResult drops invalid debug chunks while preserving valid ones](tests/default/a92b8412e56d80e568796c01dc55d8c3.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-indexResult.test.ts#parseRagIndexResult falls back to unknown for non-object payloads](tests/default/63f6b5131357e10b810f305e4aa08f44.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-indexResult.test.ts#parseRagIndexResult keeps the full debug chunk shape returned by the edge function](tests/default/b0dd2a8916c32a1950d7fed0360ba312.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-indexResult.test.ts#parseRagIndexResult normalizes skipped too-short payloads](tests/default/4e7119e4bec41980cef5f2ca4ca1ea32.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-indexResult.test.ts#parseRagIndexResult normalizes successful index payloads](tests/default/092fdbb6dbe0dacb022a3a324e967172.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-indexResult.test.ts#parseRagIndexResult supports delete payloads](tests/default/1ac983884e8744545f81f300e85739a6.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 0s | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-indexResult.test.ts#parseRagIndexResult supports legacy skipped payloads](tests/default/9f6aa6b06b32221413fc31ea07830391.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-indexResult.test.ts#parseRagIndexResult treats indexed payloads without chunks as unknown](tests/default/d2102a8502022135ace083bd4d39eae6.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-indexResult.test.ts#parseRagIndexResult treats zero chunks without skipped reason as unknown](tests/default/6e9c15384ebd156fef8f0417f8f0a688.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-searchSettings.test.ts#core/rag/searchSettings accepts valid settings and returns resolved values](tests/default/b793c9f5986f8ff73b66e9855c8b7aa5.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-searchSettings.test.ts#core/rag/searchSettings falls back to defaults when editable overrides are explicitly undefined](tests/default/7046e2f0ba72bca43a01c0050cde55fd.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-searchSettings.test.ts#core/rag/searchSettings rejects NaN thresholds](tests/default/4eea313a06d62f0554aaa99e2fabd997.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-searchSettings.test.ts#core/rag/searchSettings rejects non-integer top\_k values](tests/default/f82fbe4290e13bd76f9bc97b07a19b8d.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-searchSettings.test.ts#core/rag/searchSettings rejects thresholds outside the allowed range](tests/default/556fb0deb4d16891c7f7d84cd9f10aee.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 4ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-searchSettings.test.ts#core/rag/searchSettings rejects thresholds that do not align to the slider step](tests/default/c5c7324c5e6c8566c97af416c5447f3a.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-searchSettings.test.ts#core/rag/searchSettings rejects top\_k values outside the allowed range](tests/default/c61d5a2a76a95068a615bd16798971c3.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 26ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-searchSettings.test.ts#core/rag/searchSettings rejects unsupported embedding model presets](tests/default/328e13efe1a313f296be28a46c9501c9.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-rag-searchSettings.test.ts#core/rag/searchSettings returns defaults plus read-only settings when no editable overrides exist](tests/default/55603150f3e73e2f8852826e94cdf3ad.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 3ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-apiKeysSettings.test.ts#core/services/apiKeysSettings removes the stored Gemini key through the explicit upsert action](tests/default/8360f7220e20227639c2f5b2f9ce35e7.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 3ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-apiKeysSettings.test.ts#core/services/apiKeysSettings throws when removeGeminiApiKey receives an invoke error](tests/default/e8e0aa59a34c81ce480b058530df9d8f.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 3ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-apiKeysSettings.test.ts#core/services/apiKeysSettings throws when removeGeminiApiKey receives an unexpected response shape](tests/default/39469277978de1da4df8a79c8c11b37b.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 5ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-basic.test.ts#core service and indexing helpers computes FTS pagination for known and unknown totals](tests/default/735dd84920b937e056f1247be2f97328.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-basic.test.ts#core service and indexing helpers covers authentication service delegation and account deletion errors](tests/default/42725688fae73eba14479d7466780e43.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 19ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-basic.test.ts#core service and indexing helpers exposes AI index actions and filters actionable notes](tests/default/e3715aa207c630fcab36f09a370212b6.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-basic.test.ts#core service and indexing helpers manages selected note ids without mutating the input set](tests/default/0a311bb8daca532ae422514df26f9329.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-basic.test.ts#core service and indexing helpers processes bulk index outcomes and counters](tests/default/b5d0bcf6809f78edc8be6f2aadc9846f.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 3ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-noteClipboard.test.ts#core/services/noteClipboard buildPayload does not insert a gap across a list boundary (regression: EverFreeNote-e2e notes.copy.spec.ts)](tests/default/ebe499eda8f9e7827f5a52bdde17f95a.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-noteClipboard.test.ts#core/services/noteClipboard buildPayload inserts a \<br\> gap between directly-adjacent paragraphs (single Enter)](tests/default/32baf508e1a173b76d981f57733b3b7f.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-noteClipboard.test.ts#core/services/noteClipboard buildPayload leaves a leading or trailing empty paragraph untouched (nothing to separate)](tests/default/fbe1e6c217f25c593a9a33a7c525f9bc.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-noteClipboard.test.ts#core/services/noteClipboard buildPayload marks a fabricated gap so it can be told apart from a real blank line](tests/default/88cf2c3ae0adfe237c73d238aed7a146.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-noteClipboard.test.ts#core/services/noteClipboard buildPayload marks an existing blank line (a real empty paragraph) with a \<br\>](tests/default/3410b332d5c8291394cbc51362363191.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-noteClipboard.test.ts#core/services/noteClipboard buildPayload never collapses multiple consecutive blank lines — each stays its own \<br\>-marked paragraph](tests/default/e0268e4cf402a67d0cb7e14c8c698b44.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-noteClipboard.test.ts#core/services/noteClipboard buildPayload preserves a blank paragraph's own attributes (e.g. alignment) when marking it](tests/default/1015d6189d41cd5f1af58275f6d9932f.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-noteClipboard.test.ts#core/services/noteClipboard buildPayload preserves base64 (data:) images on the self-copy path](tests/default/59ee3af5dc9337638bfa28439dd622e1.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-noteClipboard.test.ts#core/services/noteClipboard buildPayload preserves superscript/subscript on the self-copy path](tests/default/2dbe8888692c08b9e2215f1c50e38dbe.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 3ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-noteClipboard.test.ts#core/services/noteClipboard buildPayload returns empty payload for empty/whitespace body](tests/default/344a52159a26b01102c56cd2904255d0.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-noteClipboard.test.ts#core/services/noteClipboard buildPayload treats &#160; as blank paragraph content](tests/default/1546a8f3c9c13d87418afe2aa60be934.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-noteClipboard.test.ts#core/services/noteClipboard buildPayload treats &#xA0; as blank paragraph content](tests/default/f7ddcb1fd59e09623671315dc2e2de55.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-noteClipboard.test.ts#core/services/noteClipboard buildPayload treats \<br class="paste-marker"\> as blank paragraph content](tests/default/8aa58d927dfe0fc5395ceef3352d47eb.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-noteClipboard.test.ts#core/services/noteClipboard buildPayload treats an nbsp-only paragraph as an existing blank line, not content needing a gap](tests/default/0b7f0b297b17d0cb4b6dd7332b1943c2.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-noteClipboard.test.ts#core/services/noteClipboard buildPayload wraps rich HTML in the self-copy marker and round-trips via NoteCopyService](tests/default/d31f53dc6ed0a5598d459c718bebb606.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 16ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-noteClipboard.test.ts#core/services/noteClipboard htmlToPlainText decodes common HTML entities instead of leaving them literal](tests/default/6ad453da69140e8e782d2517dab2bae4.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-noteClipboard.test.ts#core/services/noteClipboard htmlToPlainText degrades images to alt text, or a placeholder when alt is missing](tests/default/4464375afb882de1b3a48d8e15488c72.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 34ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-noteClipboard.test.ts#core/services/noteClipboard htmlToPlainText degrades links to their visible text only](tests/default/46309a98cfbf580c91605fee88ab8ded.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-noteClipboard.test.ts#core/services/noteClipboard htmlToPlainText never emits bold/emphasis markdown markers](tests/default/560b7eec5a7501db3f9f7618adbc71bd.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-noteClipboard.test.ts#core/services/noteClipboard htmlToPlainText produces non-empty plain text for an image-only note](tests/default/cd4546db87452c1e865fcf08d9bab5bf.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-noteClipboard.test.ts#core/services/noteClipboard htmlToPlainText renders list items as plain text without markdown markers](tests/default/9ff229431defbc82862c4b8e12b1376c.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-noteClipboard.test.ts#core/services/noteClipboard htmlToPlainText renders task items without checkbox markdown markers](tests/default/1901b635cc6cc66711e0db25fe86ba47.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-noteClipboard.test.ts#core/services/noteClipboard htmlToPlainText separates blocks and \<br\> with newlines](tests/default/ea1c80dbb62ee1c1427f6db419a35901.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-noteClipboard.test.ts#core/services/noteClipboard isBodyEmpty treats empty and whitespace-only bodies as empty](tests/default/da516b0d9951453b32cf5980e200efad.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-noteClipboard.test.ts#core/services/noteClipboard isBodyEmpty treats text or image content as non-empty](tests/default/f9b80e2387197c7ffda248f60985fdb2.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-noteClipboard.test.ts#core/services/noteClipboard zero-loss round-trip through smartPaste preserves base64 images when pasted back into EverFreeNote](tests/default/2bc00041372cad57ace3f87d574be82d.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-noteClipboard.test.ts#core/services/noteClipboard zero-loss round-trip through smartPaste preserves superscript/subscript when pasted back into EverFreeNote](tests/default/d73dea6f53800768be99e9e3f9583303.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 4ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-noteClipboard.test.ts#core/services/noteClipboard zero-loss round-trip through smartPaste preserves the blank line between paragraphs when pasted back into EverFreeNote](tests/default/ea8ca22852b2e79de56c042e68d06c0a.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-noteClipboard.test.ts#core/services/noteClipboard zero-loss round-trip through smartPaste restores a genuine blank line to a bare empty paragraph, not a \<br\>-marked one](tests/default/5d6ab5d99a94314b39d8c1620668fac4.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-noteClipboard.test.ts#core/services/noteClipboard zero-loss round-trip through smartPaste restores single-Enter adjacency (not a permanent blank line) when a self-copied note is pasted back](tests/default/818e4bb835f5e2687b2483830d3e0e78.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-noteClipboard.test.ts#core/services/noteClipboard zero-loss round-trip through smartPaste round-trips a mixed-formatting note (EverFreeNote-e2e notes.copy.spec.ts fixture)](tests/default/7135f0a7a702b793091df20493ad6b78.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 4ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-noteCopy.test.ts#core/services/noteCopy does not over-capture trailing markup in the regex fallback path](tests/default/23d61ebec9aa475fd31656f61b9ec0ab.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 4ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-noteCopy.test.ts#core/services/noteCopy requires the self-copy marker on the only top-level wrapper in the DOMParser path](tests/default/9f0f3a5d553948ddb7d2aa6a2cbb3218.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-noteCopy.test.ts#core/services/noteCopy returns sanitized HTML when parser unwrap fails and fallback cannot match](tests/default/18c440f94340a01c9bfee4374ace6697.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-noteCopy.test.ts#core/services/noteCopy sanitizes fallback-unwrapped HTML before returning it](tests/default/eecaa4669ff6615e930c715d913b1c96.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-notes-delete.test.ts#core/services/notes - deleteNote deleteNote calls Supabase methods in correct order](tests/default/dbbe4b56338ec66a3be26ddf60f0329e.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-notes-delete.test.ts#core/services/notes - deleteNote deleteNote deletes a note successfully](tests/default/71f9a5a6e3ccd2abdd80364209835948.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 29ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-notes-delete.test.ts#core/services/notes - deleteNote deleteNote handles deletion of note with special characters in id](tests/default/2905c8a045ced6b38a684118a0b1b391.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-notes-delete.test.ts#core/services/notes - deleteNote deleteNote handles deletion of note with UUID format](tests/default/5d60f8f223fb441f789bbd05cfd7ae0f.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-notes-delete.test.ts#core/services/notes - deleteNote deleteNote handles empty note id](tests/default/212b6e2b264fb21a643b1d6ade500d83.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-notes-delete.test.ts#core/services/notes - deleteNote deleteNote handles network timeout error](tests/default/4461361befe9b99702337d5dc198afab.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-notes-delete.test.ts#core/services/notes - deleteNote deleteNote handles not found error](tests/default/1b6e1d8f8b6e423dbdadb6ac62904645.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-notes-delete.test.ts#core/services/notes - deleteNote deleteNote handles permission denied error](tests/default/5983284bbc24ec23d5226d90c3a01f2a.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-notes-delete.test.ts#core/services/notes - deleteNote deleteNote returns note id on successful deletion](tests/default/4590560b3e252c7a6b88c3b6b31ed895.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-notes-delete.test.ts#core/services/notes - deleteNote deleteNote throws error when deletion fails](tests/default/8e98ad2174b2d581676fe05407cc8e4f.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-notes-getNoteStatus.test.ts#core/services/notes - getNoteStatus returns found when Supabase returns a note](tests/default/4de8ba1f30f32a3e5f6a4188455b110a.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 13ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-notes-getNoteStatus.test.ts#core/services/notes - getNoteStatus returns not\_found when Supabase returns no row](tests/default/6214fbb59e894140fe4f9e382fcafbc7.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-notes-getNoteStatus.test.ts#core/services/notes - getNoteStatus returns transient\_error when Supabase returns an error](tests/default/d6fc41a66a7f18a820c2c49e5442358a.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 3ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-offlineCache.test.ts#core/services/offlineCache deleteNote deletes a note](tests/default/dd54dd3fdb01d9035c0961b77995bcd7.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-offlineCache.test.ts#core/services/offlineCache deleteNote propagates delete errors](tests/default/d62c57e888268830949a0f936fa787c3.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-offlineCache.test.ts#core/services/offlineCache enforceLimit calls storage enforceLimit](tests/default/71378201541851a7f243b5c86eb7deeb.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-offlineCache.test.ts#core/services/offlineCache enforceLimit propagates enforce limit errors](tests/default/a67f352c358130cba86257bd65996502.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-offlineCache.test.ts#core/services/offlineCache getCacheLimitBytes returns a positive number](tests/default/0db2598068e9a5facbdb82308e7ac361.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-offlineCache.test.ts#core/services/offlineCache getCacheLimitBytes returns the cache limit constant](tests/default/e2a2a52fdeb535e8db2191a14d87afc8.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-offlineCache.test.ts#core/services/offlineCache loadNotes loads notes with limit](tests/default/6249dbbc3903e0b6a8c4c06630548578.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-offlineCache.test.ts#core/services/offlineCache loadNotes loads notes with limit and offset](tests/default/02c11dd1367a1083aadfdd5f1e7e1849.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-offlineCache.test.ts#core/services/offlineCache loadNotes loads notes without pagination](tests/default/6514a14e39f1843bfeaf8390eb3324af.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 20ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-offlineCache.test.ts#core/services/offlineCache loadNotes propagates storage errors](tests/default/9a311bfb40f4992a24c4e11971970353.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-offlineCache.test.ts#core/services/offlineCache loadNotes returns empty array when storage returns empty](tests/default/433de52a05c840d0f837c8e021c7317c.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-offlineCache.test.ts#core/services/offlineCache markSynced marks note as synced with updatedAt](tests/default/2a55b063368717be7f7ac1a9315a9b0b.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-offlineCache.test.ts#core/services/offlineCache markSynced propagates mark synced errors](tests/default/cf195b91b083c2bd2ced828c6352c32e.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-offlineCache.test.ts#core/services/offlineCache saveNote enforces limit after saving](tests/default/e7690296cc6b7b28c3db1928ab65714a.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-offlineCache.test.ts#core/services/offlineCache saveNote propagates save errors](tests/default/cbe38c499a8060f7a477675b9970879b.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-offlineCache.test.ts#core/services/offlineCache saveNote saves a note](tests/default/258cc598b8a10d34f26f73e36e100278.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-offlineCache.test.ts#core/services/offlineCache saveNotes enforces limit after saving multiple notes](tests/default/81670944c36945d4635c2870a8be8b85.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-offlineCache.test.ts#core/services/offlineCache saveNotes propagates save errors](tests/default/08923ebe14bedd7754c1b47b174ba509.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-offlineCache.test.ts#core/services/offlineCache saveNotes saves empty array](tests/default/ec32fbcd31592f303231b064f34a2935.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-offlineCache.test.ts#core/services/offlineCache saveNotes saves multiple notes](tests/default/6a3ad34b919ad7845c6c3fee85c9a6e6.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-offlineQueue.test.ts#core/services/offlineQueue enqueue defaults attempts to 0 when not provided](tests/default/ef478598bdc2a3de6836d171d207d3e2.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-offlineQueue.test.ts#core/services/offlineQueue enqueue defaults status to pending when not provided](tests/default/8fb559bcf71d31c10cdfe3783a20f1c4.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-offlineQueue.test.ts#core/services/offlineQueue enqueue enqueues item with all fields provided](tests/default/5087349d3203c7c592b9cc9aa672baea.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 24ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-offlineQueue.test.ts#core/services/offlineQueue enqueue generates id when not provided](tests/default/66ab84e05aabd1cf6d3b44cf4f76d32c.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-offlineQueue.test.ts#core/services/offlineQueue enqueue handles lastError field](tests/default/7242353e4ae2b0835039083a55ec79aa.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-offlineQueue.test.ts#core/services/offlineQueue enqueue propagates storage errors](tests/default/44afca23e0a21f4ea73552b178853b90.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-offlineQueue.test.ts#core/services/offlineQueue enqueueMany enqueues empty array](tests/default/6a678af410c18cb1fd54326a33b9e036.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-offlineQueue.test.ts#core/services/offlineQueue enqueueMany enqueues multiple items](tests/default/12e44c5e7642e7d6d90e08ac3dd1cf83.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-offlineQueue.test.ts#core/services/offlineQueue enqueueMany generates unique ids for each item](tests/default/4279d5139b79f12fcbf22ac4e3668219.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-offlineQueue.test.ts#core/services/offlineQueue getPendingBatch gets pending batch with custom size](tests/default/2f44b4e3ecc54f5111475f5cec28f7a5.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-offlineQueue.test.ts#core/services/offlineQueue getPendingBatch gets pending batch with default size](tests/default/f88dae95457f4a718d2e1b6b24463024.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-offlineQueue.test.ts#core/services/offlineQueue getQueue returns empty array when queue is empty](tests/default/fcd305bc7742b83e3ef717018ee1f225.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-offlineQueue.test.ts#core/services/offlineQueue getQueue returns queue items](tests/default/8ff7704a9cfe13afc725a5c05168df02.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-offlineQueue.test.ts#core/services/offlineQueue markStatus marks status as pending](tests/default/8f2f059535801d4e44f1c89cc03a4233.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-offlineQueue.test.ts#core/services/offlineQueue markStatus marks status with error](tests/default/926219adc019c8edddab146f139e1c65.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-offlineQueue.test.ts#core/services/offlineQueue markStatus marks status without error](tests/default/eb023e63a9674878a5b45d6a84918fa0.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-offlineQueue.test.ts#core/services/offlineQueue popBatch (deprecated) pops batch with custom size](tests/default/c36663931e5c73e73d159489565f83d4.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-offlineQueue.test.ts#core/services/offlineQueue popBatch (deprecated) pops batch with default size](tests/default/c64a049abbfd5404d36069a6239f3506.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-offlineQueue.test.ts#core/services/offlineQueue removeItems handles empty array](tests/default/0ebdbc628ca3d778c9b71d5f26fb86a9.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 0s | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-offlineQueue.test.ts#core/services/offlineQueue removeItems removes items by ids](tests/default/63cc4d944f57e71fd979cfb466d9fa7e.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-offlineQueue.test.ts#core/services/offlineQueue removeItems removes single item](tests/default/15602702e3205f58eadef4b2431f9379.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-offlineQueue.test.ts#core/services/offlineQueue upsertQueue upserts queue items](tests/default/301e6d2033ee3a4500dac591ef26cb04.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-publicNoteShare.test.ts#core/services/publicNoteShare builds encoded public note URLs from an injected origin](tests/default/aca84ddae06153f3fd9f840ac0eef9ef.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 19ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-publicNoteShare.test.ts#core/services/publicNoteShare creates a view link when no active link exists](tests/default/8728db853814258318a85ea37ec37588.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-publicNoteShare.test.ts#core/services/publicNoteShare loads public note projection by token](tests/default/e0ef139e85d258feeddfb35081c9f305.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-publicNoteShare.test.ts#core/services/publicNoteShare retries lookup after an insert conflict and returns the existing link](tests/default/b7e4fa714df65c8ce79494ed6c781f02.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-publicNoteShare.test.ts#core/services/publicNoteShare returns null for blank or missing public tokens](tests/default/e10884ec308925c6567cc55dac45931b.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-publicNoteShare.test.ts#core/services/publicNoteShare reuses an existing active view link](tests/default/b05b6714d7461f239de4e5933867199f.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 3ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-publicNoteShare.test.ts#core/services/publicNoteShare throws actionable errors when link creation fails](tests/default/7273a2855008562a2bcf327b4a5cc9a4.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 4ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-publicNoteShare.test.ts#core/services/publicNoteShare throws fallback errors for failed public token lookups](tests/default/088d60ae62a33a6f9d95709a4fc933b4.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-publicNoteShare.test.ts#core/services/publicNoteShare uses fallback messages for non-standard lookup and insert errors](tests/default/b6d9a5162c39ead978fa3cde91f81c58.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 3ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-ragSettings.test.ts#core/services/rag settings accepts indexing settings payloads that omit embedding\_model](tests/default/5b5d3bc429803f9615fa94b3076ccc6b.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 6ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-ragSettings.test.ts#core/services/rag settings accepts search settings payloads that omit embedding\_model](tests/default/6ea1f15d3ceb70ac29922ed70ce3b1cc.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-sanitizer.test.ts#core/services/sanitizer sanitize allows blockquote and code](tests/default/2fdf1c47ef826d88e1f3e4fd0fc06e62.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-sanitizer.test.ts#core/services/sanitizer sanitize allows data URIs in images (if DOMPurify config permits)](tests/default/6957608d20d41f1142316c230e2b1582.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-sanitizer.test.ts#core/services/sanitizer sanitize allows heading tags](tests/default/52c86367a5f8e418f0f31494c30e4097.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-sanitizer.test.ts#core/services/sanitizer sanitize allows horizontal rule](tests/default/d934eae4b0cc09a93da8d76aca1e92bd.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-sanitizer.test.ts#core/services/sanitizer sanitize allows images with src and alt](tests/default/0c620f554a663e0952f5ec76eb09d7ff.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-sanitizer.test.ts#core/services/sanitizer sanitize allows lists](tests/default/ec621fa975d251f6e131fdc228cea1b3.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-sanitizer.test.ts#core/services/sanitizer sanitize allows safe attributes](tests/default/689b48605d6fb74307f363773b54331b.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-sanitizer.test.ts#core/services/sanitizer sanitize allows safe HTML tags](tests/default/8192790dd9cd9275d9f41293e27bbcfd.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 4ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-sanitizer.test.ts#core/services/sanitizer sanitize allows text formatting tags](tests/default/be5c600720c0966f7178f41406aedc4b.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-sanitizer.test.ts#core/services/sanitizer sanitize handles complex nested structure](tests/default/fe6a3ddbbef802789b62ec59f45100dd.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-sanitizer.test.ts#core/services/sanitizer sanitize handles empty string](tests/default/bf038013c6d049f1c9cf81e2c9f9f1f2.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-sanitizer.test.ts#core/services/sanitizer sanitize handles plain text without tags](tests/default/5e6ef374c583463a0d949db246c0118a.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-sanitizer.test.ts#core/services/sanitizer sanitize preserves allowed style attribute](tests/default/fa37c875edf5e269c389f2ac067923c7.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-sanitizer.test.ts#core/services/sanitizer sanitize preserves editor-owned task-list markup for self-copy sanitization](tests/default/4d5ffb0eada34f111c51d4957b954ff7.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-sanitizer.test.ts#core/services/sanitizer sanitize preserves task-list data attributes in the default sanitizer profile](tests/default/cf280b2a0c53957b05e9537500dca6dc.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-sanitizer.test.ts#core/services/sanitizer sanitize removes dangerous event handlers](tests/default/21b0166d8a2424559c6eafefa8558f42.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-sanitizer.test.ts#core/services/sanitizer sanitize removes form and input tags](tests/default/36d9b3f2e5e20d7d1dd912c643e5b908.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-sanitizer.test.ts#core/services/sanitizer sanitize removes iframe tags](tests/default/144e0fdbb8b5acd3469e552e9e030d32.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-sanitizer.test.ts#core/services/sanitizer sanitize removes javascript: protocol from links](tests/default/43317a0c740e393722547696aa4dbbce.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 0s | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-sanitizer.test.ts#core/services/sanitizer sanitize removes object and embed tags](tests/default/7f1401842d29d937fe219cad7d8a4783.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-sanitizer.test.ts#core/services/sanitizer sanitize removes onerror attribute from img](tests/default/b3d078cb46bce8095f0513a4eee54989.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-sanitizer.test.ts#core/services/sanitizer sanitize removes onload attribute](tests/default/3831b156f05368dcd1da692283bd7fd9.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-sanitizer.test.ts#core/services/sanitizer sanitize removes onmouseover attribute](tests/default/a3de225a6cc9478e44fef7c34d7cbc21.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 0s | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-sanitizer.test.ts#core/services/sanitizer sanitize removes script tags](tests/default/8608d1a16b9c27db703287df517a6e5d.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-sanitizer.test.ts#core/services/sanitizer stripHtml handles empty string](tests/default/e64c6e07ef9e5e26103cdb18fa831359.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 0s | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-sanitizer.test.ts#core/services/sanitizer stripHtml handles HTML entities](tests/default/3db85e888cfa106af2406148f164c018.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 0s | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-sanitizer.test.ts#core/services/sanitizer stripHtml handles multiple paragraphs](tests/default/e078ffcb376b67476a72b0d12361092e.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-sanitizer.test.ts#core/services/sanitizer stripHtml handles plain text](tests/default/4af2ae85853461c031ab3f62a29b1198.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 0s | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-sanitizer.test.ts#core/services/sanitizer stripHtml removes all HTML tags](tests/default/b931b78d841c532d094da477a4d0b4ed.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-sanitizer.test.ts#core/services/sanitizer stripHtml removes images](tests/default/24ad75c98533596b92fc888983ff9943.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 0s | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-sanitizer.test.ts#core/services/sanitizer stripHtml removes links but keeps text](tests/default/707905dc152498865bc39bfe8669628c.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-sanitizer.test.ts#core/services/sanitizer stripHtml removes lists but keeps content](tests/default/00fa80a960761c4a84a9cf6d62a0caa5.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-sanitizer.test.ts#core/services/sanitizer stripHtml removes nested tags](tests/default/154472b95b6b2421d2c660058578ea90.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-sanitizer.test.ts#core/services/sanitizer stripHtml removes scripts and their content](tests/default/f2e56cb8fc3d4d9c2fb829d62718f3fd.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 0s | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-sanitizer.test.ts#core/services/sanitizer stripHtml removes styles and their content](tests/default/8dfdf37b04a3bb29fa8229316c4b99ac.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 0s | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-search.test.ts#core/services/search searchNotes - Edge cases handles empty query gracefully](tests/default/c7e3bd3bd9a7711b4c5b7cb789b6b4bc.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-search.test.ts#core/services/search searchNotes - Edge cases handles FTS error and falls back](tests/default/686fc691513592a9cbe788701aa53eb4.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-search.test.ts#core/services/search searchNotes - Edge cases handles pagination in fallback](tests/default/5fb70179b0fa0ecc1271608ebd539862.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-search.test.ts#core/services/search searchNotes - Edge cases handles very short query (\< 3 chars)](tests/default/036b414976627f1f44dac176465aa317.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-search.test.ts#core/services/search searchNotes - Fallback path applies tag filter in fallback](tests/default/27cbeafb2377a5ba0dfc882d7cdd872f.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-search.test.ts#core/services/search searchNotes - Fallback path falls back to ILIKE when FTS returns no results](tests/default/05e7a7ca5314c5590abc82eb9f259da5.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-search.test.ts#core/services/search searchNotes - Fallback path handles fallback errors gracefully](tests/default/d392dc236a4daa87baf6e424c7605c7e.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-search.test.ts#core/services/search searchNotes - Fallback path uses ILIKE with sanitized search term](tests/default/f1aa153ab574b9407b57b962fe0e3b9b.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-search.test.ts#core/services/search searchNotes - FTS path applies custom options](tests/default/b130b53981dc40ce050faa46f72fae47.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-search.test.ts#core/services/search searchNotes - FTS path handles total\_count from FTS results](tests/default/955411055945c05a79f797a9c5387a50.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-search.test.ts#core/services/search searchNotes - FTS path normalizes FTS results with content field](tests/default/4f0ae741ce05ed03d826430edc2fdb6f.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-search.test.ts#core/services/search searchNotes - FTS path searches using full-text search with results](tests/default/a030140d8c7741daa3a35a2860774398.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 17ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-search.test.ts#core/services/search searchNotes - FTS path uses english language for latin text](tests/default/b728c10b05b42530d7b748ac27391775.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-settingsErrorMessage.test.ts#core/services/settingsErrorMessage keeps explicit payload messages when they are actionable](tests/default/a1a1c55bfc1fe56efe82b207a426ce9a.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-settingsErrorMessage.test.ts#core/services/settingsErrorMessage returns a friendly message for network-resolution failures](tests/default/d9ed5d6f2f30efe8e03d311338fb3a39.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-settingsErrorMessage.test.ts#core/services/settingsErrorMessage returns a friendly message for service unavailable responses](tests/default/08621b20e8955ce944ed4189e2badce8.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 8ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-settingsErrorMessage.test.ts#core/services/settingsErrorMessage uses fallback text for unknown errors and handles malformed contexts](tests/default/43214791991724d3e52b17d022c3d3f2.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-smartPaste.test.ts#core/services/smartPaste detectPasteType detects markdown when score passes threshold](tests/default/e6380bd990f3cef09a775381c2262482.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-smartPaste.test.ts#core/services/smartPaste detectPasteType falls back to plain text when markdown score is low](tests/default/8e01b89b747411347fd785217fb08e65.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-smartPaste.test.ts#core/services/smartPaste detectPasteType forces plain text when content exceeds size threshold](tests/default/88e14102aac27ab7f39ea7a0ab92195c.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-smartPaste.test.ts#core/services/smartPaste detectPasteType ignores non-structural HTML when markdown text is present](tests/default/f366419932356672214c9ad863037aca.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-smartPaste.test.ts#core/services/smartPaste detectPasteType prefers meaningful HTML over markdown text](tests/default/3f445e1e9f8bbd72f6df3b4bed338439.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 9ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-smartPaste.test.ts#core/services/smartPaste ProseMirror clipboard HTML (editor copy-paste) keeps heading structure intact](tests/default/3b5c666d89830e8d6082d22470b5ed6f.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-smartPaste.test.ts#core/services/smartPaste ProseMirror clipboard HTML (editor copy-paste) keeps list structure intact](tests/default/9a00acb3455d2e80db4b67fd99fd1df9.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-smartPaste.test.ts#core/services/smartPaste ProseMirror clipboard HTML (editor copy-paste) keeps multi-paragraph HTML structure intact](tests/default/4241748fb530dc7025752d032aa12571.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-smartPaste.test.ts#core/services/smartPaste ProseMirror clipboard HTML (editor copy-paste) preserves inline formatting when unwrapping single-paragraph HTML](tests/default/1bc8e010baf4b3046220b97583577d82.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-smartPaste.test.ts#core/services/smartPaste ProseMirror clipboard HTML (editor copy-paste) preserves italic formatting when unwrapping single-paragraph HTML](tests/default/4d10c60d88111b3f4de8b2e28e1237bf.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-smartPaste.test.ts#core/services/smartPaste ProseMirror clipboard HTML (editor copy-paste) preserves mixed inline formatting when unwrapping single-paragraph HTML](tests/default/4a75073184a10f70997deb145ec9be7e.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-smartPaste.test.ts#core/services/smartPaste ProseMirror clipboard HTML (editor copy-paste) unwraps single-paragraph HTML to inline content for inline-safe pasting](tests/default/e8584b792c4a35500daa0ee78d07c918.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-smartPaste.test.ts#core/services/smartPaste resolvePaste — forced type override auto-detection is unchanged when forcedType is not provided](tests/default/be1a69567b93bb407908a7d863c95906.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-smartPaste.test.ts#core/services/smartPaste resolvePaste — forced type override classifies spaced and aligned markdown table separators without regex backtracking](tests/default/23390f4489f81932f8a13cb50dcb30cf.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-smartPaste.test.ts#core/services/smartPaste resolvePaste — forced type override continues to classify one-column tables with outer pipes as unsupported](tests/default/bf3e4e372eddb1e3dcdf33cd4bea0a75.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-smartPaste.test.ts#core/services/smartPaste resolvePaste — forced type override does not call detectPasteType when forcedType is provided](tests/default/3c22826fcc7f1fe17ce58d604ae25fe4.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-smartPaste.test.ts#core/services/smartPaste resolvePaste — forced type override does not classify malformed rows like "| : | : |" or "| |" as table separators](tests/default/f46d45edf5c19fb5c6e52a3836f65413.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-smartPaste.test.ts#core/services/smartPaste resolvePaste — forced type override renders markdown when forcedType overrides low-score text](tests/default/298b0ca01110e02c731b38699b6a75b2.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-smartPaste.test.ts#core/services/smartPaste resolvePaste — forced type override returns empty html without error when text is empty string](tests/default/bdbec934c4cf334b4f92c60745ce6a9f.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-smartPaste.test.ts#core/services/smartPaste resolvePaste — forced type override sanitizes output even when forced type is used](tests/default/1a188c5fd4b1dc752d8417237bc83fa3.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-smartPaste.test.ts#core/services/smartPaste resolvePaste — forced type override sets detection to forced-by-user when forcedType is provided](tests/default/a0800e9e9611f043988151d211b7f356.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-smartPaste.test.ts#core/services/smartPaste resolvePaste caps the aggregate data: URI budget across one paste, even though each image stays under the per-image cap](tests/default/f2ec37ed44e1bd00ca60a8704a228df3.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2s 255ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-smartPaste.test.ts#core/services/smartPaste resolvePaste converts markdown horizontal rule to hr](tests/default/197d58b718711878339ecd37b1311ca2.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-smartPaste.test.ts#core/services/smartPaste resolvePaste converts markdown to sanitized HTML](tests/default/61299dcf5dc259ab5b565f36d15f9cd4.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 12ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-smartPaste.test.ts#core/services/smartPaste resolvePaste does not mistake a pipe-containing line followed by an unrelated dashed line for a table](tests/default/172aff7fb998bb973ccc4b899774cdb7.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 4ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-smartPaste.test.ts#core/services/smartPaste resolvePaste downgrades task lists to plain text](tests/default/eb6c712ada14f84b5a0dce63714c1fef.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-smartPaste.test.ts#core/services/smartPaste resolvePaste downgrades unsupported markdown to plain text with line breaks](tests/default/5d36ae66db96cc654ff1598e28d8a0ff.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-smartPaste.test.ts#core/services/smartPaste resolvePaste falls back to plain text when sanitization throws](tests/default/6aa1541ee8380aa5dd3c3848c11a4df9.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-smartPaste.test.ts#core/services/smartPaste resolvePaste filters inline styles using allowlist when DOMParser is present](tests/default/f02fad19c19fd4b45a670b356bada15d.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 3ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-smartPaste.test.ts#core/services/smartPaste resolvePaste filters unsafe URLs using regex when DOMParser is unavailable](tests/default/47a5ae8d252c91e83629ba20ba25742c.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-smartPaste.test.ts#core/services/smartPaste resolvePaste keeps allowed link protocols and strips unsafe ones](tests/default/a10c0c31be3bd227394aa37341baee51.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 3ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-smartPaste.test.ts#core/services/smartPaste resolvePaste keeps only http/https images and removes others](tests/default/d9ea5914d7d92839616dea018e3fb8f5.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 3ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-smartPaste.test.ts#core/services/smartPaste resolvePaste preserves self-copy rich text styles for EverFreeNote round-trip](tests/default/02dea116ecba0c018d9f280ae09b5d1d.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 23ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-smartPaste.test.ts#core/services/smartPaste resolvePaste preserves supported heading levels up to h6](tests/default/5c439b48325234812ee1d656aad3979d.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-smartPaste.test.ts#core/services/smartPaste resolvePaste preserves task-list markup when pasting EverFreeNote self-copy HTML](tests/default/29195c75a783a506631fb54270a79300.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-smartPaste.test.ts#core/services/smartPaste resolvePaste preserves task-list metadata for normal editor HTML without the self-copy wrapper](tests/default/945036b0e5b85b11b02760ee91119294.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-smartPaste.test.ts#core/services/smartPaste resolvePaste removes disallowed styles when DOMParser is unavailable](tests/default/226691190710e1ebba075e9cf06aca8f.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-smartPaste.test.ts#core/services/smartPaste resolvePaste renders all markdown heading levels](tests/default/f89866399ac0718945fe232410a84527.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-services-smartPaste.test.ts#core/services/smartPaste resolvePaste treats non-structural HTML as plain text when no markdown is present](tests/default/1f78a00db9a63ecdd232cf3b2148fb62.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utility-edge-cases.test.ts#core utility edge cases note snapshots handles invalid dates and all supported override fields](tests/default/6d8fcf6e768936efdb587789b1c7f7d1.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utility-edge-cases.test.ts#core utility edge cases RAG chunk template parsing handles whitespace-only metadata inputs without creating metadata lines](tests/default/92d6125ad34528c6679734ce3b037d18.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utility-edge-cases.test.ts#core utility edge cases RAG chunk template parsing preserves content when metadata is not separated by a blank line](tests/default/ab6c4227a85e6d0d50653f41759dc63a.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 3ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utility-edge-cases.test.ts#core utility edge cases RAG index result normalization filters invalid debug chunks and accepts nullable metadata](tests/default/202aeac6f346315c2b3e5bc5d7872748.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utility-edge-cases.test.ts#core utility edge cases RAG index result normalization normalizes malformed, skipped, indexed and empty results](tests/default/e275cc020066e3e61907091e10c6d26e.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utility-edge-cases.test.ts#core utility edge cases settings error payloads maps network and service-unavailable errors while preserving ordinary errors](tests/default/8c5ab58a53cb9f6e767b535f88345bfa.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utility-edge-cases.test.ts#core utility edge cases settings error payloads returns null for unavailable or malformed JSON contexts](tests/default/95e3928e0e4d6b6976c46d861e223b42.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-debouncedLatest.test.ts#createDebouncedLatest cancels pending work and prevents the timer from flushing](tests/default/85ea465758a12a404993cc7857e44035.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-debouncedLatest.test.ts#createDebouncedLatest clears pending work when rebasing onto a clean draft](tests/default/8b1f089edaa37531a1b48bc4cce8ad00.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-debouncedLatest.test.ts#createDebouncedLatest does not let an in-flight flush overwrite a rebased baseline](tests/default/e426f66073ee035c1edb870fa53cf601.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-debouncedLatest.test.ts#createDebouncedLatest does not queue a value that already matches the current baseline](tests/default/c761018659b8f417b40c5210ee4b565e.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-debouncedLatest.test.ts#createDebouncedLatest keeps the original debounce deadline when rebasing pending work](tests/default/d0d229aed9881dd342c284f9679353d7.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-debouncedLatest.test.ts#createDebouncedLatest rebases the baseline without dropping a merged pending draft](tests/default/0b1e3a0e3a47e69ca00846e72652d903.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 23ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-debouncedLatest.test.ts#createDebouncedLatest retries an in-flight value if the flush fails after the same payload is re-queued](tests/default/3e11325e0bbf60d093e420f7c0eef95c.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-debouncedLatest.test.ts#createDebouncedLatest rolls back the baseline when flush fails](tests/default/06ed40d7544dea75a7c69d0e6a33e093.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-debouncedLatest.test.ts#createDebouncedLatest uses the reset baseline for future equality checks](tests/default/58161470dc4223e6cd7fc7bdafbf475e.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-normalize-html.test.ts#core/utils/normalize-html escapeHtml escapes special HTML characters](tests/default/01d923393f7920f3afc908031b602a0b.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 0s | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-normalize-html.test.ts#core/utils/normalize-html normalizeHtml converts simple divs to paragraphs](tests/default/054e58193112ed15dbb2e59ad698974a.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 4ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-normalize-html.test.ts#core/utils/normalize-html normalizeHtml preserves divs that contain block elements](tests/default/60744a8bf6dcb924328b069d95097b9b.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 0s | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-normalize-html.test.ts#core/utils/normalize-html normalizeHtml removes en-note wrappers](tests/default/b6d2a10a18910a57a790002e1abb3eee.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 3ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-normalize-html.test.ts#core/utils/normalize-html plainTextToHtml converts newlines to breaks and paragraphs](tests/default/7c6ee53e97c4413fe516c45a8826254c.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 0s | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-normalize-html.test.ts#core/utils/normalize-html plainTextToHtml escapes html tags in the text](tests/default/244dd9ac56cd4a2addffd68da8cb0536.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 0s | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-normalize-html.test.ts#core/utils/normalize-html plainTextToHtml handles multiple newlines as paragraph breaks](tests/default/bafac4b326523357a6f4e12c9166288e.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 0s | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-noteBody.test.ts#core/utils/noteBody.isNoteBodyEmpty treats empty, whitespace and empty editor markup as empty](tests/default/8f5efa04f20032902f8ccd582cb4bf28.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-noteBody.test.ts#core/utils/noteBody.isNoteBodyEmpty treats text or image content as non-empty](tests/default/6a52d51454dd37764b68b43bbc619861.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-postgrest.test.ts#core/utils/postgrest returns false for non-object values](tests/default/da545ae97ec1a940294bb46955c113b8.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 0s | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-postgrest.test.ts#core/utils/postgrest returns false for other error codes](tests/default/f4a2764e27bca8a6f8a833880612d228.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-postgrest.test.ts#core/utils/postgrest returns true for PGRST116 errors](tests/default/08779c92e17cdf684be9a242e9f50e2e.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-prosemirrorCaret.test.ts#core/utils/prosemirrorCaret.placeCaretFromCoords falls back to Selection.atEnd when click is below editor bounds](tests/default/5fa90d2fb122abb9f9d44f20f91b7f24.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-prosemirrorCaret.test.ts#core/utils/prosemirrorCaret.placeCaretFromCoords falls back to Selection.atStart when click is above editor bounds](tests/default/a5ef6b47699a856cd42c7afb37df969e.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 23ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-prosemirrorCaret.test.ts#core/utils/prosemirrorCaret.placeCaretFromCoords is defensive and returns noop on exceptions](tests/default/cc3852d2af1ddb603011170f5f3de269.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-prosemirrorCaret.test.ts#core/utils/prosemirrorCaret.placeCaretFromCoords returns noop when posAtCoords is null and click is within bounds](tests/default/4652805bc30dc5208fd5784451bc8680.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-prosemirrorCaret.test.ts#core/utils/prosemirrorCaret.placeCaretFromCoords uses posAtCoords + Selection.near when a position is returned](tests/default/e11e57d5cc577edf09db82b017bec8df.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 11ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-search.test.ts#core/utils/search buildTsQuery builds AND query for multiple words](tests/default/eaf1607113792feb697b9aa9c3d2e7bc.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-search.test.ts#core/utils/search buildTsQuery builds prefix query for single word](tests/default/8abb6d8b3301867817ad3ae76bc44014.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-search.test.ts#core/utils/search buildTsQuery filters out empty words after sanitization](tests/default/8b09435a8d8e45625c0ee44b5aff5713.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-search.test.ts#core/utils/search buildTsQuery handles minimum valid query (3 characters)](tests/default/aecbed1ed99a2ca1a72ed04166efd6ac.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 3ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-search.test.ts#core/utils/search buildTsQuery handles mixed language queries](tests/default/ebc2b246757d86a060bc40948c8a8ce9.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-search.test.ts#core/utils/search buildTsQuery removes extra whitespace](tests/default/ac83b35671343dc62b0ec1ce70faf782.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-search.test.ts#core/utils/search buildTsQuery returns null for empty string](tests/default/9052c2100ef9bfb675cc776c34b92de9.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 3ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-search.test.ts#core/utils/search buildTsQuery returns null for non-string input](tests/default/dc3cc33c10cc1c8a45bde19e2c1b4bfc.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-search.test.ts#core/utils/search buildTsQuery returns null for query exceeding maximum length](tests/default/4aa88242de6016d16bffffc82203e0d6.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-search.test.ts#core/utils/search buildTsQuery returns null for query shorter than minimum length](tests/default/fccbe83663ea862c0bc392ab692baccb.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-search.test.ts#core/utils/search buildTsQuery returns null for whitespace-only string](tests/default/c291efad19d4799df151e5be0737a92a.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-search.test.ts#core/utils/search buildTsQuery sanitizes special characters](tests/default/9469a5892c2ecf9797e832d64e0d8cb2.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-search.test.ts#core/utils/search detectLanguage handles ukrainian characters as russian](tests/default/d3be391b5e590022e0dbe9bde8dedb8a.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-search.test.ts#core/utils/search detectLanguage returns "en" for latin text](tests/default/3f25e775377920a1fbff163549e30113.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-search.test.ts#core/utils/search detectLanguage returns "en" for numbers only](tests/default/71caa2ae9b9d24a28165f8eee4ae698f.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-search.test.ts#core/utils/search detectLanguage returns "en" for special characters only](tests/default/e17cc064273b2e670efba33028c8c9ef.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-search.test.ts#core/utils/search detectLanguage returns "ru" for cyrillic text](tests/default/aa9d8e255062dc575d107a04552a657b.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-search.test.ts#core/utils/search detectLanguage returns "ru" for empty string](tests/default/2a054b56ba74d255739659aeacdc8608.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-search.test.ts#core/utils/search detectLanguage returns "ru" for mixed text with cyrillic](tests/default/2601f10924881095d3f43080dc47602d.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-search.test.ts#core/utils/search ftsLanguage falls back to "russian" for unknown language](tests/default/e8e13a7ccd94387f81b057d7f6e39688.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 0s | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-search.test.ts#core/utils/search ftsLanguage maps "en" to "english"](tests/default/ffccc742f4237fa7cb61b1725f9b978a.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 0s | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-search.test.ts#core/utils/search ftsLanguage maps "ru" to "russian"](tests/default/078b8d228dd4b2e5d355c760e865e542.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 0s | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-search.test.ts#core/utils/search ftsLanguage maps "uk" to "russian"](tests/default/50f6d3107e81194ef0c9b1395425d5d3.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 0s | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-search.test.ts#core/utils/search mapNotesToFtsResult maps empty array to empty array](tests/default/13ae3294477ed65ef0144b1d992bd8b9.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 0s | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-search.test.ts#core/utils/search mapNotesToFtsResult maps multiple notes](tests/default/4321d547b034dfecbeaaf918bfe32afd.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-search.test.ts#core/utils/search mapNotesToFtsResult maps note without description (null)](tests/default/06eb59054655d0a42afd33fc6243652b.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-search.test.ts#core/utils/search mapNotesToFtsResult maps single note with description](tests/default/b8e55bc485ed23c65edadc07b150b238.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-search.test.ts#core/utils/search mapNotesToFtsResult preserves all note properties](tests/default/84ed9f254facd6422fb1b74968f54006.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-search.test.ts#core/utils/search mapNotesToFtsResult truncates long descriptions to 200 characters](tests/default/499701aaaaf680c5d085aa91e711680d.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-search.test.ts#core/utils/search shouldUpdateTagFilter returns false when tags are the same](tests/default/ed7eddabf76ae6283cb4c3dba8302628.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-search.test.ts#core/utils/search shouldUpdateTagFilter returns true when tags differ](tests/default/46015a9e050fd6a5514e983caa7adf28.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-search.test.ts#core/utils/search shouldUpdateTagFilter treats empty string and null as different](tests/default/7e206858b2cc4ed07f1171c7bf640a91.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-wordpress.test.ts#core/utils/wordpress derives a published tag from the site hostname](tests/default/5c130256e6ca2d7ed84aaa6052356cad.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 4ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-wordpress.test.ts#core/utils/wordpress normalizes export tags without changing user-facing order](tests/default/449685b4612b5be78f4e5f40d4b32326.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-wordpress.test.ts#core/utils/wordpress rejects slugs longer than the allowed maximum](tests/default/833ce2a28008860e2b8319335a78eb55.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-wordpress.test.ts#core/utils/wordpress requires a non-empty slug](tests/default/5f1c9d0f67648c23c04a926c083d9ffb.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 4ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-wordpress.test.ts#core/utils/wordpress returns null when the site url cannot produce a hostname](tests/default/edf799243b2cf5e2a6e252dddfc42acf.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-wordpress.test.ts#core/utils/wordpress returns the fallback slug for empty or unsupported input](tests/default/d0f838d69c5ffd99a9ca9021bd8be545.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-wordpress.test.ts#core/utils/wordpress transliterates cyrillic text into a deterministic latin slug](tests/default/0b1001734069a5bd216e087fa5f124e6.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 4ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-wordpress.test.ts#core/utils/wordpress truncates long slugs deterministically and keeps them normalized](tests/default/a042329a4aa778e76d6c63e2a0dfe57b.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/core-utils-wordpress.test.ts#core/utils/wordpress validates slug format rules](tests/default/23273af35e68a1ce2bee618f52ef67ed.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/debounced-overlay-additional-branches.test.ts#applyNoteOverlay additional branches creates new notes with explicit fields, fallback fields, and updated\_at sorting](tests/default/e7e36733a0247192fd1e9ace0a348e2f.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/debounced-overlay-additional-branches.test.ts#applyNoteOverlay additional branches removes deleted notes and overlays existing notes while preserving fallback fields](tests/default/f81403d6c79513c8f3397dd32a7f1929.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/debounced-overlay-additional-branches.test.ts#createDebouncedLatest additional branches does not duplicate a pending value equal to the in-flight value](tests/default/2a2b199efd2f741e5729d3e9024467f7.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/debounced-overlay-additional-branches.test.ts#createDebouncedLatest additional branches flushes immediately and cancels the scheduled timer without a duplicate save](tests/default/1eef2caf1c0101ffce15d380f0fdb1d4.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 3ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/debounced-overlay-additional-branches.test.ts#createDebouncedLatest additional branches makes an empty flush and a repeated flush no-ops](tests/default/c32edf1782c0cfb79716bc6a56657500.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 19ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/debounced-overlay-additional-branches.test.ts#createDebouncedLatest additional branches preserves a different pending value while the first flush is in flight](tests/default/93056aad5fbbaad77d0532176202ae15.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/debounced-overlay-additional-branches.test.ts#createDebouncedLatest additional branches reset cancels pending work and rebasing without a replacement keeps it](tests/default/563d54280b3a26970d648a071240c6f2.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/debounced-overlay-additional-branches.test.ts#createDebouncedLatest additional branches uses Object.is by default and a custom equality function when provided](tests/default/20ff980902c1415d83e9044c50853ff2.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/editorWebViewBridge.test.ts#editorWebViewBridge does not finish incomplete chunked messages](tests/default/6890cdbfde294dcfc3acb3fdbbceae8a.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/editorWebViewBridge.test.ts#editorWebViewBridge ignores malformed lifecycle messages without mutating the buffer](tests/default/adb1513390b8f3acb7b12cca734faab8.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 6ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/editorWebViewBridge.test.ts#editorWebViewBridge ignores prototype-like transfer ids](tests/default/d71e929ca14c96c4f2a296176bb6e9e3.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/editorWebViewBridge.test.ts#editorWebViewBridge reassembles chunked messages into text](tests/default/e95118505181038bd59d9531a2a151a2.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/editorWebViewBridge.test.ts#editorWebViewBridge rejects invalid chunk indexes and missing chunk slots](tests/default/c08d1ea0af83e7813ab17a9cc7f22cdf.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/editorWebViewBridge.test.ts#editorWebViewBridge sends a single message for short text](tests/default/4787c2fc8bef980c4c138fd7f1db8302.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/editorWebViewBridge.test.ts#editorWebViewBridge sends chunked messages for long text](tests/default/b123bb710573a17db61e279b24a7bf17.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 3ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/embedding-models-additional.test.ts#RAG embedding model lookup exposes the exact supported preset values and metadata](tests/default/26d5820a69bc36ba70caa9f45ea153e5.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/embedding-models-additional.test.ts#RAG embedding model lookup recognizes both supported models and returns their exact labels](tests/default/51cca43e5bb37384ed91b8af8bf7d84e.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/embedding-models-additional.test.ts#RAG embedding model lookup rejects unknown lookup values, resolves them to the default, and falls back to the raw label](tests/default/cdce1877218354e258f3c1a251124950.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/enex-builder-additional-branches.test.ts#EnexBuilder additional branches builds an empty export with the exact envelope and explicit export date](tests/default/d7db1ce72235ca7b8d4aea4b20acf9b2.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/enex-builder-additional-branches.test.ts#EnexBuilder additional branches generates the exact ENEX structure with escaped fields, sorted tags and resources](tests/default/1fdde1058c835179302e673f83725662.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 19ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/enex-builder-additional-branches.test.ts#EnexBuilder additional branches omits optional tags, resources and falsy resource metadata](tests/default/f72ea7e9814b0d71be61f91814239bce.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/note-clipboard-additional-branches.test.ts#core/services/noteClipboard additional edge cases buildPayload does not fabricate a gap for malformed paragraph markup](tests/default/0b5b01c90bd2a6da93f7f79213b2814f.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/note-clipboard-additional-branches.test.ts#core/services/noteClipboard additional edge cases buildPayload does not treat a malformed br-like tag as an empty paragraph marker](tests/default/1eb8cf2910bd1b83d62dbda48565d4de.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/note-clipboard-additional-branches.test.ts#core/services/noteClipboard additional edge cases buildPayload preserves meaningful text when the input has no paragraph elements](tests/default/d310598dc1e4ce72fe446756914ffd6a.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 3ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/note-clipboard-additional-branches.test.ts#core/services/noteClipboard additional edge cases buildPayload treats whitespace-only paragraph content as an existing empty paragraph](tests/default/adef1318880ef6155170983699899742.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/note-clipboard-additional-branches.test.ts#core/services/noteClipboard additional edge cases htmlToPlainText reads a single-quoted alt attribute and trims it](tests/default/ba26d4d09c0905f8f92c49137f332151.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/note-clipboard-additional-branches.test.ts#core/services/noteClipboard additional edge cases htmlToPlainText returns empty text for empty input](tests/default/988411b9c3adae86b4dbc29f225da4d6.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/note-clipboard-additional-branches.test.ts#core/services/noteClipboard additional edge cases htmlToPlainText uses the image placeholder for empty and whitespace-only alt attributes](tests/default/f070328977ff9582e7bc515dda6de070.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/note-clipboard-additional-branches.test.ts#core/services/noteClipboard additional edge cases restoreEditorHtml only removes complete, explicitly marked fabricated gaps](tests/default/b03e583f3168169841acecb42c7aa95d.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/note-clipboard-additional-branches.test.ts#core/services/noteClipboard additional edge cases restoreEditorHtml restores br-only paragraphs while preserving other attributes](tests/default/8ce7c28023db9364388dc5673f5feb01.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/note-clipboard-additional-branches.test.ts#core/services/noteClipboard additional edge cases restoreEditorHtml returns empty input unchanged](tests/default/d5ae2f87800f9507a8f61ab32a405adf.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/note-creator-additional-branches.test.ts#NoteCreator additional branches inserts exact note data when lookup returns a row without an id](tests/default/6f3f14c4ee1c69d99281f2108985ec50.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/note-creator-additional-branches.test.ts#NoteCreator additional branches normalizes titles and records only successfully created notes as seen](tests/default/62fccbb2a79b4ebfadd5f8d84962967c.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 26ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/note-creator-additional-branches.test.ts#NoteCreator additional branches updates the exact existing note and reports a missing update id](tests/default/fe7b6588ec2002c9d1fe748283324e4d.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/note-creator-additional-branches.test.ts#NoteCreator additional branches uses cached fallback lookups for replace and cached misses for prefix](tests/default/dbb70f66c843f5e021ce02a5826adcc7.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 3ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/note-creator-additional-branches.test.ts#NoteCreator additional branches wraps non-Error lookup and write failures with the creation context](tests/default/4ead22eed2442637ab3301fdc66faf28.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 20ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/note-creator-branches.test.ts#NoteCreator duplicate branches inserts a new note and tracks seen titles for file duplicate skipping](tests/default/fda2b058076bd55ff8a5efe2d2a2bea6.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 4ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/note-creator-branches.test.ts#NoteCreator duplicate branches prefixes duplicates and wraps lookup/write failures with context](tests/default/b11f8020c8ccaad36be7e03fcd4d6b5b.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 9ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/note-creator-branches.test.ts#NoteCreator duplicate branches skips an existing title or updates it using replace strategy](tests/default/4c7040d68f633e530be920304aa4c939.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/note-snapshot-additional-branches.test.ts#note snapshot additional branches creates a shallow copy for an empty override but returns the base for absent override](tests/default/d41d3c8beb464f67e2116a851260fe42.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/note-snapshot-additional-branches.test.ts#note snapshot additional branches overrides explicitly present nullable fields but preserves undefined fields and identity fields](tests/default/66757f08eccaab843f4037502d7d69fd.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/note-snapshot-additional-branches.test.ts#note snapshot additional branches selects the latest sparse candidate while preserving identity and stable ties](tests/default/0bd9e199e8b7a9de7e5c6ee64a36902a.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/note-snapshot-additional-branches.test.ts#note snapshot additional branches treats missing, empty, null and invalid dates as older than every valid date](tests/default/a995424b78d2a6c4e9666261f52621e7.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 3ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/noteAutosaveSession.test.ts#noteAutosaveSession reconcileExternalNoteSnapshot accepts external updates for clean fields](tests/default/1a734b6efb753332225a3b2615215ffe.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/noteAutosaveSession.test.ts#noteAutosaveSession reconcileExternalNoteSnapshot acknowledges dirty fields when the incoming snapshot matches the local draft](tests/default/46c00becc9a8eb81f92ce3ae8fdc6e2a.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/noteAutosaveSession.test.ts#noteAutosaveSession reconcileExternalNoteSnapshot fully replaces draft and baseline when a different note is loaded](tests/default/6964f528a8c06d29d6a4273e90574d9b.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/noteAutosaveSession.test.ts#noteAutosaveSession reconcileExternalNoteSnapshot preserves dirty local fields while advancing the baseline to a concurrent remote change](tests/default/33040b042ee7e5aec23bfa0f2fb93074.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/noteAutosaveSession.test.ts#noteAutosaveSession reconcileExternalNoteSnapshot reconciles mixed same-note refreshes field-by-field](tests/default/69428b94edf8578107d9bf28c031a7ca.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/noteAutosaveSession.test.ts#noteAutosaveSession resolveNoteAutosaveSessionChange returns assigned-id when a pending create receives its assigned note id](tests/default/e45642e3cc878699b850f7fb39359280.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/noteAutosaveSession.test.ts#noteAutosaveSession resolveNoteAutosaveSessionChange returns switched when moving to another note](tests/default/3ba8cb6c1925f80657a5965ad7b78ea0.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/noteAutosaveSession.test.ts#noteAutosaveSession resolveNoteAutosaveSessionChange returns unchanged when the note id stays the same](tests/default/e17417604a02388afaf89d250358d74b.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 8ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/noteAutosaveSession.test.ts#noteAutosaveSession resolveNoteAutosaveSessionChange treats a different assigned note id as a real switch](tests/default/52011971d3ee4eed4ce85aa48a99a500.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/noteAutosaveSession.test.ts#noteAutosaveSession resolveNoteAutosaveSessionChange treats undefined to id without a matching create assignment as a real switch](tests/default/67e3c4361ce2af044b3b4ef9158a242d.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/notes-additional-branches.test.ts#core/services/notes additional branch behavior applies tag and comma-safe search filters and advances a full page](tests/default/719753b1ca8259a4035759b9c0a3e961.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/notes-additional-branches.test.ts#core/services/notes additional branch behavior creates notes with and without an explicit id and returns null data](tests/default/a6c2363b2beb12365248085bf395aefb.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/notes-additional-branches.test.ts#core/services/notes additional branch behavior propagates getNotes and createNote errors](tests/default/f82c367ffc2d92d17c80a847324067da.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/notes-additional-branches.test.ts#core/services/notes additional branch behavior returns a non-full page without a next cursor when optional filters are absent](tests/default/878ef8f3b57430eddf66606cb9378eef.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 5ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/notes-additional-branches.test.ts#core/services/notes additional branch behavior returns no query for empty ids, maps non-empty results, and handles null data and errors](tests/default/78dd7ce73590acaf7f8bf980f8c6a03c.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 6ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/notes-additional-branches.test.ts#core/services/notes additional branch behavior uses default pagination and returns empty metadata when the page data is null](tests/default/1f165720607e057602184588777e088d.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 5ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/offline-queue-additional-branches.test.ts#offline queue additional branches compacts create-update-delete to a noop and keeps the final operation for existing notes](tests/default/22f21a0414e08bc97b7c7dbb14d30a64.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/offline-queue-additional-branches.test.ts#offline queue additional branches dequeues in order, excludes failed retries from pending batches, and reaches an empty state](tests/default/6abf7c290ffc41f0a0d4efd2ba2ff0e4.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 4ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/offline-queue-additional-branches.test.ts#offline queue additional branches keeps compacted notes in final timestamp order and returns an empty queue for no input](tests/default/7b80cc79359fa2e113206cad138215e6.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/offline-queue-additional-branches.test.ts#offline queue additional branches preserves retry metadata and input order when enqueueing a failed batch](tests/default/b56508927eca41df2808d4a849ce389e.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/offline-queue-additional-branches.test.ts#offline queue additional branches propagates dequeue and retry status storage failures without changing the service contract](tests/default/b230af905527328342426f2fa1ca4c7f.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/offline-queue-additional-branches.test.ts#offline queue additional branches uses an incrementing fallback id when Web Crypto is unavailable](tests/default/d9db34ee7e769b22934cd46ca6a552f0.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/offline-queue-additional-branches.test.ts#offline queue additional branches uses getRandomValues when randomUUID is unavailable](tests/default/c185325fff2c005b4f782976065782b8.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 4ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/offline-sync-additional-branches.test.ts#OfflineSyncManager additional branches compacts create-delete to a noop and keeps a standalone delete pending](tests/default/641cfd835cdac1e8e6d8157095660a6e.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 3ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/offline-sync-additional-branches.test.ts#OfflineSyncManager additional branches continues after cleanup and onSuccess failures once sync itself succeeds](tests/default/52c2c779193c9adb3365df07b72061cc.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/offline-sync-additional-branches.test.ts#OfflineSyncManager additional branches does not start a second drain while the first drain is in flight](tests/default/25905b10a8863b58101436d98169c2ea.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/offline-sync-additional-branches.test.ts#OfflineSyncManager additional branches marks failed syncs, tolerates mark errors, and stops when no progress is made](tests/default/1167b5606bbfe052467a4382a8f0b9f3.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/offline-sync-additional-branches.test.ts#OfflineSyncManager additional branches recovers after compaction storage failure because draining is reset](tests/default/097f445cc812c0f586c9e0a04a462849.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/offline-sync-additional-branches.test.ts#OfflineSyncManager additional branches stops fetching later batches after going offline during a drain](tests/default/39b481cea1de4e5a39d34b3f26fca191.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/offline-sync-additional-branches.test.ts#OfflineSyncManager additional branches transitions from offline to online, records state, and disposes the network subscription](tests/default/03fc46c99eff27e3596a01aef3130008.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 5ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/offline-sync-manager.test.ts#OfflineSyncManager compacts and drains successful items, invoking callbacks](tests/default/fd7765f4cca3641cc0e0cc16a9780dbf.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 4ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/offline-sync-manager.test.ts#OfflineSyncManager honors offline state and handles online transitions](tests/default/5f5a9e4ab5ca8bfebe30edd9e0c3f45d.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 3ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/offline-sync-manager.test.ts#OfflineSyncManager marks failed items and stops when no item progresses](tests/default/cc99306a661c01b05a3f9bb54da6c9f3.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/rag-debug-log-additional-branches.test.ts#RAG debug logging additional branches falls back to console.info when grouping methods are unavailable](tests/default/3e6ee434321dc926085aa937231501ed.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/rag-debug-log-additional-branches.test.ts#RAG debug logging additional branches logs empty content and preserves unusual but valid runtime metadata](tests/default/c7d3536641a61af8ae1e80a0985f3948.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/rag-debug-log-additional-branches.test.ts#RAG debug logging additional branches logs exact metadata and keeps previews at or below the truncation boundary intact](tests/default/c3ecb00d7394d55db139d6cc35fedaab.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 4ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/rag-debug-log-additional-branches.test.ts#RAG debug logging additional branches reports an empty result without attempting to open a group](tests/default/713f508e773da3c9d81c2e2fc943554d.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/rag-index-result-additional-branches.test.ts#RAG index result additional branch behavior distinguishes zero and unknown counts and applies the corresponding fallbacks](tests/default/5a74ef5156c5cc942430adab18c142b0.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/rag-index-result-additional-branches.test.ts#RAG index result additional branch behavior keeps valid debug chunks and drops non-record or malformed chunks](tests/default/20807e5085b13287d61370f93568a21d.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 3ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/rag-index-result-additional-branches.test.ts#RAG index result additional branch behavior normalizes deleted aliases and non-record indexing responses](tests/default/c34a956e496d3e19ab96e171c2c2a0bf.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/rag-index-result-additional-branches.test.ts#RAG index result additional branch behavior normalizes indexed positive counts and clamps invalid dropped counts](tests/default/83459a764e3d4d8fff4ca2b885c16d05.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/rag-index-result-additional-branches.test.ts#RAG index result additional branch behavior preserves known and unknown skipped reasons with trimmed or fallback messages](tests/default/22e355695089b73b2acb4b296c02efa2.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/rag-index-result-additional-branches.test.ts#RAG index result additional branch behavior returns no debug chunks for null, non-record, or non-array input](tests/default/deef73d8edd970bd156b4b7af43fd489.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 3ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/rag-index-settings-additional-branches.test.ts#RagIndexSettingsService additional branch behavior accepts equal readonly arrays but rejects an array or scalar shape mismatch](tests/default/e45c81bff64e0ff502e183683b39cb0d.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 10ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/rag-index-settings-additional-branches.test.ts#RagIndexSettingsService additional branch behavior loads and upserts resolved settings with exact endpoint payloads](tests/default/dd0d67de4c4cb152b9daee88bba2bcc4.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 5ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/rag-index-settings-additional-branches.test.ts#RagIndexSettingsService additional branch behavior maps getStatus and upsert endpoint errors to thrown messages](tests/default/6d74b2a5dea81248223fbc370138b7ed.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/rag-index-settings-additional-branches.test.ts#RagIndexSettingsService additional branch behavior rejects malformed nested data and invalid editable values](tests/default/39e4f57bf46d91ce5e7bc906a4460701.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 4ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/rag-index-settings-additional-branches.test.ts#RagIndexSettingsService additional branch behavior rejects malformed success responses from both status and upsert](tests/default/0f52508e10a8217f49402794a9dc874f.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/rag-indexing-settings-additional.test.ts#RAG indexing settings additional behavior accepts inclusive numeric boundaries and rejects overlap at the minimum chunk size](tests/default/d931ca4d9c2881a6e05d5a896f9e15d6.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/rag-indexing-settings-additional.test.ts#RAG indexing settings additional behavior keeps only editable keys during coercion and preserves supplied values without casting](tests/default/3df9a627e8592673f66d11c458be9a53.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/rag-indexing-settings-additional.test.ts#RAG indexing settings additional behavior reports exact validation messages for invalid numeric, boolean, model and ordering values](tests/default/bcf63bcdb9861297ea7fdb3f96ba343f.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/rag-indexing-settings-additional.test.ts#RAG indexing settings additional behavior returns exact defaults and merges editable overrides with readonly settings](tests/default/77b755a2a5d61737e08b170ab2c56745.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 4ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/rag-indexing-settings-additional.test.ts#RAG indexing settings additional behavior returns the exact resolved values from successful assert and pick operations](tests/default/28b2d764795fe7956e8d5ca940466249.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/rag-search-settings-additional-branches.test.ts#RagSearchSettingsService additional branches propagates status and upsert endpoint errors with their operation-specific messages](tests/default/d3713200e66d55cf521688e6098f9499.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/rag-search-settings-additional-branches.test.ts#RagSearchSettingsService additional branches rejects a valid-looking object when its nested shape does not match resolved settings](tests/default/fecbdb4147e794857141f8e79ee0e99b.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/rag-search-settings-additional-branches.test.ts#RagSearchSettingsService additional branches rejects non-object responses and malformed nested ragSearch data](tests/default/9b525b3c3aab79ed5504e0c29809712c.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 14ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/rag-search-settings-additional-branches.test.ts#RagSearchSettingsService additional branches returns the resolved status and sends the exact status request payload](tests/default/f18a0e4f35a53df8cf49130d4708cce1.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 3ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/rag-search-settings-additional-branches.test.ts#RagSearchSettingsService additional branches returns the resolved upsert response and sends the exact input payload](tests/default/c6d75e6c18086544736f02c47b69fe97.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/rag-search-settings-additional-branches.test.ts#RagSearchSettingsService additional branches uses operation-specific fallbacks for non-Error endpoint failures](tests/default/774362d1529b8f9e91176bd2c6a85295.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/rag-search-settings-model-additional-branches.test.ts#RAG search settings model additional branches accepts inclusive numeric boundaries and rejects invalid numeric variants](tests/default/c40abc773d81f2757a18e60a7944e820.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/rag-search-settings-model-additional-branches.test.ts#RAG search settings model additional branches asserts valid partial settings after applying defaults and reports combined errors](tests/default/6ca160010ebb7b2222fb3494983d7f67.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 11ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/rag-search-settings-model-additional-branches.test.ts#RAG search settings model additional branches coerces only supported keys and preserves array/enum-shaped values for validation](tests/default/005d1568687dc3609200844adf1565bf.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/rag-search-settings-model-additional-branches.test.ts#RAG search settings model additional branches exposes the complete readonly model without editable mutations](tests/default/89e5e61adc5d85fe669691b7faae377a.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/rag-search-settings-model-additional-branches.test.ts#RAG search settings model additional branches falls back to the default model for unsupported model values](tests/default/f18b6afc9e0b8aaef56cb06f54542199.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/rag-search-settings-model-additional-branches.test.ts#RAG search settings model additional branches resolves null input and preserves zero-valued editable settings](tests/default/611fae295e7a49d244f451f2b6273919.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 5ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/rag-settings-services-branches.test.ts#RAG and API key settings services loads and updates valid settings and rejects malformed responses](tests/default/1f1f9f9cb9d6181007f6e5f352627897.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 6ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/rag-settings-services-branches.test.ts#RAG and API key settings services maps settings service errors and validates API key responses](tests/default/219a194da82dba819e31d3fb58b99e7d.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 6ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/rag-settings-services-branches.test.ts#RAG and API key settings services rejects missing, invalid and shape-mismatched RAG search payloads](tests/default/eebefa99041a4665ab59d6f845135223.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 3ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/rag-settings-services-branches.test.ts#RAG settings branches resolves embedding model presets and labels](tests/default/369bc363a0801e28f7e1b515b2f6fea0.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/rag-settings-services-branches.test.ts#RAG settings branches resolves, validates and coerces search settings](tests/default/b29c533e14749ec0c46a1514d5629551.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/rag-settings-services-branches.test.ts#RAG settings branches resolves, validates, picks and coerces indexing settings](tests/default/9d99c2e9039ec4e05388a1faece83373.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 21ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/search-service-additional-branches.test.ts#SearchService additional branches falls back for null and empty FTS data and preserves null fallback data](tests/default/df1af5b813beced169da39a2d61be7f2.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 4ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/search-service-additional-branches.test.ts#SearchService additional branches normalizes missing description, content and headline fields in FTS rows](tests/default/1ad53d0722688aed30c4b3e65349ea5d.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/search-service-additional-branches.test.ts#SearchService additional branches returns a useful message for Error and unknown fallback failures](tests/default/59771fe3aa55ccfb768f99d7b5c3471c.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 3ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/search-service-additional-branches.test.ts#SearchService additional branches sends exact RPC payloads for language, ranking, pagination and tags](tests/default/9fe5351979d687e484d17de3f81ee133.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/search-service-additional-branches.test.ts#SearchService additional branches sends the exact REST fallback chain payload, including sanitized query and tag](tests/default/e95805fce7e9ed05a4cd8661dbab77ca.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 3ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/search.test.ts#buildTsQuery builds a multi-word query with sanitization](tests/default/5105827a5979eae125345692b7a7d765.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/search.test.ts#buildTsQuery builds a single-word query](tests/default/a02282ad31e07eebadc77d8d1b0c121d.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/search.test.ts#buildTsQuery returns null for empty or short input](tests/default/e95c527190862a31ebb5057dcd48a287.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 3ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/search.test.ts#buildTsQuery returns null for overly long input](tests/default/6f6dba3de5f21eaa255f46f7776ce987.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/search.test.ts#detectLanguage defaults to ru for empty input](tests/default/d3d66ee07415fd6ca666a0dbab9486d9.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/search.test.ts#detectLanguage detects cyrillic as ru](tests/default/ee85f0293fa481f9870fe8e573cb67ab.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/search.test.ts#detectLanguage detects latin as en](tests/default/f238882f441e0a268a113cce425fd464.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/search.test.ts#ftsLanguage maps known language codes](tests/default/907085257ee90599ac37b1fa53963e90.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/settings-error-additional-branches.test.ts#settings error message additional branches maps 502, 503 and 504 contexts while preserving actionable messages and ordinary statuses](tests/default/198c6fce4c086f5c639c6b0a0d482416.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/settings-error-additional-branches.test.ts#settings error message additional branches maps every supported network message pattern to the exact unavailable message](tests/default/0520be42dd97179cc4b02d639469aed9.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/settings-error-additional-branches.test.ts#settings error message additional branches returns null for missing, non-function and malformed JSON readers](tests/default/c04c40ecd789c3717e7e7794f37126bd.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/settings-error-additional-branches.test.ts#settings error message additional branches uses exact Error messages and fallback text for empty or unknown errors](tests/default/2cebef073fa2c351a26ed230a4424e30.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/settings-error-additional-branches.test.ts#settings error message additional branches uses field precedence, skips blank values and preserves non-empty message text](tests/default/668f4559daad1551938f4d050dc3e83e.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/settings-search-additional-branches.test.ts#additional settings and search branches RAG settings services rejects invalid indexing payloads, including readonly array mismatches](tests/default/d50687a67075a931f5d998cbe73e2319.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 5ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/settings-search-additional-branches.test.ts#additional settings and search branches RAG settings services rejects invalid search payloads and maps context errors](tests/default/0544df4155a7bc6befb2ea041bd56f57.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 4ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/settings-search-additional-branches.test.ts#additional settings and search branches SearchService falls back with null data and reports non-Error database failures](tests/default/085ed188f06e876c0b7723a82cdf7fab.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/settings-search-additional-branches.test.ts#additional settings and search branches SearchService uses inferred totals and normalizes missing description/headline/content](tests/default/bfb61a3c0fefec6c9391ae5b959518b0.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/settings-search-additional-branches.test.ts#additional settings and search branches settings error messages recognizes each unavailable HTTP status and network payload message](tests/default/589dd94a58480a00212968d6dfb31443.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/settings-search-additional-branches.test.ts#additional settings and search branches WordPressSettingsService preserves Error messages and uses fallbacks for non-Error failures](tests/default/0a4d26bf6e600185409708b0ce846b25.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 11ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/settings-search-additional-branches.test.ts#additional settings and search branches WordPressSettingsService sends status and upsert requests with their respective payloads](tests/default/8641ce2d1155f69cace7de950a1f4b93.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/smart-paste-additional-branches.test.ts#smart paste additional branch behavior filters protocols and styles in the regex fallback while preserving safe values](tests/default/a3ae28f7ebed6f3202b180e7f4b59501.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 11ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/smart-paste-additional-branches.test.ts#smart paste additional branch behavior honors a forced plain type for HTML-only input](tests/default/45393f3abdf52c762875df66c9c258a9.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/smart-paste-additional-branches.test.ts#smart paste additional branch behavior keeps markdown when a malformed table separator is rejected and falls back for a valid table](tests/default/303dffe2a7dbc915e34ef0c5c6c0bd47.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 12ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/smart-paste-additional-branches.test.ts#smart paste additional branch behavior returns an empty paragraph when both sanitization and safe HTML stripping fail](tests/default/144b149221e6f448020a4c45584e71cd.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/smart-paste-additional-branches.test.ts#smart paste additional branch behavior returns text-first fallback output when parsing throws](tests/default/4e6a11093564ac07563f8babdf8b51dc.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/wordpress-export-additional-branches.test.ts#WordPressExportService additional branches accepts empty and mixed valid category responses](tests/default/c0e9058d26137b92c944b2a30ace12fc.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 3ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/wordpress-export-additional-branches.test.ts#WordPressExportService additional branches handles absent context, rejected JSON and empty Error messages](tests/default/99b4894339314d3b8f923f3d589d7471.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/wordpress-export-additional-branches.test.ts#WordPressExportService additional branches normalizes numeric-string export ids and preserves an explicit payload](tests/default/3bf9b8059b320129993794a9ceba6731.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 3ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/wordpress-export-additional-branches.test.ts#WordPressExportService additional branches rejects category containers, items and ids with unsupported shapes](tests/default/4d2088fd924660cb169640fda4548c20.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 3ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/wordpress-export-additional-branches.test.ts#WordPressExportService additional branches rejects export responses with malformed records and post ids](tests/default/ed8af78db108291c059b39d4b07b0d7e.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/wordpress-export-additional-branches.test.ts#WordPressExportService additional branches uses context fields when valid and falls back for status-only or malformed context errors](tests/default/9c2446a51fc6f06892eac4d8cc4207da.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 18ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/wordpress-services.test.ts#WordPress services falls back for ordinary and unknown bridge errors](tests/default/7e6819e86ae4f153185c6728a32b50cc.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/wordpress-services.test.ts#WordPress services loads and saves settings, including error and empty response branches](tests/default/e1b1722185e3e3ee8d037b541a703a11.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 4ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/wordpress-services.test.ts#WordPress services loads categories and normalizes numeric string ids](tests/default/7bf8501e5f1ce1f4d6930e52ec62a52e.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 3ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/wordpress-services.test.ts#WordPress services parses bridge context errors and invokes export with defaults](tests/default/d3503f960b77625048e9d3104421aad6.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/wordpress-services.test.ts#WordPress services rejects invalid categories and export responses](tests/default/1036bf3b1fdb8253c8003ba7ac6763fa.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 11ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/wordpress-services.test.ts#WordPress services rejects malformed category items and export fields instead of coercing them](tests/default/d676ab1bf14c3cdeb02c96c5c4448c37.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/wordpress-settings-additional-branches.test.ts#WordPressSettingsService additional branches preserves Error messages and falls back for unknown error values](tests/default/ca2675169e3c17b0e9c2060c338cda1b.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/wordpress-settings-additional-branches.test.ts#WordPressSettingsService additional branches returns the default status and rejects malformed upsert responses](tests/default/980d2ec614bffc58b0edf8652128b35b.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 9ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/wordpress-settings-additional-branches.test.ts#WordPressSettingsService additional branches uses message and msg values from context JSON errors](tests/default/18faf183be1dd3b545c62cba92348e2c.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/wordpress-settings-additional-branches.test.ts#WordPressSettingsService additional branches uses operation fallbacks when context JSON has only an HTTP status](tests/default/d3bc945d769be2cf7bf552aef69b6115.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/wordpress-settings-additional-branches.test.ts#WordPressSettingsService additional branches uses the exact status and upsert invoke payloads](tests/default/8ffffce33e0fd1b22e0b9644eba7d661.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 3ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/wordpress-utils-additional-branches.test.ts#WordPress utility additional branches derives published tags from host-style and dotted URLs and falls back for malformed URLs](tests/default/864187f42be14bc6b1acb4d0e5c9937b.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/wordpress-utils-additional-branches.test.ts#WordPress utility additional branches keeps the first non-empty tag spelling and removes case-insensitive duplicates](tests/default/74d58c59822fbe9e8aefe7d1d488c4f6.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/wordpress-utils-additional-branches.test.ts#WordPress utility additional branches normalizes accents, transliterates Cyrillic, ignores unsupported symbols and collapses separators](tests/default/dffcb73fa03217721dc5b78103bb5b8a.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 4ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/wordpress-utils-additional-branches.test.ts#WordPress utility additional branches trims a hyphen at the truncation boundary and preserves the maximum-length boundary](tests/default/2949f7a589b0651460c043dd2ef21cfa.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/unit/wordpress-utils-additional-branches.test.ts#WordPress utility additional branches validates whitespace, boundary length and slug characters](tests/default/01d6fd6929b00f47599176b0c00fef70.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
