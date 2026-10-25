'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback, memo, useId } from 'react';

// Daftar Slot Mesin Laser
const SLOTS = ['Laser 01', 'Laser 02', 'Laser 03', 'Laser 04', 'Laser 05', 'Laser 06'];
const TICK_MS = 3000;

/* ------------------------------------------------------------------ */
/* SIMULASI SERVER                                                     */
/* Menggantikan /api/history_barcode, /api/good_barcode, /api/bad_barcode. */
/* Data disimpan di memori (useRef), jadi otomatis RESET saat refresh. */
/* ------------------------------------------------------------------ */
const PROFILE: Record<string, { maxScan: number; badRate: number }> = {
  'laser 01': { maxScan: 4, badRate: 0.06 },
  'laser 02': { maxScan: 3, badRate: 0.12 },
  'laser 03': { maxScan: 5, badRate: 0.04 },
  'laser 04': { maxScan: 2, badRate: 0.2 },
  'laser 05': { maxScan: 3, badRate: 0.08 },
  'laser 06': { maxScan: 4, badRate: 0.1 },
};

type Row = { Barcode: string; SlotName: string; Date: string; Time: string; Status: 'GOOD' | 'BAD' };

function createFakeServer() {
  const history: Row[] = [];
  const good: Row[] = [];
  const bad: Row[] = [];
  let seq = 0;

  return {
    tick() {
      const date = todayStr();
      const time = new Date().toISOString();
      for (const slot of SLOTS) {
        const p = PROFILE[slot.toLowerCase()];
        const n = Math.floor(Math.random() * (p.maxScan + 1));
        for (let i = 0; i < n; i++) {
          const isBad = Math.random() < p.badRate;
          const row: Row = {
            Barcode: `BC${String(++seq).padStart(8, '0')}`,
            SlotName: slot,
            Date: date,
            Time: time,
            Status: isBad ? 'BAD' : 'GOOD',
          };
          history.push(row);
          (isBad ? bad : good).push(row);
        }
      }
    },
    fetchAll() {
      return { history: { data: history }, good: { data: good }, bad: { data: bad } };
    },
    reset() {
      history.length = 0;
      good.length = 0;
      bad.length = 0;
      seq = 0;
    },
  };
}

/* ------------------------------------------------------------------ */
/* CSS animasi (hanya transform/opacity/dashoffset -> ringan)          */
/* ------------------------------------------------------------------ */
const CSS = `
.mv { animation: mv 1.6s linear infinite; }
@keyframes mv { to { transform: translateX(80px); } }
.belt { animation: belt .32s linear infinite; }
@keyframes belt { to { stroke-dashoffset: -16; } }
.led { animation: blink 1.2s steps(2, jump-none) infinite; }
.led.d2 { animation-delay: .4s; } .led.d3 { animation-delay: .8s; }
.lamp-blink { animation: blink .6s steps(2, jump-none) infinite; }
@keyframes blink { 50% { opacity: .25; } }
.beam { animation: beam .5s ease-in-out infinite alternate; }
@keyframes beam { from { opacity: .3; } to { opacity: 1; } }
.spark { transform-box: fill-box; transform-origin: center; animation: spark .4s ease-in-out infinite alternate; }
@keyframes spark { from { transform: scale(.6); opacity: .5; } to { transform: scale(1.5); opacity: 1; } }
.sig { stroke-dasharray: 6 5; animation: sig .8s linear infinite; }
@keyframes sig { to { stroke-dashoffset: -11; } }
.arm { transition: transform .35s ease-out; }

.board[data-online="false"] svg * { animation-play-state: paused !important; }
.board[data-online="false"] svg { filter: grayscale(.9); }
@media (prefers-reduced-motion: reduce) { .board svg * { animation: none !important; } }
`;

/* ------------------------------------------------------------------ */
/* Agregasi data: { slot: { tanggal: [total, good, bad] } }            */
/* ------------------------------------------------------------------ */
function aggregate(history: any, good: any, bad: any) {
  const out: Record<string, Record<string, number[]>> = {};
  const add = (arr: any, idx: number) => {
    if (!Array.isArray(arr)) return;
    for (let i = 0; i < arr.length; i++) {
      const it = arr[i];
      const slot = String(it?.SlotName ?? '').trim().toLowerCase();
      if (!slot) continue;
      const date = it.Date ?? '';
      const byDate = out[slot] || (out[slot] = {});
      const row = byDate[date] || (byDate[date] = [0, 0, 0]);
      row[idx]++;
    }
  };
  add(history, 0);
  add(good, 1);
  add(bad, 2);
  return out;
}

