"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode, RefObject } from "react";

/* ==========================================================================
   TERIOT — DARI SINYAL LAPANGAN MENJADI KEPUTUSAN BISNIS
   Light theme · Industrial IoT untuk Petrochemical / Oil & Gas

   Alur mengikuti arsitektur nyata (Purdue / ISA-95):
   L0 Field instrument → L1-L2 PLC/DCS & BMS → L2.5 DMZ + IoT Gateway (read-only)
   → L3 Historian & context → AI analytics → L4 Dashboard → RPA → ERP/CMMS

   Satu environment berkelanjutan (fixed layer stack) yang di-crossfade oleh
   SATU rAF loop dengan camera smoothing. Tidak ada package tambahan,
   tidak ada asset gambar — seluruh environment dibangun CSS + SVG.
   ========================================================================== */

/* ---------------------------------- utils -------------------------------- */

const vars = (v: Record<string, string | number | undefined>) => v as CSSProperties;

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** smootherstep (Perlin) — turunan pertama & kedua nol di ujung, jadi transisi terasa halus. */
const ease = (edge0: number, edge1: number, x: number) => {
  const t = clamp((x - edge0) / (edge1 - edge0 || 1), 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
};

/** naik di [a,b], turun di [c,d]. */
const band = (x: number, a: number, b: number, c: number, d: number) =>
  clamp(Math.min(ease(a, b, x), 1 - ease(c, d, x)), 0, 1);

/* -------------------------------- hooks ---------------------------------- */

function useInView<T extends Element>(threshold = 0.16, rootMargin = "0px 0px -6% 0px") {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setInView(true);
      },
      { threshold, rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return { ref, inView };
}

/** true selama elemen di viewport — dipakai untuk menyalakan/mematikan interval. */
function useActiveInView<T extends Element>(rootMargin = "120px 0px 120px 0px") {
  const ref = useRef<T | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setActive(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setActive(entry.isIntersecting);
      },
      { threshold: 0, rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return { ref, active };
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);
  return reduced;
}

/**
 * KAMERA GLOBAL.
 * Nilai kamera dikejar (lerp) menuju posisi scroll sebenarnya setiap frame,
 * sehingga pergantian environment tidak pernah mengikuti scroll secara kaku.
 * Semua hasil ditulis sebagai CSS variable — tidak ada React state saat scroll.
 */
function useStoryCamera(root: RefObject<HTMLDivElement | null>, reduced: boolean) {
  useEffect(() => {
    const el = root.current;
    if (!el) return;

    const set = (name: string, value: number) => el.style.setProperty(name, value.toFixed(3));

    const write = (t: number, last: number) => {
      set("--cam", t);
      set("--sp", t / last);
      set("--z-plant", ease(0, 2.4, t));

      // Kilang tidak pernah hilang — hanya mundur menjadi latar jauh.
      set("--l-plant", clamp(1 - 0.72 * ease(1.6, 4.6, t) - 0.28 * ease(4.6, 8.0, t), 0, 1));
      set("--l-pid", band(t, 0.6, 2.2, 4.2, 6.0));
      set("--l-control", band(t, 2.4, 4.0, 6.2, 7.8));
      set("--l-net", band(t, 4.4, 6.0, 8.4, 10.0));
      set("--l-data", band(t, 6.0, 7.4, 9.2, 10.8));
      set("--l-neural", band(t, 7.8, 9.2, 11.0, 12.6));
      set("--l-ops", band(t, 9.8, 11.2, 13.0, 14.6));
      set("--l-auto", band(t, 12.0, 13.4, 15.4, 17.0));
      set("--l-biz", ease(14.2, 16.4, t));
      set("--dash-in", ease(10.85, 11.3, t));
    };

    const scenes = Array.from(el.querySelectorAll<HTMLElement>("[data-scene]"));
    if (!scenes.length) return;
    const last = scenes.length - 1;

    if (reduced) {
      write(1.2, last);
      set("--dash-in", 1);
      return;
    }

    const measure = () => {
      const focus = window.innerHeight * 0.5;
      let t = 0;
      for (let i = 0; i <= last; i += 1) {
        const rect = scenes[i].getBoundingClientRect();
        if (focus < rect.top) break;
        if (focus <= rect.bottom) {
          t = i + clamp((focus - rect.top) / Math.max(rect.height, 1), 0, 1);
          break;
        }
        t = i + 1;
      }
      return clamp(t, 0, last);
    };

    let current = measure();
    let frame = 0;
    let running = false;

    const tick = () => {
      const target = measure();
      const delta = target - current;
      // lompatan besar (anchor jump) langsung disamakan, sisanya dikejar halus
      current = Math.abs(delta) > 2.5 ? target : current + delta * 0.16;
      write(current, last);

      if (Math.abs(target - current) < 0.002) {
        current = target;
        write(current, last);
        running = false;
        frame = 0;
        return;
      }
      frame = window.requestAnimationFrame(tick);
    };

    const start = () => {
      if (running) return;
      running = true;
      frame = window.requestAnimationFrame(tick);
    };

    write(current, last);
    window.addEventListener("scroll", start, { passive: true });
    window.addEventListener("resize", start);
    return () => {
      window.removeEventListener("scroll", start);
      window.removeEventListener("resize", start);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [root, reduced]);
}

/* ------------------------------- primitives ------------------------------ */

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`reveal ${inView ? "is-in" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-5 py-2 text-[11px] font-bold uppercase tracking-widest text-blue-600 md:text-xs">
      {children}
    </span>
  );
}

function StageLabel({ step, text, level }: { step: string; text: string; level: string }) {
  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-blue-100 bg-white/80 px-4 py-1.5 shadow-sm backdrop-blur">
      <span className="font-mono text-[11px] font-bold tracking-[0.18em] text-blue-600">{step}</span>
      <span className="h-3 w-px bg-blue-200" />
      <span className="font-mono text-[11px] font-bold tracking-[0.18em] text-slate-700">{text}</span>
      <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] tracking-[0.1em] text-slate-500">
        {level}
      </span>
    </div>
  );
}

/** angka proses yang bergerak halus di sekitar nilai operasi */
function LiveValue({
  base,
  variance,
  decimals = 1,
  interval = 1700,
}: {
  base: number;
  variance: number;
  decimals?: number;
  interval?: number;
}) {
  const { ref, active } = useActiveInView<HTMLSpanElement>();
  const reduced = useReducedMotion();
  const [value, setValue] = useState(base);

  useEffect(() => {
    if (!active || reduced) return;
    const id = window.setInterval(() => {
      setValue((prev) => {
        const drift = (Math.random() - 0.5) * variance;
        const pull = (base - prev) * 0.28;
        return clamp(prev + drift + pull, base - variance * 2, base + variance * 2);
      });
    }, interval);
    return () => window.clearInterval(id);
  }, [active, reduced, base, variance, interval]);

  return <span ref={ref}>{value.toFixed(decimals)}</span>;
}

function LiveCounter({ start, stepBy = 1, interval = 2400 }: { start: number; stepBy?: number; interval?: number }) {
  const { ref, active } = useActiveInView<HTMLSpanElement>();
  const reduced = useReducedMotion();
  const [value, setValue] = useState(start);

  useEffect(() => {
    if (!active || reduced) return;
    const id = window.setInterval(() => setValue((prev) => prev + stepBy), interval);
    return () => window.clearInterval(id);
  }, [active, reduced, stepBy, interval]);

  return <span ref={ref}>{value.toLocaleString("id-ID")}</span>;
}

/* --------------------------------- data ---------------------------------- */

type Stage = { id: string; label: string; short: string; icon: string; note: string; level: string };

const PIPELINE: Stage[] = [
  {
    id: "hero",
    label: "PLANT",
    short: "Plant",
    icon: "ri-building-3-line",
    note: "Boiler & vessel beroperasi",
    level: "L0",
  },
  {
    id: "field",
    label: "FIELD INSTRUMENT",
    short: "Instrument",
    icon: "ri-temp-hot-line",
    note: "PT · TT · FT · LT · AT",
    level: "L0",
  },
  {
    id: "control",
    label: "PLC / DCS / BMS",
    short: "Control",
    icon: "ri-cpu-line",
    note: "Kontrol loop & interlock",
    level: "L1–L2",
  },
  {
    id: "gateway",
    label: "IoT GATEWAY",
    short: "Gateway",
    icon: "ri-router-line",
    note: "Read-only di zona DMZ",
    level: "L2.5",
  },
  {
    id: "historian",
    label: "HISTORIAN",
    short: "Historian",
    icon: "ri-database-2-line",
    note: "Time-series & konteks aset",
    level: "L3",
  },
  {
    id: "ai",
    label: "AI ANALYTICS",
    short: "AI",
    icon: "ri-sparkling-2-line",
    note: "Analisa & penjelasan",
    level: "L3",
  },
  {
    id: "dashboard",
    label: "DASHBOARD",
    short: "Dashboard",
    icon: "ri-dashboard-3-line",
    note: "KPI operasional",
    level: "L4",
  },
  {
    id: "rpa",
    label: "RPA",
    short: "RPA",
    icon: "ri-robot-2-line",
    note: "Laporan & work order",
    level: "L4",
  },
  {
    id: "ecosystem",
    label: "ERP / CMMS",
    short: "Business",
    icon: "ri-building-2-line",
    note: "Keputusan bisnis",
    level: "L4",
  },
];

/** Instrumen lapangan pada paket boiler & vessel (penamaan tag mengikuti ISA-5.1). */
const FIELD_TAGS = [
  {
    tag: "PT-101",
    icon: "ri-dashboard-2-line",
    name: "Steam Drum Pressure",
    base: 18.5,
    variance: 0.12,
    decimals: 2,
    unit: "barg",
    signal: "4–20 mA · HART",
  },
  {
    tag: "TT-204",
    icon: "ri-temp-hot-line",
    name: "Superheater Outlet",
    base: 385.2,
    variance: 1.4,
    decimals: 1,
    unit: "°C",
    signal: "RTD · Pt100",
  },
  {
    tag: "FT-312",
    icon: "ri-drop-line",
    name: "Feedwater Flow",
    base: 42.6,
    variance: 0.5,
    decimals: 1,
    unit: "t/h",
    signal: "Orifice · DP",
  },
  {
    tag: "LT-105",
    icon: "ri-contrast-drop-2-line",
    name: "Drum Level",
    base: 51.4,
    variance: 0.9,
    decimals: 1,
    unit: "%",
    signal: "DP · 3-element",
  },
  {
    tag: "AT-220",
    icon: "ri-windy-line",
    name: "Flue Gas O₂",
    base: 3.2,
    variance: 0.08,
    decimals: 2,
    unit: "%",
    signal: "Zirconia probe",
  },
  {
    tag: "VT-410",
    icon: "ri-pulse-line",
    name: "BFW Pump Vibration",
    base: 2.84,
    variance: 0.09,
    decimals: 2,
    unit: "mm/s",
    signal: "ISO 10816",
  },
];

/** Control loop yang benar-benar dipakai pada paket boiler industri. */
const CONTROL_LOOPS = [
  { tag: "LIC-105", name: "Drum level (3-element)", sp: "50.0 %", pv: "51.4 %", out: 46, mode: "AUTO" },
  { tag: "PIC-101", name: "Steam pressure master", sp: "18.0 barg", pv: "18.5 barg", out: 62, mode: "AUTO" },
  { tag: "AIC-220", name: "O₂ trim / excess air", sp: "3.0 %", pv: "3.2 %", out: 38, mode: "AUTO" },
  { tag: "FIC-318", name: "Fuel gas flow", sp: "3 150 Nm³/h", pv: "3 142 Nm³/h", out: 55, mode: "CASCADE" },
];

const BMS_INTERLOCKS = [
  { name: "Purge sequence complete", state: "OK" },
  { name: "Flame scanner (main burner)", state: "OK" },
  { name: "Low-low drum level trip", state: "ARMED" },
  { name: "High steam pressure trip", state: "ARMED" },
];

const GATEWAY_IN = [
  { icon: "ri-cpu-line", name: "Modbus TCP", desc: "Holding register PLC" },
  { icon: "ri-node-tree", name: "OPC UA", desc: "Tag browse dari DCS / SCADA" },
  { icon: "ri-plug-line", name: "HART / 4–20 mA", desc: "Via AI module & multiplexer" },
  { icon: "ri-lan-line", name: "EtherNet/IP", desc: "Industrial ethernet" },
];

const GATEWAY_OUT = [
  { icon: "ri-broadcast-line", name: "MQTT over TLS", desc: "Publish ke broker" },
  { icon: "ri-code-box-line", name: "REST API", desc: "JSON payload bertimestamp" },
  { icon: "ri-hard-drive-3-line", name: "Store & forward", desc: "Buffer saat link putus" },
  { icon: "ri-shield-keyhole-line", name: "One-way / read-only", desc: "Tidak menulis ke controller" },
];

const HISTORIAN_TOPICS = [
  "Tag master",
  "Raw 1 detik",
  "Agregasi 1 menit",
  "Asset model",
  "Alarm & event log",
  "Retensi 5 tahun",
  "Data quality flag",
];

const AI_NODES = ["Efisiensi", "Steam", "Fuel", "Downtime", "Vibrasi", "Emisi"];

type ChatMessage = { role: "user" | "ai"; text: string };

const CHAT: ChatMessage[] = [
  { role: "user", text: "Kenapa efisiensi Boiler-01 turun sejak semalam?" },
  { role: "ai", text: "Excess O₂ naik dari 3,1% ke 5,4% sejak pukul 23:10. Rugi kalor di flue gas bertambah." },
  { role: "user", text: "Apa pemicunya?" },
  { role: "ai", text: "Damper FD fan membuka 12% lebih lebar setelah beban turun. AIC-220 tercatat mode manual." },
  { role: "user", text: "Buatkan work order." },
  { role: "ai", text: "WO-2451 dibuat: kembalikan AIC-220 ke auto dan kalibrasi probe AT-220." },
];

const EQUIPMENT = [
  { tag: "BOILER-01", name: "Package boiler", status: "RUNNING", tone: "run" },
  { tag: "V-102", name: "Steam drum / vessel", status: "NORMAL", tone: "run" },
  { tag: "P-201A", name: "BFW pump", status: "STANDBY", tone: "idle" },
  { tag: "K-301", name: "Air compressor", status: "MAINTENANCE", tone: "mtc" },
];

const EFFICIENCY_TREND = [88.1, 88.6, 89.2, 89.0, 89.5, 89.8, 89.4, 88.2, 87.4, 88.9, 89.3, 89.4];
const STEAM_SHIFT = [68, 82, 74, 88, 79, 92, 85];

const RPA_TARGETS = [
  { icon: "ri-database-2-line", name: "Historian" },
  { icon: "ri-dashboard-3-line", name: "Dashboard" },
  { icon: "ri-building-2-line", name: "ERP" },
  { icon: "ri-tools-line", name: "CMMS" },
  { icon: "ri-mail-send-line", name: "Email" },
  { icon: "ri-file-excel-2-line", name: "Excel" },
  { icon: "ri-whatsapp-line", name: "WhatsApp" },
  { icon: "ri-file-chart-line", name: "Report" },
];

const RPA_TIMELINE = [
  { time: "06:00", text: "Bot menarik data historian shift malam", icon: "ri-download-cloud-2-line" },
  { time: "06:02", text: "Bot memeriksa data gap dan quality flag", icon: "ri-shield-check-line" },
  { time: "06:05", text: "Bot menghitung efisiensi dan konsumsi energi", icon: "ri-calculator-line" },
  { time: "06:08", text: "Bot posting ke ERP dan membuat work order CMMS", icon: "ri-exchange-line" },
  { time: "06:10", text: "Bot mengirim laporan ke email dan WhatsApp", icon: "ri-notification-3-line" },
];

const IMPACT = [
  {
    icon: "ri-eye-line",
    head: "Visibilitas Real-time",
    desc: "Kondisi boiler, vessel, dan utilitas terlihat saat itu juga, bukan menunggu logsheet akhir shift.",
  },
  {
    icon: "ri-line-chart-line",
    head: "Keputusan Berbasis Data",
    desc: "Analisa efisiensi dan energi berangkat dari data instrumen, bukan dari perkiraan operator.",
  },
  {
    icon: "ri-robot-2-line",
    head: "Proses Otomatis",
    desc: "Rekap harian, posting ERP, dan pembuatan work order dikerjakan bot tanpa input manual.",
  },
  {
    icon: "ri-shield-check-line",
    head: "Aman untuk Operasi",
    desc: "Lapisan IoT hanya membaca. Sistem kontrol dan safety instrumented system tetap terpisah.",
  },
];

/* ---------------------------- global stylesheet --------------------------- */

const STYLES = `
/* ===================== world / kamera ===================== */
.industrial-world{
  position:relative;
  --sp:0; --cam:0; --z-plant:0; --dash-in:0;
  --l-plant:1; --l-pid:0; --l-control:0; --l-net:0;
  --l-data:0; --l-neural:0; --l-ops:0; --l-auto:0; --l-biz:0;
  background:#F5F8FE;
}
.world-stack{position:fixed;inset:0;z-index:0;overflow:hidden;pointer-events:none;}
.wl{position:absolute;inset:0;}

.iot-page{position:relative;z-index:1;color:#475569;overflow-x:clip;}
@supports not (overflow-x: clip){.iot-page{overflow-x:hidden;}}
.iot-page ::selection{background:rgba(37,99,235,.16);color:#0f172a;}

/* ---- atmosfer dasar (siang hari di area plant) ---- */
.wl-sky{
  background:
    radial-gradient(120% 78% at 50% -10%, rgba(219,234,254,.95), transparent 58%),
    radial-gradient(100% 56% at 50% 108%, rgba(224,242,254,.85), transparent 64%),
    linear-gradient(180deg,#FFFFFF 0%,#F5F9FF 46%,#EDF3FD 100%);
}

/* ---- STAGE 01 · kilang / plant ---- */
.wl-plant{
  opacity:var(--l-plant);
  transform:translate3d(0,calc(var(--sp) * -54px),0) scale(calc(1 + var(--z-plant) * .22));
  will-change:transform,opacity;
}
.fx-sun{
  position:absolute;left:62%;top:8%;width:340px;height:340px;border-radius:999px;
  background:radial-gradient(circle, rgba(255,255,255,.95), rgba(219,234,254,.45) 45%, transparent 70%);
}
.fx-haze{position:absolute;inset:0;background:linear-gradient(180deg, transparent 40%, rgba(255,255,255,.55) 78%, rgba(255,255,255,.85) 100%);}
.fx-ground{
  position:absolute;left:-60%;right:-60%;bottom:-14%;height:52%;
  transform:perspective(680px) rotateX(74deg);transform-origin:50% 100%;
  background-image:
    repeating-linear-gradient(90deg, rgba(37,99,235,.14) 0 1px, transparent 1px 104px),
    repeating-linear-gradient(0deg, rgba(37,99,235,.10) 0 1px, transparent 1px 104px);
  -webkit-mask-image:linear-gradient(to top,#000 2%,transparent 68%);
  mask-image:linear-gradient(to top,#000 2%,transparent 68%);
  animation:groundRun 9s linear infinite;
}
@keyframes groundRun{to{background-position:0 104px, 0 104px}}
.plant-svg{position:absolute;left:0;right:0;bottom:8%;width:100%;height:auto;}
.plant-body{fill:rgba(255,255,255,.72);stroke:rgba(37,99,235,.34);stroke-width:1.4;}
.plant-soft{fill:rgba(37,99,235,.07);stroke:rgba(37,99,235,.22);stroke-width:1.2;}
.plant-line{stroke:rgba(37,99,235,.3);stroke-width:1.4;fill:none;}
.plant-far{fill:rgba(148,163,184,.16);stroke:rgba(148,163,184,.3);stroke-width:1;}
.flare{fill:url(#flareGrad);animation:flareFlicker 3.2s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 100%;}
@keyframes flareFlicker{0%,100%{opacity:.75;transform:scaleY(.94) scaleX(1)}45%{opacity:1;transform:scaleY(1.08) scaleX(.94)}}
.flicker{animation:flareFlicker 2.6s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 100%;}
.steam{fill:rgba(255,255,255,.75);animation:steamRise 7s ease-in-out infinite;transform-box:fill-box;}
@keyframes steamRise{0%{opacity:0;transform:translateY(6px) scale(.85)}35%{opacity:.85}100%{opacity:0;transform:translateY(-26px) scale(1.2)}}

/* ---- STAGE 02 · P&ID / loop instrumentasi ---- */
.wl-pid{opacity:var(--l-pid);transform:translate3d(0,calc(var(--sp) * -96px),0);will-change:transform,opacity;}
.pid-line{fill:none;stroke:rgba(37,99,235,.24);stroke-width:1.2;stroke-dasharray:6 6;vector-effect:non-scaling-stroke;animation:pidCrawl 14s linear infinite;}
@keyframes pidCrawl{to{stroke-dashoffset:-96}}
.pid-signal{
  fill:none;stroke:#2563EB;stroke-width:4;stroke-linecap:round;stroke-dasharray:0.1 11;
  vector-effect:non-scaling-stroke;opacity:.55;
  animation:pidSignal 3.8s linear infinite;
}
@keyframes pidSignal{to{stroke-dashoffset:-44.4}}

/* ---- STAGE 03 · control room / panel ---- */
.wl-control{opacity:var(--l-control);transform:translate3d(0,calc(var(--sp) * -120px),0);will-change:transform,opacity;}
.fx-panel{
  position:absolute;border:1px solid rgba(37,99,235,.16);border-radius:16px;
  background:linear-gradient(180deg, rgba(255,255,255,.75), rgba(239,246,255,.35));
  box-shadow:0 20px 45px -35px rgba(15,23,42,.5);
}
.fx-trend{position:absolute;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(37,99,235,.28),transparent);}

/* ---- STAGE 04 · jaringan ---- */
.wl-net{opacity:var(--l-net);transform:translate3d(0,calc(var(--sp) * -150px),0);will-change:transform,opacity;}
.fx-mesh{
  position:absolute;inset:-10%;
  background-image:
    linear-gradient(to right, rgba(37,99,235,.12) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(37,99,235,.12) 1px, transparent 1px);
  background-size:58px 58px;
  -webkit-mask-image:radial-gradient(ellipse 72% 60% at 50% 45%, #000 10%, transparent 76%);
  mask-image:radial-gradient(ellipse 72% 60% at 50% 45%, #000 10%, transparent 76%);
  animation:meshDrift 22s linear infinite;
}
@keyframes meshDrift{to{background-position:58px 58px}}
.fx-beam{
  position:absolute;height:1px;left:-20%;right:-20%;
  background:linear-gradient(90deg,transparent,rgba(14,165,233,.5),transparent);
  animation:beamRun 7s linear infinite;
}
@keyframes beamRun{0%{transform:translate3d(-28%,0,0);opacity:0}22%{opacity:.85}78%{opacity:.85}100%{transform:translate3d(28%,0,0);opacity:0}}

/* ---- STAGE 05 · historian / data ---- */
.wl-data{opacity:var(--l-data);transform:translate3d(0,calc(var(--sp) * -132px),0);will-change:transform,opacity;}
.fx-rack{
  position:absolute;bottom:16%;border-radius:10px;
  background:linear-gradient(180deg, rgba(255,255,255,.85), rgba(241,245,249,.7));
  border:1px solid rgba(37,99,235,.16);overflow:hidden;
  box-shadow:0 24px 50px -40px rgba(15,23,42,.6);
}
.fx-rack::after{
  content:"";position:absolute;inset:10px 12px;
  background:repeating-linear-gradient(180deg, rgba(37,99,235,.24) 0 2px, transparent 2px 13px);
  opacity:.55;animation:rackBlink 3.6s steps(6) infinite;
}
@keyframes rackBlink{50%{opacity:.85}}
.fx-column{
  position:absolute;top:0;bottom:0;width:80px;
  background:linear-gradient(180deg, transparent, rgba(14,165,233,.14), transparent);
  filter:blur(8px);animation:columnPulse 6s ease-in-out infinite;
}
@keyframes columnPulse{0%,100%{opacity:.3}50%{opacity:.7}}

/* ---- STAGE 06 · AI ---- */
.wl-neural{opacity:var(--l-neural);transform:translate3d(0,calc(var(--sp) * -168px),0);will-change:transform,opacity;}
.neural-link{stroke:rgba(37,99,235,.3);stroke-width:1;fill:none;vector-effect:non-scaling-stroke;animation:linkPulse 5s ease-in-out infinite;}
@keyframes linkPulse{0%,100%{opacity:.18}50%{opacity:.6}}
.neural-node{fill:#2563EB;transform-box:fill-box;transform-origin:center;animation:nodeGlow 4.2s ease-in-out infinite;}
@keyframes nodeGlow{0%,100%{opacity:.25;transform:scale(.72)}50%{opacity:.85;transform:scale(1.2)}}

/* ---- STAGE 07 · operations / control room digital ---- */
.wl-ops{opacity:var(--l-ops);transform:translate3d(0,calc(var(--sp) * -104px),0);will-change:transform,opacity;}
.fx-holo{
  position:absolute;border:1px solid rgba(37,99,235,.14);border-radius:18px;
  background:linear-gradient(180deg, rgba(255,255,255,.7), rgba(239,246,255,.25));
}
.fx-sweep{
  position:absolute;left:0;right:0;height:200px;
  background:linear-gradient(180deg, transparent, rgba(37,99,235,.07), transparent);
  animation:sweepRun 9s ease-in-out infinite;
}
@keyframes sweepRun{0%{top:-20%;opacity:0}22%{opacity:1}78%{opacity:1}100%{top:100%;opacity:0}}

/* ---- STAGE 08 · automation ---- */
.wl-auto{opacity:var(--l-auto);transform:translate3d(0,calc(var(--sp) * -86px),0);will-change:transform,opacity;}
.flow-track{fill:none;stroke:rgba(99,102,241,.25);stroke-width:1.4;stroke-dasharray:5 7;vector-effect:non-scaling-stroke;animation:trackCrawl 14s linear infinite;}
@keyframes trackCrawl{to{stroke-dashoffset:-96}}
.flow-packet{fill:none;stroke:#6366F1;stroke-width:5;stroke-linecap:round;stroke-dasharray:0.1 15;vector-effect:non-scaling-stroke;opacity:.7;animation:packetRun 5s linear infinite;}
@keyframes packetRun{to{stroke-dashoffset:-60.4}}

/* ---- STAGE 09 · business ---- */
.wl-biz{opacity:var(--l-biz);will-change:opacity;}
.fx-dawn{
  position:absolute;inset:0;
  background:
    radial-gradient(120% 70% at 50% 108%, rgba(255,255,255,.95), transparent 58%),
    radial-gradient(90% 55% at 50% 96%, rgba(191,219,254,.5), transparent 64%);
}
.fx-skyline{
  position:absolute;left:0;right:0;bottom:0;height:24%;
  -webkit-mask-image:linear-gradient(to top,#000 18%,transparent 100%);
  mask-image:linear-gradient(to top,#000 18%,transparent 100%);
}
.fx-tower{position:absolute;bottom:0;border-radius:6px 6px 0 0;background:linear-gradient(180deg, rgba(37,99,235,.14), rgba(37,99,235,.02));}

/* ---- veil supaya teks selalu terbaca ---- */
.wl-veil{
  background:
    radial-gradient(ellipse 86% 66% at 50% 46%, rgba(255,255,255,.3), rgba(246,249,254,.78) 100%),
    linear-gradient(180deg, rgba(255,255,255,.78), transparent 16%, transparent 84%, rgba(255,255,255,.82));
}

/* ---- data spine: satu aliran data sepanjang halaman ---- */
.data-spine{position:fixed;top:0;bottom:0;left:clamp(4px,2vw,40px);width:60px;z-index:0;pointer-events:none;opacity:.8;}
.spine-base{fill:none;stroke:url(#spineGrad);stroke-width:2;vector-effect:non-scaling-stroke;opacity:.4;}
.spine-dots{
  fill:none;stroke:#2563EB;stroke-width:5;stroke-linecap:round;stroke-dasharray:0.1 38;
  vector-effect:non-scaling-stroke;animation:spineFlow 5s linear infinite;
}
.spine-dots--slow{animation-duration:7.5s;opacity:.45;stroke:#0EA5E9;}
@keyframes spineFlow{to{stroke-dashoffset:-152.4}}

/* ---- jembatan antar stage ---- */
.bridge-base{fill:none;stroke:rgba(37,99,235,.22);stroke-width:2;stroke-dasharray:7 9;animation:bridgeCrawl 12s linear infinite;}
@keyframes bridgeCrawl{to{stroke-dashoffset:-96}}
.bridge-flow{
  fill:none;stroke:#2563EB;stroke-width:6;stroke-linecap:round;stroke-dasharray:0.1 34;
  animation:bridgeFlow 3.4s linear infinite;
}
@keyframes bridgeFlow{to{stroke-dashoffset:-136.4}}
.bridge-label{fill:#0F172A;font-size:11px;letter-spacing:.1em;font-weight:600;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;}
.bridge-sub{fill:#94A3B8;font-size:9.5px;letter-spacing:.08em;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;}
.bridge-node{animation:nodeBeat 3.6s ease-in-out infinite;transform-box:fill-box;transform-origin:center;}
@keyframes nodeBeat{0%,100%{opacity:.5;transform:scale(.9)}50%{opacity:1;transform:scale(1.1)}}

/* ===================== komponen ===================== */
.reveal{
  opacity:0;transform:translate3d(0,44px,0) scale(.975);
  transition:opacity 1.1s cubic-bezier(.22,1,.36,1), transform 1.1s cubic-bezier(.22,1,.36,1);
  will-change:transform,opacity;
}
.reveal.is-in{opacity:1;transform:none;}

.glass{
  background:rgba(255,255,255,.8);
  border:1px solid rgba(148,163,184,.24);
  backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
  box-shadow:0 22px 48px -34px rgba(15,23,42,.45);
}

.floaty{animation:floaty 9s ease-in-out infinite;}
@keyframes floaty{0%,100%{transform:translate3d(0,0,0)}50%{transform:translate3d(0,-8px,0)}}

.halo{animation:halo 5.5s ease-in-out infinite;}
@keyframes halo{0%,100%{opacity:.4;transform:scale(.97)}50%{opacity:.85;transform:scale(1.03)}}

.ping-ring{animation:pingRing 2.8s cubic-bezier(0,0,.2,1) infinite;}
@keyframes pingRing{0%{transform:scale(.6);opacity:.55}100%{transform:scale(2.5);opacity:0}}

.dot-down{animation:dotDown 2.8s linear infinite;}
@keyframes dotDown{
  0%{transform:translate3d(-50%,0,0) scale(.5);opacity:0}
  14%{opacity:1}80%{opacity:1}
  100%{transform:translate3d(-50%,var(--dist,56px),0) scale(.5);opacity:0}
}
.dot-right{animation:dotRight 3.2s linear infinite;}
@keyframes dotRight{
  0%{transform:translate3d(0,-50%,0) scale(.5);opacity:0}
  14%{opacity:1}80%{opacity:1}
  100%{transform:translate3d(var(--dist,100%),-50%,0) scale(.5);opacity:0}
}
.dot-up{animation:dotUp 3.4s linear infinite;}
@keyframes dotUp{
  0%{transform:translate3d(-50%,0,0);opacity:0}
  16%{opacity:1}84%{opacity:1}
  100%{transform:translate3d(-50%,calc(var(--dist,80px) * -1),0);opacity:0}
}

.spin-slow{animation:spinLoop 11s linear infinite;}
.spin-slower{animation:spinLoop 22s linear infinite;}
.spin-reverse{animation:spinLoop 17s linear infinite reverse;}
@keyframes spinLoop{to{transform:rotate(360deg)}}

.caret{animation:caretBlink 1s steps(2,start) infinite;}
@keyframes caretBlink{0%,100%{opacity:1}50%{opacity:0}}

.think span{animation:think 1.2s ease-in-out infinite;}
.think span:nth-child(2){animation-delay:.16s}
.think span:nth-child(3){animation-delay:.32s}
@keyframes think{0%,100%{transform:translateY(0);opacity:.3}50%{transform:translateY(-4px);opacity:1}}

.chart-line{stroke-dasharray:1000;stroke-dashoffset:1000;}
.chart-line.is-in{animation:drawLine 2s cubic-bezier(.22,1,.36,1) forwards;}
@keyframes drawLine{to{stroke-dashoffset:0}}

.bar-grow{transform-origin:bottom;transform:scaleY(0);transition:transform 1.1s cubic-bezier(.22,1,.36,1);}
.bar-grow.is-in{transform:scaleY(1);}

.node-3d{transition:transform .55s cubic-bezier(.22,1,.36,1), box-shadow .55s ease, border-color .55s ease;}
.node-3d:hover{transform:translate3d(0,-5px,32px) scale(1.02);}

.rail-line{background:linear-gradient(to bottom, rgba(37,99,235,0), rgba(37,99,235,.45), rgba(37,99,235,0));}

.spoke{stroke:rgba(37,99,235,.2);stroke-width:1;fill:none;}
.spoke-flow{
  stroke:#2563EB;stroke-width:3.5;stroke-linecap:round;fill:none;stroke-dasharray:0.1 20;
  animation:spokeRun 3.2s linear infinite;opacity:.75;
}
@keyframes spokeRun{to{stroke-dashoffset:-80.4}}

/* dashboard digerakkan CSS variable kamera, bukan React state */
.dash-stage{
  transform:translate3d(0,calc((1 - var(--dash-in)) * 64px),0)
            scale(calc(.88 + var(--dash-in) * .12))
            rotateX(calc((1 - var(--dash-in)) * 7deg));
  opacity:calc(.3 + var(--dash-in) * .7);
  transform-origin:50% 100%;
  will-change:transform,opacity;
}

html{scroll-behavior:smooth;}

/* ===================== reduced motion ===================== */
@media (prefers-reduced-motion: reduce){
  html{scroll-behavior:auto;}
  .industrial-world *, .industrial-world *::before, .industrial-world *::after{
    animation-duration:.001ms !important;
    animation-iteration-count:1 !important;
    transition-duration:.001ms !important;
  }
  .wl-plant,.wl-pid,.wl-control,.wl-net,.wl-data,.wl-neural,.wl-ops,.wl-auto{transform:none !important;}
  .reveal{opacity:1 !important;transform:none !important;}
  .chart-line{stroke-dashoffset:0 !important;}
  .bar-grow{transform:scaleY(1) !important;}
  .dash-stage{transform:none !important;opacity:1 !important;}
  .data-spine{opacity:.3;}
}
`;

/* ============================ environment world =========================== */

/** Siluet kilang: kolom distilasi, vessel, boiler, pipe rack, flare, tangki. */
function PlantSkyline() {
  return (
    <svg
      className="plant-svg"
      viewBox="0 0 1200 420"
      preserveAspectRatio="xMidYMax meet"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="flareGrad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.85" />
          <stop offset="60%" stopColor="#FBBF24" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#FDE68A" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* latar jauh */}
      <g className="plant-far">
        <rect x="40" y="250" width="70" height="130" rx="4" />
        <rect x="126" y="286" width="46" height="94" rx="4" />
        <rect x="1030" y="262" width="60" height="118" rx="4" />
        <rect x="1104" y="300" width="40" height="80" rx="4" />
      </g>

      {/* tangki timbun */}
      <g className="plant-soft">
        <path d="M180 380 v-84 a58 20 0 0 1 116 0 v84 z" />
        <path d="M312 380 v-62 a44 16 0 0 1 88 0 v62 z" />
      </g>
      <path className="plant-line" d="M186 340 H290 M318 332 H394" />

      {/* kolom distilasi */}
      <g className="plant-body">
        <path d="M436 380 V172 a26 26 0 0 1 52 0 V380 z" />
      </g>
      <path
        className="plant-line"
        d="M436 210 H488 M436 244 H488 M436 278 H488 M436 312 H488 M424 226 H500 M424 294 H500"
      />

      {/* boiler + steam drum + stack */}
      <g className="plant-body">
        <rect x="548" y="228" width="168" height="152" rx="10" />
        <rect x="562" y="188" width="140" height="34" rx="17" />
        <path d="M742 380 V128 h34 V380 z" />
      </g>
      <path className="plant-line" d="M580 260 H684 M580 292 H684 M580 324 H684 M702 205 H742 M742 150 h34" />
      <ellipse className="steam" cx="759" cy="120" rx="16" ry="11" />
      <ellipse className="steam" cx="765" cy="112" rx="12" ry="8" style={vars({ animationDelay: "2.4s" })} />

      {/* vessel horizontal di atas saddle */}
      <g className="plant-body">
        <rect x="808" y="286" width="176" height="66" rx="33" />
        <path d="M842 352 l-12 28 h40 z M950 352 l-12 28 h40 z" />
      </g>
      <path className="plant-line" d="M808 319 H984 M896 286 V256 H742" />

      {/* pipe rack */}
      <path
        className="plant-line"
        d="M0 398 H1200 M120 398 V356 M300 398 V356 M520 398 V356 M700 398 V356 M900 398 V356 M1080 398 V356 M60 364 H1160 M60 376 H1160"
      />

      {/* flare stack */}
      <g className="plant-body">
        <path d="M1150 380 V96 h16 V380 z" />
      </g>
      <path className="flare" d="M1158 92 c-16 -22 -6 -40 0 -54 c8 16 18 30 0 54 z" />
      <path className="plant-line" d="M1142 200 h32 M1142 260 h32 M1142 320 h32" />
    </svg>
  );
}

/** Lingkungan berkelanjutan: plant → loop instrumen → panel kontrol → jaringan → data → AI → operasi → otomasi → bisnis. */
function IndustrialWorld() {
  return (
    <div className="world-stack" aria-hidden="true">
      <div className="wl wl-sky" />

      {/* STAGE 01 · area plant */}
      <div className="wl wl-plant">
        <div className="fx-sun" />
        <div className="fx-ground" />
        <PlantSkyline />
        <div className="fx-haze" />
      </div>

      {/* STAGE 02 · loop instrumentasi (gaya P&ID) */}
      <div className="wl wl-pid">
        <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false">
          {[
            "M-5 24 H30 V52 H68 V78 H105",
            "M-5 62 H22 V34 H58 V14 H105",
            "M-5 86 H44 V66 H86 V44 H105",
          ].map((d, i) => (
            <g key={i}>
              <path className="pid-line" d={d} />
              <path className="pid-signal" d={d} style={vars({ animationDelay: `${i * 1.2}s` })} />
            </g>
          ))}
        </svg>
      </div>

      {/* STAGE 03 · panel kontrol */}
      <div className="wl wl-control">
        <span className="fx-panel" style={vars({ left: "7%", top: "20%", width: "22%", height: "28%" })} />
        <span className="fx-panel" style={vars({ right: "8%", top: "24%", width: "20%", height: "24%" })} />
        <span className="fx-panel" style={vars({ left: "12%", bottom: "16%", width: "24%", height: "18%" })} />
        {[28, 34, 40].map((top) => (
          <span key={top} className="fx-trend" style={vars({ top: `${top}%` })} />
        ))}
      </div>

      {/* STAGE 04 · jaringan */}
      <div className="wl wl-net">
        <div className="fx-mesh" />
        {[20, 44, 68, 86].map((top, i) => (
          <span key={top} className="fx-beam" style={vars({ top: `${top}%`, animationDelay: `${i * 1.8}s` })} />
        ))}
      </div>

      {/* STAGE 05 · historian */}
      <div className="wl wl-data">
        {[
          { left: "9%", width: "7%", height: "24%" },
          { left: "20%", width: "6%", height: "32%" },
          { right: "11%", width: "7%", height: "28%" },
          { right: "22%", width: "6%", height: "20%" },
        ].map((rack, i) => (
          <span key={i} className="fx-rack" style={vars(rack)} />
        ))}
        {[24, 50, 76].map((left, i) => (
          <span key={left} className="fx-column" style={vars({ left: `${left}%`, animationDelay: `${i * 1.4}s` })} />
        ))}
      </div>

      {/* STAGE 06 · AI */}
      <div className="wl wl-neural">
        <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false">
          {[
            [14, 24, 50, 48],
            [26, 70, 50, 48],
            [78, 20, 50, 48],
            [86, 74, 50, 48],
            [50, 10, 50, 48],
            [46, 90, 50, 48],
            [14, 24, 50, 10],
            [86, 74, 46, 90],
          ].map(([x1, y1, x2, y2], i) => (
            <line
              key={i}
              className="neural-link"
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              style={vars({ animationDelay: `${i * 0.5}s` })}
            />
          ))}
          {[
            [14, 24],
            [26, 70],
            [78, 20],
            [86, 74],
            [50, 10],
            [46, 90],
            [50, 48],
          ].map(([cx, cy], i) => (
            <circle
              key={i}
              className="neural-node"
              cx={cx}
              cy={cy}
              r={2.4}
              style={vars({ animationDelay: `${i * 0.55}s` })}
            />
          ))}
        </svg>
      </div>

      {/* STAGE 07 · operations center */}
      <div className="wl wl-ops">
        <span className="fx-holo" style={vars({ left: "6%", top: "18%", width: "20%", height: "30%" })} />
        <span className="fx-holo" style={vars({ right: "7%", top: "22%", width: "18%", height: "26%" })} />
        <span className="fx-holo" style={vars({ left: "10%", bottom: "14%", width: "24%", height: "20%" })} />
        <span className="fx-holo" style={vars({ right: "11%", bottom: "16%", width: "22%", height: "24%" })} />
        <div className="fx-sweep" />
      </div>

      {/* STAGE 08 · automation */}
      <div className="wl wl-auto">
        <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false">
          {["M50 -5 L50 30 L18 30 L18 72", "M50 -5 L50 30 L82 30 L82 68", "M18 72 L50 72 L50 105", "M82 68 L50 68"].map(
            (d, i) => (
              <g key={i}>
                <path className="flow-track" d={d} />
                <path className="flow-packet" d={d} style={vars({ animationDelay: `${i * 0.95}s` })} />
              </g>
            )
          )}
        </svg>
      </div>

      {/* STAGE 09 · business */}
      <div className="wl wl-biz">
        <div className="fx-dawn" />
        <div className="fx-skyline">
          {[
            { left: "7%", width: "5%", height: "46%" },
            { left: "15%", width: "7%", height: "70%" },
            { left: "25%", width: "5%", height: "54%" },
            { left: "34%", width: "8%", height: "86%" },
            { left: "46%", width: "6%", height: "60%" },
            { left: "56%", width: "9%", height: "76%" },
            { left: "69%", width: "5%", height: "48%" },
            { left: "77%", width: "7%", height: "66%" },
            { left: "88%", width: "6%", height: "42%" },
          ].map((tower, i) => (
            <span key={i} className="fx-tower" style={vars(tower)} />
          ))}
        </div>
      </div>

      <div className="wl wl-veil" />
    </div>
  );
}

function DataSpine() {
  const path = "M30 -40 C 4 80, 56 180, 30 300 S 4 480, 30 600 S 56 760, 30 880 S 4 1020, 30 1140";
  return (
    <svg className="data-spine" viewBox="0 0 60 1100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="spineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1D4ED8" />
          <stop offset="50%" stopColor="#0EA5E9" />
          <stop offset="100%" stopColor="#93C5FD" />
        </linearGradient>
      </defs>
      <path className="spine-base" d={path} />
      <path className="spine-dots spine-dots--slow" d={path} />
      <path className="spine-dots" d={path} />
    </svg>
  );
}

/* ---------------------------- transition bridge --------------------------- */

type BridgeNode = { label: string; sub?: string };

function FlowBridge({ nodes }: { nodes: BridgeNode[] }) {
  const width = 300;
  const height = 400;
  const top = 34;
  const gap = (height - top * 2) / (nodes.length - 1);

  const points = nodes.map((node, i) => ({ ...node, x: i % 2 === 0 ? 86 : 214, y: top + i * gap }));

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const next = points[i];
    d += ` C ${prev.x} ${prev.y + gap * 0.55}, ${next.x} ${next.y - gap * 0.55}, ${next.x} ${next.y}`;
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full max-w-[300px]"
      role="img"
      aria-label={`Alur: ${nodes.map((n) => n.label).join(" ke ")}`}
    >
      <path className="bridge-base" d={d} />
      <path className="bridge-flow" d={d} />
      {points.map((point, i) => {
        const left = i % 2 === 0;
        return (
          <g key={point.label}>
            <circle
              className="bridge-node"
              cx={point.x}
              cy={point.y}
              r={13}
              fill="rgba(37,99,235,.10)"
              stroke="rgba(37,99,235,.45)"
              style={vars({ animationDelay: `${i * 0.55}s` })}
            />
            <circle cx={point.x} cy={point.y} r={4.5} fill="#2563EB" />
            <text
              className="bridge-label"
              x={left ? point.x + 26 : point.x - 26}
              y={point.y + (point.sub ? -1 : 4)}
              textAnchor={left ? "start" : "end"}
            >
              {point.label}
            </text>
            {point.sub && (
              <text
                className="bridge-sub"
                x={left ? point.x + 26 : point.x - 26}
                y={point.y + 13}
                textAnchor={left ? "start" : "end"}
              >
                {point.sub}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function StoryTransition({
  from,
  to,
  title,
  nodes,
}: {
  from: string;
  to: string;
  title: string;
  nodes: BridgeNode[];
}) {
  return (
    <section data-scene className="relative flex min-h-[86vh] items-center px-5 py-16 sm:px-8">
      <div className="mx-auto grid w-full max-w-4xl items-center gap-10 sm:grid-cols-[1fr_auto]">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 font-mono text-[10px] tracking-[0.18em] text-slate-500 backdrop-blur">
            {from}
            <i className="ri-arrow-right-line text-blue-600" aria-hidden="true" />
            {to}
          </span>
          <p className="mt-5 max-w-sm text-xl font-bold leading-snug text-slate-900 sm:text-2xl">{title}</p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-500">
            {nodes.map((n) => n.label).join(" → ")}
          </p>
        </Reveal>

        <Reveal delay={120} className="mx-auto w-full max-w-[300px]">
          <FlowBridge nodes={nodes} />
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------ sub sections ------------------------------ */

function StageRail() {
  const [active, setActive] = useState("hero");

  useEffect(() => {
    const elements = PIPELINE.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => Boolean(el)
    );
    if (!elements.length || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        let best: IntersectionObserverEntry | null = null;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          if (best === null || entry.intersectionRatio > best.intersectionRatio) best = entry;
        }
        if (best) setActive(best.target.id);
      },
      { threshold: [0.2, 0.45, 0.7], rootMargin: "-25% 0px -25% 0px" }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      aria-label="Tahapan alur data"
      className="fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-1 xl:flex"
    >
      {PIPELINE.map((stage) => {
        const on = active === stage.id;
        return (
          <a
            key={stage.id}
            href={`#${stage.id}`}
            aria-label={`Lompat ke bagian ${stage.short}`}
            aria-current={on ? "true" : undefined}
            className="group flex items-center justify-end gap-3 rounded-full py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            <span
              className={`font-mono text-[10px] font-semibold tracking-[0.16em] transition-all duration-500 ${
                on
                  ? "text-blue-600 opacity-100"
                  : "text-slate-400 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
              }`}
            >
              {stage.short.toUpperCase()}
            </span>
            <span
              className={`block rounded-full transition-all duration-500 ${
                on ? "h-2.5 w-2.5 bg-blue-600 shadow-[0_0_0_4px_rgba(37,99,235,.14)]" : "h-1.5 w-1.5 bg-slate-300"
              }`}
            />
          </a>
        );
      })}
    </nav>
  );
}

function HeroPipeline() {
  return (
    <div className="relative mx-auto w-full max-w-sm sm:max-w-md [perspective:1200px]">
      <div className="relative flex flex-col items-stretch [transform-style:preserve-3d] [transform:rotateX(14deg)] sm:[transform:rotateX(16deg)_rotateY(-5deg)]">
        {PIPELINE.map((stage, i) => (
          <div key={stage.id} className="[transform-style:preserve-3d]">
            <div
              className="floaty node-3d relative flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-2.5 shadow-[0_18px_40px_-30px_rgba(15,23,42,.6)]"
              style={vars({
                animationDelay: `${i * 0.32}s`,
                transform: `translateZ(${(PIPELINE.length - i) * 5}px)`,
              })}
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
                <i className={`${stage.icon} text-base`} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-mono text-[10px] font-bold tracking-[0.14em] text-slate-900">
                  {stage.label}
                </span>
                <span className="block truncate text-[11px] text-slate-500">{stage.note}</span>
              </span>
              <span className="shrink-0 rounded-md bg-slate-50 px-1.5 py-0.5 font-mono text-[9px] tracking-[0.08em] text-slate-400">
                {stage.level}
              </span>
            </div>

            {i < PIPELINE.length - 1 && (
              <div className="rail-line relative mx-auto h-5 w-px">
                <span
                  className="dot-down absolute left-1/2 top-0 h-1.5 w-1.5 rounded-full bg-blue-500"
                  style={vars({ "--dist": "20px", animationDelay: `${i * 0.32}s` })}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div
        className="halo pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(191,219,254,.75),transparent_66%)] blur-2xl"
        aria-hidden="true"
      />
    </div>
  );
}

/** Boiler + vessel dengan balloon instrumen ISA-5.1 dan sinyal menuju junction box. */
function FieldVisual() {
  const balloons = [
    { tag: "PT", num: "101", x: 118, y: 96 },
    { tag: "LT", num: "105", x: 34, y: 150 },
    { tag: "TT", num: "204", x: 296, y: 112 },
    { tag: "FT", num: "312", x: 26, y: 276 },
    { tag: "AT", num: "220", x: 208, y: 52 },
    { tag: "VT", num: "410", x: 392, y: 302 },
  ];

  return (
    <div className="relative mx-auto w-full max-w-lg">
      <svg
        viewBox="0 0 460 390"
        className="h-auto w-full"
        role="img"
        aria-label="Diagram boiler dan vessel dengan instrumen lapangan"
      >
        {/* boiler furnace */}
        <rect x="46" y="170" width="140" height="150" rx="12" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.5" />
        <path d="M62 300 h34 v18 h-34 z" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1.2" />
        <path d="M70 300 c-8 -12 -3 -22 0 -30 c5 9 10 17 0 30 z" fill="#F59E0B" opacity="0.85" className="flicker" />
        <text x="116" y="256" textAnchor="middle" fill="#94A3B8" fontSize="10" fontFamily="ui-monospace, monospace">
          BOILER-01
        </text>

        {/* steam drum */}
        <rect x="56" y="130" width="130" height="34" rx="17" fill="#EFF6FF" stroke="#2563EB" strokeWidth="1.5" />
        <text x="121" y="152" textAnchor="middle" fill="#1D4ED8" fontSize="10" fontWeight="600" fontFamily="ui-monospace, monospace">
          STEAM DRUM
        </text>

        {/* stack */}
        <path d="M196 320 V70 h26 V320 z" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.5" />
        <ellipse className="steam" cx="209" cy="62" rx="13" ry="9" fill="#E2E8F0" />

        {/* pipa steam menuju vessel */}
        <path d="M186 147 H250 V110 H352" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
        <path
          className="spoke-flow"
          d="M186 147 H250 V110 H352"
          vectorEffect="non-scaling-stroke"
          style={vars({ animationDuration: "3.6s" })}
        />

        {/* feedwater */}
        <path d="M0 292 H46" fill="none" stroke="#0EA5E9" strokeWidth="2" strokeLinecap="round" />

        {/* vessel horizontal */}
        <rect x="300" y="200" width="150" height="62" rx="31" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.5" />
        <path d="M330 262 l-10 26 h34 z M420 262 l-10 26 h34 z" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="1.2" />
        <path d="M352 110 V200" fill="none" stroke="#2563EB" strokeWidth="2" />
        <text x="375" y="236" textAnchor="middle" fill="#94A3B8" fontSize="10" fontFamily="ui-monospace, monospace">
          V-102
        </text>

        {/* pompa BFW */}
        <circle cx="404" cy="322" r="15" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.5" />
        <path d="M404 307 a15 15 0 0 1 15 15 h-15 z" fill="#DBEAFE" />
        <text x="404" y="352" textAnchor="middle" fill="#94A3B8" fontSize="9" fontFamily="ui-monospace, monospace">
          P-201A
        </text>

        {/* junction box */}
        <rect x="186" y="348" width="96" height="30" rx="6" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="1.3" />
        <text x="234" y="367" textAnchor="middle" fill="#64748B" fontSize="9" letterSpacing="1" fontFamily="ui-monospace, monospace">
          JUNCTION BOX
        </text>

        {/* sinyal instrumen menuju junction box */}
        {balloons.map((b, i) => {
          const d = `M ${b.x} ${b.y + 14} C ${b.x} ${b.y + 90}, 234 ${b.y + 120}, 234 348`;
          return (
            <g key={b.tag + b.num}>
              <path className="pid-line" d={d} vectorEffect="non-scaling-stroke" />
              <path
                className="spoke-flow"
                d={d}
                vectorEffect="non-scaling-stroke"
                style={vars({ animationDelay: `${i * 0.4}s` })}
              />
            </g>
          );
        })}

        {/* balloon instrumen */}
        {balloons.map((b) => (
          <g key={`b-${b.tag}${b.num}`}>
            <circle cx={b.x} cy={b.y} r="15" fill="#FFFFFF" stroke="#2563EB" strokeWidth="1.6" />
            <line x1={b.x - 15} y1={b.y} x2={b.x + 15} y2={b.y} stroke="#2563EB" strokeWidth="1" />
            <text x={b.x} y={b.y - 3} textAnchor="middle" fill="#1D4ED8" fontSize="9" fontWeight="700" fontFamily="ui-monospace, monospace">
              {b.tag}
            </text>
            <text x={b.x} y={b.y + 11} textAnchor="middle" fill="#64748B" fontSize="9" fontFamily="ui-monospace, monospace">
              {b.num}
            </text>
          </g>
        ))}

        {/* keluar menuju control system */}
        <path d="M282 363 H460" fill="none" stroke="#2563EB" strokeWidth="2" strokeDasharray="6 6" />
        <text x="372" y="356" textAnchor="middle" fill="#64748B" fontSize="9" letterSpacing="1" fontFamily="ui-monospace, monospace">
          KE MARSHALLING → PLC / DCS
        </text>
      </svg>
    </div>
  );
}

/** Faceplate controller (boiler controller) + status interlock BMS. */
function ControlVisual() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="glass rounded-[2rem] p-5">
        <div className="mb-4 flex items-center justify-between border-b border-slate-200/70 pb-3">
          <span className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600 text-white">
              <i className="ri-cpu-line" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-bold text-slate-900">Boiler Controller</span>
              <span className="block font-mono text-[10px] tracking-[0.16em] text-slate-400">DCS · BMS · L1–L2</span>
            </span>
          </span>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-mono text-[10px] tracking-[0.12em] text-emerald-600">
            IN SERVICE
          </span>
        </div>

        <div className="space-y-2.5">
          {CONTROL_LOOPS.map((loop, i) => (
            <div key={loop.tag} className="rounded-xl border border-slate-100 bg-white px-3.5 py-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-bold text-blue-600">{loop.tag}</span>
                  <span className="text-[12px] text-slate-600">{loop.name}</span>
                </span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] tracking-[0.1em] text-slate-500">
                  {loop.mode}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-[auto_auto_1fr] items-center gap-3">
                <span className="font-mono text-[11px] text-slate-400">
                  SP <span className="text-slate-600">{loop.sp}</span>
                </span>
                <span className="font-mono text-[11px] text-slate-400">
                  PV <span className="font-semibold text-slate-900">{loop.pv}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <span
                      className="block h-full rounded-full bg-gradient-to-r from-blue-600 to-sky-400"
                      style={vars({ width: `${loop.out}%`, transitionDelay: `${i * 80}ms` })}
                    />
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">OUT {loop.out}%</span>
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5">
          <span className="font-mono text-[10px] tracking-[0.18em] text-slate-400">BURNER MANAGEMENT SYSTEM</span>
          <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
            {BMS_INTERLOCKS.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <i className="ri-shield-check-line text-emerald-500" aria-hidden="true" />
                <span className="flex-1 truncate text-[12px] text-slate-600">{item.name}</span>
                <span className="font-mono text-[10px] font-semibold text-emerald-600">{item.state}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        className="halo pointer-events-none absolute -inset-8 -z-10 rounded-[3rem] bg-[radial-gradient(circle,rgba(191,219,254,.7),transparent_70%)] blur-2xl"
        aria-hidden="true"
      />
    </div>
  );
}

function GatewayVisual() {
  return (
    <div className="relative w-full [perspective:1300px]">
      <div className="relative grid grid-cols-1 items-center gap-6 sm:grid-cols-[1fr_auto_1fr] sm:gap-3">
        <div className="flex flex-col gap-2.5">
          {GATEWAY_IN.map((item, i) => (
            <div
              key={item.name}
              className="floaty flex items-center gap-2.5 rounded-xl border border-slate-100 bg-white px-3 py-2 shadow-sm"
              style={vars({ animationDelay: `${i * 0.4}s`, animationDuration: "10s" })}
            >
              <i className={`${item.icon} text-blue-600`} aria-hidden="true" />
              <span className="min-w-0">
                <span className="block truncate text-[12px] font-semibold text-slate-900">{item.name}</span>
                <span className="block truncate text-[10px] text-slate-500">{item.desc}</span>
              </span>
            </div>
          ))}
        </div>

        <div className="relative mx-auto my-2 [transform-style:preserve-3d] sm:my-0">
          <div
            className="halo absolute -inset-10 -z-10 rounded-full bg-[radial-gradient(circle,rgba(191,219,254,.85),transparent_68%)] blur-2xl"
            aria-hidden="true"
          />
          <div className="floaty relative h-40 w-32 rounded-2xl border border-blue-100 bg-white shadow-[0_28px_60px_-36px_rgba(15,23,42,.7)] [transform:rotateY(-14deg)_rotateX(5deg)]">
            <div className="flex h-full flex-col items-center justify-between p-3">
              <div className="flex w-full items-center justify-between">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="font-mono text-[9px] tracking-[0.18em] text-slate-400">GW-01</span>
              </div>
              <i className="ri-router-line text-4xl text-blue-600" aria-hidden="true" />
              <div className="w-full space-y-1">
                {[70, 45, 88].map((w, i) => (
                  <span key={i} className="block h-1 rounded-full bg-blue-100">
                    <span className="block h-full rounded-full bg-blue-500" style={vars({ width: `${w}%` })} />
                  </span>
                ))}
              </div>
              <div className="flex w-full justify-between">
                {Array.from({ length: 6 }).map((_, i) => (
                  <span
                    key={i}
                    className="halo h-1.5 w-1.5 rounded-full bg-sky-400"
                    style={vars({ animationDelay: `${i * 0.26}s` })}
                  />
                ))}
              </div>
            </div>
          </div>
          <span className="mt-3 block text-center font-mono text-[10px] tracking-[0.2em] text-blue-600">
            EDGE GATEWAY
          </span>
          <span className="mt-1 block text-center font-mono text-[9px] tracking-[0.16em] text-slate-400">
            ZONA DMZ · L2.5
          </span>

          <div
            className="pointer-events-none absolute left-[-14%] top-1/2 hidden h-px w-[14%] bg-gradient-to-r from-transparent to-blue-300 sm:block"
            aria-hidden="true"
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="dot-right absolute left-0 top-1/2 h-1.5 w-1.5 rounded-full bg-blue-500"
                style={vars({ "--dist": "100%", animationDelay: `${i * 1.05}s` })}
              />
            ))}
          </div>
          <div
            className="pointer-events-none absolute right-[-14%] top-1/2 hidden h-px w-[14%] bg-gradient-to-r from-sky-300 to-transparent sm:block"
            aria-hidden="true"
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="dot-right absolute left-0 top-1/2 h-1.5 w-1.5 rounded-full bg-sky-500"
                style={vars({ "--dist": "100%", animationDelay: `${0.5 + i * 1.05}s` })}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          {GATEWAY_OUT.map((item, i) => (
            <div
              key={item.name}
              className="floaty flex items-center gap-2.5 rounded-xl border border-slate-100 bg-white px-3 py-2 shadow-sm"
              style={vars({ animationDelay: `${0.5 + i * 0.4}s`, animationDuration: "10s" })}
            >
              <i className={`${item.icon} text-sky-600`} aria-hidden="true" />
              <span className="min-w-0">
                <span className="block truncate text-[12px] font-semibold text-slate-900">{item.name}</span>
                <span className="block truncate text-[10px] text-slate-500">{item.desc}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HistorianVisual() {
  const radius = 44;
  return (
    <div className="relative mx-auto w-full max-w-md [perspective:1100px]">
      <div className="relative mx-auto h-[360px] w-full">
        <div className="absolute inset-0">
          {HISTORIAN_TOPICS.map((topic, i) => {
            const angle = (i / HISTORIAN_TOPICS.length) * Math.PI * 2 - Math.PI / 2;
            const x = 50 + Math.cos(angle) * radius;
            const y = 50 + Math.sin(angle) * (radius * 0.62);
            return (
              <span
                key={topic}
                className="floaty absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-slate-200 bg-white px-2.5 py-1 font-mono text-[10px] tracking-[0.1em] text-slate-600 shadow-sm"
                style={vars({ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 0.45}s`, animationDuration: "9.5s" })}
              >
                {topic}
              </span>
            );
          })}
        </div>

        <div className="rail-line pointer-events-none absolute left-1/2 top-[14%] h-[26%] w-px" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="dot-down absolute left-1/2 top-0 h-1.5 w-1.5 rounded-full bg-blue-500"
              style={vars({ "--dist": "86px", animationDelay: `${i * 0.56}s` })}
            />
          ))}
        </div>

        <div className="absolute left-1/2 top-[44%] w-52 -translate-x-1/2">
          <div
            className="halo absolute -inset-10 -z-10 rounded-full bg-[radial-gradient(circle,rgba(191,219,254,.8),transparent_66%)] blur-2xl"
            aria-hidden="true"
          />
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="relative mx-auto h-[62px] w-52 rounded-[50%_/_26%] border border-blue-100 bg-gradient-to-b from-white to-blue-50 shadow-[0_16px_36px_-24px_rgba(15,23,42,.6)]"
              style={vars({ marginTop: i === 0 ? 0 : "-18px", zIndex: 3 - i })}
            >
              <div className="absolute inset-x-3 top-1.5 h-4 rounded-[50%] bg-white/80" />
              <div className="absolute inset-x-6 bottom-4 flex items-center justify-between">
                <span className="halo h-1.5 w-1.5 rounded-full bg-blue-500" style={vars({ animationDelay: `${i * 0.4}s` })} />
                <span className="h-px w-16 bg-blue-100" />
                <span
                  className="halo h-1.5 w-1.5 rounded-full bg-sky-400"
                  style={vars({ animationDelay: `${0.2 + i * 0.4}s` })}
                />
              </div>
            </div>
          ))}
          <div className="mt-3 text-center">
            <span className="font-mono text-[10px] tracking-[0.2em] text-slate-400">TIME-SERIES HISTORIAN</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LiveStream() {
  const { ref, active } = useActiveInView<HTMLDivElement>();
  const reduced = useReducedMotion();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!active || reduced) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1500);
    return () => window.clearInterval(id);
  }, [active, reduced]);

  const baseSeconds = 6 * 3600 + 12 * 60 + 1;
  const rows = [0, 1, 2, 3].map((i) => {
    const total = baseSeconds + tick + i;
    const h = Math.floor(total / 3600) % 24;
    const m = Math.floor(total / 60) % 60;
    const s = total % 60;
    const pad = (n: number) => String(n).padStart(2, "0");
    return {
      time: `${pad(h)}:${pad(m)}:${pad(s)}`,
      value: (18.5 + ((tick + i) % 7) * 0.02).toFixed(2),
    };
  });

  return (
    <div ref={ref} className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
        <span className="font-mono text-[10px] tracking-[0.2em] text-slate-500">INGEST · BOILER-01</span>
        <span className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="ping-ring absolute inline-flex h-full w-full rounded-full bg-blue-400" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
          </span>
          <span className="font-mono text-[10px] tracking-[0.14em] text-blue-600">WRITING</span>
        </span>
      </div>
      <div className="divide-y divide-slate-100">
        {rows.map((row, i) => (
          <div
            key={row.time}
            className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-2 font-mono text-[11px]"
            style={vars({ opacity: 1 - i * 0.14 })}
          >
            <span className="text-blue-600">{row.time}</span>
            <span className="truncate text-slate-500">BLR01.PT101.PV</span>
            <span className="flex items-center gap-2">
              <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] tracking-[0.1em] text-emerald-600">
                GOOD
              </span>
              <span className="font-semibold text-slate-900">{row.value} barg</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AiOrb() {
  const radius = 40;
  return (
    <div className="relative mx-auto h-[340px] w-full max-w-md [perspective:1100px]">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {AI_NODES.map((node, i) => {
          const angle = (i / AI_NODES.length) * Math.PI * 2 - Math.PI / 2;
          const x = 50 + Math.cos(angle) * radius;
          const y = 50 + Math.sin(angle) * (radius * 0.72);
          const d = `M ${x.toFixed(2)} ${y.toFixed(2)} L 50 50`;
          return (
            <g key={node}>
              <path className="spoke" d={d} vectorEffect="non-scaling-stroke" />
              <path
                className="spoke-flow"
                d={d}
                vectorEffect="non-scaling-stroke"
                style={vars({ animationDelay: `${i * 0.48}s` })}
              />
            </g>
          );
        })}
      </svg>

      {AI_NODES.map((node, i) => {
        const angle = (i / AI_NODES.length) * Math.PI * 2 - Math.PI / 2;
        const x = 50 + Math.cos(angle) * radius;
        const y = 50 + Math.sin(angle) * (radius * 0.72);
        return (
          <span
            key={node}
            className="floaty absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-200 bg-white px-3 py-1 font-mono text-[10px] tracking-[0.1em] text-slate-600 shadow-sm"
            style={vars({ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 0.5}s`, animationDuration: "10s" })}
          >
            {node}
          </span>
        );
      })}

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative h-44 w-44">
          <div className="spin-slower absolute inset-0 rounded-full border border-blue-200 [transform:rotateX(72deg)]" />
          <div className="spin-reverse absolute inset-2 rounded-full border border-sky-200 [transform:rotateX(64deg)_rotateY(18deg)]" />
          <div className="spin-slow absolute inset-6 rounded-full border border-dashed border-blue-200" />
          <div className="halo absolute inset-8 rounded-full bg-[radial-gradient(circle_at_35%_30%,#FFFFFF,rgba(147,197,253,.9)_45%,rgba(37,99,235,.55)_78%)] shadow-[0_18px_40px_-20px_rgba(37,99,235,.9)]" />
          <div className="absolute inset-0 grid place-items-center">
            <i className="ri-sparkling-2-line text-3xl text-white drop-shadow" aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatPanel() {
  const { ref, active } = useActiveInView<HTMLDivElement>();
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(0);
  const [typingIdx, setTypingIdx] = useState(-1);
  const [typed, setTyped] = useState("");
  const [thinking, setThinking] = useState(false);

  useEffect(() => {
    if (!active) return;
    if (reduced) {
      setVisible(CHAT.length);
      setTypingIdx(-1);
      setThinking(false);
      return;
    }

    let stopped = false;
    let index = 0;
    const timers: number[] = [];
    let typer: number | null = null;

    const reset = () => {
      setVisible(0);
      setTyped("");
      setTypingIdx(-1);
      setThinking(false);
    };

    const step = () => {
      if (stopped) return;

      if (index >= CHAT.length) {
        timers.push(
          window.setTimeout(() => {
            if (stopped) return;
            index = 0;
            reset();
            timers.push(window.setTimeout(step, 900));
          }, 4600)
        );
        return;
      }

      const message = CHAT[index];

      if (message.role === "user") {
        setVisible(index + 1);
        index += 1;
        timers.push(window.setTimeout(step, 1000));
        return;
      }

      setThinking(true);
      timers.push(
        window.setTimeout(() => {
          if (stopped) return;
          setThinking(false);
          setTypingIdx(index);
          setTyped("");
          setVisible(index + 1);

          let chars = 0;
          typer = window.setInterval(() => {
            chars += 1;
            setTyped(message.text.slice(0, chars));
            if (chars >= message.text.length) {
              if (typer !== null) window.clearInterval(typer);
              typer = null;
              index += 1;
              timers.push(window.setTimeout(step, 1400));
            }
          }, 24);
        }, 1200)
      );
    };

    reset();
    timers.push(window.setTimeout(step, 600));

    return () => {
      stopped = true;
      timers.forEach((t) => window.clearTimeout(t));
      if (typer !== null) window.clearInterval(typer);
    };
  }, [active, reduced]);

  return (
    <div ref={ref} className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-[0_30px_70px_-50px_rgba(15,23,42,.8)]">
      <div className="flex items-center justify-between border-b border-slate-100 bg-blue-600 px-4 py-3">
        <span className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-white/20 text-white">
            <i className="ri-robot-2-line text-lg" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-sm font-bold text-white">TeriotBot AI</span>
            <span className="block text-[11px] text-blue-100">Plant Assistant</span>
          </span>
        </span>
        <span className="font-mono text-[10px] tracking-[0.16em] text-blue-100">ONLINE</span>
      </div>

      <div className="min-h-[300px] space-y-3 bg-slate-50 p-4">
        {CHAT.slice(0, visible).map((message, i) => {
          const isUser = message.role === "user";
          const text = i === typingIdx ? typed : message.text;
          return (
            <div key={`${message.role}-${i}`} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[86%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                  isUser
                    ? "rounded-br-sm bg-blue-600 text-white"
                    : "rounded-bl-sm border border-slate-200 bg-white text-slate-700 shadow-sm"
                }`}
              >
                {text}
                {i === typingIdx && text.length < message.text.length && (
                  <span className="caret ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 bg-blue-500" />
                )}
              </div>
            </div>
          );
        })}

        {thinking && (
          <div className="flex justify-start">
            <div className="think flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              <span className="ml-1 font-mono text-[10px] tracking-[0.14em] text-slate-400">MEMBACA HISTORIAN</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-slate-100 bg-white px-4 py-3">
        <span className="flex-1 truncate text-[12px] text-slate-400">Tanya kondisi boiler, vessel, atau utilitas…</span>
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600 text-white" aria-hidden="true">
          <i className="ri-send-plane-fill text-sm" />
        </span>
      </div>
    </div>
  );
}

function DashboardMock() {
  const { ref, inView } = useInView<HTMLDivElement>(0.18);

  const circumference = 2 * Math.PI * 52;
  const efficiency = 0.894;

  const points = EFFICIENCY_TREND.map((value, i) => {
    const x = (i / (EFFICIENCY_TREND.length - 1)) * 300 + 10;
    const y = 112 - ((value - 86) / 5) * 92;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <div ref={ref} className="mx-auto w-full max-w-5xl [perspective:1400px]">
      <div className="dash-stage relative rounded-[2rem] border border-slate-100 bg-white p-4 shadow-[0_50px_110px_-60px_rgba(15,23,42,.8)] sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 text-white">
              <i className="ri-dashboard-3-line" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-bold text-slate-900">Utility & Boiler Monitoring</span>
              <span className="block font-mono text-[10px] tracking-[0.16em] text-slate-400">
                PLANT 1 · UTILITY AREA
              </span>
            </span>
          </div>
          <span className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1">
            <span className="relative flex h-2 w-2">
              <span className="ping-ring absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="font-mono text-[10px] tracking-[0.16em] text-emerald-600">REALTIME</span>
          </span>
        </div>

        <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
          <div className="flex flex-row items-center gap-5 lg:flex-col">
            <div className="relative h-32 w-32 shrink-0">
              <svg viewBox="0 0 120 120" className="h-32 w-32 -rotate-90" aria-hidden="true">
                <circle cx="60" cy="60" r="52" fill="none" stroke="#E2E8F0" strokeWidth="10" />
                <defs>
                  <linearGradient id="effGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#1D4ED8" />
                    <stop offset="100%" stopColor="#38BDF8" />
                  </linearGradient>
                </defs>
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke="url(#effGrad)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={inView ? circumference * (1 - efficiency) : circumference}
                  style={{ transition: "stroke-dashoffset 2s cubic-bezier(.22,1,.36,1)" }}
                />
              </svg>
              <div className="absolute inset-0 grid place-items-center">
                <span className="block text-center">
                  <span className="block text-2xl font-extrabold text-slate-900">89,4%</span>
                  <span className="block font-mono text-[9px] tracking-[0.18em] text-slate-400">EFISIENSI</span>
                </span>
              </div>
            </div>

            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-1">
              {[
                { label: "Availability", value: "97,2%", w: 97 },
                { label: "Steam output", value: "42,6 t/h", w: 85 },
                { label: "Fuel spesifik", value: "68,4 Nm³/t", w: 72 },
              ].map((kpi) => (
                <div key={kpi.label} className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">{kpi.label}</span>
                    <span className="text-[13px] font-bold text-slate-900">{kpi.value}</span>
                  </div>
                  <span className="mt-1.5 block h-1 w-full overflow-hidden rounded-full bg-slate-200">
                    <span
                      className="block h-full rounded-full bg-gradient-to-r from-blue-600 to-sky-400 transition-[width] duration-[1200ms] ease-out"
                      style={vars({ width: inView ? `${kpi.w}%` : "0%" })}
                    />
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-[10px] tracking-[0.18em] text-slate-400">EFISIENSI BOILER · 12 JAM</span>
                <span className="text-[13px] font-bold text-slate-900">
                  <LiveCounter start={1024} stepBy={2} interval={2600} /> ton steam
                </span>
              </div>
              <svg
                viewBox="0 0 320 130"
                className="h-32 w-full"
                role="img"
                aria-label="Grafik efisiensi boiler 12 jam terakhir"
              >
                <defs>
                  <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#1D4ED8" />
                    <stop offset="100%" stopColor="#0EA5E9" />
                  </linearGradient>
                  <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[0, 1, 2, 3].map((i) => (
                  <line key={i} x1="10" x2="310" y1={22 + i * 30} y2={22 + i * 30} stroke="#E2E8F0" strokeWidth="1" />
                ))}
                <polygon points={`10,122 ${points.join(" ")} 310,122`} fill="url(#fillGrad)" />
                <polyline
                  className={`chart-line ${inView ? "is-in" : ""}`}
                  points={points.join(" ")}
                  fill="none"
                  stroke="url(#lineGrad)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                <span className="mb-3 block font-mono text-[10px] tracking-[0.18em] text-slate-400">
                  STEAM PER SHIFT
                </span>
                <div className="flex h-24 items-end gap-2">
                  {STEAM_SHIFT.map((h, i) => (
                    <span
                      key={i}
                      className={`bar-grow ${inView ? "is-in" : ""} w-full rounded-t-md bg-gradient-to-t from-blue-200 to-blue-600`}
                      style={vars({ height: `${h}%`, transitionDelay: `${i * 80}ms` })}
                    />
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                <span className="mb-3 block font-mono text-[10px] tracking-[0.18em] text-slate-400">
                  EQUIPMENT STATUS
                </span>
                <div className="space-y-2">
                  {EQUIPMENT.map((m) => {
                    const tone =
                      m.tone === "run"
                        ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                        : m.tone === "idle"
                        ? "bg-amber-50 text-amber-600 border-amber-200"
                        : "bg-sky-50 text-sky-600 border-sky-200";
                    return (
                      <div key={m.tag} className="flex items-center justify-between gap-2">
                        <span className="truncate font-mono text-[11px] text-slate-600">{m.tag}</span>
                        <span className={`shrink-0 rounded border px-2 py-0.5 font-mono text-[9px] tracking-[0.1em] ${tone}`}>
                          {m.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RobotVisual() {
  const radius = 42;
  const nodes = RPA_TARGETS.map((item, i) => {
    const angle = (i / RPA_TARGETS.length) * Math.PI * 2 - Math.PI / 2;
    return { ...item, x: 50 + Math.cos(angle) * radius, y: 50 + Math.sin(angle) * (radius * 0.78) };
  });

  return (
    <div className="relative mx-auto h-[380px] w-full max-w-md [perspective:1100px]">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {nodes.map((node, i) => {
          const d = `M 50 50 L ${node.x.toFixed(2)} ${node.y.toFixed(2)}`;
          return (
            <g key={node.name}>
              <path className="spoke" d={d} vectorEffect="non-scaling-stroke" />
              <path
                className="spoke-flow"
                d={d}
                vectorEffect="non-scaling-stroke"
                style={vars({ animationDelay: `${i * 0.4}s` })}
              />
            </g>
          );
        })}
      </svg>

      {nodes.map((node, i) => (
        <span
          key={node.name}
          className="floaty absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 shadow-sm"
          style={vars({ left: `${node.x}%`, top: `${node.y}%`, animationDelay: `${i * 0.42}s`, animationDuration: "10s" })}
        >
          <i className={`${node.icon} text-[12px] text-blue-600`} aria-hidden="true" />
          <span className="font-mono text-[10px] tracking-[0.08em] text-slate-600">{node.name}</span>
        </span>
      ))}

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div
          className="halo absolute -inset-12 -z-10 rounded-full bg-[radial-gradient(circle,rgba(191,219,254,.85),transparent_66%)] blur-2xl"
          aria-hidden="true"
        />
        <div className="floaty relative flex w-36 flex-col items-center">
          <span className="h-4 w-px bg-blue-300" />
          <span className="-mt-[22px] h-2 w-2 rounded-full bg-blue-500" />
          <div className="mt-4 h-16 w-24 rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_-28px_rgba(15,23,42,.8)]">
            <div className="mx-auto mt-4 flex h-8 w-[72px] items-center justify-center gap-3 rounded-xl bg-blue-600 px-3">
              <span className="halo h-2 w-4 rounded-full bg-white" />
              <span className="halo h-2 w-4 rounded-full bg-white" style={vars({ animationDelay: ".25s" })} />
            </div>
          </div>
          <div className="relative mt-2 h-24 w-32 rounded-2xl border border-slate-200 bg-white shadow-[0_22px_45px_-30px_rgba(15,23,42,.8)]">
            <div className="absolute left-1/2 top-4 h-10 w-10 -translate-x-1/2 rounded-full border border-blue-200">
              <div className="spin-slow absolute inset-1 rounded-full border border-dashed border-blue-300" />
              <div className="halo absolute inset-2.5 rounded-full bg-blue-500" />
            </div>
            <div className="absolute inset-x-5 bottom-4 space-y-1.5">
              <span className="block h-1 w-full rounded-full bg-slate-100" />
              <span className="block h-1 w-2/3 rounded-full bg-blue-400" />
            </div>
            <span className="absolute -left-4 top-3 h-12 w-3 rounded-full bg-slate-100" />
            <span className="absolute -right-4 top-3 h-12 w-3 rounded-full bg-slate-100" />
          </div>
          <span className="mt-3 font-mono text-[10px] tracking-[0.2em] text-blue-600">RPA BOT</span>
        </div>
      </div>
    </div>
  );
}

function RpaTimeline() {
  const { ref, active } = useActiveInView<HTMLOListElement>();
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!active) return;
    if (reduced) {
      setStep(RPA_TIMELINE.length - 1);
      return;
    }
    const id = window.setInterval(() => setStep((s) => (s + 1) % RPA_TIMELINE.length), 2000);
    return () => window.clearInterval(id);
  }, [active, reduced]);

  return (
    <ol ref={ref} className="relative space-y-3 border-l border-slate-200 pl-6">
      {RPA_TIMELINE.map((item, i) => {
        const done = i <= step;
        return (
          <li key={item.time} className="relative">
            <span
              className={`absolute -left-[31px] top-3 grid h-5 w-5 place-items-center rounded-full border transition-all duration-700 ${
                done ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-300"
              }`}
            >
              <i className={`${done ? "ri-check-line" : "ri-more-line"} text-[11px]`} aria-hidden="true" />
            </span>
            <div
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-700 ${
                done ? "border-blue-100 bg-blue-50/70" : "border-slate-100 bg-white opacity-70"
              }`}
            >
              <span className="font-mono text-[12px] font-bold text-blue-600">{item.time}</span>
              <span className="h-4 w-px bg-slate-200" />
              <i className={`${item.icon} text-slate-400`} aria-hidden="true" />
              <span className="text-[13px] text-slate-700">{item.text}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function EcosystemMap() {
  return (
    <div className="mx-auto w-full max-w-xl [perspective:1500px]">
      <div className="flex flex-col items-stretch [transform-style:preserve-3d] [transform:rotateX(10deg)]">
        {PIPELINE.map((stage, i) => (
          <div key={`eco-${stage.id}`} className="[transform-style:preserve-3d]">
            <div
              className="node-3d group relative flex items-center gap-4 rounded-2xl border border-slate-100 bg-white px-5 py-3.5 shadow-sm hover:border-blue-200 hover:shadow-xl"
              style={vars({ transform: `translateZ(${(PIPELINE.length - i) * 6}px)` })}
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600 transition-colors duration-500 group-hover:bg-blue-600 group-hover:text-white">
                <i className={`${stage.icon} text-xl`} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-mono text-[12px] font-bold tracking-[0.12em] text-slate-900">
                  {stage.label}
                </span>
                <span className="block truncate text-[12px] text-slate-500">{stage.note}</span>
              </span>
              <span className="shrink-0 rounded-md bg-slate-50 px-2 py-0.5 font-mono text-[10px] text-slate-400">
                {stage.level}
              </span>
            </div>

            {i < PIPELINE.length - 1 && (
              <div className="rail-line relative mx-auto h-7 w-px">
                <span
                  className="dot-down absolute left-1/2 top-0 h-1.5 w-1.5 rounded-full bg-blue-500"
                  style={vars({ "--dist": "28px", animationDelay: `${i * 0.3}s` })}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* --------------------------------- page ---------------------------------- */

export default function ProductIotPage() {
  const world = useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  // Memaksa tampilan desktop di perangkat mobile
  useEffect(() => {
    const setDesktopViewport = () => {
      let viewportMeta = document.querySelector('meta[name="viewport"]');
      if (!viewportMeta) {
        viewportMeta = document.createElement('meta');
        viewportMeta.setAttribute('name', 'viewport');
        document.head.appendChild(viewportMeta);
      }
      // Memaksa lebar 1200px agar browser mobile melakukan zoom-out (Situs Desktop)
      viewportMeta.setAttribute('content', 'width=1200, initial-scale=1');
    };

    setDesktopViewport();

    // Cleanup (opsional, jika berpindah ke halaman lain yang butuh mobile view)
    return () => {
      let viewportMeta = document.querySelector('meta[name="viewport"]');
      if (viewportMeta) {
        viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1');
      }
    };
  }, []);

  useStoryCamera(world, reduced);
  useEffect(() => setMounted(true), []);

  const scrollToField = useCallback(() => {
    document.getElementById("field")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div className="industrial-world" ref={world}>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      <IndustrialWorld />
      <DataSpine />

      <main className="iot-page relative">
        <StageRail />

        {/* ======================= SCENE 0 · HERO / PLANT ======================== */}
        <header id="hero" data-scene className="relative flex min-h-screen items-center px-5 py-24 sm:px-8">
          <div className="relative mx-auto grid w-full max-w-7xl items-center gap-14 lg:grid-cols-[1.05fr_.95fr]">
            <div>
              <Reveal>
                <Eyebrow>
                  <i className="ri-oil-line" aria-hidden="true" />
                  Industrial IoT · Petrochemical & Utility
                </Eyebrow>
              </Reveal>

              <Reveal delay={120}>
                <h1 className="mt-7 text-[32px] font-extrabold leading-[1.12] tracking-tight text-slate-900 sm:text-5xl lg:text-[56px]">
                  Dari Sinyal Instrumen
                  <span className="mt-1 block text-blue-600">Menjadi Keputusan Bisnis</span>
                </h1>
              </Reveal>

              <Reveal delay={220}>
                <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
                  TERIOT menghubungkan instrumen lapangan, sistem kontrol, historian, AI, dashboard, hingga proses
                  bisnis dalam satu alur data yang utuh — tanpa mengubah cara plant Anda dikendalikan.
                </p>
              </Reveal>

              <Reveal delay={320}>
                <div className="mt-8 flex flex-wrap gap-2.5">
                  {[
                    { icon: "ri-shield-check-line", text: "Read-only ke DCS" },
                    { icon: "ri-lock-2-line", text: "MQTT over TLS" },
                    { icon: "ri-stack-line", text: "Purdue L0–L4" },
                  ].map((chip) => (
                    <span
                      key={chip.text}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-3.5 py-1.5 text-[12px] font-medium text-slate-600 backdrop-blur"
                    >
                      <i className={`${chip.icon} text-blue-600`} aria-hidden="true" />
                      {chip.text}
                    </span>
                  ))}
                </div>
              </Reveal>

              <Reveal delay={400}>
                <div className="mt-9 flex flex-col gap-4 sm:flex-row">
                  <Link
                    href="/demo"
                    className="rounded-full bg-blue-600 px-9 py-3.5 text-center text-sm font-bold text-white shadow-[0_12px_28px_-10px_rgba(37,99,235,.7)] transition-all hover:bg-blue-700 active:scale-95"
                  >
                    Request Demo
                  </Link>
                  <button
                    type="button"
                    onClick={scrollToField}
                    aria-label="Telusuri alur data dari instrumen ke bisnis"
                    className="rounded-full border border-slate-300 bg-white/70 px-9 py-3.5 text-sm font-semibold text-slate-600 backdrop-blur transition-all hover:bg-white active:scale-95"
                  >
                    Telusuri Alurnya
                  </button>
                </div>
              </Reveal>

              <Reveal delay={480}>
                <div className="mt-12 flex items-center gap-3 text-slate-400">
                  <span className="font-mono text-[10px] tracking-[0.24em]">SCROLL UNTUK MENELUSURI</span>
                  <span className="relative flex h-10 w-px bg-gradient-to-b from-blue-400 to-transparent">
                    <span
                      className="dot-down absolute left-1/2 top-0 h-1.5 w-1.5 rounded-full bg-blue-500"
                      style={vars({ "--dist": "38px" })}
                    />
                  </span>
                  <i className="ri-arrow-down-line floaty text-blue-500" aria-hidden="true" />
                </div>
              </Reveal>
            </div>

            <Reveal delay={200} className="lg:pl-6">
              <HeroPipeline />
            </Reveal>
          </div>
        </header>

        {/* ===================== SCENE 1 · FIELD INSTRUMENT ====================== */}
        <section id="field" data-scene className="relative min-h-[140vh] px-5 sm:px-8">
          <div className="relative mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-2 lg:items-start">
            <div className="py-[16vh] lg:py-[22vh]">
              <Reveal>
                <StageLabel step="01" text="FIELD INSTRUMENT" level="L0" />
              </Reveal>
              <Reveal delay={100}>
                <h2 className="mt-6 text-[26px] font-extrabold leading-tight text-slate-900 sm:text-4xl lg:text-[44px]">
                  Semuanya Dimulai
                  <span className="block text-blue-600">dari Instrumen di Lapangan</span>
                </h2>
              </Reveal>
              <Reveal delay={180}>
                <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-600">
                  Transmitter tekanan, suhu, aliran, level, dan analyzer membaca kondisi proses sebagai sinyal 4–20 mA
                  atau digital. Inilah satu-satunya sumber kebenaran tentang apa yang benar-benar terjadi di boiler dan
                  vessel.
                </p>
              </Reveal>

              <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {FIELD_TAGS.map((sensor, i) => (
                  <Reveal key={sensor.tag} delay={i * 70}>
                    <div className="h-full rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-shadow duration-500 hover:shadow-lg">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <i className={`${sensor.icon} text-blue-600`} aria-hidden="true" />
                          <span className="font-mono text-[11px] font-bold tracking-[0.1em] text-slate-900">
                            {sensor.tag}
                          </span>
                        </span>
                        <span className="font-mono text-[9px] tracking-[0.08em] text-slate-400">{sensor.signal}</span>
                      </div>
                      <div className="mt-2 flex items-baseline gap-1.5">
                        <span className="font-mono text-xl font-extrabold text-slate-900">
                          {mounted ? (
                            <LiveValue base={sensor.base} variance={sensor.variance} decimals={sensor.decimals} />
                          ) : (
                            sensor.base.toFixed(sensor.decimals)
                          )}
                        </span>
                        <span className="text-[11px] font-semibold text-blue-600">{sensor.unit}</span>
                      </div>
                      <span className="mt-1 block text-[12px] text-slate-500">{sensor.name}</span>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>

            <div className="pb-[12vh] lg:sticky lg:top-0 lg:flex lg:h-screen lg:items-center lg:pb-0">
              <Reveal className="w-full">
                <FieldVisual />
              </Reveal>
            </div>
          </div>
        </section>

        {/* ==================== SCENE 2 · FIELD → CONTROL ======================== */}
        <StoryTransition
          from="INSTRUMENT"
          to="CONTROLLER"
          title="Sinyal lapangan masuk ke sistem kontrol lebih dulu, bukan ke internet."
          nodes={[
            { label: "TRANSMITTER", sub: "4–20 mA · HART" },
            { label: "JUNCTION BOX", sub: "field wiring" },
            { label: "MARSHALLING", sub: "I/O cabinet" },
            { label: "PLC / DCS", sub: "Level 1" },
          ]}
        />

        {/* ======================== SCENE 3 · CONTROL ============================ */}
        <section id="control" data-scene className="relative min-h-[140vh] px-5 sm:px-8">
          <div className="relative mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-2 lg:items-start">
            <div className="order-2 pb-[12vh] lg:order-1 lg:sticky lg:top-0 lg:flex lg:h-screen lg:items-center lg:pb-0">
              <Reveal className="w-full">
                <ControlVisual />
              </Reveal>
            </div>

            <div className="order-1 py-[16vh] lg:order-2 lg:py-[22vh]">
              <Reveal>
                <StageLabel step="02" text="PLC / DCS / BMS" level="L1–L2" />
              </Reveal>
              <Reveal delay={100}>
                <h2 className="mt-6 text-[26px] font-extrabold leading-tight text-slate-900 sm:text-4xl lg:text-[44px]">
                  Sistem Kontrol
                  <span className="block text-blue-600">yang Menjalankan Plant</span>
                </h2>
              </Reveal>
              <Reveal delay={180}>
                <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-600">
                  Boiler controller menjalankan loop drum level tiga elemen, master tekanan steam, dan O₂ trim. Burner
                  management system menjaga urutan purge dan interlock. Lapisan inilah yang mengendalikan proses — dan
                  IoT tidak pernah ikut campur di sini.
                </p>
              </Reveal>

              <Reveal delay={260}>
                <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
                  <div className="flex items-start gap-3">
                    <i className="ri-error-warning-line mt-0.5 text-lg text-amber-600" aria-hidden="true" />
                    <div>
                      <h3 className="text-[14px] font-bold text-slate-900">Safety tetap terpisah</h3>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">
                        Safety Instrumented System (ESD/SIS) berjalan pada logic solver tersendiri dengan sertifikasi
                        SIL. Platform IoT tidak membaca maupun menulis ke jalur safety, sehingga tidak mengubah
                        integritas proteksi plant.
                      </p>
                    </div>
                  </div>
                </div>
              </Reveal>

              <Reveal delay={320}>
                <div className="mt-6 flex flex-wrap items-center gap-2 font-mono text-[11px] tracking-[0.1em] text-slate-500">
                  {["FIELD (L0)", "CONTROL (L1)", "SUPERVISORY (L2)", "DMZ (L2.5)"].map((item, i, arr) => (
                    <span key={item} className="flex items-center gap-2">
                      <span className={i === 1 ? "font-bold text-blue-600" : ""}>{item}</span>
                      {i < arr.length - 1 && <i className="ri-arrow-right-line text-blue-400" aria-hidden="true" />}
                    </span>
                  ))}
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* =================== SCENE 4 · CONTROL → GATEWAY ======================= */}
        <StoryTransition
          from="CONTROLLER"
          to="GATEWAY"
          title="Gateway hanya membaca controller, melalui zona yang terpisah."
          nodes={[
            { label: "DCS / SCADA", sub: "Level 2" },
            { label: "OPC UA / MODBUS", sub: "akses read-only" },
            { label: "FIREWALL · DMZ", sub: "Level 2.5" },
            { label: "IoT GATEWAY", sub: "edge device" },
          ]}
        />

        {/* ======================== SCENE 5 · GATEWAY ============================ */}
        <section id="gateway" data-scene className="relative min-h-[140vh] px-5 sm:px-8">
          <div className="relative mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-2 lg:items-start">
            <div className="py-[16vh] lg:py-[22vh]">
              <Reveal>
                <StageLabel step="03" text="IoT GATEWAY" level="L2.5" />
              </Reveal>
              <Reveal delay={100}>
                <h2 className="mt-6 text-[26px] font-extrabold leading-tight text-slate-900 sm:text-4xl lg:text-[44px]">
                  Jembatan Aman
                  <span className="block text-blue-600">ke Dunia Digital</span>
                </h2>
              </Reveal>
              <Reveal delay={180}>
                <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-600">
                  Gateway membaca register PLC dan tag OPC UA, memberi timestamp di sumber, lalu mengirimkannya sebagai
                  MQTT terenkripsi. Saat koneksi putus, data ditahan di buffer lokal dan dikirim ulang begitu jaringan
                  pulih — tidak ada lubang di histori.
                </p>
              </Reveal>

              <Reveal delay={240}>
                <div className="mt-10 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                    <span className="font-mono text-[10px] tracking-[0.18em] text-slate-400">INPUT · SISI PLANT</span>
                    <ul className="mt-3 space-y-2">
                      {GATEWAY_IN.map((item) => (
                        <li key={item.name} className="flex items-center gap-2 text-[13px] text-slate-700">
                          <i className="ri-arrow-right-s-line text-blue-600" aria-hidden="true" />
                          {item.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                    <span className="font-mono text-[10px] tracking-[0.18em] text-slate-400">OUTPUT · SISI DATA</span>
                    <ul className="mt-3 space-y-2">
                      {GATEWAY_OUT.map((item) => (
                        <li key={item.name} className="flex items-center gap-2 text-[13px] text-slate-700">
                          <i className="ri-arrow-right-s-line text-sky-600" aria-hidden="true" />
                          {item.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Reveal>
            </div>

            <div className="pb-[12vh] lg:sticky lg:top-0 lg:flex lg:h-screen lg:items-center lg:pb-0">
              <Reveal className="w-full">
                <GatewayVisual />
              </Reveal>
            </div>
          </div>
        </section>

        {/* ================== SCENE 6 · GATEWAY → HISTORIAN ====================== */}
        <StoryTransition
          from="GATEWAY"
          to="HISTORIAN"
          title="Paket data divalidasi sebelum boleh masuk ke lapisan data."
          nodes={[
            { label: "MQTT / TLS", sub: "payload bertimestamp" },
            { label: "BROKER", sub: "topic per aset" },
            { label: "VALIDASI", sub: "range & quality flag" },
            { label: "HISTORIAN", sub: "Level 3" },
          ]}
        />

        {/* ======================= SCENE 7 · HISTORIAN =========================== */}
        <section id="historian" data-scene className="relative min-h-[140vh] px-5 sm:px-8">
          <div className="relative mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-2 lg:items-start">
            <div className="order-2 pb-[12vh] lg:order-1 lg:sticky lg:top-0 lg:flex lg:h-screen lg:items-center lg:pb-0">
              <Reveal className="w-full">
                <HistorianVisual />
              </Reveal>
            </div>

            <div className="order-1 py-[16vh] lg:order-2 lg:py-[22vh]">
              <Reveal>
                <StageLabel step="04" text="HISTORIAN" level="L3" />
              </Reveal>
              <Reveal delay={100}>
                <h2 className="mt-6 text-[26px] font-extrabold leading-tight text-slate-900 sm:text-4xl lg:text-[44px]">
                  Setiap Sinyal
                  <span className="block text-blue-600">Menjadi Data Bermakna</span>
                </h2>
              </Reveal>
              <Reveal delay={180}>
                <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-600">
                  Nilai mentah tidak cukup. Setiap tag dipetakan ke aset — BLR01.PT101.PV berarti tekanan drum
                  Boiler-01 — lengkap dengan satuan, batas operasi, dan status kualitas data. Data satu detik disimpan
                  untuk investigasi, agregat satu menit untuk analisa jangka panjang.
                </p>
              </Reveal>

              <Reveal delay={240}>
                <div className="mt-8 flex flex-wrap gap-2">
                  {HISTORIAN_TOPICS.map((topic) => (
                    <span
                      key={topic}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] text-slate-600"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </Reveal>

              <Reveal delay={320} className="mt-8">
                <LiveStream />
              </Reveal>
            </div>
          </div>
        </section>

        {/* ==================== SCENE 8 · HISTORIAN → AI ========================= */}
        <StoryTransition
          from="HISTORIAN"
          to="AI"
          title="Data diberi konteks sebelum boleh dianalisa."
          nodes={[
            { label: "RAW 1 DETIK", sub: "nilai instrumen" },
            { label: "AGREGASI", sub: "rata-rata 1 menit" },
            { label: "ASSET MODEL", sub: "tag → equipment" },
            { label: "AI ANALYTICS", sub: "pola & anomali" },
          ]}
        />

        {/* =========================== SCENE 9 · AI ============================== */}
        <section id="ai" data-scene className="relative min-h-[140vh] px-5 sm:px-8">
          <div className="relative mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-2 lg:items-start">
            <div className="order-2 pb-[12vh] lg:order-1 lg:sticky lg:top-0 lg:flex lg:h-screen lg:items-center lg:pb-0">
              <Reveal className="w-full">
                <AiOrb />
              </Reveal>
            </div>

            <div className="order-1 py-[16vh] lg:order-2 lg:py-[20vh]">
              <Reveal>
                <StageLabel step="05" text="AI ANALYTICS" level="L3" />
              </Reveal>
              <Reveal delay={100}>
                <h2 className="mt-6 text-[26px] font-extrabold leading-tight text-slate-900 sm:text-4xl lg:text-[44px]">
                  Data Mesin Kini Bisa
                  <span className="block text-blue-600">Diajak Berdiskusi</span>
                </h2>
              </Reveal>
              <Reveal delay={180}>
                <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-600">
                  AI membaca historian yang sudah berkonteks, lalu menjelaskan penyebab deviasi dalam bahasa yang
                  dipahami operator dan manajemen. Setiap jawaban menunjuk ke tag dan waktu kejadian, bukan sekadar
                  kesimpulan.
                </p>
              </Reveal>

              <Reveal delay={260} className="mt-9">
                <ChatPanel />
              </Reveal>
            </div>
          </div>
        </section>

        {/* ==================== SCENE 10 · AI → DASHBOARD ======================== */}
        <StoryTransition
          from="AI"
          to="DASHBOARD"
          title="Temuan diterjemahkan menjadi KPI yang dipantau harian."
          nodes={[
            { label: "TEMUAN", sub: "deviasi & penyebab" },
            { label: "KPI MODEL", sub: "rumus efisiensi" },
            { label: "AGGREGASI SHIFT", sub: "per area & aset" },
            { label: "DASHBOARD", sub: "Level 4" },
          ]}
        />

        {/* ======================== SCENE 11 · DASHBOARD ========================= */}
        <section id="dashboard" data-scene className="relative min-h-[180vh] px-5 sm:px-8">
          <div className="sticky top-0 flex min-h-screen flex-col justify-center py-20">
            <div className="relative mx-auto w-full max-w-7xl">
              <div className="mb-10 text-center">
                <Reveal>
                  <StageLabel step="06" text="DASHBOARD" level="L4" />
                </Reveal>
                <Reveal delay={100}>
                  <h2 className="mt-6 text-[26px] font-extrabold leading-tight text-slate-900 sm:text-4xl lg:text-[44px]">
                    Kondisi Plant
                    <span className="block text-blue-600">Terlihat dalam Hitungan Detik</span>
                  </h2>
                </Reveal>
                <Reveal delay={180}>
                  <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-600">
                    KPI yang ditampilkan mengikuti karakter proses: efisiensi boiler, availability, produksi steam, dan
                    konsumsi bahan bakar spesifik — bukan sekadar grafik tanpa arti operasional.
                  </p>
                </Reveal>
              </div>

              <DashboardMock />
            </div>
          </div>
        </section>

        {/* ==================== SCENE 12 · DASHBOARD → RPA ======================= */}
        <StoryTransition
          from="DASHBOARD"
          to="RPA"
          title="Kondisi yang terdeteksi berubah menjadi tindakan."
          nodes={[
            { label: "DEVIASI O₂", sub: "3,1% → 5,4%" },
            { label: "RULE / AMBANG", sub: "batas & durasi" },
            { label: "TRIGGER", sub: "event otomatis" },
            { label: "RPA BOT", sub: "digital worker" },
          ]}
        />

        {/* =========================== SCENE 13 · RPA ============================ */}
        <section id="rpa" data-scene className="relative min-h-[150vh] px-5 sm:px-8">
          <div className="relative mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-2 lg:items-start">
            <div className="py-[16vh] lg:py-[20vh]">
              <Reveal>
                <StageLabel step="07" text="RPA" level="L4" />
              </Reveal>
              <Reveal delay={100}>
                <h2 className="mt-6 text-[26px] font-extrabold leading-tight text-slate-900 sm:text-4xl lg:text-[44px]">
                  Dari Informasi
                  <span className="block text-blue-600">Menjadi Tindakan</span>
                </h2>
              </Reveal>
              <Reveal delay={180}>
                <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-600">
                  Bot mengerjakan pekerjaan rutin yang selama ini memakan waktu awal shift: menarik data, memeriksa
                  kelengkapan, menghitung, memposting ke ERP, membuat work order di CMMS, lalu mendistribusikan laporan.
                </p>
              </Reveal>

              <Reveal delay={320} className="mt-9">
                <RpaTimeline />
              </Reveal>
            </div>

            <div className="pb-[12vh] lg:sticky lg:top-0 lg:flex lg:h-screen lg:items-center lg:pb-0">
              <Reveal className="w-full">
                <RobotVisual />
              </Reveal>
            </div>
          </div>
        </section>

        {/* ==================== SCENE 14 · RPA → BUSINESS ======================== */}
        <StoryTransition
          from="RPA"
          to="BUSINESS"
          title="Aksi bot muncul sebagai angka di meja manajemen."
          nodes={[
            { label: "POSTING ERP", sub: "produksi & energi" },
            { label: "WORK ORDER", sub: "CMMS / maintenance" },
            { label: "LAPORAN", sub: "email · WhatsApp" },
            { label: "MANAJEMEN", sub: "keputusan bisnis" },
          ]}
        />

        {/* ======================== SCENE 15 · ECOSYSTEM ========================= */}
        <section id="ecosystem" data-scene className="relative px-5 py-28 sm:px-8">
          <div className="relative mx-auto max-w-7xl">
            <div className="mx-auto max-w-4xl text-center">
              <Reveal>
                <Eyebrow>Satu Ekosistem Terhubung</Eyebrow>
              </Reveal>
              <Reveal delay={100}>
                <h2 className="mt-6 text-3xl font-extrabold leading-tight text-slate-900 sm:text-4xl lg:text-5xl">
                  Dari Level 0 sampai Level 4
                  <span className="block text-blue-600">dalam Satu Alur Data</span>
                </h2>
              </Reveal>
              <Reveal delay={160}>
                <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-slate-600 md:text-lg">
                  Setiap lapisan punya tugas dan batas wewenangnya sendiri. Data mengalir ke atas, kendali tetap tinggal
                  di bawah.
                </p>
              </Reveal>
            </div>

            <div className="mt-16 grid gap-14 lg:grid-cols-[1fr_auto] lg:items-center">
              <Reveal>
                <EcosystemMap />
              </Reveal>

              <Reveal delay={160}>
                <div className="space-y-5 lg:max-w-xs">
                  {[
                    { icon: "ri-links-line", title: "Terintegrasi", desc: "Satu tag, satu arti, di semua sistem." },
                    { icon: "ri-flashlight-line", title: "Realtime", desc: "Detik yang sama di lapangan dan di layar." },
                    { icon: "ri-sparkling-2-line", title: "Dapat dijelaskan", desc: "Setiap angka bisa ditelusuri sumbernya." },
                    { icon: "ri-robot-2-line", title: "Otomatis", desc: "Rutinitas berjalan tanpa diingatkan." },
                  ].map((item) => (
                    <div key={item.title} className="flex items-start gap-3">
                      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
                        <i className={item.icon} aria-hidden="true" />
                      </span>
                      <span>
                        <span className="block text-[15px] font-bold text-slate-900">{item.title}</span>
                        <span className="block text-[13px] leading-relaxed text-slate-500">{item.desc}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ========================= SCENE 16 · BUSINESS ========================= */}
        <section data-scene className="relative px-5 py-28 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <Reveal>
                <Eyebrow>Business Impact</Eyebrow>
              </Reveal>
              <Reveal delay={100}>
                <h2 className="mt-6 text-3xl font-extrabold leading-tight text-slate-900 sm:text-4xl lg:text-5xl">
                  Data Plant yang Akhirnya
                  <span className="block text-blue-600">Dipakai Setiap Hari</span>
                </h2>
              </Reveal>
              <Reveal delay={160}>
                <p className="mt-5 text-sm leading-relaxed text-slate-600 md:text-lg">
                  Nilai sebuah sistem industri tidak berhenti pada grafik yang rapi, tetapi pada cara data dipakai oleh
                  tim produksi, maintenance, dan manajemen.
                </p>
              </Reveal>
            </div>

            <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {IMPACT.map((item, i) => (
                <Reveal key={item.head} delay={i * 90}>
                  <div className="group h-full rounded-[2rem] border border-slate-100 bg-white p-7 shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-xl">
                    <span className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-100 text-blue-600 transition-colors duration-500 group-hover:bg-blue-600 group-hover:text-white">
                      <i className={`${item.icon} text-2xl`} aria-hidden="true" />
                    </span>
                    <h3 className="mt-6 text-lg font-bold text-slate-900">{item.head}</h3>
                    <p className="mt-3 text-[13px] leading-relaxed text-slate-600 md:text-[14px]">{item.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ============================ SCENE 17 · CTA =========================== */}
        <section data-scene className="relative px-5 pb-32 pt-8 sm:px-8">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-blue-600 to-blue-700 px-7 py-14 text-center shadow-[0_40px_90px_-50px_rgba(37,99,235,1)] sm:px-14">
                <div
                  className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-2xl"
                  aria-hidden="true"
                />
                <div
                  className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-sky-300/20 blur-2xl"
                  aria-hidden="true"
                />

                <h2 className="relative text-3xl font-extrabold leading-tight text-white sm:text-4xl">
                  Siap Menghubungkan Plant Anda?
                </h2>
                <p className="relative mx-auto mt-5 max-w-xl text-sm leading-relaxed text-blue-100 md:text-base">
                  Mulai dari satu boiler atau satu vessel. Kami bantu memetakan tag, menyiapkan gateway, dan
                  menghubungkannya sampai ke laporan yang Anda pakai tiap pagi.
                </p>

                <div className="relative mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                  <Link
                    href="/demo"
                    aria-label="Jadwalkan demo Industrial IoT"
                    className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-bold text-blue-700 shadow-lg transition-all hover:scale-105 active:scale-95"
                  >
                    <i className="ri-rocket-line" aria-hidden="true" />
                    Jadwalkan Demo
                  </Link>
                  <Link
                    href="/contact"
                    aria-label="Hubungi tim TERIOT"
                    className="inline-flex items-center gap-2 rounded-full border border-white/40 px-8 py-4 text-sm font-semibold text-white transition-all hover:bg-white/10 active:scale-95"
                  >
                    <i className="ri-customer-service-2-line" aria-hidden="true" />
                    Konsultasi Kebutuhan
                  </Link>
                </div>

                <div className="relative mt-12 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 font-mono text-[10px] tracking-[0.18em] text-blue-200">
                  {PIPELINE.map((stage, i, arr) => (
                    <span key={`cta-${stage.id}`} className="flex items-center gap-3">
                      {stage.short.toUpperCase()}
                      {i < arr.length - 1 && <i className="ri-arrow-right-line text-blue-300" aria-hidden="true" />}
                    </span>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
    </div>
  );
}