'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { CartItem } from '@/lib/supabase-browser'

type Product = {
  id: string
  name: string
  price_per_kg: number
  discount_percentage: number
  weight_per_unit: number | null
  image_url: string | null
  stock_quantity: number
  category: string
}

/* ============================================================
   B'LURU FRESH — 2026 concept landing (/concept)
   Brand: purple #9318cc + white, warm accents retained.
   Type:  Playfair Display (editorial serif) × Outfit (grotesque).
   Live shop → hands the cart to the real /order checkout.
============================================================ */

const css = `
.cx{
  --purple:#9318cc; --purple-2:#7a12ad; --purple-deep:#4c0b70; --grape:#c44ef5; --lilac:#efe0fb;
  --amber:#ff9f1c; --amber-soft:#ffd27a; --coral:#ff5d73; --mint:#37d29b;
  --ink:#180a24; --ink-2:#4b3560; --ink-3:#7a6690;
  --paper:#ffffff; --wash:#f7f2fe; --wash-2:#efe6fb; --line:rgba(147,24,204,.13);
  --glass:rgba(255,255,255,.7); --glass-brd:rgba(147,24,204,.16);
  --shadow-s:0 2px 8px rgba(70,15,100,.06); --shadow-m:0 14px 34px rgba(70,15,100,.12);
  --shadow-l:0 30px 70px rgba(70,15,100,.20);
  --disp:var(--font-playfair,"Iowan Old Style"),"Iowan Old Style","Palatino Linotype",Georgia,serif;
  --body:var(--font-outfit,"Segoe UI"),"Segoe UI",system-ui,sans-serif;
  --r:22px; --r-l:30px;
  --bg:var(--paper); --fg:var(--ink); --fg2:var(--ink-2); --fg3:var(--ink-3);
  --card:#fff; --surf:var(--wash);
  color:var(--fg); background:var(--bg); font-family:var(--body);
  -webkit-font-smoothing:antialiased; overflow-x:hidden;
}
:root[data-theme="dark"] .cx,.cx[data-dark]{
  --bg:#120720; --fg:#f4e9ff; --fg2:#c8aee0; --fg3:#9a7fb5;
  --card:#1c0f2c; --surf:#170b24; --wash:#170b24; --wash-2:#221033;
  --line:rgba(196,78,245,.18); --glass:rgba(28,15,44,.66); --glass-brd:rgba(196,78,245,.22); --lilac:#2a1740;
  --shadow-m:0 14px 34px rgba(0,0,0,.4); --shadow-l:0 30px 70px rgba(0,0,0,.55);
}
.cx *{box-sizing:border-box}
.cx img{max-width:100%;display:block}
.cx a{color:inherit;text-decoration:none}
.cx h1,.cx h2,.cx h3,.cx h4{margin:0;font-family:var(--disp);font-weight:600;line-height:1.04;text-wrap:balance;letter-spacing:-.015em}
.cx .wrap{max-width:1180px;margin:0 auto;padding:0 26px}
.cx .eyebrow{font-family:var(--body);font-weight:700;letter-spacing:.28em;text-transform:uppercase;font-size:.7rem;color:var(--purple)}
.cx .serif-it{font-style:italic;font-weight:500}
.cx .grad-tx{background:linear-gradient(100deg,var(--purple),var(--grape) 60%,var(--amber));-webkit-background-clip:text;background-clip:text;color:transparent}

/* grain */
.cx .grain{position:fixed;inset:0;z-index:1;pointer-events:none;opacity:.5;mix-blend-mode:soft-light;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")}

/* buttons */
.cx .btn{display:inline-flex;align-items:center;justify-content:center;gap:.55rem;cursor:pointer;border:none;font-family:var(--body);
  font-weight:700;letter-spacing:.005em;padding:.92rem 1.7rem;border-radius:100px;font-size:.96rem;line-height:1;
  transition:transform .2s cubic-bezier(.32,.72,0,1),box-shadow .2s,background .2s,color .2s;white-space:nowrap}
.cx .btn:focus-visible{outline:3px solid var(--amber);outline-offset:3px}
.cx .btn-p{background:linear-gradient(120deg,var(--purple),var(--grape));color:#fff;box-shadow:0 12px 28px rgba(147,24,204,.34)}
.cx .btn-p:hover{transform:translateY(-3px);box-shadow:0 18px 40px rgba(147,24,204,.44)}
.cx .btn-a{background:var(--amber);color:#3a2410;box-shadow:0 12px 26px rgba(255,159,28,.4)}
.cx .btn-a:hover{transform:translateY(-3px)}
.cx .btn-glass{background:var(--glass);color:var(--fg);border:1px solid var(--glass-brd);backdrop-filter:blur(14px)}
.cx .btn-glass:hover{transform:translateY(-3px);border-color:var(--purple)}
.cx .btn-ghost{background:transparent;color:var(--fg);border:1.5px solid var(--purple)}
.cx .btn-ghost:hover{background:var(--purple);color:#fff}
.cx .btn-lg{padding:1.05rem 2rem;font-size:1.02rem}
@media (prefers-reduced-motion:reduce){.cx *{animation:none!important;transition:none!important}}

/* reveal */
.cx.rv-on .rv{opacity:0;transform:translateY(26px);transition:opacity .7s cubic-bezier(.16,1,.3,1),transform .7s cubic-bezier(.16,1,.3,1)}
.cx.rv-on .rv.in{opacity:1;transform:none}
.cx.rv-on .rv.d1{transition-delay:.08s}.cx.rv-on .rv.d2{transition-delay:.16s}.cx.rv-on .rv.d3{transition-delay:.24s}.cx.rv-on .rv.d4{transition-delay:.32s}

/* NAV */
.cx nav.top{position:fixed;top:0;left:0;right:0;z-index:60;transition:background .3s,box-shadow .3s,border-color .3s;border-bottom:1px solid transparent}
.cx nav.top.solid{background:var(--glass);backdrop-filter:blur(16px) saturate(1.3);border-bottom-color:var(--line);box-shadow:0 6px 24px rgba(70,15,100,.06)}
.cx nav.top .wrap{display:flex;align-items:center;justify-content:space-between;padding:.85rem 26px;gap:1rem}
.cx .brand{display:flex;align-items:center;gap:.6rem}
.cx .brand .mark{width:42px;height:42px;border-radius:13px;background:linear-gradient(135deg,var(--purple),var(--grape));color:#fff;display:grid;place-items:center;
  font-family:var(--disp);font-weight:700;font-size:1.35rem;box-shadow:0 8px 18px rgba(147,24,204,.4)}
.cx .brand .nm{font-family:var(--disp);font-weight:600;font-size:1.24rem;color:var(--navc,#fff)}
.cx .brand .nm small{display:block;font-family:var(--body);font-weight:700;font-size:.5rem;letter-spacing:.4em;margin-top:1px;color:var(--grape)}
.cx .navlinks{display:flex;gap:1.7rem;font-family:var(--body);font-weight:600;font-size:.9rem;color:var(--navc,#fff)}
.cx .navlinks a{opacity:.86;transition:opacity .2s,color .2s;position:relative}
.cx .navlinks a::after{content:"";position:absolute;left:0;right:100%;bottom:-5px;height:2px;background:currentColor;transition:right .25s;border-radius:2px;opacity:.7}
.cx .navlinks a:hover{opacity:1}.cx .navlinks a:hover::after{right:0}
.cx nav.top.solid{--navc:var(--fg)}
.cx nav.top.solid .brand .nm{color:var(--fg)}
@media(max-width:880px){.cx .navlinks{display:none}}

/* HERO */
.cx .hero{position:relative;min-height:100svh;display:flex;align-items:flex-end;overflow:hidden;background:#0b0410;z-index:2}
.cx .hero video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0}
.cx .hero .grade{position:absolute;inset:0;z-index:1;background:
  linear-gradient(180deg,rgba(8,3,14,.5) 0%,transparent 22%,transparent 42%,rgba(8,3,14,.35) 66%,rgba(8,3,14,.86) 100%)}
.cx .hero .wrap{position:relative;z-index:3;width:100%;padding-bottom:min(9vh,90px);padding-top:120px}
.cx .hero .kick{display:inline-flex;align-items:center;gap:.6rem;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.22);
  color:#fff;padding:.5rem 1rem;border-radius:100px;font-family:var(--body);font-weight:600;font-size:.78rem;letter-spacing:.02em;backdrop-filter:blur(8px);margin-bottom:22px}
.cx .hero .kick .pdot{width:8px;height:8px;border-radius:50%;background:var(--mint);box-shadow:0 0 0 0 rgba(55,210,155,.6);animation:pulse 2s infinite}
@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(55,210,155,.55)}70%{box-shadow:0 0 0 10px rgba(55,210,155,0)}100%{box-shadow:0 0 0 0 rgba(55,210,155,0)}}
.cx .hero h1{color:#fff;font-size:clamp(3.2rem,10vw,8rem);line-height:.92;letter-spacing:-.03em;text-shadow:0 10px 50px rgba(0,0,0,.45)}
.cx .hero h1 em{font-style:italic;font-weight:400;background:linear-gradient(100deg,var(--amber-soft),var(--grape));-webkit-background-clip:text;background-clip:text;color:transparent}
.cx .hero .lead{max-width:50ch;margin:22px 0 0;color:rgba(255,255,255,.9);font-size:clamp(1rem,1.6vw,1.2rem);font-family:var(--body)}
.cx .hero .hcta{display:flex;gap:14px;flex-wrap:wrap;margin-top:32px}
.cx .hero .chips{display:flex;gap:14px;flex-wrap:wrap;margin-top:38px}
.cx .hero .chip{display:flex;flex-direction:column;gap:2px;background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.18);
  backdrop-filter:blur(10px);border-radius:16px;padding:.85rem 1.2rem;color:#fff}
.cx .hero .chip b{font-family:var(--disp);font-weight:600;font-size:1.5rem;line-height:1}
.cx .hero .chip span{font-family:var(--body);font-size:.72rem;letter-spacing:.06em;text-transform:uppercase;opacity:.82}
.cx .hero .scrollcue{position:absolute;bottom:20px;right:26px;z-index:3;color:rgba(255,255,255,.7);font-family:var(--body);font-size:.6rem;letter-spacing:.3em;text-transform:uppercase;writing-mode:vertical-rl;display:flex;align-items:center;gap:10px}
.cx .hero .scrollcue i{width:1px;height:40px;background:linear-gradient(var(--grape),transparent);animation:cue 2s infinite}
@keyframes cue{0%,100%{opacity:.3;transform:scaleY(.6)}50%{opacity:1;transform:scaleY(1)}}
@media(max-width:620px){.cx .hero .chips{display:none}}

/* MARQUEE */
.cx .marq{background:linear-gradient(90deg,var(--purple),var(--purple-2));color:#fff;overflow:hidden;padding:15px 0;position:relative;z-index:2}
.cx .marq .tk{display:flex;gap:2.6rem;white-space:nowrap;width:max-content;animation:mq 30s linear infinite;font-family:var(--disp);font-style:italic;font-size:1.15rem}
.cx .marq .tk .d{color:var(--amber-soft)}
@keyframes mq{to{transform:translateX(-50%)}}

/* SECTION */
.cx section.sec{padding:clamp(64px,9vw,120px) 0;position:relative;z-index:2}
.cx .surf{background:var(--surf)}
.cx .head{max-width:720px;margin:0 auto clamp(40px,6vw,64px);text-align:center}
.cx .head .eyebrow{display:inline-block;background:color-mix(in srgb,var(--purple) 10%,transparent);padding:.4rem 1rem;border-radius:100px;margin-bottom:16px}
.cx .head h2{font-size:clamp(2.2rem,5.2vw,4rem)}
.cx .head p{color:var(--fg2);margin-top:16px;font-size:1.06rem;font-family:var(--body)}

/* BENTO features */
.cx .bento{display:grid;grid-template-columns:repeat(4,1fr);grid-auto-rows:1fr;gap:18px}
.cx .bx{position:relative;background:var(--card);border:1px solid var(--line);border-radius:var(--r-l);padding:28px;overflow:hidden;
  box-shadow:var(--shadow-s);transition:transform .25s,box-shadow .25s}
.cx .bx:hover{transform:translateY(-6px);box-shadow:var(--shadow-m)}
.cx .bx .ic{width:52px;height:52px;border-radius:15px;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,var(--purple),var(--grape));margin-bottom:16px;box-shadow:0 8px 18px rgba(147,24,204,.3)}
.cx .bx h3{font-size:1.3rem;margin-bottom:6px}
.cx .bx p{color:var(--fg2);font-size:.9rem;font-family:var(--body)}
.cx .bx.wide{grid-column:span 2}
.cx .bx.feat{grid-column:span 2;grid-row:span 2;background:linear-gradient(150deg,var(--purple),var(--purple-deep));color:#fff;display:flex;flex-direction:column;justify-content:flex-end}
.cx .bx.feat .ic{background:rgba(255,255,255,.16)}
.cx .bx.feat h3{font-size:2rem}.cx .bx.feat p{color:rgba(255,255,255,.85);font-size:1rem;max-width:34ch}
.cx .bx.feat .glow{position:absolute;top:-30%;right:-20%;width:360px;height:360px;border-radius:50%;background:radial-gradient(circle,var(--grape),transparent 68%);opacity:.5}
.cx .bx.dark{background:var(--ink);color:#fff}.cx .bx.dark p{color:rgba(255,255,255,.7)}
.cx .bx .big-n{font-family:var(--disp);font-weight:600;font-size:3rem;line-height:1;background:linear-gradient(120deg,var(--purple),var(--grape));-webkit-background-clip:text;background-clip:text;color:transparent}
@media(max-width:820px){.cx .bento{grid-template-columns:1fr 1fr}.cx .bx.feat{grid-column:span 2;grid-row:span 1}}
@media(max-width:520px){.cx .bento{grid-template-columns:1fr}.cx .bx.wide,.cx .bx.feat{grid-column:span 1}}

/* SHOP — premium product cards */
.cx .shop-top{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:38px;flex-wrap:wrap}
.cx .shop-top .eyebrow{display:inline-block;margin-bottom:12px}
.cx .shop-top h2{font-size:clamp(2rem,4.6vw,3.4rem)}
.cx .shop-top p{color:var(--fg2);font-family:var(--body);margin-top:8px;max-width:52ch}
.cx .pgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:22px}
.cx .pc{position:relative;background:var(--card);border:1px solid var(--line);border-radius:var(--r-l);overflow:hidden;display:flex;flex-direction:column;
  box-shadow:var(--shadow-s);transition:transform .28s cubic-bezier(.16,1,.3,1),box-shadow .28s,border-color .28s}
.cx .pc:hover{transform:translateY(-8px);box-shadow:var(--shadow-l);border-color:transparent}
.cx .pc .media{position:relative;aspect-ratio:4/5;overflow:hidden;background:var(--wash-2)}
.cx .pc .media img{width:100%;height:100%;object-fit:cover;transition:transform .6s cubic-bezier(.16,1,.3,1)}
.cx .pc:hover .media img{transform:scale(1.08)}
.cx .pc .media::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 55%,rgba(15,5,25,.5));opacity:.9}
.cx .pc .off{position:absolute;top:14px;left:14px;z-index:2;background:var(--coral);color:#fff;font-family:var(--body);font-weight:800;font-size:.7rem;letter-spacing:.03em;padding:.36rem .7rem;border-radius:100px;box-shadow:0 6px 14px rgba(255,93,115,.4)}
.cx .pc .fresh{position:absolute;top:14px;right:14px;z-index:2;display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.9);color:var(--purple);font-family:var(--body);font-weight:700;font-size:.66rem;letter-spacing:.04em;text-transform:uppercase;padding:.32rem .6rem;border-radius:100px}
.cx .pc .fresh i{width:6px;height:6px;border-radius:50%;background:var(--mint)}
.cx .pc .cat{position:absolute;left:16px;bottom:14px;z-index:2;color:rgba(255,255,255,.85);font-family:var(--body);font-size:.7rem;letter-spacing:.08em;text-transform:uppercase}
.cx .pc .oos{position:absolute;inset:0;z-index:3;background:rgba(18,8,28,.62);color:#fff;display:grid;place-items:center;font-family:var(--disp);font-size:1.15rem;backdrop-filter:blur(2px)}
.cx .pc .body{padding:18px 18px 20px;display:flex;flex-direction:column;gap:12px;flex:1}
.cx .pc h4{font-size:1.16rem;line-height:1.12}
.cx .pc .prow{display:flex;align-items:baseline;gap:9px}
.cx .pc .now{font-family:var(--disp);font-weight:600;font-size:1.42rem;color:var(--fg)}
.cx .pc .was{font-family:var(--body);color:var(--fg3);text-decoration:line-through;font-size:.9rem}
.cx .pc .unit{font-family:var(--body);color:var(--fg3);font-size:.74rem;margin-left:auto;align-self:center}
.cx .pc .act{margin-top:auto}
.cx .pc .add{width:100%;justify-content:center;gap:.5rem}
.cx .stepper{display:flex;align-items:center;justify-content:space-between;background:color-mix(in srgb,var(--purple) 9%,transparent);border:1px solid var(--line);border-radius:100px;padding:5px}
.cx .stepper button{width:40px;height:40px;border-radius:50%;border:none;cursor:pointer;background:linear-gradient(135deg,var(--purple),var(--grape));color:#fff;font-size:1.35rem;line-height:1;display:grid;place-items:center;transition:transform .15s,filter .15s}
.cx .stepper button:hover{transform:scale(1.08)}
.cx .stepper .q{font-family:var(--disp);font-weight:600;font-size:1.15rem;font-variant-numeric:tabular-nums}
.cx .shop-note{text-align:center;color:var(--fg2);font-family:var(--body);font-size:.84rem;margin-top:34px}
.cx .shop-skel{aspect-ratio:4/5;border-radius:var(--r-l);background:linear-gradient(100deg,var(--wash-2) 30%,var(--wash) 50%,var(--wash-2) 70%);background-size:200% 100%;animation:sk 1.4s infinite}
@keyframes sk{to{background-position:-200% 0}}
@media(max-width:960px){.cx .pgrid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:480px){.cx .pgrid{grid-template-columns:1fr}}

/* SPLIT */
.cx .split{display:grid;grid-template-columns:1.05fr .95fr;gap:56px;align-items:center}
.cx .split .art{position:relative}
.cx .split .art img{border-radius:var(--r-l);width:100%;aspect-ratio:4/5;object-fit:cover;box-shadow:var(--shadow-l)}
.cx .split .art .badge{position:absolute;bottom:-22px;left:-18px;background:linear-gradient(135deg,var(--purple),var(--grape));color:#fff;border-radius:22px;padding:18px 22px;box-shadow:0 18px 34px rgba(147,24,204,.42);line-height:1}
.cx .split .art .badge b{font-family:var(--disp);font-weight:600;font-size:2.1rem;display:block}
.cx .split .art .badge span{font-family:var(--body);font-weight:700;font-size:.62rem;letter-spacing:.14em}
.cx .split h2{font-size:clamp(2rem,4.4vw,3.2rem)}
.cx .mlist{margin-top:22px;display:flex;flex-direction:column}
.cx .mrow{display:flex;align-items:baseline;gap:12px;padding:15px 0;border-bottom:1px solid var(--line)}
.cx .mrow .nm{font-family:var(--disp);font-weight:600;font-size:1.12rem}
.cx .mrow .nm small{display:block;font-family:var(--body);font-weight:400;color:var(--fg2);font-size:.8rem}
.cx .mrow .dots{flex:1;border-bottom:1.5px dotted var(--line);transform:translateY(-5px)}
.cx .mrow .pr{font-family:var(--disp);font-weight:600;color:var(--purple);font-size:1.2rem;font-variant-numeric:tabular-nums}
@media(max-width:880px){.cx .split{grid-template-columns:1fr;gap:48px}}

/* PROCESS */
.cx .steps{display:grid;grid-template-columns:repeat(4,1fr);gap:22px}
.cx .step{position:relative;background:var(--card);border:1px solid var(--line);border-radius:var(--r-l);overflow:hidden;box-shadow:var(--shadow-s);transition:box-shadow .25s,transform .25s}
.cx .step:hover{box-shadow:var(--shadow-m);transform:translateY(-5px)}
.cx .step .im{aspect-ratio:4/3;overflow:hidden;position:relative}
.cx .step .im img{width:100%;height:100%;object-fit:cover;transition:transform .5s}
.cx .step:hover .im img{transform:scale(1.07)}
.cx .step .n{position:absolute;top:12px;left:12px;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.92);color:var(--purple);display:grid;place-items:center;font-family:var(--disp);font-weight:700;box-shadow:var(--shadow-s)}
.cx .step .tx{padding:18px}
.cx .step h4{font-size:1.16rem;margin-bottom:6px}
.cx .step p{font-size:.85rem;color:var(--fg2);font-family:var(--body)}
@media(max-width:880px){.cx .steps{grid-template-columns:1fr 1fr}}
@media(max-width:460px){.cx .steps{grid-template-columns:1fr}}

/* OFFERS */
.cx .cta{position:relative;border-radius:var(--r-l);overflow:hidden;background:linear-gradient(130deg,var(--purple),var(--grape) 70%,var(--amber));color:#fff;
  padding:clamp(36px,6vw,64px);display:grid;grid-template-columns:1.4fr .6fr;gap:28px;align-items:center}
.cx .cta::before{content:"";position:absolute;bottom:-40%;left:-8%;width:420px;height:420px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.35),transparent 66%)}
.cx .cta h2{color:#fff;font-size:clamp(2rem,4.6vw,3.2rem);position:relative}
.cx .cta p{color:rgba(255,255,255,.92);font-family:var(--body);margin:14px 0 24px;max-width:48ch;position:relative}
.cx .cta .form{display:flex;gap:12px;flex-wrap:wrap;position:relative}
.cx .cta input{flex:1;min-width:200px;border:none;border-radius:100px;padding:1rem 1.3rem;font-size:.98rem;font-family:var(--body)}
.cx .cta input:focus-visible{outline:3px solid var(--amber)}
.cx .cta .big{font-family:var(--disp);font-style:italic;font-size:clamp(3rem,7vw,5.5rem);text-align:center;line-height:.9;position:relative}
.cx .cta .big span{display:block;font-size:.9rem;font-style:normal;letter-spacing:.2em;text-transform:uppercase;opacity:.9}
@media(max-width:820px){.cx .cta{grid-template-columns:1fr;text-align:center}.cx .cta .form{justify-content:center}.cx .cta .big{display:none}}

/* FOOTER */
.cx footer{background:#140720;color:#d9c6ec;position:relative;z-index:2}
.cx footer .wrap{display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr;gap:34px;padding:64px 26px 34px}
.cx footer h5{font-family:var(--disp);font-weight:600;font-size:1.02rem;color:#fff;margin:0 0 16px}
.cx footer a,.cx footer p{font-family:var(--body);color:#c3a8dc;font-size:.88rem;margin:.35rem 0}
.cx footer a:hover{color:var(--amber-soft)}
.cx .fb .nm{font-family:var(--disp);font-weight:600;font-size:1.6rem;color:#fff}
.cx .fb p{max-width:36ch}
.cx .fssai{display:inline-block;margin-top:12px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);border-radius:10px;padding:.4rem .8rem;font-size:.74rem}
.cx .fbot{border-top:1px solid rgba(255,255,255,.12);text-align:center;padding:20px;font-size:.8rem;color:#a98cc5}
@media(max-width:760px){.cx footer .wrap{grid-template-columns:1fr 1fr}}

/* CART */
.cx .fab{position:fixed;right:22px;bottom:22px;z-index:80;background:linear-gradient(135deg,var(--purple),var(--grape));color:#fff;border:none;cursor:pointer;
  border-radius:100px;padding:.95rem 1.4rem;display:flex;align-items:center;gap:.6rem;font-family:var(--body);font-weight:800;
  box-shadow:0 16px 34px rgba(147,24,204,.46);transition:transform .2s}
.cx .fab:hover{transform:translateY(-4px)}
.cx .fab .cnt{background:var(--amber);color:#3a2410;border-radius:100px;min-width:22px;height:22px;display:grid;place-items:center;font-size:.74rem;padding:0 6px}
.cx .scrim{position:fixed;inset:0;z-index:90;background:rgba(18,7,30,.55);backdrop-filter:blur(4px);opacity:0;pointer-events:none;transition:opacity .3s}
.cx .scrim.on{opacity:1;pointer-events:auto}
.cx .drawer{position:fixed;top:0;right:0;bottom:0;z-index:91;width:min(430px,94vw);background:var(--bg);box-shadow:-24px 0 70px rgba(18,7,30,.4);
  transform:translateX(101%);transition:transform .34s cubic-bezier(.32,.72,0,1);display:flex;flex-direction:column}
.cx .drawer.on{transform:none}
.cx .drawer .dh{display:flex;align-items:center;justify-content:space-between;padding:22px 24px;border-bottom:1px solid var(--line)}
.cx .drawer .dh h3{font-size:1.5rem}
.cx .drawer .dx{background:none;border:none;font-size:1.7rem;cursor:pointer;color:var(--fg2);line-height:1}
.cx .drawer .items{flex:1;overflow-y:auto;padding:14px 24px;display:flex;flex-direction:column;gap:16px}
.cx .drawer .empty{text-align:center;color:var(--fg2);font-family:var(--body);padding:48px 0}
.cx .drow{display:flex;gap:13px;align-items:center}
.cx .drow>img{width:68px;height:68px;border-radius:16px;object-fit:cover;flex-shrink:0}
.cx .drow .info{flex:1;min-width:0}
.cx .drow .info b{font-family:var(--disp);font-weight:600;font-size:1rem;display:block;line-height:1.15}
.cx .drow .info span{color:var(--fg2);font-size:.8rem;font-family:var(--body)}
.cx .drow .mini{display:flex;align-items:center;gap:9px;margin-top:7px}
.cx .drow .mini button{width:30px;height:30px;border-radius:50%;border:1px solid var(--line);background:var(--card);color:var(--purple);cursor:pointer;font-size:1.1rem;line-height:1}
.cx .drow .mini .q{font-family:var(--disp);font-weight:600;min-width:20px;text-align:center;font-variant-numeric:tabular-nums}
.cx .drow .lp{font-family:var(--disp);font-weight:600;color:var(--purple);font-variant-numeric:tabular-nums;min-width:58px;text-align:right}
.cx .drawer .df{border-top:1px solid var(--line);padding:22px 24px;display:flex;flex-direction:column;gap:14px}
.cx .drawer .df .tl{display:flex;justify-content:space-between;align-items:baseline}
.cx .drawer .df .tl .lab{font-family:var(--body);font-size:.9rem;color:var(--fg2)}
.cx .drawer .df .tl .amt{font-family:var(--disp);font-weight:600;font-size:1.7rem;color:var(--purple);font-variant-numeric:tabular-nums}
.cx .drawer .df small{color:var(--fg2);font-size:.72rem;text-align:center;font-family:var(--body)}

.cx .banner{background:color-mix(in srgb,var(--amber) 18%,var(--bg));color:var(--fg2);font-family:var(--body);font-size:.8rem;text-align:center;padding:11px 16px;border-bottom:1px solid var(--line);position:relative;z-index:2}
`

