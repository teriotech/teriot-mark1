"use client";

import React, { useState, useEffect } from "react";

export default function PowerMeterDashboard() {
  // State untuk simulasi data real-time
  const [metrics, setMetrics] = useState({
    voltage: 220.5,
    current: 15.2,
    activePower: 3.35,
    powerFactor: 0.98,
    frequency: 50.01,
    totalEnergy: 12450.8,
  });

  // Simulasi update data setiap 2 detik
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics((prev) => ({
        ...prev,
        voltage: +(220 + Math.random() * 2 - 1).toFixed(1),
        current: +(15 + Math.random() * 1 - 0.5).toFixed(2),
        activePower: +(3.3 + Math.random() * 0.2 - 0.1).toFixed(2),
        powerFactor: +(0.97 + Math.random() * 0.02).toFixed(2),
        frequency: +(50 + Math.random() * 0.04 - 0.02).toFixed(2),
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Data dummy untuk tabel log
  const recentLogs = [
    { id: 1, time: "10:45:22", machine: "Machine Press A", status: "Normal", power: "3.35 kW" },
    { id: 2, time: "10:40:15", machine: "Machine Injection B", status: "Warning", power: "4.12 kW" },
    { id: 3, time: "10:35:01", machine: "Machine Mold C", status: "Normal", power: "2.80 kW" },
    { id: 4, time: "10:30:55", machine: "Machine Role D", status: "Normal", power: "3.10 kW" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-teal-500/20 p-4 md:p-6 flex flex-col gap-6 animate-in fade-in duration-500">
      
      {/* HEADER SECTION */}
      <header className="bg-white border border-slate-200 rounded shadow-sm px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-md font-bold tracking-wider text-slate-800 uppercase">
              Power Meter <span className="text-teal-700">Overview</span>
            </h1>
            <p className="text-xs font-mono text-slate-500 mt-0.5">
              Monitoring konsumsi daya listrik secara real-time.
            </p>
          </div>
        </div>
      </header>

      {/* KPI CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Card 1: Voltage */}
        <div className="bg-white border border-slate-200 p-4 rounded shadow-sm hover:border-teal-300 transition-colors">
          <h3 className="text-[11px] font-bold text-teal-700 uppercase tracking-wider font-mono border-b border-slate-100 pb-1.5 mb-2">Voltage (V)</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-800 font-mono">{metrics.voltage}</span>
            <span className="text-[10px] text-slate-500 font-mono">V</span>
          </div>
        </div>

        {/* Card 2: Current */}
        <div className="bg-white border border-slate-200 p-4 rounded shadow-sm hover:border-teal-300 transition-colors">
          <h3 className="text-[11px] font-bold text-teal-700 uppercase tracking-wider font-mono border-b border-slate-100 pb-1.5 mb-2">Current (A)</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-800 font-mono">{metrics.current}</span>
            <span className="text-[10px] text-slate-500 font-mono">A</span>
          </div>
        </div>

        {/* Card 3: Active Power */}
        <div className="bg-white border border-slate-200 p-4 rounded shadow-sm hover:border-teal-300 transition-colors">
          <h3 className="text-[11px] font-bold text-teal-700 uppercase tracking-wider font-mono border-b border-slate-100 pb-1.5 mb-2">Active Power</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-teal-600 font-mono">{metrics.activePower}</span>
            <span className="text-[10px] text-slate-500 font-mono">kW</span>
          </div>
        </div>

        {/* Card 4: Power Factor */}
        <div className="bg-white border border-slate-200 p-4 rounded shadow-sm hover:border-teal-300 transition-colors">
          <h3 className="text-[11px] font-bold text-teal-700 uppercase tracking-wider font-mono border-b border-slate-100 pb-1.5 mb-2">Power Factor</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-800 font-mono">{metrics.powerFactor}</span>
            <span className="text-[10px] text-slate-500 font-mono">PF</span>
          </div>
        </div>

        {/* Card 5: Frequency */}
        <div className="bg-white border border-slate-200 p-4 rounded shadow-sm hover:border-teal-300 transition-colors">
          <h3 className="text-[11px] font-bold text-teal-700 uppercase tracking-wider font-mono border-b border-slate-100 pb-1.5 mb-2">Frequency</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-800 font-mono">{metrics.frequency}</span>
            <span className="text-[10px] text-slate-500 font-mono">Hz</span>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT GRID (Chart Placeholder & Table) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CHART SECTION (Mockup) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 p-5 rounded shadow-sm flex flex-col">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-4">
            <h2 className="text-xs font-bold text-teal-700 uppercase tracking-wider font-mono">Trend Konsumsi Daya</h2>
            <select className="bg-white border border-slate-300 text-[10px] text-slate-700 rounded px-2 py-1 outline-none focus:border-teal-500 font-mono transition-colors shadow-sm">
              <option>Hari Ini</option>
              <option>7 Hari Terakhir</option>
              <option>Bulan Ini</option>
            </select>
          </div>
          
          {/* Mockup Bar Chart menggunakan Flexbox */}
          <div className="flex-1 flex items-end justify-between gap-2 h-48 mt-auto border-b border-slate-100 pb-2">
            {[40, 65, 45, 80, 55, 90, 70, 85, 60, 75, 50, 95].map((height, idx) => (
              <div key={idx} className="w-full flex flex-col items-center gap-2 group">
                <div 
                  className="w-full bg-slate-200 hover:bg-teal-500 rounded-t-sm transition-colors relative"
                  style={{ height: `${height}%` }}
                >
                  {/* Tooltip on hover */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white border border-slate-200 text-slate-700 shadow-sm text-[10px] font-mono px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    {height}kW
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-3">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>23:59</span>
          </div>
        </div>

        {/* RECENT LOGS TABLE */}
        <div className="bg-white border border-slate-200 p-5 rounded shadow-sm flex flex-col">
          <h2 className="text-xs font-bold text-teal-700 uppercase tracking-wider font-mono border-b border-slate-100 pb-2 mb-4">Log Aktivitas Terbaru</h2>
          
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
                  <th className="p-3 font-medium">Waktu</th>
                  <th className="p-3 font-medium">Mesin</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium text-right">Daya</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {recentLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 text-slate-500">{log.time}</td>
                    <td className="p-3">{log.machine}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider ${
                        log.status === "Normal" 
                          ? "bg-teal-50 text-teal-700 border border-teal-200" 
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="p-3 text-right text-teal-600 font-semibold">{log.power}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <button className="w-full mt-4 py-2 rounded border border-slate-200 text-[11px] font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all uppercase tracking-wider font-mono">
            Lihat Semua Log
          </button>
        </div>

      </div>
    </div>
  );
}