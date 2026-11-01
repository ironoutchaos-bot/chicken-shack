const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

function checkoutHarness({ mode = 'cod', failSave = false, user = { id: 'test-user', name: 'Test Customer', phone: '9000000000' } } = {}) {
  let cursor = 0, clears = 0, confirmations = 0, logins = 0, gatewayCalls = 0
  const slots = [], requests = [], storage = new Map()
  const cart = [{ productId: 'curry-500', name: 'Curry Cut', pricePerKg: 188, quantity: 2, imageUrl: null, weightPerUnit: 500, unit: 'g', pieceSize: 'Small', itemNote: 'Cut preference test' }]
  const jsx = (type, props) => ({ type, props: props || {} })
  const hooks = {
    useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = initial; return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value }] },
    useRef(initial) { const index = cursor++; if (!(index in slots)) slots[index] = { current: initial }; return slots[index] },
    useEffect() { cursor++ },
  }
  const pageWindow = { location: { origin: 'https://test.invalid', href: '' }, dataLayer: [] }
  const response = (body, ok = true) => ({ ok, status: ok ? 200 : 400, json: async () => body })
  const module = { exports: {} }
  const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../app/order/components/CartSheet.tsx'), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  vm.runInNewContext(compiled, {
    exports: module.exports, module, window: pageWindow, console, process: { env: {} },
    localStorage: { setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    setTimeout: (fn, ms) => { const timer = setTimeout(fn, ms); timer.unref(); return timer }, clearTimeout,
    fetch: async (url, options = {}) => {
      const body = options.body ? JSON.parse(options.body) : null
      requests.push({ url, body })
      if (url === '/api/coupon/validate') return response({ valid: true, discount: 188, label: 'Buy 1 Get 1 Free', freeItems: [{ productId: 'curry-500', quantity: 1 }] })
      if (url === '/api/cashfree/create-order') return response({ order_id: 'cf-test', payment_session_id: 'session-test' })
      if (url === '/api/orders/cod') return response(failSave ? { error: 'Test order save failure' } : { id: 'order-test' }, !failSave)
      return response({})
    },
    require(name) {
      if (name === 'react') return hooks
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx }
      if (name === 'lucide-react') return new Proxy({}, { get: (_, key) => key })
      if (name === './AddressSheetV2') return { __esModule: true, default: 'AddressSheet' }
      if (name === '@/lib/analytics-client') return { getAnalyticsDeviceId: () => 'test-device', trackFunnelEvent() {} }
      if (name === '@cashfreepayments/cashfree-js') return { load: async () => ({ checkout: async () => { gatewayCalls++ } }) }
      throw new Error(`Unexpected dependency: ${name}`)
    },
  })
  let props = { open: true, onClose() {}, cart, onUpdateQty() {}, onClear() { clears++ }, user, onLoginRequired() { logins++ }, onOrderPlaced() { confirmations++ }, deliveryFee: 30 }
  function render() { cursor = 0; return module.exports.default(props) }
  function all(tree, predicate) { const found = []; function visit(node) { if (!node || typeof node !== 'object') return; if (Array.isArray(node)) return node.forEach(visit); if (predicate(node)) found.push(node); visit(node.props?.children) } visit(tree); return found }
  function text(node) { if (typeof node === 'string' || typeof node === 'number') return String(node); if (Array.isArray(node)) return node.map(text).join(''); return node?.props ? text(node.props.children) : '' }
  function button(label) { return all(render(), node => node.type === 'button' && text(node).includes(label))[0] }
  const address = { customerName: 'Test Customer', customerPhone: '9000000000', houseNumber: '42', streetAddress: 'Test Road', pincode: '560064', lat: 13.090123, lng: 77.630456 }
  function choosePayment() { button(mode === 'cod' ? 'Cash on Delivery' : 'Online').props.onClick() }
  async function confirmAddress() { const sheet = all(render(), node => node.type === 'AddressSheet')[0]; assert.equal(sheet.props.open, true); sheet.props.onConfirm(address); await new Promise(resolve => setTimeout(resolve, 20)) }
  async function coupon() { const input = all(render(), node => node.type === 'input' && node.props.placeholder === 'Enter coupon code')[0]; input.props.onChange({ target: { value: 'TESTBOGO' } }); await button('Apply').props.onClick() }
  return { requests, storage, pageWindow, render, all, text, button, address, choosePayment, confirmAddress, coupon, setQuantity(quantity) { props = { ...props, cart: [{ ...cart[0], quantity }] } }, counters: () => ({ clears, confirmations, logins, gatewayCalls }) }
}

