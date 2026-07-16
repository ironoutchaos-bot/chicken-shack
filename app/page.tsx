/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
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
} from "lucide-react";
import type { CartItem, ProductRow } from "@/lib/supabase-browser";
import type { AuthUser } from "@/lib/auth-types";
import { UNIT_LABEL } from "@/lib/units";
import LoginDrawer from "@/app/order/components/LoginDrawer";
import CartSheet from "@/app/order/components/CartSheet";
import BannerCarousel from "@/app/order/components/BannerCarousel";

const css = `
:root{
  --g:#C7F20A; --gd:#BDEB18; --p:#7B1FD0; --p2:#8A2BE2; --pd:#6517B8; --pl:#C7F20A;
  --ink:#1F110B; --ink2:#543C32;
  --cream:#FAF7F0; --cream2:#FAF5EB; --cream3:#F5EFE0;
  --white:#ffffff;
}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}
html{scroll-behavior:smooth;}
body{background:var(--cream);color:var(--ink);font-family:'DM Mono',monospace;overflow-x:hidden;cursor:none;}
#cur{width:10px;height:10px;background:var(--p);border-radius:50%;position:fixed;top:0;left:0;pointer-events:none;z-index:9999;transition:transform .08s,background .2s;}
#ring{width:32px;height:32px;border:1.5px solid var(--g);border-radius:50%;position:fixed;top:0;left:0;pointer-events:none;z-index:9998;transition:all .12s ease;}
nav{position:fixed;top:1.25rem;left:50%;transform:translateX(-50%);width:calc(100% - 2.5rem);max-width:1100px;z-index:500;display:flex;justify-content:space-between;align-items:center;padding:1rem 2.7rem 1rem 2.9rem;background:rgba(250,247,240,.94);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid rgba(123,31,208,0.16);border-radius:9999px;box-shadow:0 18px 46px -18px rgba(101,23,184,0.42),inset 0 1px 0 rgba(255,255,255,0.72);}
.logo{font-family:'Unbounded',sans-serif;font-size:0.95rem;font-weight:900;letter-spacing:-.02em;color:var(--ink);}
.logo em{color:var(--p);font-style:normal;}
.nav-r{display:flex;align-items:center;gap:2.65rem;}
.nav-r a{font-size:.62rem;letter-spacing:.15em;color:var(--p);text-decoration:none;text-transform:uppercase;transition:color .2s;font-weight:700;}
.nav-r a:hover{color:var(--p);}
.nav-btn{background:linear-gradient(135deg,var(--p2),var(--p),var(--pd));color:#fff;border:none;padding:.92rem 2.45rem;font-family:'Unbounded',sans-serif;font-size:.72rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;cursor:none;transition:all .2s;border-radius:9999px;box-shadow:0 14px 36px rgba(123,31,208,.55),0 8px 22px rgba(101,23,184,.26);}
.nav-btn:hover{background:linear-gradient(135deg,var(--pd),var(--p));color:#fff;box-shadow:0 10px 34px rgba(199,242,10,.28),0 16px 36px rgba(123,31,208,.44);}
#prog{position:fixed;top:0;left:0;height:3px;background:linear-gradient(90deg,var(--g),var(--p));z-index:600;transition:width .05s linear;width:0%;}
#hero{min-height:auto;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:5.9rem 2rem 1rem;background:radial-gradient(circle at 50% 43%,rgba(151,46,232,.44) 0%,rgba(123,31,208,.34) 30%,rgba(101,23,184,0) 66%),linear-gradient(180deg,#56008E 0%,#7419C5 48%,#5B0FA4 100%);position:relative;overflow:hidden;text-align:center;}
#hero::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 50% 47%,rgba(255,255,255,.07) 0%,rgba(255,255,255,.03) 28%,transparent 62%),linear-gradient(90deg,rgba(38,0,78,.38),transparent 30%,transparent 70%,rgba(38,0,78,.42));pointer-events:none;z-index:0;}
.hero-wave{position:absolute;left:0;right:0;top:20%;bottom:-1px;z-index:0;pointer-events:none;overflow:hidden;}
.hero-wave svg{width:100%;height:100%;display:block;}
.hero-wave path{fill:var(--cream);}
.hero-content-wrap{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;width:100%;max-width:1000px;margin:0 auto;}
.hero-statement-text{font-family:'DM Mono',monospace;font-size:clamp(0.85rem, 2.2vw, 1.1rem);color:rgba(255,255,255,0.9);max-width:55ch;margin-bottom:.55rem;font-weight:500;position:relative;z-index:2;}
.hs-pill{display:inline-flex;align-items:center;gap:.5rem;background:rgba(255,255,255,.13);border:1px solid rgba(255,255,255,0.22);padding:.4rem 1.2rem;width:fit-content;font-family:'DM Mono',monospace;font-size:.65rem;letter-spacing:.18em;color:#ffffff;text-transform:uppercase;margin-bottom:.65rem;border-radius:9999px;position:relative;z-index:2;box-shadow:inset 0 1px 0 rgba(255,255,255,.14);margin-top:1rem}
.hs-pill::before{content:'';width:6px;height:6px;background:var(--pl);border-radius:50%;animation:blink 1.5s ease infinite;box-shadow:0 0 12px rgba(199,242,10,.72);}
.hero-h1{font-family:'Archivo Black',sans-serif;font-size:clamp(3.25rem, 9.1vw, 7.2rem);line-height:0.9;letter-spacing:-.045em;color:#ffffff;margin-bottom:0;text-shadow:0 8px 28px rgba(35,0,72,0.3);position:relative;z-index:30;text-transform:uppercase;}
.hero-h1 .line-light{color:var(--pl);text-shadow:0 0 28px rgba(199,242,10,.28);}
.hero-main-prod-wrap{position:relative;width:100%;max-width:705px;margin:-88px auto .8rem;display:flex;justify-content:center;align-items:center;z-index:3;}
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

.float-badge{position:absolute;min-width:172px;background:var(--white);border:1px solid rgba(123,31,208,0.14);box-shadow:0 18px 42px rgba(101,23,184,0.18),0 8px 22px rgba(31,17,11,.08);padding:0.68rem 1.18rem;border-radius:9999px;display:flex;align-items:center;gap:0.5rem;font-size:0.58rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--ink);z-index:8;animation:floatBadgeUpDown 5s ease-in-out infinite;}
.fb-left-pkg{left:-8%;top:32%;animation-delay:0.5s;}
.fb-left-pkg img{width:22px;height:22px;border-radius:50%;object-fit:cover;}
.fb-right-fresh{right:-8%;top:42%;animation-delay:1.5s;}
.fb-dot{width:6px;height:6px;background:var(--pl);border-radius:50%;animation:blink 1.5s ease infinite;box-shadow:0 0 10px rgba(199,242,10,.7);}
@keyframes floatBadgeUpDown{0%,100%{transform:translateY(0);}50%{transform:translateY(-10px);}}
.hero-bottom-content{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;margin-top:0.5rem;}
.hero-desc-para{font-family:'DM Mono',monospace;font-size:0.88rem;color:var(--ink);margin-bottom:1.2rem;max-width:45ch;}
.hero-desc-para strong{color:var(--p);font-weight:600;}
.hero-ctas{display:flex;gap:1rem;justify-content:center;}
.btn-fill{background:linear-gradient(135deg,var(--p2),var(--p),var(--pd));color:#fff;border:none;padding:0.95rem 2.4rem;font-family:'Unbounded',sans-serif;font-size:.68rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;cursor:none;transition:all .25s;border-radius:9999px;box-shadow:0 12px 28px rgba(123,31,208,.36);position:relative;overflow:hidden;}
.btn-fill::after{content:'';position:absolute;inset:0;background:var(--pl);transform:translateX(-101%);transition:transform .3s ease;}
.btn-fill:hover::after{transform:translateX(0);}
.btn-fill span{position:relative;z-index:1;color:#fff;}
.btn-fill:hover span{color:var(--ink);}
.btn-line{background:transparent;border:1.5px solid rgba(31,17,11,.16);color:var(--ink);padding:0.95rem 2rem;font-family:'DM Mono',monospace;font-size:.68rem;letter-spacing:.1em;text-transform:uppercase;cursor:none;transition:all .2s;border-radius:9999px;}
.btn-line:hover{border-color:var(--p);color:var(--p);background:rgba(123,31,208,.06);transform:translateY(-1px);}
.hero-scroll-hint{display:none;}
.hero-bg-word{position:absolute;top:35%;left:50%;transform:translate(-50%,-50%);font-family:'Unbounded',sans-serif;font-weight:900;font-size:clamp(8rem,20vw,26rem);color:rgba(255,255,255,.115);white-space:nowrap;letter-spacing:-.04em;line-height:1;pointer-events:none;user-select:none;animation:bgFloat 8s ease-in-out infinite;z-index:0;}
.ticker{background:linear-gradient(90deg,var(--pd),var(--p),var(--p2));padding:.9rem 0;overflow:hidden;display:flex;border-top:1px solid rgba(199,242,10,0.22);border-bottom:1px solid rgba(199,242,10,0.22);position:relative;z-index:10;}
.ticker-track{display:flex;gap:3rem;animation:tick 16s linear infinite;white-space:nowrap;}
@keyframes tick{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.ti{font-family:'Unbounded',sans-serif;font-size:.82rem;font-weight:900;letter-spacing:.12em;color:var(--cream);flex-shrink:0;display:flex;align-items:center;gap:2rem;}
.ti-sep{color:var(--pl);text-shadow:0 0 10px rgba(199,242,10,0.5);}
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
.sf-label{font-family:'DM Mono',monospace;font-size:.62rem;letter-spacing:.2em;text-transform:uppercase;color:var(--p);border:1px solid rgba(123,31,208,0.18);padding:.35rem 1rem;border-radius:9999px;margin-bottom:1.5rem;background:rgba(123,31,208,0.04);display:inline-block;}
.sf-heading{font-family:'Unbounded',sans-serif;font-weight:900;font-size:1.6rem;line-height:1.25;letter-spacing:-.03em;color:var(--ink);text-align:left;margin-bottom:1rem;}
.sf-heading .hl{color:var(--p);}
.sf-heading .hp{color:var(--pl);}
.sf-sub{font-family:'Outfit',sans-serif;font-size:.85rem;color:var(--ink2);line-height:1.6;max-width:440px;text-align:left;margin-top:auto;}
.sf-sub strong{color:var(--p);font-weight:600;}
.sf-spicy{font-family:'Archivo Black',sans-serif;font-size:1.85rem;color:var(--p);letter-spacing:-.02em;line-height:1.2;margin-bottom:1rem;text-align:left;}
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
  font-family: 'Unbounded', sans-serif;
  font-weight: 900;
  font-size: clamp(1.5rem, 3.5vw, 2.5rem);
  line-height: 1.15;
  letter-spacing: -0.02em;
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
  font-family: 'DM Mono', monospace;
  font-size: 0.9rem;
  color: var(--ink2);
  margin-bottom: 2.2rem;
  max-width: 50ch;
  text-align: center;
  line-height: 1.6;
}
.hero-manifesto-desc strong {
  color: var(--p);
  font-weight: 600;
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
  font-family: 'Unbounded', sans-serif;
  font-weight: 800;
  font-size: 0.65rem;
  letter-spacing: 0.04em;
  color: var(--ink);
  text-transform: uppercase;
}
.wtl-kicker{font-size:.6rem;letter-spacing:.2em;color:var(--p);text-transform:uppercase;margin-bottom:1.2rem;}
.wtl-h{font-family:'Archivo Black',sans-serif;font-size:clamp(2.4rem,4.8vw,5.5rem);line-height:0.9;letter-spacing:-.03em;color:var(--ink);margin-bottom:1rem;}
.wtl-h .it{font-family:'Instrument Serif',serif;font-style:italic;color:var(--gd);}
.wtl-h .pp{color:var(--p);}

#process{padding:8rem 5% 7rem;background:var(--cream);position:relative;overflow:hidden;}
.proc-bg-txt{position:absolute;bottom:-2rem;right:-1rem;font-family:'Unbounded',sans-serif;font-weight:900;font-size:clamp(6rem,15vw,18rem);color:rgba(22,20,15,.03);letter-spacing:-.04em;pointer-events:none;line-height:1;z-index:0;}
.proc-container{max-width:1100px;margin:0 auto;position:relative;z-index:2;}
.proc-header{margin-bottom:5rem;}
.proc-kicker{font-size:.6rem;letter-spacing:.2em;color:var(--p);text-transform:uppercase;margin-bottom:1rem;}
.proc-h{font-family:'Unbounded',sans-serif;font-weight:900;font-size:clamp(2.5rem,5vw,5.5rem);letter-spacing:-.03em;line-height:.9;color:var(--ink);}
.proc-h span{color:var(--p);}
.proc-line-track{position:absolute;top:90px;left:80px;right:80px;height:4px;background:rgba(123,31,208,0.08);z-index:1;border-radius:2px;}
.proc-line-progress{position:absolute;top:0;left:0;height:100%;width:0%;background:linear-gradient(90deg, var(--p), var(--pl));box-shadow:0 0 12px var(--pl);transition:width 1.5s cubic-bezier(0.165, 0.84, 0.44, 1);}
.proc-grid{display:grid;grid-template-columns:repeat(4, 1fr);gap:2rem;position:relative;z-index:2;}
.proc-card{display:flex;flex-direction:column;align-items:center;text-align:center;position:relative;}
.proc-node-circle{width:76px;height:76px;border-radius:50%;background:var(--white);border:3px solid rgba(123,31,208,0.1);display:flex;align-items:center;justify-content:center;font-size:2.2rem;margin-bottom:2rem;transition:all 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275);box-shadow:0 8px 25px rgba(31,17,11,0.04);position:relative;z-index:3;}
.proc-card:hover .proc-node-circle{transform:scale(1.15) translateY(-5px);border-color:var(--p);box-shadow:0 15px 35px rgba(123,31,208,0.14);background:rgba(199,242,10,.18);}
.proc-step-num{font-family:'DM Mono',monospace;font-size:0.65rem;letter-spacing:0.15em;text-transform:uppercase;color:var(--p);margin-bottom:0.5rem;}
.proc-step-title{font-family:'Unbounded',sans-serif;font-size:0.85rem;font-weight:800;color:var(--ink);margin-bottom:0.75rem;line-height:1.3;}
.proc-step-desc{font-family:'Outfit',sans-serif;font-size:0.8rem;color:var(--ink2);line-height:1.55;padding:0 0.5rem;}
.proc-step-badge{display:inline-block;margin-top:1rem;font-family:'DM Mono',monospace;font-size:0.55rem;letter-spacing:0.08em;text-transform:uppercase;color:var(--p);background:rgba(199,242,10,0.2);border:1px solid rgba(199,242,10,0.4);padding:0.25rem 0.75rem;border-radius:9999px;}
#cta{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 38%,rgba(199,242,10,.12) 0%,rgba(138,43,226,.28) 28%,transparent 58%),linear-gradient(180deg,#6500A3 0%,#7B1FD0 48%,#4B0D91 100%);position:relative;overflow:hidden;text-align:center;padding:4rem 3rem;}
#cta::before{content:'';position:absolute;inset:0;background:linear-gradient(90deg,rgba(44,0,84,.32),transparent 28%,transparent 72%,rgba(44,0,84,.34));pointer-events:none;}
.cta-bg-circle{position:absolute;width:70vw;height:70vw;max-width:800px;max-height:800px;border-radius:50%;border:1px solid rgba(199,242,10,.14);top:50%;left:50%;transform:translate(-50%,-50%);}
.cta-bg-circle:nth-child(2){width:50vw;height:50vw;border-color:rgba(255,255,255,.12);}
.cta-bg-circle:nth-child(3){width:30vw;height:30vw;border-color:rgba(199,242,10,.2);background:rgba(199,242,10,.035);}
.cta-kicker{font-size:.62rem;letter-spacing:.25em;color:var(--pl);text-transform:uppercase;margin-bottom:1.5rem;position:relative;z-index:1;text-shadow:0 0 18px rgba(199,242,10,.26);}
.cta-h{font-family:'Unbounded',sans-serif;font-weight:900;font-size:clamp(3rem,9vw,11rem);letter-spacing:-.04em;line-height:.85;color:#fff;position:relative;z-index:1;}
.cta-h .cg{color:var(--pl);}
.cta-h .cp{color:var(--pl);}
.cta-quote{font-family:'Instrument Serif',serif;font-style:italic;font-size:1.2rem;color:rgba(255,255,255,.78);margin:2rem 0;max-width:600px;position:relative;z-index:1;line-height:1.6;}
.cta-btns{display:flex;gap:1rem;justify-content:center;position:relative;z-index:1;}
.btn-glow{background:var(--pl);color:var(--ink);border:none;padding:1.1rem 3.5rem;font-family:'Unbounded',sans-serif;font-size:.8rem;font-weight:700;letter-spacing:.05em;cursor:none;transition:all .25s;box-shadow:0 0 0 0 rgba(199,242,10,.4);animation:glowPulse 3s ease infinite;}
@keyframes glowPulse{0%,100%{box-shadow:0 0 0 0 rgba(199,242,10,.28)}50%{box-shadow:0 0 0 16px rgba(199,242,10,0)}}
.btn-glow:hover{background:#fff;transform:scale(1.05);}
.btn-ghost-white{background:rgba(255,255,255,.08);border:1.5px solid rgba(255,255,255,.26);color:#fff;padding:1.1rem 2rem;font-family:'DM Mono',monospace;font-size:.68rem;letter-spacing:.1em;text-transform:uppercase;cursor:none;transition:all .2s;}
.btn-ghost-white:hover{border-color:var(--pl);color:var(--ink);background:var(--pl);}
.cta-meta{margin-top:2rem;font-size:.55rem;letter-spacing:.15em;color:rgba(255,255,255,.64);position:relative;z-index:1;}
footer{background:linear-gradient(180deg,#4B0D91 0%,#31065F 100%);border-top:1px solid rgba(199,242,10,.16);padding:3.5rem 3rem 2rem;display:grid;grid-template-columns:2fr 1fr 1fr;gap:3rem;position:relative;overflow:hidden;}
footer::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 16% 10%,rgba(199,242,10,.09),transparent 22rem);pointer-events:none;}
footer > *{position:relative;z-index:1;}
.fl{font-family:'Unbounded',sans-serif;font-weight:900;font-size:2rem;letter-spacing:-.03em;color:#fff;line-height:1;}
.fl em{color:var(--pl);font-style:normal;}
.ft{margin-top:.8rem;font-size:.72rem;color:rgba(255,255,255,.72);line-height:1.65;max-width:240px;}
.fc-t{font-size:.55rem;letter-spacing:.2em;color:var(--pl);text-transform:uppercase;margin-bottom:1rem;}
.fc-l{list-style:none;display:flex;flex-direction:column;gap:.6rem;}
.fc-l a{font-size:.75rem;color:rgba(255,255,255,.7);text-decoration:none;transition:color .2s;}
.fc-l a:hover{color:var(--pl);}
.fb{padding:1.5rem 3rem;background:#31065F;border-top:1px solid rgba(199,242,10,.14);display:flex;justify-content:space-between;}
.fb span{font-size:.55rem;letter-spacing:.08em;color:rgba(255,255,255,.56);}
.float-order{
    position:fixed;
    bottom:2rem;
    right:2rem;
    z-index:800;

    display:flex;
    align-items:center;
    gap:1rem;

    width:220px;      /* or 215px */
min-width:unset;

padding:0.95rem 1.5rem;

gap:0.75rem;

    border:none;
    border-radius:999px;
    cursor:pointer;

    background:linear-gradient(
        180deg,
        #7418C8 0%,
        #6A12BE 45%,
        #5E0FAF 100%
    );

    color:#fff;

    font-family:'Unbounded',sans-serif;
    font-size:1rem;
    font-weight:900;

    box-shadow:
        0 16px 38px rgba(124,42,232,.30),
        0 0 0 8px rgba(233,205,255,.58),
        inset 0 1px 0 rgba(255,255,255,.12);

    transition:.25s ease;
}

.float-order::after{
    content:"";
    position:absolute;
    inset:-8px;

    border-radius:999px;
    border:2px solid rgba(226,190,255,.42);

    pointer-events:none;
}

.float-order:hover{
    transform:translateY(-3px);

    box-shadow:
        0 22px 46px rgba(124,42,232,.38),
        0 0 0 8px rgba(233,205,255,.65),
        inset 0 1px 0 rgba(255,255,255,.18);
}

.fo-icon{
    font-size:2rem;
    color:#F4C24D;
    line-height:1;
}

.fo-text{
    display:flex;
    flex-direction:column;
    gap:.18rem;
}

.fo-main{
    font-family:'Unbounded',sans-serif;
    font-size:1.05rem;
    font-weight:900;
    color:#fff;
    line-height:1;
     font-size:0.95rem;
}

.fo-sub{
    font-family:'DM Mono',monospace;
    font-size:.50rem;
    font-weight:700;
    letter-spacing:.12em;
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
  font-family:'Unbounded',sans-serif;
}
.home-cart-fab:hover{transform:translateY(-2px);}
.home-cart-icon{position:relative;display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:999px;background:rgba(255,255,255,.14);}
.home-cart-badge{position:absolute;right:-7px;top:-7px;min-width:22px;height:22px;border-radius:999px;background:var(--pl);color:var(--ink);display:flex;align-items:center;justify-content:center;padding:0 5px;font-size:10px;font-weight:900;}
.home-cart-copy{display:flex;flex-direction:column;align-items:flex-start;gap:2px;line-height:1;}
.home-cart-copy small{font-size:8px;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.7);font-weight:900;}
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
  .proc-line-track{display:none;}
  .proc-grid{grid-template-columns:1fr;gap:3rem;}
  .proc-card{flex-direction:row;text-align:left;gap:1.2rem;align-items:flex-start;}
  .proc-node-circle{margin-bottom:0;flex-shrink:0;width:60px;height:60px;font-size:1.7rem;}
  #cta{padding:4rem 1.2rem;}
  .cta-h{font-size:clamp(3rem,13vw,5.5rem);}
  .cta-btns{flex-direction:column;align-items:center;gap:.8rem;}
  .btn-glow,.btn-ghost-white{width:100%;max-width:280px;text-align:center;}
  .cta-bg-circle{display:none;}
  footer{grid-template-columns:1fr;gap:1.5rem;padding:2rem 1.2rem 1.5rem;}
  .fb{padding:1rem 1.2rem;flex-direction:column;gap:.4rem;}
  .fl{font-size:1.5rem;}
  .dnav{display:none;}
  #cur,#ring{display:none;}
}
@media(max-width:480px){
  .hero-h1{font-size:clamp(2.4rem,13vw,4.5rem);}
  .hero-wave{top:30%;}
  .hero-bg-word{top:30%;}
  .hero-main-prod-wrap{margin-bottom:0}
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
  font-family: 'DM Mono', monospace;
  font-size: .6rem;
  letter-spacing: .2em;
  color: var(--p);
  text-transform: uppercase;
  margin-bottom: 0.8rem;
}
.menu-h {
  font-family: 'Archivo Black', sans-serif;
  font-weight: 900;
  font-size: clamp(2rem, 4vw, 3.8rem);
  letter-spacing: -.03em;
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
  font-family: 'Unbounded', sans-serif;
  font-weight: 900;
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
  font-size: 7.5px;
  font-weight: 700;
  padding: 3px 7px;
  border-radius: 20px;
  letter-spacing: 0.1em;
}
.menu-card-qty-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 3;
  background: linear-gradient(135deg, var(--p2), var(--p), var(--pd));
  color: #fff;
  font-size: 8px;
  font-weight: 700;
  padding: 3px 7px;
  border-radius: 20px;
}
.menu-card-body {
  padding: 14px;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}
.menu-card-title {
  font-family: 'Archivo Black', sans-serif;
  font-size: 14.5px;
  color: var(--ink);
  line-height: 1.25;
  margin-bottom: 4px;
}
.menu-card-unit {
  font-size: 9.5px;
  color: rgba(22, 20, 15, 0.38);
  margin-bottom: 9px;
  letter-spacing: 0.04em;
}
.menu-card-price-row {
  display: flex;
  align-items: baseline;
  gap: 5px;
  margin-bottom: 10px;
  margin-top: auto;
}
.menu-card-old-price {
  font-size: 10px;
  color: rgba(22, 20, 15, 0.28);
  text-decoration: line-through;
}
.menu-card-price {
  font-family: 'Unbounded', sans-serif;
  font-weight: 900;
  font-size: 17px;
  color: var(--p);
}
.menu-card-price-unit {
  font-size: 9px;
  color: rgba(22, 20, 15, 0.3);
}
.btn-add-cart {
  width: 100%;
  background: rgba(123, 31, 208, 0.06);
  color: var(--p);
  border: 1.5px solid rgba(123, 31, 208, 0.2);
  border-radius: 12px;
  padding: 9px 0;
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.07em;
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
  font-family: 'Unbounded', sans-serif;
  font-weight: 900;
  font-size: 14px;
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
    max-width:760px;   /* adjust as needed */
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
`;

