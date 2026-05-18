import Image from 'next/image'
import Reveal from './Reveal'
import OrderButton from './OrderButton'
import { PRODUCTS, mergeWithDb, formatPrice, type Product } from '@/lib/products'

async function getProducts(): Promise<Product[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return PRODUCTS
  try {
    const res = await fetch(`${url}/rest/v1/products?select=id,price_per_kg`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: 'no-store',
    })
    if (!res.ok) return PRODUCTS
    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) return PRODUCTS
    return mergeWithDb(data)
  } catch {
    return PRODUCTS
  }
}

export default async function Menu() {
  const products = await getProducts()
  const byId = Object.fromEntries(products.map(p => [p.id, p]))

  return (
    <section className="menu-section" id="menu" aria-labelledby="menu-heading">
      <div className="container">
        <Reveal className="section-header">
          <div className="eyebrow-tag">Product Section</div>
          <h2 className="section-h2" id="menu-heading">Choose Your Perfect Cut</h2>
          <p className="section-sub">Prepared fresh, cut to perfection, and packed with care.</p>
        </Reveal>

        <div className="menu-bento">
          {/* Card 1: Boneless */}
          <Reveal as="article" className="menu-card menu-card--featured" delay={0} id="menu-card-boneless">
            <div className="menu-card-shell">
              <div className="menu-card-core">
                <div className="menu-card-img-wrap">
                  <Image src="/assets/raw_chicken_breast.jpg" alt="Fresh raw chicken breasts from B'LURU FRESH Yelahanka" fill style={{ objectFit: 'cover' }} sizes="(max-width: 768px) 100vw, 40vw" />
                  <div className="menu-card-overlay" />
                </div>
                <div className="menu-card-content">
                  <div className="menu-tag">Lean &amp; Clean</div>
                  <h3 className="menu-card-title">Boneless</h3>
                  <p className="menu-card-desc">Clean boneless cuts trimmed with care for quick cooking, meal prep and restaurant kitchens.</p>
                  <div className="menu-card-footer">
                    <span className="menu-price">{formatPrice(byId['boneless']?.price_per_kg ?? 0)}</span>
                    <OrderButton productId="boneless" productName="Boneless chicken" pricePerKg={byId['boneless']?.price_per_kg ?? 0} />
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Card 2: Curry Cut */}
          <Reveal as="article" className="menu-card" delay={1} id="menu-card-pieces">
            <div className="menu-card-shell">
              <div className="menu-card-core">
                <div className="menu-card-img-wrap menu-card-img-wrap--short">
                  <Image src="/assets/raw_chicken_cuts.jpg" alt="Fresh raw bone-in curry cut chicken pieces" fill style={{ objectFit: 'cover' }} sizes="(max-width: 768px) 100vw, 25vw" />
                  <div className="menu-card-overlay" />
                </div>
                <div className="menu-card-content">
                  <div className="menu-tag">Family Pack</div>
                  <h3 className="menu-card-title">Curry Cut</h3>
                  <p className="menu-card-desc">Bone-in pieces prepared fresh for curries, gravies and home-style meals.</p>
                  <div className="menu-card-footer">
                    <span className="menu-price">{formatPrice(byId['curry-cut']?.price_per_kg ?? 0)}</span>
                    <OrderButton productId="curry-cut" productName="Curry cut chicken" pricePerKg={byId['curry-cut']?.price_per_kg ?? 0} />
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Card 3: Wings */}
          <Reveal as="article" className="menu-card" delay={2} id="menu-card-wings">
            <div className="menu-card-shell menu-card-shell--dark">
              <div className="menu-card-core menu-card-core--dark">
                <div className="menu-card-content">
                  <div className="menu-tag">Fresh Cut</div>
                  <h3 className="menu-card-title menu-card-title--light">Wings</h3>
                  <p className="menu-card-desc menu-card-desc--light">Fresh chicken wings prepared for frying, grilling, roasting and quick snacks.</p>
                  <div className="menu-card-footer">
                    <span className="menu-price menu-price--light">{formatPrice(byId['wings']?.price_per_kg ?? 0)}</span>
                    <OrderButton productId="wings" productName="Chicken wings" pricePerKg={byId['wings']?.price_per_kg ?? 0} dark />
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Card 4: Liver and other */}
          <Reveal as="article" className="menu-card" delay={3} id="menu-card-liver">
            <div className="menu-card-shell">
              <div className="menu-card-core">
                <div className="menu-card-content">
                  <div className="menu-tag">Daily Fresh</div>
                  <h3 className="menu-card-title">Liver and Other</h3>
                  <p className="menu-card-desc">Fresh liver and assorted chicken cuts handled hygienically and packed with care.</p>
                  <div className="menu-card-footer">
                    <span className="menu-price">{formatPrice(byId['liver']?.price_per_kg ?? 0)}</span>
                    <OrderButton productId="liver" productName="Chicken liver and other cuts" pricePerKg={byId['liver']?.price_per_kg ?? 0} />
                  </div>
                </div>
                <div className="tenders-visual" aria-hidden="true">
                  <div className="tender-strip" style={{ ['--tw' as string]: '80px', ['--tl' as string]: '130px', ['--ta' as string]: '-8deg', ['--to' as string]: '0.85' }} />
                  <div className="tender-strip" style={{ ['--tw' as string]: '70px', ['--tl' as string]: '110px', ['--ta' as string]: '5deg',  ['--to' as string]: '0.65' }} />
                  <div className="tender-strip" style={{ ['--tw' as string]: '85px', ['--tl' as string]: '140px', ['--ta' as string]: '-3deg', ['--to' as string]: '0.8'  }} />
                </div>
              </div>
            </div>
          </Reveal>

          {/* Card 5: Drumstick */}
          <Reveal as="article" className="menu-card" delay={4} id="menu-card-drumstick">
            <div className="menu-card-shell">
              <div className="menu-card-core">
                <div className="menu-card-content">
                  <div className="menu-tag">Juicy Cut</div>
                  <h3 className="menu-card-title">Drumstick</h3>
                  <p className="menu-card-desc">Fresh drumsticks cut cleanly for curries, grills and family meals.</p>
                  <div className="menu-card-footer">
                    <span className="menu-price">{formatPrice(byId['drumstick']?.price_per_kg ?? 0)}</span>
                    <OrderButton productId="drumstick" productName="Chicken drumstick" pricePerKg={byId['drumstick']?.price_per_kg ?? 0} />
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