const FALLBACK_IMG = '/assets/raw_chicken_cuts.jpg'
const salePrice = (p: Product) =>
  Math.round(p.price_per_kg * (1 - (p.discount_percentage || 0) / 100))
const unitLabel = (w: number | null) =>
  !w ? 'per kg' : w >= 1000 ? `${w / 1000} kg pack` : `${w} g pack`

export default function ConceptPage() {
  const vidRef  = useRef<HTMLVideoElement>(null)
  const navRef  = useRef<HTMLElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const [products, setProducts] = useState<Product[]>([])
  const [loadingP, setLoadingP] = useState(true)
  const [cart, setCart]         = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)

  // live products from the same API the real order page uses
  useEffect(() => {
    let alive = true
    fetch('/api/products').then(r => r.json())
      .then((d: Product[]) => { if (alive) setProducts(Array.isArray(d) ? d : []) })
      .catch(() => {})
      .finally(() => { if (alive) setLoadingP(false) })
    return () => { alive = false }
  }, [])

  // shared cart (bf-cart) — hydrate + persist so /order picks it up
  useEffect(() => {
    try { const s = localStorage.getItem('bf-cart'); if (s) setCart(JSON.parse(s)) } catch {}
  }, [])
  useEffect(() => {
    try { localStorage.setItem('bf-cart', JSON.stringify(cart)) } catch {}
  }, [cart])

  const addToCart = useCallback((p: Product) => {
    setCart(prev => {
      const i = prev.findIndex(c => c.productId === p.id)
      if (i > -1) { const n = [...prev]; n[i] = { ...n[i], quantity: +(n[i].quantity + 1).toFixed(1) }; return n }
      return [...prev, { productId: p.id, name: p.name, pricePerKg: salePrice(p), quantity: 1, imageUrl: p.image_url, weightPerUnit: p.weight_per_unit }]
    })
    setCartOpen(true)
  }, [])
  const setQty = useCallback((id: string, q: number) => {
    setCart(prev => q <= 0 ? prev.filter(c => c.productId !== id) : prev.map(c => c.productId === id ? { ...c, quantity: q } : c))
  }, [])
  const qtyOf     = (id: string) => cart.find(c => c.productId === id)?.quantity ?? 0
  const cartTotal = cart.reduce((s, c) => s + c.pricePerKg * c.quantity, 0)
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0)
  const checkout  = () => { window.location.href = '/order' }

  // video autoplay + nav frost + scroll reveal
  useEffect(() => {
    const vid = vidRef.current, nav = navRef.current, root = rootRef.current
    if (vid) { vid.muted = true; vid.play().catch(() => {}) }

    const onScroll = () => {
      const y = window.scrollY || document.scrollingElement?.scrollTop || 0
      if (nav) nav.classList.toggle('solid', y > window.innerHeight * 0.7)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()

    // reveal on scroll, with a failsafe so content never stays hidden
    let io: IntersectionObserver | null = null
    if (root && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      root.classList.add('rv-on')
      const els = Array.from(root.querySelectorAll('.rv'))
      io = new IntersectionObserver((es) => {
        es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io?.unobserve(e.target) } })
      }, { rootMargin: '0px 0px -8% 0px' })
      els.forEach(el => io!.observe(el))
      const t = setTimeout(() => els.forEach(el => el.classList.add('in')), 2200)
      return () => { window.removeEventListener('scroll', onScroll); io?.disconnect(); clearTimeout(t) }
    }
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="cx" ref={rootRef}>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="grain" />

      <div className="banner">🎨 Concept preview <b>/concept</b> — 2026 redesign · live shop · skin-off hero video · checkout on the secure order page</div>

      <nav className="top" ref={navRef}>
        <div className="wrap">
          <a className="brand" href="#top">
            <span className="mark">B.</span>
            <span className="nm">B&apos;LURU Fresh<small>FRESH · CHICKEN</small></span>
          </a>
          <div className="navlinks">
            <a href="#shop">Shop</a>
            <a href="#why">Why Us</a>
            <a href="#process">How It Works</a>
            <a href="#offers">Offers</a>
            <a href="#contact">Contact</a>
          </div>
          <button className="btn btn-p" onClick={() => setCartOpen(true)}>🛒 Cart{cartCount > 0 ? ` · ${cartCount}` : ''}</button>
        </div>
      </nav>

      {/* HERO */}
      <header className="hero" id="top">
        <video ref={vidRef} autoPlay muted loop playsInline preload="auto" poster="/assets/raw_chicken_breast.jpg">
          <source src="/assets/hero_skinout.mp4" type="video/mp4" />
        </video>
        <div className="grade" />
        <div className="wrap">
          <span className="kick"><i className="pdot" /> 100% Skin-off · Cut after you order</span>
          <h1>Fresh isn&apos;t a claim.<br /><em>It&apos;s the whole point.</em></h1>
          <p className="lead">Bengaluru&apos;s first cut-to-order chicken. Completely skin-off, zero preservatives, cleaned under sterile conditions — delivered across Yelahanka in under 60 minutes.</p>
          <div className="hcta">
            <a className="btn btn-p btn-lg" href="#shop">🛒 Shop Fresh Now</a>
            <a className="btn btn-glass btn-lg" href="#why">Why We&apos;re Different</a>
          </div>
          <div className="chips">
            <div className="chip"><b>&lt;60</b><span>Min Delivery</span></div>
            <div className="chip"><b>0</b><span>Preservatives</span></div>
            <div className="chip"><b>4.8★</b><span>Rated Fresh</span></div>
            <div className="chip"><b>FSSAI</b><span>Licensed</span></div>
          </div>
        </div>
        <div className="scrollcue">Scroll<i /></div>
      </header>

      {/* MARQUEE */}
      <div className="marq"><div className="tk">
        {[0, 1].map(k => (
          <span key={k} style={{ display: 'inline-flex', gap: '2.6rem' }}>
            Skin-off always <i className="d">✦</i> Cut after your order <i className="d">✦</i> Zero preservatives <i className="d">✦</i> 60-minute delivery <i className="d">✦</i> Farm fresh daily <i className="d">✦</i>&nbsp;
          </span>
        ))}
      </div></div>

      {/* WHY — bento */}
      <section className="sec" id="why"><div className="wrap">
        <div className="head rv">
          <span className="eyebrow">Why B&apos;LURU Fresh</span>
          <h2>Freshness, <span className="grad-tx">engineered</span></h2>
          <p>Everything about how we source, cut and deliver is built around one promise — you get chicken that was never stored.</p>
        </div>
        <div className="bento">
          <div className="bx feat rv">
            <div className="glow" />
            <div className="ic"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4l16 16M14 4l6 6M4 14l6 6" /></svg></div>
            <h3>Cut only after you order</h3>
            <p>No pre-cutting, no cold-storage trays. Your order is the moment the knife moves — so every pack is genuinely fresh.</p>
          </div>
          <div className="bx rv d1">
            <div className="ic"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3l7 4v5c0 5-3 8-7 9-4-1-7-4-7-9V7z" /><path d="M9 12l2 2 4-4" /></svg></div>
            <h3>Skin-off &amp; clean</h3><p>Completely skin-off, trimmed and rinsed under sterile conditions.</p>
          </div>
          <div className="bx rv d2">
            <div className="ic"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg></div>
            <h3>Under 60 minutes</h3><p>Cut, packed and at your door within the hour across Yelahanka.</p>
          </div>
          <div className="bx wide dark rv d1">
            <div className="big-n">0</div>
            <h3 style={{ color: '#fff', marginTop: 8 }}>Preservatives. Ever.</h3>
            <p>No additives, no colour, no stored meat — FSSAI licensed (11226331000344) and fully traceable.</p>
          </div>
          <div className="bx rv d2">
            <div className="ic"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3 6 6 .9-4.5 4.2 1 6.4L12 17l-5.5 2.9 1-6.4L3 8.9 9 8z" /></svg></div>
            <h3>Farm-fresh daily</h3><p>Sourced every morning from trusted local farms.</p>
          </div>
        </div>
      </div></section>

      {/* SHOP */}
      <section className="sec surf" id="shop"><div className="wrap">
        <div className="shop-top rv">
          <div>
            <span className="eyebrow">Order Now</span>
            <h2>Today&apos;s <span className="serif-it">fresh</span> cuts</h2>
            <p>Live prices from today&apos;s kitchen. Add to cart here — delivery &amp; secure payment happen on the order page.</p>
          </div>
          <button className="btn btn-ghost" onClick={() => setCartOpen(true)}>View Cart · {cartCount}</button>
        </div>

        {loadingP ? (
          <div className="pgrid">{[0,1,2,3].map(i => <div className="shop-skel" key={i} />)}</div>
        ) : products.length === 0 ? (
          <p className="shop-note">Menu is updating — visit the <a href="/order" style={{ color: 'var(--purple)', fontWeight: 700 }}>order page</a>.</p>
        ) : (
          <div className="pgrid">
            {products.map((p, i) => {
              const now = salePrice(p), hasOff = (p.discount_percentage || 0) > 0
              const oos = p.stock_quantity === 0, q = qtyOf(p.id)
              return (
                <div className={`pc rv d${(i % 4) + 1}`} key={p.id}>
                  <div className="media">
                    {hasOff && !oos && <span className="off">{p.discount_percentage}% OFF</span>}
                    {!oos && <span className="fresh"><i />Fresh</span>}
                    <img src={p.image_url || FALLBACK_IMG} alt={p.name} loading="lazy"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG }} />
                    <span className="cat">{p.category || 'chicken'}</span>
                    {oos && <div className="oos">Sold out</div>}
                  </div>
                  <div className="body">
                    <h4>{p.name}</h4>
                    <div className="prow">
                      <span className="now">₹{now}</span>
                      {hasOff && <span className="was">₹{p.price_per_kg}</span>}
                      <span className="unit">{unitLabel(p.weight_per_unit)}</span>
                    </div>
                    <div className="act">
                      {oos ? (
                        <button className="btn btn-ghost" disabled style={{ width: '100%', opacity: .5 }}>Sold out</button>
                      ) : q > 0 ? (
                        <div className="stepper">
                          <button aria-label="Decrease" onClick={() => setQty(p.id, +(q - 1).toFixed(1))}>−</button>
                          <span className="q">{q}</span>
                          <button aria-label="Increase" onClick={() => setQty(p.id, +(q + 1).toFixed(1))}>+</button>
                        </div>
                      ) : (
                        <button className="btn btn-p add" onClick={() => addToCart(p)}>Add to Cart</button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <p className="shop-note">🔒 Secure checkout · Cash on delivery &amp; UPI · Free delivery in Yelahanka over ₹499</p>
      </div></section>

      {/* SPLIT / MENU */}
      <section className="sec" id="menu"><div className="wrap"><div className="split">
        <div className="art rv">
          <img src="/assets/raw_chicken_cuts.jpg" alt="Freshly cut skin-off chicken" />
          <div className="badge"><b>60</b><span>MIN · FARM→YOU</span></div>
        </div>
        <div className="rv d1">
          <span className="eyebrow">The B&apos;LURU Difference</span>
          <h2 style={{ marginTop: 12 }}>A world of freshness in <span className="serif-it grad-tx">every bite</span></h2>
          <p style={{ color: 'var(--fg2)', margin: '16px 0 4px', fontFamily: 'var(--body)' }}>No cold storage. No pre-cutting. Every order triggers a fresh, skin-off cut, cleaned under sterile conditions and dispatched straight to your door.</p>
          <div className="mlist">
            {[
              { n: 'Curry Cut (Skin-off)', d: 'Everyday curries & gravies', p: '₹149' },
              { n: 'Boneless', d: 'Biryani, tikka & fry — clean fillets', p: '₹185' },
              { n: 'Legs & Wings', d: 'Roast, grill & fry favourites', p: '₹150' },
              { n: 'Biryani Cut', d: 'Bone-in, sized for the perfect dum', p: '₹135' },
            ].map(m => (
              <div className="mrow" key={m.n}>
                <span className="nm">{m.n}<small>{m.d}</small></span>
                <span className="dots" /><span className="pr">{m.p}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 26 }}><a className="btn btn-p" href="#shop">Shop the Full Menu</a></div>
        </div>
      </div></div></section>

      {/* PROCESS */}
      <section className="sec surf" id="process"><div className="wrap">
        <div className="head rv">
          <span className="eyebrow">How It Works</span>
          <h2>From farm to <span className="grad-tx">your fork</span></h2>
          <p>Four honest steps — nothing stored, nothing hidden.</p>
        </div>
        <div className="steps">
          {[
            { n: 1, t: 'Farm Sourced', d: 'Healthy birds from trusted local farms each morning.', img: '/assets/chicken_farm.jpg' },
            { n: 2, t: 'Cut To Order', d: 'Skin-off cutting starts only after your order lands.', img: '/assets/raw_chicken_cuts.jpg' },
            { n: 3, t: 'Sterile Packing', d: 'Cleaned & vacuum-packed under hygienic conditions.', img: '/assets/packaged_chicken.jpg' },
            { n: 4, t: 'Fast Delivery', d: 'At your door in under 60 minutes.', img: '/assets/raw_chicken_breast.jpg' },
          ].map((s, i) => (
            <div className={`step rv d${i + 1}`} key={s.n}>
              <div className="im"><span className="n">{s.n}</span><img src={s.img} alt={s.t} loading="lazy" /></div>
              <div className="tx"><h4>{s.t}</h4><p>{s.d}</p></div>
            </div>
          ))}
        </div>
      </div></section>

      {/* OFFERS */}
      <section className="sec" id="offers"><div className="wrap">
        <div className="cta rv">
          <div>
            <span className="eyebrow" style={{ color: '#fff', background: 'rgba(255,255,255,.16)' }}>Join The Fresh Club</span>
            <h2 style={{ marginTop: 12 }}>Get ₹100 off your first order</h2>
            <p>Drop your number for daily fresh deals, festival combos and members-only cuts.</p>
            <div className="form">
              <input type="tel" placeholder="Enter your mobile number" aria-label="Mobile number" />
              <button className="btn btn-a">Claim Offer</button>
            </div>
          </div>
          <div className="big">₹100<span>Off</span></div>
        </div>
      </div></section>

      {/* FOOTER */}
      <footer id="contact"><div className="wrap">
        <div className="fb">
          <div className="nm">B&apos;LURU Fresh</div>
          <p>Bengaluru&apos;s first cut-to-order, skin-off fresh chicken delivery. No stored meat, no preservatives.</p>
          <span className="fssai">FSSAI Lic. 11226331000344</span>
        </div>
        <div><h5>Shop</h5>
          <p><a href="#shop">Today&apos;s Cuts</a></p><p><a href="#menu">Menu &amp; Prices</a></p>
          <p><a href="#offers">Offers</a></p><p><a href="/order">Order Page</a></p>
        </div>
        <div><h5>Reach Us</h5>
          <p>Thirumenahalli Main Rd,<br />Agrahara Layout, Yelahanka,<br />Bengaluru — 560064</p>
          <p><a href="tel:+917012488951">+91 70124 88951</a></p>
          <p><a href="mailto:admin@blurufresh.com">admin@blurufresh.com</a></p>
        </div>
        <div><h5>Hours</h5>
          <p>Mon – Sun</p><p>7:30 AM – 6:30 PM</p>
          <p style={{ marginTop: 12 }}><a href="#shop" className="btn btn-a" style={{ padding: '.65rem 1.2rem', fontSize: '.84rem' }}>🛒 Order Now</a></p>
        </div>
      </div>
        <div className="fbot">© 2026 B&apos;LURU Fresh · www.blurufresh.com · Made fresh in Bengaluru 🐔</div>
      </footer>

      {/* CART FAB */}
      {cartCount > 0 && !cartOpen && (
        <button className="fab" onClick={() => setCartOpen(true)}>🛒 <span className="cnt">{cartCount}</span> ₹{cartTotal.toFixed(0)}</button>
      )}

      {/* CART DRAWER */}
      <div className={`scrim${cartOpen ? ' on' : ''}`} onClick={() => setCartOpen(false)} />
      <aside className={`drawer${cartOpen ? ' on' : ''}`} aria-hidden={!cartOpen}>
        <div className="dh"><h3>Your Cart</h3>
          <button className="dx" aria-label="Close cart" onClick={() => setCartOpen(false)}>×</button>
        </div>
        {cart.length === 0 ? (
          <div className="items"><p className="empty">Your cart is empty.<br />Add some fresh cuts to get started 🍗</p></div>
        ) : (
          <div className="items">
            {cart.map(c => (
              <div className="drow" key={c.productId}>
                <img src={c.imageUrl || FALLBACK_IMG} alt={c.name} onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG }} />
                <div className="info">
                  <b>{c.name}</b><span>₹{c.pricePerKg} each</span>
                  <div className="mini">
                    <button aria-label="Decrease" onClick={() => setQty(c.productId, +(c.quantity - 1).toFixed(1))}>−</button>
                    <span className="q">{c.quantity}</span>
                    <button aria-label="Increase" onClick={() => setQty(c.productId, +(c.quantity + 1).toFixed(1))}>+</button>
                  </div>
                </div>
                <span className="lp">₹{(c.pricePerKg * c.quantity).toFixed(0)}</span>
              </div>
            ))}
          </div>
        )}
        <div className="df">
          <div className="tl"><span className="lab">Subtotal</span><span className="amt">₹{cartTotal.toFixed(0)}</span></div>
          <button className="btn btn-p btn-lg" onClick={checkout} disabled={cart.length === 0} style={cart.length === 0 ? { opacity: .5 } : undefined}>Checkout →</button>
          <small>Delivery, address &amp; payment are completed securely on the order page.</small>
        </div>
      </aside>
    </div>
  )
}
