'use client'

import { useEffect } from 'react'
import Link from 'next/link'

const css = `
:root{
  --g:#8FA893; --gd:#4F6E55; --p:#A81A1A; --pl:#E29924;
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
nav{position:fixed;top:1.25rem;left:50%;transform:translateX(-50%);width:calc(100% - 2.5rem);max-width:1100px;z-index:500;display:flex;justify-content:space-between;align-items:center;padding:0.75rem 2.2rem;background:rgba(250,247,240,.92);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid rgba(168,26,26,0.12);border-radius:9999px;box-shadow:0 10px 30px -10px rgba(31,17,11,0.15),inset 0 1px 0 rgba(255,255,255,0.6);}
.logo{font-family:'Unbounded',sans-serif;font-size:0.95rem;font-weight:900;letter-spacing:-.02em;color:var(--ink);}
.logo em{color:var(--p);font-style:normal;}
.nav-r{display:flex;align-items:center;gap:2.2rem;}
.nav-r a{font-size:.62rem;letter-spacing:.15em;color:rgba(31,17,11,.65);text-decoration:none;text-transform:uppercase;transition:color .2s;}
.nav-r a:hover{color:var(--p);}
.nav-btn{background:var(--p);color:#fff;border:none;padding:.65rem 1.8rem;font-family:'Unbounded',sans-serif;font-size:.65rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;cursor:none;transition:all .2s;border-radius:9999px;box-shadow:0 4px 16px rgba(168,26,26,.32);}
.nav-btn:hover{background:var(--pl);color:#fff;box-shadow:0 4px 20px rgba(226,153,36,.42);}
#prog{position:fixed;top:0;left:0;height:3px;background:linear-gradient(90deg,var(--g),var(--p));z-index:600;transition:width .05s linear;width:0%;}
#hero{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:6.5rem 2rem 1.5rem;background:var(--cream);position:relative;overflow:hidden;text-align:center;}
.hero-wave{position:absolute;top:0;left:0;right:0;height:48vh;background:var(--p);clip-path:ellipse(100% 70% at 50% 20%);z-index:0;pointer-events:none;}
.hero-content-wrap{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;width:100%;max-width:1000px;margin:0 auto;}
.hero-statement-text{font-family:'DM Mono',monospace;font-size:clamp(0.85rem, 2.2vw, 1.1rem);color:rgba(255,255,255,0.9);max-width:55ch;margin-bottom:1rem;font-weight:500;position:relative;z-index:2;}
.hs-pill{display:inline-flex;align-items:center;gap:.5rem;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,0.24);padding:.4rem 1.2rem;width:fit-content;font-family:'DM Mono',monospace;font-size:.65rem;letter-spacing:.18em;color:#ffffff;text-transform:uppercase;margin-bottom:1.2rem;border-radius:9999px;position:relative;z-index:2;}
.hs-pill::before{content:'';width:6px;height:6px;background:#ffffff;border-radius:50%;animation:blink 1.5s ease infinite;}
.hero-h1{font-family:'Archivo Black',sans-serif;font-size:clamp(2.4rem, 6.8vw, 5rem);line-height:0.95;letter-spacing:-.04em;color:#ffffff;margin-bottom:0;text-shadow:0 4px 20px rgba(0,0,0,0.15);position:relative;z-index:1;}
.hero-h1 .line-light{color:var(--pl);}
.hero-main-prod-wrap{position:relative;width:100%;max-width:530px;margin:-85px auto 1.5rem;display:flex;justify-content:center;align-items:center;z-index:3;}
.hero-main-prod-img{width:100%;height:auto;mix-blend-mode:multiply;animation:floatBig 6s ease-in-out infinite;}
@keyframes floatBig{0%,100%{transform:translateY(0) scale(1) rotate(0.5deg);}50%{transform:translateY(-15px) scale(1.02) rotate(-0.5deg);}}

/* Side floating raw chicken plates */
.float-side-left{position:absolute;left:-110px;top:45%;transform:translateY(-50%) rotate(15deg);width:280px;height:280px;overflow:hidden;z-index:2;animation:floatSideL 7s ease-in-out infinite;pointer-events:none;}
.float-side-right{position:absolute;right:-110px;top:40%;transform:translateY(-50%) rotate(-12deg);width:280px;height:280px;overflow:hidden;z-index:2;animation:floatSideR 7s ease-in-out infinite;pointer-events:none;}
.float-side-left img, .float-side-right img{width:100%;height:100%;object-fit:cover;mix-blend-mode:multiply;}
@keyframes floatSideL{0%,100%{transform:translateY(-50%) rotate(15deg) translateY(0);}50%{transform:translateY(-50%) rotate(13deg) translateY(-12px);}}
@keyframes floatSideR{0%,100%{transform:translateY(-50%) rotate(-12deg) translateY(0);}50%{transform:translateY(-50%) rotate(-14deg) translateY(-12px);}}

/* Flying Spices & Herbs */
.flying-spice{position:absolute;font-size:1.6rem;z-index:4;pointer-events:none;animation:flyAround 8s ease-in-out infinite;}
.fs-1{left:18%;top:48%;animation-delay:0.5s;}
.fs-2{right:16%;top:38%;animation-delay:1.2s;font-size:2.2rem;}
.fs-3{left:26%;top:64%;animation-delay:2s;font-size:1.4rem;}
.fs-4{right:24%;top:58%;animation-delay:0.8s;}
.fs-5{left:48%;top:72%;animation-delay:1.6s;font-size:1.1rem;}
@keyframes flyAround{0%,100%{transform:translate(0, 0) rotate(0deg);}50%{transform:translate(8px, -12px) rotate(15deg);}}

.float-badge{position:absolute;background:var(--white);border:1px solid rgba(168,26,26,0.12);box-shadow:0 10px 30px rgba(31,17,11,0.08);padding:0.5rem 1rem;border-radius:9999px;display:flex;align-items:center;gap:0.4rem;font-size:0.58rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--ink);z-index:4;animation:floatBadgeUpDown 5s ease-in-out infinite;}
.fb-left-pkg{left:-8%;top:32%;animation-delay:0.5s;}
.fb-left-pkg img{width:22px;height:22px;border-radius:50%;object-fit:cover;}
.fb-right-fresh{right:-8%;top:42%;animation-delay:1.5s;}
.fb-dot{width:6px;height:6px;background:#059669;border-radius:50%;animation:blink 1.5s ease infinite;}
@keyframes floatBadgeUpDown{0%,100%{transform:translateY(0);}50%{transform:translateY(-10px);}}
.hero-bottom-content{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;margin-top:0.5rem;}
.hero-desc-para{font-family:'DM Mono',monospace;font-size:0.88rem;color:var(--ink);margin-bottom:1.2rem;max-width:45ch;}
.hero-desc-para strong{color:var(--p);font-weight:600;}
.hero-ctas{display:flex;gap:1rem;justify-content:center;}
.btn-fill{background:var(--p);color:#fff;border:none;padding:0.95rem 2.4rem;font-family:'Unbounded',sans-serif;font-size:.68rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;cursor:none;transition:all .25s;border-radius:9999px;box-shadow:0 10px 24px rgba(168,26,26,.32);position:relative;overflow:hidden;}
.btn-fill::after{content:'';position:absolute;inset:0;background:var(--pl);transform:translateX(-101%);transition:transform .3s ease;}
.btn-fill:hover::after{transform:translateX(0);}
.btn-fill span{position:relative;z-index:1;color:#fff;}
.btn-fill:hover span{color:#fff;}
.btn-line{background:transparent;border:1.5px solid rgba(31,17,11,.16);color:var(--ink);padding:0.95rem 2rem;font-family:'DM Mono',monospace;font-size:.68rem;letter-spacing:.1em;text-transform:uppercase;cursor:none;transition:all .2s;border-radius:9999px;}
.btn-line:hover{border-color:var(--p);color:var(--p);background:rgba(168,26,26,.04);transform:translateY(-1px);}
.hero-scroll-hint{display:none;}
.hero-bg-word{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-family:'Unbounded',sans-serif;font-weight:900;font-size:clamp(8rem,20vw,26rem);color:rgba(22,20,15,.03);white-space:nowrap;letter-spacing:-.04em;line-height:1;pointer-events:none;user-select:none;animation:bgFloat 8s ease-in-out infinite;z-index:0;}
.ticker{background:var(--p);padding:.9rem 0;overflow:hidden;display:flex;border-top:1px solid rgba(226,153,36,0.22);border-bottom:1px solid rgba(226,153,36,0.22);position:relative;z-index:10;}
.ticker-track{display:flex;gap:3rem;animation:tick 16s linear infinite;white-space:nowrap;}
@keyframes tick{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.ti{font-family:'Unbounded',sans-serif;font-size:.82rem;font-weight:900;letter-spacing:.12em;color:var(--cream);flex-shrink:0;display:flex;align-items:center;gap:2rem;}
.ti-sep{color:var(--pl);text-shadow:0 0 10px rgba(226,153,36,0.5);}
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
.card-bg-panel{position:absolute;inset:0;background:var(--white);border:1px solid rgba(168,26,26,0.07);border-radius:32px;box-shadow:0 10px 35px rgba(31,17,11,0.03);z-index:1;transition:all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);pointer-events:none;}
.story-card:hover .card-bg-panel{border-color:rgba(168,26,26,0.18);box-shadow:0 25px 50px rgba(168,26,26,0.08);}
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
.sf-label{font-family:'DM Mono',monospace;font-size:.62rem;letter-spacing:.2em;text-transform:uppercase;color:var(--p);border:1px solid rgba(168,26,26,0.15);padding:.35rem 1rem;border-radius:9999px;margin-bottom:1.5rem;background:rgba(168,26,26,0.02);display:inline-block;}
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
#why{padding:8rem 5% 6rem;background:var(--cream2);position:relative;overflow:hidden;}
.why-container{display:grid;grid-template-columns:1fr 1.2fr;gap:5rem;max-width:1200px;margin:0 auto;position:relative;z-index:2;}
.why-sticky-left{position:sticky;top:7.5rem;height:fit-content;display:flex;flex-direction:column;gap:2rem;}
.why-right-cards{display:flex;flex-direction:column;gap:1.5rem;}
.why-rule-card{background:var(--white);border:1px solid rgba(168,26,26,0.06);border-radius:24px;padding:2.2rem 2rem;display:flex;gap:1.5rem;transition:all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);position:relative;overflow:hidden;box-shadow:0 4px 20px rgba(31,17,11,0.01);}
.why-rule-card:hover{transform:translateX(8px);border-color:rgba(168,26,26,0.15);box-shadow:0 15px 40px rgba(168,26,26,0.06);}
.why-rule-card::after{content:'';position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--p);transform:scaleY(0);transition:transform 0.3s;}
.why-rule-card:hover::after{transform:scaleY(1);}
.wrc-num-circle{width:50px;height:50px;border-radius:50%;background:rgba(168,26,26,0.04);display:flex;align-items:center;justify-content:center;font-family:'DM Mono',monospace;font-weight:700;font-size:0.9rem;color:var(--p);flex-shrink:0;transition:all 0.3s;}
.why-rule-card:hover .wrc-num-circle{background:var(--p);color:#fff;transform:scale(1.05);}
.wrc-content{display:flex;flex-direction:column;gap:0.6rem;}
.wrc-spicy{font-family:'Archivo Black',sans-serif;font-size:1.15rem;color:var(--p);letter-spacing:-0.01em;line-height:1.1;text-transform:uppercase;}
.wrc-title{font-family:'Unbounded',sans-serif;font-size:0.95rem;font-weight:800;color:var(--ink);letter-spacing:-0.02em;}
.wrc-desc{font-family:'Outfit',sans-serif;font-size:0.85rem;color:var(--ink2);line-height:1.6;}
.why-stats-panel{display:grid;grid-template-columns:repeat(3, 1fr);gap:1rem;margin-top:2rem;background:var(--white);padding:2rem 1.5rem;border-radius:28px;border:1px solid rgba(168,26,26,0.06);box-shadow:0 10px 30px rgba(31,17,11,0.02);}
.stat-box{display:flex;flex-direction:column;align-items:center;text-align:center;}
.stat-value{font-family:'Unbounded',sans-serif;font-weight:900;font-size:2.2rem;color:var(--p);line-height:1;}
.stat-unit{font-size:0.9rem;color:var(--pl);font-weight:700;}
.stat-label{font-size:0.58rem;letter-spacing:0.08em;color:var(--ink2);text-transform:uppercase;margin-top:0.5rem;font-family:'DM Mono',monospace;}
.wtl-kicker{font-size:.6rem;letter-spacing:.2em;color:var(--p);text-transform:uppercase;margin-bottom:1.2rem;}
.wtl-h{font-family:'Archivo Black',sans-serif;font-size:clamp(2.4rem,4.8vw,5.5rem);line-height:0.9;letter-spacing:-.03em;color:var(--ink);}
.wtl-h .it{font-family:'Instrument Serif',serif;font-style:italic;color:var(--gd);}
.wtl-h .pp{color:var(--p);}
.wtr-quote{font-family:'Instrument Serif',serif;font-style:italic;font-size:1.35rem;line-height:1.5;color:var(--ink2);}
.wtr-sub{font-size:.78rem;color:rgba(22,20,15,.45);line-height:1.7;}

#process{padding:8rem 5% 7rem;background:var(--cream);position:relative;overflow:hidden;}
.proc-bg-txt{position:absolute;bottom:-2rem;right:-1rem;font-family:'Unbounded',sans-serif;font-weight:900;font-size:clamp(6rem,15vw,18rem);color:rgba(22,20,15,.03);letter-spacing:-.04em;pointer-events:none;line-height:1;z-index:0;}
.proc-container{max-width:1100px;margin:0 auto;position:relative;z-index:2;}
.proc-header{margin-bottom:5rem;}
.proc-kicker{font-size:.6rem;letter-spacing:.2em;color:var(--p);text-transform:uppercase;margin-bottom:1rem;}
.proc-h{font-family:'Unbounded',sans-serif;font-weight:900;font-size:clamp(2.5rem,5vw,5.5rem);letter-spacing:-.03em;line-height:.9;color:var(--ink);}
.proc-h span{color:var(--p);}
.proc-line-track{position:absolute;top:90px;left:80px;right:80px;height:4px;background:rgba(168,26,26,0.06);z-index:1;border-radius:2px;}
.proc-line-progress{position:absolute;top:0;left:0;height:100%;width:0%;background:linear-gradient(90deg, var(--p), var(--pl));box-shadow:0 0 12px var(--pl);transition:width 1.5s cubic-bezier(0.165, 0.84, 0.44, 1);}
.proc-grid{display:grid;grid-template-columns:repeat(4, 1fr);gap:2rem;position:relative;z-index:2;}
.proc-card{display:flex;flex-direction:column;align-items:center;text-align:center;position:relative;}
.proc-node-circle{width:76px;height:76px;border-radius:50%;background:var(--white);border:3px solid rgba(168,26,26,0.08);display:flex;align-items:center;justify-content:center;font-size:2.2rem;margin-bottom:2rem;transition:all 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275);box-shadow:0 8px 25px rgba(31,17,11,0.04);position:relative;z-index:3;}
.proc-card:hover .proc-node-circle{transform:scale(1.15) translateY(-5px);border-color:var(--p);box-shadow:0 15px 35px rgba(168,26,26,0.12);background:var(--cream2);}
.proc-step-num{font-family:'DM Mono',monospace;font-size:0.65rem;letter-spacing:0.15em;text-transform:uppercase;color:var(--p);margin-bottom:0.5rem;}
.proc-step-title{font-family:'Unbounded',sans-serif;font-size:0.85rem;font-weight:800;color:var(--ink);margin-bottom:0.75rem;line-height:1.3;}
.proc-step-desc{font-family:'Outfit',sans-serif;font-size:0.8rem;color:var(--ink2);line-height:1.55;padding:0 0.5rem;}
.proc-step-badge{display:inline-block;margin-top:1rem;font-family:'DM Mono',monospace;font-size:0.55rem;letter-spacing:0.08em;text-transform:uppercase;color:var(--pl);background:rgba(226,153,36,0.06);border:1px solid rgba(226,153,36,0.18);padding:0.25rem 0.75rem;border-radius:9999px;}
#cta{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--ink);position:relative;overflow:hidden;text-align:center;padding:4rem 3rem;}
.cta-bg-circle{position:absolute;width:70vw;height:70vw;max-width:800px;max-height:800px;border-radius:50%;border:1px solid rgba(255,255,255,.04);top:50%;left:50%;transform:translate(-50%,-50%);}
.cta-bg-circle:nth-child(2){width:50vw;height:50vw;border-color:rgba(226,153,36,.08);}
.cta-bg-circle:nth-child(3){width:30vw;height:30vw;border-color:rgba(168,26,26,.12);}
.cta-kicker{font-size:.62rem;letter-spacing:.25em;color:var(--pl);text-transform:uppercase;margin-bottom:1.5rem;position:relative;z-index:1;}
.cta-h{font-family:'Unbounded',sans-serif;font-weight:900;font-size:clamp(3rem,9vw,11rem);letter-spacing:-.04em;line-height:.85;color:#fff;position:relative;z-index:1;}
.cta-h .cg{color:var(--p);}
.cta-h .cp{color:var(--pl);}
.cta-quote{font-family:'Instrument Serif',serif;font-style:italic;font-size:1.2rem;color:rgba(255,255,255,.3);margin:2rem 0;max-width:600px;position:relative;z-index:1;line-height:1.6;}
.cta-btns{display:flex;gap:1rem;justify-content:center;position:relative;z-index:1;}
.btn-glow{background:var(--pl);color:var(--ink);border:none;padding:1.1rem 3.5rem;font-family:'Unbounded',sans-serif;font-size:.8rem;font-weight:700;letter-spacing:.05em;cursor:none;transition:all .25s;box-shadow:0 0 0 0 rgba(226,153,36,.4);animation:glowPulse 3s ease infinite;}
@keyframes glowPulse{0%,100%{box-shadow:0 0 0 0 rgba(226,153,36,.3)}50%{box-shadow:0 0 0 16px rgba(226,153,36,0)}}
.btn-glow:hover{background:#fff;transform:scale(1.05);}
.btn-ghost-white{background:transparent;border:1.5px solid rgba(255,255,255,.15);color:#fff;padding:1.1rem 2rem;font-family:'DM Mono',monospace;font-size:.68rem;letter-spacing:.1em;text-transform:uppercase;cursor:none;transition:all .2s;}
.btn-ghost-white:hover{border-color:var(--pl);color:var(--pl);}
.cta-meta{margin-top:2rem;font-size:.55rem;letter-spacing:.15em;color:rgba(255,255,255,.15);position:relative;z-index:1;}
footer{background:var(--ink);border-top:1px solid rgba(255,255,255,.05);padding:3.5rem 3rem 2rem;display:grid;grid-template-columns:2fr 1fr 1fr;gap:3rem;}
.fl{font-family:'Unbounded',sans-serif;font-weight:900;font-size:2rem;letter-spacing:-.03em;color:#fff;line-height:1;}
.fl em{color:var(--p);font-style:normal;}
.ft{margin-top:.8rem;font-size:.72rem;color:rgba(255,255,255,.3);line-height:1.65;max-width:240px;}
.fc-t{font-size:.55rem;letter-spacing:.2em;color:var(--pl);text-transform:uppercase;margin-bottom:1rem;}
.fc-l{list-style:none;display:flex;flex-direction:column;gap:.6rem;}
.fc-l a{font-size:.75rem;color:rgba(255,255,255,.3);text-decoration:none;transition:color .2s;}
.fc-l a:hover{color:var(--pl);}
.fb{padding:1.5rem 3rem;background:var(--ink);border-top:1px solid rgba(255,255,255,.04);display:flex;justify-content:space-between;}
.fb span{font-size:.55rem;letter-spacing:.08em;color:rgba(255,255,255,.15);}
.float-order{position:fixed;bottom:2rem;right:2rem;z-index:800;display:flex;align-items:center;gap:.9rem;background:var(--p);color:#fff;border:none;padding:1.1rem 2.2rem;font-family:'Unbounded',sans-serif;font-weight:900;font-size:1rem;letter-spacing:.01em;cursor:none;box-shadow:0 8px 36px rgba(168,26,26,.55),0 2px 8px rgba(0,0,0,.18);transition:background .25s,box-shadow .25s,transform .2s;animation:floatBob 3s ease-in-out infinite;outline:none;border-radius:60px;}
.float-order::after{content:'';position:absolute;inset:-4px;border:3px solid rgba(168,26,26,.5);border-radius:64px;animation:fRing 2.5s ease-out infinite;pointer-events:none;}
@keyframes fRing{0%{opacity:.8;transform:scale(1);}100%{opacity:0;transform:scale(1.14);}}
.float-order:hover{background:#801010;color:#fff;box-shadow:0 14px 44px rgba(168,26,26,.65);animation:none;transform:translateY(-3px) scale(1.04);}
.fo-icon{font-size:1.5rem;line-height:1;}
.fo-text{display:flex;flex-direction:column;gap:.2rem;}
.fo-main{font-size:1.05rem;font-weight:900;line-height:1;}
.fo-sub{font-family:'DM Mono',monospace;font-size:.65rem;font-weight:500;opacity:.9;letter-spacing:.08em;text-transform:uppercase;}
@keyframes floatBob{0%,100%{transform:translateY(0);}50%{transform:translateY(-6px);}}
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
  #hero{padding:7rem 1.2rem 3rem;justify-content:flex-start;min-height:auto;}
  .hero-wave{height:46vh;clip-path:ellipse(120% 70% at 50% 15%);}
  .hero-h1{font-size:clamp(2rem, 12vw, 3.8rem);line-height:1.0;margin-bottom:0;}
  .hero-main-prod-wrap{max-width:90%;margin:-25px auto 1.5rem;}
  .float-side-left, .float-side-right, .flying-spice{display:none;}
  .hero-desc-para{font-size:0.85rem;margin-bottom:1.5rem;}
  .hero-ctas{justify-content:center;width:100%;gap:0.8rem;}
  .btn-fill, .btn-line{width:100%;max-width:240px;text-align:center;padding:0.95rem 1.5rem;font-size:0.68rem;}
  .hero-bg-word{font-size:clamp(4rem,22vw,8rem);}
  .hero-scroll-hint{display:none;}
  .f-badge,.fb1,.fb2,.fb3{display:none;}
  .float-order{padding:.9rem 1.5rem;bottom:1rem;right:1rem;font-size:.9rem;}
  .fo-main{font-size:.9rem;}
  .fo-sub{font-size:.58rem;}
  .ti{font-size:.62rem;}
  .sf-heading{font-size:clamp(1.8rem,9vw,3.5rem);}
  .sf-spicy{font-size:clamp(2rem,9vw,4rem);}
  .sf-sub{font-size:.75rem;padding:0 1rem;}
  #why{padding:4rem 1.2rem;}
  .why-container{grid-template-columns:1fr;gap:3rem;}
  .why-sticky-left{position:relative;top:0;}
  .why-stats-panel{grid-template-columns:repeat(3, 1fr);padding:1.5rem 1rem;}
  .stat-value{font-size:1.6rem;}
  .stat-unit{font-size:0.75rem;}
  .stat-label{font-size:0.5rem;}
  .why-rule-card{padding:1.5rem;gap:1rem;flex-direction:column;}
  .wrc-num-circle{width:40px;height:40px;font-size:0.8rem;}
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
      cur.style.top = my - 5 + 'px'
    }
    document.addEventListener('mousemove', onMove)
    let raf: number
    const animRing = () => {
      rx += (mx - rx) * 0.12; ry += (my - ry) * 0.12
      ring.style.left = rx - 16 + 'px'; ring.style.top = ry - 16 + 'px'
      raf = requestAnimationFrame(animRing)
    }
    animRing()
    document.querySelectorAll<HTMLElement>('button,a,.why-rule-card,.proc-card,.float-order').forEach(el => {
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

    // Process progress line animation
    const procEl = document.getElementById('process')
    const progressLine = document.getElementById('procProgress')
    if (procEl && progressLine) {
      new IntersectionObserver(en => {
        en.forEach(e => {
          if (e.isIntersecting) {
            progressLine.style.width = '100%'
          }
        })
      }, { threshold: 0.3 }).observe(procEl)
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
    document.querySelectorAll<HTMLElement>('.why-rule-card,.proc-card').forEach(c => {
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
          <span className="fo-sub">Delivery in 60 min</span>
        </span>
      </button>

      <div className="dnav" id="dnav">
        {[0, 1, 2, 3, 4].map(i => <div key={i} className={`dn${i === 0 ? ' on' : ''}`} onClick={() => { const ids = ['hero', 'scroll-story', 'why', 'process', 'menu']; document.getElementById(ids[i])?.scrollIntoView({ behavior: 'smooth' }) }} />)}
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
        <div className="hero-wave" />

        {/* Side Floating Plates (cut off at screen edges) */}
        <div className="float-side-left">
          <img src="/assets/raw_chicken_cuts.png" alt="Fresh Raw Cuts Plate" />
        </div>
        <div className="float-side-right">
          <img src="/assets/raw_chicken_breast.png" alt="Fresh Raw Breast Board" />
        </div>

        {/* Flying Spices and Herbs */}
        <div className="flying-spice fs-1">🌿</div>
        <div className="flying-spice fs-2">🌶️</div>
        <div className="flying-spice fs-3">🧄</div>
        <div className="flying-spice fs-4">🌿</div>
        <div className="flying-spice fs-5">🌶️</div>

        <h1 className="sr-only">Fresh Chicken Delivery in Bengaluru — Cut After Your Order | B&apos;LURU Fresh. Order fresh curry cut, boneless, drumstick &amp; wings chicken online in Yelahanka, Bangalore. Zero preservatives, delivered in 60 minutes.</h1>
        <div className="hero-bg-word">FRESH</div>

        <div className="hero-content-wrap">
          <div className="hs-pill">🐔 Bengaluru&apos;s first ultra-fresh system</div>

          <div className="hero-h1 rv d2">
            THE END OF<br />
            <span className="line-light">OLD STOCK</span> CHICKEN.
          </div>

          {/* Large Floating Central Product Image */}
          <div className="hero-main-prod-wrap rv d3">
            <img src="/assets/raw_chicken_hero.png" className="hero-main-prod-img" alt="Fresh Raw Chicken Cuts Platter" />

            {/* Side Floating Badges */}
            <div className="float-badge fb-left-pkg">
              <img src="/assets/packaged_chicken_new.jpg" alt="Vacuum pack" />
              <span>Packaged Fresh</span>
            </div>
            <div className="float-badge fb-right-fresh">
              <span className="fb-dot" />
              <span>Cut After Order</span>
            </div>
          </div>

          {/* Description & CTAs */}
          <div className="hero-bottom-content rv d4">
            <p className="hero-desc-para">
              From Now — <strong>Not frozen. Not stored overnight.</strong> Cut only after you order. Delivered in 60 minutes.
            </p>
            <div className="hero-ctas">
              <button className="btn-fill" onClick={goOrder}><span>Order Now ⚡</span></button>
              <button className="btn-line" onClick={goStory}>Watch ↓</button>
            </div>
          </div>
        </div>
      </section>

      <div className="ticker">
        <div className="ticker-track">
          {['NO FOUL SMELL', 'CUT AFTER ORDER', '60 MIN DELIVERY', 'ZERO PRESERVATIVES', "BENGALURU'S FIRST", 'ULTRA-FRESH SYSTEM', 'NO FOUL SMELL', 'CUT AFTER ORDER', '60 MIN DELIVERY', 'ZERO PRESERVATIVES', "BENGALURU'S FIRST", 'ULTRA-FRESH SYSTEM'].map((t, i) => (
            <div key={i} className="ti">{t}<span className="ti-sep">✦</span></div>
          ))}
        </div>
      </div>

      <div id="scroll-story">
        {/* Floating Side Plates */}
        <div className="story-float-left">
          <img src="/assets/raw_chicken_curry.png" alt="Fresh Raw Curry Cuts Board" />
        </div>
        <div className="story-float-right">
          <img src="/assets/raw_drumsticks_plate.png" alt="Fresh Raw Drumsticks Plate" />
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
              <img src="/assets/raw_drumsticks_plate.png" alt="Fresh Raw Drumsticks Plate" />
              <span className="card-spice cs-1">🌶️</span>
              <span className="card-spice cs-2">🌿</span>
            </div>
            <div className="sf-label">01 — The Revolution</div>
            <h3 className="sf-heading">INTRODUCING<br /><span className="hl">BENGALURU&apos;S</span><br />FIRST <span className="hp">ULTRA-FRESH</span> SYSTEM</h3>
            <p className="sf-sub">Bengaluru has never seen anything like this. <strong>Not frozen. Not stored.</strong> Freshly prepared for every single order.</p>
          </div>

          {/* Card 2: Truth */}
          <div className="story-card rv d2">
            <div className="card-bg-panel" />
            <div className="sf-label">02 — The Truth</div>
            <h3 className="sf-spicy">ZERO SH*T<br />IN OUR SYSTEM.</h3>
            <p className="sf-sub">We cut <strong>only after you order.</strong> Not in the morning. Not the night before. Your order triggers the knife.</p>
          </div>

          {/* Card 3: Speed */}
          <div className="story-card rv d3">
            <div className="card-bg-panel" />
            <div className="sf-label">03 — The Speed</div>
            <h3 className="sf-heading">FROM <span className="hl">KNIFE</span> TO YOUR <span className="hp">KITCHEN.</span></h3>
            <p className="sf-sub">Processing → Hygienic Packing → Delivery. In under <strong>60 minutes.</strong></p>
          </div>

          {/* Card 5: Order (Wide, spans 2 columns) */}
          <div className="story-card sc-wide rv d1">
            <div className="card-bg-panel" />
            <div>
              <div className="sf-label">05 — Taste The Difference</div>
              <h3 className="sf-spicy">TASTE THE <span style={{ color: 'var(--pl)' }}>DIFFERENCE.</span></h3>
              <p className="sf-sub">The freshest chicken Bengaluru has ever tasted. One order. You&apos;ll understand everything.</p>
            </div>
            <div style={{ marginTop: '2rem' }}>
              <button className="btn-glow" onClick={goOrder}>Order Fresh Now ⚡</button>
            </div>
          </div>

          {/* Card 4: Standard */}
          <div className="story-card rv d2">
            <div className="card-bg-panel" />
            <div className="card-bg-img img-left">
              <img src="/assets/raw_chicken_curry.png" alt="Fresh Raw Curry Cuts Board" />
              <span className="card-spice cs-1">🌿</span>
              <span className="card-spice cs-2">🧄</span>
            </div>
            <div className="sf-label">04 — The Standard</div>
            <h3 className="sf-heading">THE OLD<br />WAY IS <span className="hl">DEAD.</span></h3>
            <p className="sf-sub">Bengaluru&apos;s first ultra-fresh chicken delivery experience. Not improved. <strong>Rebuilt from scratch.</strong></p>
          </div>
        </div>
      </div>

      <section id="why">
        <div className="why-container">
          <div className="why-sticky-left">
            <div className="wtl-kicker rv">— The Revolution</div>
            <h2 className="wtl-h rv d1">
              INTRODUCING<br />
              <span className="it">Bengaluru&apos;s</span><br />
              <span className="pp">FIRST</span><br />
              ULTRA-FRESH<br />
              SYSTEM
            </h2>
            <div className="wtr-quote rv d2">&quot;The freshest chicken Bengaluru has ever tasted.&quot;</div>
            <div className="wtr-sub rv d2">We didn&apos;t just build a delivery app. We built an entirely new supply chain that removes cold storage from the equation completely. What you get is what nature intended — pure, same-day protein.</div>

            {/* Sticky Stats Panel */}
            <div className="why-stats-panel rv d3">
              {[{ count: 1, unit: 'hr', label: 'Cut to door' }, { count: 0, unit: '%', label: 'Preservatives' }, { count: 100, unit: '%', label: 'Cut-to-order' }].map(s => (
                <div key={s.label} className="stat-box">
                  <div className="stat-value">
                    <span className="count-num" data-count={s.count}>0</span>
                    <span className="stat-unit">{s.unit}</span>
                  </div>
                  <div className="stat-label">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="why-right-cards">
            {[
              { num: '01', icon: '🚫', spicy: 'ZERO SH*T.', title: 'No Foul Smell. No Sliminess. Ever.', desc: "That disgusting smell while unpacking? That's stored meat decomposing. We cut only after your order. That smell has never existed in our system — and never will." },
              { num: '02', icon: '⚡', spicy: 'IN 60 MIN. NOT DAYS.', title: 'From Our Kitchen To Your Door', desc: "Not 'we'll try.' Not 'approximately.' Under 60 minutes. Your masala will still be sizzling when the delivery rider rings." },
              { num: '03', icon: '🔬', spicy: 'NOT VIBES. VERIFIED.', title: 'Zero Additives. FSSAI Licensed.', desc: 'FSSAI Lic. 11226331000344. No additives. No chemicals. No preservatives. We have the receipts — you never have to take our word for it.' },
              { num: '04', icon: '🎯', spicy: 'YOUR ORDER = THE KNIFE.', title: 'Cut-To-Order. Every Single Time.', desc: "No pre-cut pieces sitting around. The moment you place your order — that's when the cutting begins. Not before. Not after." },
              { num: '05', icon: '🏆', spicy: 'THE OLD WAY IS DEAD.', title: "Bengaluru's First Ultra-Fresh System", desc: "We didn't upgrade the old system. We removed it entirely and built something this city has never seen before. This is what fresh actually means." },
            ].map((c, idx) => (
              <div key={c.num} className="why-rule-card rv" style={{ transitionDelay: `${idx * 0.1}s` }}>
                <div className="wrc-num-circle">{c.num}</div>
                <div className="wrc-content">
                  <span style={{ fontSize: '1.5rem', marginBottom: '0.2rem', display: 'block' }}>{c.icon}</span>
                  <div className="wrc-spicy">{c.spicy}</div>
                  <div className="wrc-title">{c.title}</div>
                  <p className="wrc-desc">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="process">
        <div className="proc-bg-txt">PROCESS</div>
        <div className="proc-container">
          <div className="proc-header">
            <div className="proc-kicker rv">— How It Actually Works</div>
            <h2 className="proc-h rv d1">HOW IT<br /><span>WORKS.</span></h2>
          </div>

          <div className="proc-line-track">
            <div className="proc-line-progress" id="procProgress" />
          </div>

          <div className="proc-grid">
            {[
              { icon: '📲', title: 'Order Placed', desc: 'Tap. Done. Your order hits our system instantly. The clock starts the moment you confirm.', tag: 'Trigger Point' },
              { icon: '🔪', title: 'We Cut', desc: 'Only after your order does the cutting begin. Not this morning. Your order triggers the knife.', tag: 'Zero Pre-Cuts' },
              { icon: '📦', title: 'Packed Fresh', desc: 'Cut fresh, packed under sterile conditions, vacuum-sealed. Straight to you.', tag: 'Sterile Sealed' },
              { icon: '🏍️', title: 'Delivered', desc: 'At your door in under 60 minutes, guaranteed. No smell. No slime. Just clean, fresh chicken.', tag: 'Under 60 Mins' },
            ].map((s, i) => (
              <div key={i} className="proc-card rv" style={{ transitionDelay: `${i * 0.15}s` }}>
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
        <div className="cta-bg-circle" /><div className="cta-bg-circle" /><div className="cta-bg-circle" />
        <div className="cta-kicker rv">— Done With Dead-Stock Chicken?</div>
        <h2 className="cta-h rv d1">ORDER<br /><span className="cg">FRESH.</span><br /><span className="cp">NOW.</span></h2>
        <div className="cta-quote rv d2">&quot;The Freshest Chicken Bengaluru Has Ever Tasted.&quot;<br />Taste it once. You&apos;ll understand everything.</div>
        <div className="cta-btns rv d3">
          <button className="btn-glow" onClick={goOrder}>Order Now ⚡</button>
          <button className="btn-ghost-white" onClick={() => window.location.href = 'tel:+917012488951'}>📞 +91 70124 88951</button>
        </div>
        <div className="cta-meta rv d4">YELAHANKA · BANGALORE · DELIVERY IN 60 MIN · FSSAI LIC. 11226331000344</div>
      </section>

      {/* FAQ section — visible to Google AI for AI Overview, minimal styling for users */}
      <section style={{ background: 'var(--cream2)', padding: '4rem 3rem', borderTop: '1px solid rgba(22,20,15,.07)' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <p style={{ fontFamily: "'DM Mono',monospace", fontSize: '.58rem', letterSpacing: '.2em', color: 'var(--p)', textTransform: 'uppercase', marginBottom: '1.5rem' }}>Frequently Asked Questions</p>
          <h2 style={{ fontFamily: "'Archivo Black',sans-serif", fontSize: 'clamp(1.6rem,3vw,2.4rem)', letterSpacing: '-.02em', color: 'var(--ink)', marginBottom: '2.5rem', lineHeight: 1.1 }}>
            Everything about fresh chicken<br />in Bengaluru
          </h2>
          {[
            { q: 'Where can I get fresh chicken in Bengaluru?', a: "B'LURU Fresh delivers farm-fresh chicken across Bengaluru — especially Yelahanka and nearby areas. We cut the chicken only after you place your order. Zero stored meat. Order at blurufresh.com and receive delivery within 60 minutes." },
            { q: 'What makes B\'LURU Fresh different from other chicken delivery in Bangalore?', a: "We follow a strict cut-to-order policy. We never pre-cut chicken and store it. Your order literally triggers the cutting process — meaning no foul smell, no sliminess, no stored meat. FSSAI licensed (11226331000344). Zero preservatives." },
            { q: 'How quickly does B\'LURU Fresh deliver in Bangalore?', a: 'We deliver fresh chicken within 60 minutes of placing your order. Cut → packed under sterile conditions → dispatched immediately. The entire process happens in under 60 minutes.' },
            { q: 'Does B\'LURU Fresh deliver to Yelahanka?', a: "Yes — we are based in Yelahanka, Bengaluru (Thirumenahalli Main Road, Agrahara Layout, 560064) and deliver across Yelahanka and surrounding Bangalore areas." },
            { q: 'Is B\'LURU Fresh FSSAI certified?', a: 'Yes. FSSAI License: 11226331000344. Zero preservatives, zero additives. Fully compliant with food safety standards in Karnataka.' },
          ].map(({ q, a }, i) => (
            <details key={i} style={{ borderBottom: '1px solid rgba(22,20,15,.08)', paddingBottom: '1.2rem', marginBottom: '1.2rem' }}>
              <summary style={{ fontFamily: "'Archivo Black',sans-serif", fontSize: '.95rem', color: 'var(--ink)', cursor: 'pointer', paddingTop: '.2rem', letterSpacing: '-.01em' }}>{q}</summary>
              <p style={{ fontFamily: "'DM Mono',monospace", fontSize: '.78rem', color: 'rgba(22,20,15,.55)', lineHeight: 1.75, marginTop: '.8rem', paddingLeft: '1rem' }}>{a}</p>
            </details>
          ))}
        </div>
      </section>

      <footer>
        <div>
          <div className="fl">B&apos;<em>LURU</em><br />FRESH</div>
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
        <a href="https://maps.app.goo.gl/5RjKDAgEM7vcD5aq6" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.55rem', opacity: 0.3, color: 'inherit', textDecoration: 'none' }}>📍 maps</a>
      </div>
    </>
  )
}
