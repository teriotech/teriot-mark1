"use client";

import React, { useState } from "react";

// Icon Components
const JobIcon = () => (
  <div className="flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-lg">
    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-green-400" fill="currentColor" viewBox="0 0 20 20">
      <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM15 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2h-2zM5 13a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5z" />
    </svg>
  </div>
);

const MachineIcon = () => (
  <div className="flex items-center justify-center w-16 h-16 bg-amber-500/20 rounded-lg">
    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
      <path d="M7 3a1 1 0 000 2h6a1 1 0 000-2H7zM4 7a1 1 0 011-1h10a1 1 0 011 1v3a2 2 0 01-2 2H6a2 2 0 01-2-2V7zm2 5a2 2 0 012 2v1h4v-1a2 2 0 012-2h2a2 2 0 012 2v3a2 2 0 01-2 2H4a2 2 0 01-2-2v-3a2 2 0 012-2h2z" />
    </svg>
  </div>
);

const DowntimeIcon = () => (
  <div className="flex items-center justify-center w-16 h-16 bg-red-500/20 rounded-lg">
    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-red-400" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0012 2v5h4.77c.896 0 1.311.754 1.319 1.543a1 1 0 01-.82 1.946h-.2l-5.433 9.3a1 1 0 01-1.854-.228l-.016-.057L9.46 10H4.77a1 1 0 010-2H9.2L11.3 1.046zM9.357 5L7.772 8.267h4.enllä.023.04L9.357 5z" clipRule="evenodd" />
    </svg>
  </div>
);

const ApprovalIcon = () => (
  <div className="flex items-center justify-center w-16 h-16 bg-cyan-500/20 rounded-lg">
    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  </div>
);

const SparepartsIcon = () => (
  <div className="flex items-center justify-center w-16 h-16 bg-cyan-500/20 rounded-lg">
    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
      <path d="M13 7H7v6h6V7z" />
      <path fillRule="evenodd" d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2V2a1 1 0 112 0v1a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2v1a1 1 0 11-2 0v-1h-2v1a1 1 0 11-2 0v-1a2 2 0 01-2-2v-2H3a1 1 0 110-2h1V9H3a1 1 0 010-2h1V5a2 2 0 012-2v-1z" clipRule="evenodd" />
    </svg>
  </div>
);

const PermitIcon = () => (
  <div className="flex items-center justify-center w-16 h-16 bg-red-500/20 rounded-lg">
    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-red-400" fill="currentColor" viewBox="0 0 20 20">
      <path d="M4 4a2 2 0 012-2h6a1 1 0 00-1 1v12a1 1 0 102 0V4h4a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
    </svg>
  </div>
);

const AbnormalityIcon = () => (
  <div className="flex items-center justify-center w-16 h-16 bg-black/40 rounded-lg border border-white/[0.1]">
    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  </div>
);

const ToolsIcon = () => (
  <div className="flex items-center justify-center w-16 h-16 bg-orange-500/20 rounded-lg">
    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
    </svg>
  </div>
);

