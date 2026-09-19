"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from "recharts";

/* -----------------------------------------------------------------------
 * Types — aligned with the new route.ts schema (no user / count_no / created_at)
 * ---------------------------------------------------------------------*/

type MachineApiRow = {
  id: number;
  is_fg: number | boolean | null;
  product_type: string | null;
  timestamp?: string | null;
};

type MachineApiResponse =
  | { success: true; data: MachineApiRow[] }
  | { success: false; error?: string; message?: string };

type MachineKey = "17A" | "17B";
type MachineFilterKey = "All" | MachineKey;

interface MachineData {
  id: number;
  machine: MachineKey;
  machine_label: string;
  product_type: string;
  is_fg: boolean;
  timestamp?: string;
}

interface CycleThreshold {
  slow: number; // detik — batas bawah "Slow Speed"
  downtime: number; // detik — batas bawah "Downtime"
}

const MACHINES: { key: MachineKey; label: string; endpoint: string }[] = [
  { key: "17A", label: "Press 17A – TRF2000", endpoint: "/api/upin/machine_press/machine_17a_trf2000" },
  { key: "17B", label: "Press 17B – TRF2000", endpoint: "/api/upin/machine_press/machine_17b_trf2000" },
];

const REFRESH_INTERVAL_MS = 10000;

const DEFAULT_THRESHOLD: CycleThreshold = { slow: 10, downtime: 60 };
const DEFAULT_THRESHOLDS: Record<MachineFilterKey, CycleThreshold> = {
  All: { ...DEFAULT_THRESHOLD },
  "17A": { ...DEFAULT_THRESHOLD },
  "17B": { ...DEFAULT_THRESHOLD },
};

const DEFAULT_TARGETS: Record<MachineFilterKey, number> = {
  All: 600,
  "17A": 300,
  "17B": 300,
};

const machineLabel = (key: string) =>
  key === "All" ? "All Machines" : MACHINES.find((m) => m.key === key)?.label ?? key;

// Fungsi untuk mengubah detik menjadi format Jam, Menit, Detik
const formatDuration = (totalSeconds: number) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);

  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0 || parts.length === 0) parts.push(`${s}s`);

  return parts.join(" ");
};

