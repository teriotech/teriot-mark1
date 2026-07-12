"use client";

import React from "react";

// Dummy Data untuk Tabel Peringatan Stok (Stock Alerts)
const stockAlerts = [
  { id: "PRD-001", name: "Compressor Unit X", stock: 12, minStock: 50, status: "Kritis" },
  { id: "PRD-042", name: "Evaporator Coil", stock: 45, minStock: 100, status: "Rendah" },
  { id: "PRD-088", name: "Thermostat Sensor", stock: 8, minStock: 30, status: "Kritis" },
  { id: "PRD-102", name: "Copper Tube 1/4", stock: 120, minStock: 150, status: "Rendah" },
];

export default function ManagementDashboardPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-teal-500/30 p-4 md:p-6 flex flex-col gap-6 animate-in fade-in duration-500">
      
      {/* HEADER SECTION */}
      <header className="bg-slate-900 border border-slate-800 rounded shadow-xl px-6 py-4 flex flex-col gap-1">
        <h1 className="text-md font-bold tracking-wider text-slate-200 uppercase">
          Management <span className="text-teal-400">Overview</span>
        </h1>
        <p className="text-xs font-mono text-slate-500 mt-0.5">
          Ringkasan eksekutif performa bisnis, finansial, dan status inventaris secara real-time.
        </p>
      </header>

      {/* KPI CARDS SECTION */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Revenue */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded shadow-xl hover:border-teal-500/30 transition-colors group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-teal-500/10 border border-teal-500/20 rounded text-teal-400 group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="flex items-center gap-1 text-[10px] font-bold text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2 py-1 rounded font-mono">
              ↑ 12.5%
            </span>
          </div>
          <h3 className="text-2xl font-bold text-slate-100 mb-1 font-mono">Rp 14.2 M</h3>
          <p className="text-[11px] text-slate-400 font-mono">Total Pendapatan (Bulan Ini)</p>
        </div>

        {/* Card 2: Operational Cost */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded shadow-xl hover:border-amber-500/30 transition-colors group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded text-amber-400 group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
              </svg>
            </div>
            <span className="flex items-center gap-1 text-[10px] font-bold text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2 py-1 rounded font-mono">
              ↓ 3.2%
            </span>
          </div>
          <h3 className="text-2xl font-bold text-slate-100 mb-1 font-mono">Rp 4.8 M</h3>
          <p className="text-[11px] text-slate-400 font-mono">Biaya Operasional (Cost)</p>
        </div>

        {/* Card 3: Overall Equipment Effectiveness (OEE) */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded shadow-xl hover:border-blue-500/30 transition-colors group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded text-blue-400 group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
            <span className="flex items-center gap-1 text-[10px] font-bold text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2 py-1 rounded font-mono">
              ↑ 1.8%
            </span>
          </div>
          <h3 className="text-2xl font-bold text-blue-400 mb-1 font-mono">89.4%</h3>
          <p className="text-[11px] text-slate-400 font-mono">Efisiensi Produksi (OEE)</p>
        </div>

        {/* Card 4: Total Inventory Value */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded shadow-xl hover:border-teal-500/30 transition-colors group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-teal-500/10 border border-teal-500/20 rounded text-teal-400 group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H2.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
            </div>
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse mt-1"></span>
          </div>
          <h3 className="text-2xl font-bold text-slate-100 mb-1 font-mono">Rp 8.5 M</h3>
          <p className="text-[11px] text-slate-400 font-mono">Nilai Total Stok Gudang</p>
        </div>
      </div>

      {/* MAIN CONTENT SECTION (Chart & Table) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Financial Trend Chart Placeholder */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded shadow-xl p-5 flex flex-col">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-4">
            <div>
              <h2 className="text-xs font-bold text-teal-400 uppercase tracking-wider font-mono">Financial Overview</h2>
              <p className="text-[10px] text-slate-500 mt-1 font-mono">Perbandingan Pendapatan vs Biaya Operasional</p>
            </div>
            <select className="bg-slate-950 border border-slate-800 text-[10px] text-slate-300 rounded px-2 py-1 outline-none focus:border-teal-500 font-mono transition-colors">
              <option>Tahun Ini</option>
              <option>Kuartal Ini</option>
              <option>Bulan Ini</option>
            </select>
          </div>
          
          {/* Placeholder for Chart */}
          <div className="flex-1 min-h-[300px] border border-dashed border-slate-700 rounded flex flex-col items-center justify-center text-slate-500 gap-3 bg-slate-950/50 relative overflow-hidden">
            {/* Dekorasi Background Chart */}
            <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-teal-500/5 to-transparent pointer-events-none"></div>
            
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 opacity-50 text-teal-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono text-slate-400">Area Grafik Finansial</span>
            <span className="text-[10px] text-center px-4 max-w-xs font-mono text-slate-600">
              Integrasikan Bar Chart atau Line Chart di sini untuk memvisualisasikan tren profitabilitas perusahaan.
            </span>
          </div>
        </div>

        {/* Right Column: Inventory Alerts Table */}
        <div className="bg-slate-900 border border-slate-800 rounded shadow-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/20">
            <h2 className="text-xs font-bold text-teal-400 uppercase tracking-wider font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              Stock Alerts
            </h2>
            <button className="text-[10px] font-bold text-slate-400 hover:text-teal-400 transition-colors uppercase tracking-wider font-mono">
              Lihat Gudang
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="flex flex-col divide-y divide-slate-800/50">
              {stockAlerts.map((item, index) => (
                <div key={index} className="p-4 hover:bg-slate-950/30 transition-colors flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xs font-bold text-slate-200 font-mono">{item.name}</h4>
                      <span className="text-[10px] font-mono text-slate-500">{item.id}</span>
                    </div>
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded border font-mono ${
                      item.status === "Kritis" 
                        ? "bg-rose-500/10 text-rose-400 border-rose-500/20" 
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }`}>
                      {item.status}
                    </span>
                  </div>
                  
                  {/* Progress Bar Visualisasi Stok */}
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${item.status === "Kritis" ? "bg-rose-500" : "bg-amber-400"}`}
                        style={{ width: `${(item.stock / item.minStock) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap font-mono">
                      {item.stock} / {item.minStock}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="p-4 border-t border-slate-800 bg-slate-950/20">
            <button className="w-full py-2 rounded border border-slate-800 text-[11px] font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all uppercase tracking-wider font-mono">
              Buat Purchase Order
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