export default function Home() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loginOpen, setLoginOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const [pincode, setPincode] = useState<string | null>(null);
  const [, setAreaName] = useState("");

  // Live settings
  const [storeOpen, setStoreOpen] = useState(true);
  const [announcement, setAnnouncement] = useState("");
  const [minOrder, setMinOrder] = useState(0);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [bannerImages, setBannerImages] = useState<string[]>([]);

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
  const visibleProducts = products.filter((product, index, list) => {
    const nameKey = product.name.trim().toLowerCase();
    return (
      list.findIndex((item) => item.name.trim().toLowerCase() === nameKey) ===
      index
    );
  });

  useEffect(() => {
    // Cursor
    const cur = document.getElementById("cur");
    const ring = document.getElementById("ring");
    if (!cur || !ring) return;
    let mx = 0,
      my = 0,
      rx = 0,
      ry = 0;
    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      cur.style.left = mx - 5 + "px";
      cur.style.top = my - 5 + "px";
    };
    document.addEventListener("mousemove", onMove);
    let raf: number;
    const animRing = () => {
      rx += (mx - rx) * 0.12;
      ry += (my - ry) * 0.12;
      ring.style.left = rx - 16 + "px";
      ring.style.top = ry - 16 + "px";
      raf = requestAnimationFrame(animRing);
    };
    animRing();
    document
      .querySelectorAll<HTMLElement>(
        "button,a,.hero-manifesto-item,.proc-card,.float-order,.menu-card,.btn-add-cart,.qty-btn",
      )
      .forEach((el) => {
        el.addEventListener("mouseenter", () => {
          cur.style.transform = "scale(2.5)";
          cur.style.background = "var(--g)";
          ring.style.transform = "scale(1.5)";
          ring.style.borderColor = "var(--p)";
        });
        el.addEventListener("mouseleave", () => {
          cur.style.transform = "scale(1)";
          cur.style.background = "var(--p)";
          ring.style.transform = "scale(1)";
          ring.style.borderColor = "var(--g)";
        });
      });

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
    const procEl = document.getElementById("process");
    const progressLine = document.getElementById("procProgress");
    if (procEl && progressLine) {
      new IntersectionObserver(
        (en) => {
          en.forEach((e) => {
            if (e.isIntersecting) {
              progressLine.style.width = "100%";
            }
          });
        },
        { threshold: 0.3 },
      ).observe(procEl);
    }

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
        ".hero-manifesto-item,.proc-card,.menu-card",
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
      .querySelectorAll<HTMLElement>(".btn-fill,.btn-glow,.nav-btn")
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
      document.removeEventListener("mousemove", onMove);
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

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

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Unbounded:wght@400;700;900&family=DM+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&display=swap"
        rel="stylesheet"
      />
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div id="prog" />
      <div id="cur" />
      <div id="ring" />

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
          B&apos;<em>LURU</em> FRESH
        </div>
        <div className="nav-r">
          <a href="#why">Why</a>
          <a href="#process">Process</a>
          <a href="#menu">Menu</a>
          <a href="tel:+917012488951">Call</a>
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
            {cartItemCount > 0 ? `Cart (${cartItemCount}) 🛒` : "Order ⚡"}
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
            🐔 Bengaluru&apos;s first ultra-fresh system
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
                  {cartItemCount > 0
                    ? "Proceed to Checkout 🛒"
                    : "Order Now ⚡"}
                </span>
              </button>
              <button className="btn-line" onClick={goStory}>
                Watch ↓
              </button>
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
              </p>
              <div className="hero-manifesto-grid">
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
              </div>
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
                const weightLabel = p.id.includes("drumstick")
                  ? "4 pcs"
                  : p.weight_per_unit
                    ? `${p.weight_per_unit}g`
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
          <div className="story-card sc-wide rv d1">
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
                Order Fresh Now ⚡
              </button>
            </div>
          </div>

          {/* Card 4: Standard */}
          <div className="story-card rv d2">
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

          <div className="proc-line-track">
            <div className="proc-line-progress" id="procProgress" />
          </div>

          <div className="proc-grid">
            {[
              {
                icon: "📲",
                title: "Order Placed",
                desc: "Tap. Done. Your order hits our system instantly. The clock starts the moment you confirm.",
                tag: "Trigger Point",
              },
              {
                icon: "🔪",
                title: "We Cut",
                desc: "Only after your order does the cutting begin. Not this morning. Your order triggers the knife.",
                tag: "Zero Pre-Cuts",
              },
              {
                icon: "📦",
                title: "Packed Fresh",
                desc: "Cut fresh, packed under sterile conditions, vacuum-sealed. Straight to you.",
                tag: "Sterile Sealed",
              },
              {
                icon: "🏍️",
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
                <div className="proc-step-num">Step 0{i + 1}</div>
                <div className="proc-step-title">{s.title}</div>
                <div className="proc-step-desc">{s.desc}</div>
                <div className="proc-step-badge">{s.tag}</div>
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
            {cartItemCount > 0 ? "Proceed to Checkout 🛒" : "Order Now ⚡"}
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
              fontFamily: "'DM Mono',monospace",
              fontSize: ".58rem",
              letterSpacing: ".2em",
              color: "var(--p)",
              textTransform: "uppercase",
              marginBottom: "1.5rem",
            }}
          >
            Frequently Asked Questions
          </p>
          <h2
            style={{
              fontFamily: "'Archivo Black',sans-serif",
              fontSize: "clamp(1.6rem,3vw,2.4rem)",
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
                  fontFamily: "'Archivo Black',sans-serif",
                  fontSize: ".95rem",
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
                  fontFamily: "'DM Mono',monospace",
                  fontSize: ".78rem",
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
              <a href="https://www.blurufresh.com/order">Shop</a>
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
          alert(
            "Order placed successfully! Check progress in your active tab.",
          );
        }}
      />
    </>
  );
}