export default function DashboardPage() {
  const [rawData, setRawData] = useState<MachineData[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]); // Default Today
  const [selectedMachine, setSelectedMachine] = useState<MachineFilterKey>("All");
  const [timeFilter, setTimeFilter] = useState<string>("daily"); // Untuk chart bawah

  // Threshold cycle time (Good / Slow / Downtime) — disimpan per mesin
  const [thresholds, setThresholds] = useState<Record<MachineFilterKey, CycleThreshold>>(DEFAULT_THRESHOLDS);
  // Target output — disimpan per mesin
  const [targets, setTargets] = useState<Record<MachineFilterKey, number>>(DEFAULT_TARGETS);

  const currentThreshold = thresholds[selectedMachine] ?? DEFAULT_THRESHOLD;
  const currentTarget = targets[selectedMachine] ?? 0;

  const updateThreshold = (field: keyof CycleThreshold, value: number) => {
    if (Number.isNaN(value) || value < 0) return;
    setThresholds((prev) => ({
      ...prev,
      [selectedMachine]: { ...(prev[selectedMachine] ?? DEFAULT_THRESHOLD), [field]: value },
    }));
  };

  const resetThreshold = () => {
    setThresholds((prev) => ({ ...prev, [selectedMachine]: { ...DEFAULT_THRESHOLD } }));
  };

  const updateTarget = (value: number) => {
    if (Number.isNaN(value) || value < 0) return;
    setTargets((prev) => ({ ...prev, [selectedMachine]: value }));
  };

  /* --- Fetch data dari kedua endpoint mesin, setiap 10 detik --------- */

  const fetchData = useCallback(async (isInitialLoad = false) => {
    try {
      const results = await Promise.all(
        MACHINES.map(async (machine) => {
          try {
            const res = await fetch(machine.endpoint, { cache: "no-store" });
            const payload: MachineApiResponse = await res.json();
            if (!res.ok || !payload.success) return [] as MachineData[];

            return payload.data.map<MachineData>((row) => ({
              id: row.id,
              machine: machine.key,
              machine_label: machine.label,
              product_type: row.product_type ?? "Unknown",
              is_fg: Boolean(row.is_fg),
              timestamp: row.timestamp ?? undefined,
            }));
          } catch {
            return [] as MachineData[];
          }
        })
      );

      const merged = results
        .flat()
        .sort((a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime());

      setRawData(merged);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      if (isInitialLoad) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(true);
    const intervalId = setInterval(() => fetchData(false), REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [fetchData]);

  // Proses Data berdasarkan Filter (Date & Machine) untuk Top Cards & Line Chart
  const processedData = useMemo(() => {
    const filtered = rawData.filter((d) => {
      const dateMatch = d.timestamp ? d.timestamp.startsWith(selectedDate) : false;
      const machineMatch = selectedMachine === "All" || d.machine === selectedMachine;
      return dateMatch && machineMatch;
    });

    const { slow: slowThreshold, downtime: downtimeThreshold } = currentThreshold;

    let totalDowntimeCount = 0;
    const chartData: any[] = [];
    const alerts: any[] = [];

    for (let i = 0; i < filtered.length; i++) {
      let cycleTime = 0;
      if (i > 0) {
        const current = new Date(filtered[i].timestamp || 0).getTime();
        const prev = new Date(filtered[i - 1].timestamp || 0).getTime();
        cycleTime = (current - prev) / 1000;
      }

      let status = "Good";
      let color = "#14b8a6"; // teal-500

      if (cycleTime > downtimeThreshold) {
        status = "Downtime";
        color = "#f43f5e"; // rose-500
        totalDowntimeCount++;
        alerts.push({
          time: filtered[i].timestamp
            ? new Date(filtered[i].timestamp!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
            : "-",
          msg: `Downtime detected (${formatDuration(cycleTime)})`,
          product: filtered[i].product_type,
          machine: filtered[i].machine_label,
          type: "error",
        });
      } else if (cycleTime >= slowThreshold && cycleTime <= downtimeThreshold) {
        status = "Slow Speed";
        color = "#f59e0b"; // amber-500
        alerts.push({
          time: filtered[i].timestamp
            ? new Date(filtered[i].timestamp!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
            : "-",
          msg: `Slow speed (${Math.round(cycleTime)}s)`,
          product: filtered[i].product_type,
          machine: filtered[i].machine_label,
          type: "warning",
        });
      }

      chartData.push({
        time: filtered[i].timestamp ? new Date(filtered[i].timestamp!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-",
        cycleTime: Math.round(cycleTime),
        status,
        color,
      });
    }

    const totalOutput = filtered.length;
    const goodQty = filtered.filter((d) => d.is_fg).length;
    const rejectQty = totalOutput - goodQty;
    const qualityRate = totalOutput > 0 ? ((goodQty / totalOutput) * 100).toFixed(1) : "0.0";
    const downtimeRate = totalOutput > 0 ? ((totalDowntimeCount / totalOutput) * 100).toFixed(1) : "0.0";

    let electricityCost = 0;
    if (filtered.length > 1 && filtered[0].timestamp && filtered[filtered.length - 1].timestamp) {
      const firstTime = new Date(filtered[0].timestamp!).getTime();
      const lastTime = new Date(filtered[filtered.length - 1].timestamp!).getTime();
      const hoursDiff = (lastTime - firstTime) / (1000 * 60 * 60);
      electricityCost = Math.max(0, hoursDiff * 500000);
    }

    return {
      filtered,
      chartData,
      alerts: alerts.reverse(),
      totalOutput,
      goodQty,
      rejectQty,
      qualityRate,
      downtimeRate,
      electricityCost,
    };
  }, [rawData, selectedDate, selectedMachine, currentThreshold]);

  // ==========================================
  // DATA REAL-TIME UNTUK BOTTOM CHART
  // ==========================================
  const bottomChartData = useMemo(() => {
    const machineFiltered = rawData.filter((d) => selectedMachine === "All" || d.machine === selectedMachine);

    const targetDate = new Date(selectedDate);
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth();

    let result: { label: string; qty: number }[] = [];

    if (timeFilter === "daily") {
      result = Array.from({ length: 24 }, (_, i) => ({
        label: `${i.toString().padStart(2, "0")}:00`,
        qty: 0,
      }));

      machineFiltered.forEach((d) => {
        if (!d.timestamp) return;
        if (d.timestamp.startsWith(selectedDate)) {
          const hour = new Date(d.timestamp).getHours();
          result[hour].qty += 1;
        }
      });
    } else if (timeFilter === "weekly") {
      const days = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
      result = days.map((day) => ({ label: day, qty: 0 }));

      const dayOfWeek = targetDate.getDay();
      const diffToMonday = targetDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);

      const startOfWeek = new Date(targetDate);
      startOfWeek.setDate(diffToMonday);
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      machineFiltered.forEach((d) => {
        if (!d.timestamp) return;
        const dDate = new Date(d.timestamp);
        if (dDate >= startOfWeek && dDate <= endOfWeek) {
          let dayIdx = dDate.getDay() - 1;
          if (dayIdx === -1) dayIdx = 6;
          result[dayIdx].qty += 1;
        }
      });
    } else if (timeFilter === "monthly") {
      const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
      result = Array.from({ length: daysInMonth }, (_, i) => ({
        label: `${i + 1}`,
        qty: 0,
      }));

      machineFiltered.forEach((d) => {
        if (!d.timestamp) return;
        const dDate = new Date(d.timestamp);
        if (dDate.getFullYear() === targetYear && dDate.getMonth() === targetMonth) {
          const day = dDate.getDate();
          result[day - 1].qty += 1;
        }
      });
    } else if (timeFilter === "yearly") {
      const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
      result = months.map((m) => ({ label: m, qty: 0 }));

      machineFiltered.forEach((d) => {
        if (!d.timestamp) return;
        const dDate = new Date(d.timestamp);
        if (dDate.getFullYear() === targetYear) {
          const month = dDate.getMonth();
          result[month].qty += 1;
        }
      });
    }

    return result;
  }, [rawData, selectedMachine, selectedDate, timeFilter]);

  const hasBottomChartData = bottomChartData.some((d) => d.qty > 0);

  const remainOutput = Math.max(currentTarget - processedData.totalOutput, 0);
  const isTargetAchieved = processedData.totalOutput >= currentTarget && currentTarget > 0;

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    return <circle cx={cx} cy={cy} r={4} fill={payload.color} stroke="#ffffff" strokeWidth={2} />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-teal-600 font-mono font-bold tracking-widest uppercase text-xs">
          <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading Dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-teal-500/20 p-4 md:p-6 flex flex-col gap-6">

      {/* Header & Filters */}
      <header className="bg-white border border-slate-200 rounded shadow-sm px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-md font-bold tracking-wider text-slate-800 uppercase">Overview Monitoring Production</h2>
          <p className="text-xs font-mono text-slate-500 mt-0.5">
            Real-time Machine Press : <span className="text-teal-600 font-semibold">{machineLabel(selectedMachine)}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-xs text-slate-700 rounded px-3 py-2 focus:outline-none focus:border-teal-500 font-mono transition-colors"
          />
          <select
            value={selectedMachine}
            onChange={(e) => setSelectedMachine(e.target.value as MachineFilterKey)}
            className="bg-slate-50 border border-slate-300 text-xs text-slate-700 rounded px-3 py-2 focus:outline-none focus:border-teal-500 font-mono transition-colors"
          >
            <option value="All">All Machines</option>
            {MACHINES.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Cycle Time Threshold Settings — disesuaikan per mesin yang dipilih */}
      <div className="bg-white border border-slate-200 rounded shadow-sm px-6 py-4 flex flex-col md:flex-row md:items-center gap-4">
        <div className="shrink-0">
          <h3 className="text-[11px] font-bold text-teal-600 uppercase tracking-wider font-mono">Cycle Time Threshold</h3>
          <p className="text-[10px] font-mono text-slate-400 mt-0.5">
            Berlaku untuk: <span className="text-slate-600 font-semibold">{machineLabel(selectedMachine)}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-4 flex-1">
          <div>
            <label className="text-[10px] font-bold text-amber-600 uppercase tracking-wider font-mono mb-1 block">Slow ≥ (detik)</label>
            <input
              type="number"
              min={0}
              value={currentThreshold.slow}
              onChange={(e) => updateThreshold("slow", Number(e.target.value))}
              className="w-28 bg-slate-50 border border-slate-300 text-xs text-slate-700 rounded px-3 py-2 focus:outline-none focus:border-amber-500 font-mono transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-rose-600 uppercase tracking-wider font-mono mb-1 block">Downtime &gt; (detik)</label>
            <input
              type="number"
              min={0}
              value={currentThreshold.downtime}
              onChange={(e) => updateThreshold("downtime", Number(e.target.value))}
              className="w-28 bg-slate-50 border border-slate-300 text-xs text-slate-700 rounded px-3 py-2 focus:outline-none focus:border-rose-500 font-mono transition-colors"
            />
          </div>
          <button
            onClick={resetThreshold}
            className="text-[10px] font-bold text-slate-500 hover:text-slate-800 uppercase tracking-wider font-mono border border-slate-300 hover:border-slate-400 rounded px-3 py-2 transition-colors"
          >
            Reset Default
          </button>
          {currentThreshold.slow >= currentThreshold.downtime && (
            <span className="text-[10px] font-mono text-rose-500">⚠ Slow harus lebih kecil dari Downtime</span>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Output — dengan breakdown Output / Target / Remain */}
        <div className="bg-white border border-slate-200 p-4 rounded shadow-sm hover:border-teal-400/50 transition-colors">
          <h3 className="text-[11px] font-bold text-teal-600 uppercase tracking-wider font-mono border-b border-slate-100 pb-1.5 mb-2">Total Output</h3>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-[9px] text-slate-400 uppercase font-mono tracking-wider">Output</p>
              <p className="text-lg font-bold text-slate-800 font-mono">{processedData.totalOutput}</p>
            </div>
            <div>
              <p className="text-[9px] text-slate-400 uppercase font-mono tracking-wider">Target</p>
              <input
                type="number"
                min={0}
                value={currentTarget}
                onChange={(e) => updateTarget(Number(e.target.value))}
                className="w-full text-lg font-bold text-slate-800 font-mono bg-transparent border-b border-dashed border-slate-300 focus:outline-none focus:border-teal-500 transition-colors"
              />
            </div>
            <div>
              <p className="text-[9px] text-slate-400 uppercase font-mono tracking-wider">Remain</p>
              <p className={`text-lg font-bold font-mono ${isTargetAchieved ? "text-emerald-600" : "text-amber-600"}`}>
                {isTargetAchieved ? "0 ✓" : remainOutput}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded shadow-sm hover:border-teal-400/50 transition-colors">
          <h3 className="text-[11px] font-bold text-teal-600 uppercase tracking-wider font-mono border-b border-slate-100 pb-1.5 mb-2">Quality Rate</h3>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold font-mono ${Number(processedData.qualityRate) < 90 ? "text-rose-600" : "text-emerald-600"}`}>
              {processedData.qualityRate}%
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-mono mt-1">
            <span className="text-emerald-600">{processedData.goodQty} Good</span> / <span className="text-rose-500">{processedData.rejectQty} Reject</span>
          </p>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded shadow-sm hover:border-rose-400/50 transition-colors">
          <h3 className="text-[11px] font-bold text-teal-600 uppercase tracking-wider font-mono border-b border-slate-100 pb-1.5 mb-2">Downtime Rate</h3>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold font-mono ${Number(processedData.downtimeRate) > 10 ? "text-rose-600" : "text-teal-600"}`}>
              {processedData.downtimeRate}%
            </span>
            <span className="text-[10px] text-slate-400 font-mono">(&gt;{currentThreshold.downtime}s cycle)</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded shadow-sm hover:border-amber-400/50 transition-colors">
          <h3 className="text-[11px] font-bold text-teal-600 uppercase tracking-wider font-mono border-b border-slate-100 pb-1.5 mb-2">Electricity Cost</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-amber-600 font-mono">
              {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(processedData.electricityCost)}
            </span>
          </div>
          <p className="text-[9px] text-slate-400 font-mono mt-1">Est. 500k/hour based on runtime</p>
        </div>
      </div>

      {/* Charts & Activity Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Main Chart: Production Output (Cycle Time) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 p-5 rounded shadow-sm min-h-[350px] flex flex-col">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-4">
            <div>
              <h3 className="text-xs font-bold text-teal-600 uppercase tracking-wider font-mono">Cycle Time Analysis</h3>
              <p className="text-[10px] font-mono text-slate-500 mt-1">
                <span className="text-teal-600">● &lt;{currentThreshold.slow}s (Good)</span> |{" "}
                <span className="text-amber-500">● {currentThreshold.slow}-{currentThreshold.downtime}s (Slow)</span> |{" "}
                <span className="text-rose-500">● &gt;{currentThreshold.downtime}s (Downtime)</span>
              </p>
            </div>
          </div>
          <div className="flex-1 w-full h-full min-h-[250px]">
            {processedData.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={processedData.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickMargin={10} fontFamily="monospace" />
                  <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(val) => `${val}s`} fontFamily="monospace" />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0", borderRadius: "4px", fontSize: "11px", fontFamily: "monospace" }}
                    itemStyle={{ color: "#0f172a" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="cycleTime"
                    stroke="#14b8a6"
                    strokeWidth={2}
                    dot={<CustomDot />}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-mono">No data available for selected date.</div>
            )}
          </div>
        </div>

        {/* Recent Alerts: Cycle Time Alerts */}
        <div className="bg-white border border-slate-200 p-5 rounded shadow-sm flex flex-col h-[350px]">
          <h3 className="text-xs font-bold text-teal-600 uppercase tracking-wider font-mono border-b border-slate-100 pb-2 mb-4">Cycle Time Alerts</h3>
          <div className="space-y-2.5 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {processedData.alerts.length > 0 ? (
              processedData.alerts.map((alert, i) => (
                <div key={i} className="flex gap-3 items-start p-3 rounded bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors font-mono">
                  <div
                    className={`w-1.5 h-1.5 mt-1.5 rounded-full shrink-0 ${
                      alert.type === "error" ? "bg-rose-500 shadow-[0_0_5px_#f43f5e]" : "bg-amber-500 shadow-[0_0_5px_#f59e0b]"
                    }`}
                  />
                  <div className="flex-1">
                    <p className="text-[11px] font-semibold text-slate-700 leading-snug">{alert.msg}</p>
                    <div className="flex justify-between items-center mt-1.5">
                      <p className="text-[10px] text-slate-500">{alert.product} • {alert.machine}</p>
                      <p className="text-[9px] text-slate-400">{alert.time}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-mono">No alerts for today.</div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Chart: Date vs Qty */}
      <div className="bg-white border border-slate-200 p-5 rounded shadow-sm flex flex-col">
        <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-4">
          <h3 className="text-xs font-bold text-teal-600 uppercase tracking-wider font-mono">
            Production Quantity Trend
          </h3>
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-[10px] text-slate-700 rounded px-2 py-1 outline-none focus:border-teal-500 font-mono transition-colors"
          >
            <option value="daily">Daily (Hours)</option>
            <option value="weekly">Weekly (Days)</option>
            <option value="monthly">Monthly (Dates)</option>
            <option value="yearly">Yearly (Months)</option>
          </select>
        </div>

        <div className="w-full h-[300px]">
          {hasBottomChartData ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bottomChartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />

                <XAxis
                  dataKey="label"
                  stroke="#94a3b8"
                  fontSize={10}
                  tickMargin={10}
                  fontFamily="monospace"
                  angle={timeFilter === "monthly" ? -45 : 0}
                  textAnchor={timeFilter === "monthly" ? "end" : "middle"}
                />

                <YAxis stroke="#94a3b8" fontSize={10} allowDecimals={false} fontFamily="monospace" />
                <RechartsTooltip
                  cursor={{ fill: "#f1f5f9" }}
                  contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0", borderRadius: "4px", fontSize: "11px", fontFamily: "monospace" }}
                  itemStyle={{ color: "#0f172a" }}
                />

                <Bar dataKey="qty" radius={[2, 2, 0, 0]} maxBarSize={50}>
                  {bottomChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.qty > 0 ? "#14b8a6" : "#e2e8f0"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs font-mono">
              Tidak ada data produksi untuk filter waktu ini.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}