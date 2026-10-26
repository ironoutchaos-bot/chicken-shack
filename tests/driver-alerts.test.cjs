const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const path = require('node:path')
const ts = require('typescript')

// Supply fetch in each sandbox without making any network requests.
function fixture(sendNotification) {
  const requests = []
  const source = fs.readFileSync(path.join(__dirname, '../lib/push-notify.ts'), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText
  const module = { exports: {} }
  vm.runInNewContext(code, {
    module, exports: module.exports, console, process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://test.invalid' } },
    require: () => ({ setVapidDetails() {}, sendNotification }),
    fetch: async (url, options) => { requests.push({ url, options }); return { ok: true, json: async () => [{ endpoint: 'https://push.invalid/device', p256dh: 'test', auth: 'test' }] } },
  })
  return { run: module.exports.notifyAllDrivers, requests }
}

test('phone test only queries authenticated driver and selected device', async () => {
  let payload
  const { run, requests } = fixture(async (_, body) => { payload = JSON.parse(body) })
  const result = await run('test-order', true, { driverId: 'driver-a', endpoint: 'https://push.invalid/device' })
  assert.match(requests[0].url, /driver_id=eq.driver-a&endpoint=eq.https%3A%2F%2Fpush.invalid%2Fdevice/)
  assert.equal(result.sent, 1)
  assert.equal(payload.test, true)
  assert.match(payload.title, /Test Alarm/)
})
test('real order notification is not marked as a sound test', async () => {
  let payload
  const { run } = fixture(async (_, body) => { payload = JSON.parse(body) })
  await run('new-order')
  assert.equal(payload.test, false)
  assert.equal(payload.kind, 'driver_new_order')
})
test('send is awaited before reporting success', async () => {
  let completed = false
  const { run } = fixture(async () => { await new Promise(resolve => setTimeout(resolve, 20)); completed = true })
  const result = await run('test-order', true)
  assert.equal(completed, true)
  assert.equal(result.sent, 1)
})
test('service worker forwards test flag and requests audible notification', async () => {
  const handlers = {}
  let notification, message, pending
  const context = {
    self: { location: { origin: 'https://test.invalid' }, addEventListener: (event, handler) => { handlers[event] = handler }, registration: { showNotification: async (title, options) => { notification = options } } },
    clients: { matchAll: async () => [{ postMessage: value => { message = value } }] },
  }
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../public/sw.js'), 'utf8'), context)
  handlers.push({ data: { json: () => ({ title: 'Test', kind: 'driver_new_order', test: true }) }, waitUntil: task => { pending = task } })
  await pending
  assert.equal(notification.silent, false)
  assert.equal(message.test, true)
  assert.equal(message.kind, 'driver_new_order')
})
