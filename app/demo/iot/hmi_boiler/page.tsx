"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Flame, Clock, RefreshCw, Download, RotateCcw, AlertTriangle, TrendingUp, TrendingDown, Droplets,
} from 'lucide-react';

/* ================================================================== */
/* SIMULASI BOILER (drum boiler, pembangkit listrik)                   */
/* Server palsu di memori (useRef) -> reset saat halaman di-refresh.   */
/* Tiap tick (3 detik) model proses + 5 loop PI dihitung ulang:        */
/*  LIC-101 level drum (3-element) -> FV-101 feedwater valve           */
/*  PIC-101 tekanan drum           -> FCV-101 fuel valve               */
/*  TIC-101 suhu main steam        -> TCV-101 spray attemperator       */
/*  AIC-101 O2 trim + ratio        -> FD fan damper                    */
/*  PIC-104 draft furnace          -> ID fan damper                    */
/* ================================================================== */
const TICK_MS = 3000;
const MAX_SAMPLES = 10000;
const SP = { press: 60, level: 50, temp: 485, o2: 3.5, draft: -50 };

type Sample = {
  id: number; created_at: string;
  steam: number; press: number; level: number; temp: number; fw: number; fuel: number; air: number;
  o2: number; draft: number; tfg: number; vFw: number; vFuel: number; vFd: number; vId: number;
  spray: number; eff: number;
};
type NumKey = Exclude<keyof Sample, 'id' | 'created_at'>;
type AlarmEvent = { id: number; time: string; tag: string; text: string; sev: 'WARN' | 'CRIT'; state: 'ACTIVE' | 'CLEARED' };

// Daftar kolom (dipakai untuk Excel)
const VARS: { key: NumKey; label: string; unit: string; sp?: number }[] = [
  { key: 'steam', label: 'Steam Flow (FT-102)', unit: 't/h' },
  { key: 'press', label: 'Drum Pressure (PT-101)', unit: 'bar', sp: SP.press },
  { key: 'level', label: 'Drum Level (LT-101)', unit: '%', sp: SP.level },
  { key: 'temp', label: 'Main Steam Temp (TT-101)', unit: '°C', sp: SP.temp },
  { key: 'fw', label: 'Feedwater Flow (FT-101)', unit: 't/h' },
  { key: 'fuel', label: 'Fuel Flow (FT-103)', unit: 't/h' },
  { key: 'air', label: 'Air Flow (FT-104)', unit: 't/h' },
  { key: 'o2', label: 'O2 Flue Gas (AT-101)', unit: '%', sp: SP.o2 },
  { key: 'draft', label: 'Furnace Draft (PT-104)', unit: 'Pa', sp: SP.draft },
  { key: 'tfg', label: 'Stack Temp (TT-102)', unit: '°C' },
  { key: 'vFw', label: 'FV-101 Feedwater Valve', unit: '%' },
  { key: 'vFuel', label: 'FCV-101 Fuel Valve', unit: '%' },
  { key: 'vFd', label: 'DP-101 FD Damper', unit: '%' },
  { key: 'vId', label: 'DP-102 ID Damper', unit: '%' },
  { key: 'spray', label: 'TCV-101 Spray Valve', unit: '%' },
  { key: 'eff', label: 'Efisiensi Boiler', unit: '%' },
];

const ALARMS: { tag: string; text: string; sev: 'WARN' | 'CRIT'; test: (s: Sample) => boolean }[] = [
  { tag: 'LAL-101', text: 'Level drum rendah', sev: 'WARN', test: (s) => s.level < 44 },
  { tag: 'LALL-101', text: 'Level drum sangat rendah', sev: 'CRIT', test: (s) => s.level < 30 },
  { tag: 'LAH-101', text: 'Level drum tinggi', sev: 'WARN', test: (s) => s.level > 56 },
  { tag: 'PAL-101', text: 'Tekanan drum rendah', sev: 'WARN', test: (s) => s.press < 54 },
  { tag: 'PAH-101', text: 'Tekanan drum tinggi', sev: 'CRIT', test: (s) => s.press > 66 },
  { tag: 'TAH-101', text: 'Suhu main steam tinggi', sev: 'CRIT', test: (s) => s.temp > 515 },
  { tag: 'AAL-101', text: 'O2 flue gas rendah', sev: 'WARN', test: (s) => s.o2 < 2 },
  { tag: 'PAH-104', text: 'Draft furnace kurang negatif', sev: 'CRIT', test: (s) => s.draft > -20 },
];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const r2 = (v: number) => Math.round(v * 100) / 100;
const n = () => Math.random() - 0.5;

