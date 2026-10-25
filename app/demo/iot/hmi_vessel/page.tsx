"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  RefreshCw,
  Clock,
  AlertCircle,
  Activity,
  Download,
  RotateCcw,
} from 'lucide-react';

interface IoTRecord {
  id: string | number;
  sensor_name: string;
  sensor_value: number | string;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/* SIMULASI SERVER                                                     */
/* Menggantikan fetch('/api/iot_esp'). Data disimpan di memori         */
/* (useRef), jadi otomatis RESET saat halaman di-refresh.              */
/* Tiap tick server menghasilkan 3 record: pressure, temperature, flow */
/* dengan pola random walk supaya nilainya bergerak halus & realistis. */
/* ------------------------------------------------------------------ */
const TICK_MS = 3000;
const MAX_RECORDS = 10000;

// Rentang instrumen (sama dengan skala 4-20 mA di diagram)
const RANGE = { pressure: 150, temperature: 100, flow: 1200 } as const;
const UNIT = { pressure: 'psi', temperature: '°C', flow: 'L/m' } as const;
type SensorKey = keyof typeof RANGE;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const round1 = (v: number) => Math.round(v * 10) / 10;
const walk = (v: number, step: number, max: number) =>
  round1(clamp(v + (Math.random() - 0.5) * 2 * step, max * 0.05, max * 0.95));

function createFakeServer() {
  const records: IoTRecord[] = [];
  let seq = 0;
  let state: Record<SensorKey, number> = { pressure: 90, temperature: 60, flow: 700 };

  return {
    tick() {
      state = {
        pressure: walk(state.pressure, 4, RANGE.pressure),
        temperature: walk(state.temperature, 1.5, RANGE.temperature),
        flow: walk(state.flow, 35, RANGE.flow),
      };
      const created_at = new Date().toISOString();
      (Object.keys(state) as SensorKey[]).forEach((k) => {
        records.push({ id: ++seq, sensor_name: k, sensor_value: state[k], created_at });
      });
      if (records.length > MAX_RECORDS) records.splice(0, records.length - MAX_RECORDS);
    },
    // Meniru respon API: salinan array record
    fetchAll(): IoTRecord[] {
      return records.slice();
    },
    reset() {
      records.length = 0;
      seq = 0;
      state = { pressure: 90, temperature: 60, flow: 700 };
    },
  };
}

// Konversi nilai ke sinyal 4-20 mA: ((Value / MaxRange) * 16) + 4
const toMA = (value: number, maxRange: number) => (value === 0 ? 0 : (value / maxRange) * 16 + 4);
const calculateMA = (value: number, maxRange: number) => toMA(value, maxRange).toFixed(2);

const pad = (n: number) => String(n).padStart(2, '0');
const stamp = (d: Date) =>
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;

export default function HMIDashboard() {
  const [data, setData] = useState<IoTRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [lastRefetched, setLastRefetched] = useState<Date | null>(null);
  const [exporting, setExporting] = useState<boolean>(false);

  // "Server" palsu: hidup di memori, hilang saat refresh
  const serverRef = useRef<ReturnType<typeof createFakeServer> | null>(null);
  if (!serverRef.current) serverRef.current = createFakeServer();

  // "Fetch" dari server palsu
  const pull = useCallback(() => {
    setError(null);
    setData(serverRef.current!.fetchAll());
    setLastRefetched(new Date());
    setLoading(false);
  }, []);

  // Satu siklus: server membuat data baru, lalu frontend mengambilnya
  const tick = useCallback(() => {
    serverRef.current!.tick();
    pull();
  }, [pull]);

  // Data pertama langsung muncul
  useEffect(() => {
    tick();
  }, [tick]);

  // Simulasi data masuk tiap 3 detik
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(tick, TICK_MS);
    return () => clearInterval(interval);
  }, [autoRefresh, tick]);

  const resetSim = () => {
    serverRef.current!.reset();
    tick();
  };

  // Nilai terakhir tiap sensor (record sudah berurutan dari lama ke baru)
  const dashboardData = useMemo(() => {
    let latestPressure = 0;
    let latestTemp = 0;
    let latestFlow = 0;

    for (const item of data) {
      const value = Number(item.sensor_value);
      const name = item.sensor_name.toLowerCase();
      if (name.includes('pressure')) latestPressure = value;
      else if (name.includes('temperature')) latestTemp = value;
      else if (name.includes('flow')) latestFlow = value;
    }
    return { latestPressure, latestTemp, latestFlow };
  }, [data]);

  // Baris riwayat per waktu (format lebar: 1 baris = 1 tick)
  const timeline = useMemo(() => {
    const map = new Map<string, { time: string; pressure: number; temperature: number; flow: number }>();
    for (const r of data) {
      let row = map.get(r.created_at);
      if (!row) {
        row = { time: r.created_at, pressure: 0, temperature: 0, flow: 0 };
        map.set(r.created_at, row);
      }
      const key = r.sensor_name.toLowerCase() as SensorKey;
      if (key in RANGE) row[key] = Number(r.sensor_value);
    }
    return [...map.values()];
  }, [data]);

  // Export hasil simulasi ke Excel (.xlsx): sheet "Data Simulasi" + "Ringkasan"
  const exportExcel = async () => {
    if (timeline.length === 0) return;
    setExporting(true);
    setError(null);
    try {
      const XLSX = await import('xlsx');

      const rows = timeline.map((t, i) => ({
        No: i + 1,
        Waktu: new Date(t.time).toLocaleString('id-ID'),
        'Pressure (psi)': t.pressure,
        'Pressure (mA)': Number(toMA(t.pressure, RANGE.pressure).toFixed(2)),
        'Temperature (°C)': t.temperature,
        'Temperature (mA)': Number(toMA(t.temperature, RANGE.temperature).toFixed(2)),
        'Flow (L/m)': t.flow,
        'Flow (mA)': Number(toMA(t.flow, RANGE.flow).toFixed(2)),
      }));
      const wsData = XLSX.utils.json_to_sheet(rows);
      wsData['!cols'] = [{ wch: 6 }, { wch: 22 }, ...Array(6).fill({ wch: 18 })];

      const summary = (['pressure', 'temperature', 'flow'] as SensorKey[]).map((k) => {
        const vals = timeline.map((t) => t[k]);
        const sum = vals.reduce((a, b) => a + b, 0);
        return {
          Sensor: k.charAt(0).toUpperCase() + k.slice(1),
          Satuan: UNIT[k],
          'Range Maks': RANGE[k],
          Jumlah: vals.length,
          Min: Math.min(...vals),
          Maks: Math.max(...vals),
          'Rata-rata': Number((sum / vals.length).toFixed(2)),
          Terakhir: vals[vals.length - 1],
        };
      });
      const wsSum = XLSX.utils.json_to_sheet(summary);
      wsSum['!cols'] = Array(8).fill({ wch: 14 });

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsData, 'Data Simulasi');
      XLSX.utils.book_append_sheet(wb, wsSum, 'Ringkasan');
      XLSX.writeFile(wb, `simulasi_pid_${stamp(new Date())}.xlsx`);
    } catch (err: any) {
      setError(err?.message || 'Gagal mengekspor file Excel.');
    } finally {
      setExporting(false);
    }
  };

  const recent = timeline.slice(-8).reverse();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col w-full">
      {/* CSS untuk Animasi Sinyal 4-20mA */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes signal-flow {
          from { stroke-dashoffset: 24; }
          to { stroke-dashoffset: 0; }
        }
        .animate-signal {
          stroke-dasharray: 8 6;
          animation: signal-flow 1s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-signal { animation: none; }
        }
      `}} />

      <main className="flex-1 w-full px-4 sm:px-8 py-8 max-w-none">

        {/* Header & Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-6 h-6 text-blue-600" />
              P&ID HMI Dashboard
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Real-time Process & Instrumentation Diagram <span className="text-amber-600 font-semibold"></span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="text-xs text-slate-500 flex items-center gap-1.5 mr-2">
              <Clock className="w-4 h-4" />
              Last updated: {lastRefetched ? lastRefetched.toLocaleTimeString() : '...'}
            </div>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${
                autoRefresh
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              {autoRefresh ? 'Live Sync On' : 'Live Sync Off'}
            </button>
            <button
              onClick={tick}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={resetSim}
              className="flex items-center gap-1.5 px-3 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-all shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Data
            </button>
            <button
              onClick={exportExcel}
              disabled={exporting || timeline.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-all shadow-sm disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              {exporting ? 'Mengekspor...' : `Export Excel (${timeline.length})`}
            </button>
          </div>
        </div>

        {/* Error State Banner */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 shadow-sm">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-800">Terjadi Kesalahan</h3>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* HMI Canvas Area (light theme) */}
        <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden relative mb-8">
          <div className="absolute top-4 left-4 text-slate-500 text-xs font-mono tracking-widest">
            UNIT-01 MAIN SEPARATOR
          </div>

          {/* SVG P&ID Diagram */}
          <div className="w-full overflow-x-auto">
            <svg viewBox="0 0 1000 600" className="w-full h-auto min-w-[800px]" style={{ maxHeight: '70vh' }}>

              <defs>
                {/* Arrow Marker Definition */}
                <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#0284c7" />
                </marker>
                {/* Background grid */}
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="#f8fafc" />
              <rect width="100%" height="100%" fill="url(#grid)" />

              {/* ================= PIPES ================= */}
              {/* Inlet Pipe */}
              <path d="M 0 350 L 400 350" stroke="#94a3b8" strokeWidth="16" fill="none" />
              <path d="M 200 350 L 220 350" stroke="#0284c7" strokeWidth="4" fill="none" markerEnd="url(#arrow)" />

              {/* Outlet Pipe */}
              <path d="M 600 450 L 1000 450" stroke="#94a3b8" strokeWidth="16" fill="none" />
              <path d="M 800 450 L 820 450" stroke="#0284c7" strokeWidth="4" fill="none" markerEnd="url(#arrow)" />

              {/* ================= VESSEL ================= */}
              <rect x="400" y="150" width="200" height="350" rx="60" fill="#ffffff" stroke="#64748b" strokeWidth="6" />
              {/* Liquid Level Simulation */}
              <rect x="403" y="350" width="194" height="147" rx="50" fill="#38bdf8" opacity="0.55" />
              <path d="M 403 350 Q 500 330 597 350" fill="#38bdf8" opacity="0.55" />
              <text x="500" y="420" fill="#334155" fontSize="14" textAnchor="middle" className="font-mono">SEPARATOR V-101</text>

              {/* ================= CONTROL VALVE (CV-101) ================= */}
              <g transform="translate(250, 350)">
                <polygon points="-30,-20 -30,20 30,-20 30,20" fill="#cbd5e1" stroke="#475569" strokeWidth="2" />
                <line x1="0" y1="0" x2="0" y2="-50" stroke="#64748b" strokeWidth="4" />
                <path d="M -30 -50 Q 0 -80 30 -50 Z" fill="#ef4444" stroke="#b91c1c" strokeWidth="2" />
                <text x="0" y="-65" fill="#b91c1c" fontSize="12" textAnchor="middle" className="font-bold">CV</text>
                <text x="0" y="40" fill="#475569" fontSize="12" textAnchor="middle" className="font-mono">CV-101</text>
              </g>

              {/* ================= CONTROLLER (PLC/DCS) ================= */}
              <rect x="400" y="30" width="200" height="60" rx="8" fill="#fffbeb" stroke="#d97706" strokeWidth="3" />
              <text x="500" y="65" fill="#b45309" fontSize="18" textAnchor="middle" className="font-bold tracking-widest">DCS / PLC</text>

              {/* ================= 4-20mA SIGNAL LINES (ANIMATED) ================= */}
              <path d="M 120 325 L 120 60 L 400 60" stroke="#10b981" strokeWidth="2" fill="none" className="animate-signal" />
              <path d="M 500 125 L 500 90" stroke="#3b82f6" strokeWidth="2" fill="none" className="animate-signal" />
              <path d="M 625 350 L 680 350 L 680 60 L 600 60" stroke="#ef4444" strokeWidth="2" fill="none" className="animate-signal" />
              <path d="M 400 75 L 250 75 L 250 270" stroke="#d97706" strokeWidth="2" fill="none" className="animate-signal" />

              {/* ================= SENSORS (TRANSMITTERS) ================= */}

              {/* Flow Transmitter (FT-101) */}
              <g transform="translate(120, 350)">
                <circle cx="0" cy="0" r="25" fill="#ffffff" stroke="#10b981" strokeWidth="3" />
                <text x="0" y="5" fill="#059669" fontSize="14" textAnchor="middle" className="font-bold">FT</text>
                <rect x="-45" y="-75" width="90" height="45" rx="4" fill="#ffffff" stroke="#10b981" strokeWidth="1.5" />
                <text x="0" y="-58" fill="#0f172a" fontSize="14" textAnchor="middle" className="font-mono font-bold">{dashboardData.latestFlow}</text>
                <text x="0" y="-42" fill="#059669" fontSize="10" textAnchor="middle" className="font-mono">{calculateMA(dashboardData.latestFlow, RANGE.flow)} mA</text>
              </g>

              {/* Pressure Transmitter (PT-101) */}
              <g transform="translate(500, 150)">
                <circle cx="0" cy="0" r="25" fill="#ffffff" stroke="#3b82f6" strokeWidth="3" />
                <text x="0" y="5" fill="#2563eb" fontSize="14" textAnchor="middle" className="font-bold">PT</text>
                <rect x="35" y="-22" width="80" height="45" rx="4" fill="#ffffff" stroke="#3b82f6" strokeWidth="1.5" />
                <text x="75" y="-5" fill="#0f172a" fontSize="14" textAnchor="middle" className="font-mono font-bold">{dashboardData.latestPressure}</text>
                <text x="75" y="12" fill="#2563eb" fontSize="10" textAnchor="middle" className="font-mono">{calculateMA(dashboardData.latestPressure, RANGE.pressure)} mA</text>
              </g>

              {/* Temperature Transmitter (TT-101) */}
              <g transform="translate(600, 350)">
                <circle cx="0" cy="0" r="25" fill="#ffffff" stroke="#ef4444" strokeWidth="3" />
                <text x="0" y="5" fill="#dc2626" fontSize="14" textAnchor="middle" className="font-bold">TT</text>
                <rect x="35" y="-22" width="80" height="45" rx="4" fill="#ffffff" stroke="#ef4444" strokeWidth="1.5" />
                <text x="75" y="-5" fill="#0f172a" fontSize="14" textAnchor="middle" className="font-mono font-bold">{dashboardData.latestTemp}</text>
                <text x="75" y="12" fill="#dc2626" fontSize="10" textAnchor="middle" className="font-mono">{calculateMA(dashboardData.latestTemp, RANGE.temperature)} mA</text>
              </g>

            </svg>
          </div>
        </div>

        {/* Bottom Summary Cards (Legend & Quick Info) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-3 h-12 bg-blue-500 rounded-full"></div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Pressure (PT-101)</p>
              <h3 className="text-xl font-bold text-slate-900">{dashboardData.latestPressure} <span className="text-sm font-medium text-slate-400">psi</span></h3>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-3 h-12 bg-red-500 rounded-full"></div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Temperature (TT-101)</p>
              <h3 className="text-xl font-bold text-slate-900">{dashboardData.latestTemp} <span className="text-sm font-medium text-slate-400">°C</span></h3>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-3 h-12 bg-emerald-500 rounded-full"></div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Flow Rate (FT-101)</p>
              <h3 className="text-xl font-bold text-slate-900">{dashboardData.latestFlow} <span className="text-sm font-medium text-slate-400">L/m</span></h3>
            </div>
          </div>
        </div>

        {/* Riwayat data simulasi terbaru */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-700">Riwayat Data Simulasi (8 terbaru)</h2>
            <span className="text-xs text-slate-500">Total tersimpan: {timeline.length} baris</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-slate-500 uppercase">
                <tr className="border-b border-slate-200">
                  <th className="text-left px-4 py-2 font-semibold">Waktu</th>
                  <th className="text-right px-4 py-2 font-semibold">Pressure (psi)</th>
                  <th className="text-right px-4 py-2 font-semibold">Temperature (°C)</th>
                  <th className="text-right px-4 py-2 font-semibold">Flow (L/m)</th>
                </tr>
              </thead>
              <tbody className="font-mono text-slate-800">
                {recent.map((r) => (
                  <tr key={r.time} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-2">{new Date(r.time).toLocaleTimeString()}</td>
                    <td className="px-4 py-2 text-right text-blue-600">{r.pressure}</td>
                    <td className="px-4 py-2 text-right text-red-600">{r.temperature}</td>
                    <td className="px-4 py-2 text-right text-emerald-600">{r.flow}</td>
                  </tr>
                ))}
                {recent.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">Belum ada data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}