'use client'

import { useState } from 'react'

/* ============================================================
   TASTE THE DIFFERENCE — American Kitchen landing (/taste)
   Faithful rebuild of the reference design.
   Palette : red #E53228 · cream #FBF1E0 · orange #F5A11E · ink #1E1B18
   Type    : Anton (condensed display) × Poppins (UI / body)
   Fully responsive — desktop and mobile match the reference.
============================================================ */

/* ---- Imagery (Unsplash, self-hosted-friendly via images.unoptimized) ---- */
const IMG = {
  // Hero food — appetizing shots, tightly radial-masked so the food fills the
  // frame and the darker corners dissolve into the cream (floating cut-out look).
  heroBurger:
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900&q=80&auto=format&fit=crop',
  pizza:
    'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&q=80&auto=format&fit=crop',
  wrap:
    'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=500&q=80&auto=format&fit=crop',
  splChicken:
    'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=400&q=80&auto=format&fit=crop',
  chicken:
    'https://images.unsplash.com/photo-1562967914-608f82629710?w=400&q=80&auto=format&fit=crop',
  bruschetta:
    'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=400&q=80&auto=format&fit=crop',
  burgerCard:
    'https://images.unsplash.com/photo-1550547660-d9450f859349?w=400&q=80&auto=format&fit=crop',
  quesadilla:
    'https://images.unsplash.com/photo-1618040996337-56904b7850b9?w=400&q=80&auto=format&fit=crop',
  flavorFood:
    'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=700&q=80&auto=format&fit=crop',
  flavorRoom:
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&q=80&auto=format&fit=crop',
  dishBurger:
    'https://images.unsplash.com/photo-1571091655789-405eb7a3a3a8?w=600&q=80&auto=format&fit=crop',
  chef1:
    'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=400&q=80&auto=format&fit=crop',
  chef2:
    'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400&q=80&auto=format&fit=crop',
  chef3:
    'https://images.unsplash.com/photo-1595475207225-428b62bda831?w=400&q=80&auto=format&fit=crop',
  chef4:
    'https://images.unsplash.com/photo-1607631568010-a87245c0daf8?w=400&q=80&auto=format&fit=crop',
}

/* ---- Small inline icons (line style, matches reference) ---- */
const Icon = {
  quality: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.4 7.2 17.9l.9-5.4L4.2 8.7l5.4-.8z" />
    </svg>
  ),
  fresh: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21c6-2 9-7 9-13 0-2-.5-4-.5-4s-3.5.5-6 2.5C11 9 9 12 9 16" />
      <path d="M4 21c0-6 3-9 6-11" />
    </svg>
  ),
  chef: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 21h10M8 21v-5h8v5M6 11a4 4 0 018-.5A3.5 3.5 0 1118 11v2H6z" />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
  cart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" />
      <path d="M2 3h3l2.4 12.4a1.5 1.5 0 001.5 1.2h8.2a1.5 1.5 0 001.5-1.2L21 7H6" />
    </svg>
  ),
  chat: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a8 8 0 01-11.6 7.1L3 20l1-6A8 8 0 1121 12z" />
    </svg>
  ),
  arrow: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  ),
  star: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2.4 6.9H21l-5.3 3.9 2 6.9L12 15.6 6.3 19.7l2-6.9L3 8.9h6.6z" />
    </svg>
  ),
}

const menuLinks = ['HOME', 'OUR MENUS', 'ABOUT', 'BLOGS', 'OFFERS', 'CONTACT US']

const features = [
  { icon: Icon.quality, label: 'QUALITY PRODUCT' },
  { icon: Icon.fresh, label: 'FRESH FOOD' },
  { icon: Icon.chef, label: 'BEST CHEF' },
  { icon: Icon.clock, label: '24/7 SERVICE' },
]

