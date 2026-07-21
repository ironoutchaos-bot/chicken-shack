/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  Clock,
  Scissors,
  PackageCheck,
  Plus,
  Minus,
  ShoppingBag,
  Loader2,
  MapPin,
  Smartphone,
  Bike,
  History,
  LogIn,
  LogOut,
} from "lucide-react";
import type { CartItem, ProductRow } from "@/lib/supabase-browser";
import type { AuthUser } from "@/lib/auth-types";
import { UNIT_LABEL } from "@/lib/units";
import LoginDrawer from "@/app/order/components/LoginDrawer";
import CartSheet from "@/app/order/components/CartSheet";
import BannerCarousel from "@/app/order/components/BannerCarousel";

const css = `
:root{
  --g:#8EEA2F; --gd:#8EEA2F; --p:#4c0381; --p2:#60079d; --pd:#7308b0; --pl:#8EEA2F; --cart-icon:#fcc13e;
  --ink:#1F110B; --ink2:#543C32;
  --cream:#FAF7F0; --cream2:#FAF5EB; --cream3:#F5EFE0;
  --white:#ffffff;
}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}
html{scroll-behavior:smooth;}
body{background:var(--cream);color:var(--ink);font-family:var(--font-space-grotesk), sans-serif;overflow-x:hidden;}

nav{
  position: fixed;
  top: 22px;
  left: 50%;
  transform: translateX(-50%);

  width: min(92%, 1280px);   /* <-- wider desktop, responsive */
  max-width: 1280px;

  display: flex;
  align-items: center;
  justify-content: space-between;

  padding: 1rem 2.8rem;

  background: rgba(250,247,240,.95);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);

  border-radius: 999px;
  border: 1px solid rgba(95,7,155,.14); 

  z-index: 500;

  box-shadow:
    0 18px 46px -18px rgba(95,7,155,.35),
    inset 0 1px 0 rgba(255,255,255,.7);
}
.logo{font-family:'League Spartan',sans-serif;font-size:1.4rem;font-weight:800;letter-spacing:-.02em;color:var(--p);}
.logo span{color:var(--g);}
.nav-r{display:flex;align-items:center;gap:2.65rem;}
.nav-r a{font-size:.8rem;letter-spacing:.04em;color:var(--p);text-decoration:none;text-transform:uppercase;transition:color .2s;font-weight:600;font-family:'Fraunces', serif !important;}
.lightning {
  font-size: 2em; /* Try 1.2em–1.5em */
  display: inline-block;
  line-height: 1;
  vertical-align: middle;
}
.nav-r a:hover{color:var(--p);}
.nav-btn{background:linear-gradient(135deg,var(--p2),var(--p),var(--pd));color:#fff;border:none;padding:.92rem 2.15rem;font-family:var(--font-space-grotesk), sans-serif;font-size:.78rem;font-weight:600;letter-spacing:.04em;text-transform:uppercase;cursor:pointer;transition:all .2s;border-radius:9999px;box-shadow:0 14px 36px rgba(95,7,155,.55),0 8px 22px rgba(115,8,176,.26);}
.nav-btn:hover{background:linear-gradient(135deg,var(--pd),var(--p));color:#fff;box-shadow:0 10px 34px rgba(206,246,33,.28),0 16px 36px rgba(95,7,155,.44);}
.nav-orders-btn{display:inline-flex;align-items:center;gap:6px;font-size:.8rem;letter-spacing:.04em;color:var(--p);text-decoration:none;text-transform:uppercase;transition:color .2s;font-weight:600;font-family:var(--font-space-grotesk), sans-serif;cursor:pointer;}
.nav-orders-btn:hover{color:var(--pl);}
.nav-auth-btn{background:rgba(123,31,208,0.06);border:1.5px solid rgba(123,31,208,0.18);color:var(--p);width:38px;height:38px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s;flex-shrink:0;margin-left:0.5rem;}.nav-auth-btn:hover{background:var(--p);color:#fff;border-color:var(--p);}@media(max-width:900px){.nav-auth-btn{width:30px;height:30px;margin-left:0.3rem;}}
.nav-orders-btn.active{color:var(--g);}
@media(max-width:900px){.nav-orders-btn{display:none !important;}}
#prog{position:fixed;top:0;left:0;height:3px;background:linear-gradient(90deg,var(--g),var(--p));z-index:600;transition:width .05s linear;width:0%;}
#hero{min-height:auto;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:5.9rem 2rem 1rem;background:radial-gradient(circle at 50% 43%,rgba(132,19,190,.38) 0%,rgba(115,8,176,.28) 32%,rgba(96,7,157,0) 68%),linear-gradient(180deg,#60079d 0%,#6908a7 48%,#7308b0 100%);position:relative;overflow:hidden;text-align:center;}
#hero::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 50% 47%,rgba(255,255,255,.07) 0%,rgba(255,255,255,.03) 28%,transparent 62%),linear-gradient(90deg,rgba(38,0,78,.38),transparent 30%,transparent 70%,rgba(38,0,78,.42));pointer-events:none;z-index:0;}
.hero-wave{position:absolute;left:0;right:0;top:20%;bottom:-1px;z-index:0;pointer-events:none;overflow:hidden;}
.hero-wave svg{width:100%;height:100%;display:block;}
.hero-wave path{fill:var(--cream);}
.hero-content-wrap{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;width:100%;max-width:1000px;margin:0 auto;}
.hero-statement-text{font-family:var(--font-space-grotesk), sans-serif;font-size:clamp(0.85rem, 2.2vw, 1.15rem);color:rgba(255,255,255,0.9);max-width:55ch;margin-bottom:.55rem;font-weight:500;position:relative;z-index:2;}
.hs-pill{display:inline-flex;align-items:center;gap:.5rem;background:rgba(255,255,255,.13);border:1px solid rgba(255,255,255,0.22);padding:.4rem 1.2rem;width:fit-content;font-family:var(--font-space-grotesk), sans-serif;font-size:.65rem;letter-spacing:.08em;color:#ffffff;text-transform:uppercase;margin-bottom:.65rem;border-radius:9999px;position:relative;z-index:2;box-shadow:inset 0 1px 0 rgba(255,255,255,.14);margin-top:1.75rem;margin-bottom:.65rem;font-weight:800;}
.hs-pill::before{content:'';width:6px;height:6px;background:var(--pl);border-radius:50%;animation:blink 1.5s ease infinite;box-shadow:0 0 8px rgba(214,255,22,.45);}
.hero-h1{
    font-family:'League Spartan',sans-serif;
    font-weight:800;
    font-size:clamp(3.2rem, 8.5vw, 6.8rem);
    line-height:.84;
    letter-spacing:-0.02em;
    color:#fff;
    text-shadow:
        0 2px 0 rgba(0,0,0,.08),
        0 8px 20px rgba(0,0,0,.14);
}
.hero-h1 .line-light{color:var(--pl);  text-shadow:
        0 2px 0 rgba(0,0,0,.08),
        0 8px 18px rgba(0,0,0,.10);}
.hero-main-prod-wrap{position:relative;width:100%;max-width:600px;margin:-88px auto .8rem;display:flex;justify-content:center;align-items:center;z-index:3;}
.hero-main-prod-img{width:100%;height:auto;mix-blend-mode:multiply;filter:contrast(1.12) saturate(1.08);animation:floatBig 6s ease-in-out infinite;}
@keyframes floatBig{0%,100%{transform:translateY(0) scale(1) rotate(0.5deg);}50%{transform:translateY(-15px) scale(1.02) rotate(-0.5deg);}}

/* Side floating raw chicken plates */
.float-side-left{position:absolute;left:-10%;top:37%;transform:translateY(-50%) rotate(15deg);width:clamp(300px,21vw,410px);height:clamp(300px,21vw,410px);overflow:hidden;z-index:2;animation:floatSideL 7s ease-in-out infinite;pointer-events:none;}
.float-side-right{position:absolute;right:-10%;top:37%;transform:translateY(-50%) rotate(-12deg);width:clamp(300px,21vw,410px);height:clamp(300px,21vw,410px);overflow:hidden;z-index:2;animation:floatSideR 7s ease-in-out infinite;pointer-events:none;}
.float-side-left img, .float-side-right img{width:100%;height:100%;object-fit:cover;mix-blend-mode:multiply;filter:contrast(1.12) saturate(1.08);}
@keyframes floatSideL{0%,100%{transform:translateY(-50%) rotate(15deg) translateY(0);}50%{transform:translateY(-50%) rotate(13deg) translateY(-12px);}}
@keyframes floatSideR{0%,100%{transform:translateY(-50%) rotate(-12deg) translateY(0);}50%{transform:translateY(-50%) rotate(-14deg) translateY(-12px);}}

/* Flying Spices & Herbs */
.flying-spice{position:absolute;font-size:1.6rem;z-index:4;pointer-events:none;animation:flyAround 8s ease-in-out infinite;}
.fs-1{left:18%;top:29%;animation-delay:0.5s;font-size:1.9rem;}
.fs-2{right:12%;top:20%;animation-delay:1.2s;font-size:2.6rem;}
.fs-3{left:22%;top:45%;animation-delay:2s;font-size:1.8rem;}
.fs-4{right:23%;top:40%;animation-delay:0.8s;font-size:1.9rem;}
.fs-5{left:48%;top:55%;animation-delay:1.6s;font-size:1.1rem;}
@keyframes flyAround{0%,100%{transform:translate(0, 0) rotate(0deg);}50%{transform:translate(8px, -12px) rotate(15deg);}}

.float-badge{position:absolute;min-width:172px;background:var(--white);border:1px solid rgba(95,7,155,0.14);box-shadow:0 18px 42px rgba(95,7,155,0.18),0 8px 22px rgba(31,17,11,.08);padding:0.68rem 1.18rem;border-radius:9999px;display:flex;align-items:center;gap:0.5rem;font-size:0.62rem;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:var(--ink);z-index:8;animation:floatBadgeUpDown 5s ease-in-out infinite;font-family:var(--font-space-grotesk), sans-serif;}
.fb-left-pkg{left:-8%;top:32%;animation-delay:0.5s;}
.fb-left-pkg img{width:22px;height:22px;border-radius:50%;object-fit:cover;}
.fb-right-fresh{right:-8%;top:42%;animation-delay:1.5s;}
.fb-dot{width:6px;height:6px;background:var(--pl);border-radius:50%;animation:blink 1.5s ease infinite;box-shadow:0 0 10px rgba(206,246,33,.7);}
@keyframes floatBadgeUpDown{0%,100%{transform:translateY(0);}50%{transform:translateY(-10px);}}
.hero-bottom-content{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;margin-top:0.5rem;}
.hero-desc-para{font-family:var(--font-space-grotesk), sans-serif;font-size:0.92rem;color:var(--ink);margin-bottom:1.2rem;max-width:45ch;}
.hero-desc-para strong{color:var(--p);font-weight:600;}
.hero-ctas{display:flex;gap:1rem;justify-content:center;}
.btn-fill{background:linear-gradient(135deg,var(--p2),var(--p),var(--pd));color:#fff;border:none;padding:0.95rem 2.4rem;font-family:var(--font-space-grotesk), sans-serif;font-size:.75rem;font-weight:600;letter-spacing:.04em;text-transform:uppercase;cursor:pointer;transition:all .25s;border-radius:9999px;box-shadow:0 12px 28px rgba(123,31,208,.36);position:relative;overflow:hidden;}
.btn-fill::after{content:'';position:absolute;inset:0;background:var(--pl);transform:translateX(-101%);transition:transform .3s ease;}
.btn-fill:hover::after{transform:translateX(0);}
.btn-fill span{position:relative;z-index:1;color:#fff;}
.btn-fill:hover span{color:var(--ink);}
.btn-line{background:transparent;border:1.5px solid rgba(31,17,11,.16);color:var(--ink);padding:0.95rem 2rem;font-family:var(--font-space-grotesk), sans-serif;font-size:.75rem;letter-spacing:.04em;text-transform:uppercase;cursor:pointer;transition:all .2s;border-radius:9999px;}
.btn-line:hover{border-color:var(--p);color:var(--p);background:rgba(95,7,155,.06);transform:translateY(-1px);}
.desktop-watch-cta{display:inline-flex;align-items:center;justify-content:center;text-decoration:none;}
.mobile-orders-cta,.mobile-watch-cta{display:none;align-items:center;justify-content:center;text-decoration:none;}
.mobile-orders-cta{gap:.48rem;line-height:1;}
.mobile-orders-cta svg{position:relative;z-index:1;width:16px;height:16px;color:gray;stroke-width:2.5;flex:0 0 auto;}
.mobile-orders-cta span{display:inline-flex;align-items:center;line-height:1;color:gray;}
.hero-scroll-hint{display:none;}
.hero-bg-word{position:absolute;top:35%;left:50%;transform:translate(-50%,-50%);font-family:'League Spartan', sans-serif;font-weight:800;font-size:clamp(8rem,20vw,26rem);color:rgba(255,255,255,.115);white-space:nowrap;letter-spacing:-.04em;line-height:1;pointer-events:none;user-select:none;animation:bgFloat 8s ease-in-out infinite;z-index:0;}
.ticker{background:linear-gradient(90deg,var(--pd),var(--p),var(--p2));padding:.9rem 0;overflow:hidden;display:flex;border-top:1px solid rgba(214,255,22,0.22);border-bottom:1px solid rgba(199,242,10,0.22);position:relative;z-index:10;}
.ticker-track{display:flex;gap:3rem;animation:tick 16s linear infinite;white-space:nowrap;}
@keyframes tick{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.ti{font-family:'Fraunces', serif;font-size:.9rem;font-weight:700;letter-spacing:.05em;color:var(--cream);flex-shrink:0;display:flex;align-items:center;gap:2rem;text-transform:uppercase;}
.ti-sep{color:var(--pl);text-shadow:0 0 10px rgba(206,246,33,0.5);}
#scroll-story{padding:8rem 5% 6rem;background:var(--cream);position:relative;overflow:hidden;}
.story-float-left{position:absolute;left:-120px;bottom:10%;width:280px;height:auto;opacity:0.85;pointer-events:none;z-index:1;transform:rotate(15deg);filter:drop-shadow(0 15px 30px rgba(31,17,11,0.08));animation:floatSlowLeft 8s ease-in-out infinite;}
.story-float-right{position:absolute;right:-120px;top:15%;width:280px;height:auto;opacity:0.85;pointer-events:none;z-index:1;transform:rotate(-15deg);filter:drop-shadow(0 15px 30px rgba(31,17,11,0.08));animation:floatSlowRight 9s ease-in-out infinite;}
.story-float-left img, .story-float-right img{width:100%;height:auto;mix-blend-mode:multiply;}
@keyframes floatSlowLeft{0%,100%{transform:translateY(0) rotate(15deg);}50%{transform:translateY(-15px) rotate(18deg);}}
@keyframes floatSlowRight{0%,100%{transform:translateY(0) rotate(-15deg);}50%{transform:translateY(-12px) rotate(-18deg);}}
.story-spice{position:absolute;font-size:1.8rem;pointer-events:none;z-index:1;opacity:0.6;}
.sp-1{top:10%;left:15%;animation:spiceFloat 5s ease-in-out infinite;}
.sp-2{bottom:15%;left:42%;animation:spiceFloat 6s ease-in-out infinite 1s;}
.sp-3{top:40%;right:18%;animation:spiceFloat 7s ease-in-out infinite 0.5s;}
.sp-4{bottom:8%;right:35%;animation:spiceFloat 5.5s ease-in-out infinite 1.5s;}
@keyframes spiceFloat{0%,100%{transform:translateY(0) rotate(0);}50%{transform:translateY(-10px) rotate(15deg);}}
.story-grid{display:grid;grid-template-columns:repeat(3, 1fr);gap:2rem;max-width:1200px;margin:0 auto;position:relative;z-index:2;}
.story-card{position:relative;overflow:visible;background:transparent !important;border:none !important;box-shadow:none !important;padding:3rem 2.5rem;display:flex;flex-direction:column;align-items:flex-start;justify-content:space-between;transition:all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);min-height:360px;}
.card-bg-panel{position:absolute;inset:0;background:var(--white);border:1px solid rgba(123,31,208,0.09);border-radius:32px;box-shadow:0 10px 35px rgba(31,17,11,0.03);z-index:1;transition:all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);pointer-events:none;}
.story-card:hover .card-bg-panel{border-color:rgba(123,31,208,0.2);box-shadow:0 25px 50px rgba(123,31,208,0.1);}
.story-card *{position:relative;z-index:2;}
.story-card .card-bg-img, .story-card .card-bg-img *{position:absolute;z-index:0;}
.card-bg-img{pointer-events:none;opacity:0;width:170px;height:auto;transition:opacity 0.3s;}
.card-bg-img img{width:100%;height:auto;mix-blend-mode:multiply;}
.card-spice{position:absolute;font-size:1.3rem;pointer-events:none;z-index:3;animation:spiceFloat 4s ease-in-out infinite;}
.cs-1{top:-8px;left:25px;animation-delay:0.2s;}
.cs-2{bottom:15px;right:25px;animation-delay:0.8s;}
.img-right{right:-50px;top:-45px;transform:rotate(12deg);}
.img-left{left:-45px;bottom:75px;transform:rotate(-12deg);}
.story-card:hover{transform:translateY(-8px);}
.sc-wide{grid-column:span 2;}
.sf-label{font-family:var(--font-space-grotesk), sans-serif;font-size:.65rem;letter-spacing:.08em;text-transform:uppercase;color:var(--p);border:1px solid rgba(123,31,208,0.18);padding:.35rem 1rem;border-radius:9999px;margin-bottom:1.5rem;background:rgba(123,31,208,0.04);display:inline-block;font-weight:700;}
.sf-heading{font-family:'Fraunces', serif;font-weight:700;font-size:1.75rem;line-height:1.2;letter-spacing:-.015em;color:var(--ink);text-align:left;margin-bottom:1rem;}
.sf-heading .hl{color:var(--p);}
.sf-heading .hp{color:var(--pl);}
.sf-sub{font-family:var(--font-space-grotesk), sans-serif;font-size:.9rem;color:var(--ink2);line-height:1.6;max-width:440px;text-align:left;margin-top:auto;}
.sf-sub strong{color:var(--p);font-weight:600;}
.sf-spicy{font-family:'Fraunces', serif;font-size:1.9rem;font-weight:800;color:var(--p);letter-spacing:-.015em;line-height:1.2;margin-bottom:1rem;text-align:left;}
.sc-wide .sf-sub{max-width:80%;}
@media(max-width:1024px){
  .story-grid{grid-template-columns:repeat(2, 1fr);}
  .sc-wide{grid-column:span 2;}
  .story-float-left, .story-float-right, .story-spice{display:none;}
  .card-bg-img{opacity:0.95;}
  .img-left{display:none;}
}
@media(max-width:768px){
  .story-grid{grid-template-columns:1fr;gap:1.5rem;}
  .sc-wide{grid-column:span 1;}
  .story-card{min-height:auto;padding:2.5rem 2rem;}
  .sc-wide .sf-sub{max-width:100%;}
}
.hero-manifesto-wrap {
  width: 100%;
  margin: 3.5rem auto 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 10;
  padding: 0 1rem;
}
.hero-manifesto-title {
  font-family: 'Fraunces', serif;
  font-weight: 700;
  font-size: clamp(1.5rem, 3.5vw, 2.5rem);
  line-height: 1.15;
  letter-spacing: -0.015em;
  color: var(--p);
  background: transparent;
  padding: 0;
  border: none;
  border-radius: 0;
  box-shadow: none;
  display: inline-block;
  text-transform: uppercase;
  margin-bottom: 2.5rem;
}
.hero-manifesto-desc {
  font-family: var(--font-space-grotesk), sans-serif;
  font-size: 0.92rem;
  color: var(--ink2);
  margin-bottom: 2.2rem;
  max-width: 50ch;
  text-align: center;
  line-height: 1.6;
}
.hero-manifesto-desc strong {
  color: var(--p);
  font-weight: 600;
  font-size: 1.12em;
}
.hero-manifesto-proof {
  display: block;
  margin-top: 0.45rem;
  color: var(--p);
  font-weight: 900;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.hero-manifesto-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 2.2rem;
  max-width: 760px;
  margin: 0 auto;
  width: 100%;
  justify-content: center;
}
.hero-manifesto-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.8rem;
  transition: transform 0.3s ease;
}
.hero-manifesto-item:hover {
  transform: translateY(-4px);
}
.hmi-circle {
  width: 62px;
  height: 62px;
  border-radius: 18px;
  border: 1.5px dashed rgba(123,31,208,0.28);
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(199,242,10,0.16);
  box-shadow: 0 6px 16px rgba(31,17,11,0.02);
  transition: all 0.3s ease;
  color: var(--p);
}
.hmi-circle svg {
  width: 22px;
  height: 22px;
  stroke-width: 1.8px;
}
.hero-manifesto-item:hover .hmi-circle {
  border-color: var(--p);
  background: rgba(199,242,10,0.26);
  box-shadow: 0 10px 20px rgba(123,31,208,0.12);
  transform: scale(1.08);
}
.hmi-label {
  font-family: var(--font-space-grotesk), sans-serif;
  font-weight: 600;
  font-size: 0.72rem;
  letter-spacing: 0.02em;
  color: var(--ink);
  text-transform: uppercase;
}
.wtl-kicker{font-size:.65rem;letter-spacing:.08em;color:var(--p);text-transform:uppercase;margin-bottom:1.2rem;font-family:var(--font-space-grotesk), sans-serif;font-weight:700;}
.wtl-h{font-family:'Fraunces', serif;font-weight:700;font-size:clamp(2.4rem,4.8vw,5.2rem);line-height:0.9;letter-spacing:-.015em;color:var(--ink);margin-bottom:1rem;}
.wtl-h .it{font-family:'Fraunces', serif;font-weight:700;color:var(--gd);font-style:italic;}
.wtl-h .pp{color:var(--p);}

#process{padding:8rem 5% 7rem;background:var(--cream);position:relative;overflow:hidden;}
.proc-bg-txt{position:absolute;bottom:-2rem;right:-1rem;font-family:'Fraunces', serif;font-weight:800;font-size:clamp(6rem,15vw,18rem);color:rgba(22,20,15,.03);letter-spacing:-.04em;pointer-events:none;line-height:1;z-index:0;}
.proc-container{max-width:1100px;margin:0 auto;position:relative;z-index:2;}
.proc-header{margin-bottom:5rem;}
.proc-kicker{font-size:.65rem;letter-spacing:.08em;color:var(--p);text-transform:uppercase;margin-bottom:1rem;font-family:var(--font-space-grotesk), sans-serif;font-weight:700;}
.proc-h{font-family:'Fraunces', serif;font-weight:700;font-size:clamp(2.5rem,5vw,5.2rem);letter-spacing:-.015em;line-height:.9;color:var(--ink);}
.proc-h span{color:var(--p);}

.proc-grid{display:grid;grid-template-columns:repeat(4, 1fr);gap:2rem;position:relative;z-index:2;}
.proc-card{display:flex;flex-direction:column;align-items:center;text-align:center;position:relative;}
.proc-card-content{display:flex;flex-direction:column;align-items:center;}
.proc-node-circle{width:76px;height:76px;border-radius:50%;background:var(--white);border:3px solid rgba(123,31,208,0.1);display:flex;align-items:center;justify-content:center;font-size:2.2rem;margin-bottom:2rem;transition:all 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275);box-shadow:0 8px 25px rgba(31,17,11,0.04);position:relative;z-index:3;}
.proc-card:hover .proc-node-circle{transform:scale(1.15) translateY(-5px);border-color:var(--p);box-shadow:0 15px 35px rgba(123,31,208,0.14);background:rgba(199,242,10,.18);}
.proc-step-num{font-family:var(--font-space-grotesk), sans-serif;font-size:0.65rem;letter-spacing:0.06em;text-transform:uppercase;color:var(--p);margin-bottom:0.5rem;font-weight:700;}
.proc-step-title{font-family:'Fraunces', serif;font-size:0.95rem;font-weight:700;color:var(--ink);margin-bottom:0.75rem;line-height:1.3;}
.proc-step-desc{font-family:var(--font-space-grotesk), sans-serif;font-size:0.85rem;color:var(--ink2);line-height:1.55;padding:0 0.5rem;}
.proc-step-badge{display:inline-block;margin-top:1rem;font-family:var(--font-space-grotesk), sans-serif;font-size:0.58rem;letter-spacing:0.04em;text-transform:uppercase;color:var(--p);background:rgba(199,242,10,0.2);border:1px solid rgba(199,242,10,0.4);padding:0.25rem 0.75rem;border-radius:9999px;font-weight:700;}
#cta{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 38%,rgba(199,242,10,.12) 0%,rgba(138,43,226,.28) 28%,transparent 58%),linear-gradient(180deg,#6500A3 0%,#7B1FD0 48%,#4B0D91 100%);position:relative;overflow:hidden;text-align:center;padding:4rem 3rem;}
#cta::before{content:'';position:absolute;inset:0;background:linear-gradient(90deg,rgba(44,0,84,.32),transparent 28%,transparent 72%,rgba(44,0,84,.34));pointer-events:none;}
.cta-bg-circle{position:absolute;width:70vw;height:70vw;max-width:800px;max-height:800px;border-radius:50%;border:1px solid rgba(199,242,10,.14);top:50%;left:50%;transform:translate(-50%,-50%);}
.cta-bg-circle:nth-child(2){width:50vw;height:50vw;border-color:rgba(255,255,255,.12);}
.cta-bg-circle:nth-child(3){width:30vw;height:30vw;border-color:rgba(199,242,10,.2);background:rgba(199,242,10,.035);}
.cta-kicker{font-size:.65rem;letter-spacing:.08em;color:var(--pl);text-transform:uppercase;margin-bottom:1.5rem;position:relative;z-index:1;text-shadow:0 0 18px rgba(199,242,10,.26);font-family:var(--font-space-grotesk), sans-serif;font-weight:700;}
.cta-h{font-family:'Fraunces', serif;font-weight:800;font-size:clamp(3rem,9vw,9.5rem);letter-spacing:-.02em;line-height:.85;color:#fff;position:relative;z-index:1;}
.cta-h .cg{color:var(--pl);}
.cta-h .cp{color:#fff;}
.cta-quote{font-family:var(--font-space-grotesk), sans-serif;font-style:italic;font-size:1.25rem;color:rgba(255,255,255,.78);margin:2rem 0;max-width:600px;position:relative;z-index:1;line-height:1.6;}
.cta-btns{display:flex;gap:1rem;justify-content:center;position:relative;z-index:1;}
.btn-glow{background:var(--pl);color:var(--ink);border:none;padding:1.1rem 3.5rem;font-family:var(--font-space-grotesk), sans-serif;font-size:.82rem;font-weight:600;letter-spacing:.04em;cursor:pointer;transition:all .25s;box-shadow:0 0 0 0 rgba(199,242,10,.4);animation:glowPulse 3s ease infinite;}
@keyframes glowPulse{0%,100%{box-shadow:0 0 0 0 rgba(199,242,10,.28)}50%{box-shadow:0 0 0 16px rgba(199,242,10,0)}}
.btn-glow:hover{background:#fff;transform:scale(1.05);}
.btn-ghost-white{background:rgba(255,255,255,.08);border:1.5px solid rgba(255,255,255,.26);color:#fff;padding:1.1rem 2rem;font-family:var(--font-space-grotesk), sans-serif;font-size:.78rem;letter-spacing:.04em;text-transform:uppercase;cursor:pointer;transition:all .2s;}
.btn-ghost-white:hover{border-color:var(--pl);color:var(--ink);background:var(--pl);}
.cta-meta{margin-top:2rem;font-size:.58rem;letter-spacing:.04em;color:rgba(255,255,255,.64);position:relative;z-index:1;font-family:var(--font-space-grotesk), sans-serif;font-weight:700;}
footer{background:linear-gradient(180deg,#4B0D91 0%,#31065F 100%);border-top:1px solid rgba(199,242,10,.16);padding:3.5rem 3rem 2rem;display:grid;grid-template-columns:2fr 1fr 1fr;gap:3rem;position:relative;overflow:hidden;}
footer::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 16% 10%,rgba(199,242,10,.09),transparent 22rem);pointer-events:none;}
footer > *{position:relative;z-index:1;}
.fl{font-family:var(--font-space-grotesk),sans-serif;font-weight:800;font-size:2rem;letter-spacing:-.02em;color:#fff;line-height:1;}
.fl em{color:var(--pl);font-style:normal;}
.ft{margin-top:.8rem;font-size:.8rem;color:rgba(255,255,255,.72);line-height:1.65;max-width:240px;font-family:var(--font-space-grotesk), sans-serif;}
.fc-t{font-size:.65rem;letter-spacing:.08em;color:var(--pl);text-transform:uppercase;margin-bottom:1rem;font-family:var(--font-space-grotesk), sans-serif;font-weight:700;}
.fc-l{list-style:none;display:flex;flex-direction:column;gap:.6rem;font-family:var(--font-space-grotesk), sans-serif;}
.fc-l a{font-size:.8rem;color:rgba(255,255,255,.7);text-decoration:none;transition:color .2s;}
.fc-l a:hover{color:var(--pl);}
.fb{padding:1.5rem 3rem;background:#31065F;border-top:1px solid rgba(199,242,10,.14);display:flex;justify-content:space-between;font-family:var(--font-space-grotesk), sans-serif;}
.fb span{font-size:.7rem;letter-spacing:.02em;color:rgba(255,255,255,.56);}
.float-order{
    position:fixed;
    bottom:2rem;
    right:2rem;
    z-index:800;

    display:flex;
    align-items:center;
    gap:1rem;

    width:220px;
    min-width:unset;

    padding:0.95rem 1.5rem;

    gap:0.75rem;

    border:none;
    border-radius:999px;
    cursor:pointer;

    background:linear-gradient(
        180deg,
        #5f079b 0%,
        #5f079b 45%,
        #4f0684 100%
    );

    color:#fff;

    font-family:var(--font-space-grotesk), sans-serif;
    font-size:1rem;
    font-weight:600;

    box-shadow:
        0 16px 38px rgba(95,7,155,.34),
        0 0 0 8px rgba(214,255,22,.15),
        inset 0 1px 0 rgba(255,255,255,.12);

    transition:.25s ease;
}

.float-order::after{
    content:"";
    position:absolute;
    inset:-8px;

    border-radius:999px;
    border:2px solid rgba(206,246,33,.28);

    pointer-events:none;
}

.float-order:hover{
    transform:translateY(-3px);

    box-shadow:
        0 22px 46px rgba(95,7,155,.42),
        0 0 0 8px rgba(206,246,33,.2),
        inset 0 1px 0 rgba(255,255,255,.18);
}

.fo-icon{
    font-size:2rem;
    color:var(--cart-icon);
    line-height:1;
}

.fo-text{
    display:flex;
    flex-direction:column;
    gap:.18rem;
}

.fo-main{
    font-family:var(--font-space-grotesk), sans-serif;
    font-weight:600;
    color:#fff;
    line-height:1;
    font-size:0.95rem;
}

.fo-sub{
    font-family:var(--font-space-grotesk), sans-serif;
    font-size:.58rem;
    font-weight:700;
    letter-spacing:.08em;
    text-transform:uppercase;
    color:#C2B05E;
}
@keyframes floatBob{0%,100%{transform:translateY(0);}50%{transform:translateY(-6px);}}
.dnav{position:fixed;right:1.5rem;top:50%;transform:translateY(-50%);z-index:400;display:flex;flex-direction:column;gap:.5rem;}
.dn{width:5px;height:5px;border-radius:50%;background:rgba(22,20,15,.15);cursor:pointer;transition:all .3s;}
.dn.on{background:var(--p);transform:scale(1.6);}
.dn:hover{background:var(--gd);}
.home-cart-fab{
  position:fixed;
  bottom:calc(1.15rem + env(safe-area-inset-bottom, 0px));
  z-index:720;
  border:none;
  cursor:pointer;
  display:flex;
  align-items:center;
  justify-content:center;
  transition:transform .18s ease, box-shadow .18s ease;
}
.home-cart-fab{
  right:1.1rem;
  min-width:92px;
  height:58px;
  gap:.5rem;
  padding:0 1rem;
  border-radius:999px;
  background:linear-gradient(135deg,var(--p2),var(--p),var(--pd));
  color:#fff;
  box-shadow:0 16px 34px rgba(123,31,208,.38),0 0 0 4px rgba(255,255,255,.82);
  font-family:var(--font-space-grotesk), sans-serif;
}
.home-cart-fab:hover{transform:translateY(-2px);}
.home-cart-icon{position:relative;display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:999px;background:rgba(255,255,255,.14);}
.home-cart-badge{position:absolute;right:-7px;top:-7px;min-width:22px;height:22px;border-radius:999px;background:var(--pl);color:var(--ink);display:flex;align-items:center;justify-content:center;padding:0 5px;font-size:10px;font-weight:900;}
.home-cart-copy{display:flex;flex-direction:column;align-items:flex-start;gap:2px;line-height:1;}
.home-cart-copy small{font-size:8px;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.7);font-weight:900;}
.home-cart-copy strong{font-size:14px;font-weight:900;}
.rv{opacity:0;transform:translateY(32px);transition:opacity .7s ease,transform .7s ease;}
.rv.in{opacity:1;transform:translateY(0);}
.d1{transition-delay:.1s}.d2{transition-delay:.2s}.d3{transition-delay:.3s}.d4{transition-delay:.4s}
.split-word{display:inline-block;overflow:visible;padding-top:.05em;}
.split-word span{display:inline-block;transform:translateY(110%);transition:transform .7s cubic-bezier(.22,1,.36,1);}
.split-word.in span{transform:translateY(0);}
@media(max-width:900px){
  nav{padding:1rem 1.2rem;}
  .nav-r a{display:none;}
  .logo{font-size:.85rem;}
  .nav-btn{padding:.45rem 1rem;font-size:.58rem;}
  #hero{padding:7rem 1.2rem 0;justify-content:flex-start;min-height:auto;}
  .hero-wave{left:0;right:0;top:39%;bottom:-1px;}
  .hero-h1{font-size:clamp(2rem, 12vw, 3.8rem);line-height:1.0;margin-bottom:0;}
  .hero-main-prod-wrap{max-width:94%;margin:0 auto 1.5rem;}
  .float-side-left, .float-side-right, .flying-spice{display:none;}
  .hero-desc-para{font-size:0.85rem;margin-bottom:1.5rem;}
  .hero-ctas{justify-content:center;width:100%;gap:0.8rem;}
  .btn-fill, .btn-line{width:100%;max-width:240px;text-align:center;padding:0.95rem 1.5rem;font-size:0.68rem;}
  .desktop-watch-cta{display:none;}
  .mobile-orders-cta,.mobile-watch-cta{display:inline-flex;}
  .mobile-orders-cta{height:46px;padding:0 1.5rem;font-size:.76rem;font-weight:700;letter-spacing:.04em;background:none;color:black}
  .hero-bg-word{top:40%;font-size:clamp(4rem,22vw,8rem);}
  .hero-scroll-hint{display:none;}
  .f-badge,.fb1,.fb2,.fb3{display:none;}
  .float-order{padding:.9rem 1.5rem;bottom:1rem;right:1rem;font-size:.9rem;}
  .fo-main{font-size:.9rem;}
  .fo-sub{font-size:.58rem;}
  .ti{font-size:.62rem;}
  .sf-heading{font-size:clamp(1.8rem,9vw,3.5rem);}
  .sf-spicy{font-size:clamp(2rem,9vw,4rem);}
  .sf-sub{font-size:.75rem;padding:0 1rem;}
  #why{padding:2rem 1.2rem;}
  .hero-manifesto-wrap{margin:2.5rem auto 0;padding:0 0.5rem;}
  #why.hero-manifesto-wrap{padding:0 0.5rem;}
  .hero-manifesto-title{font-size:clamp(1.15rem, 5.5vw, 1.65rem);padding:0;margin-bottom:1.8rem;line-height:1.2;background:transparent;border:none;box-shadow:none;}
  .hero-manifesto-desc{font-size:0.78rem;margin-bottom:1.5rem;max-width:100%;}
  .hero-manifesto-grid{display:flex;flex-direction:row;justify-content:space-between;gap:0.4rem;}
  .hero-manifesto-item{gap:0.4rem;flex:1;}
  .hmi-circle{width:36px;height:36px;border-radius:10px;border-width:1.2px;}
  .hmi-circle svg{width:14px;height:14px;stroke-width:1.8px;}
  .hmi-label{font-size:0.42rem;letter-spacing:0;line-height:1.1;}
  #process{padding:4rem 1.2rem;}
  .proc-grid{grid-template-columns:1fr;gap:2.2rem;}
  .proc-card{flex-direction:row;text-align:left;gap:1.2rem;align-items:flex-start;background:rgba(255,255,255,0.4);border:1px solid rgba(123,31,208,0.06);padding:1.4rem 1.2rem;border-radius:24px;box-shadow:0 6px 20px rgba(31,17,11,0.02);}
  .proc-card-content{align-items:flex-start;text-align:left;}
  .proc-node-circle{margin-bottom:0;flex-shrink:0;width:56px;height:56px;font-size:1.6rem;box-shadow:0 4px 15px rgba(31,17,11,0.03);}
  #cta{padding:4rem 1.2rem;}
  .cta-h{font-size:clamp(3rem,13vw,5.5rem);}
  .cta-btns{flex-direction:column;align-items:center;gap:.8rem;}
  .btn-glow,.btn-ghost-white{width:100%;max-width:280px;text-align:center;}
  .cta-bg-circle{display:none;}
  footer{grid-template-columns:1fr;gap:1.5rem;padding:2rem 1.2rem 1.5rem;}
  .fb{padding:1rem 1.2rem;flex-direction:column;gap:.4rem;}
  .fl{font-size:1.5rem;}
  .dnav{display:none;}

}
@media(max-width:480px){
  .hero-h1{
    font-size: clamp(4.5rem, 22vw, 6.4rem);
    line-height: .78;
    letter-spacing: -.035em;
    margin-bottom: -.6rem;
  }
  .hs-pill{
    font-size: 0.62rem;
    letter-spacing: 0.08em;
    padding: 0.5rem 0.9rem;
    white-space: nowrap;
  }

  .hero-wave{top:30%;}
  .hero-bg-word{top: 35%;
    font-size: clamp(5rem, 24vw, 7rem);}
  .hero-main-prod-wrap{ max-width: 92%;
    margin: -12px auto .5rem;}
  .hs-main{font-size:clamp(.85rem,4vw,1.1rem);}
  .why-hcard{width:240px;}
  .sf-heading{font-size:clamp(1.4rem,8vw,2.8rem);}
  .sf-spicy{font-size:clamp(1.6rem,8vw,3rem);}
  .cta-h{font-size:clamp(2.5rem,11vw,4.5rem);}
}

/* ── Menu Section & Product Grid ── */
#menu {
  padding: 1.5rem 5% 6rem;
  background: var(--cream2);
  position: relative;
  overflow: hidden;
  border-bottom: 1px solid rgba(22,20,15,.04);
}
.menu-container {
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  z-index: 2;
}
.menu-header {
  margin-bottom: 3.5rem;
  text-align: center;
}
.menu-kicker {
  font-family: var(--font-space-grotesk), sans-serif;
  font-size: .65rem;
  letter-spacing: .08em;
  color: var(--p);
  text-transform: uppercase;
  margin-bottom: 0.8rem;
  font-weight: 700;
}
.menu-h {
  font-family: 'Fraunces', serif;
  font-weight: 800;
  font-size: clamp(2rem, 4vw, 3.5rem);
  letter-spacing: -.02em;
  line-height: 1;
  color: var(--ink);
}
.menu-h span {
  color: var(--p);
}
.menu-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.8rem;
  margin-top: 1rem;
}
.menu-card {
  background: #ffffff;
  border-radius: 18px;
  overflow: hidden;
  border: 1.5px solid rgba(22, 20, 15, 0.06);
  box-shadow: 0 2px 16px rgba(22, 20, 15, 0.06);
  position: relative;
  display: flex;
  flex-direction: column;
  transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
}
.menu-card:hover {
  transform: translateY(-4px);
  border-color: rgba(123, 31, 208, 0.18);
  box-shadow: 0 8px 25px rgba(123, 31, 208, 0.08);
}
.menu-card.in-cart {
  border-color: rgba(123, 31, 208, 0.34);
}
.menu-img-wrap {
  width: 100%;
  height: 130px;
  position: relative;
  background: #f2ede0;
  overflow: hidden;
}
.menu-img-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.6s cubic-bezier(0.165, 0.84, 0.44, 1);
}
.menu-card:hover .menu-img-wrap img {
  transform: scale(1.05);
}
.menu-card-num {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 2;
  font-family: var(--font-space-grotesk), sans-serif;
  font-weight: 700;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.9);
  background: rgba(22, 20, 15, 0.55);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  width: 24px;
  height: 24px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.menu-card-badge {
  position: absolute;
  bottom: 7px;
  right: 7px;
  z-index: 2;
  background: var(--pl);
  color: var(--ink);
  font-size: 8px;
  font-weight: 700;
  padding: 3px 7px;
  border-radius: 20px;
  letter-spacing: 0.02em;
  font-family: var(--font-space-grotesk), sans-serif;
}
.menu-card-qty-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 3;
  background: linear-gradient(135deg, var(--p2), var(--p), var(--pd));
  color: #fff;
  font-size: 8.5px;
  font-weight: 700;
  padding: 3px 7px;
  border-radius: 20px;
  font-family: var(--font-space-grotesk), sans-serif;
}
.menu-card-body {
  padding: 14px;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}
.menu-card-title {
  font-family: 'Fraunces', serif;
  font-weight: 700;
  font-size: 14.5px;
  color: var(--ink);
  line-height: 1.2;
  margin-bottom: 4px;
}
.menu-card-unit {
  font-family: var(--font-space-grotesk), sans-serif;
  font-size: 9.5px;
  color: rgba(22, 20, 15, 0.62);
  font-weight: 500;
  margin-bottom: 9px;
  letter-spacing: 0.02em;
}
.menu-card-price-row {
  display: flex;
  align-items: baseline;
  gap: 5px;
  margin-bottom: 10px;
  margin-top: auto;
}
.menu-card-old-price {
  font-size: 10.5px;
  color: rgba(22, 20, 15, 0.28);
  text-decoration: line-through;
  font-family: var(--font-space-grotesk), sans-serif;
}
.menu-card-price {
  font-family: 'Fraunces', serif;
  font-weight: 800;
  font-size: 18px;
  color: var(--p);
}
.menu-card-price-unit {
  font-size: 9.5px;
  color: rgba(22, 20, 15, 0.3);
  font-family: var(--font-space-grotesk), sans-serif;
}
.btn-add-cart {
  width: 100%;
  background: rgba(123, 31, 208, 0.06);
  color: var(--p);
  border: 1.5px solid rgba(123, 31, 208, 0.2);
  border-radius: 12px;
  padding: 9px 0;
  font-family: var(--font-space-grotesk), sans-serif;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.02em;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  transition: all 0.2s;
  max-width: 100%;
}
.btn-add-cart:hover:not(:disabled) {
  background: linear-gradient(135deg,var(--p2),var(--p),var(--pd));
  color: var(--white);
  border-color: var(--p);
}
.btn-add-cart:disabled {
  background: rgba(22, 20, 15, 0.04);
  color: rgba(22, 20, 15, 0.25);
  border-color: rgba(22, 20, 15, 0.07);
  cursor: default;
}
.qty-selector {
  display: flex;
  align-items: center;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--p2), var(--p), var(--pd));
  overflow: hidden;
  max-width: 100%;
}
.qty-btn {
  width: 38px;
  height: 36px;
  background: rgba(0, 0, 0, 0.2);
  border: none;
  color: #fff;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.qty-val {
  flex: 1;
  text-align: center;
  font-family: 'Fraunces', serif;
  font-weight: 800;
  font-size: 15px;
  color: #fff;
}

.landing-banner-wrap{
    width:100%;
    max-width:1020px;
    margin:0 auto 2rem;

    display:flex;
    justify-content:center;
    align-items:center;
}

.landing-banner-wrap > *{
    width:100%;
    max-width:760px;
    margin:0 auto !important;
}
.landing-banner-wrap > div {
  margin: 0 !important;
  border-radius: 18px !important;
  background: #210331 !important;
  box-shadow: 0 18px 50px rgba(31, 17, 11, 0.12);
  border: 1px solid rgba(199, 242, 10, 0.18);
}
.landing-banner-wrap img {
  object-fit: contain !important;
}

/* Modal and Pincode Dialog overlay classes */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(22, 20, 15, 0.64);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right)) max(1rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left));
  overflow-y: auto;
}
.pincode-modal-card {
  width: 100%;
  max-width: 430px;
  max-height: min(92dvh, 720px);
  background: var(--cream);
  border-radius: 28px;
  border: 1px solid rgba(123, 31, 208, 0.16);
  box-shadow: 0 24px 70px rgba(31, 17, 11, 0.34);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
}
.pincode-close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  width: 36px;
  height: 36px;
  border-radius: 999px;
  border: 1px solid rgba(31, 17, 11, 0.12);
  background: rgba(255, 255, 255, 0.92);
  color: var(--ink);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 8px 22px rgba(31, 17, 11, 0.12);
  transition: transform 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
}
.pincode-close-btn:hover {
  background: #fff;
  transform: scale(1.04);
  box-shadow: 0 10px 26px rgba(31, 17, 11, 0.18);
}
.pincode-close-btn:active {
  transform: scale(0.96);
}

@media (max-width: 900px) {
  #menu {
    padding: 0.75rem 1.2rem 4rem;
  }
  .menu-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  .menu-img-wrap {
    height: 145px;
  }
  .menu-card-body {
    padding: 12px;
  }
  .landing-banner-wrap {
    margin-bottom: 1.4rem;
  }
}
@media (max-width: 480px) {
  .modal-overlay {
    align-items: flex-end;
    padding: max(0.75rem, env(safe-area-inset-top)) 0.75rem max(0.75rem, env(safe-area-inset-bottom));
  }
  .pincode-modal-card {
    max-width: 100%;
    max-height: 88dvh;
    border-radius: 24px;
  }
  .pincode-close-btn {
    top: 10px;
    right: 10px;
    width: 34px;
    height: 34px;
  }
  .menu-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
  .landing-banner-wrap {
    margin-bottom: 1rem;
  }
  .landing-banner-wrap > div {
    border-radius: 16px !important;
    aspect-ratio: 16 / 8.5 !important;
  }
}

/* ── Trust Section & Testimonials Redesign ── */
.trust-section {
  background: var(--cream3);
  padding: 4.5rem 5% 3.5rem;
  text-align: center;
  border-top: 1px solid rgba(22, 20, 15, 0.05);
  border-bottom: 1px solid rgba(22, 20, 15, 0.05);
}
.trust-container {
  max-width: 1000px;
  margin: 0 auto;
}
.trust-rating-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(95, 7, 155, 0.05);
  border: 1px solid rgba(95, 7, 155, 0.12);
  padding: 8px 18px;
  border-radius: 999px;
  margin-bottom: 2rem;
  font-family: var(--font-space-grotesk), sans-serif;
  font-weight: 700;
  font-size: 0.78rem;
  color: var(--p);
}
.trust-rating-pill span {
  color: rgba(22, 20, 15, 0.35);
}
.trust-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2.2rem;
  margin-top: 1.5rem;
  border-top: 1px solid rgba(22, 20, 15, 0.08);
  padding-top: 2rem;
}
.trust-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
}
.trust-icon {
  font-size: 1.6rem;
  line-height: 1;
}
.trust-title {
  font-family: 'Fraunces', serif;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--p);
  text-transform: uppercase;
  letter-spacing: 0.02em;
}
.trust-desc {
  font-family: var(--font-space-grotesk), sans-serif;
  font-size: 0.85rem;
  color: var(--ink2);
  line-height: 1.5;
  max-width: 28ch;
}
.testimonials-section {
  background: var(--cream2);
  padding: 6rem 5% 7rem;
  border-bottom: 1px solid rgba(22, 20, 15, 0.05);
}
.testimonials-container {
  max-width: 1200px;
  margin: 0 auto;
}
.testimonials-header {
  text-align: center;
  margin-bottom: 4rem;
}
.testimonials-title {
  font-family: 'Fraunces', serif;
  font-weight: 800;
  font-size: clamp(2.2rem, 5vw, 3.8rem);
  text-transform: uppercase;
  color: var(--ink);
  line-height: 1;
  letter-spacing: -0.015em;
  margin-top: 10px;
}
.testimonials-grid{
    display:flex;
    gap:24px;
    overflow-x:auto;
    scroll-snap-type:x mandatory;
    scroll-behavior:smooth;
    scrollbar-width:none;
    -ms-overflow-style:none;
    padding-bottom:8px;
}

.testimonials-grid::-webkit-scrollbar{
    display:none;
}
.testimonials-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 2rem;
}
.test-nav-btn {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: #ffffff;
  border: 1.5px solid rgba(123, 31, 208, 0.14);
  color: var(--p);
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 6px 16px rgba(123, 31, 208, 0.05);
  transition: all 0.25s ease;
  user-select: none;
}
.test-nav-btn:hover {
  background: var(--p);
  color: #ffffff;
  border-color: var(--p);
  transform: scale(1.08);
  box-shadow: 0 8px 20px rgba(123, 31, 208, 0.2);
}
.test-nav-btn:active {
  transform: scale(0.95);
}
.testimonial-card{
    flex:0 0 calc((100% - 48px)/3);
    scroll-snap-align:start;
}
.testimonial-card {
  background: #ffffff;
  border: 1px solid rgba(22, 20, 15, 0.06);
  border-radius: 28px;
  padding: 2.2rem;
  box-shadow: 0 10px 30px rgba(31, 17, 11, 0.02);
  transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 280px;
}
.testimonial-card:hover {
  transform: translateY(-5px);
  border-color: rgba(123, 31, 208, 0.16);
  box-shadow: 0 20px 45px rgba(123, 31, 208, 0.08);
}
  @media(max-width:900px){

.testimonial-card{
    flex:0 0 80%;
}

}

@media(max-width:600px){

.testimonial-card{
    flex:0 0 92%;
}

}
.stars {
  display: flex;
  gap: 3px;
  margin-bottom: 1.2rem;
}
.star-icon {
  color: #F59E0B;
  font-size: 14px;
}
.testimonial-text {
  font-family: var(--font-space-grotesk), sans-serif;
  font-size: 0.88rem;
  color: var(--ink2);
  line-height: 1.65;
  margin-bottom: 1.8rem;
  font-style: italic;
  flex-grow: 1;
}
.testimonial-author {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  border-top: 1px solid rgba(22, 20, 15, 0.06);
  padding-top: 1.2rem;
  margin-top: auto;
}
.author-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  color: #fff;
  font-family: 'Fraunces', serif;
  font-size: 0.85rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.author-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.author-name {
  font-family: 'Fraunces', serif;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--ink);
}
.author-location {
  font-family: var(--font-space-grotesk), sans-serif;
  font-size: 0.72rem;
  color: rgba(22, 20, 15, 0.45);
}

@media(max-width: 900px) {
  .trust-grid {
    grid-template-columns: 1fr;
    gap: 1.6rem;
  }
  .testimonial-card {
    flex: 0 0 calc((100% - 24px)/2);
  }
}
@media(max-width: 600px) {
  .testimonial-card {
    flex: 0 0 100%;
    padding: 1.8rem;
    min-height: auto;
  }
}

/* ── Call Us Section ── */
.call-us-section {
  background: var(--cream3);
  padding: 5.5rem 5% 5rem;
  text-align: center;
  position: relative;
  overflow: hidden;
  border-top: 1px solid rgba(22, 20, 15, 0.05);
}
.call-us-container {
  max-width: 680px;
  margin: 0 auto;
  position: relative;
  z-index: 2;
}
.call-us-heading {
  font-family: 'Fraunces', serif;
  font-weight: 700;
  font-size: clamp(1.8rem, 4.2vw, 2.8rem);
  color: var(--p);
  text-transform: uppercase;
  line-height: 1.15;
  margin-bottom: 1rem;
}
.call-us-subheading {
  font-family: var(--font-space-grotesk), sans-serif;
  font-size: 0.95rem;
  color: var(--ink2);
  line-height: 1.6;
  max-width: 54ch;
  margin: 0 auto 2.5rem;
}
.call-us-btn-wrap {
  position: relative;
  display: inline-block;
  margin-bottom: 2.2rem;
}
.btn-call-now {
  background: linear-gradient(135deg, var(--p2), var(--p), var(--pd));
  color: #fff;
  border: none;
  padding: 1.1rem 3rem;
  font-family: var(--font-space-grotesk), sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
  border-radius: 9999px;
  box-shadow: 0 12px 30px rgba(123, 31, 208, 0.35);
  display: inline-flex;
  align-items: center;
  gap: 12px;
  transition: all 0.25s ease;
  position: relative;
  z-index: 2;
  text-decoration: none;
}
.btn-call-now:hover {
  transform: translateY(-3px);
  box-shadow: 0 18px 40px rgba(123, 31, 208, 0.45);
}
.call-glow-pulse {
  position: absolute;
  inset: -4px;
  border-radius: 9999px;
  background: var(--p2);
  filter: blur(10px);
  opacity: 0.4;
  z-index: 1;
  animation: callGlow 3s ease infinite;
}
@keyframes callGlow {
  0%, 100% { opacity: 0.35; transform: scale(1); }
  50% { opacity: 0.55; transform: scale(1.05); }
}
.call-us-trust-row {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 2rem;
  flex-wrap: wrap;
  margin-top: 1.5rem;
  border-top: 1px solid rgba(22, 20, 15, 0.08);
  padding-top: 1.8rem;
}
.call-us-trust-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-space-grotesk), sans-serif;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--ink);
  letter-spacing: 0.015em;
  line-height: 1.45;
}
.call-us-trust-dot {
  width: 6px;
  height: 6px;
  background: var(--p2);
  border-radius: 50%;
}
@media(max-width: 600px) {
  .call-us-trust-row {
    flex-direction: column;
    gap: 0.8rem;
    align-items: center;
  }
}
@media (max-width: 480px) {
  /* Global section spacing */
  section{
    padding-top: 2.5rem !important;
    padding-bottom: 2.5rem !important;
  }

  /* Hero keeps its own spacing */
  #hero{
    padding-top: 6.2rem !important;
    padding-bottom: .5rem !important;
  }

  /* Main sections */
  #scroll-story,
  #process,
  #menu,
  .trust-section,
  .testimonials-section,
  .call-us-section,
  #cta{
    padding-top: 2.5rem !important;
    padding-bottom: 2.5rem !important;
  }

  /* Section headers */
  .menu-header,
  .testimonials-header,
  .proc-header{
    margin-bottom: 1.8rem !important;
  }

  /* Reduce unnecessary gaps */
  .hero-manifesto-wrap,
  .trust-grid,
  .call-us-trust-row,
  .hero-manifesto-grid{
    margin-top: 1rem !important;
  }

  .hero-manifesto-title,
  .hero-manifesto-desc,
  .trust-rating-pill,
  .call-us-subheading{
    margin-bottom: 1rem !important;
  }

  /* Cards */
  .story-grid,
  .proc-grid,
  .menu-grid,
  .testimonials-grid{
    gap: 1rem !important;
  }

  /* Remove large bottom whitespace */
  footer{
    margin-top: 0 !important;
  }
}

nav,
nav a,
nav button,
.nav-btn {
  font-family: var(--font-space-grotesk), sans-serif !important;
}
.logo {
  font-family: 'League Spartan', serif !important;
}
  @media (max-width: 900px) {
  nav {
    padding: 0.7rem 1rem;
  }

  .nav-r {
    gap: 0.45rem; /* Reduce spacing between login icon and button */
  }

  .nav-btn {
    padding: 0.55rem 1rem;
    font-size: 0.62rem;
    min-height: 36px;
  }

  .nav-auth-btn {
    width: 32px;
    height: 32px;
    margin-left: 0;
  }

  .nav-auth-btn svg {
    width: 16px;
    height: 16px;
  }
}
`;
const testimonials = [
  {
    stars: 5,
    text: "Was a bit skeptical about ordering fresh chicken online, but B'Luru Fresh really delivered. Literally got it within 45 minutes here in Yelahanka. The pieces were chilled, clean, and zero leakage in the vacuum pack. Made pepper chicken, and it was so tender. Finally a reliable place!",
    author: "Hemanth Kumar",
    avatar: "H",
    color: "#9333EA",
  },
  {
    stars: 5,
    text: "Honestly, I'm done with supermarket frozen meat. This was completely different. The pieces actually looked pink and fresh, not white and water-logged. My mother-in-law is very picky about cleaning the chicken, but even she was satisfied with how clean this was. Definitely ordering again next Sunday.",
    author: "Sneha Hegde",
    avatar: "S",
    color: "#7E22CE",
  },
  {
    stars: 5,
    text: "Super fast delivery to Thirumenahalli. The packaging is top class – double sealed so no smell in the fridge. Highly recommend the curry cut.",
    author: "Karthik R.",
    avatar: "K",
    color: "#84CC16",
  },
  {
    stars: 5,
    text: "Usually, local shops give rough cuts with too much bone and skin, but B'Luru Fresh does a really professional job. The boneless breast pieces were perfectly cleaned and trimmed. Made butter chicken for guests, and they loved how juicy it was.",
    author: "Anjali Menon",
    avatar: "A",
    color: "#F59E0B",
  },
  {
    stars: 5,
    text: "Ordered late evening for a barbecue at our place in Judicial Layout. Reached in 50 mins flat, packed in a sterile cold box. The drumsticks were huge and fresh. Very convenient if you don't want to stand in dirty wet-markets on weekends.",
    author: "Rohan D'Souza",
    avatar: "R",
    color: "#3B82F6",
  },
  {
    stars: 5,
    text: "Working late in Bangalore means wet markets are closed. Tried this on a Wednesday night. Delivery driver was polite and called once he reached the gate. Clean cuts, exact weight, and very fresh chicken. Lifesaver!",
    author: "Preeti N.",
    avatar: "P",
    color: "#EC4899",
  },
  {
    stars: 5,
    text: "Consistently good quality. Have ordered 4 times now and the freshness is always top-notch. Cuts are clean and no extra fat left on the pieces.",
    author: "Vikram Gowda",
    avatar: "V",
    color: "#14B8A6",
  },
  {
    stars: 5,
    text: "Honestly fed up of frozen and old stuffs. Ordered from you late evening and it reached chilled and fresh. Made chilli chicken the same night, turned out superb 😊 you guys have got a regular customer now!",
    author: "Hemanth",
    avatar: "H",
    color: "#9333EA",
  },
  {
    stars: 5,
    text: "The webApp is super-friendly and ordering is very easy within 4 clicks, that's excellent. Also the product is toooo good 😍👍🏻",
    author: "Prajwal Aiy...",
    avatar: "P",
    color: "#7E22CE",
  },
  {
    stars: 5,
    text: "Really impressed with this order! The chicken arrived on time, was very well packed and had zero smell. Tasted fresh and delicious. Great job on packaging and delivery! 👍🏻",
    author: "Rakesh Sath...",
    avatar: "R",
    color: "#84CC16",
  },
  {
    stars: 5,
    text: "My wife is very particular about meat and even she had no complaints with what you sent. Properly cleaned, hardly any extra fat and the weight was exactly as mentioned.",
    author: "Sooraj Kumar",
    avatar: "S",
    color: "#F59E0B",
  },
  {
    stars: 5,
    text: "Ordered from you for our Sunday family lunch. The pieces you sent were nicely cut and very fresh. Even my mother was impressed 😊 well done team!",
    author: "Roshan Chan...",
    avatar: "R",
    color: "#3B82F6",
  },
  {
    stars: 5,
    text: "Being a working mother I rarely get time to visit the market, so thank you for making this so easy. The chicken you delivered was so clean and fresh — no smell even while cooking.",
    author: "Dhanya Rama...",
    avatar: "D",
    color: "#EC4899",
  },
  {
    stars: 5,
    text: "No more standing in line at the meat shop. Order in the morning, get it cut fresh and delivered. Quality is consistently great every time.",
    author: "Harsha",
    avatar: "H",
    color: "#14B8A6",
  },
];
export default function Home() {
  const pathname = usePathname();
  const isOrderPage = pathname === "/order";
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loginOpen, setLoginOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const testimonialRef = useRef<HTMLDivElement>(null);
  const [pincode, setPincode] = useState<string | null>(null);
  const [, setAreaName] = useState("");

  // Live settings
  const [storeOpen, setStoreOpen] = useState(true);
  const [announcement, setAnnouncement] = useState("");
  const [minOrder, setMinOrder] = useState(0);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [bannerImages, setBannerImages] = useState<string[]>([]);
  const [productOrder, setProductOrder] = useState<string[]>([]);
  const [productUnits, setProductUnits] = useState<Record<string, string>>({});

  // Products
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState("");
  const [activeProductId, setActiveProductId] = useState<string | null>(null);

  // Hydrate user
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      })
      .catch(() => {})
      .finally(() => setAuthLoading(false));
  }, []);

  // Hydrate settings
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        setStoreOpen(d.store_open !== false);
        setAnnouncement(
          typeof d.announcement === "string" ? d.announcement : "",
        );
        setMinOrder(
          typeof d.min_order_amount === "number" ? d.min_order_amount : 0,
        );
        setDeliveryFee(typeof d.delivery_fee === "number" ? d.delivery_fee : 0);
        setBannerImages(Array.isArray(d.banner_images) ? d.banner_images : []);
        setProductOrder(Array.isArray(d.product_order) ? d.product_order : []);
        setProductUnits(
          d.product_units && typeof d.product_units === "object"
            ? d.product_units
            : {},
        );
      })
      .catch(() => {});
  }, []);

  // Hydrate products
  useEffect(() => {
    async function load() {
      setProductsLoading(true);
      try {
        const res = await fetch("/api/products");
        console.log(res);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setProducts(data);
        if (data.length > 0) setActiveProductId(data[0].id);
      } catch (e) {
        setProductsError(
          e instanceof Error ? e.message : "Failed to load products",
        );
      } finally {
        setProductsLoading(false);
      }
    }
    load();
  }, []);

  // Hydrate delivery address from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("bf-delivery-address-v2");
      if (!saved) return;
      const addr = JSON.parse(saved) as {
        pincode?: string;
        streetAddress?: string;
      };
      setPincode(addr.pincode ?? null);
      setAreaName(addr.streetAddress ?? "Saved address");
    } catch {}
  }, []);

  // Hydrate cart from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("bf-cart");
      if (saved) setCart(JSON.parse(saved));
    } catch {}
  }, []);

  // Sync cart to localStorage and backend
  useEffect(() => {
    localStorage.setItem("bf-cart", JSON.stringify(cart));
    if (user) {
      fetch("/api/user/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart,
          updatedAt: new Date().toISOString(),
        }),
      }).catch(() => {});
    }
  }, [cart, user]);
  // Testimonial auto scrolling
  useEffect(() => {
    const container = testimonialRef.current;
    if (!container) return;

    let paused = false;

    const interval = setInterval(() => {
      if (paused) return;

      const card = container.querySelector(".testimonial-card") as HTMLElement;

      if (!card) return;

      const amount = card.offsetWidth + 24;

      if (
        container.scrollLeft + container.clientWidth >=
        container.scrollWidth - 10
      ) {
        container.scrollTo({
          left: 0,
          behavior: "smooth",
        });
      } else {
        container.scrollBy({
          left: amount,
          behavior: "smooth",
        });
      }
    }, 3000);

    container.addEventListener("mouseenter", () => (paused = true));
    container.addEventListener("mouseleave", () => (paused = false));
    container.addEventListener("touchstart", () => (paused = true));
    container.addEventListener("touchend", () => (paused = false));

    return () => clearInterval(interval);
  }, []);
  // Cart operations
  const addToCart = useCallback((item: CartItem) => {
    setCart((prev) => {
      const idx = prev.findIndex((c) => c.productId === item.productId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          quantity: +(next[idx].quantity + item.quantity).toFixed(1),
        };
        return next;
      }
      return [...prev, item];
    });
  }, []);

  const updateCartQty = useCallback((productId: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((c) => c.productId !== productId));
    } else {
      setCart((prev) =>
        prev.map((c) =>
          c.productId === productId ? { ...c, quantity: qty } : c,
        ),
      );
    }
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const cartTotal = cart.reduce((s, c) => s + c.pricePerKg * c.quantity, 0);
  const cartItemCount = cart.reduce((s, c) => s + c.quantity, 0);
  const dedupedProducts = products.filter((product, index, list) => {
    const nameKey = product.name.trim().toLowerCase();
    return (
      list.findIndex((item) => item.name.trim().toLowerCase() === nameKey) ===
      index
    );
  });
  const visibleProducts = [...dedupedProducts].sort((a, b) => {
    const ai = productOrder.indexOf(a.id);
    const bi = productOrder.indexOf(b.id);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  useEffect(() => {
    // Progress bar
    const prog = document.getElementById("prog");
    const onScroll = () => {
      if (!prog) return;
      const h = document.documentElement.scrollHeight - window.innerHeight;
      prog.style.width = (window.scrollY / h) * 100 + "%";
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    // Dot nav
    const secIds = ["hero", "scroll-story", "why", "process", "menu"];
    const dns = document.querySelectorAll(".dn");
    secIds.forEach((id, i) => {
      const el = document.getElementById(id);
      if (el)
        new IntersectionObserver(
          (en) => {
            if (en[0].isIntersecting)
              dns.forEach((d, j) => d.classList.toggle("on", j === i));
          },
          { threshold: 0.4 },
        ).observe(el);
    });

    // Reveal
    const ro = new IntersectionObserver(
      (en) => {
        en.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("in");
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" },
    );
    document.querySelectorAll(".rv").forEach((el) => ro.observe(el));

    // Split word hero
    const swIO = new IntersectionObserver(
      (en) => {
        en.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("in");
        });
      },
      { threshold: 0.1 },
    );
    document.querySelectorAll(".split-word").forEach((el) => swIO.observe(el));

    // Process progress line animation

    // Counter
    function animC(el: Element, target: number, dur = 1400) {
      let s: number | null = null;
      const step = (ts: number) => {
        if (!s) s = ts;
        const p = Math.min((ts - s) / dur, 1);
        el.textContent = String(Math.round((1 - Math.pow(1 - p, 3)) * target));
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = String(target);
      };
      requestAnimationFrame(step);
    }
    const whyEl = document.getElementById("why");
    if (whyEl)
      new IntersectionObserver(
        (en) => {
          en.forEach((e) => {
            if (e.isIntersecting && !(e.target as HTMLElement).dataset.done) {
              (e.target as HTMLElement).dataset.done = "1";
              e.target
                .querySelectorAll(".count-num")
                .forEach((n) =>
                  animC(n, parseInt((n as HTMLElement).dataset.count || "0")),
                );
            }
          });
        },
        { threshold: 0.5 },
      ).observe(whyEl);

    // 3D tilt
    document
      .querySelectorAll<HTMLElement>(
        ".hero-manifesto-item,.proc-card,.menu-card,.testimonial-card",
      )
      .forEach((c) => {
        c.addEventListener("mousemove", (e: Event) => {
          const me = e as MouseEvent;
          const r = c.getBoundingClientRect();
          const x = (me.clientX - r.left) / r.width - 0.5,
            y = (me.clientY - r.top) / r.height - 0.5;
          c.style.transform = `perspective(800px) rotateX(${y * -6}deg) rotateY(${x * 6}deg) translateZ(8px)`;
        });
        c.addEventListener("mouseleave", () => {
          c.style.transform = "";
        });
      });

    // Magnetic buttons
    document
      .querySelectorAll<HTMLElement>(
        ".btn-fill,.btn-glow,.nav-btn,.btn-call-now",
      )
      .forEach((b) => {
        b.addEventListener("mousemove", (e: Event) => {
          const me = e as MouseEvent;
          const r = b.getBoundingClientRect();
          const x = (me.clientX - r.left - r.width / 2) * 0.2,
            y = (me.clientY - r.top - r.height / 2) * 0.2;
          b.style.transform = `translate(${x}px,${y}px) scale(1.04)`;
        });
        b.addEventListener("mouseleave", () => {
          b.style.transform = "";
        });
      });

    // Hero parallax
    const hh1 = document.querySelector<HTMLElement>(".hero-h1");
    const heroEl = document.getElementById("hero");
    if (heroEl && hh1) {
      heroEl.addEventListener("mousemove", (e: Event) => {
        const me = e as MouseEvent;
        const r = heroEl.getBoundingClientRect();
        const cx = (me.clientX - r.left) / r.width - 0.5,
          cy = (me.clientY - r.top) / r.height - 0.5;
        hh1.style.transform = `translate(${cx * 12}px,${cy * 8}px)`;
      });
      heroEl.addEventListener("mouseleave", () => {
        hh1.style.transform = "";
      });
    }

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cfOrderId = params.get("cashfree_order_id");
    if (!cfOrderId) return;

    window.history.replaceState({}, "", window.location.pathname);

    const pendingStr = localStorage.getItem("bf-pending-payment");
    if (!pendingStr) {
      setCart([]);
      return;
    }
    const pendingRaw = pendingStr;
    localStorage.removeItem("bf-pending-payment");

    async function completePayment() {
      setCart([]);

      // Use that captured value later during verification.
      try {
        const parsed = JSON.parse(pendingRaw);
        console.log(
          "[completePayment] Verification metadata for order:",
          parsed.cashfreeOrderId,
        );
      } catch {}

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          if (attempt > 1) {
            await new Promise((r) => setTimeout(r, 3000 * attempt));
          }

          const vRes = await fetch("/api/cashfree/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ order_id: cfOrderId }),
          });

          if (!vRes.ok) {
            if (attempt < 3) continue;
            return;
          }

          const patchRes = await fetch("/api/orders/cod", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              cashfree_order_id: cfOrderId,
              payment_status: "paid",
            }),
          });

          if (patchRes.ok) {
            try {
              const parsed = JSON.parse(pendingRaw);
              window.dataLayer = window.dataLayer || [];
              window.dataLayer.push({ ecommerce: null });
              window.dataLayer.push({
                event: "purchase",
                payment_type: "Online",
                ecommerce: {
                  transaction_id: parsed.realOrderId || parsed.cashfreeOrderId,
                  value: parsed.total,
                  coupon: parsed.coupon,
                  currency: parsed.currency || "INR",
                  items: parsed.cart.map((c: any) => ({
                    item_id: c.productId,
                    item_name: c.name,
                    price: c.pricePerKg,
                    quantity: c.quantity,
                  })),
                },
              });
            } catch (e) {
              console.error(
                "[Verification] failed to push GTM purchase event:",
                e,
              );
            }
            return;
          }
        } catch {
          // Retry a couple of times because Cashfree can take a moment.
        }
      }
    }

    completePayment().catch(() => {});
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      setCart([]);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const goOrder = () => {
    if (cartItemCount > 0) {
      setCartOpen(true);
    } else {
      document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" });
    }
  };
  const goStory = () => {
    document
      .getElementById("scroll-story")
      ?.scrollIntoView({ behavior: "smooth" });
  };
  const scrollPrev = () => {
    const container = testimonialRef.current;
    if (!container) return;
    const card = container.querySelector(".testimonial-card") as HTMLElement;
    if (!card) return;
    const amount = card.offsetWidth + 24;
    container.scrollBy({
      left: -amount,
      behavior: "smooth",
    });
  };
  const scrollNext = () => {
    const container = testimonialRef.current;
    if (!container) return;
    const card = container.querySelector(".testimonial-card") as HTMLElement;
    if (!card) return;
    const amount = card.offsetWidth + 24;
    container.scrollBy({
      left: amount,
      behavior: "smooth",
    });
  };

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=League+Spartan:wght@800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Fraunces:ital,opsz,wght@0,9..144,700;0,9..144,800;0,9..144,900;1,9..144,700&display=swap"
        rel="stylesheet"
      />
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <Script
        type="text/javascript"
        src="https://d3mkw6s8thqya7.cloudfront.net/integration-plugin.js"
        id="aisensy-wa-widget"
        widget-id="aabjd8"
        strategy="afterInteractive"
      />

      <div id="prog" />

      {/* {!cartOpen && !loginOpen && (
        <button
          className="float-order"
          onClick={goOrder}
          style={
            cartItemCount > 0
              ? {
                  background:
                    "linear-gradient(135deg,var(--p2),var(--p),var(--pd))",
                  color: "#fff",
                  boxShadow:
                    "0 18px 56px rgba(123, 31, 208, 0.62), 0 0 0 8px rgba(199, 242, 10, 0.12), 0 8px 18px rgba(0,0,0,0.2)",
                }
              : undefined
          }
        >
          <span className="fo-icon">{cartItemCount > 0 ? "🛒" : "⚡"}</span>
          <span className="fo-text">
            <span
              className="fo-main"
              style={cartItemCount > 0 ? { color: "#fff" } : undefined}
            >
              {cartItemCount > 0 ? `Cart (${cartItemCount})` : "Order Now"}
            </span>
            <span
              className="fo-sub"
              style={
                cartItemCount > 0
                  ? { color: "rgba(255,255,255,0.7)" }
                  : undefined
              }
            >
              {cartItemCount > 0
                ? `Total: ₹${cartTotal.toFixed(0)}`
                : "Delivery in 60 min"}
            </span>
          </span>
        </button>
      )} */}

      <div className="dnav" id="dnav">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`dn${i === 0 ? " on" : ""}`}
            onClick={() => {
              const ids = ["hero", "scroll-story", "why", "process", "menu"];
              document
                .getElementById(ids[i])
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          />
        ))}
      </div>

      <nav>
        <div className="logo">
          B&apos;LURU <span>FRESH</span>
        </div>
        <div className="nav-r">
          <a href="#why">Why</a>
          <a href="#process">Process</a>
          <a href="#menu">Menu</a>
          <a href="tel:+917012488951">Call</a>
          {user && (
            <Link
              href="/order-history"
              className={`nav-orders-btn ${isOrderPage ? "active" : ""}`}
              title="Your Orders"
            >
              <History size={16} />
              <span>Orders</span>
            </Link>
          )}
          {user ? (
            <button
              className="nav-auth-btn"
              onClick={handleLogout}
              aria-label="Logout"
              title="Logout"
            >
              <LogOut size={18} strokeWidth={2.2} />
            </button>
          ) : (
            <button
              className="nav-auth-btn"
              onClick={() => setLoginOpen(true)}
              aria-label="Login"
              title="Login"
            >
              <LogIn size={18} strokeWidth={2.2} />
            </button>
          )}
          <button
            className="nav-btn"
            onClick={goOrder}
            style={
              cartItemCount > 0
                ? {
                    background:
                      "linear-gradient(135deg,var(--p2),var(--p),var(--pd))",
                    color: "#fff",
                    borderColor: "var(--p)",
                  }
                : undefined
            }
          >
            {cartItemCount > 0 ? `Cart (${cartItemCount}) 🛒` : "Order Now"}
          </button>
        </div>
      </nav>

      <section id="hero">
        <div className="hero-wave" aria-hidden="true">
          <svg
            viewBox="0 0 1600 500"
            preserveAspectRatio="none"
            focusable="false"
          >
            <path d="M0 98 C180 145 340 174 520 184 C690 194 820 186 980 158 C1150 128 1330 106 1600 84 L1600 500 L0 500 Z" />
          </svg>
        </div>

        {/* Side Floating Plates (cut off at screen edges) */}
        <div className="float-side-left">
          <img src="/assets/raw_chicken_cuts.png" alt="Fresh Raw Cuts Plate" />
        </div>
        <div className="float-side-right">
          <img
            src="/assets/raw_chicken_breast.png"
            alt="Fresh Raw Breast Board"
          />
        </div>

        {/* Flying Spices and Herbs */}
        <div className="flying-spice fs-1">🌿</div>
        <div className="flying-spice fs-2">🌶️</div>
        <div className="flying-spice fs-3">🧄</div>
        <div className="flying-spice fs-4">🌿</div>
        <div className="flying-spice fs-5">🌶️</div>

        <h1 className="sr-only">
          Fresh Chicken Delivery in Bengaluru — Cut After Your Order |
          B&apos;LURU Fresh. Order fresh curry cut, boneless, drumstick &amp;
          wings chicken online in Yelahanka, Bangalore. Zero preservatives,
          delivered in 60 minutes.
        </h1>
        <div className="hero-bg-word">FRESH</div>

        <div className="hero-content-wrap">
          <div className="hs-pill">
            Bengaluru&apos;s first ultra-fresh system
          </div>

          <div className="hero-h1 rv d2">
            B&apos;LURU
            <br />
            <span className="line-light">FRESH</span>
          </div>

          {/* Large Floating Central Product Image */}
          <div className="hero-main-prod-wrap rv d3">
            <img
              src="/assets/raw_chicken_hero.png"
              className="hero-main-prod-img"
              alt="Fresh Raw Chicken Cuts Platter"
            />

            {/* Side Floating Badges */}
          </div>

          {/* Description & CTAs */}
          <div className="hero-bottom-content rv d4">
            <div className="hero-ctas">
              <button className="btn-fill" onClick={goOrder}>
                <span>
                  {cartItemCount > 0 ? "Proceed to Checkout 🛒" : "Order Now"}
                </span>
              </button>
              <button
                type="button"
                className="btn-line desktop-watch-cta"
                onClick={goStory}
              >
                Watch ↓
              </button>
              {user ? (
                <Link
                  href="/order-history"
                  className="btn-fill mobile-orders-cta"
                >
                  <History size={16} aria-hidden="true" />
                  <span>Orders</span>
                </Link>
              ) : (
                <button
                  type="button"
                  className="btn-line mobile-watch-cta"
                  onClick={goStory}
                >
                  Watch ↓
                </button>
              )}
            </div>

            {/* Redesigned highlighted manifesto & 4 circular items grid */}
            <div className="hero-manifesto-wrap" id="why">
              <div className="hero-manifesto-title">
                Introducing Bengaluru&apos;s First
                <br />
                Ultra-Fresh System
              </div>
              <p className="hero-manifesto-desc">
                From Now — <strong>Not frozen. Not stored overnight.</strong>{" "}
                Cut only after you order. Delivered in 60 minutes.
                <span className="hero-manifesto-proof">
                  NO FOUL SMELL . NO SLIMINESS
                </span>
              </p>
              {/* <div className="hero-manifesto-grid">
                {[
                  { Icon: BadgeCheck, label: "FSSAI Licensed" },
                  { Icon: Clock, label: "60 Min Delivery" },
                  { Icon: Scissors, label: "Cut-to-Order" },
                  { Icon: PackageCheck, label: "Vacuum Packed" },
                ].map((item, idx) => (
                  <div key={idx} className="hero-manifesto-item">
                    <div className="hmi-circle">
                      <item.Icon />
                    </div>
                    <div className="hmi-label">{item.label}</div>
                  </div>
                ))}
              </div> */}
            </div>
          </div>
        </div>
      </section>
      <section id="menu">
        <div className="menu-container">
          {bannerImages.length > 0 && (
            <div className="landing-banner-wrap">
              <BannerCarousel images={bannerImages} />
            </div>
          )}

          {productsLoading && (
            <div className="menu-grid">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="menu-card"
                  style={{
                    height: 300,
                    animation: "pulse 1.5s ease-in-out infinite",
                    background: "#fff",
                    opacity: 0.6,
                  }}
                >
                  <div style={{ height: 130, background: "#e5e7eb" }} />
                  <div style={{ padding: 12 }}>
                    <div
                      style={{
                        height: 14,
                        width: "70%",
                        background: "#e5e7eb",
                        borderRadius: 6,
                      }}
                    />
                    <div
                      style={{
                        height: 10,
                        width: "45%",
                        background: "#e5e7eb",
                        borderRadius: 4,
                        marginTop: 8,
                      }}
                    />
                    <div
                      style={{
                        height: 36,
                        background: "#e5e7eb",
                        borderRadius: 12,
                        marginTop: 20,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {productsError && (
            <div
              className="rounded-2xl p-4 text-center"
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#dc2626",
              }}
            >
              Failed to load fresh selection: {productsError}
            </div>
          )}

          {!productsLoading && !productsError && (
            <div className="menu-grid">
              {visibleProducts.map((p, idx) => {
                const qty =
                  cart.find((c) => c.productId === p.id)?.quantity ?? 0;
                const inCart = qty > 0;
                const outOfStock = p.stock_quantity === 0;
                const fallbacks: Record<string, string> = {
                  boneless: "/assets/raw_chicken_breast.png",
                  "curry-cut": "/assets/raw_chicken_cuts.png",
                  drumstick: "/assets/raw_drumsticks_plate.png",
                  wings: "/assets/packaged_chicken_new.jpg",
                  liver: "/assets/packaged_chicken_new.jpg",
                  "biriyani-cut": "/assets/raw_chicken_cuts.png",
                };
                const imgSrc =
                  p.image_url ??
                  fallbacks[p.id] ??
                  "/assets/packaged_chicken_new.jpg";
                const cardNum = String(idx + 1).padStart(2, "0");
                const discount = Math.max(
                  0,
                  Math.min(100, p.discount_percentage ?? 0),
                );
                const oldPrice = Math.round(p.price_per_kg);
                const displayPrice =
                  discount > 0
                    ? Math.round(oldPrice * (1 - discount / 100))
                    : oldPrice;
                const unit = productUnits[p.id] ?? "g";
                const weightLabel = p.weight_per_unit
                  ? unit === "pc"
                    ? `${p.weight_per_unit} pc${Number(p.weight_per_unit) > 1 ? "s" : ""}`
                    : unit === "kg"
                      ? `${p.weight_per_unit} kg`
                      : `${p.weight_per_unit}g`
                  : UNIT_LABEL;

                return (
                  <div
                    key={p.id}
                    className={`menu-card ${inCart ? "in-cart" : ""}`}
                    style={{ transitionDelay: `${idx * 0.1}s` }}
                  >
                    <div className="menu-img-wrap">
                      <img
                        src={imgSrc}
                        alt={p.name}
                        style={
                          outOfStock
                            ? { filter: "grayscale(0.5)", opacity: 0.6 }
                            : undefined
                        }
                      />
                      <div className="menu-card-num">{cardNum}</div>
                      {!outOfStock && (
                        <div className="menu-card-badge">
                          {discount > 0 ? `${discount}% OFF` : "FRESH"}
                        </div>
                      )}
                      {inCart && (
                        <div className="menu-card-qty-badge">✓ {qty}</div>
                      )}
                      {!outOfStock &&
                        p.stock_quantity > 0 &&
                        p.stock_quantity <= 5 &&
                        !inCart && (
                          <div
                            className="menu-card-qty-badge"
                            style={{
                              background: "var(--pl)",
                              color: "var(--ink)",
                            }}
                          >
                            ONLY {p.stock_quantity} LEFT
                          </div>
                        )}
                    </div>

                    <div className="menu-card-body">
                      <h3 className="menu-card-title">{p.name}</h3>
                      <p className="menu-card-unit">
                        {weightLabel} · Cut fresh on order
                      </p>

                      <div className="menu-card-price-row">
                        {discount > 0 && !outOfStock && (
                          <span className="menu-card-old-price">
                            ₹{oldPrice}
                          </span>
                        )}
                        <span className="menu-card-price">₹{displayPrice}</span>
                        <span className="menu-card-price-unit">/pc</span>
                      </div>

                      {outOfStock ? (
                        <button
                          disabled
                          className="btn-add-cart"
                          style={{ opacity: 0.5, cursor: "default" }}
                        >
                          Out of Stock
                        </button>
                      ) : qty === 0 ? (
                        <button
                          className="btn-add-cart"
                          onClick={() =>
                            addToCart({
                              productId: p.id,
                              name: p.name,
                              pricePerKg: displayPrice,
                              quantity: 1,
                              imageUrl: p.image_url,
                            })
                          }
                        >
                          <Plus size={14} /> Add to Cart
                        </button>
                      ) : (
                        <div className="qty-selector">
                          <button
                            className="qty-btn"
                            onClick={() => updateCartQty(p.id, qty - 1)}
                          >
                            −
                          </button>
                          <span className="qty-val">{qty}</span>
                          <button
                            className="qty-btn"
                            onClick={() => updateCartQty(p.id, qty + 1)}
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section id="trust" className="trust-section">
        <div className="trust-container">
          <div className="trust-rating-pill">
            ⭐ 5.0 Star Rating <span>|</span> 1.1K+ Customer Reviews
          </div>
          <div className="trust-grid">
            <div className="trust-item">
              <span className="trust-icon">📍</span>
              <h4 className="trust-title">Delivery Areas</h4>
              <p className="trust-desc">
                Yelahanka & surrounding Bangalore areas (dispatched from
                Thirumenahalli)
              </p>
            </div>
            <div className="trust-item">
              <span className="trust-icon">🛡️</span>
              <h4 className="trust-title">Food Safety</h4>
              <p className="trust-desc">
                FSSAI Licensed System. Zero preservatives, sterile vacuum
                packing.
              </p>
            </div>
            <div className="trust-item">
              <span className="trust-icon">📜</span>
              <h4 className="trust-title">FSSAI Registration</h4>
              <p className="trust-desc">
                FSSAI Lic. 11226331000344. 100% compliant with standard
                protocols.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="testimonials" className="testimonials-section">
        <div className="testimonials-container">
          <div className="testimonials-header">
            <span
              className="eyebrow"
              style={{
                display: "inline-block",
                background: "rgba(95, 7, 155, 0.05)",
                padding: "4px 12px",
                borderRadius: "100px",
                color: "var(--p)",
              }}
            >
              Testimonials
            </span>
            <h2 className="testimonials-title">
              Loved By <span style={{ color: "var(--p)" }}>Bengaluru</span>
            </h2>
          </div>
          <div ref={testimonialRef} className="testimonials-grid">
            {testimonials.map((item, idx) => (
              <div key={idx} className="testimonial-card">
                <div className="stars">
                  {[...Array(item.stars)].map((_, i) => (
                    <span key={i} className="star-icon">
                      ★
                    </span>
                  ))}
                </div>
                <p className="testimonial-text">&quot;{item.text}&quot;</p>
                <div className="testimonial-author">
                  <div
                    className="author-avatar"
                    style={{ background: item.color }}
                  >
                    {item.avatar}
                  </div>
                  <div className="author-meta">
                    <span className="author-name">{item.author}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="testimonials-nav">
            <button
              onClick={scrollPrev}
              className="test-nav-btn"
              aria-label="Previous testimonial"
            >
              ←
            </button>
            <button
              onClick={scrollNext}
              className="test-nav-btn"
              aria-label="Next testimonial"
            >
              →
            </button>
          </div>
        </div>
      </section>

      <div className="ticker">
        <div className="ticker-track">
          {[
            "NO FOUL SMELL",
            "CUT AFTER ORDER",
            "60 MIN DELIVERY",
            "ZERO PRESERVATIVES",
            "BENGALURU'S FIRST",
            "ULTRA-FRESH SYSTEM",
            "NO FOUL SMELL",
            "CUT AFTER ORDER",
            "60 MIN DELIVERY",
            "ZERO PRESERVATIVES",
            "BENGALURU'S FIRST",
            "ULTRA-FRESH SYSTEM",
          ].map((t, i) => (
            <div key={i} className="ti">
              {t}
              <span className="ti-sep">✦</span>
            </div>
          ))}
        </div>
      </div>

      <div id="scroll-story">
        {/* Floating Side Plates */}
        <div className="story-float-left">
          <img
            src="/assets/raw_chicken_curry.png"
            alt="Fresh Raw Curry Cuts Board"
          />
        </div>
        <div className="story-float-right">
          <img
            src="/assets/raw_drumsticks_plate.png"
            alt="Fresh Raw Drumsticks Plate"
          />
        </div>

        {/* Floating Spices and Herbs */}
        <div className="story-spice sp-1">🌿</div>
        <div className="story-spice sp-2">🌶️</div>
        <div className="story-spice sp-3">🧄</div>
        <div className="story-spice sp-4">🌿</div>

        <div className="story-grid">
          {/* Card 1: Revolution */}
          <div className="story-card rv d1">
            <div className="card-bg-panel" />
            <div className="card-bg-img img-right">
              <img
                src="/assets/raw_drumsticks_plate.png"
                alt="Fresh Raw Drumsticks Plate"
              />
              <span className="card-spice cs-1">🌶️</span>
              <span className="card-spice cs-2">🌿</span>
            </div>
            <div className="sf-label">01 — The Revolution</div>
            <h3 className="sf-heading">
              INTRODUCING
              <br />
              <span className="hl">BENGALURU&apos;S</span>
              <br />
              FIRST <span className="hp">ULTRA-FRESH</span> SYSTEM
            </h3>
            <p className="sf-sub">
              Bengaluru has never seen anything like this.{" "}
              <strong>Not frozen. Not stored.</strong> Freshly prepared for
              every single order.
            </p>
          </div>

          {/* Card 2: Truth */}
          <div className="story-card rv d2">
            <div className="card-bg-panel" />
            <div className="sf-label">02 — The Truth</div>
            <h3 className="sf-spicy">
              ZERO SH*T
              <br />
              IN OUR SYSTEM.
            </h3>
            <p className="sf-sub">
              We cut <strong>only after you order.</strong> Not in the morning.
              Not the night before. Your order triggers the knife.
            </p>
          </div>

          {/* Card 3: Speed */}
          <div className="story-card rv d3">
            <div className="card-bg-panel" />
            <div className="sf-label">03 — The Speed</div>
            <h3 className="sf-heading">
              FROM <span className="hl">KNIFE</span> TO YOUR{" "}
              <span className="hp">KITCHEN.</span>
            </h3>
            <p className="sf-sub">
              Processing → Hygienic Packing → Delivery. In under{" "}
              <strong>60 minutes.</strong>
            </p>
          </div>

          {/* Card 5: Order (Wide, spans 2 columns) */}
          <div className="story-card sc-wide rv d1" style={{ order: 5 }}>
            <div className="card-bg-panel" />
            <div>
              <div className="sf-label">05 — Taste The Difference</div>
              <h3 className="sf-spicy">
                TASTE THE{" "}
                <span style={{ color: "var(--pl)" }}>DIFFERENCE.</span>
              </h3>
              <p className="sf-sub">
                The freshest chicken Bengaluru has ever tasted. One order.
                You&apos;ll understand everything.
              </p>
            </div>
            <div style={{ marginTop: "2rem" }}>
              <button className="btn-glow" onClick={goOrder}>
                Order Fresh Now
              </button>
            </div>
          </div>

          {/* Card 4: Standard */}
          <div className="story-card rv d2" style={{ order: 4 }}>
            <div className="card-bg-panel" />
            <div className="card-bg-img img-left">
              <img
                src="/assets/raw_chicken_curry.png"
                alt="Fresh Raw Curry Cuts Board"
              />
              <span className="card-spice cs-1">🌿</span>
              <span className="card-spice cs-2">🧄</span>
            </div>
            <div className="sf-label">04 — The Standard</div>
            <h3 className="sf-heading">
              THE OLD
              <br />
              WAY IS <span className="hl">DEAD.</span>
            </h3>
            <p className="sf-sub">
              Bengaluru&apos;s first ultra-fresh chicken delivery experience.
              Not improved. <strong>Rebuilt from scratch.</strong>
            </p>
          </div>
        </div>
      </div>

      <section id="process">
        <div className="proc-bg-txt">PROCESS</div>
        <div className="proc-container">
          <div className="proc-header">
            <div className="proc-kicker rv">— How It Actually Works</div>
            <h2 className="proc-h rv d1">
              HOW IT
              <br />
              <span>WORKS.</span>
            </h2>
          </div>

          <div className="proc-grid">
            {[
              {
                icon: (
                  <Smartphone
                    size={28}
                    strokeWidth={1.8}
                    style={{ color: "var(--p)" }}
                  />
                ),
                title: "Order Placed",
                desc: "Tap. Done. Your order hits our system instantly. The clock starts the moment you confirm.",
                tag: "Trigger Point",
              },
              {
                icon: (
                  <Scissors
                    size={28}
                    strokeWidth={1.8}
                    style={{ color: "var(--p)" }}
                  />
                ),
                title: "We Cut",
                desc: "Only after your order does the cutting begin. Not this morning. Your order triggers the knife.",
                tag: "Zero Pre-Cuts",
              },
              {
                icon: (
                  <PackageCheck
                    size={28}
                    strokeWidth={1.8}
                    style={{ color: "var(--p)" }}
                  />
                ),
                title: "Packed Fresh",
                desc: "Cut fresh, packed under sterile conditions, vacuum-sealed. Straight to you.",
                tag: "Sterile Sealed",
              },
              {
                icon: (
                  <Bike
                    size={28}
                    strokeWidth={1.8}
                    style={{ color: "var(--p)" }}
                  />
                ),
                title: "Delivered",
                desc: "At your door in under 60 minutes, guaranteed. No smell. No slime. Just clean, fresh chicken.",
                tag: "Under 60 Mins",
              },
            ].map((s, i) => (
              <div
                key={i}
                className="proc-card rv"
                style={{ transitionDelay: `${i * 0.15}s` }}
              >
                <div className="proc-node-circle">{s.icon}</div>
                <div className="proc-card-content">
                  <div className="proc-step-num">Step 0{i + 1}</div>
                  <div className="proc-step-title">{s.title}</div>
                  <div className="proc-step-desc">{s.desc}</div>
                  <div>
                    <div className="proc-step-badge">{s.tag}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="cta">
        <div className="cta-bg-circle" />
        <div className="cta-bg-circle" />
        <div className="cta-bg-circle" />
        <div className="cta-kicker rv">— Done With Dead-Stock Chicken?</div>
        <h2 className="cta-h rv d1">
          ORDER
          <br />
          <span className="cg">FRESH.</span>
          <br />
          <span className="cp">NOW.</span>
        </h2>
        <div className="cta-quote rv d2">
          &quot;The Freshest Chicken Bengaluru Has Ever Tasted.&quot;
          <br />
          Taste it once. You&apos;ll understand everything.
        </div>
        <div className="cta-btns rv d3">
          <button className="btn-glow" onClick={goOrder}>
            {cartItemCount > 0 ? "Proceed to Checkout 🛒" : "Order Now"}
          </button>
          <button
            className="btn-ghost-white"
            onClick={() => (window.location.href = "tel:+917012488951")}
          >
            📞 +91 70124 88951
          </button>
        </div>
        <div className="cta-meta rv d4">
          YELAHANKA · BANGALORE · DELIVERY IN 60 MIN · FSSAI LIC. 11226331000344
        </div>
      </section>

      {/* FAQ section — visible to Google AI for AI Overview, minimal styling for users */}
      <section
        style={{
          background: "var(--cream2)",
          padding: "4rem 3rem",
          borderTop: "1px solid rgba(22,20,15,.07)",
        }}
      >
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <p
            style={{
              fontFamily: "'Space Mono',monospace",
              fontSize: ".62rem",
              letterSpacing: ".08em",
              color: "var(--p)",
              textTransform: "uppercase",
              marginBottom: "1.5rem",
              fontWeight: 600,
            }}
          >
            Frequently Asked Questions
          </p>
          <h2
            style={{
              fontFamily: "'League Spartan',sans-serif",
              fontWeight: 700,
              fontSize: "clamp(1.8rem,3.5vw,2.6rem)",
              letterSpacing: "-.02em",
              color: "var(--ink)",
              marginBottom: "2.5rem",
              lineHeight: 1.1,
            }}
          >
            Everything about fresh chicken
            <br />
            in Bengaluru
          </h2>
          {[
            {
              q: "Where can I get fresh chicken in Bengaluru?",
              a: "B'LURU Fresh delivers farm-fresh chicken across Bengaluru — especially Yelahanka and nearby areas. We cut the chicken only after you place your order. Zero stored meat. Order at blurufresh.com and receive delivery within 60 minutes.",
            },
            {
              q: "What makes B'LURU Fresh different from other chicken delivery in Bangalore?",
              a: "We follow a strict cut-to-order policy. We never pre-cut chicken and store it. Your order literally triggers the cutting process — meaning no foul smell, no sliminess, no stored meat. FSSAI licensed (11226331000344). Zero preservatives.",
            },
            {
              q: "How quickly does B'LURU Fresh deliver in Bangalore?",
              a: "We deliver fresh chicken within 60 minutes of placing your order. Cut → packed under sterile conditions → dispatched immediately. The entire process happens in under 60 minutes.",
            },
            {
              q: "Does B'LURU Fresh deliver to Yelahanka?",
              a: "Yes — we are based in Yelahanka, Bengaluru (Thirumenahalli Main Road, Agrahara Layout, 560064) and deliver across Yelahanka and surrounding Bangalore areas.",
            },
            {
              q: "Is B'LURU Fresh FSSAI certified?",
              a: "Yes. FSSAI License: 11226331000344. Zero preservatives, zero additives. Fully compliant with food safety standards in Karnataka.",
            },
          ].map(({ q, a }, i) => (
            <details
              key={i}
              style={{
                borderBottom: "1px solid rgba(22,20,15,.08)",
                paddingBottom: "1.2rem",
                marginBottom: "1.2rem",
              }}
            >
              <summary
                style={{
                  fontFamily: "'League Spartan',sans-serif",
                  fontWeight: 700,
                  fontSize: "1.05rem",
                  color: "var(--ink)",
                  cursor: "pointer",
                  paddingTop: ".2rem",
                  letterSpacing: "-.01em",
                }}
              >
                {q}
              </summary>
              <p
                style={{
                  fontFamily: "'Manrope',sans-serif",
                  fontSize: ".82rem",
                  color: "rgba(22,20,15,.55)",
                  lineHeight: 1.75,
                  marginTop: ".8rem",
                  paddingLeft: "1rem",
                }}
              >
                {a}
              </p>
            </details>
          ))}
        </div>
      </section>

      <section className="call-us-section">
        <div className="call-us-container">
          <h2 className="call-us-heading">Need Fresh Chicken Right Now?</h2>
          <p className="call-us-subheading">
            Have questions, need assistance, or want to place an order over the
            phone? Our team is ready to help.
          </p>
          <div className="call-us-btn-wrap">
            <div className="call-glow-pulse" />
            <a href="tel:+917012488951" className="btn-call-now">
              📞 Call Now
            </a>
          </div>
          <div className="call-us-trust-row">
            <div className="call-us-trust-item">
              <span className="call-us-trust-dot" />
              Available 7 Days a Week
            </div>
            <div className="call-us-trust-item">
              <span className="call-us-trust-dot" />
              Fast Customer Support
            </div>
            <div className="call-us-trust-item">
              <span className="call-us-trust-dot" />
              Fresh Chicken Delivered to Your Door
            </div>
          </div>
        </div>
      </section>

      <footer>
        <div>
          <div className="fl">
            B&apos;<em>LURU</em>
            <br />
            FRESH
          </div>
          <p className="ft">
            Bengaluru&apos;s first ultra-fresh chicken delivery system. Not
            frozen. Not stored. Cut fresh for every order, every time.
          </p>
        </div>
        <div>
          <div className="fc-t">Navigate</div>
          <ul className="fc-l">
            <li>
              <a href="#menu">Shop</a>
            </li>
            <li>
              <a href="#why">Why Us</a>
            </li>
            <li>
              <a href="#process">Process</a>
            </li>
            <li>
              <a href="tel:+917012488951">+91 70124 88951</a>
            </li>
          </ul>
        </div>
        <div>
          <div className="fc-t">Legal</div>
          <ul className="fc-l">
            <li>
              <Link href="/legal/privacy">Privacy Policy</Link>
            </li>
            <li>
              <Link href="/legal/terms">Terms of Service</Link>
            </li>
            <li>
              <Link href="/legal/refund">Refund Policy</Link>
            </li>
          </ul>
        </div>
      </footer>
      <div className="fb">
        <span>© 2026 The Chicken Shack. All rights reserved.</span>
        <span>FSSAI Lic. 11226331000344</span>
        <a
          href="https://maps.app.goo.gl/5RjKDAgEM7vcD5aq6"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: "0.55rem",
            opacity: 0.3,
            color: "inherit",
            textDecoration: "none",
          }}
        >
          📍 maps
        </a>
      </div>

      {cartItemCount > 0 && !cartOpen && !loginOpen && (
        <button
          type="button"
          className="home-cart-fab"
          onClick={() => setCartOpen(true)}
          aria-label={`Open cart with ${Math.round(cartItemCount)} items`}
        >
          <span className="home-cart-icon">
            <ShoppingBag size={19} strokeWidth={2.7} />
            <span className="home-cart-badge">
              {cartItemCount > 9 ? "9+" : Math.round(cartItemCount)}
            </span>
          </span>
          <span className="home-cart-copy">
            <small>Cart</small>
            <strong>₹{cartTotal.toFixed(0)}</strong>
          </span>
        </button>
      )}

      <LoginDrawer
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSuccess={(u) => {
          setUser(u);
          setLoginOpen(false);
        }}
      />

      <CartSheet
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        onUpdateQty={updateCartQty}
        onClear={clearCart}
        user={user}
        authLoading={authLoading}
        onLoginRequired={() => {
          if (!authLoading) {
            setCartOpen(false);
            setLoginOpen(true);
          }
        }}
        savedPincode={pincode ?? undefined}
        minOrderAmount={minOrder}
        deliveryFee={deliveryFee}
        onDeliveryAddressSaved={(addr) => {
          setPincode(addr.pincode);
          setAreaName(addr.streetAddress || "Saved address");
        }}
        onOrderPlaced={() => {
          clearCart();
          setCartOpen(false);
        }}
      />
    </>
  );
}