const fmt = (n: number) => n.toLocaleString('id-ID');
const pct = (part: number, whole: number) => (whole ? (part / whole) * 100 : 0);

function todayStr() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const pad2 = (n: number) => String(n).padStart(2, '0');
const stamp = (d: Date) =>
  `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}_${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;

/* ------------------------------------------------------------------ */
/* Komponen SVG industrial                                             */
/* ------------------------------------------------------------------ */

// Panel counter LED ala HMI/PLC
function CounterPanel({ x, y, label, color, digit, value }: { x: number; y: number; label: string; color: string; digit: string; value: number }) {
  const text = fmt(value);
  const size = Math.min(26, 116 / (text.length * 0.62));
  return (
    <g transform={`translate(${x},${y})`}>
      <rect width="140" height="62" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="2" />
      <rect width="140" height="16" rx="4" fill={color} />
      <text x="70" y="12" textAnchor="middle" fontSize="10" fontWeight="800" fill="#fff" letterSpacing=".12em">{label}</text>
      <rect x="8" y="22" width="124" height="32" rx="2" fill="#020617" />
      <text x="127" y="46" textAnchor="end" fontSize={size.toFixed(1)} fontWeight="700" fill={digit} fontFamily="ui-monospace, Menlo, monospace">{text}</text>
    </g>
  );
}

// Benda kerja (part) di conveyor; y relatif terhadap permukaan belt (y=150)
function Part({ x, tone, marked }: { x: number; tone: string; marked: boolean }) {
  return (
    <g transform={`translate(${x},0)`}>
      <rect y="126" width="40" height="24" rx="3" fill={tone} stroke="#64748b" strokeWidth="1.2" />
      <rect x="4" y="130" width="14" height="9" fill="#fff" stroke="#94a3b8" strokeWidth=".6" />
      <path d="M6 132v5M9 132v5M11 132v5M14 132v5" stroke="#0f172a" strokeWidth=".9" />
      {marked && <path d="M24 132h12M24 138h8M24 144h12" stroke="#0f172a" strokeWidth="1.6" />}
    </g>
  );
}

const partXs = (x0: number, x1: number) => {
  const xs: number[] = [];
  for (let k = -1; x0 + k * 80 < x1; k++) xs.push(x0 + k * 80);
  return xs;
};

const LineFlow = memo(function LineFlow({
  good, bad, total, size, online,
}: { good: number; bad: number; total: number; size: 'sm' | 'lg'; online: boolean }) {
  const uid = useId().replace(/:/g, '');
  const id = (n: string) => `${n}${uid}`;

  // Flash saat ada barang BAD baru (bukan permanen) -> diverter aktif, lampu tower merah berkedip
  const prevBad = useRef(bad);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (bad > prevBad.current) {
      setFlash(true);
      prevBad.current = bad;
      const t = setTimeout(() => setFlash(false), 2500);
      return () => clearTimeout(t);
    }
    prevBad.current = bad;
  }, [bad]);

  const lamp = (on: boolean, c: string, dim: string, y: number, blink?: boolean) => (
    <g>
      {on && <circle cx="540" cy={y + 8} r="14" fill={c} opacity=".3" className={blink ? 'lamp-blink' : ''} />}
      <rect x="528" y={y} width="24" height="16" rx="3" fill={on ? c : dim} stroke="#475569" strokeWidth="1.5" className={on && blink ? 'lamp-blink' : ''} />
    </g>
  );

  return (
    <div className="board" data-online={online}>
      <svg viewBox="0 0 960 345" className="w-full h-auto min-w-[640px]" style={size === 'lg' ? { maxHeight: 'calc(100vh - 230px)' } : undefined} fontFamily="ui-sans-serif, system-ui, sans-serif">
        <defs>
          <linearGradient id={id('m')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f1f5f9" /><stop offset="1" stopColor="#94a3b8" />
          </linearGradient>
          <linearGradient id={id('r')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fee2e2" /><stop offset="1" stopColor="#fca5a5" />
          </linearGradient>
          <pattern id={id('hz')} width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="12" fill="#facc15" /><rect x="6" width="6" height="12" fill="#1e293b" />
          </pattern>
          <clipPath id={id('ca')}><rect x="20" y="100" width="330" height="60" /></clipPath>
          <clipPath id={id('cb')}><rect x="470" y="100" width="310" height="60" /></clipPath>
          <clipPath id={id('cc')}><rect x="650" y="250" width="130" height="60" /></clipPath>
        </defs>

        <rect width="960" height="345" fill="#f1f5f9" />
        <rect y="335" width="960" height="10" fill="#e2e8f0" />

        {/* Kaki conveyor */}
        {[70, 250, 480, 700].map((x) => <line key={x} x1={x} y1="170" x2={x} y2="250" stroke="#94a3b8" strokeWidth="6" />)}
        {[680, 760].map((x) => <line key={x} x1={x} y1="314" x2={x} y2="335" stroke="#94a3b8" strokeWidth="6" />)}

        {/* Chute reject */}
        <polygon points="588,166 612,166 668,300 646,300" fill="#cbd5e1" stroke="#64748b" strokeWidth="2" />

        {/* Conveyor utama */}
        <rect x="20" y="146" width="760" height="4" fill="#94a3b8" />
        <rect x="20" y="150" width="760" height="16" rx="8" fill="#334155" />
        <line x1="30" x2="770" y1="158" y2="158" stroke="#64748b" strokeWidth="2" strokeDasharray="6 10" className="belt" />
        <rect x="20" y="166" width="760" height="4" fill="#94a3b8" />
        {[28, 772].map((x) => <circle key={x} cx={x} cy="158" r="11" fill="#64748b" stroke="#334155" strokeWidth="2" />)}

        {/* Benda kerja: sebelum laser (polos) & sesudah laser (bermarking) */}
        <g clipPath={`url(#${id('ca')})`}><g className="mv">{partXs(20, 350).map((x) => <Part key={x} x={x} tone={`url(#${id('m')})`} marked={false} />)}</g></g>
        <g clipPath={`url(#${id('cb')})`}><g className="mv">{partXs(470, 780).map((x) => <Part key={x} x={x} tone={`url(#${id('m')})`} marked />)}</g></g>

        {/* Reject conveyor */}
        <rect x="640" y="296" width="140" height="4" fill="#fca5a5" />
        <rect x="640" y="300" width="140" height="14" rx="7" fill="#334155" />
        <line x1="650" x2="770" y1="307" y2="307" stroke="#64748b" strokeWidth="2" strokeDasharray="6 10" className="belt" />
        <g clipPath={`url(#${id('cc')})`} style={{ opacity: flash ? 1 : 0, transition: 'opacity .4s' }}>
          <g transform="translate(0,150)"><g className="mv">{partXs(650, 780).map((x) => <Part key={x} x={x} tone={`url(#${id('r')})`} marked />)}</g></g>
        </g>

        {/* Gantry barcode scanner */}
        <rect x="108" y="84" width="8" height="66" fill="#64748b" />
        <rect x="164" y="84" width="8" height="66" fill="#64748b" />
        <rect x="104" y="76" width="72" height="12" rx="2" fill="#475569" />
        <polygon points="140,106 126,142 154,142" fill="#ef4444" opacity=".28" className="beam" />
        <rect x="128" y="88" width="24" height="18" rx="2" fill="#1e293b" />
        <circle cx="140" cy="106" r="4" fill="#ef4444" className="beam" />
        <line x1="124" x2="156" y1="142" y2="142" stroke="#ef4444" strokeWidth="2" className="beam" />

        {/* Server / PLC cabinet */}
        <rect x="215" y="14" width="90" height="84" rx="3" fill="#e2e8f0" stroke="#64748b" strokeWidth="3" />
        <text x="260" y="27" textAnchor="middle" fontSize="9" fontWeight="800" fill="#334155" letterSpacing=".06em">SERVER / PLC</text>
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <rect x="223" y={34 + i * 20} width="74" height="15" fill="#334155" />
            <circle cx="232" cy={41.5 + i * 20} r="2.5" fill="#22c55e" className={`led ${i === 1 ? 'd2' : i === 2 ? 'd3' : ''}`} />
            <path d={`M244 ${38 + i * 20}h44M244 ${41.5 + i * 20}h44M244 ${45 + i * 20}h44`} stroke="#64748b" strokeWidth="1" />
          </g>
        ))}

        {/* Jalur sinyal (kontrol) */}
        <path d="M140 76 V56 H215" fill="none" stroke="#6366f1" strokeWidth="1.6" className="sig" />
        <path d="M305 56 H410 V50" fill="none" stroke="#6366f1" strokeWidth="1.6" className="sig" />
        <path d="M305 40 H540 V56" fill="none" stroke="#6366f1" strokeWidth="1.6" className="sig" />

        {/* Laser marking enclosure */}
        <rect x="350" y="50" width="120" height="100" rx="4" fill="#e2e8f0" stroke="#64748b" strokeWidth="3" />
        <rect x="350" y="50" width="120" height="9" fill={`url(#${id('hz')})`} />
        <rect x="360" y="66" width="100" height="52" rx="3" fill="#bae6fd" opacity=".5" stroke="#475569" strokeWidth="1.5" />
        <rect x="397" y="68" width="26" height="24" rx="2" fill="#334155" />
        <rect x="405" y="92" width="10" height="8" fill="#1e293b" />
        <rect x="350" y="122" width="120" height="28" fill="#0f172a" opacity=".92" />
        <rect x="388" y="128" width="44" height="22" rx="3" fill="#64748b" />
        <line x1="410" y1="100" x2="410" y2="128" stroke="#ef4444" strokeWidth="2" className="beam" />
        <circle cx="410" cy="128" r="4" fill="#fde047" className="spark" />
        <circle cx="462" cy="58" r="0" />
        <circle cx="365" cy="76" r="4" fill="#22c55e" className="led" />

        {/* Diverter + tower light */}
        <g transform="translate(596,148)">
          <g className="arm" style={{ transform: `rotate(${flash ? 40 : 0}deg)` }}>
            <rect y="-3" width="42" height="6" rx="2" fill="#facc15" stroke="#1e293b" strokeWidth="1.2" />
          </g>
          <circle r="5" fill="#475569" />
        </g>
        <rect x="537" y="108" width="6" height="42" fill="#64748b" />
        <rect x="526" y="146" width="28" height="4" fill="#475569" />
        <rect x="528" y="56" width="24" height="4" fill="#475569" />
        {lamp(flash, '#ef4444', '#fecaca', 60, true)}
        {lamp(!online, '#f59e0b', '#fde68a', 76)}
        {lamp(online && !flash, '#22c55e', '#bbf7d0', 92)}

        {/* Bin OK & Reject + counter */}
        <rect x="800" y="110" width="140" height="64" fill="#f0fdf4" stroke="#16a34a" strokeWidth="3" />
        <rect x="800" y="110" width="140" height="8" fill={`url(#${id('hz')})`} />
        <path d="M812 126v42M830 126v42M848 126v42M866 126v42M884 126v42M902 126v42M920 126v42" stroke="#bbf7d0" strokeWidth="2" />
        <rect x="800" y="262" width="140" height="68" fill="#fef2f2" stroke="#dc2626" strokeWidth="3" className={flash ? 'lamp-blink' : ''} />
        <rect x="800" y="262" width="140" height="8" fill={`url(#${id('hz')})`} />
        <path d="M812 278v46M830 278v46M848 278v46M866 278v46M884 278v46M902 278v46M920 278v46" stroke="#fecaca" strokeWidth="2" />
        <CounterPanel x={800} y={26} label="GOOD" color="#16a34a" digit="#4ade80" value={good} />
        <CounterPanel x={800} y={192} label="REJECT" color="#dc2626" digit="#f87171" value={bad} />
        <CounterPanel x={40} y={262} label="TOTAL SCAN" color="#475569" digit="#fbbf24" value={total} />

        {/* Label stasiun */}
        {([['1 · BARCODE SCAN', 140], ['2 · LASER MARKING', 410], ['3 · SORTING', 600]] as const).map(([t, x]) => (
          <text key={t} x={x} y="196" textAnchor="middle" fontSize="11" fontWeight="800" fill="#475569" letterSpacing=".05em">{t}</text>
        ))}
        <text x="22" y="118" fontSize="10" fontWeight="700" fill="#64748b" letterSpacing=".08em">INFEED →</text>
        <text x="760" y="330" textAnchor="end" fontSize="9" fontWeight="700" fill="#b91c1c">REJECT LINE</text>
      </svg>
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Komponen kecil UI                                                   */
/* ------------------------------------------------------------------ */
function Chips({ total, good, bad }: { total: number; good: number; bad: number }) {
  return (
    <div className="flex flex-wrap gap-2 text-[10px] sm:text-xs font-bold">
      <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded">Total: {fmt(total)}</span>
      <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">Good: {fmt(good)}</span>
      <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded">Bad: {fmt(bad)}</span>
      <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">Yield: {total ? pct(good, total).toFixed(1) + '%' : '-'}</span>
    </div>
  );
}

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      {off ? (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
      ) : (
        <>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </>
      )}
    </svg>
  );
}

