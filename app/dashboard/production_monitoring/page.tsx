"use client";

import React from "react";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-teal-500/20 p-4 md:p-6 flex flex-col gap-6 animate-in fade-in duration-500">
      
      {/* Header Dashboard */}
      <header className="bg-white border border-slate-200 rounded shadow-sm px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-md font-bold tracking-wider text-slate-800 uppercase">Production Monitoring</h2>
            <p className="text-xs font-mono text-slate-500 mt-0.5">Overview of real-time production metrics and equipment status.</p>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white border border-slate-200 p-5 rounded shadow-sm hover:border-teal-300 transition-colors">
          <h3 className="text-[11px] font-bold text-teal-700 uppercase tracking-wider font-mono border-b border-slate-100 pb-1.5 mb-2">Total Output</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-800 font-mono">12,450</span>
            <span className="text-[10px] text-teal-700 font-bold font-mono bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded">+5.2%</span>
          </div>
        </div>
        
        {/* Card 2 */}
        <div className="bg-white border border-slate-200 p-5 rounded shadow-sm hover:border-teal-300 transition-colors">
          <h3 className="text-[11px] font-bold text-teal-700 uppercase tracking-wider font-mono border-b border-slate-100 pb-1.5 mb-2">Active Machines</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-800 font-mono">42<span className="text-sm text-slate-400">/45</span></span>
            <span className="text-[10px] text-rose-700 font-bold font-mono bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">-3 Offline</span>
          </div>
        </div>
        
        {/* Card 3 */}
        <div className="bg-white border border-slate-200 p-5 rounded shadow-sm hover:border-teal-300 transition-colors">
          <h3 className="text-[11px] font-bold text-teal-700 uppercase tracking-wider font-mono border-b border-slate-100 pb-1.5 mb-2">Quality Rate (OQC)</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-teal-600 font-mono">98.5%</span>
            <span className="text-[10px] text-teal-700 font-bold font-mono bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded">Target: 95%</span>
          </div>
        </div>
        
        {/* Card 4 */}
        <div className="bg-white border border-slate-200 p-5 rounded shadow-sm hover:border-teal-300 transition-colors">
          <h3 className="text-[11px] font-bold text-teal-700 uppercase tracking-wider font-mono border-b border-slate-100 pb-1.5 mb-2">Pending Maintenance</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-800 font-mono">4</span>
            <span className="text-[10px] text-amber-700 font-bold font-mono bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">Needs Attention</span>
          </div>
        </div>
      </div>

      {/* Charts & Activity Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart Placeholder */}
        <div className="lg:col-span-2 bg-white border border-slate-200 p-5 rounded shadow-sm min-h-[350px] flex flex-col">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-4">
            <h3 className="text-xs font-bold text-teal-700 uppercase tracking-wider font-mono">Production Output (Weekly)</h3>
            <select className="bg-white border border-slate-300 text-[10px] text-slate-700 rounded px-2 py-1 outline-none focus:border-teal-500 font-mono transition-colors shadow-sm">
              <option>This Week</option>
              <option>Last Week</option>
            </select>
          </div>
          <div className="flex-1 border border-dashed border-slate-300 rounded flex items-center justify-center bg-slate-50">
            <div className="text-center font-mono">
              <p className="text-slate-500 text-xs font-bold mb-1 uppercase tracking-wider">Chart Area Placeholder</p>
              <p className="text-slate-400 text-[10px]">(You can use Recharts or Chart.js here)</p>
            </div>
          </div>
        </div>

        {/* Recent Activity / Alerts */}
        <div className="bg-white border border-slate-200 p-5 rounded shadow-sm flex flex-col">
          <h3 className="text-xs font-bold text-teal-700 uppercase tracking-wider font-mono border-b border-slate-100 pb-2 mb-4">Recent Alerts</h3>
          <div className="space-y-2.5 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {[
              { time: "10:24 AM", msg: "Machine Press #3 temperature high", type: "error" },
              { time: "09:15 AM", msg: "Maintenance completed on Mold #2", type: "success" },
              { time: "08:00 AM", msg: "Shift 1 started successfully", type: "info" },
              { time: "07:45 AM", msg: "OQC Reject Sample detected on Line A", type: "warning" },
              { time: "Yesterday", msg: "System backup completed", type: "info" },
            ].map((alert, i) => (
              <div key={i} className="flex gap-3 items-start p-3 rounded bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors font-mono">
                <div className={`w-1.5 h-1.5 mt-1.5 rounded-full shrink-0 ${
                  alert.type === 'error' ? 'bg-rose-500 shadow-[0_0_3px_#f43f5e]' : 
                  alert.type === 'warning' ? 'bg-amber-500 shadow-[0_0_3px_#f59e0b]' :
                  alert.type === 'success' ? 'bg-teal-500 shadow-[0_0_3px_#14b8a6]' : 
                  'bg-blue-500 shadow-[0_0_3px_#3b82f6]'
                }`} />
                <div>
                  <p className="text-[11px] font-semibold text-slate-700 leading-snug">{alert.msg}</p>
                  <p className="text-[10px] text-slate-500 mt-1">{alert.time}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-4 py-2 rounded border border-slate-200 text-[11px] font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all uppercase tracking-wider font-mono">
            VIEW ALL ALERTS
          </button>
        </div>
      </div>
    </div>
  );
}