// Kontroler PI + anti-windup sederhana. ff = feedforward.
type PIState = { i: number };
function pi(c: PIState, e: number, kp: number, ki: number, ff: number) {
  const u = ff + kp * e + c.i;
  if ((u < 100 || e < 0) && (u > 0 || e > 0)) c.i += ki * e;
  return clamp(ff + kp * e + c.i, 0, 100);
}

function createFakeServer() {
  const samples: Sample[] = [];
  const alarms: AlarmEvent[] = [];
  const active = new Set<string>();
  let seq = 0, aseq = 0;
  let st: any;

  const init = () => {
    const wf = 100 / 8.5, wa = wf * 7.2 * 1.2;
    st = {
      demand: 100, target: 100, prevWs: 100, press: 60, level: 50, temp: 485, o2: 3.5, draft: -50,
      wfw: 100, wf, wa, wid: wa * 1.12 + 50, tfg: 110 + 7 * wf, fwLoss: 0,
      ci: { lvl: { i: 0 }, prs: { i: 0 }, tmp: { i: 25 }, o2: { i: 0 }, dft: { i: 0 } },
    };
  };
  init();

  return {
    tick() {
      // Beban (steam demand) ramp ke target; target berubah acak sesekali
      if (Math.random() < 0.04) st.target = clamp(Math.round(80 + Math.random() * 50), 60, 140);
      st.demand += clamp(st.target - st.demand, -3, 3);
      const ws = st.demand + n() * 1.6;

      // Kontroler
      const vFw = pi(st.ci.lvl, SP.level - st.level, 2, 0.15, ws / 1.4);          // 3-element: FF steam flow
      const vFuel = pi(st.ci.prs, SP.press - st.press, 3, 0.4, ws / 1.53);
      const spray = pi(st.ci.tmp, st.temp - SP.temp, 1.5, 0.1, 0);
      const vFd = pi(st.ci.o2, SP.o2 - st.o2, 1.2, 0.12, st.wf * 4.32);           // ratio udara/bahan bakar + trim O2
      const vId = pi(st.ci.dft, st.draft - SP.draft, 0.15, 0.05, (st.wa * 1.12 + 50) / 2.3);

      // Aktuator -> aliran (orde 1)
      const cap = st.fwLoss > 0 ? 0.7 : 1; // gangguan feedwater: kapasitas pompa turun
      if (st.fwLoss > 0) st.fwLoss--;
      st.wfw += (1.4 * vFw * cap - st.wfw) * 0.5;
      st.wf += (0.18 * vFuel - st.wf) * 0.4;
      st.wa += (2.0 * vFd - st.wa) * 0.5;
      st.wid += (2.3 * vId - st.wid) * 0.5;

      // Proses
      st.press = clamp(st.press + (8.5 * st.wf - ws) * 0.03 + n() * 0.05, 0, 100);
      st.level = clamp(st.level + (st.wfw - ws) * 0.12 + 0.1 * (ws - st.prevWs) + n() * 0.3, 0, 100);
      st.prevWs = ws;
      st.temp += (445 + 90 * (ws / 150) - 0.8 * spray - st.temp) * 0.3 + n() * 0.3;
      const lam = st.wa / (st.wf * 7.2 + 1e-6);
      st.o2 = clamp(lam > 1 ? 21 * (1 - 1 / lam) : 0, 0, 10);
      st.draft += (st.wa * 1.12 - st.wid - st.draft) * 0.5;
      st.tfg += (110 + 7 * st.wf + 4 * (st.o2 - 3.5) - st.tfg) * 0.3;
      const eff = 100 - 0.045 * (st.tfg - 25) * (21 / (21 - st.o2)) - 5.5;

      const s: Sample = {
        id: ++seq, created_at: new Date().toISOString(),
        steam: r2(ws), press: r2(st.press), level: r2(st.level), temp: r2(st.temp), fw: r2(st.wfw),
        fuel: r2(st.wf), air: r2(st.wa), o2: r2(st.o2 + n() * 0.06), draft: r2(st.draft + n() * 2),
        tfg: r2(st.tfg), vFw: r2(vFw), vFuel: r2(vFuel), vFd: r2(vFd), vId: r2(vId), spray: r2(spray), eff: r2(eff),
      };
      samples.push(s);
      if (samples.length > MAX_SAMPLES) samples.splice(0, samples.length - MAX_SAMPLES);

      // Log alarm (hanya saat berubah status)
      for (const a of ALARMS) {
        const now = a.test(s), was = active.has(a.tag);
        if (now !== was) {
          if (now) active.add(a.tag); else active.delete(a.tag);
          alarms.push({ id: ++aseq, time: s.created_at, tag: a.tag, text: a.text, sev: a.sev, state: now ? 'ACTIVE' : 'CLEARED' });
        }
      }
    },
    fetchAll: () => ({ samples: samples.slice(), alarms: alarms.slice() }),
    loadStep(d: number) { st.target = clamp(st.target + d, 60, 140); },
    disturbFw() { st.fwLoss = 5; },
    reset() { samples.length = 0; alarms.length = 0; active.clear(); seq = 0; aseq = 0; init(); },
  };
}

