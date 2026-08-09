"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Banknote,
  CalendarClock,
  CheckCircle2,
  Clock3,
  CreditCard,
  Loader2,
  MapPin,
  PackageCheck,
  Phone,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Star,
  Truck,
  XCircle,
} from "lucide-react";
import type { AuthUser } from "@/lib/auth-types";
import type { OrderRow } from "@/lib/supabase-browser";

type Tab = "current" | "history";

const PAGE_SIZE = 20;
const AUTO_PACKING_AFTER_MS = 25 * 60 * 1000;

const css = `
:root{
  --oh-green:#8EEA2F;
  --oh-purple:#5f079b;
  --oh-start:#60079d;
  --oh-end:#7308b0;
  --oh-icon:#fcc13e;
  --oh-cream:#FAF7F0;
  --oh-cream2:#FAF5EB;
  --oh-ink:#1F110B;
  --oh-muted:#6B5A52;
}
.oh-page{min-height:100dvh;background:var(--oh-cream);color:var(--oh-ink);font-family:var(--font-space-grotesk), sans-serif;overflow-x:hidden;}
.oh-hero{position:relative;overflow:hidden;padding:1.6rem clamp(1rem,4vw,3rem) 2.4rem;background:radial-gradient(circle at 50% 20%,rgba(206,246,33,.12),transparent 30%),linear-gradient(180deg,var(--oh-start),var(--oh-end));}
.oh-hero::before{content:'';position:absolute;inset:0;background:linear-gradient(90deg,rgba(31,0,55,.28),transparent 28%,transparent 72%,rgba(31,0,55,.26));pointer-events:none;}
.oh-nav{position:relative;z-index:2;max-width:1180px;margin:0 auto 2rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:1rem 1.4rem;background:rgba(250,247,240,.94);border:1px solid rgba(95,7,155,.16);border-radius:999px;box-shadow:0 18px 46px -18px rgba(95,7,155,.42),inset 0 1px 0 rgba(255,255,255,.72);}
.oh-brand{font-family:'Fraunces', serif;font-weight:900;font-size:.95rem;letter-spacing:-.02em;color:var(--oh-ink);white-space:nowrap;}
.oh-brand em{font-style:normal;color:var(--oh-purple);}
.oh-back{display:inline-flex;align-items:center;gap:.45rem;border:0;background:linear-gradient(135deg,var(--oh-start),var(--oh-purple),var(--oh-end));color:#fff;border-radius:999px;padding:.78rem 1.2rem;font-family:var(--font-space-grotesk), sans-serif;font-size:.68rem;font-weight:800;text-transform:uppercase;letter-spacing:.06em;box-shadow:0 14px 32px rgba(95,7,155,.42);}
.oh-hero-inner{position:relative;z-index:1;max-width:1180px;margin:0 auto;display:grid;grid-template-columns:1.2fr .8fr;gap:2rem;align-items:end;}
.oh-kicker{display:inline-flex;align-items:center;gap:.5rem;width:fit-content;margin-bottom:1rem;padding:.42rem 1rem;border:1px solid rgba(255,255,255,.22);border-radius:999px;background:rgba(255,255,255,.12);color:#fff;font-size:.62rem;letter-spacing:.18em;text-transform:uppercase;}
.oh-kicker::before{content:'';width:7px;height:7px;border-radius:50%;background:var(--oh-green);box-shadow:0 0 12px rgba(206,246,33,.72);}
.oh-title{font-family:'Fraunces', serif;font-weight:800;font-size:clamp(3rem,7vw,6.6rem);line-height:.9;letter-spacing:-.045em;text-transform:none;color:#fff;text-shadow:0 8px 30px rgba(25,0,48,.28);}
.oh-title span{color:var(--oh-green);}
.oh-sub{max-width:54ch;margin-top:1rem;color:rgba(255,255,255,.82);font-size:.9rem;line-height:1.75;}
.oh-user-card{justify-self:end;width:min(100%,380px);padding:1.2rem;border-radius:28px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);box-shadow:0 26px 60px rgba(23,0,44,.24);backdrop-filter:blur(14px);}
.oh-user-label{font-size:.58rem;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.54);margin-bottom:.55rem;}
.oh-user-name{font-family:var(--font-space-grotesk), sans-serif;font-size:1rem;font-weight:900;color:#fff;line-height:1.2;}
.oh-user-phone{display:flex;align-items:center;gap:.45rem;margin-top:.7rem;color:rgba(255,255,255,.72);font-size:.78rem;}
.oh-tabs-shell{position:sticky;top:0;z-index:50;background:linear-gradient(180deg,var(--oh-cream) 0%,rgba(250,247,240,.92) 100%);backdrop-filter:blur(14px);border-bottom:1px solid rgba(95,7,155,.08);}
.oh-tabs{max-width:1180px;margin:0 auto;padding:1rem clamp(1rem,4vw,3rem);display:grid;grid-template-columns:1fr 1fr;gap:.75rem;}
.oh-tab{position:relative;min-height:58px;border:1.5px solid rgba(95,7,155,.16);border-radius:18px;background:#fff;color:var(--oh-purple);font-family:var(--font-space-grotesk), sans-serif;font-size:.82rem;font-weight:900;letter-spacing:.02em;display:flex;align-items:center;justify-content:center;gap:.65rem;box-shadow:0 8px 28px rgba(31,17,11,.04);transition:transform .22s ease,box-shadow .22s ease,background .22s ease,color .22s ease;}
.oh-tab:hover{transform:translateY(-1px);box-shadow:0 14px 36px rgba(95,7,155,.12);}
.oh-tab.active{background:linear-gradient(135deg,var(--oh-start),var(--oh-purple),var(--oh-end));color:#fff;border-color:rgba(206,246,33,.28);box-shadow:0 18px 44px rgba(95,7,155,.34),0 0 0 6px rgba(206,246,33,.1);}
.oh-main{max-width:1180px;margin:0 auto;padding:2rem clamp(1rem,4vw,3rem) 5rem;}
.oh-toolbar{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:1.4rem;}
.oh-section-title{font-family:'Fraunces', serif;font-weight:800;font-size:clamp(1.35rem,2.4vw,2rem);font-weight:900;letter-spacing:-.03em;color:var(--oh-ink);}
.oh-count{color:var(--oh-purple);font-size:.62rem;letter-spacing:.16em;text-transform:uppercase;margin-top:.35rem;}
.oh-refresh{display:inline-flex;align-items:center;gap:.55rem;border:1.5px solid rgba(95,7,155,.16);border-radius:999px;background:#fff;color:var(--oh-purple);padding:.8rem 1rem;font-family:var(--font-space-grotesk), sans-serif;font-size:.65rem;font-weight:900;text-transform:uppercase;box-shadow:0 8px 22px rgba(31,17,11,.04);}
.oh-refresh:disabled{opacity:.55;}
.oh-live-panel{margin:-.25rem 0 1.25rem;padding:1rem;border-radius:28px;background:linear-gradient(135deg,rgba(95,7,155,.08),rgba(206,246,33,.16),#fff);border:1px solid rgba(95,7,155,.12);box-shadow:0 16px 44px rgba(31,17,11,.06);}
.oh-live-panel-head{display:flex;align-items:flex-end;justify-content:space-between;gap:1rem;margin-bottom:.9rem;padding:0 .1rem;}
.oh-live-eyebrow{font-size:.58rem;letter-spacing:.18em;text-transform:uppercase;color:var(--oh-purple);font-weight:900;}
.oh-live-title{font-family:'Fraunces', serif;font-weight:900;font-size:clamp(1.2rem,2vw,1.75rem);line-height:1;color:var(--oh-ink);margin-top:.25rem;}
.oh-live-sub{max-width:42ch;color:rgba(31,17,11,.56);font-size:.76rem;line-height:1.5;text-align:right;}
.oh-live-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.9rem;}
.oh-live-card{min-width:0;border-radius:24px;background:rgba(255,255,255,.92);border:1px solid rgba(95,7,155,.1);box-shadow:0 10px 30px rgba(95,7,155,.08);padding:1rem;}
.oh-live-card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;margin-bottom:.2rem;}
.oh-live-id{font-size:.55rem;letter-spacing:.16em;text-transform:uppercase;color:rgba(31,17,11,.38);font-weight:900;}
.oh-live-items{margin-top:.25rem;font-size:.82rem;font-weight:900;color:var(--oh-ink);line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.oh-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1.1rem;}
.oh-card{position:relative;overflow:hidden;border-radius:26px;background:#fff;border:1px solid rgba(95,7,155,.1);box-shadow:0 14px 40px rgba(31,17,11,.06);transition:transform .22s ease,box-shadow .22s ease,border-color .22s ease;}
.oh-card:hover{transform:translateY(-3px);border-color:rgba(95,7,155,.2);box-shadow:0 24px 54px rgba(95,7,155,.12);}
.oh-card-top{height:4px;background:linear-gradient(90deg,var(--oh-green),var(--oh-purple));}
.oh-card-body{padding:1.2rem;}
.oh-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;margin-bottom:1rem;}
.oh-id{font-size:.58rem;letter-spacing:.18em;text-transform:uppercase;color:rgba(31,17,11,.38);margin-bottom:.35rem;}
.oh-date{display:flex;align-items:center;gap:.45rem;color:var(--oh-muted);font-size:.74rem;}
.oh-status{display:inline-flex;align-items:center;gap:.38rem;border-radius:999px;padding:.38rem .68rem;font-family:var(--font-space-grotesk), sans-serif;font-size:.58rem;font-weight:900;text-transform:uppercase;letter-spacing:.05em;white-space:nowrap;}
.oh-status.placed{background:rgba(252,193,62,.18);color:#8a4c00;border:1px solid rgba(252,193,62,.34);}
.oh-status.packed{background:rgba(206,246,33,.18);color:#465a00;border:1px solid rgba(206,246,33,.4);}
.oh-status.on_the_way{background:rgba(95,7,155,.09);color:var(--oh-purple);border:1px solid rgba(95,7,155,.18);}
.oh-status.delivered{background:rgba(16,185,129,.1);color:#047857;border:1px solid rgba(16,185,129,.22);}
.oh-status.cancelled{background:rgba(239,68,68,.1);color:#b91c1c;border:1px solid rgba(239,68,68,.2);}
.oh-tracker{position:relative;margin:1rem 0;padding:1rem;border-radius:22px;background:linear-gradient(135deg,#fffdf7,rgba(206,246,33,.12));border:1px solid rgba(95,7,155,.1);box-shadow:inset 0 1px 0 rgba(255,255,255,.8);}
.oh-tracker-head{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;margin-bottom:1rem;}
.oh-tracker-label{font-size:.56rem;letter-spacing:.16em;text-transform:uppercase;color:rgba(31,17,11,.4);font-weight:900;}
.oh-tracker-now{margin-top:.25rem;font-size:.95rem;font-weight:900;color:var(--oh-ink);line-height:1.2;}
.oh-tracker-note{font-size:.7rem;color:rgba(31,17,11,.58);line-height:1.5;text-align:right;max-width:24ch;}
.oh-track{position:relative;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.5rem;}
.oh-track::before{content:'';position:absolute;left:10%;right:10%;top:22px;height:3px;border-radius:999px;background:rgba(95,7,155,.1);}
.oh-track-fill{position:absolute;left:10%;top:22px;height:3px;border-radius:999px;background:linear-gradient(90deg,var(--oh-green),var(--oh-purple));transition:width .35s ease;}
.oh-track-step{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:.45rem;text-align:center;min-width:0;}
.oh-track-dot{width:46px;height:46px;border-radius:16px;display:flex;align-items:center;justify-content:center;background:#fff;border:1.5px solid rgba(95,7,155,.14);color:rgba(31,17,11,.32);box-shadow:0 6px 18px rgba(31,17,11,.04);transition:transform .25s ease,background .25s ease,color .25s ease,box-shadow .25s ease;}
.oh-track-step.done .oh-track-dot{background:linear-gradient(135deg,var(--oh-green),#b6ff4d);color:#213900;border-color:rgba(206,246,33,.75);}
.oh-track-step.active .oh-track-dot{background:linear-gradient(135deg,var(--oh-start),var(--oh-purple));color:#fff;border-color:rgba(95,7,155,.35);box-shadow:0 0 0 6px rgba(95,7,155,.1),0 12px 26px rgba(95,7,155,.24);transform:translateY(-2px);}
.oh-track-text{font-size:.58rem;font-weight:900;line-height:1.1;text-transform:uppercase;letter-spacing:.03em;color:rgba(31,17,11,.42);}
.oh-track-step.done .oh-track-text{color:#506600;}
.oh-track-step.active .oh-track-text{color:var(--oh-purple);}
.oh-cancel-track{margin:1rem 0;padding:.9rem 1rem;border-radius:18px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.18);color:#991b1b;font-weight:900;font-size:.85rem;}
.oh-items{display:flex;flex-direction:column;gap:.7rem;margin:1rem 0;}
.oh-item{display:grid;grid-template-columns:1fr auto;gap:.75rem;align-items:start;padding:.8rem;border-radius:18px;background:var(--oh-cream2);border:1px solid rgba(31,17,11,.05);}
.oh-item-name{font-weight:900;color:var(--oh-ink);font-size:.86rem;line-height:1.25;}
.oh-item-meta{font-size:.72rem;color:rgba(31,17,11,.52);margin-top:.2rem;}
.oh-item-price{font-family:'Fraunces', serif;font-weight:800;font-weight:900;color:var(--oh-purple);font-size:.88rem;}
.oh-meta-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.7rem;margin-top:1rem;}
.oh-meta{min-width:0;padding:.8rem;border-radius:18px;background:#fff;border:1px solid rgba(95,7,155,.09);box-shadow:0 6px 18px rgba(31,17,11,.03);}
.oh-meta-label{display:flex;align-items:center;gap:.35rem;font-size:.56rem;letter-spacing:.14em;text-transform:uppercase;color:rgba(31,17,11,.38);margin-bottom:.35rem;}
.oh-meta-value{font-weight:900;color:var(--oh-ink);font-size:.82rem;line-height:1.35;word-break:break-word;}
.oh-address{margin-top:.7rem;padding:.9rem;border-radius:20px;background:linear-gradient(135deg,rgba(95,7,155,.05),rgba(206,246,33,.09));border:1px solid rgba(95,7,155,.1);}
.oh-total-row{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-top:1rem;padding-top:1rem;border-top:1px dashed rgba(31,17,11,.14);}
.oh-total-label{font-size:.62rem;letter-spacing:.16em;text-transform:uppercase;color:rgba(31,17,11,.42);}
.oh-total{font-family:'Fraunces', serif;font-weight:800;font-size:1.55rem;font-weight:900;color:var(--oh-green);text-shadow:0 0 18px rgba(206,246,33,.18);}
.oh-review{margin-top:1rem;padding:1rem;border-radius:20px;background:#fffdf7;border:1px solid rgba(252,193,62,.34);}
.oh-review-head{display:flex;align-items:flex-start;justify-content:space-between;gap:.75rem;margin-bottom:.75rem;}
.oh-review-title{font-size:.65rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:#7c4600;}
.oh-review-state{font-size:.62rem;font-weight:800;color:#64748b;}
.oh-stars{display:flex;align-items:center;gap:.3rem;}
.oh-star{width:36px;height:36px;display:flex;align-items:center;justify-content:center;border:1px solid rgba(252,193,62,.34);border-radius:11px;background:#fff;color:#d1d5db;cursor:pointer;transition:transform .15s ease,color .15s ease,background .15s ease,border-color .15s ease;}
.oh-star:hover{transform:translateY(-1px);}
.oh-star.active{color:#f59e0b;background:#fff7db;border-color:#f6c453;}
.oh-review-text{width:100%;min-height:88px;margin-top:.75rem;padding:.75rem .85rem;resize:vertical;border:1px solid rgba(31,17,11,.14);border-radius:14px;background:#fff;color:var(--oh-ink);font:600 .78rem/1.5 var(--font-space-grotesk),sans-serif;outline:none;}
.oh-review-text:focus{border-color:#d78a00;box-shadow:0 0 0 3px rgba(245,158,11,.1);}
.oh-review-footer{display:flex;align-items:center;justify-content:space-between;gap:.75rem;margin-top:.7rem;}
.oh-review-message{font-size:.68rem;font-weight:700;color:#047857;}
.oh-review-message.error{color:#b91c1c;}
.oh-review-save{display:inline-flex;align-items:center;justify-content:center;gap:.4rem;min-width:112px;border:0;border-radius:12px;padding:.7rem .9rem;background:#1f110b;color:#fff;font:900 .68rem var(--font-space-grotesk),sans-serif;text-transform:uppercase;letter-spacing:.04em;cursor:pointer;}
.oh-review-save:disabled{opacity:.48;cursor:not-allowed;}
.oh-empty,.oh-loading{min-height:360px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:1rem;border-radius:30px;background:#fff;border:1px solid rgba(95,7,155,.1);box-shadow:0 14px 40px rgba(31,17,11,.05);}
.oh-empty-icon,.oh-loading-icon{width:70px;height:70px;border-radius:24px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,rgba(95,7,155,.1),rgba(206,246,33,.16));color:var(--oh-purple);}
.oh-empty h2{font-family:var(--font-space-grotesk), sans-serif;font-size:1.15rem;font-weight:900;color:var(--oh-ink);}
.oh-empty p{max-width:40ch;color:rgba(31,17,11,.56);font-size:.86rem;line-height:1.6;}
.oh-load-more{margin:1.4rem auto 0;display:flex;align-items:center;justify-content:center;gap:.55rem;border:0;border-radius:999px;background:linear-gradient(135deg,var(--oh-start),var(--oh-purple),var(--oh-end));color:#fff;padding:.95rem 1.4rem;font-family:var(--font-space-grotesk), sans-serif;font-size:.72rem;font-weight:900;text-transform:uppercase;box-shadow:0 14px 36px rgba(95,7,155,.28);}
.oh-fade{animation:ohFade .24s ease both;}
@keyframes ohFade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@media(max-width:860px){
  .oh-hero-inner{grid-template-columns:1fr;gap:1.4rem;}
  .oh-user-card{justify-self:start;width:100%;}
  .oh-grid{grid-template-columns:1fr;}
}
@media(max-width:560px){
  .oh-hero{padding:1rem .85rem 1.8rem;}
  .oh-nav{border-radius:24px;padding:.85rem 1rem;margin-bottom:1.6rem;}
  .oh-back span{display:none;}
  .oh-back{width:42px;height:42px;padding:0;justify-content:center;}
  .oh-title{font-size:clamp(2.6rem,14vw,4rem);}
  .oh-sub{font-size:.78rem;}
  .oh-tabs{padding:.8rem .85rem;gap:.5rem;}
  .oh-tab{min-height:52px;border-radius:16px;font-size:.68rem;gap:.4rem;}
  .oh-main{padding:1.2rem .85rem 4rem;}
  .oh-toolbar{align-items:flex-start;}
  .oh-refresh span{display:none;}
  .oh-refresh{width:44px;height:44px;padding:0;justify-content:center;}
  .oh-live-panel{padding:.85rem;border-radius:24px;}
  .oh-live-panel-head{align-items:flex-start;flex-direction:column;gap:.5rem;}
  .oh-live-sub{text-align:left;}
  .oh-live-list{grid-template-columns:1fr;}
  .oh-live-card{padding:.85rem;}
  .oh-card-body{padding:1rem;}
  .oh-card-head{flex-direction:column;gap:.7rem;}
  .oh-status{align-self:flex-start;}
  .oh-tracker{padding:.85rem;}
  .oh-tracker-head{flex-direction:column;margin-bottom:.85rem;}
  .oh-tracker-note{text-align:left;max-width:none;}
  .oh-track{gap:.25rem;}
  .oh-track-dot{width:40px;height:40px;border-radius:14px;}
  .oh-track::before,.oh-track-fill{top:19px;}
  .oh-track-text{font-size:.5rem;}
  .oh-meta-grid{grid-template-columns:1fr;}
  .oh-total{font-size:1.35rem;}
  .oh-review-head,.oh-review-footer{align-items:flex-start;flex-direction:column;}
  .oh-review-save{width:100%;}
}
`;