const dishes = [
  { name: 'SPL. CHICKEN', img: IMG.splChicken },
  { name: 'PIZZA', img: IMG.pizza },
  { name: 'CHICKEN', img: IMG.chicken },
  { name: 'BRUSCHETTA', img: IMG.bruschetta },
  { name: 'BURGER', img: IMG.burgerCard, featured: true },
  { name: 'QUESADILLA', img: IMG.quesadilla },
]

const popularMenu = [
  { name: 'Cheeseburger', desc: 'Beef · cheddar · pickles', price: '$8.50' },
  { name: 'Spicy Wrap', desc: 'Grilled chicken · jalapeño', price: '$6.20' },
  { name: 'Loaded Fries', desc: 'Cheese · bacon · herbs', price: '$4.80' },
  { name: 'Margherita', desc: 'Tomato · mozzarella · basil', price: '$9.00' },
  { name: 'Chicken Wings', desc: 'Smoky BBQ glaze · 8 pcs', price: '$7.40' },
  { name: 'Quesadilla', desc: 'Chicken · peppers · salsa', price: '$6.90' },
]

const chefs = [
  { name: 'Marcus Reed', role: 'Head Chef', img: IMG.chef1 },
  { name: 'Elena Ross', role: 'Grill Master', img: IMG.chef2, dark: true },
  { name: 'David Cole', role: 'Sous Chef', img: IMG.chef3 },
  { name: 'Sara Lin', role: 'Pastry Chef', img: IMG.chef4 },
]

const stats = [
  { n: '215', l: 'FOOD ITEMS' },
  { n: '5K', l: 'HAPPY CUSTOMERS' },
  { n: '336', l: 'DAILY ORDERS' },
  { n: '22', l: 'EXPERT CHEFS' },
]

