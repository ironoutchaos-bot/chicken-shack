const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

function harness() {
  let cursor = 0, googleCount = 0, leafletCount = 0
  const slots = [], pending = [], changes = [], scripts = [], timers = new Map(), listeners = new Map()
  const container = { replaceChildren() {}, closest: () => ({ classList: { add() {}, remove() {} } }) }
  const leaflet = { events: {}, center: { lat: 13.09, lng: 77.63, distanceTo: () => 0 }, setView(point) { if (Array.isArray(point)) this.center = { ...this.center, lat: point[0], lng: point[1] }; return this }, on(name, fn) { this.events[name] = fn }, getCenter() { return this.center }, getZoom: () => 17, panTo() {}, remove() {}, invalidateSize() {} }
  const maps = { Map: class { constructor() { googleCount++ } addListener() {} getCenter() { return { lat: () => 13.09, lng: () => 77.63 } } }, event: { clearInstanceListeners() {} } }
  const page = {
    addEventListener(name, fn) { listeners.set(name, fn) }, removeEventListener(name) { listeners.delete(name) }, dispatchEvent(event) { listeners.get(event.type)?.() },
    setTimeout(fn) { const id = timers.size + 1; timers.set(id, fn); return id }, clearTimeout(id) { timers.delete(id) },
  }
  const jsx = (type, props) => { if (props?.ref && type === 'div') props.ref.current = container; return { type, props: props || {} } }
  const hooks = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = value }] },
    useRef(initial) { const i = cursor++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i] },
    useEffect(fn, deps) { const i = cursor++; const old = slots[i]; if (!old || deps.some((dep, index) => dep !== old.deps[index])) { pending.push(() => { old?.cleanup?.(); slots[i] = { deps, cleanup: fn() } }) } },
  }
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../app/order/components/AddressMapPicker.tsx'), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  const module = { exports: {} }
  vm.runInNewContext(source, {
    module, exports: module.exports, window: page, Event: class { constructor(type) { this.type = type } }, URLSearchParams, setTimeout: fn => { fn(); return 1 },
    document: { createElement: () => ({}), head: { appendChild: script => scripts.push(script) } },
    process: { env: { NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: 'test-key' } },
    require(name) {
      if (name === 'react') return hooks
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx }
      if (name === 'leaflet') return { __esModule: true, map: () => { leafletCount++; return leaflet }, control: { zoom: () => ({ addTo() {} }) }, tileLayer: () => ({ addTo() {} }) }
      throw new Error(name)
    },
  })
  function render() { cursor = 0; const tree = module.exports.default({ lat: 13.09, lng: 77.63, onChange: (lat, lng) => changes.push({ lat, lng }) }); while (pending.length) pending.shift()(); return tree }
  return { render, scripts, timers, page, maps, leaflet, changes, counts: () => ({ googleCount, leafletCount }) }
}
const tick = () => new Promise(resolve => setTimeout(resolve, 10))

test('Google script network failure loads alternate map', async () => {
  const app = harness(); app.render(); app.scripts[0].onerror(); await tick(); app.render(); await tick()
  assert.equal(app.counts().googleCount, 0)
  assert.equal(app.counts().leafletCount, 1)
})
test('Google key rejection after script load switches an existing map', async () => {
  const app = harness(); app.render(); app.page.google = { maps: app.maps }; app.scripts[0].onload(); await tick()
  assert.equal(app.counts().googleCount, 1)
  app.page.gm_authFailure(); app.render(); await tick()
  assert.equal(app.counts().leafletCount, 1)
})
test('Google script timeout loads alternate map', async () => {
  const app = harness(); app.render(); [...app.timers.values()][0](); await tick(); app.render(); await tick()
  assert.equal(app.counts().leafletCount, 1)
})
test('alternate map click preserves exact coordinates', async () => {
  const app = harness(); app.render(); app.scripts[0].onerror(); await tick(); app.render(); await tick()
  app.leaflet.events.click({ latlng: { lat: 13.091234, lng: 77.631234 } })
  assert.equal(app.changes.length, 1)
  assert.equal(app.changes[0].lat, 13.091234)
  assert.equal(app.changes[0].lng, 77.631234)
})