type Stats = { h: number; g: number; b: number };

const SlotCard = memo(function SlotCard({
  slot, stats, visible, onToggle, online,
}: { slot: string; stats: Stats; visible: boolean; onToggle: (slot: string) => void; online: boolean }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
      <div className="bg-slate-50 border-b border-slate-200 p-3 flex flex-wrap justify-between items-center gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-black text-slate-800 uppercase">{slot}</h2>
          <Chips total={stats.h} good={stats.g} bad={stats.b} />
        </div>
        <button
          onClick={() => onToggle(slot)}
          aria-pressed={!visible}
          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-md transition-colors flex items-center gap-1 border border-indigo-200"
        >
          <EyeIcon off={visible} />
          {visible ? 'Hide' : 'Unhide'}
        </button>
      </div>
      {visible && (
        <div className="p-3 overflow-x-auto">
          <LineFlow good={stats.g} bad={stats.b} total={stats.h} size="sm" online={online} />
        </div>
      )}
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Halaman utama                                                       */
/* ------------------------------------------------------------------ */
export default function HMIDashboard() {
  const [agg, setAgg] = useState<Record<string, Record<string, number[]>>>({});
  const [isOnline, setIsOnline] = useState(true);
  const [lastUpdate, setLastUpdate] = useState('');
  const [filterDate, setFilterDate] = useState(todayStr());
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Kontrol simulasi
  const [simPaused, setSimPaused] = useState(false);
  const [simOffline, setSimOffline] = useState(false);

  const [viewMode, setViewMode] = useState<'all' | 'single'>('all');
  const [selectedSlot, setSelectedSlot] = useState(SLOTS[0]);
  const [visibleLines, setVisibleLines] = useState<Record<string, boolean>>(
    SLOTS.reduce((acc, slot) => ({ ...acc, [slot]: true }), {})
  );

  // "Server" palsu: hidup di memori, hilang saat refresh
  const serverRef = useRef<ReturnType<typeof createFakeServer> | null>(null);
  if (!serverRef.current) serverRef.current = createFakeServer();

  const pausedRef = useRef(false);
  const offlineRef = useRef(false);
  pausedRef.current = simPaused;
  offlineRef.current = simOffline;

  const pull = useCallback(() => {
    const server = serverRef.current!;
    if (offlineRef.current) {
      setIsOnline(false);
      return;
    }
    const { history, good, bad } = server.fetchAll();
    setAgg(aggregate(history.data, good.data, bad.data));
    setLastUpdate(new Date().toLocaleTimeString());
    setIsOnline(true);
  }, []);

  useEffect(() => {
    const server = serverRef.current!;
    const tick = () => {
      if (!pausedRef.current) server.tick();
      pull();
    };
    tick();
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, [pull]);

  const resetSim = () => {
    serverRef.current!.reset();
    pull();
  };

  const statsBySlot = useMemo(() => {
    const res: Record<string, Stats> = {};
    for (const slot of SLOTS) {
      const rows = agg[slot.toLowerCase()] || {};
      let h = 0, g = 0, b = 0;
      if (filterDate) {
        const r = rows[filterDate];
        if (r) [h, g, b] = r;
      } else {
        for (const k in rows) {
          h += rows[k][0];
          g += rows[k][1];
          b += rows[k][2];
        }
      }
      res[slot] = { h, g, b };
    }
    return res;
  }, [agg, filterDate]);

  const toggleLine = useCallback((slot: string) => {
    setVisibleLines((prev) => ({ ...prev, [slot]: !prev[slot] }));
  }, []);

  const stepSlot = (dir: number) => {
    const i = SLOTS.indexOf(selectedSlot);
    setSelectedSlot(SLOTS[(i + dir + SLOTS.length) % SLOTS.length]);
  };

  // Export Excel: sheet Ringkasan (sesuai filter tanggal), Per Tanggal, dan Data Barcode (log lengkap)
  const exportExcel = async () => {
    setExporting(true);
    setError(null);
    try {
      const XLSX = await import('xlsx');
      const { history, good, bad } = serverRef.current!.fetchAll();
      const a = aggregate(history.data, good.data, bad.data);
      const r2 = (v: number) => Number(v.toFixed(2));

      // 1) Ringkasan per line
      let T = 0, G = 0, B = 0;
      const summary: Record<string, string | number>[] = SLOTS.map((slot) => {
        const rows = a[slot.toLowerCase()] || {};
        let h = 0, g = 0, b = 0;
        const list = filterDate ? [rows[filterDate]] : Object.values(rows);
        list.forEach((r) => { if (r) { h += r[0]; g += r[1]; b += r[2]; } });
        T += h; G += g; B += b;
        return { Line: slot, Tanggal: filterDate || 'Semua tanggal', Total: h, Good: g, Bad: b, 'Yield (%)': r2(pct(g, h)), 'Reject (%)': r2(pct(b, h)) };
      });
      summary.push({ Line: 'SEMUA LINE', Tanggal: filterDate || 'Semua tanggal', Total: T, Good: G, Bad: B, 'Yield (%)': r2(pct(G, T)), 'Reject (%)': r2(pct(B, T)) });
      const wsSum = XLSX.utils.json_to_sheet(summary);
      wsSum['!cols'] = [{ wch: 14 }, { wch: 16 }, ...Array(5).fill({ wch: 12 })];

      // 2) Per tanggal
      const perDate: Record<string, string | number>[] = [];
      SLOTS.forEach((slot) => {
        const rows = a[slot.toLowerCase()] || {};
        Object.keys(rows).sort().forEach((d) => {
          const [h, g, b] = rows[d];
          perDate.push({ Line: slot, Tanggal: d, Total: h, Good: g, Bad: b, 'Yield (%)': r2(pct(g, h)), 'Reject (%)': r2(pct(b, h)) });
        });
      });
      const wsDate = XLSX.utils.json_to_sheet(perDate);
      wsDate['!cols'] = [{ wch: 14 }, { wch: 14 }, ...Array(5).fill({ wch: 12 })];

      // 3) Log barcode lengkap
      const raw = (history.data as Row[]).map((r, i) => ({
        No: i + 1,
        Waktu: new Date(r.Time).toLocaleString('id-ID'),
        Tanggal: r.Date,
        Line: r.SlotName,
        Barcode: r.Barcode,
        Status: r.Status,
      }));
      const wsRaw = XLSX.utils.json_to_sheet(raw);
      wsRaw['!cols'] = [{ wch: 8 }, { wch: 22 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 10 }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsSum, 'Ringkasan');
      XLSX.utils.book_append_sheet(wb, wsDate, 'Per Tanggal');
      XLSX.utils.book_append_sheet(wb, wsRaw, 'Data Barcode');
      XLSX.writeFile(wb, `laser_marker_${stamp(new Date())}.xlsx`);
    } catch (err: any) {
      setError(err?.message || 'Gagal mengekspor file Excel.');
    } finally {
      setExporting(false);
    }
  };

  const cur = statsBySlot[selectedSlot];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans p-4 sm:p-6 overflow-x-hidden flex flex-col">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* HEADER DASHBOARD */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-4 gap-4">
        <div>
          <h1 className="text-2xl font-black text-indigo-700 tracking-wide">LASER MARKER HMI</h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">PRODUCTION FLOW MONITORING SYSTEM</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Kontrol simulasi */}
          <div role="group" aria-label="Kontrol simulasi" className="flex items-center gap-1 bg-amber-50 border border-amber-200 rounded-lg p-0.5">
            <button onClick={() => setSimPaused((v) => !v)} aria-pressed={simPaused} className="text-xs font-bold px-3 py-1.5 rounded-md text-amber-700 hover:bg-amber-100 transition-colors">
              {simPaused ? '▶ Lanjut' : '⏸ Jeda'}
            </button>
            <button onClick={() => setSimOffline((v) => !v)} aria-pressed={simOffline} className="text-xs font-bold px-3 py-1.5 rounded-md text-amber-700 hover:bg-amber-100 transition-colors">
              {simOffline ? 'Sambungkan' : 'Putus Koneksi'}
            </button>
            <button onClick={resetSim} className="text-xs font-bold px-3 py-1.5 rounded-md text-amber-700 hover:bg-amber-100 transition-colors">
              Reset Data
            </button>
          </div>

          {/* Pilihan mode tampilan */}
          <div role="group" aria-label="Mode tampilan" className="flex bg-slate-100 border border-slate-200 rounded-lg p-0.5">
            {([['all', 'Semua Line'], ['single', 'Satu Line']] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setViewMode(key)}
                aria-pressed={viewMode === key}
                className={`text-xs font-bold px-3 py-1.5 rounded-md transition-colors ${
                  viewMode === key ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-indigo-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Filter Tanggal */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <label htmlFor="filter-date" className="text-xs font-bold text-slate-600">Filter Tanggal:</label>
            <input
              id="filter-date"
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="text-xs border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
            {filterDate && (
              <button onClick={() => setFilterDate('')} title="Tampilkan data semua tanggal" className="text-[10px] font-bold text-rose-500 hover:text-rose-700">
                Semua tanggal
              </button>
            )}
          </div>

          {/* Export Excel */}
          <button
            onClick={exportExcel}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0 0l-4-4m4 4l4-4" />
            </svg>
            {exporting ? 'Mengekspor...' : 'Export Excel'}
          </button>

          {/* Status Sistem */}
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 tracking-wider">STATUS:</span>
              <div
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  isOnline ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-rose-100 text-rose-700 border border-rose-300'
                }`}
              >
                {isOnline ? 'ONLINE' : 'OFFLINE'}
              </div>
            </div>
            <p className="text-[9px] text-slate-400 mt-1">LAST SYNC: {lastUpdate || '--:--:--'}</p>
          </div>
        </div>
      </header>

      {error && (
        <div className="mb-4 bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-700">{error}</div>
      )}

      {/* MODE A: SEMUA LINE */}
      {viewMode === 'all' && (
        <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-4 w-full max-w-[1600px] mx-auto content-start">
          {SLOTS.map((slot) => (
            <SlotCard key={slot} slot={slot} stats={statsBySlot[slot]} visible={visibleLines[slot]} onToggle={toggleLine} online={isOnline} />
          ))}
        </div>
      )}

      {/* MODE B: SATU LINE (FULLWIDE) */}
      {viewMode === 'single' && (
        <div className="flex-1 w-full max-w-[1900px] mx-auto flex flex-col">
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-slate-50 border-b border-slate-200 p-3 sm:p-4 flex flex-wrap justify-between items-center gap-3">
              <div className="flex items-center gap-2">
                <button onClick={() => stepSlot(-1)} aria-label="Slot sebelumnya" className="w-8 h-8 rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 font-bold">‹</button>
                <label htmlFor="slot-select" className="sr-only">Pilih Slot Name</label>
                <select
                  id="slot-select"
                  value={selectedSlot}
                  onChange={(e) => setSelectedSlot(e.target.value)}
                  className="text-base font-black text-slate-800 uppercase border border-slate-300 rounded-md px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {SLOTS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <button onClick={() => stepSlot(1)} aria-label="Slot berikutnya" className="w-8 h-8 rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 font-bold">›</button>
              </div>
              <Chips total={cur.h} good={cur.g} bad={cur.b} />
            </div>

            <div className="flex-1 flex items-center justify-center p-3 sm:p-6 overflow-x-auto">
              <div className="w-full">
                <LineFlow good={cur.g} bad={cur.b} total={cur.h} size="lg" online={isOnline} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}