export default function EquipmentMonitoring() {
  const [activeTab, setActiveTab] = useState<"maintenance" | "history">("maintenance");

  // Sample data
  const maintenanceLogs = [
    { id: 1, code: "9072", tech: "Nurvandy", task: "Kalibrasi Loadcell Lime Weighing dengan tag 0 telah", date: "2026-03-17 14:52:05", status: "Selesai" },
    { id: 2, code: "9072", tech: "Nurvandy", task: "Kalibrasi Loadcell Cement Weighing dengan tag 0 telah", date: "2026-03-17 12:23:51", status: "Selesai" },
    { id: 3, code: "9031", tech: "Sigit Setiyono", task: "Power Supply 24 VDC dengan tag psu telah", date: "2026-02-12 17:10:30", status: "Selesai" },
  ];

  const machineHistory = [
    { id: 1, code: "9005", tech: "Koko Abdul Kohar", machine: "Mesin CUTTING BOARD REFEEDING telah dilakukan", action: "penggantian", date: "2022-12-10", detail: "dengan keterangan Penggantian sensor AS80" },
    { id: 2, code: "9005", tech: "Koko Abdul Kohar", machine: "Mesin AUTOMATIC CRANE CAKE DIVIDER telah dilakukan", action: "penggantian", date: "2022-11-02", detail: "dengan keterangan Penggantian sensor slow 2 pos tilting 1" },
    { id: 3, code: "9005", tech: "Koko Abdul Kohar", machine: "Mesin TRANSFER CAR CUTTING telah dilakukan", action: "penggantian", date: "2022-10-22", detail: "dengan keterangan Penggantian sensor slow 2 pos tilting up" },
  ];

  const categories = [
    { name: "ELECTRICAL", count: "1/0 item(s)", color: "bg-orange-500" },
    { name: "MECHANICAL", count: "1/0 item(s)", color: "bg-blue-500" },
    { name: "PRODUCTION", count: "1/0 item(s)", color: "bg-green-500" },
    { name: "SAFETY", count: "N/A", color: "bg-red-500" },
  ];

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Equipment Monitoring</h1>
          <p className="text-sm text-zinc-400 mt-1">Pantau status peralatan dan mesin produksi</p>
        </div>
      </div>

      {/* STAT CARDS ROW 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* My Job Today */}
        <div className="bg-[#09090b]/80 backdrop-blur border border-white/[0.08] rounded-xl p-5 hover:border-white/[0.15] transition-all">
          <div className="flex gap-4 items-start">
            <JobIcon />
            <div className="flex-1">
              <h3 className="font-bold text-white text-sm">My Job Today</h3>
              <div className="mt-3 space-y-1 text-xs text-zinc-400">
                <p>Custom Job: <span className="text-cyan-400">0 Task</span></p>
                <p>PM: <span className="text-cyan-400">0 Task</span></p>
                <p>Request Job: <span className="text-orange-400">(coming soon)</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* My Machine */}
        <div className="bg-[#09090b]/80 backdrop-blur border border-white/[0.08] rounded-xl p-5 hover:border-white/[0.15] transition-all">
          <div className="flex gap-4 items-start">
            <MachineIcon />
            <div className="flex-1">
              <h3 className="font-bold text-white text-sm">My Machine</h3>
              <div className="mt-3 space-y-1 text-xs text-zinc-400">
                <p>Active Machines: <span className="text-cyan-400">12</span></p>
                <p>Idle Machines: <span className="text-orange-400">3</span></p>
                <p>Maintenance: <span className="text-red-400">1</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Downtime Data */}
        <div className="bg-[#09090b]/80 backdrop-blur border border-white/[0.08] rounded-xl p-5 hover:border-white/[0.15] transition-all">
          <div className="flex gap-4 items-start">
            <DowntimeIcon />
            <div className="flex-1">
              <h3 className="font-bold text-white text-sm">Downtime Data (avg)</h3>
              <div className="mt-3 space-y-1 text-xs text-zinc-400">
                <p>All category: <span className="text-cyan-400">0.00 Hour</span></p>
                <p>Mechanic: <span className="text-cyan-400">0.00 Hour</span></p>
                <p>Electric: <span className="text-cyan-400">0.00 Hour</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* My Approval */}
        <div className="bg-[#09090b]/80 backdrop-blur border border-white/[0.08] rounded-xl p-5 hover:border-white/[0.15] transition-all">
          <div className="flex gap-4 items-start">
            <ApprovalIcon />
            <div className="flex-1">
              <h3 className="font-bold text-white text-sm">My Approval</h3>
              <div className="mt-3 space-y-1 text-xs text-zinc-400">
                <p>PM Approval: <span className="text-cyan-400">0 PM</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STAT CARDS ROW 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* My Spareparts */}
        <div className="bg-[#09090b]/80 backdrop-blur border border-white/[0.08] rounded-xl p-5 hover:border-white/[0.15] transition-all">
          <div className="flex gap-4 items-start">
            <SparepartsIcon />
            <div className="flex-1">
              <h3 className="font-bold text-white text-sm">My Spareparts</h3>
              <div className="mt-3 space-y-1 text-xs text-zinc-400">
                <p>Non-Store Electrical: <span className="text-cyan-400">249</span></p>
                <p>Non-Store Mechanical: <span className="text-cyan-400">431</span></p>
                <p>RTU Device/Parts: <span className="text-cyan-400">17</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* My Permit Today */}
        <div className="bg-[#09090b]/80 backdrop-blur border border-white/[0.08] rounded-xl p-5 hover:border-white/[0.15] transition-all">
          <div className="flex gap-4 items-start">
            <PermitIcon />
            <div className="flex-1">
              <h3 className="font-bold text-white text-sm">My Permit Today</h3>
              <div className="mt-3 space-y-1 text-xs text-zinc-400">
                <p>Approved Permit: <span className="text-green-400">0 Permit</span></p>
                <p>Not Approved: <span className="text-red-400">0 Permit</span></p>
                <p>Total Permit: <span className="text-cyan-400">0 Permit</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* My Abnormality */}
        <div className="bg-[#09090b]/80 backdrop-blur border border-white/[0.08] rounded-xl p-5 hover:border-white/[0.15] transition-all">
          <div className="flex gap-4 items-start">
            <AbnormalityIcon />
            <div className="flex-1">
              <h3 className="font-bold text-white text-sm">My Abnormality</h3>
              <div className="mt-3 space-y-1 text-xs text-zinc-400">
                <p>PM Electrical: <span className="text-red-400">218 PM</span></p>
                <p>PM Mechanical: <span className="text-red-400">248 PM</span></p>
                <p>Total Abnormal: <span className="text-red-400">466 PM</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* My Ordered Tools */}
        <div className="bg-[#09090b]/80 backdrop-blur border border-white/[0.08] rounded-xl p-5 hover:border-white/[0.15] transition-all">
          <div className="flex gap-4 items-start">
            <ToolsIcon />
            <div className="flex-1">
              <h3 className="font-bold text-white text-sm">My Ordered Tools</h3>
              <div className="mt-3 space-y-1 text-xs text-zinc-400">
                <p>Total: <span className="text-cyan-400">0 Tools</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LIVE REPORT SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Maintenance Log & Machine History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs */}
          <div className="flex gap-2 border-b border-white/[0.05]">
            <button
              onClick={() => setActiveTab("maintenance")}
              className={`px-4 py-3 font-semibold text-sm transition-all border-b-2 ${
                activeTab === "maintenance"
                  ? "border-cyan-400 text-cyan-400"
                  : "border-transparent text-zinc-400 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                </svg>
                Time Base Maintenance Log
              </span>
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 py-3 font-semibold text-sm transition-all border-b-2 ${
                activeTab === "history"
                  ? "border-cyan-400 text-cyan-400"
                  : "border-transparent text-zinc-400 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                Machine History
              </span>
            </button>
          </div>

          {/* Content */}
          <div className="bg-[#09090b]/80 backdrop-blur border border-white/[0.08] rounded-xl p-5">
            {activeTab === "maintenance" ? (
              <div className="space-y-3">
                {maintenanceLogs.map((log) => (
                  <div key={log.id} className="flex gap-4 pb-4 border-b border-white/[0.05] last:border-0 last:pb-0">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                      <span className="text-xs font-bold text-cyan-400">{log.code.slice(0, 2)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">{log.tech}</p>
                      <p className="text-xs text-zinc-400 mt-1">{log.task}</p>
                      <div className="flex flex-wrap gap-2 mt-2 items-center">
                        <span className="text-xs text-zinc-500">{log.date}</span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded text-white ${log.status === "Selesai" ? "bg-green-500/20" : "bg-yellow-500/20"}`}>
                          {log.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {machineHistory.map((history) => (
                  <div key={history.id} className="flex gap-4 pb-4 border-b border-white/[0.05] last:border-0 last:pb-0">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <span className="text-xs font-bold text-blue-400">{history.code.slice(0, 2)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">{history.tech}</p>
                      <p className="text-xs text-zinc-400 mt-1">{history.machine}</p>
                      <div className="flex flex-wrap gap-2 mt-2 items-center">
                        <span className="px-2 py-1 text-xs font-semibold rounded text-white bg-blue-500/20">
                          {history.action}
                        </span>
                        <span className="text-xs text-zinc-500">{history.date}</span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">{history.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Category Stats */}
        <div className="space-y-3">
          <h3 className="font-bold text-white text-sm mb-4">Category Breakdown</h3>
          {categories.map((category, idx) => (
            <div key={idx} className="bg-[#09090b]/80 backdrop-blur border border-white/[0.08] rounded-xl p-4 hover:border-white/[0.15] transition-all">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-lg ${category.color} flex items-center justify-center text-xl font-bold text-white`}>
                  X
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-zinc-300 uppercase tracking-widest">{category.name}</p>
                  <p className="text-sm text-cyan-400 font-semibold mt-1">{category.count}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