/* ================================================================== */
/* Komponen SVG                                                        */
/* ================================================================== */
const CSS = `
.flow { stroke-dasharray: 10 8; animation: dash 1s linear infinite; }
.flow.rev { animation-direction: reverse; }
.sig { stroke-dasharray: 6 5; animation: dash .8s linear infinite; }
@keyframes dash { to { stroke-dashoffset: -18; } }
.fan { transform-box: fill-box; transform-origin: center; animation: spin linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.flame { transform-box: fill-box; transform-origin: 0 50%; animation: flick .35s ease-in-out infinite alternate; }
@keyframes flick { from { transform: scale(.85,.8); } to { transform: scale(1.1,1.2); } }
.blink { animation: blink 1s steps(2, jump-none) infinite; }
@keyframes blink { 50% { opacity: .35; } }
.paused .flow, .paused .sig, .paused .fan, .paused .flame { animation-play-state: paused; }
@media (prefers-reduced-motion: reduce) { .flow, .sig, .fan, .flame, .blink { animation: none !important; } }
`;
const C = { water: '#0ea5e9', steam: '#f97316', fuel: '#92400e', air: '#10b981', flue: '#78716c', sig: '#7c3aed' };

const Pipe = ({ d, c, w = 8, rev }: { d: string; c: string; w?: number; rev?: boolean }) => (
  <g>
    <path d={d} fill="none" stroke="#cbd5e1" strokeWidth={w} strokeLinejoin="round" />
    <path d={d} fill="none" stroke={c} strokeWidth={w - 4} strokeLinejoin="round" className={`flow ${rev ? 'rev' : ''}`} />
  </g>
);

function Inst({ x, y, tag, num, color, value, unit, side = 'r', alarm }: {
  x: number; y: number; tag: string; num: string; color: string; value: string; unit: string; side?: 'r' | 'l'; alarm?: boolean;
}) {
  const bx = side === 'r' ? 22 : -96;
  return (
    <g transform={`translate(${x},${y})`}>
      <circle r="17" fill="#fff" stroke={color} strokeWidth="2.5" />
      <line x1="-17" x2="17" stroke={color} strokeWidth="1" />
      <text y="-3" textAnchor="middle" fontSize="9" fontWeight="800" fill={color}>{tag}</text>
      <text y="11" textAnchor="middle" fontSize="8" fontWeight="700" fill="#475569">{num}</text>
      <g transform={`translate(${bx},-16)`} className={alarm ? 'blink' : ''}>
        <rect width="74" height="32" rx="4" fill={alarm ? '#fef2f2' : '#fff'} stroke={alarm ? '#dc2626' : color} strokeWidth="1.5" />
        <text x="37" y="15" textAnchor="middle" fontSize="13" fontWeight="800" className="font-mono" fill="#0f172a">{value}</text>
        <text x="37" y="27" textAnchor="middle" fontSize="9" fill="#64748b">{unit}</text>
      </g>
    </g>
  );
}

function Valve({ x, y, tag, pos, color, damper }: { x: number; y: number; tag: string; pos: number; color: string; damper?: boolean }) {
  return (
    <g transform={`translate(${x},${y})`}>
      {damper ? (
        <>
          <circle r="11" fill="#fff" stroke="#475569" strokeWidth="2" />
          <line x1="-11" x2="11" stroke={color} strokeWidth="3" transform={`rotate(${90 - pos * 0.9})`} style={{ transition: 'transform 1s linear' }} />
        </>
      ) : (
        <>
          <polygon points="-14,-10 -14,10 14,-10 14,10" fill="#e2e8f0" stroke="#475569" strokeWidth="2" />
          <line y2="-22" stroke="#64748b" strokeWidth="3" />
          <path d="M-11 -22 Q0 -38 11 -22Z" fill={color} stroke="#334155" strokeWidth="1.5" />
        </>
      )}
      <text y="28" textAnchor="middle" fontSize="9" fontWeight="700" fill="#334155">{tag}</text>
      <text y="39" textAnchor="middle" fontSize="10" fontWeight="800" className="font-mono" fill={color}>{pos.toFixed(0)}%</text>
    </g>
  );
}