function formatDate(value: string) {
  const date = new Date(value);
  return {
    date: date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    time: date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }),
  };
}

function trackingStatus(order: OrderRow): OrderRow["order_status"] {
  if (order.order_status === "placed") {
    const placedAt = new Date(order.created_at).getTime();
    if (Number.isFinite(placedAt) && Date.now() - placedAt >= AUTO_PACKING_AFTER_MS) {
      return "packed";
    }
  }
  return order.order_status;
}

function statusLabel(status: OrderRow["order_status"]) {
  if (status === "placed") return "Processing";
  if (status === "packed") return "Packing";
  if (status === "on_the_way") return "On the way";
  if (status === "delivered") return "Delivered";
  if (status === "cancelled") return "Cancelled";
  return String(status).replaceAll("_", " ");
}

function paymentLabel(status: OrderRow["payment_status"]) {
  if (status === "cod") return "Cash on Delivery";
  if (status === "paid") return "Paid Online";
  if (status === "pending") return "Payment Pending";
  return "Payment Failed";
}

function formatAddress(order: OrderRow) {
  const addr = order.delivery_address;
  if (!addr) return "Address not available";
  const line = [
    addr.houseNumber,
    addr.streetAddress ?? addr.line1,
    addr.landmark,
    addr.pincode,
  ]
    .filter(Boolean)
    .join(", ");
  return line || "Address not available";
}

