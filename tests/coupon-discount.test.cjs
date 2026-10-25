const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const vm = require('node:vm')
const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/coupon-discount.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText
const loaded = { exports: {} }
vm.runInNewContext(compiled, { exports: loaded.exports, module: loaded })
const { calculateCouponDiscount } = loaded.exports
const bogo = { discount_type: 'bogo', discount_value: 0, applies_to: 'all', product_ids: [] }
const item = (quantity, productId = 'curry-500', pricePerKg = 188) => ({ productId, pricePerKg, quantity })
for (const [quantity, expected] of [[2, 188], [3, 188], [4, 376], [5, 376]]) {
  test(`BOGO for ${quantity} packs discounts ${expected}`, () => assert.equal(calculateCouponDiscount(bogo, [item(quantity)], 40).discount, expected))
}
test('one pack cannot receive a free-pack discount', () => assert.throws(() => calculateCouponDiscount(bogo, [item(1)]), /Add 2 packs/))
test('different pack sizes cannot be paired', () => assert.throws(() => calculateCouponDiscount(bogo, [item(1), item(1, 'curry-1kg', 340)]), /Add 2 packs/))
test('products pair independently', () => assert.equal(calculateCouponDiscount(bogo, [item(3), item(2, 'biryani', 340)]).discount, 528))
test('specific coupon excludes other products', () => assert.equal(calculateCouponDiscount({ ...bogo, applies_to: 'specific', product_ids: ['curry-500'] }, [item(2), item(4, 'biryani', 340)]).discount, 188))
test('split lines are paired per product', () => assert.equal(calculateCouponDiscount(bogo, [item(1), item(1)]).discount, 188))
test('inconsistent prices rejected', () => assert.throws(() => calculateCouponDiscount(bogo, [item(1), item(1, 'curry-500', 999)]), /prices have changed/))
for (const quantity of [0, -1, 1.5, NaN, Infinity]) {
  test(`invalid quantity ${quantity} rejected`, () => assert.throws(() => calculateCouponDiscount(bogo, [item(quantity)]), /whole pack/))
}
test('percentage coupon preserves delivery-inclusive total', () => assert.equal(calculateCouponDiscount({ ...bogo, discount_type: 'percent', discount_value: 10 }, [item(2)], 24).discount, 40))
test('fixed coupon capped at eligible subtotal', () => assert.equal(calculateCouponDiscount({ ...bogo, discount_type: 'fixed', discount_value: 500 }, [item(2)]).discount, 376))
test('free pack metadata', () => {
  const result = calculateCouponDiscount(bogo, [item(4)])
  assert.equal(result.freeItems[0].productId, 'curry-500')
  assert.equal(result.freeItems[0].quantity, 2)
  assert.match(result.label, /2 free packs/)
})

function loadCatalog(fetch) {
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/coupon-catalog.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const target = { exports: {} }
  vm.runInNewContext(source, { exports: target.exports, module: target, fetch, AbortSignal, process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://test.invalid', SUPABASE_SERVICE_ROLE_KEY: 'test' } } })
  return target.exports.validateBogoPrices
}
test('catalog uses homepage selling-price rounding', async () => {
  const validate = loadCatalog(async () => ({ ok: true, json: async () => [{ id: 'curry-500', price_per_kg: 250.67, discount_percentage: 25 }] }))
  await validate([item(2)])
})
test('modified client price is rejected', async () => {
  const validate = loadCatalog(async () => ({ ok: true, json: async () => [{ id: 'curry-500', price_per_kg: 250.67, discount_percentage: 25 }] }))
  await assert.rejects(validate([item(2, 'curry-500', 1)]), /prices have changed/)
})
test('catalog outage does not grant unchecked discount', async () => {
  const validate = loadCatalog(async () => ({ ok: false }))
  await assert.rejects(validate([item(2)]), /Could not verify/)
})