export default function TastePage() {
  const [open, setOpen] = useState(false)

  return (
    <div className="tt">
      <style>{css}</style>

      {/* ---------------- NAVBAR ---------------- */}
      <header className="tt-nav-wrap">
        <nav className="tt-nav">
          <button className="tt-btn tt-btn-sm">ORDER NOW</button>

          <ul className="tt-links tt-links-left">
            {menuLinks.slice(0, 3).map((l) => (
              <li key={l}><a href="#">{l}</a></li>
            ))}
          </ul>

          <div className="tt-logo" aria-label="Burger logo">
            <span>BURGER</span>
          </div>

          <ul className="tt-links tt-links-right">
            {menuLinks.slice(3).map((l) => (
              <li key={l}><a href="#">{l}</a></li>
            ))}
          </ul>

          <button className="tt-btn tt-btn-sm tt-chat">
            {Icon.chat} CHAT NOW
          </button>

          <button
            className="tt-burger-toggle"
            aria-label="Menu"
            onClick={() => setOpen((v) => !v)}
          >
            <span /><span /><span />
          </button>
        </nav>

        {open && (
          <ul className="tt-mobile-menu">
            {menuLinks.map((l) => (
              <li key={l}><a href="#" onClick={() => setOpen(false)}>{l}</a></li>
            ))}
          </ul>
        )}
      </header>

      {/* ---------------- HERO ---------------- */}
      <section className="tt-hero">
        <span className="tt-deco tt-deco-1">🌶️</span>
        <span className="tt-deco tt-deco-2">🍅</span>
        <span className="tt-deco tt-deco-3">🌿</span>
        <span className="tt-deco tt-deco-4">🌶️</span>
        <span className="tt-deco tt-deco-5">🧄</span>

        <div className="tt-hero-top">
          <span className="tt-pill">WELCOME TO AMERICAN KITCHEN</span>
          <h1 className="tt-hero-title">
            <span className="tt-fill">TASTE THE</span>
            <span className="tt-outline">DIFFERENCE</span>
          </h1>
        </div>

        <div className="tt-hero-stage">
          <img className="tt-hero-cutout" src="/taste/chicken.png" alt="Fresh chicken cuts" />
        </div>
      </section>

      {/* ---------------- WHY CHOOSE US ---------------- */}
      <section className="tt-why">
        <span className="tt-tag">WHY CHOOSE US</span>
        <h2 className="tt-h2 tt-red">
          SAVOR THE JOURNEY,<br />DISCOVER THE DELIGHT
        </h2>
        <p className="tt-lead">
          The mouth-watering aroma of sizzling creations now fills the streets of
          our kitchen, thanks to the passionate pursuit of three brothers. With
          over 65 years of combined experience in the culinary world, they
          embarked on a flavorful journey to craft the ultimate burger experience.
        </p>

        <div className="tt-features">
          {features.map((f) => (
            <div className="tt-feature" key={f.label}>
              <div className="tt-feature-ic">{f.icon}</div>
              <span>{f.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- POPULAR DISHES ---------------- */}
      <section className="tt-dishes-wrap">
        <div className="tt-dishes-ticker">POPULAR DISHES · POPULAR DISHES · POPULAR DISHES ·</div>
        <div className="tt-dishes">
          {dishes.map((d) => (
            <article className={`tt-dish ${d.featured ? 'tt-dish-feat' : ''}`} key={d.name}>
              <div className="tt-dish-img">
                <img src={d.img} alt={d.name} />
              </div>
              <h3>{d.name}</h3>
            </article>
          ))}
        </div>
      </section>

      {/* ---------------- A WORLD OF FLAVORS ---------------- */}
      <section className="tt-flavors">
        <div className="tt-flavors-media">
          <img className="tt-flavors-food" src={IMG.flavorFood} alt="Flavorful burger" />
          <img className="tt-flavors-room" src={IMG.flavorRoom} alt="Our restaurant" />
        </div>
        <div className="tt-flavors-copy">
          <h2 className="tt-h2 tt-red">A WORLD OF FLAVORS<br />IN EVERY BITE.</h2>
          <p className="tt-lead">
            We are lucky to live in a glorious age that gives us everything we
            could ask for as a human race. What more could you need when you have
            mixed covered in cheese nestled between bread, rich smashed patties at
            our shack, or a little something for everyone. Some burgers are humble.
          </p>
          <ul className="tt-checks">
            <li><i>✓</i> Receive Party Bookings</li>
            <li><i>✓</i> Gift Vouchers</li>
            <li><i>✓</i> 100% Local Ingredients</li>
            <li><i>✓</i> New Season New Food</li>
          </ul>
          <button className="tt-btn tt-btn-lg">READ MORE</button>
        </div>
      </section>

      {/* ---------------- MOST POPULAR DISHES (menu) ---------------- */}
      <section className="tt-menu">
        <div className="tt-menu-card">
          <h2 className="tt-h2 tt-menu-title">Our Most Popular Dishes</h2>
          <div className="tt-menu-grid">
            {popularMenu.map((m) => (
              <div className="tt-menu-item" key={m.name}>
                <div className="tt-menu-thumb" />
                <div className="tt-menu-info">
                  <div className="tt-menu-row">
                    <span className="tt-menu-name">{m.name}</span>
                    <span className="tt-menu-price">{m.price}</span>
                  </div>
                  <p>{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <img className="tt-menu-hero" src={IMG.dishBurger} alt="Popular dish" />
      </section>

      {/* ---------------- EXPERT CHEFS ---------------- */}
      <section className="tt-chefs">
        <h2 className="tt-h2 tt-red">MEET OUR<br />EXPERT CHEFS</h2>
        <div className="tt-chef-grid">
          {chefs.map((c) => (
            <article className={`tt-chef ${c.dark ? 'tt-chef-dark' : ''}`} key={c.name}>
              <div className="tt-chef-img"><img src={c.img} alt={c.name} /></div>
              <h4>{c.name}</h4>
              <span>{c.role}</span>
            </article>
          ))}
        </div>

        <div className="tt-stats">
          {stats.map((s, i) => (
            <div className="tt-stat" key={s.l}>
              <strong>{s.n}</strong>
              <span>{s.l}</span>
              {i < stats.length - 1 && <em className="tt-stat-div" />}
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- JOIN FOR HOT OFFERS ---------------- */}
      <section className="tt-offers">
        <div className="tt-offers-card">
          <div className="tt-offers-copy">
            <h2 className="tt-h2">JOIN FOR<br />HOT OFFERS</h2>
            <p>Subscribe and be the first to grab our sizzling weekly deals,
              secret menu drops and members-only discounts.</p>
            <form className="tt-offers-form" onSubmit={(e) => e.preventDefault()}>
              <input type="email" placeholder="Enter your email" />
              <button className="tt-btn">SUBSCRIBE {Icon.arrow}</button>
            </form>
          </div>
          <span className="tt-offers-deco">🍔</span>
        </div>
      </section>

      {/* ---------------- FOOTER ---------------- */}
      <footer className="tt-footer">
        <div className="tt-foot-grid">
          <div className="tt-foot-brand">
            <div className="tt-logo tt-logo-foot"><span>BURGER</span></div>
            <p>Serving the ultimate burger experience since day one. Taste the
              difference in every single bite.</p>
          </div>
          <div>
            <h5>QUICK LINKS</h5>
            <a href="#">Home</a><a href="#">Our Menus</a>
            <a href="#">About Us</a><a href="#">Contact</a>
          </div>
          <div>
            <h5>MENU</h5>
            <a href="#">Burgers</a><a href="#">Pizza</a>
            <a href="#">Chicken</a><a href="#">Sides</a>
          </div>
          <div>
            <h5>CONTACT</h5>
            <a href="#">+1 (555) 234-9090</a>
            <a href="#">hello@tastediff.com</a>
            <a href="#">123 Kitchen St, USA</a>
          </div>
        </div>
        <div className="tt-foot-bottom">
          <span>© 2026 Taste the Difference. All rights reserved.</span>
          <div className="tt-foot-stars">
            {Icon.star}{Icon.star}{Icon.star}{Icon.star}{Icon.star}
          </div>
        </div>
      </footer>
    </div>
  )
}

/* =====================================================================
   STYLES
===================================================================== */
const css = `
.tt{
  --red:#E53228; --red-dk:#C6261D; --red-deep:#A81C15;
  --cream:#FBF1E0; --cream-2:#F6E7CE; --cream-3:#FDF7EC;
  --ink:#1E1B18; --muted:#6b625a;
  --orange:#F5A11E; --orange-2:#F7B43C; --yellow:#FFC93C;
  --white:#ffffff;
  --disp:var(--font-anton),"Arial Narrow",sans-serif;
  --body:var(--font-poppins),system-ui,sans-serif;

  font-family:var(--body);
  color:var(--ink);
  background:var(--cream);
  overflow-x:hidden;
  -webkit-font-smoothing:antialiased;
  line-height:1.55;
}
.tt *{box-sizing:border-box;}
.tt img{max-width:100%;display:block;}
.tt a{color:inherit;text-decoration:none;}

/* ---------- shared bits ---------- */
.tt-h2{
  font-family:var(--disp);
  font-weight:400;
  letter-spacing:.5px;
  line-height:.98;
  text-transform:uppercase;
  font-size:clamp(1.9rem,4.4vw,3.4rem);
}
.tt-red{color:var(--red);}
.tt-lead{
  color:var(--muted);
  max-width:640px;
  font-size:.95rem;
  line-height:1.7;
}
.tt-tag{
  display:inline-block;
  background:var(--red);
  color:#fff;
  font-weight:700;
  font-size:.7rem;
  letter-spacing:2px;
  padding:.4rem 1.1rem;
  border-radius:999px;
  text-transform:uppercase;
}
.tt-btn{
  display:inline-flex;align-items:center;gap:.5rem;
  background:var(--red);color:#fff;border:none;cursor:pointer;
  font-family:var(--body);font-weight:700;font-size:.8rem;letter-spacing:.6px;
  padding:.8rem 1.5rem;border-radius:999px;text-transform:uppercase;
  transition:transform .18s ease,background .18s ease;
}
.tt-btn:hover{background:var(--red-dk);transform:translateY(-2px);}
.tt-btn svg{width:16px;height:16px;}
.tt-btn-sm{padding:.55rem 1.1rem;font-size:.68rem;}
.tt-btn-lg{padding:.95rem 2rem;font-size:.85rem;}

/* ---------- navbar ---------- */
.tt-nav-wrap{position:sticky;top:0;z-index:50;padding:1rem;}
.tt-nav{
  max-width:1180px;margin:0 auto;
  background:var(--white);
  border-radius:999px;
  box-shadow:0 12px 34px rgba(30,20,10,.10);
  display:flex;align-items:center;gap:.5rem;
  padding:.5rem .7rem;
}
.tt-links{display:flex;list-style:none;gap:1.4rem;align-items:center;}
.tt-links a{
  font-size:.72rem;font-weight:600;letter-spacing:1px;
  color:var(--ink);transition:color .15s;white-space:nowrap;
}
.tt-links a:hover{color:var(--red);}
.tt-links-left{margin-left:1.2rem;}
.tt-links-right{margin-right:auto;}
.tt-chat{margin-left:auto;}
.tt-logo{
  width:64px;height:64px;flex:0 0 auto;
  border-radius:50%;
  background:radial-gradient(circle at 50% 35%,var(--red) 0%,var(--red-deep) 100%);
  border:3px solid var(--yellow);
  display:grid;place-items:center;
  box-shadow:0 6px 16px rgba(197,38,29,.4);
  margin:-16px .3rem;
}
.tt-logo span{
  font-family:var(--disp);color:#fff;font-size:.72rem;letter-spacing:1px;
  transform:translateY(1px);
}
.tt-burger-toggle{display:none;flex-direction:column;gap:4px;background:none;border:none;
  cursor:pointer;padding:.5rem;margin-left:auto;}
.tt-burger-toggle span{width:22px;height:2.5px;background:var(--ink);border-radius:2px;}
.tt-mobile-menu{
  list-style:none;max-width:1180px;margin:.6rem auto 0;background:#fff;
  border-radius:20px;padding:.6rem;box-shadow:0 12px 34px rgba(30,20,10,.12);
}
.tt-mobile-menu li a{display:block;padding:.7rem 1rem;font-weight:600;font-size:.8rem;
  letter-spacing:.5px;border-radius:12px;}
.tt-mobile-menu li a:hover{background:var(--cream);color:var(--red);}

/* ---------- hero ---------- */
.tt-hero{
  position:relative;max-width:1180px;margin:0 auto;
  padding:1.5rem 1.5rem 0;text-align:center;overflow:hidden;
}
.tt-hero-top{position:relative;z-index:3;}
.tt-pill{
  display:inline-block;background:var(--red);color:#fff;
  font-weight:700;font-size:.72rem;letter-spacing:3px;
  padding:.45rem 1.3rem;border-radius:999px;text-transform:uppercase;
  margin-bottom:.6rem;
}
.tt-hero-title{
  font-family:var(--disp);text-transform:uppercase;font-weight:400;
  line-height:.86;letter-spacing:1px;
  font-size:clamp(3.2rem,12vw,8.5rem);
}
.tt-hero-title span{display:block;}
.tt-fill{color:var(--red);}
.tt-outline{
  color:transparent;-webkit-text-stroke:2.5px var(--red);
}
.tt-hero-stage{
  position:relative;z-index:2;margin-top:-5rem;
  display:flex;align-items:flex-start;justify-content:center;
}
/* True transparent PNG — floats directly on the cream, no masking needed. */
.tt-hero-cutout{
  height:clamp(360px,62vh,660px);width:auto;
  filter:drop-shadow(0 30px 34px rgba(30,20,10,.28));
}
.tt-deco{position:absolute;font-size:clamp(1.4rem,3vw,2.6rem);opacity:.85;z-index:1;
  filter:drop-shadow(0 6px 10px rgba(0,0,0,.12));}
.tt-deco-1{top:14%;left:5%;transform:rotate(-20deg);}
.tt-deco-2{top:8%;right:9%;}
.tt-deco-3{top:42%;left:2%;transform:rotate(15deg);}
.tt-deco-4{bottom:20%;right:4%;transform:rotate(30deg);}
.tt-deco-5{top:30%;right:2%;}

/* ---------- why choose us ---------- */
.tt-why{max-width:820px;margin:0 auto;padding:3.5rem 1.5rem 1rem;text-align:center;
  display:flex;flex-direction:column;align-items:center;gap:1rem;}
.tt-features{
  display:flex;gap:2.5rem;flex-wrap:wrap;justify-content:center;margin-top:1.5rem;
}
.tt-feature{display:flex;flex-direction:column;align-items:center;gap:.7rem;width:120px;}
.tt-feature-ic{
  width:74px;height:74px;border-radius:50%;
  border:1.5px dashed var(--red);
  display:grid;place-items:center;color:var(--red);
  background:var(--cream-3);
}
.tt-feature-ic svg{width:32px;height:32px;}
.tt-feature span{font-family:var(--disp);font-size:.8rem;letter-spacing:.5px;
  text-transform:uppercase;}

/* ---------- popular dishes ---------- */
.tt-dishes-wrap{position:relative;padding:2.5rem 0 3.5rem;overflow:hidden;}
.tt-dishes-ticker{
  font-family:var(--disp);text-transform:uppercase;
  font-size:clamp(2.5rem,7vw,5rem);color:transparent;
  -webkit-text-stroke:1px rgba(197,38,29,.13);
  white-space:nowrap;text-align:center;
  position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
  pointer-events:none;user-select:none;width:200%;
}
.tt-dishes{
  position:relative;z-index:2;max-width:1180px;margin:0 auto;padding:0 1.5rem;
  display:grid;grid-template-columns:repeat(6,1fr);gap:1rem;align-items:end;
}
.tt-dish{
  background:#fff;border-radius:18px;padding:1.4rem 1rem 1.2rem;text-align:center;
  box-shadow:0 14px 30px rgba(30,20,10,.08);
  display:flex;flex-direction:column;align-items:center;gap:1rem;
  transition:transform .2s ease;
}
.tt-dish:hover{transform:translateY(-6px);}
.tt-dish-img{width:96px;height:96px;border-radius:50%;overflow:hidden;
  box-shadow:0 10px 22px rgba(30,20,10,.18);}
.tt-dish-img img{width:100%;height:100%;object-fit:cover;}
.tt-dish h3{font-family:var(--disp);font-size:.85rem;letter-spacing:.5px;
  text-transform:uppercase;}
.tt-dish-feat{
  background:var(--red);color:#fff;transform:translateY(-14px);
  box-shadow:0 22px 44px rgba(197,38,29,.35);
}
.tt-dish-feat:hover{transform:translateY(-20px);}

/* ---------- flavors ---------- */
.tt-flavors{
  max-width:1120px;margin:1rem auto;padding:2.5rem 1.5rem;
  display:grid;grid-template-columns:1fr 1fr;gap:3rem;align-items:center;
}
.tt-flavors-media{position:relative;min-height:380px;}
.tt-flavors-food{
  width:70%;aspect-ratio:3/4;object-fit:cover;border-radius:20px;
  box-shadow:0 26px 50px rgba(30,20,10,.22);
}
.tt-flavors-room{
  position:absolute;right:0;bottom:0;width:52%;aspect-ratio:1;object-fit:cover;
  border-radius:20px;border:6px solid var(--cream);
  box-shadow:0 20px 40px rgba(30,20,10,.2);
}
.tt-flavors-copy{display:flex;flex-direction:column;gap:1.2rem;align-items:flex-start;}
.tt-checks{list-style:none;display:grid;grid-template-columns:1fr 1fr;gap:.6rem 1.5rem;
  width:100%;}
.tt-checks li{display:flex;align-items:center;gap:.5rem;font-size:.85rem;font-weight:500;}
.tt-checks i{
  width:20px;height:20px;border-radius:50%;background:var(--red);color:#fff;
  display:grid;place-items:center;font-size:.65rem;font-style:normal;flex:0 0 auto;
}

/* ---------- popular menu ---------- */
.tt-menu{
  position:relative;background:linear-gradient(120deg,var(--orange) 0%,var(--orange-2) 100%);
  padding:3.5rem 1.5rem;overflow:hidden;
}
.tt-menu-card{
  max-width:760px;margin:0 auto;background:#fff;border-radius:22px;
  padding:2rem;box-shadow:0 26px 55px rgba(120,70,0,.25);
}
.tt-menu-title{color:var(--red);font-size:clamp(1.6rem,3.5vw,2.4rem);margin-bottom:1.4rem;}
.tt-menu-grid{display:grid;grid-template-columns:1fr 1fr;gap:1.1rem 2rem;}
.tt-menu-item{display:flex;gap:.9rem;align-items:center;}
.tt-menu-thumb{
  width:52px;height:52px;border-radius:12px;flex:0 0 auto;
  background:linear-gradient(135deg,var(--cream-2),var(--orange-2));
}
.tt-menu-info{flex:1;min-width:0;}
.tt-menu-row{display:flex;justify-content:space-between;align-items:baseline;gap:.5rem;}
.tt-menu-name{font-weight:700;font-size:.9rem;}
.tt-menu-price{font-family:var(--disp);color:var(--red);font-size:1rem;}
.tt-menu-info p{color:var(--muted);font-size:.75rem;margin-top:.1rem;}
.tt-menu-hero{
  position:absolute;right:-40px;bottom:-40px;width:230px;height:230px;
  object-fit:cover;border-radius:50%;opacity:.9;
  box-shadow:0 20px 50px rgba(120,70,0,.35);
}

/* ---------- chefs ---------- */
.tt-chefs{max-width:1120px;margin:0 auto;padding:4rem 1.5rem;text-align:center;
  display:flex;flex-direction:column;align-items:center;gap:2rem;}
.tt-chef-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1.4rem;width:100%;}
.tt-chef{background:#fff;border-radius:18px;padding:1.2rem;
  box-shadow:0 14px 30px rgba(30,20,10,.08);}
.tt-chef-dark{background:var(--red);color:#fff;}
.tt-chef-img{width:100%;aspect-ratio:1;border-radius:14px;overflow:hidden;margin-bottom:.9rem;}
.tt-chef-img img{width:100%;height:100%;object-fit:cover;}
.tt-chef h4{font-family:var(--disp);font-size:1rem;letter-spacing:.5px;}
.tt-chef span{font-size:.75rem;color:var(--muted);}
.tt-chef-dark span{color:rgba(255,255,255,.85);}
.tt-stats{
  display:flex;justify-content:center;align-items:center;flex-wrap:wrap;
  background:var(--red);border-radius:18px;color:#fff;width:100%;
  padding:1.6rem 1rem;gap:1rem;
}
.tt-stat{position:relative;flex:1;min-width:120px;display:flex;flex-direction:column;
  align-items:center;gap:.2rem;}
.tt-stat strong{font-family:var(--disp);font-size:2rem;font-weight:400;}
.tt-stat span{font-size:.66rem;letter-spacing:1.5px;opacity:.9;}
.tt-stat-div{position:absolute;right:0;top:50%;transform:translateY(-50%);
  width:1px;height:40px;background:rgba(255,255,255,.3);}

/* ---------- offers ---------- */
.tt-offers{padding:2rem 1.5rem 4rem;max-width:1120px;margin:0 auto;}
.tt-offers-card{
  position:relative;overflow:hidden;
  background:radial-gradient(circle at 80% 20%,var(--red-dk),var(--red-deep));
  border-radius:26px;padding:3rem;color:#fff;
}
.tt-offers-copy{max-width:560px;position:relative;z-index:2;}
.tt-offers-card h2{color:#fff;margin-bottom:.7rem;}
.tt-offers-copy p{opacity:.9;font-size:.9rem;margin-bottom:1.4rem;max-width:440px;}
.tt-offers-form{display:flex;gap:.6rem;flex-wrap:wrap;}
.tt-offers-form input{
  flex:1;min-width:220px;border:none;border-radius:999px;padding:.85rem 1.3rem;
  font-family:var(--body);font-size:.9rem;
}
.tt-offers-form .tt-btn{background:var(--yellow);color:var(--ink);}
.tt-offers-form .tt-btn:hover{background:var(--orange-2);}
.tt-offers-deco{
  position:absolute;right:-10px;bottom:-30px;font-size:15rem;line-height:1;opacity:.28;
  transform:rotate(-12deg);
}

/* ---------- footer ---------- */
.tt-footer{background:var(--red-deep);color:#fff;padding:3rem 1.5rem 1.5rem;}
.tt-foot-grid{
  max-width:1120px;margin:0 auto;display:grid;
  grid-template-columns:1.6fr 1fr 1fr 1fr;gap:2rem;
}
.tt-logo-foot{margin:0 0 1rem;}
.tt-foot-brand p{opacity:.8;font-size:.85rem;max-width:280px;}
.tt-foot-grid h5{font-family:var(--disp);font-size:.9rem;letter-spacing:1px;margin-bottom:.9rem;}
.tt-foot-grid a{display:block;opacity:.8;font-size:.83rem;padding:.28rem 0;transition:opacity .15s;}
.tt-foot-grid a:hover{opacity:1;color:var(--yellow);}
.tt-foot-bottom{
  max-width:1120px;margin:2rem auto 0;padding-top:1.4rem;
  border-top:1px solid rgba(255,255,255,.15);
  display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;
  font-size:.78rem;opacity:.85;
}
.tt-foot-stars{display:flex;gap:.2rem;color:var(--yellow);}
.tt-foot-stars svg{width:16px;height:16px;}

/* =========================================================
   RESPONSIVE
========================================================= */
@media(max-width:960px){
  .tt-links,.tt-chat{display:none;}
  .tt-burger-toggle{display:flex;}
  .tt-nav{border-radius:22px;justify-content:space-between;}
  .tt-logo{margin:-10px 0;order:-1;}
  .tt-dishes{grid-template-columns:repeat(3,1fr);}
  .tt-flavors{grid-template-columns:1fr;gap:2rem;}
  .tt-flavors-media{max-width:420px;margin:0 auto;width:100%;}
  .tt-menu-grid{grid-template-columns:1fr;}
  .tt-chef-grid{grid-template-columns:repeat(2,1fr);}
  .tt-foot-grid{grid-template-columns:1fr 1fr;}
}
@media(max-width:620px){
  .tt-hero-cutout{height:clamp(300px,52vh,440px);}
  .tt-hero-stage{margin-top:-2rem;}
  .tt-features{gap:1.4rem;}
  .tt-feature{width:44%;}
  .tt-dishes{grid-template-columns:repeat(2,1fr);}
  .tt-dish-feat{transform:none;}
  .tt-dish-feat:hover{transform:translateY(-6px);}
  .tt-checks{grid-template-columns:1fr;}
  .tt-offers-card,.tt-menu-card{padding:1.6rem;}
  .tt-offers-deco{font-size:9rem;bottom:-10px;}
  .tt-stats{gap:1.2rem 0;}
  .tt-stat{min-width:45%;flex:0 0 45%;}
  .tt-stat-div{display:none;}
  .tt-foot-grid{grid-template-columns:1fr;}
  .tt-foot-bottom{justify-content:center;text-align:center;}
}
`