function Fan({ x, y, tag, speed }: { x: number; y: number; tag: string; speed: number }) {
  const dur = `${(2.2 - 1.8 * clamp(speed / 100, 0, 1)).toFixed(2)}s`;
  return (
    <g transform={`translate(${x},${y})`}>
      <circle r="26" fill="#fff" stroke="#475569" strokeWidth="3" />
      <g className="fan" style={{ animationDuration: dur }}>
        {[0, 90, 180, 270].map((a) => (
          <path key={a} d="M0 0 L-6 -20 Q0 -24 6 -20Z" fill="#64748b" transform={`rotate(${a})`} />
        ))}
      </g>
      <circle r="4" fill="#334155" />
      <text y="42" textAnchor="middle" fontSize="10" fontWeight="700" fill="#334155">{tag}</text>
    </g>
  );
}

const Label = ({ x, y, t, size = 10, anchor = 'middle' }: { x: number; y: number; t: string; size?: number; anchor?: 'start' | 'middle' | 'end' }) => (
  <text x={x} y={y} textAnchor={anchor} fontSize={size} fontWeight="700" fill="#475569" letterSpacing=".04em">{t}</text>
);

function BoilerDiagram({ s, alarmTags }: { s: Sample; alarmTags: Set<string> }) {
  const fs = clamp(0.4 + 0.9 * (s.fuel / 18), 0.3, 1.4);
  const ys = [440, 520];
  const tubes = [360, 420, 480, 540, 600];
  return (
    <svg viewBox="0 0 1200 720" className="w-full h-auto min-w-[900px]" style={{ maxHeight: '78vh' }} fontFamily="ui-sans-serif, system-ui, sans-serif">
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="1" />
        </pattern>
        <clipPath id="drumClip"><rect x="300" y="110" width="360" height="60" rx="30" /></clipPath>
      </defs>
      <rect width="1200" height="720" fill="#f8fafc" />
      <rect width="1200" height="720" fill="url(#grid)" />
      <text x="30" y="36" fontSize="15" fontWeight="800" fill="#1e293b">BOILER B-101 · DRUM TYPE · COAL FIRED</text>
      <text x="30" y="54" fontSize="10" fill="#64748b">Rated 150 t/h · 60 bar · 485 °C</text>

      {/* ===== FURNACE ===== */}
      <rect x="330" y="230" width="300" height="370" fill="#fff7ed" stroke="#78716c" strokeWidth="5" />
      <rect x="335" y="235" width="290" height="360" fill="#fb923c" opacity={0.06 + 0.2 * (s.fuel / 18)} />
      <polygon points="380,600 580,600 520,650 440,650" fill="#e7e5e4" stroke="#78716c" strokeWidth="4" />
      <Label x={480} y={632} t="ASH HOPPER" size={9} />
      {tubes.map((x) => (
        <g key={x}>
          <Pipe d={`M ${x} 598 L ${x} 232`} c="#38bdf8" w={6} />
          <Pipe d={`M ${x} 230 L ${x} 170`} c="#fb923c" w={6} />
        </g>
      ))}
      {ys.map((y) => (
        <g key={y}>
          <rect x="322" y={y - 8} width="14" height="16" fill="#475569" />
          <g transform={`translate(336,${y}) scale(${fs.toFixed(2)})`}>
            <path className="flame" d="M0 0 C20 -22 55 -26 95 0 C55 26 20 22 0 0Z" fill="#f97316" opacity=".9" />
            <path className="flame" style={{ animationDelay: '.12s' }} d="M0 0 C14 -12 34 -14 56 0 C34 14 14 12 0 0Z" fill="#fde047" />
          </g>
        </g>
      ))}
      <Label x={480} y={580} t="FURNACE (WATER WALL)" size={10} />

      {/* ===== STEAM DRUM ===== */}
      <rect x="300" y="110" width="360" height="60" rx="30" fill="#f1f5f9" stroke="#64748b" strokeWidth="5" />
      <g clipPath="url(#drumClip)">
        <rect x="300" y="110" width="360" height="60" fill="#7dd3fc" opacity=".75"
          style={{ transform: `translateY(${((1 - s.level / 100) * 60).toFixed(1)}px)`, transition: 'transform 1s linear' }} />
      </g>
      <Label x={450} y={102} t="STEAM DRUM V-101" size={10} />

      {/* Downcomer */}
      <Pipe d="M 320 170 L 320 600 L 334 600" c={C.water} w={10} />

      {/* ===== FLUE GAS PATH ===== */}
      <polygon points="630,200 920,200 920,600 820,600 820,300 630,300" fill="#f8fafc" stroke="#94a3b8" strokeWidth="3" />
      <path d="M 632 250 L 870 250 L 870 598" fill="none" stroke="#fb923c" strokeWidth="3" opacity=".75" className="flow" />
      <Label x={745} y={318} t="SUPERHEATER" size={9} />
      <Label x={870} y={322} t="ECONOMIZER" size={9} />
      <Label x={870} y={585} t="FLUE GAS" size={9} />

      {/* ===== SUPERHEATER (SH1, SH2) ===== */}
      <path d="M 695 215 V 285 H 710 V 215 H 725 V 285 H 740 V 215" fill="none" stroke={C.steam} strokeWidth="4" strokeLinejoin="round" />
      <path d="M 790 215 V 285 H 805 V 215 H 820 V 285 H 835 V 215" fill="none" stroke={C.steam} strokeWidth="4" strokeLinejoin="round" />
      <Pipe d="M 660 140 L 695 140 L 695 215" c={C.steam} w={8} />
      <Pipe d="M 740 215 L 740 165 L 790 165 L 790 215" c={C.steam} w={8} />
      <Pipe d="M 835 215 L 835 150 L 1185 150" c={C.steam} w={10} />
      <circle cx="765" cy="165" r="7" fill="#fff" stroke="#0ea5e9" strokeWidth="2.5" />
      <Label x={765} y={186} t="ATTEMPERATOR" size={8} />

      {/* ===== ECONOMIZER + FEEDWATER ===== */}
      <path d="M 910 460 H 830 V 440 H 910 V 420 H 830 V 400 H 910 V 380 H 830 V 360 H 910 V 345" fill="none" stroke={C.water} strokeWidth="4" strokeLinejoin="round" />
      <Pipe d="M 1013 460 L 920 460 L 910 460" c={C.water} w={8} />
      <Pipe d="M 910 345 L 935 345 L 935 70 L 560 70 L 560 110" c={C.water} w={8} />
      <Pipe d="M 765 70 L 765 158" c={C.water} w={6} />
      <rect x="975" y="320" width="120" height="45" rx="12" fill="#e0f2fe" stroke="#0284c7" strokeWidth="3" />
      <Label x={1035} y={347} t="DEAERATOR" size={10} />
      <Pipe d="M 1035 365 L 1035 438" c={C.water} w={8} />
      <g transform="translate(1035,460)">
        <circle r="22" fill="#fff" stroke="#475569" strokeWidth="3" />
        <polygon points="-9,-10 -9,10 13,0" fill={C.water} />
        <text y="38" textAnchor="middle" fontSize="9" fontWeight="700" fill="#334155">FW PUMP</text>
      </g>

      {/* ===== FUEL & AIR ===== */}
      <Pipe d="M 40 520 L 330 520" c={C.fuel} w={10} />
      <Label x={40} y={506} t="COAL / FUEL" size={9} anchor="start" />
      <Pipe d="M 40 440 L 330 440" c={C.air} w={10} />
      <Label x={40} y={426} t="COMBUSTION AIR" size={9} anchor="start" />
      <Fan x={95} y={440} tag="FD FAN" speed={s.vFd} />
      <Valve x={210} y={440} tag="DP-101" pos={s.vFd} color={C.air} damper />
      <Valve x={170} y={520} tag="FCV-101" pos={s.vFuel} color={C.fuel} />

      {/* ===== FLUE GAS TO STACK ===== */}
      <polygon points="1110,660 1150,660 1146,290 1114,290" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="3" />
      <Label x={1130} y={280} t="STACK" size={9} />
      <Pipe d="M 870 600 L 870 650 L 934 650" c={C.flue} w={12} />
      <Pipe d="M 986 650 L 1130 650 L 1130 300" c={C.flue} w={10} />
      <Fan x={960} y={650} tag="ID FAN" speed={s.vId} />
      <Valve x={1060} y={650} tag="DP-102" pos={s.vId} color={C.flue} damper />

      {/* ===== CONTROL VALVES ===== */}
      <Valve x={980} y={460} tag="FV-101" pos={s.vFw} color={C.water} />
      <Valve x={765} y={112} tag="TCV-101" pos={s.spray} color={C.water} />
      <Valve x={1100} y={150} tag="MSV" pos={100} color={C.steam} />
      <Label x={1150} y={134} t="TO TURBINE" size={9} />

      {/* ===== INSTRUMEN ===== */}
      <line x1="277" y1="140" x2="300" y2="140" stroke={C.sig} strokeWidth="1.5" className="sig" />
      <Inst x={260} y={140} tag="LT" num="101" color="#0284c7" value={`${s.level.toFixed(1)}`} unit="% LEVEL" side="l" alarm={alarmTags.has('LAL-101') || alarmTags.has('LAH-101') || alarmTags.has('LALL-101')} />
      <line x1="400" y1="77" x2="400" y2="110" stroke={C.sig} strokeWidth="1.5" className="sig" />
      <Inst x={400} y={60} tag="PT" num="101" color="#2563eb" value={s.press.toFixed(1)} unit="bar" alarm={alarmTags.has('PAH-101') || alarmTags.has('PAL-101')} />
      <line x1="975" y1="132" x2="975" y2="150" stroke={C.sig} strokeWidth="1.5" className="sig" />
      <Inst x={975} y={115} tag="TT" num="101" color="#dc2626" value={s.temp.toFixed(1)} unit="°C STEAM" alarm={alarmTags.has('TAH-101')} />
      <line x1="1010" y1="168" x2="1010" y2="198" stroke={C.sig} strokeWidth="1.5" className="sig" />
      <Inst x={1010} y={215} tag="FT" num="102" color="#ea580c" value={s.steam.toFixed(1)} unit="t/h STEAM" />
      <line x1="1000" y1="478" x2="1000" y2="503" stroke={C.sig} strokeWidth="1.5" className="sig" />
      <Inst x={1000} y={520} tag="FT" num="101" color="#0284c7" value={s.fw.toFixed(1)} unit="t/h FEED" />
      <line x1="110" y1="535" x2="110" y2="560" stroke={C.sig} strokeWidth="1.5" className="sig" />
      <Inst x={110} y={575} tag="FT" num="103" color="#92400e" value={s.fuel.toFixed(2)} unit="t/h FUEL" />
      <line x1="260" y1="440" x2="260" y2="405" stroke={C.sig} strokeWidth="1.5" className="sig" />
      <Inst x={260} y={388} tag="FT" num="104" color="#059669" value={s.air.toFixed(1)} unit="t/h AIR" side="l" />
      <line x1="787" y1="540" x2="820" y2="540" stroke={C.sig} strokeWidth="1.5" className="sig" />
      <Inst x={770} y={540} tag="AT" num="101" color="#059669" value={s.o2.toFixed(2)} unit="% O₂" side="l" alarm={alarmTags.has('AAL-101')} />
      <line x1="590" y1="277" x2="590" y2="255" stroke={C.sig} strokeWidth="1.5" className="sig" />
      <Inst x={590} y={260} tag="PT" num="104" color="#475569" value={s.draft.toFixed(0)} unit="Pa DRAFT" side="l" alarm={alarmTags.has('PAH-104')} />
      <line x1="1077" y1="560" x2="1110" y2="560" stroke={C.sig} strokeWidth="1.5" className="sig" />
      <Inst x={1060} y={560} tag="TT" num="102" color="#78716c" value={s.tfg.toFixed(0)} unit="°C STACK" side="l" />

      {/* ===== LEGEND ===== */}
      {[['Feedwater', C.water], ['Steam', C.steam], ['Fuel', C.fuel], ['Air', C.air], ['Flue gas', C.flue]].map(([t, c], i) => (
        <g key={t} transform={`translate(${30 + i * 110},700)`}>
          <line x2="26" stroke={c} strokeWidth="5" />
          <text x="32" y="4" fontSize="10" fill="#475569">{t}</text>
        </g>
      ))}
      <g transform="translate(600,700)">
        <line x2="26" stroke={C.sig} strokeWidth="2" className="sig" />
        <text x="32" y="4" fontSize="10" fill="#475569">Sinyal 4-20 mA</text>
      </g>
    </svg>
  );
}

