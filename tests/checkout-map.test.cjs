const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

// Exercise the component's async selection handlers with controlled lookup responses.
function harness(fetch) {
  let cursor = 0
  const slots = []
  const jsx = (type, props) => ({ type, props: props || {} })
  const hooks = {
    useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = initial; return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value }] },
    useRef(initial) { const index = cursor++; if (!(index in slots)) slots[index] = { current: initial }; return slots[index] },
    useCallback(fn) { cursor++; return fn },
    useEffect() { cursor++ },
  }
  const module = { exports: {} }
  const source = fs.readFileSync(path.join(__dirname, '../app/order/components/AddressSheetV2.tsx'), 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  vm.runInNewContext(compiled, {
    exports: module.exports, module, fetch, AbortSignal, setTimeout, console,
    require(name) {
      if (name === 'react') return hooks
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx }
      if (name === './AddressMapPicker') return { __esModule: true, default: 'MapPicker' }
      if (name === 'lucide-react') return new Proxy({}, { get: (_, key) => key })
      throw new Error(name)
    },
  })
  const confirmed = []
  function render() { cursor = 0; return module.exports.default({ open: true, onClose() {}, onConfirm: address => confirmed.push(address) }) }
  function all(tree, predicate) {
    const found = []
    function visit(node) { if (!node || typeof node !== 'object') return; if (Array.isArray(node)) return node.forEach(visit); if (predicate(node)) found.push(node); visit(node.props?.children) }
    visit(tree)
    return found
  }
  function text(node) { if (typeof node === 'string') return node; if (Array.isArray(node)) return node.map(text).join(''); return node?.props ? text(node.props.children) : '' }
  function button(label) { return all(render(), node => node.type === 'button' && text(node).includes(label))[0] }
  function map() { return all(render(), node => node.type === 'MapPicker')[0] }
  return { render, all, text, button, map, confirmed }
}

const tick = () => new Promise(resolve => setTimeout(resolve, 10))
const response = (data, ok = true) => ({ ok, json: async () => data })
const zone = (deliverable = true) => ({ deliverable, radiusKm: 6, distanceKm: 1, center: { lat: 13.088687, lng: 77.629187 } })

test('address lookup outage allows pin confirmation and manual details', async () => {
  const app = harness(async url => url.includes('geocode') ? response({ error: 'No Google address found' }, false) : response(zone()))
  app.button('Away from my location').props.onClick()
  app.map().props.onChange(13.09, 77.63)
  await tick()
  const confirm = app.button('Confirm this location')
  assert.equal(confirm.props.disabled, false)
  confirm.props.onClick()
  assert.ok(app.button('Confirm address'))
})
test('outside radius remains blocked when address lookup fails', async () => {
  const app = harness(async url => url.includes('geocode') ? response({}, false) : response(zone(false)))
  app.button('Away from my location').props.onClick()
  app.map().props.onChange(13.2, 77.63)
  await tick()
  assert.equal(app.button('Confirm this location').props.disabled, true)
})
test('resolved unsupported pincode remains blocked', async () => {
  const app = harness(async (url, options) => {
    if (url.includes('geocode')) return response({ postalCode: '560063', displayName: 'Outside postcode', provider: 'google' })
    const request = JSON.parse(options.body)
    return response({ ...zone(request.pincode !== '560063'), pincodeAllowed: request.pincode !== '560063' })
  })
  app.button('Away from my location').props.onClick()
  app.map().props.onChange(13.09, 77.63)
  await tick()
  assert.equal(app.button('Confirm this location').props.disabled, true)
})
test('old reverse lookup cannot overwrite latest selected pin', async () => {
  let releaseOld
  const app = harness(async (url, options) => {
    const request = JSON.parse(options.body)
    if (!url.includes('geocode')) return response(zone())
    if (request.lat === 13.09) return new Promise(resolve => { releaseOld = resolve })
    return response({ displayName: 'Latest entrance', postalCode: '560064', provider: 'google' })
  })
  app.button('Away from my location').props.onClick()
  app.map().props.onChange(13.09, 77.63)
  app.map().props.onChange(13.10, 77.64)
  await tick()
  releaseOld(response({ displayName: 'Old entrance', postalCode: '560063', provider: 'google' }))
  await tick()
  assert.equal(app.map().props.lat, 13.10)
  assert.equal(app.button('Confirm this location').props.disabled, false)
  assert.ok(app.text(app.render()).includes('Latest entrance'))
  assert.ok(!app.text(app.render()).includes('Old entrance'))
})
test('unavailable delivery validation fails closed', async () => {
  const app = harness(async () => response({}, false))
  app.button('Away from my location').props.onClick()
  app.map().props.onChange(13.09, 77.63)
  await tick()
  assert.equal(app.button('Confirm this location').props.disabled, true)
})

test('manual address checkout preserves exact selected coordinates and validates pincode', async () => {
  const requests = []
  const app = harness(async (url, options) => {
    if (url.includes('geocode')) return response({}, false)
    const body = JSON.parse(options.body)
    requests.push(body)
    return response(zone())
  })
  app.button('Away from my location').props.onClick()
  app.map().props.onChange(13.090123, 77.630456)
  await tick()
  app.button('Confirm this location').props.onClick()
  assert.equal(app.button('Confirm address').props.disabled, true)
  for (const [label, value] of [['Your Name', 'Map Test'], ['House No / Flat / Floor', '42'], ['Street / Area', 'Sample Road'], ['Mobile Number', '9000000000'], ['Pincode', '560064']]) {
    const field = app.all(app.render(), node => node.props?.label === label)[0]
    field.props.children.props.onChange({ target: { value } })
  }
  assert.equal(app.button('Confirm address').props.disabled, false)
  await app.button('Confirm address').props.onClick()
  assert.equal(app.confirmed.length, 1)
  assert.equal(app.confirmed[0].lat, 13.090123)
  assert.equal(app.confirmed[0].lng, 77.630456)
  assert.equal(app.confirmed[0].pincode, '560064')
  assert.equal(requests.at(-1).pincode, '560064')
})

test('search interrupting reverse lookup does not leave confirmation loading', async () => {
  let releaseOld
  const app = harness(async (url, options) => {
    const body = JSON.parse(options.body)
    if (!url.includes('geocode')) return response(zone())
    if (!body.query) return new Promise(resolve => { releaseOld = resolve })
    return response({ lat: 13.1, lng: 77.64, displayName: 'Search result', postalCode: '560064', provider: 'google' })
  })
  app.button('Away from my location').props.onClick()
  app.map().props.onChange(13.09, 77.63)
  const search = app.all(app.render(), node => node.type === 'input' && node.props.type === 'search')[0]
  search.props.onChange({ target: { value: 'Search place' } })
  const searchButton = app.all(app.render(), node => node.props?.['aria-label'] === 'Search location')[0]
  await searchButton.props.onClick()
  releaseOld(response({}, false))
  await tick()
  assert.equal(app.map().props.lat, 13.1)
  assert.equal(app.button('Confirm this location').props.disabled, false)
})
