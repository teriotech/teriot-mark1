import React from "react";

export default function DashboardPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Dashboard */}
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Production Monitoring</h2>
        <p className="text-sm text-zinc-400 mt-1">Overview of real-time production metrics and equipment status.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-[#09090b] border border-white/[0.05] p-5 rounded-xl shadow-sm hover:border-white/[0.1] transition-colors">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Total Output</h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">12,450</span>
            <span className="text-xs text-[#00FF66] font-medium bg-[#00FF66]/10 px-1.5 py-0.5 rounded">+5.2%</span>
          </div>
        </div>
        
        {/* Card 2 */}
        <div className="bg-[#09090b] border border-white/[0.05] p-5 rounded-xl shadow-sm hover:border-white/[0.1] transition-colors">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Active Machines</h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">42<span className="text-lg text-zinc-500">/45</span></span>
            <span className="text-xs text-rose-500 font-medium bg-rose-500/10 px-1.5 py-0.5 rounded">-3 Offline</span>
          </div>
        </div>
        
        {/* Card 3 */}
        <div className="bg-[#09090b] border border-white/[0.05] p-5 rounded-xl shadow-sm hover:border-white/[0.1] transition-colors">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Quality Rate (OQC)</h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#00F0FF]">98.5%</span>
            <span className="text-xs text-[#00FF66] font-medium bg-[#00FF66]/10 px-1.5 py-0.5 rounded">Target: 95%</span>
          </div>
        </div>
        
        {/* Card 4 */}
        <div className="bg-[#09090b] border border-white/[0.05] p-5 rounded-xl shadow-sm hover:border-white/[0.1] transition-colors">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Pending Maintenance</h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">4</span>
            <span className="text-xs text-amber-500 font-medium bg-amber-500/10 px-1.5 py-0.5 rounded">Needs Attention</span>
          </div>
        </div>
      </div>

      {/* Charts & Activity Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart Placeholder */}
        <div className="lg:col-span-2 bg-[#09090b] border border-white/[0.05] p-5 rounded-xl min-h-[350px] flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-white">Production Output (Weekly)</h3>
            <select className="bg-white/[0.05] border border-white/[0.1] text-xs text-zinc-300 rounded px-2 py-1 outline-none">
              <option>This Week</option>
              <option>Last Week</option>
            </select>
          </div>
          <div className="flex-1 border border-dashed border-white/[0.1] rounded-lg flex items-center justify-center bg-white/[0.01]">
            <div className="text-center">
              <p className="text-zinc-500 text-sm mb-2">Chart Area Placeholder</p>
              <p className="text-zinc-600 text-xs">(You can use Recharts or Chart.js here)</p>
            </div>
          </div>
        </div>

        {/* Recent Activity / Alerts */}
        <div className="bg-[#09090b] border border-white/[0.05] p-5 rounded-xl flex flex-col">
          <h3 className="text-sm font-bold text-white mb-4">Recent Alerts</h3>
          <div className="space-y-4 flex-1 overflow-y-auto pr-2">
            {[
              { time: "10:24 AM", msg: "Machine Press #3 temperature high", type: "warning" },
              { time: "09:15 AM", msg: "Maintenance completed on Mold #2", type: "success" },
              { time: "08:00 AM", msg: "Shift 1 started successfully", type: "info" },
              { time: "07:45 AM", msg: "OQC Reject Sample detected on Line A", type: "warning" },
              { time: "Yesterday", msg: "System backup completed", type: "info" },
            ].map((alert, i) => (
              <div key={i} className="flex gap-3 items-start p-2 rounded-lg hover:bg-white/[0.02] transition-colors">
                <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 shadow-[0_0_8px_currentColor] ${
                  alert.type === 'warning' ? 'bg-rose-500 text-rose-500' : 
                  alert.type === 'success' ? 'bg-[#00FF66] text-[#00FF66]' : 'bg-[#00F0FF] text-[#00F0FF]'
                }`} />
                <div>
                  <p className="text-sm text-zinc-300 leading-snug">{alert.msg}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{alert.time}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-4 py-2 text-xs font-bold text-[#00F0FF] border border-[#00F0FF]/20 rounded-lg hover:bg-[#00F0FF]/10 transition-colors">
            VIEW ALL ALERTS
          </button>
        </div>
      </div>
    </div>
  );
}