function statusIcon(status: OrderRow["order_status"]) {
  if (status === "cancelled") return <XCircle size={13} />;
  if (status === "delivered") return <CheckCircle2 size={13} />;
  if (status === "on_the_way") return <Truck size={13} />;
  if (status === "packed") return <PackageCheck size={13} />;
  return <Clock3 size={13} />;
}

const TRACKING_STEPS: {
  key: OrderRow["order_status"];
  label: string;
  note: string;
  Icon: typeof Clock3;
}[] = [
  { key: "placed", label: "Processing", note: "Order received", Icon: Clock3 },
  { key: "packed", label: "Packing", note: "Fresh cut packing", Icon: PackageCheck },
  { key: "on_the_way", label: "On the way", note: "Rider started", Icon: Truck },
  { key: "delivered", label: "Delivered", note: "Order completed", Icon: CheckCircle2 },
];

function TrackingTimeline({ order, status }: { order: OrderRow; status: OrderRow["order_status"] }) {
  if (status === "cancelled") {
    return <div className="oh-cancel-track">This order was cancelled.</div>;
  }

  const currentIndex = Math.max(0, TRACKING_STEPS.findIndex((step) => step.key === status));
  const currentStep = TRACKING_STEPS[currentIndex] ?? TRACKING_STEPS[0];
  const fillWidth = `${(currentIndex / (TRACKING_STEPS.length - 1)) * 80}%`;

  return (
    <div className="oh-tracker" aria-label="Order tracking">
      <div className="oh-tracker-head">
        <div>
          <div className="oh-tracker-label">Live Tracking</div>
          <div className="oh-tracker-now">{currentStep.label}</div>
        </div>
        <div className="oh-tracker-note">{currentStep.note}</div>
      </div>

      <div className="oh-track">
        <div className="oh-track-fill" style={{ width: fillWidth }} />
        {TRACKING_STEPS.map((step, index) => {
          const Icon = step.Icon;
          const state = index < currentIndex ? "done" : index === currentIndex ? "active" : "";
          return (
            <div className={`oh-track-step ${state}`} key={step.key}>
              <div className="oh-track-dot">
                <Icon size={17} strokeWidth={2.4} />
              </div>
              <div className="oh-track-text">{step.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function paymentIcon(status: OrderRow["payment_status"]) {
  return status === "cod" ? <Banknote size={14} /> : <CreditCard size={14} />;
}

function OrderReview({
  order,
  onSaved,
}: {
  order: OrderRow;
  onSaved: (rating: number, comment: string) => void;
}) {
  const [rating, setRating] = useState(order.feedback_rating ?? 0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState(order.feedback_comment ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const activeStars = hovered || rating;

  async function saveReview() {
    if (!rating) {
      setError(true);
      setMessage("Select a star rating first.");
      return;
    }

    setSaving(true);
    setError(false);
    setMessage("");
    try {
      const response = await fetch(`/api/orders/${order.id}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      });
      if (!response.ok) throw new Error("Could not save review");
      onSaved(rating, comment.trim());
      setMessage(order.feedback_rating ? "Review updated." : "Thank you for your review.");
    } catch {
      setError(true);
      setMessage("Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="oh-review" aria-label="Review this order">
      <div className="oh-review-head">
        <div>
          <div className="oh-review-title">Rate your order</div>
          <div className="oh-review-state">
            {rating ? `${rating} out of 5 stars` : "Tap a star to rate"}
          </div>
        </div>
        <div className="oh-stars" onMouseLeave={() => setHovered(0)}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className={`oh-star ${star <= activeStars ? "active" : ""}`}
              onClick={() => {
                setRating(star);
                setError(false);
                setMessage("");
              }}
              onMouseEnter={() => setHovered(star)}
              aria-label={`${star} star${star === 1 ? "" : "s"}`}
            >
              <Star size={19} fill={star <= activeStars ? "currentColor" : "none"} />
            </button>
          ))}
        </div>
      </div>

      <textarea
        className="oh-review-text"
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        maxLength={1000}
        placeholder="Write about freshness, packing, or delivery..."
        aria-label="Written review"
      />

      <div className="oh-review-footer">
        <span className={`oh-review-message ${error ? "error" : ""}`} aria-live="polite">
          {message || `${comment.length}/1000`}
        </span>
        <button
          type="button"
          className="oh-review-save"
          onClick={saveReview}
          disabled={saving || rating === 0}
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : null}
          {saving ? "Saving" : order.feedback_rating ? "Update Review" : "Save Review"}
        </button>
      </div>
    </section>
  );
}

function OrderCard({
  order,
  showReview = false,
  onFeedbackSaved,
}: {
  order: OrderRow;
  showReview?: boolean;
  onFeedbackSaved?: (orderId: string, rating: number, comment: string) => void;
}) {
  const { date, time } = formatDate(order.created_at);
  const displayStatus = trackingStatus(order);
  const customer =
    order.customer_name || order.delivery_address?.customerName || "Customer";
  const phone = order.customer_phone || order.delivery_address?.customerPhone;

  return (
    <article className="oh-card">
      <div className="oh-card-top" />
      <div className="oh-card-body">
        <div className="oh-card-head">
          <div>
            <div className="oh-id">
              Order #{order.id.slice(0, 8).toUpperCase()}
            </div>
            <div className="oh-date">
              <CalendarClock size={14} />
              <span>
                {date} · {time}
              </span>
            </div>
          </div>
          <span className={`oh-status ${displayStatus}`}>
            {statusIcon(displayStatus)}
            {statusLabel(displayStatus)}
          </span>
        </div>

        <TrackingTimeline order={order} status={displayStatus} />

        <div className="oh-items">
          {order.items.map((item, index) => (
            <div
              className="oh-item"
              key={`${order.id}-${item.productId}-${index}`}
            >
              <div>
                <div className="oh-item-name">{item.name}</div>
                <div className="oh-item-meta">
                  Qty {item.quantity}{item.pieceSize ? ` · ${item.pieceSize} pieces` : ''}{item.itemNote ? ` · Note: ${item.itemNote}` : ''} · ₹{item.pricePerKg}/pc
                </div>
              </div>
              <div className="oh-item-price">
                ₹{item.pricePerKg * item.quantity}
              </div>
            </div>
          ))}
        </div>

        <div className="oh-meta-grid">
          <div className="oh-meta">
            <div className="oh-meta-label">
              {paymentIcon(order.payment_status)} Payment
            </div>
            <div className="oh-meta-value">
              {paymentLabel(order.payment_status)}
            </div>
          </div>
          {order.eta_minutes !== null && (
            <div className="oh-meta">
              <div className="oh-meta-label">
                <Clock3 size={14} /> ETA
              </div>
              <div className="oh-meta-value">{order.eta_minutes} minutes</div>
            </div>
          )}
          {phone && (
            <div className="oh-meta">
              <div className="oh-meta-label">
                <Phone size={14} /> Phone
              </div>
              <div className="oh-meta-value">+91 {phone}</div>
            </div>
          )}
        </div>

        <div className="oh-address">
          <div className="oh-meta-label">
            <MapPin size={14} /> Delivery Address
          </div>
          <div className="oh-meta-value">{formatAddress(order)}</div>
        </div>

        {order.driver_name && (
          <div className="oh-address">
            <div className="oh-meta-label">
              <Truck size={14} /> Delivery Partner
            </div>
            <div className="oh-meta-value">
              {order.driver_name}
              {order.driver_phone ? ` · +91 ${order.driver_phone}` : ""}
            </div>
          </div>
        )}

        {order.notes && (
          <div className="oh-address">
            <div className="oh-meta-label">
              <ShieldCheck size={14} /> Notes
            </div>
            <div className="oh-meta-value">{order.notes}</div>
          </div>
        )}

        <div className="oh-total-row">
          <div>
            <div className="oh-total-label">Total Amount</div>
            <div className="oh-date">{customer}</div>
          </div>
          <div className="oh-total">₹{order.total_amount}</div>
        </div>

        {showReview && onFeedbackSaved ? (
          <OrderReview
            order={order}
            onSaved={(rating, comment) => onFeedbackSaved(order.id, rating, comment)}
          />
        ) : null}
      </div>
    </article>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  return (
    <div className="oh-empty">
      <div className="oh-empty-icon">
        {tab === "current" ? <Truck size={30} /> : <ReceiptText size={30} />}
      </div>
      <div>
        <h2>
          {tab === "current" ? "No current orders" : "No order history yet"}
        </h2>
        <p>
          {tab === "current"
            ? "When you place a fresh chicken order, live status updates will appear here."
            : "Delivered orders from your account will appear here once available."}
        </p>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="oh-loading">
      <div className="oh-loading-icon">
        <Loader2 size={30} className="animate-spin" />
      </div>
      <p>Loading your orders...</p>
    </div>
  );
}

export default function OrderHistoryClient({ user }: { user: AuthUser }) {
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    if (typeof window === "undefined") return "current";
    const tab = new URLSearchParams(window.location.search).get("tab");
    return tab === "history" ? "history" : "current";
  });
  const [activeOrders, setActiveOrders] = useState<OrderRow[]>([]);
  const [historyOrders, setHistoryOrders] = useState<OrderRow[]>([]);
  const [activeLoading, setActiveLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [historyOffset, setHistoryOffset] = useState(0);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [clockTick, setClockTick] = useState(0);
  const [profileName, setProfileName] = useState(user.name);

  const fetchActive = useCallback(async (showLoading = false) => {
    if (showLoading) setActiveLoading(true);
    try {
      const res = await fetch("/api/orders/active", { cache: "no-store" });
      if (res.status === 401) {
        window.location.href = "/";
        return;
      }
      const rows = res.ok ? ((await res.json()) as OrderRow[]) : [];
      setActiveOrders(Array.isArray(rows) ? rows : []);
    } finally {
      if (showLoading) setActiveLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(
    async (reset = true, showLoading = false) => {
      const offset = reset ? 0 : historyOffset;
      if (reset) {
        if (showLoading) setHistoryLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const res = await fetch(
          `/api/orders/history?offset=${offset}&limit=${PAGE_SIZE}`,
          { cache: "no-store" },
        );
        if (res.status === 401) {
          window.location.href = "/";
          return;
        }
        const rows = res.ok ? ((await res.json()) as OrderRow[]) : [];
        const safeRows = Array.isArray(rows) ? rows : [];
        setHistoryOrders((prev) => (reset ? safeRows : [...prev, ...safeRows]));
        setHistoryOffset(offset + safeRows.length);
        setHasMoreHistory(safeRows.length === PAGE_SIZE);
      } finally {
        if (showLoading) setHistoryLoading(false);
        setLoadingMore(false);
      }
    },
    [historyOffset],
  );

  useEffect(() => {
    fetchActive(true);
    fetchHistory(true, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const now = Date.now();
    const waits = activeOrders
      .filter((order) => order.order_status === "placed")
      .map((order) => new Date(order.created_at).getTime() + AUTO_PACKING_AFTER_MS - now)
      .filter((wait) => Number.isFinite(wait) && wait > 0);
    if (waits.length === 0) return;
    const timer = window.setTimeout(
      () => {
        setClockTick((tick) => tick + 1);
        fetchActive(false);
      },
      Math.min(...waits) + 25,
    );
    return () => window.clearTimeout(timer);
  }, [activeOrders, clockTick, fetchActive]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      fetchActive(false);
      fetchHistory(true, false);
    }, 20_000);
    return () => window.clearInterval(timer);
  }, [fetchActive, fetchHistory]);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user?.name) setProfileName(data.user.name);
      })
      .catch(() => {});
  }, []);

  async function refresh() {
    setRefreshing(true);
    await Promise.all([fetchActive(false), fetchHistory(true, false)]);
    setRefreshing(false);
  }

  const currentOrders = activeTab === "current" ? activeOrders : historyOrders;
  const loading = activeTab === "current" ? activeLoading : historyLoading;
  const countText = useMemo(() => {
    const count =
      activeTab === "current" ? activeOrders.length : historyOrders.length;
    return `${count}${activeTab === "history" && hasMoreHistory ? "+" : ""} ${count === 1 ? "order" : "orders"}`;
  }, [activeOrders.length, activeTab, hasMoreHistory, historyOrders.length]);

  return (
    <div className="oh-page">
      <link
        href="https://fonts.googleapis.com/css2?family=League+Spartan:wght@800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Fraunces:ital,opsz,wght@0,9..144,700;0,9..144,800;0,9..144,900;1,9..144,700&display=swap"
        rel="stylesheet"
      />
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <header className="oh-hero">
        <div className="oh-nav">
          <Link href="/" className="oh-brand">
            B&apos;<em>LURU</em> FRESH
          </Link>
          <Link href="/" className="oh-back">
            <ArrowLeft size={16} />
            <span>Home</span>
          </Link>
        </div>

        <div className="oh-hero-inner">
          <div>
            <div className="oh-kicker">Order Management</div>
            <h1 className="oh-title">
              Order
              <br />
              <span>History.</span>
            </h1>
            <p className="oh-sub">
              Track current orders, review past deliveries, and keep every fresh
              cut receipt in one polished view.
            </p>
          </div>

          <div className="oh-user-card">
            <div className="oh-user-label">Signed in as</div>
            <div className="oh-user-name">
              {profileName || "B’LURU Fresh Customer"}
            </div>
            <div className="oh-user-phone">
              <Phone size={14} />
              +91 {user.phone}
            </div>
          </div>
        </div>
      </header>

      <div className="oh-tabs-shell">
        <div className="oh-tabs">
          <button
            type="button"
            className={`oh-tab ${activeTab === "current" ? "active" : ""}`}
            onClick={() => setActiveTab("current")}
          >
            <Truck size={18} />
            Current Orders
          </button>
          <button
            type="button"
            className={`oh-tab ${activeTab === "history" ? "active" : ""}`}
            onClick={() => setActiveTab("history")}
          >
            <ReceiptText size={18} />
            Order History
          </button>
        </div>
      </div>

      <main className="oh-main">
        <div className="oh-toolbar">
          <div>
            <h2 className="oh-section-title">
              {activeTab === "current" ? "Current Orders" : "Order History"}
            </h2>
            <div className="oh-count">{countText}</div>
          </div>
          <button
            className="oh-refresh"
            onClick={refresh}
            disabled={refreshing}
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>

        <section key={activeTab} className="oh-fade">
          {loading ? (
            <LoadingState />
          ) : currentOrders.length === 0 ? (
            <EmptyState tab={activeTab} />
          ) : (
            <>
              <div className="oh-grid">
                {currentOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    showReview={activeTab === "history"}
                    onFeedbackSaved={(orderId, rating, comment) => {
                      setHistoryOrders((orders) =>
                        orders.map((historyOrder) =>
                          historyOrder.id === orderId
                            ? {
                                ...historyOrder,
                                feedback_rating: rating,
                                feedback_comment: comment,
                                feedback_at: new Date().toISOString(),
                              }
                            : historyOrder,
                        ),
                      );
                    }}
                  />
                ))}
              </div>

              {activeTab === "history" && hasMoreHistory && (
                <button
                  className="oh-load-more"
                  onClick={() => fetchHistory(false)}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : null}
                  {loadingMore ? "Loading..." : "Load More Orders"}
                </button>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
