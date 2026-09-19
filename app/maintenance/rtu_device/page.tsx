"use client";

import React, { useState } from "react";

// Replaced date-fns with a small native formatter to avoid build/runtime issues
const formatDate = (d: Date) => {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
};

type Row = {
  id: number;
  device: string;
  tag: string;
  status: string;
  class: string;
  category: string;
  location: string;
};

const SAMPLE: Row[] = [
  { id: 318, device: "Probe Sensor Level Alu Tank", tag: "PR-01", status: "Already Used", class: "Probe", category: "E", location: "Aluminium Tank" },
  { id: 319, device: "Probe Sensor Level Alu Tank", tag: "PR-02", status: "Ready to Use", class: "Probe", category: "E", location: "MCC Mixing" },
  { id: 362, device: "Submersible 1 Phase 0.75 kw", tag: "SP1-M1", status: "Already Used", class: "Submersible Pump", category: "E", location: "Watersealing Boiler" },
  { id: 363, device: "Submersible 1 Phase 0.75 kw", tag: "SP2-M2", status: "Ready to Use", class: "Submersible Pump", category: "E", location: "Vendor" },
  { id: 364, device: "Submersible Pump 3 Phase 1.5 kw", tag: "SP1-M1", status: "Already Used", class: "Submersible Pump", category: "E", location: "Waste Sump" },
];