test('COD submits exact address and product preferences then opens thank-you', async () => {
  const app = checkoutHarness()
  app.choosePayment()
  await app.confirmAddress()
  const order = app.requests.find(request => request.url === '/api/orders/cod').body
  assert.equal(order.payment_status, 'cod')
  assert.equal(order.total_amount, 406)
  assert.equal(order.delivery_address.lat, app.address.lat)
  assert.equal(order.delivery_address.lng, app.address.lng)
  assert.equal(order.items[0].quantity, 2)
  assert.equal(order.items[0].pieceSize, 'Small')
  assert.equal(order.items[0].itemNote, 'Cut preference test')
  assert.match(app.pageWindow.location.href, /thank-you\?cod=1&order_id=order-test/)
  assert.equal(app.counters().confirmations, 1)
})
test('online checkout saves pending order before payment gateway handoff', async () => {
  const app = checkoutHarness({ mode: 'cashfree' })
  app.choosePayment()
  await app.confirmAddress()
  const order = app.requests.find(request => request.url === '/api/orders/cod').body
  assert.equal(order.payment_status, 'pending')
  assert.equal(order.cashfree_order_id, 'cf-test')
  assert.equal(order.delivery_address.lat, app.address.lat)
  assert.equal(app.counters().gatewayCalls, 1)
  assert.equal(app.counters().confirmations, 0)
  assert.equal(JSON.parse(app.storage.get('bf-pending-payment')).realOrderId, 'order-test')
})
test('failed order save cannot redirect to thank-you or clear COD cart', async () => {
  const app = checkoutHarness({ failSave: true })
  app.choosePayment()
  await app.confirmAddress()
  assert.equal(app.pageWindow.location.href, '')
  assert.equal(app.counters().clears, 0)
  assert.equal(app.counters().confirmations, 0)
  assert.ok(app.text(app.render()).includes('Test order save failure'))
})
test('online save failure cannot open payment gateway', async () => {
  const app = checkoutHarness({ mode: 'cashfree', failSave: true })
  app.choosePayment()
  await app.confirmAddress()
  assert.equal(app.counters().gatewayCalls, 0)
  assert.equal(app.counters().clears, 0)
})
test('login is required before address or order submission', () => {
  const app = checkoutHarness({ user: null })
  app.choosePayment()
  assert.equal(app.counters().logins, 1)
  assert.equal(app.requests.length, 0)
})
test('BOGO discount and delivery fee are passed consistently', async () => {
  const app = checkoutHarness()
  await app.coupon()
  app.choosePayment()
  await app.confirmAddress()
  const order = app.requests.find(request => request.url === '/api/orders/cod').body
  assert.equal(order.coupon_code, 'TESTBOGO')
  assert.equal(order.total_amount, 218)
  assert.equal(order.coupon_discount, 188)
})
test('changing quantity removes old coupon discount before checkout', async () => {
  const app = checkoutHarness()
  await app.coupon()
  app.setQuantity(1)
  app.choosePayment()
  await app.confirmAddress()
  const order = app.requests.find(request => request.url === '/api/orders/cod').body
  assert.equal(order.coupon_code, null)
  assert.equal(order.coupon_discount, 0)
  assert.equal(order.total_amount, 218)
})
