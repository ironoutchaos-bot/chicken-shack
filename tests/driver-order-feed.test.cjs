const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const path = require('node:path')
const ts = require('typescript')

function fixture(fetch) {
  const source = fs.readFileSync(path.join(__dirname, '../lib/driver-order-feed.ts'), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const module = { exports: {} }
  vm.runInNewContext(code, { module, exports: module.exports, fetch, AbortSignal, Error })
  return module.exports
}

test('waiting paid and COD orders alert even on first open, but not again after acknowledgment', () => {
  const { hasUnseenDriverOrders: unseen } = fixture()
  for (const payment_status of ['cod', 'paid']) {
    for (const order_status of ['placed', 'packed']) {
      const order = { id: 'waiting', payment_status, order_status }
      assert.equal(unseen([order], null), true)
      assert.equal(unseen([order], new Set(['waiting'])), false)
      assert.equal(unseen([order], new Set(['older'])), true)
    }
  }
})

test('pending payments and completed orders do not trigger alarms', () => {
  const { hasUnseenDriverOrders: unseen } = fixture()
  for (const payment_status of ['pending', 'failed', 'refunded']) {
    assert.equal(unseen([{ id: 'a', payment_status, order_status: 'placed' }], null), false)
  }
  for (const order_status of ['delivered', 'cancelled', 'on_the_way']) {
    assert.equal(unseen([{ id: 'a', payment_status: 'paid', order_status }], null), false)
  }
})

test('feed bypasses browser cache and bounds stalled requests', async () => {
  const orders = [{ id: 'new-order' }]
  const { fetchDriverOrders } = fixture(async (url, options) => {
    assert.equal(url, '/api/driver/orders')
    assert.equal(options.cache, 'no-store')
    assert.ok(options.signal instanceof AbortSignal)
    return { ok: true, status: 200, json: async () => orders }
  })
  assert.equal(await fetchDriverOrders(), orders)
})

test('expired session is distinguished from transient server failures', async () => {
  for (const status of [401, 403]) {
    const { fetchDriverOrders, DriverSessionExpired } = fixture(async () => ({ status, ok: false }))
    await assert.rejects(fetchDriverOrders, DriverSessionExpired)
  }
  const { fetchDriverOrders, DriverSessionExpired } = fixture(async () => ({ status: 500, ok: false }))
  await assert.rejects(fetchDriverOrders, error => !(error instanceof DriverSessionExpired) && /Retrying/.test(error.message))
})

test('network failures and malformed responses cannot masquerade as an empty order list', async () => {
  const offline = fixture(async () => { throw new TypeError('offline') })
  await assert.rejects(offline.fetchDriverOrders, /offline/)
  const invalid = fixture(async () => ({ status: 200, ok: true, json: async () => ({ error: 'invalid' }) }))
  await assert.rejects(invalid.fetchDriverOrders, /could not be loaded/)
})
