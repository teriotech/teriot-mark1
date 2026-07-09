"use client";

import React from "react";

// Dummy Data untuk Tabel Reject
const recentRejects = [
  { id: "RJ-1042", product: "Casing Cover A1", defect: "Goresan Permukaan", time: "10:42 AM", line: "Line 3" },
  { id: "RJ-1043", product: "Mainboard Bracket", defect: "Dimensi Tidak Sesuai", time: "11:15 AM", line: "Line 1" },
  { id: "RJ-1044", product: "Power Button", defect: "Warna Pudar", time: "13:05 PM", line: "Line 2" },
  { id: "RJ-1045", product: "Cooling Fan Blade", defect: "Retak Halus", time: "14:20 PM", line: "Line 4" },
];

export default function QualityDashboardPage() {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tighter text-white">
          Quality Control <span className="bg-gradient-to-r from-[#00F0FF] to-[#0066FF] bg-clip-text text-transparent">Dashboard</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400">
          Pantau metrik kualitas produksi, tingkat kelulusan, dan sampel reject secara real-time.
        </p>
      </div>

      {/* KPI CARDS SECTION */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Inspected */}
        <div className="bg-[#09090b]/80 backdrop-blur-xl border border-white/[0.05] p-5 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.5)] hover:border-[#00F0FF]/30 transition-colors group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-[#00F0FF]/10 rounded-lg text-[#00F0FF] group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Hari Ini</span>
          </div>
          <h3 className="text-2xl font-extrabold text-white mb-1">12,450</h3>
          <p className="text-xs text-zinc-400">Total Unit Diinspeksi</p>
        </div>

        {/* Card 2: Pass Rate */}
        <div className="bg-[#09090b]/80 backdrop-blur-xl border border-white/[0.05] p-5 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.5)] hover:border-[#00FF66]/30 transition-colors group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-[#00FF66]/10 rounded-lg text-[#00FF66] group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="flex items-center gap-1 text-[10px] font-bold text-[#00FF66] bg-[#00FF66]/10 px-2 py-1 rounded-full">
              ↑ 0.5%
            </span>
          </div>
          <h3 className="text-2xl font-extrabold text-white mb-1">98.2%</h3>
          <p className="text-xs text-zinc-400">Tingkat Kelulusan (Pass Rate)</p>
        </div>

        {/* Card 3: Reject Rate */}
        <div className="bg-[#09090b]/80 backdrop-blur-xl border border-white/[0.05] p-5 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.5)] hover:border-rose-500/30 transition-colors group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-rose-500/10 rounded-lg text-rose-500 group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <span className="flex items-center gap-1 text-[10px] font-bold text-rose-500 bg-rose-500/10 px-2 py-1 rounded-full">
              ↓ 0.2%
            </span>
          </div>
          <h3 className="text-2xl font-extrabold text-white mb-1">1.8%</h3>
          <p className="text-xs text-zinc-400">Tingkat Penolakan (Reject Rate)</p>
        </div>

        {/* Card 4: Pending Inspection */}
        <div className="bg-[#09090b]/80 backdrop-blur-xl border border-white/[0.05] p-5 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.5)] hover:border-orange-500/30 transition-colors group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500 group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
          </div>
          <h3 className="text-2xl font-extrabold text-white mb-1">45</h3>
          <p className="text-xs text-zinc-400">Menunggu Inspeksi (Pending)</p>
        </div>
      </div>

      {/* MAIN CONTENT SECTION (Table & Chart Placeholder) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Recent Rejects Table (Takes 2 columns on large screens) */}
        <div className="lg:col-span-2 bg-[#09090b]/80 backdrop-blur-xl border border-white/[0.05] rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col">
          <div className="p-5 border-b border-white/[0.05] flex justify-between items-center">
            <h2 className="text-sm font-bold text-white uppercase tracking-widest">Recent Reject Samples</h2>
            <button className="text-[10px] font-bold text-[#00F0FF] hover:text-white transition-colors uppercase tracking-widest">
              View All
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/[0.02] text-[10px] uppercase tracking-widest text-zinc-500 border-b border-white/[0.05]">
                  <th className="p-4 font-medium">ID Reject</th>
                  <th className="p-4 font-medium">Nama Produk</th>
                  <th className="p-4 font-medium">Jenis Defect</th>
                  <th className="p-4 font-medium">Line</th>
                  <th className="p-4 font-medium">Waktu</th>
                </tr>
              </thead>
              <tbody className="text-xs text-zinc-300">
                {recentRejects.map((item, index) => (
                  <tr key={index} className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 font-mono text-[#00F0FF]">{item.id}</td>
                    <td className="p-4 font-medium text-white">{item.product}</td>
                    <td className="p-4">
                      <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-1 rounded-md text-[10px]">
                        {item.defect}
                      </span>
                    </td>
                    <td className="p-4">{item.line}</td>
                    <td className="p-4 text-zinc-500">{item.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Quality Trend Chart Placeholder */}
        <div className="bg-[#09090b]/80 backdrop-blur-xl border border-white/[0.05] rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.5)] p-5 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-sm font-bold text-white uppercase tracking-widest">Quality Trend</h2>
            <select className="bg-black/50 border border-white/[0.1] text-xs text-zinc-300 rounded-lg px-2 py-1 outline-none focus:border-[#00F0FF]/50">
              <option>Minggu Ini</option>
              <option>Bulan Ini</option>
            </select>
          </div>
          
          {/* Placeholder for Chart (e.g., Recharts or Chart.js) */}
          <div className="flex-1 min-h-[250px] border border-dashed border-white/[0.1] rounded-xl flex flex-col items-center justify-center text-zinc-500 gap-3 bg-white/[0.01]">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 opacity-50">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            <span className="text-xs uppercase tracking-widest">Area Grafik (Chart)</span>
            <span className="text-[10px] text-center px-4">Gunakan library seperti Recharts atau Chart.js di sini</span>
          </div>
        </div>

      </div>
    </div>
  );
}