function Spark({ vals, color }: { vals: number[]; color: string }) {
  if (vals.length < 2) return <div className="h-7" />;
  const min = Math.min(...vals), max = Math.max(...vals), r = max - min || 1;
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * 100},${27 - ((v - min) / r) * 25}`).join(' ');
  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="w-full h-7">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

const KPIS: { key: NumKey; label: string; tag: string; unit: string; color: string; dec: number; sp?: number }[] = [
  { key: 'press', label: 'Tekanan Drum', tag: 'PT-101', unit: 'bar', color: '#2563eb', dec: 1, sp: SP.press },
  { key: 'level', label: 'Level Drum', tag: 'LT-101', unit: '%', color: '#0284c7', dec: 1, sp: SP.level },
  { key: 'temp', label: 'Suhu Main Steam', tag: 'TT-101', unit: '°C', color: '#dc2626', dec: 1, sp: SP.temp },
  { key: 'steam', label: 'Steam Flow', tag: 'FT-102', unit: 't/h', color: '#ea580c', dec: 1 },
  { key: 'fw', label: 'Feedwater Flow', tag: 'FT-101', unit: 't/h', color: '#0ea5e9', dec: 1 },
  { key: 'fuel', label: 'Fuel Flow', tag: 'FT-103', unit: 't/h', color: '#92400e', dec: 2 },
  { key: 'o2', label: 'O₂ Flue Gas', tag: 'AT-101', unit: '%', color: '#059669', dec: 2, sp: SP.o2 },
  { key: 'eff', label: 'Efisiensi Boiler', tag: 'CALC', unit: '%', color: '#7c3aed', dec: 1 },
];

const pad = (v: number) => String(v).padStart(2, '0');
const stamp = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
const btn = 'flex items-center gap-1.5 px-3 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50';

export default function BoilerHMI() {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [alarmLog, setAlarmLog] = useState<AlarmEvent[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefetched, setLastRefetched] = useState<Date | null>(null);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // "Server" palsu: hidup di memori, hilang saat refresh
  const serverRef = useRef<ReturnType<typeof createFakeServer> | null>(null);
  if (!serverRef.current) serverRef.current = createFakeServer();
  const server = serverRef.current;

  const tick = useCallback(() => {
    server.tick();
    const r = server.fetchAll();
    setSamples(r.samples);
    setAlarmLog(r.alarms);
    setLastRefetched(new Date());
  }, [server]);

  useEffect(() => { tick(); }, [tick]);
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, [autoRefresh, tick]);

  const act = (fn: () => void) => { fn(); tick(); };

  const s = samples[samples.length - 1];
  const tail = useMemo(() => samples.slice(-40), [samples]);
  const activeAlarms = useMemo(() => (s ? ALARMS.filter((a) => a.test(s)) : []), [s]);
  const alarmTags = useMemo(() => new Set(activeAlarms.map((a) => a.tag)), [activeAlarms]);

  const exportExcel = async () => {
    if (samples.length === 0) return;
    setExporting(true);
    setError(null);
    try {
      const XLSX = await import('xlsx');

      const rows = samples.map((x, i) => {
        const r: Record<string, string | number> = { No: i + 1, Waktu: new Date(x.created_at).toLocaleString('id-ID') };
        VARS.forEach((v) => { r[`${v.label} [${v.unit}]`] = x[v.key]; });
        return r;
      });
      const wsData = XLSX.utils.json_to_sheet(rows);
      wsData['!cols'] = [{ wch: 6 }, { wch: 22 }, ...VARS.map(() => ({ wch: 26 }))];

      const summary = VARS.map((v) => {
        const vals = samples.map((x) => x[v.key]);
        return {
          Variabel: v.label, Satuan: v.unit, Setpoint: v.sp ?? '-',
          Min: Math.min(...vals), Maks: Math.max(...vals),
          'Rata-rata': Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)),
          Terakhir: vals[vals.length - 1],
        };
      });
      const wsSum = XLSX.utils.json_to_sheet(summary);
      wsSum['!cols'] = [{ wch: 30 }, ...Array(6).fill({ wch: 12 })];

      const alarmRows = alarmLog.length
        ? alarmLog.map((a, i) => ({ No: i + 1, Waktu: new Date(a.time).toLocaleString('id-ID'), Tag: a.tag, Deskripsi: a.text, Severity: a.sev, Status: a.state }))
        : [{ No: '-', Waktu: '-', Tag: '-', Deskripsi: 'Tidak ada alarm selama simulasi', Severity: '-', Status: '-' }];
      const wsAlm = XLSX.utils.json_to_sheet(alarmRows);
      wsAlm['!cols'] = [{ wch: 6 }, { wch: 22 }, { wch: 12 }, { wch: 32 }, { wch: 10 }, { wch: 10 }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsData, 'Data Simulasi');
      XLSX.utils.book_append_sheet(wb, wsSum, 'Ringkasan');
      XLSX.utils.book_append_sheet(wb, wsAlm, 'Log Alarm');
      XLSX.writeFile(wb, `simulasi_boiler_${stamp(new Date())}.xlsx`);
    } catch (err: any) {
      setError(err?.message || 'Gagal mengekspor file Excel.');
    } finally {
      setExporting(false);
    }
  };

  if (!s) return <div className="min-h-screen bg-slate-50" />;

  const loops = [
    { tag: 'LIC-101', name: 'Level drum (3-element) → FV-101', pv: s.level, sp: SP.level, out: s.vFw, d: 1, u: '%' },
    { tag: 'PIC-101', name: 'Tekanan drum → FCV-101 fuel', pv: s.press, sp: SP.press, out: s.vFuel, d: 1, u: 'bar' },
    { tag: 'TIC-101', name: 'Suhu main steam → TCV-101 spray', pv: s.temp, sp: SP.temp, out: s.spray, d: 1, u: '°C' },
    { tag: 'AIC-101', name: 'O₂ trim + rasio udara → DP-101', pv: s.o2, sp: SP.o2, out: s.vFd, d: 2, u: '%' },
    { tag: 'PIC-104', name: 'Draft furnace → DP-102', pv: s.draft, sp: SP.draft, out: s.vId, d: 0, u: 'Pa' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans w-full">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <main className="w-full px-4 sm:px-8 py-8">
        {/* Header & kontrol */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Flame className="w-6 h-6 text-orange-500" />
              Boiler P&ID Control
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Drum boiler pembangkit listrik <span className="text-amber-600 font-semibold"></span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-xs text-slate-500 flex items-center gap-1.5 mr-2">
              <Clock className="w-4 h-4" />
              Last updated: {lastRefetched ? lastRefetched.toLocaleTimeString() : '...'}
            </div>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${
                autoRefresh ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              {autoRefresh ? 'Live Sync On' : 'Live Sync Off'}
            </button>
            <button onClick={tick} className={btn}><RefreshCw className="w-3.5 h-3.5" />Refresh</button>
            <button onClick={() => act(() => server.loadStep(15))} className={btn}><TrendingUp className="w-3.5 h-3.5" />Beban +15</button>
            <button onClick={() => act(() => server.loadStep(-15))} className={btn}><TrendingDown className="w-3.5 h-3.5" />Beban −15</button>
            <button onClick={() => act(() => server.disturbFw())} className={btn}><Droplets className="w-3.5 h-3.5" />Gangguan Feedwater</button>
            <button onClick={() => act(() => server.reset())} className={btn}><RotateCcw className="w-3.5 h-3.5" />Reset</button>
            <button
              onClick={exportExcel}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-all shadow-sm disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              {exporting ? 'Mengekspor...' : `Export Excel (${samples.length})`}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />{error}
          </div>
        )}

        {/* Banner alarm */}
        <div className={`mb-4 rounded-xl border px-4 py-2.5 text-xs font-semibold flex flex-wrap items-center gap-2 ${
          activeAlarms.length ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}>
          <AlertTriangle className={`w-4 h-4 ${activeAlarms.length ? 'blink' : ''}`} />
          {activeAlarms.length === 0 ? 'Semua parameter normal' : `${activeAlarms.length} alarm aktif:`}
          {activeAlarms.map((a) => (
            <span key={a.tag} className={`px-2 py-0.5 rounded border ${a.sev === 'CRIT' ? 'bg-red-600 text-white border-red-700' : 'bg-amber-100 text-amber-800 border-amber-300'}`}>
              {a.tag} · {a.text}
            </span>
          ))}
        </div>

        {/* Kanvas P&ID */}
        <div className={`w-full bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden mb-6 ${autoRefresh ? '' : 'paused'}`}>
          <div className="w-full overflow-x-auto">
            <BoilerDiagram s={s} alarmTags={alarmTags} />
          </div>
        </div>

        {/* KPI + sparkline */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {KPIS.map((k) => (
            <div key={k.key} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-baseline">
                <p className="text-[11px] font-semibold text-slate-500 uppercase">{k.label}</p>
                <span className="text-[10px] text-slate-400 font-mono">{k.tag}</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                {s[k.key].toFixed(k.dec)} <span className="text-sm font-medium text-slate-400">{k.unit}</span>
              </h3>
              {k.sp !== undefined && <p className="text-[10px] text-slate-400">SP {k.sp}</p>}
              <Spark vals={tail.map((x) => x[k.key])} color={k.color} />
            </div>
          ))}
        </div>

        {/* Loop kontrol + log alarm */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 text-sm font-bold text-slate-700">Loop Kontrol PID</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-slate-500 uppercase">
                  <tr className="border-b border-slate-200">
                    <th className="text-left px-4 py-2">Tag</th>
                    <th className="text-left px-4 py-2">Fungsi</th>
                    <th className="text-right px-4 py-2">PV</th>
                    <th className="text-right px-4 py-2">SP</th>
                    <th className="text-right px-4 py-2">OUT %</th>
                    <th className="text-center px-4 py-2">Mode</th>
                  </tr>
                </thead>
                <tbody className="text-slate-800">
                  {loops.map((l) => (
                    <tr key={l.tag} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-2 font-bold">{l.tag}</td>
                      <td className="px-4 py-2">{l.name}</td>
                      <td className="px-4 py-2 text-right font-mono">{l.pv.toFixed(l.d)} {l.u}</td>
                      <td className="px-4 py-2 text-right font-mono text-slate-500">{l.sp}</td>
                      <td className="px-4 py-2 text-right font-mono font-bold">{l.out.toFixed(1)}</td>
                      <td className="px-4 py-2 text-center">
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px]">AUTO</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 text-sm font-bold text-slate-700">Log Alarm Terbaru</div>
            <ul className="text-xs divide-y divide-slate-100">
              {alarmLog.slice(-6).reverse().map((a) => (
                <li key={a.id} className="px-4 py-2 flex items-center gap-2">
                  <span className="font-mono text-slate-400">{new Date(a.time).toLocaleTimeString()}</span>
                  <span className="font-bold">{a.tag}</span>
                  <span className="flex-1 text-slate-600 truncate">{a.text}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${a.state === 'ACTIVE' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{a.state}</span>
                </li>
              ))}
              {alarmLog.length === 0 && <li className="px-4 py-6 text-center text-slate-400">Belum ada alarm. Coba tombol “Gangguan Feedwater”.</li>}
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}