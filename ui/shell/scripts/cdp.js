#!/usr/bin/env node
/**
 * Evaluate an expression in the POC WebView over the Chrome DevTools Protocol.
 * Requires: adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>
 *
 *   node scripts/cdp.js "document.body.innerText.slice(0,300)"
 */
const expression = process.argv[2] || '1+1'

const targets = await fetch('http://localhost:9222/json').then((r) => r.json())
const page = targets.find((t) => t.type === 'page')
if (!page) throw new Error('no page target')

const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((resolve) => { ws.onopen = resolve })

const send = (id, method, params) =>
  new Promise((resolve) => {
    const onMessage = (event) => {
      const msg = JSON.parse(event.data)
      if (msg.id === id) {
        ws.removeEventListener('message', onMessage)
        resolve(msg.result)
      }
    }
    ws.addEventListener('message', onMessage)
    ws.send(JSON.stringify({ id, method, params }))
  })

const result = await send(1, 'Runtime.evaluate', {
  expression,
  returnByValue: true,
  awaitPromise: true,
})
console.log(JSON.stringify(result, null, 2))
ws.close()
