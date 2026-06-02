'use client'

import { useEffect } from 'react'
import Link from 'next/link'

const css = `
:root{
  --g:#91d852; --gd:#6ab82e; --p:#9318cc; --pl:#c44ef5;
  --ink:#16140f; --ink2:#3d3a30;
  --cream:#faf7f0; --cream2:#f2ede0; --cream3:#e8e2d0;
  --white:#ffffff;
}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
html{scroll-behavior:smooth;}
body{background:var(--cream);color:var(--ink);font-family:'DM Mono',monospace;overflow-x:hidden;cursor:none;}
#cur{width:10px;height:10px;background:var(--p);border-radius:50%;position:fixed;top:0;left:0;pointer-events:none;z-index:9999;transition:transform .08s,background .2s;}
#ring{width:32px;height:32px;border:1.5px solid var(--g);border-radius:50%;position:fixed;top:0;left:0;pointer-events:none;z-index:9998;transition:all .12s ease;}
nav{position:fixed;top:0;left:0;right:0;z-index:500;display:flex;justify-content:space-between;align-items:center;padding:1.2rem 3rem;background:rgba(250,247,240,.88);backdrop-filter:blur(24px);border-bottom:1px solid rgba(22,20,15,.07);}
.logo{font-family:'Unbounded',sans-serif;font-size:1rem;font-weight:900;letter-spacing:-.02em;color:var(--ink);}
.logo em{color:var(--p);font-style:normal;}
.nav-r{display:flex;align-items:center;gap:2rem;}
.nav-r a{font-size:.6rem;letter-spacing:.15em;color:rgba(22,20,15,.4);text-decoration:none;text-transform:uppercase;transition:color .2s;}
.nav-r a:hover{color:var(--p);}
.nav-btn{background:var(--ink);color:var(--cream);border:none;padding:.55rem 1.5rem;font-family:'DM Mono',monospace;font-size:.62rem;letter-spacing:.12em;text-transform:uppercase;cursor:none;transition:all .2s;}
.nav-btn:hover{background:var(--p);}
#prog{position:fixed;top:0;left:0;height:3px;background:linear-gradient(90deg,var(--g),var(--p));z-index:600;transition:width .05s linear;width:0%;}
#hero{min-height:100vh;display:flex;flex-direction:column;justify-content:flex-end;padding:6rem 3rem 4rem;background:var(--cream);position:relative;overflow:hidden;}
.hero-bg-word{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-family:'Unbounded',sans-serif;font-weight:900;font-size:clamp(8rem,20vw,26rem);color:rgba(22,20,15,.04);white-space:nowrap;letter-spacing:-.04em;line-height:1;pointer-events:none;user-select:none;animation:bgFloat 8s ease-in-out infinite;}
@keyframes bgFloat{0%,100%{transform:translate(-50%,-50%) scale(1);}50%{transform:translate(-50%,-52%) scale(1.02);}}
.hero-tag{display:inline-flex;align-items:center;gap:.5rem;font-size:.6rem;letter-spacing:.2em;text-transform:uppercase;color:var(--p);margin-bottom:1.5rem;width:fit-content;border-bottom:1px solid var(--p);padding-bottom:.3rem;}
.hero-tag::before{content:'';width:6px;height:6px;background:var(--p);border-radius:50%;animation:blink 1.2s ease infinite;}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}
.hs-pill{display:inline-flex;align-items:center;gap:.5rem;background:rgba(145,216,82,.12);border:1px solid rgba(145,216,82,.3);padding:.35rem 1rem;width:fit-content;font-family:'DM Mono',monospace;font-size:.6rem;letter-spacing:.18em;color:var(--gd);text-transform:uppercase;margin-bottom:1.2rem;}
.hs-pill::before{content:'';width:5px;height:5px;background:var(--gd);border-radius:50%;animation:blink 1.5s ease infinite;}
.hs-main{font-family:'Archivo Black',sans-serif;font-size:clamp(1.4rem,3vw,3.2rem);line-height:1.1;letter-spacing:-.025em;color:var(--ink);text-align:left;white-space:nowrap;}
.hs-main .accent{color:var(--p);}
.hs-divider{width:48px;height:3px;margin-top:1.2rem;background:linear-gradient(to right,var(--gd),var(--p));}
.hero-statement{position:relative;z-index:1;margin-bottom:2.8rem;margin-top:1.5rem;display:flex;flex-direction:column;gap:0;width:100%;}
.hs-cursor{display:inline-block;color:var(--p);font-weight:900;animation:cursorBlink .9s step-end infinite;}
@keyframes cursorBlink{0%,100%{opacity:1;}50%{opacity:0;}}
.hero-main{display:grid;grid-template-columns:1fr auto;align-items:flex-end;gap:2rem;position:relative;z-index:1;}
.hero-h1{font-family:'Archivo Black',sans-serif;font-size:clamp(3.5rem,9vw,10.5rem);line-height:.96;letter-spacing:-.03em;color:var(--ink);transition:transform .4s cubic-bezier(.25,.46,.45,.94);padding-top:.1em;}
.hero-h1 .line-g{font-family:'Instrument Serif',serif;font-style:italic;color:var(--gd);display:block;}
.hero-h1 .line-p{color:var(--p);}
.hero-right{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:1.5rem;max-width:360px;padding-bottom:.5rem;}
.hero-ctas{display:flex;gap:.8rem;justify-content:flex-end;}
.btn-fill{background:var(--p);color:#fff;border:none;padding:.85rem 2.2rem;font-family:'DM Mono',monospace;font-size:.68rem;font-weight:500;letter-spacing:.1em;text-transform:uppercase;cursor:none;transition:all .25s;position:relative;overflow:hidden;}
.btn-fill::after{content:'';position:absolute;inset:0;background:var(--g);transform:translateX(-101%);transition:transform .3s ease;}
.btn-fill:hover::after{transform:translateX(0);}
.btn-fill span{position:relative;z-index:1;color:#fff;}
.btn-fill:hover span{color:var(--ink);}
.btn-line{background:transparent;border:1.5px solid rgba(22,20,15,.2);color:var(--ink);padding:.85rem 1.5rem;font-family:'DM Mono',monospace;font-size:.68rem;letter-spacing:.1em;text-transform:uppercase;cursor:none;transition:all .2s;}
.btn-line:hover{border-color:var(--p);color:var(--p);}
.hero-scroll-hint{position:absolute;right:3rem;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;align-items:center;gap:.6rem;font-size:.55rem;letter-spacing:.2em;color:rgba(22,20,15,.3);text-transform:uppercase;writing-mode:vertical-rl;}
.hero-scroll-line{width:1px;height:50px;background:linear-gradient(to bottom,var(--p),transparent);animation:sLine 2s ease infinite;}
@keyframes sLine{0%{transform:scaleY(0);transform-origin:top;}50%{transform:scaleY(1);transform-origin:top;}51%{transform:scaleY(1);transform-origin:bottom;}100%{transform:scaleY(0);transform-origin:bottom;}}
.f-badge{position:absolute;border:1px solid rgba(22,20,15,.08);background:var(--white);padding:.7rem 1rem;font-size:.58rem;letter-spacing:.1em;color:rgba(22,20,15,.5);text-transform:uppercase;box-shadow:0 4px 20px rgba(22,20,15,.06);}
.fb1{top:22%;left:3rem;animation:fbFloat 6s ease-in-out infinite;}
.fb2{top:30%;right:22%;animation:fbFloat 7s 1s ease-in-out infinite;}
.fb3{top:55%;left:38%;animation:fbFloat 5s 2s ease-in-out infinite;}
@keyframes fbFloat{0%,100%{transform:translateY(0);}50%{transform:translateY(-8px);}}
.fb-dot{display:inline-block;width:5px;height:5px;border-radius:50%;background:var(--g);margin-right:.4rem;vertical-align:middle;}
.ticker{background:var(--ink);padding:.7rem 0;overflow:hidden;display:flex;}
.ticker-track{display:flex;gap:2rem;animation:tick 14s linear infinite;white-space:nowrap;}
@keyframes tick{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.ti{font-family:'Unbounded',sans-serif;font-size:.75rem;font-weight:700;letter-spacing:.08em;color:var(--cream);flex-shrink:0;display:flex;align-items:center;gap:1.5rem;}
.ti-sep{color:var(--g);}
#scroll-story{position:relative;height:500vh;}
.story-sticky{position:sticky;top:0;height:100vh;display:flex;align-items:center;justify-content:center;overflow:hidden;background:var(--ink);}
#storyCanvas{position:absolute;inset:0;width:100%;height:100%;}
.story-frame{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem 4rem;opacity:0;transition:opacity .6s ease;pointer-events:none;}
.story-frame.active{opacity:1;}
.sf-label{font-size:.6rem;letter-spacing:.25em;text-transform:uppercase;color:var(--g);margin-bottom:1.5rem;}
.sf-heading{font-family:'Unbounded',sans-serif;font-weight:900;font-size:clamp(2.5rem,6vw,7rem);line-height:.9;letter-spacing:-.03em;color:#fff;text-align:center;}
.sf-heading .hl{color:var(--g);}
.sf-heading .hp{color:var(--pl);}
.sf-sub{margin-top:1.5rem;font-size:.85rem;color:rgba(255,255,255,.4);line-height:1.75;max-width:500px;text-align:center;}
.sf-sub strong{color:#fff;}
.sf-spicy{font-family:'Archivo Black',sans-serif;font-size:clamp(3rem,7vw,8rem);color:var(--g);letter-spacing:-.02em;line-height:1;margin:1rem 0;text-align:center;}
.story-dots{position:absolute;bottom:2.5rem;left:50%;transform:translateX(-50%);display:flex;gap:.6rem;z-index:3;}
.sdot{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.2);transition:all .3s;}
.sdot.on{background:var(--g);transform:scale(1.4);}
.shape-ring{position:absolute;border-radius:50%;border:1px solid;animation:spinRing 8s linear infinite;opacity:.15;}
@keyframes spinRing{from{transform:translate(-50%,-50%) rotate(0)}to{transform:translate(-50%,-50%) rotate(360deg)}}
.shape-blob{position:absolute;border-radius:60% 40% 70% 30% / 50% 60% 40% 50%;animation:blobMorph 6s ease-in-out infinite;opacity:.08;}
@keyframes blobMorph{0%,100%{border-radius:60% 40% 70% 30% / 50% 60% 40% 50%;}33%{border-radius:40% 60% 30% 70% / 60% 40% 60% 40%;}66%{border-radius:70% 30% 50% 50% / 40% 70% 30% 60%;}}
#why{padding:6rem 3rem;background:var(--cream2);position:relative;overflow:hidden;}
.why-top{display:grid;grid-template-columns:1fr 1fr;gap:4rem;align-items:center;margin-bottom:5rem;}
.wtl-kicker{font-size:.6rem;letter-spacing:.2em;color:var(--p);text-transform:uppercase;margin-bottom:1.2rem;}
.wtl-h{font-family:'Archivo Black',sans-serif;font-size:clamp(2.8rem,5.5vw,6.5rem);line-height:.88;letter-spacing:-.03em;color:var(--ink);}
.wtl-h .it{font-family:'Instrument Serif',serif;font-style:italic;color:var(--gd);}
.wtl-h .pp{color:var(--p);}
.why-top-right{display:flex;flex-direction:column;gap:1.2rem;padding-left:2rem;border-left:2px solid rgba(22,20,15,.07);}
.wtr-quote{font-family:'Instrument Serif',serif;font-style:italic;font-size:1.4rem;line-height:1.5;color:var(--ink2);}
.wtr-sub{font-size:.78rem;color:rgba(22,20,15,.4);line-height:1.7;}
.why-h-scroll-wrap{position:relative;overflow:hidden;}
.why-h-scroll{display:flex;gap:1.5rem;padding-bottom:1rem;overflow-x:auto;scrollbar-width:none;scroll-snap-type:x mandatory;cursor:grab;}
.why-h-scroll:active{cursor:grabbing;}
.why-h-scroll::-webkit-scrollbar{display:none;}
.why-hcard{flex-shrink:0;width:340px;background:var(--white);border:1px solid rgba(22,20,15,.06);padding:2.5rem 2rem;scroll-snap-align:start;position:relative;overflow:hidden;cursor:none;transition:box-shadow .3s,transform .3s;}
.why-hcard::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:linear-gradient(to bottom,var(--g),var(--p));transform:scaleY(0);transform-origin:top;transition:transform .4s ease;}
.why-hcard:hover::before{transform:scaleY(1);}
.why-hcard:hover{box-shadow:0 12px 40px rgba(147,24,204,.1);transform:translateY(-4px);}
.whc-num{font-size:.58rem;letter-spacing:.15em;color:var(--p);margin-bottom:1.5rem;}
.whc-icon{font-size:2.2rem;margin-bottom:1rem;display:block;transition:transform .3s;}
.why-hcard:hover .whc-icon{transform:scale(1.2) rotate(-8deg);}
.whc-spicy{font-family:'Unbounded',sans-serif;font-weight:900;font-size:1.3rem;letter-spacing:-.02em;color:var(--gd);line-height:1.1;margin-bottom:.8rem;}
.whc-title{font-family:'Archivo Black',sans-serif;font-size:.95rem;color:var(--ink);margin-bottom:.6rem;letter-spacing:-.01em;}
.whc-desc{font-size:.72rem;color:rgba(22,20,15,.4);line-height:1.7;}
.why-drag-hint{display:flex;align-items:center;gap:.5rem;font-size:.58rem;letter-spacing:.15em;color:rgba(22,20,15,.3);text-transform:uppercase;margin-bottom:1rem;}
.why-drag-hint::before{content:'←→';font-size:.8rem;color:var(--p);}
#process{padding:6rem 3rem;background:var(--cream);position:relative;overflow:hidden;}
.proc-bg-txt{position:absolute;bottom:-2rem;right:-1rem;font-family:'Unbounded',sans-serif;font-weight:900;font-size:clamp(6rem,15vw,18rem);color:rgba(22,20,15,.03);letter-spacing:-.04em;pointer-events:none;line-height:1;}
.proc-header{margin-bottom:4rem;}
.proc-kicker{font-size:.6rem;letter-spacing:.2em;color:var(--p);text-transform:uppercase;margin-bottom:1rem;}
.proc-h{font-family:'Unbounded',sans-serif;font-weight:900;font-size:clamp(2.5rem,5vw,5.5rem);letter-spacing:-.03em;line-height:.9;color:var(--ink);}
.proc-h span{color:var(--p);}
.proc-steps{display:grid;grid-template-columns:repeat(2,1fr);gap:1.5rem;}
.pstep{background:var(--white);border:1px solid rgba(22,20,15,.06);padding:2.5rem;position:relative;overflow:hidden;cursor:none;transition:all .3s;}
.pstep:nth-child(even){margin-top:3rem;}
.pstep::after{content:'';position:absolute;inset:0;background:radial-gradient(circle at 100% 0%,rgba(145,216,82,.08) 0%,transparent 50%);opacity:0;transition:opacity .4s;}
.pstep:hover::after{opacity:1;}
.pstep:hover{box-shadow:0 16px 48px rgba(22,20,15,.08);transform:translateY(-3px);}
.pstep.lit{border-top:2px solid var(--g);}
.ps-num{font-family:'Unbounded',sans-serif;font-weight:900;font-size:4rem;color:rgba(22,20,15,.05);line-height:1;position:absolute;top:1rem;right:1.5rem;letter-spacing:-.04em;}
.ps-icon{font-size:2.5rem;margin-bottom:1.5rem;display:block;}
.ps-title{font-family:'Archivo Black',sans-serif;font-size:1.2rem;color:var(--ink);margin-bottom:.6rem;letter-spacing:-.01em;}
.ps-desc{font-size:.75rem;color:rgba(22,20,15,.4);line-height:1.7;}
.ps-tag{display:inline-block;margin-top:1.2rem;background:rgba(145,216,82,.12);color:var(--gd);padding:.3rem .8rem;font-size:.58rem;letter-spacing:.1em;text-transform:uppercase;}
#menu{padding:6rem 3rem;background:var(--cream3);position:relative;}
.menu-header{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:3rem;padding-bottom:1.5rem;border-bottom:1px solid rgba(22,20,15,.08);}
.menu-h{font-family:'Unbounded',sans-serif;font-weight:900;font-size:clamp(2rem,4vw,4.5rem);letter-spacing:-.03em;line-height:.9;color:var(--ink);}
.menu-h span{color:var(--gd);}
.menu-sub{font-size:.62rem;letter-spacing:.1em;color:rgba(22,20,15,.35);}
.menu-grid{display:grid;grid-template-columns:1.4fr 1fr 1fr;grid-template-rows:auto auto;gap:1.2rem;}
.mcard{background:var(--white);border:1px solid rgba(22,20,15,.06);padding:2rem 1.8rem;position:relative;overflow:hidden;cursor:none;transition:all .3s;}
.mcard:hover{box-shadow:0 12px 40px rgba(22,20,15,.08);}
.mcard:hover .mc-icon{transform:scale(1.3) rotate(-5deg);}
.mcard.featured{grid-row:span 2;background:var(--ink);border-color:var(--ink);}
.mcard.featured .mc-tag{color:var(--g);}
.mcard.featured .mc-name{color:#fff;}
.mcard.featured .mc-desc{color:rgba(255,255,255,.35);}
.mcard.featured .mc-price{color:var(--g);}
.mcard.featured .mc-price span{color:rgba(255,255,255,.3);}
.mcard.featured .mc-arrow{color:rgba(255,255,255,.2);}
.mc-icon{font-size:2rem;margin-bottom:1.2rem;display:block;transition:transform .3s;}
.mc-tag{font-size:.55rem;letter-spacing:.15em;color:var(--p);text-transform:uppercase;margin-bottom:.6rem;}
.mc-name{font-family:'Archivo Black',sans-serif;font-size:1.15rem;color:var(--ink);margin-bottom:.4rem;letter-spacing:-.01em;}
.mc-desc{font-size:.72rem;color:rgba(22,20,15,.35);line-height:1.6;margin-bottom:1.2rem;}
.mc-price{font-family:'Unbounded',sans-serif;font-weight:700;font-size:1.6rem;color:var(--p);letter-spacing:-.02em;}
.mc-price span{font-family:'DM Mono',monospace;font-size:.65rem;color:rgba(22,20,15,.3);font-weight:400;}
.mc-arrow{position:absolute;top:1.5rem;right:1.5rem;font-size:1rem;color:rgba(22,20,15,.15);transition:all .3s;}
.mcard:hover .mc-arrow{transform:translateX(4px);color:var(--p);opacity:1;}
.menu-cta-row{margin-top:2rem;text-align:center;}
#cta{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--ink);position:relative;overflow:hidden;text-align:center;padding:4rem 3rem;}
.cta-bg-circle{position:absolute;width:70vw;height:70vw;max-width:800px;max-height:800px;border-radius:50%;border:1px solid rgba(255,255,255,.04);top:50%;left:50%;transform:translate(-50%,-50%);}
.cta-bg-circle:nth-child(2){width:50vw;height:50vw;border-color:rgba(145,216,82,.08);}
.cta-bg-circle:nth-child(3){width:30vw;height:30vw;border-color:rgba(147,24,204,.12);}
.cta-kicker{font-size:.62rem;letter-spacing:.25em;color:var(--g);text-transform:uppercase;margin-bottom:1.5rem;position:relative;z-index:1;}
.cta-h{font-family:'Unbounded',sans-serif;font-weight:900;font-size:clamp(3rem,9vw,11rem);letter-spacing:-.04em;line-height:.85;color:#fff;position:relative;z-index:1;}
.cta-h .cg{color:var(--g);}
.cta-h .cp{color:var(--pl);}
.cta-quote{font-family:'Instrument Serif',serif;font-style:italic;font-size:1.2rem;color:rgba(255,255,255,.3);margin:2rem 0;max-width:600px;position:relative;z-index:1;line-height:1.6;}
.cta-btns{display:flex;gap:1rem;justify-content:center;position:relative;z-index:1;}
.btn-glow{background:var(--g);color:var(--ink);border:none;padding:1.1rem 3.5rem;font-family:'Unbounded',sans-serif;font-size:.8rem;font-weight:700;letter-spacing:.05em;cursor:none;transition:all .25s;box-shadow:0 0 0 0 rgba(145,216,82,.4);animation:glowPulse 3s ease infinite;}
@keyframes glowPulse{0%,100%{box-shadow:0 0 0 0 rgba(145,216,82,.3)}50%{box-shadow:0 0 0 16px rgba(145,216,82,0)}}
.btn-glow:hover{background:#fff;transform:scale(1.05);}
.btn-ghost-white{background:transparent;border:1.5px solid rgba(255,255,255,.15);color:#fff;padding:1.1rem 2rem;font-family:'DM Mono',monospace;font-size:.68rem;letter-spacing:.1em;text-transform:uppercase;cursor:none;transition:all .2s;}
.btn-ghost-white:hover{border-color:var(--g);color:var(--g);}
.cta-meta{margin-top:2rem;font-size:.55rem;letter-spacing:.15em;color:rgba(255,255,255,.15);position:relative;z-index:1;}
footer{background:var(--ink);border-top:1px solid rgba(255,255,255,.05);padding:3.5rem 3rem 2rem;display:grid;grid-template-columns:2fr 1fr 1fr;gap:3rem;}
.fl{font-family:'Unbounded',sans-serif;font-weight:900;font-size:2rem;letter-spacing:-.03em;color:#fff;line-height:1;}
.fl em{color:var(--g);font-style:normal;}
.ft{margin-top:.8rem;font-size:.72rem;color:rgba(255,255,255,.3);line-height:1.65;max-width:240px;}
.fc-t{font-size:.55rem;letter-spacing:.2em;color:var(--g);text-transform:uppercase;margin-bottom:1rem;}
.fc-l{list-style:none;display:flex;flex-direction:column;gap:.6rem;}
.fc-l a{font-size:.75rem;color:rgba(255,255,255,.3);text-decoration:none;transition:color .2s;}
.fc-l a:hover{color:var(--g);}
.fb{padding:1.5rem 3rem;background:var(--ink);border-top:1px solid rgba(255,255,255,.04);display:flex;justify-content:space-between;}
.fb span{font-size:.55rem;letter-spacing:.08em;color:rgba(255,255,255,.15);}
.float-order{position:fixed;bottom:2rem;right:2rem;z-index:800;display:flex;align-items:center;gap:.8rem;background:var(--p);color:#fff;border:none;padding:1rem 1.8rem;font-family:'Unbounded',sans-serif;font-weight:700;font-size:.78rem;letter-spacing:.03em;cursor:none;box-shadow:0 8px 32px rgba(147,24,204,.45);transition:background .25s,box-shadow .25s,transform .2s;animation:floatBob 3s ease-in-out infinite;outline:none;}
.float-order::after{content:'';position:absolute;inset:-3px;border:2px solid rgba(147,24,204,.5);animation:fRing 2.5s ease-out infinite;pointer-events:none;}
@keyframes fRing{0%{opacity:.7;transform:scale(1);}100%{opacity:0;transform:scale(1.12);}}
.float-order:hover{background:var(--gd);color:var(--ink);box-shadow:0 12px 40px rgba(106,184,46,.45);animation:none;transform:translateY(-3px) scale(1.04);}
.fo-icon{font-size:1.1rem;line-height:1;}
.fo-text{display:flex;flex-direction:column;gap:.15rem;}
.fo-main{font-size:.78rem;font-weight:700;line-height:1;}
.fo-sub{font-family:'DM Mono',monospace;font-size:.5rem;font-weight:400;opacity:.65;letter-spacing:.1em;text-transform:uppercase;}
@keyframes floatBob{0%,100%{transform:translateY(0);}50%{transform:translateY(-5px);}}
.dnav{position:fixed;right:1.5rem;top:50%;transform:translateY(-50%);z-index:400;display:flex;flex-direction:column;gap:.5rem;}
.dn{width:5px;height:5px;border-radius:50%;background:rgba(22,20,15,.15);cursor:pointer;transition:all .3s;}
.dn.on{background:var(--p);transform:scale(1.6);}
.dn:hover{background:var(--gd);}
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
  #hero{padding:5rem 1.2rem 2.5rem;justify-content:flex-start;padding-top:5.5rem;}
  .hero-bg-word{font-size:clamp(4rem,22vw,8rem);}
  .hero-statement{margin-top:1.5rem;margin-bottom:1.5rem;}
  .hs-main{font-size:clamp(.95rem,4.5vw,1.4rem);white-space:normal;}
  .hero-main{grid-template-columns:1fr;gap:1rem;margin-top:0;}
  .hero-h1{font-size:clamp(2.8rem,15vw,5.5rem);line-height:.93;}
  .hero-right{max-width:100%;align-items:flex-start;}
  .hero-ctas{justify-content:flex-start;flex-wrap:wrap;gap:.6rem;}
  .hero-scroll-hint{display:none;}
  .f-badge,.fb1,.fb2,.fb3{display:none;}
  .float-order{padding:.75rem 1.2rem;bottom:1rem;right:1rem;}
  .fo-sub{display:none;}
  .ti{font-size:.62rem;}
  .sf-heading{font-size:clamp(1.8rem,9vw,3.5rem);}
  .sf-spicy{font-size:clamp(2rem,9vw,4rem);}
  .sf-sub{font-size:.75rem;padding:0 1rem;}
  #why{padding:3rem 1.2rem 2rem;}
  .why-top{grid-template-columns:1fr;gap:1.5rem;margin-bottom:2.5rem;}
  .wtl-h{font-size:clamp(2rem,9vw,3.5rem);}
  .why-top-right{padding-left:0;border-left:none;border-top:1px solid rgba(22,20,15,.07);padding-top:1.2rem;}
  .wtr-quote{font-size:1.1rem;}
  .why-hcard{width:260px;padding:1.5rem 1.2rem;}
  .whc-spicy{font-size:1.1rem;}
  #process{padding:3rem 1.2rem;}
  .proc-h{font-size:clamp(2rem,9vw,3.5rem);}
  .proc-steps{grid-template-columns:1fr;}
  .pstep:nth-child(even){margin-top:0;}
  .pstep{padding:1.5rem 1.2rem;}
  #menu{padding:3rem 1.2rem;}
  .menu-grid{grid-template-columns:1fr;grid-template-rows:auto;}
  .mcard.featured{grid-row:span 1;}
  .menu-h{font-size:clamp(2rem,9vw,3.5rem);}
  .mcard{padding:1.5rem 1.2rem;}
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
  .hs-main{font-size:clamp(.85rem,4vw,1.1rem);}
  .why-hcard{width:240px;}
  .sf-heading{font-size:clamp(1.4rem,8vw,2.8rem);}
  .sf-spicy{font-size:clamp(1.6rem,8vw,3rem);}
  .cta-h{font-size:clamp(2.5rem,11vw,4.5rem);}
}
`