export default function Page() {
  const [rows, setRows] = useState<Row[]>(SAMPLE);
  const [filter, setFilter] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [editingRow, setEditingRow] = useState<Row | null>(null);
  const [newStatus, setNewStatus] = useState<string>("");

  const statuses = ["Already Used", "Ready to Use", "On Repair", "Disabled"];

  const openEditor = (row: Row) => {
    setEditingRow(row);
    setNewStatus(row.status);
  };

  const saveStatus = () => {
    if (!editingRow) return;
    setRows((prev) => prev.map((r) => (r.id === editingRow.id ? { ...r, status: newStatus } : r)));
    setEditingRow(null);
  };

  const filtered = rows.filter((r) => {
    if (filter && r.status !== filter) return false;
    if (search && !(`${r.device} ${r.tag} ${r.location}`.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  const badgeColor = (s: string) => {
    switch (s) {
      case "Ready to Use": return "bg-emerald-50 text-emerald-700 border border-emerald-200";
      case "Already Used": return "bg-sky-50 text-sky-700 border border-sky-200";
      case "On Repair": return "bg-amber-50 text-amber-700 border border-amber-200";
      default: return "bg-slate-100 text-slate-600 border border-slate-300";
    }
  };

  return (
    <div className="bg-slate-50 text-slate-900 text-[0.72rem] w-full min-h-screen p-2 md:p-4">
      
      {/* TOP DASHBOARD CARD */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 mb-4 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
          
          {/* STATS CIRCLES */}
          <div className="flex flex-col items-center gap-6 w-40">
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-full border-2 border-teal-500 flex items-center justify-center text-teal-600 font-bold bg-teal-50">17</div>
              <div className="text-xs text-slate-500 font-semibold mt-2 uppercase">RTU</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-full border-2 border-slate-300 flex items-center justify-center text-slate-700 font-bold bg-slate-50">392</div>
              <div className="text-xs text-slate-500 font-semibold mt-2 uppercase">USED</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-full border-2 border-amber-400 flex items-center justify-center text-amber-600 font-bold bg-amber-50">27</div>
              <div className="text-xs text-slate-500 font-semibold mt-2 uppercase">REPAIR</div>
            </div>
          </div>

          {/* LOG SECTION */}
          <div className="flex-1 w-full">
            <h2 className="text-base font-bold text-slate-800 mb-2">RTU Status Log</h2>
            <div className="space-y-2 max-h-36 overflow-y-auto pr-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={`log-entry-${i}`} className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl p-3">
                  <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs font-semibold text-slate-500 shadow-sm">{i + 1}</div>
                  <div className="flex-1 text-[0.68rem] text-slate-600 leading-tight">
                    Sample log message showing RTU status update — <span className="font-medium text-slate-500">{formatDate(new Date())}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* TABLE CARD */}
      <div className="bg-white border border-slate-200 rounded-3xl p-3 shadow-sm">
        
        {/* FILTER & SEARCH */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3 mb-3">
          <div className="flex items-center gap-2 w-full md:w-1/3">
            <label className="text-slate-600 font-medium text-xs">Filter by Status</label>
            <select 
              className="ml-2 bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-700 focus:outline-none focus:border-teal-500 shadow-sm" 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="">Please Select</option>
              {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button 
              onClick={() => setFilter("")} 
              className="ml-2 px-2 py-1 text-xs bg-white hover:bg-slate-50 border border-slate-300 rounded text-slate-600 transition-colors shadow-sm"
            >
              Clear
            </button>
          </div>

          <div className="flex items-center gap-2 ml-auto w-full md:w-1/3">
            <input 
              placeholder="Search..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="flex-1 bg-white border border-slate-300 px-2 py-1 rounded text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-teal-500 shadow-sm" 
            />
            <button className="px-3 py-1 text-xs bg-teal-600 hover:bg-teal-700 text-white rounded font-semibold transition-colors shadow-sm">
              Search
            </button>
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed text-[0.68rem] border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-600 text-xs border-b border-slate-200">
                <th className="px-2 py-2 w-12 font-semibold">No</th>
                <th className="px-2 py-2 w-48 font-semibold text-left">Device</th>
                <th className="px-2 py-2 w-28 font-semibold text-left">Tag</th>
                <th className="px-2 py-2 w-32 font-semibold text-left">Status</th>
                <th className="px-2 py-2 w-44 font-semibold text-left">Class</th>
                <th className="px-2 py-2 w-20 font-semibold text-center">Category</th>
                <th className="px-2 py-2 font-semibold text-left">Location</th>
                <th className="px-2 py-2 w-16 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((r) => (
                <tr key={r.id} className="odd:bg-slate-50 even:bg-white hover:bg-slate-100 transition-colors align-top">
                  <td className="px-2 py-2 text-slate-500 font-medium text-center">{r.id}</td>
                  <td className="px-2 py-2 break-words whitespace-normal leading-tight text-slate-800 font-medium">{r.device}</td>
                  <td className="px-2 py-2 text-slate-700">{r.tag}</td>
                  <td className="px-2 py-2">
                    <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded ${badgeColor(r.status)}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-slate-700">{r.class}</td>
                  <td className="px-2 py-2 text-center text-slate-700 font-medium">{r.category}</td>
                  <td className="px-2 py-2 break-words whitespace-normal leading-tight text-slate-700">{r.location}</td>
                  <td className="px-2 py-2 text-center">
                    <button 
                      onClick={() => openEditor(r)} 
                      className="w-7 h-7 inline-flex items-center justify-center rounded bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 text-xs transition-colors shadow-sm"
                      title="Edit Status"
                    >
                      ⚙
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-2 py-6 text-center text-slate-500 italic">
                    No data found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL / POPUP FOR EDITING STATUS */}
      {editingRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 w-[320px] shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Change status for <span className="text-teal-600">{editingRow.tag}</span></h3>
            <div className="flex flex-col gap-3">
              <select 
                className="bg-white border border-slate-300 px-3 py-2 rounded text-sm text-slate-700 focus:outline-none focus:border-teal-500 shadow-sm" 
                value={newStatus} 
                onChange={(e) => setNewStatus(e.target.value)}
              >
                {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <div className="flex justify-end gap-2 mt-2">
                <button 
                  onClick={() => setEditingRow(null)} 
                  className="px-4 py-1.5 text-xs font-medium bg-white hover:bg-slate-50 border border-slate-300 rounded text-slate-700 transition-colors shadow-sm"
                >
                  Cancel
                </button>
                <button 
                  onClick={saveStatus} 
                  className="px-4 py-1.5 text-xs font-medium bg-teal-600 hover:bg-teal-700 text-white rounded transition-colors shadow-sm"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}