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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#09090b]/80 backdrop-blur-xl border border-white/[0.05] p-5 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
            Power Meter <span className="text-[#00F0FF]">Overview</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">Monitoring konsumsi daya listrik secara real-time.</p>
        </div>
        <div className="flex items-center gap-3 bg-black/50 border border-white/[0.05] px-4 py-2 rounded-xl">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00FF66] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00FF66] shadow-[0_0_8px_#00FF66]"></span>
          </span>
          <span className="text-[10px] font-bold text-[#00FF66] uppercase tracking-widest">
            System Online
          </span>
        </div>
      </div>

      {/* KPI CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Card 1: Voltage */}
        <div className="bg-[#09090b]/80 backdrop-blur-xl border border-white/[0.05] p-5 rounded-2xl relative overflow-hidden group hover:border-[#00F0FF]/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#00F0FF]/5 rounded-full blur-2xl group-hover:bg-[#00F0FF]/10 transition-all"></div>
          <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Voltage (V)</h3>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-extrabold text-white">{metrics.voltage}</span>
            <span className="text-sm text-zinc-400 mb-1">V</span>
          </div>
        </div>

        {/* Card 2: Current */}
        <div className="bg-[#09090b]/80 backdrop-blur-xl border border-white/[0.05] p-5 rounded-2xl relative overflow-hidden group hover:border-[#0066FF]/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#0066FF]/5 rounded-full blur-2xl group-hover:bg-[#0066FF]/10 transition-all"></div>
          <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Current (A)</h3>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-extrabold text-white">{metrics.current}</span>
            <span className="text-sm text-zinc-400 mb-1">A</span>
          </div>
        </div>

        {/* Card 3: Active Power */}
        <div className="bg-[#09090b]/80 backdrop-blur-xl border border-white/[0.05] p-5 rounded-2xl relative overflow-hidden group hover:border-[#00FF66]/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#00FF66]/5 rounded-full blur-2xl group-hover:bg-[#00FF66]/10 transition-all"></div>
          <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Active Power</h3>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-extrabold text-[#00FF66] drop-shadow-[0_0_10px_rgba(0,255,102,0.2)]">{metrics.activePower}</span>
            <span className="text-sm text-zinc-400 mb-1">kW</span>
          </div>
        </div>

        {/* Card 4: Power Factor */}
        <div className="bg-[#09090b]/80 backdrop-blur-xl border border-white/[0.05] p-5 rounded-2xl relative overflow-hidden group hover:border-purple-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-all"></div>
          <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Power Factor</h3>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-extrabold text-white">{metrics.powerFactor}</span>
            <span className="text-sm text-zinc-400 mb-1">PF</span>
          </div>
        </div>

        {/* Card 5: Frequency */}
        <div className="bg-[#09090b]/80 backdrop-blur-xl border border-white/[0.05] p-5 rounded-2xl relative overflow-hidden group hover:border-orange-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl group-hover:bg-orange-500/10 transition-all"></div>
          <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Frequency</h3>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-extrabold text-white">{metrics.frequency}</span>
            <span className="text-sm text-zinc-400 mb-1">Hz</span>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT GRID (Chart Placeholder & Table) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CHART SECTION (Mockup) */}
        <div className="lg:col-span-2 bg-[#09090b]/80 backdrop-blur-xl border border-white/[0.05] p-5 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Trend Konsumsi Daya</h2>
            <select className="bg-black/50 border border-white/[0.1] text-xs text-zinc-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#00F0FF]/50">
              <option>Hari Ini</option>
              <option>7 Hari Terakhir</option>
              <option>Bulan Ini</option>
            </select>
          </div>
          
          {/* Mockup Bar Chart menggunakan Flexbox */}
          <div className="flex-1 flex items-end justify-between gap-2 h-48 mt-auto border-b border-white/[0.05] pb-2">
            {[40, 65, 45, 80, 55, 90, 70, 85, 60, 75, 50, 95].map((height, idx) => (
              <div key={idx} className="w-full flex flex-col items-center gap-2 group">
                <div 
                  className="w-full bg-gradient-to-t from-[#0066FF]/40 to-[#00F0FF] rounded-t-sm opacity-70 group-hover:opacity-100 transition-all relative"
                  style={{ height: `${height}%` }}
                >
                  {/* Tooltip on hover */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {height}kW
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[9px] text-zinc-500 uppercase tracking-widest mt-3">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>23:59</span>
          </div>
        </div>

        {/* RECENT LOGS TABLE */}
        <div className="bg-[#09090b]/80 backdrop-blur-xl border border-white/[0.05] p-5 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] flex flex-col">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Log Aktivitas Terbaru</h2>
          
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.05] text-zinc-500 uppercase tracking-widest text-[9px]">
                  <th className="pb-3 font-medium">Waktu</th>
                  <th className="pb-3 font-medium">Mesin</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium text-right">Daya</th>
                </tr>
              </thead>
              <tbody className="text-zinc-300">
                {recentLogs.map((log) => (
                  <tr key={log.id} className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors">
                    <td className="py-3">{log.time}</td>
                    <td className="py-3">{log.machine}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider ${
                        log.status === "Normal" 
                          ? "bg-[#00FF66]/10 text-[#00FF66] border border-[#00FF66]/20" 
                          : "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono text-[#00F0FF]">{log.power}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <button className="w-full mt-4 py-2 rounded-lg border border-white/[0.05] text-xs font-bold text-zinc-400 hover:text-white hover:bg-white/[0.02] transition-all uppercase tracking-widest">
            Lihat Semua Log
          </button>
        </div>

      </div>
    </div>
  );
}