export default function Home() {
  useEffect(() => {
    // Cursor
    const cur = document.getElementById('cur')
    const ring = document.getElementById('ring')
    if (!cur || !ring) return
    let mx = 0, my = 0, rx = 0, ry = 0
    const onMove = (e: MouseEvent) => {
      mx = e.clientX; my = e.clientY
      cur.style.left = mx - 5 + 'px'
      cur.style.top  = my - 5 + 'px'
    }
    document.addEventListener('mousemove', onMove)
    let raf: number
    const animRing = () => {
      rx += (mx - rx) * 0.12; ry += (my - ry) * 0.12
      ring.style.left = rx - 16 + 'px'; ring.style.top = ry - 16 + 'px'
      raf = requestAnimationFrame(animRing)
    }
    animRing()
    document.querySelectorAll<HTMLElement>('button,a,.why-hcard,.pstep,.mcard,.float-order').forEach(el => {
      el.addEventListener('mouseenter', () => { cur.style.transform = 'scale(2.5)'; cur.style.background = 'var(--g)'; ring.style.transform = 'scale(1.5)'; ring.style.borderColor = 'var(--p)' })
      el.addEventListener('mouseleave', () => { cur.style.transform = 'scale(1)'; cur.style.background = 'var(--p)'; ring.style.transform = 'scale(1)'; ring.style.borderColor = 'var(--g)' })
    })

    // Progress bar
    const prog = document.getElementById('prog')
    const onScroll = () => {
      if (!prog) return
      const h = document.documentElement.scrollHeight - window.innerHeight
      prog.style.width = (window.scrollY / h * 100) + '%'
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    // Dot nav
    const secIds = ['hero', 'scroll-story', 'why', 'process', 'menu']
    const dns = document.querySelectorAll('.dn')
    secIds.forEach((id, i) => {
      const el = document.getElementById(id)
      if (el) new IntersectionObserver(en => { if (en[0].isIntersecting) dns.forEach((d, j) => d.classList.toggle('on', j === i)) }, { threshold: .4 }).observe(el)
    })

    // Reveal
    const ro = new IntersectionObserver(en => { en.forEach(e => { if (e.isIntersecting) e.target.classList.add('in') }) }, { threshold: .1, rootMargin: '0px 0px -40px 0px' })
    document.querySelectorAll('.rv').forEach(el => ro.observe(el))

    // Split word hero
    const swIO = new IntersectionObserver(en => { en.forEach(e => { if (e.isIntersecting) e.target.classList.add('in') }) }, { threshold: .1 })
    document.querySelectorAll('.split-word').forEach(el => swIO.observe(el))

    // Canvas scroll story
    const canvas = document.getElementById('storyCanvas') as HTMLCanvasElement
    if (canvas) {
      const ctx = canvas.getContext('2d')!
      let W = 0, H = 0
      const resize = () => { W = canvas.width = canvas.offsetWidth; H = canvas.height = canvas.offsetHeight }
      resize()
      window.addEventListener('resize', resize)
      const particles: { x: number; y: number; vx: number; vy: number; r: number; c: string; a: number }[] = []
      for (let i = 0; i < 120; i++) particles.push({ x: Math.random() * 2000, y: Math.random() * 1200, vx: (Math.random() - .5) * .4, vy: (Math.random() - .5) * .4, r: Math.random() * 2 + .5, c: Math.random() > .5 ? 'rgba(145,216,82,' : 'rgba(147,24,204,', a: Math.random() * .55 + .2 })
      const frames = ['sf1', 'sf2', 'sf3', 'sf4', 'sf5']
      const sdots = document.querySelectorAll('.sdot')
      let currentFrame = 0
      // Brighter centre + lighter edges for better visibility on mobile
      const frameColors = [
        ['rgba(145,216,82,.55)', 'rgba(18,36,10,.75)'],   // frame 1 — green
        ['rgba(145,216,82,.65)', 'rgba(12,32,4,.75)'],    // frame 2 — vivid green
        ['rgba(196,78,245,.55)', 'rgba(20,4,30,.75)'],    // frame 3 — purple
        ['rgba(145,216,82,.45)', 'rgba(4,20,36,.75)'],    // frame 4 — teal-green
        ['rgba(145,216,82,.60)', 'rgba(14,14,10,.75)'],   // frame 5 — green
      ]
      const drawCanvas = () => {
        ctx.clearRect(0, 0, W, H)
        const radius = Math.max(W, H) * 0.85
        const grd = ctx.createRadialGradient(W * .5, H * .5, 0, W * .5, H * .5, radius)
        grd.addColorStop(0, frameColors[currentFrame][0]); grd.addColorStop(1, frameColors[currentFrame][1])
        ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H)
        ctx.strokeStyle = 'rgba(255,255,255,.03)'; ctx.lineWidth = 1
        for (let x = 0; x < W; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
        for (let y = 0; y < H; y += 80) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }
        const t = Date.now() * .001
        particles.forEach(p => {
          p.x += p.vx; p.y += p.vy
          if (p.x < 0 || p.x > W) p.vx *= -1
          if (p.y < 0 || p.y > H) p.vy *= -1
          ctx.beginPath(); ctx.arc(p.x % W, p.y % H, p.r, 0, Math.PI * 2)
          ctx.fillStyle = p.c + p.a + ')'; ctx.fill()
        })
        const pulse = Math.sin(t * 1.5) * .5 + .5
        ctx.beginPath(); ctx.arc(W * .5, H * .5, 150 + pulse * 30, 0, Math.PI * 2)
        ctx.strokeStyle = currentFrame % 2 === 0 ? `rgba(145,216,82,${.06 + pulse * .04})` : `rgba(196,78,245,${.06 + pulse * .04})`
        ctx.lineWidth = 1; ctx.stroke()
        requestAnimationFrame(drawCanvas)
      }
      drawCanvas()
      const story = document.getElementById('scroll-story')
      const updateStory = () => {
        if (!story) return
        const rect = story.getBoundingClientRect()
        const total = story.offsetHeight - window.innerHeight
        const pct = Math.max(0, Math.min(1, -rect.top / total))
        const fi = Math.min(4, Math.floor(pct * 5))
        if (fi !== currentFrame) {
          document.getElementById(frames[currentFrame])?.classList.remove('active')
          currentFrame = fi
          document.getElementById(frames[currentFrame])?.classList.add('active')
          sdots.forEach((d, i) => d.classList.toggle('on', i === fi))
        }
      }
      window.addEventListener('scroll', updateStory, { passive: true })
    }

    // Drag scroll
    const ws = document.getElementById('whyScroll')
    if (ws) {
      let isDown = false, startX = 0, scrollLeft = 0
      ws.addEventListener('mousedown', e => { isDown = true; startX = e.pageX - ws.offsetLeft; scrollLeft = ws.scrollLeft; ws.style.cursor = 'grabbing' })
      ws.addEventListener('mouseleave', () => { isDown = false; ws.style.cursor = 'grab' })
      ws.addEventListener('mouseup', () => { isDown = false; ws.style.cursor = 'grab' })
      ws.addEventListener('mousemove', (e: Event) => { if (!isDown) return; e.preventDefault(); const me = e as MouseEvent; const x = me.pageX - ws.offsetLeft; ws.scrollLeft = scrollLeft - (x - startX) * 1.5 })
    }

    // Counter
    function animC(el: Element, target: number, dur = 1400) {
      let s: number | null = null
      const step = (ts: number) => { if (!s) s = ts; const p = Math.min((ts - s) / dur, 1); el.textContent = String(Math.round((1 - Math.pow(1 - p, 3)) * target)); if (p < 1) requestAnimationFrame(step); else el.textContent = String(target) }
      requestAnimationFrame(step)
    }
    const whyEl = document.getElementById('why')
    if (whyEl) new IntersectionObserver(en => { en.forEach(e => { if (e.isIntersecting && !(e.target as HTMLElement).dataset.done) { (e.target as HTMLElement).dataset.done = '1'; e.target.querySelectorAll('.count-num').forEach(n => animC(n, parseInt((n as HTMLElement).dataset.count || '0'))) } }) }, { threshold: .5 }).observe(whyEl)

    // 3D tilt
    document.querySelectorAll<HTMLElement>('.why-hcard,.pstep,.mcard').forEach(c => {
      c.addEventListener('mousemove', (e: Event) => { const me = e as MouseEvent; const r = c.getBoundingClientRect(); const x = (me.clientX - r.left) / r.width - .5, y = (me.clientY - r.top) / r.height - .5; c.style.transform = `perspective(800px) rotateX(${y * -6}deg) rotateY(${x * 6}deg) translateZ(8px)` })
      c.addEventListener('mouseleave', () => { c.style.transform = '' })
    })

    // Magnetic buttons
    document.querySelectorAll<HTMLElement>('.btn-fill,.btn-glow,.nav-btn').forEach(b => {
      b.addEventListener('mousemove', (e: Event) => { const me = e as MouseEvent; const r = b.getBoundingClientRect(); const x = (me.clientX - r.left - r.width / 2) * .2, y = (me.clientY - r.top - r.height / 2) * .2; b.style.transform = `translate(${x}px,${y}px) scale(1.04)` })
      b.addEventListener('mouseleave', () => { b.style.transform = '' })
    })

    // Hero parallax
    const hh1 = document.querySelector<HTMLElement>('.hero-h1')
    const heroEl = document.getElementById('hero')
    if (heroEl && hh1) {
      heroEl.addEventListener('mousemove', (e: Event) => { const me = e as MouseEvent; const r = heroEl.getBoundingClientRect(); const cx = (me.clientX - r.left) / r.width - .5, cy = (me.clientY - r.top) / r.height - .5; hh1.style.transform = `translate(${cx * 12}px,${cy * 8}px)` })
      heroEl.addEventListener('mouseleave', () => { hh1.style.transform = '' })
    }

    // Process lit
    let pdone = false
    const procEl = document.getElementById('process')
    if (procEl) new IntersectionObserver(en => { if (en[0].isIntersecting && !pdone) { pdone = true; document.querySelectorAll('.pstep').forEach((s, i) => setTimeout(() => s.classList.add('lit'), i * 200)) } }, { threshold: .3 }).observe(procEl)

    return () => {
      document.removeEventListener('mousemove', onMove)
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  const goOrder = () => { window.location.href = 'https://www.blurufresh.com/order' }
  const goStory = () => { document.getElementById('scroll-story')?.scrollIntoView({ behavior: 'smooth' }) }

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Unbounded:wght@400;700;900&family=DM+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet" />
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div id="prog" />
      <div id="cur" />
      <div id="ring" />

      <button className="float-order" onClick={goOrder}>
        <span className="fo-icon">⚡</span>
        <span className="fo-text">
          <span className="fo-main">Order Now</span>
          <span className="fo-sub">Delivery in 1 hour</span>
        </span>
      </button>

      <div className="dnav" id="dnav">
        {[0,1,2,3,4].map(i => <div key={i} className={`dn${i===0?' on':''}`} onClick={() => { const ids=['hero','scroll-story','why','process','menu']; document.getElementById(ids[i])?.scrollIntoView({behavior:'smooth'}) }} />)}
      </div>

      <nav>
        <div className="logo">B&apos;<em>LURU</em> FRESH</div>
        <div className="nav-r">
          <a href="#why">Why</a>
          <a href="#process">Process</a>
          <a href="#menu">Menu</a>
          <a href="tel:+917012488951">Call</a>
          <button className="nav-btn" onClick={goOrder}>Order ⚡</button>
        </div>
      </nav>

      <section id="hero">
        <div className="hero-bg-word">FRESH</div>
        <div className="f-badge fb1"><span className="fb-dot" />Cut fresh daily</div>
        <div className="f-badge fb2"><span className="fb-dot" />1hr delivery</div>
        <div className="f-badge fb3"><span className="fb-dot" />FSSAI 11226331000344</div>
        <div className="hero-scroll-hint"><div className="hero-scroll-line" />Scroll</div>
        <div className="hero-statement rv d1">
          <div className="hs-pill">🐔 Bengaluru&apos;s first ultra-fresh system</div>
          <div className="hs-main">
            <span className="accent">Ever felt a foul smell or sliminess</span>&nbsp;<span style={{color:'var(--ink)',whiteSpace:'nowrap'}}>while unpacking the chicken</span><span className="hs-cursor" style={{color:'var(--gd)'}}>?</span>
          </div>
          <div className="hs-divider" />
        </div>
        <div className="hero-main">
          <h1 className="hero-h1">
            <div className="split-word d1">THE <span className="line-p">END</span></div><br/>
            <div className="split-word d2">OF <span>OLD</span></div><br/>
            <div className="split-word d3"><span className="line-g">STOCK</span></div><br/>
            <div className="split-word d4">CHICKEN.</div>
          </h1>
          <div className="rv d4" style={{marginTop:'1.5rem',fontFamily:"'Archivo Black',sans-serif",fontSize:'clamp(1.2rem,2.5vw,2.2rem)',letterSpacing:'-.02em',color:'var(--ink2)',display:'flex',alignItems:'center',gap:'1rem'}}>
            <span style={{width:36,height:3,background:'linear-gradient(to right,var(--gd),var(--p))',display:'inline-block',flexShrink:0}} />
            <span>From Now — <span style={{color:'var(--gd)'}}>Not frozen. Not stored overnight.</span></span>
          </div>
        </div>
        <div className="hero-right rv d2">
          <div className="hero-ctas">
            <button className="btn-fill" onClick={goOrder}><span>Order Now ⚡</span></button>
            <button className="btn-line" onClick={goStory}>Watch ↓</button>
          </div>
        </div>
      </section>

      <div className="ticker">
        <div className="ticker-track">
          {['NO FOUL SMELL','CUT AFTER ORDER','1 HOUR DELIVERY','ZERO PRESERVATIVES',"BENGALURU'S FIRST",'ULTRA-FRESH SYSTEM','NO FOUL SMELL','CUT AFTER ORDER','1 HOUR DELIVERY','ZERO PRESERVATIVES',"BENGALURU'S FIRST",'ULTRA-FRESH SYSTEM'].map((t,i) => (
            <div key={i} className="ti">{t}<span className="ti-sep">✦</span></div>
          ))}
        </div>
      </div>

      <div id="scroll-story">
        <div className="story-sticky">
          <canvas id="storyCanvas" />
          <div className="story-frame active" id="sf1">
            <div className="shape-ring" style={{width:500,height:500,top:'50%',left:'50%',borderColor:'rgba(145,216,82,1)'}} />
            <div className="shape-ring" style={{width:300,height:300,top:'50%',left:'50%',borderColor:'rgba(147,24,204,1)',animationDuration:'5s',animationDirection:'reverse'}} />
            <div className="sf-label">01 — The Revolution</div>
            <div className="sf-heading">INTRODUCING<br/><span className="hl">BENGALURU&apos;S</span><br/>FIRST<br/><span className="hp">ULTRA-FRESH</span><br/>SYSTEM.</div>
            <div className="sf-sub">Bengaluru has never seen anything like this. <strong>Not frozen. Not stored.</strong> Freshly prepared for every single order.</div>
          </div>
          <div className="story-frame" id="sf2">
            <div className="shape-blob" style={{width:400,height:400,top:'30%',left:'20%',background:'var(--g)'}} />
            <div className="sf-label">02 — The F*cking Truth</div>
            <div className="sf-spicy">ZERO SH*T<br/>IN OUR SYSTEM.</div>
            <div className="sf-sub">We cut <strong>only after you order.</strong> Not in the morning. Not the night before. Your order literally triggers the knife.</div>
          </div>
          <div className="story-frame" id="sf3">
            <div className="shape-blob" style={{width:350,height:350,top:'50%',right:'10%',background:'var(--pl)'}} />
            <div className="sf-label">03 — The Speed</div>
            <div className="sf-heading">FROM<br/><span className="hl">KNIFE</span><br/>TO YOUR<br/><span className="hp">KITCHEN.</span></div>
            <div className="sf-sub">Processing → Hygienic Packing → Delivery. In under <strong>60 minutes.</strong></div>
          </div>
          <div className="story-frame" id="sf4">
            <div className="sf-label">04 — The Standard</div>
            <div className="sf-heading">THE OLD<br/>WAY IS<br/><span className="hl">DEAD.</span></div>
            <div className="sf-sub">Bengaluru&apos;s first ultra-fresh chicken delivery experience. Not improved. <strong>Rebuilt from scratch.</strong></div>
          </div>
          <div className="story-frame" id="sf5">
            <div className="sf-label">05 — Order</div>
            <div className="sf-spicy" style={{color:'#fff'}}>TASTE THE<br/><span style={{color:'var(--g)'}}>DIFFERENCE.</span></div>
            <div className="sf-sub">The freshest chicken Bengaluru has ever tasted. One order. You&apos;ll understand.</div>
            <div style={{marginTop:'2rem'}}><button className="btn-glow" onClick={goOrder}>Order Fresh Now ⚡</button></div>
          </div>
          <div className="story-dots">
            {[0,1,2,3,4].map(i => <div key={i} className={`sdot${i===0?' on':''}`} id={`sd${i}`} />)}
          </div>
        </div>
      </div>

      <section id="why">
        <div className="why-top">
          <div className="why-top-left">
            <div className="wtl-kicker rv">— The Revolution</div>
            <h2 className="wtl-h rv d1">INTRODUCING<br/><span className="it">Bengaluru&apos;s</span><br/><span className="pp">FIRST</span><br/>ULTRA-FRESH<br/>SYSTEM</h2>
          </div>
          <div className="why-top-right rv d2">
            <div className="wtr-quote">&quot;The freshest chicken Bengaluru has ever tasted.&quot;</div>
            <div className="wtr-sub">We didn&apos;t just build a delivery app. We built an entirely new supply chain that removes cold storage from the equation completely. What you get is what nature intended — pure, same-day protein.</div>
          </div>
        </div>
        <div className="why-drag-hint rv">Drag to explore</div>
        <div className="why-h-scroll rv d1" id="whyScroll">
          {[
            {num:'01',icon:'🚫',spicy:'ZERO SH*T.',title:'No Foul Smell. No Sliminess. Ever.',desc:"That disgusting smell while unpacking? That's stored meat decomposing. We cut only after your order. That smell has never existed in our system — and never will."},
            {num:'02',icon:'⚡',spicy:'IN HOURS.\nNOT DAYS.',title:'From Our Kitchen To Your Door',desc:"Not 'we'll try.' Not 'approximately.' Under 1 hour. Your masala will still be sizzling when the doorbell rings."},
            {num:'03',icon:'🔬',spicy:'NOT VIBES.\nVERIFIED.',title:'Zero Additives. FSSAI Licensed.',desc:'FSSAI Lic. 11226331000344. No additives. No chemicals. No preservatives. We have the receipts — you never have to take our word for it.'},
            {num:'04',icon:'🎯',spicy:'YOUR ORDER\n= THE KNIFE.',title:'Cut-To-Order. Every Single Time.',desc:"No pre-cut pieces sitting around. The moment you place your order — that's when the cutting begins. Not before. Not after."},
            {num:'05',icon:'🏆',spicy:'THE OLD WAY\nIS DEAD.',title:"Bengaluru's First Ultra-Fresh System",desc:"We didn't upgrade the old system. We removed it entirely and built something this city has never seen before. This is what fresh actually means."},
          ].map(c => (
            <div key={c.num} className="why-hcard">
              <div className="whc-num">{c.num}</div>
              <span className="whc-icon">{c.icon}</span>
              <div className="whc-spicy">{c.spicy}</div>
              <div className="whc-title">{c.title}</div>
              <div className="whc-desc">{c.desc}</div>
            </div>
          ))}
          <div className="why-hcard" style={{background:'var(--ink)',borderColor:'var(--ink)'}}>
            <div className="whc-num" style={{color:'var(--g)'}}>STATS</div>
            <span className="whc-icon">📊</span>
            <div style={{display:'flex',flexDirection:'column',gap:'1.5rem',marginTop:'.5rem'}}>
              {[{count:1,unit:'hr',label:'Cut to delivery'},{count:0,unit:'%',label:'Preservatives'},{count:100,unit:'%',label:'Cut-to-order'}].map(s => (
                <div key={s.label}>
                  <div style={{fontFamily:"'Unbounded',sans-serif",fontWeight:900,fontSize:'3rem',color:'var(--g)',lineHeight:1}}>
                    <span className="count-num" data-count={s.count}>0</span><span style={{fontSize:'1.2rem',color:'#fff'}}>{s.unit}</span>
                  </div>
                  <div style={{fontSize:'.58rem',letterSpacing:'.1em',color:'rgba(255,255,255,.3)',textTransform:'uppercase',marginTop:'.2rem'}}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="process">
        <div className="proc-bg-txt">PROCESS</div>
        <div className="proc-header">
          <div className="proc-kicker rv">— How It Actually Works</div>
          <h2 className="proc-h rv d1">HOW IT<br/><span>WORKS.</span></h2>
        </div>
        <div className="proc-steps">
          {[
            {icon:'📲',title:'You Place The Order',desc:'Tap. Done. Your order hits our system instantly. The clock starts the moment you confirm — not a second before.',tag:'Trigger Point'},
            {icon:'🔪',title:'We Start Cutting — Right Now',desc:'Only after your order does the cutting begin. Not this morning. Not the night before. Your order is what triggers the knife.',tag:'Zero Pre-Cuts'},
            {icon:'📦',title:'Hygienically Packed & Sealed',desc:'Cut fresh, packed under sterile conditions, and vacuum-sealed to lock in freshness. Never stored after packing. Straight to you.',tag:'Sterile Sealed'},
            {icon:'🏍️',title:'At Your Door In Under 1 Hour',desc:'Not hopefully. Not usually. Under 60 minutes, guaranteed. No smell. No slime. Just clean, fresh chicken at its best.',tag:'Under 60 Mins'},
          ].map((s,i) => (
            <div key={i} className="pstep rv" style={{transitionDelay:`${(i%2)*.1}s`}}>
              <div className="ps-num">0{i+1}</div>
              <span className="ps-icon">{s.icon}</span>
              <div className="ps-title">{s.title}</div>
              <div className="ps-desc">{s.desc}</div>
              <div className="ps-tag">{s.tag}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="menu">
        <div className="menu-header">
          <h2 className="menu-h rv">WHAT WE<br/><span>ACTUALLY SELL</span></h2>
          <div className="menu-sub rv">Cut fresh. Every order.<br/>No stored fillets. Ever.</div>
        </div>
        <div className="menu-grid">
          <div className="mcard featured rv">
            <span className="mc-icon">🍗</span>
            <div className="mc-tag">Most Popular</div>
            <div className="mc-name">Boneless Breast</div>
            <div className="mc-desc">Zero fat. Maximum protein. Cut fresh after your order — no stored fillets, ever.</div>
            <div className="mc-price">₹280 <span>/ 500g</span></div>
            <div className="mc-arrow">→</div>
          </div>
          {[
            {icon:'🍖',tag:'Classic Cut',name:'Curry Cut',desc:'The OG bone-in cut for authentic Bengaluru curry.',price:'₹220',unit:'500g'},
            {icon:'🍗',tag:'BBQ Special',name:'Drumsticks',desc:'Thick, meaty, grill-ready. Freshness is mandatory here.',price:'₹240',unit:'500g'},
            {icon:'🐔',tag:'Full Bird',name:'Whole Chicken',desc:'Same-day processed. For when one cut just isn\'t enough.',price:'₹380',unit:'kg'},
            {icon:'🥩',tag:'Lean Cut',name:'Thigh Boneless',desc:'Juicier than breast, leaner than full thigh. Perfect for stir-fry.',price:'₹260',unit:'500g'},
          ].map((c,i) => (
            <div key={i} className="mcard rv" style={{transitionDelay:`${(i%2+1)*.1}s`}}>
              <span className="mc-icon">{c.icon}</span>
              <div className="mc-tag">{c.tag}</div>
              <div className="mc-name">{c.name}</div>
              <div className="mc-desc">{c.desc}</div>
              <div className="mc-price">{c.price} <span>/ {c.unit}</span></div>
              <div className="mc-arrow">→</div>
            </div>
          ))}
        </div>
        <div className="menu-cta-row rv d2">
          <button className="btn-fill" style={{marginTop:'2.5rem'}} onClick={goOrder}><span>See Full Menu &amp; Order →</span></button>
        </div>
      </section>

      <section id="cta">
        <div className="cta-bg-circle" /><div className="cta-bg-circle" /><div className="cta-bg-circle" />
        <div className="cta-kicker rv">— Done With Dead-Stock Chicken?</div>
        <h2 className="cta-h rv d1">ORDER<br/><span className="cg">FRESH.</span><br/><span className="cp">NOW.</span></h2>
        <div className="cta-quote rv d2">&quot;The Freshest Chicken Bengaluru Has Ever Tasted.&quot;<br/>Taste it once. You&apos;ll understand everything.</div>
        <div className="cta-btns rv d3">
          <button className="btn-glow" onClick={goOrder}>Order Now ⚡</button>
          <button className="btn-ghost-white" onClick={() => window.location.href='tel:+917012488951'}>📞 +91 70124 88951</button>
        </div>
        <div className="cta-meta rv d4">YELAHANKA · BANGALORE · DELIVERY IN 1 HOUR · FSSAI LIC. 11226331000344</div>
      </section>

      <footer>
        <div>
          <div className="fl">B&apos;<em>LURU</em><br/>FRESH</div>
          <p className="ft">Bengaluru&apos;s first ultra-fresh chicken delivery system. Not frozen. Not stored. Cut fresh for every order, every time.</p>
        </div>
        <div>
          <div className="fc-t">Navigate</div>
          <ul className="fc-l">
            <li><a href="https://www.blurufresh.com/order">Shop</a></li>
            <li><a href="#why">Why Us</a></li>
            <li><a href="#process">Process</a></li>
            <li><a href="tel:+917012488951">+91 70124 88951</a></li>
          </ul>
        </div>
        <div>
          <div className="fc-t">Legal</div>
          <ul className="fc-l">
            <li><Link href="/legal/privacy">Privacy Policy</Link></li>
            <li><Link href="/legal/terms">Terms of Service</Link></li>
            <li><Link href="/legal/refund">Refund Policy</Link></li>
          </ul>
        </div>
      </footer>
      <div className="fb">
        <span>© 2026 B&apos;LURU Fresh. All rights reserved.</span>
        <span>FSSAI Lic. 11226331000344</span>
      </div>
    </>
  )
}
