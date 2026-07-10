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
      case "Ready to Use": return "bg-green-500 text-white";
      case "Already Used": return "bg-sky-600 text-white";
      case "On Repair": return "bg-amber-500 text-white";
      default: return "bg-zinc-600 text-white";
    }
  };

  return (
    <div className="text-[0.72rem] max-w-[1880px] mx-auto p-2 md:p-4">
      <div className="bg-[#09090b] border border-white/[0.04] rounded-xl p-4 mb-4">
        <div className="flex items-start gap-6">
          <div className="flex flex-col items-center gap-6 w-40">
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-full border-2 border-green-400 flex items-center justify-center text-green-400 font-bold">17</div>
              <div className="text-xs text-zinc-400 mt-2 uppercase">RTU</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-full border-2 border-sky-400 flex items-center justify-center text-sky-400 font-bold">392</div>
              <div className="text-xs text-zinc-400 mt-2 uppercase">USED</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-full border-2 border-amber-400 flex items-center justify-center text-amber-400 font-bold">27</div>
              <div className="text-xs text-zinc-400 mt-2 uppercase">REPAIR</div>
            </div>
          </div>

          <div className="flex-1">
            <h2 className="text-base font-bold text-zinc-200 mb-2">RTU Status Log</h2>
            <div className="space-y-2 max-h-36 overflow-y-auto pr-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={`log-entry-${i}`} className="flex items-center gap-3 bg-white/[0.02] rounded-lg p-2">
                  <div className="w-8 h-8 rounded-full bg-white/[0.02] flex items-center justify-center text-xs text-zinc-300">{i + 1}</div>
                  <div className="flex-1 text-[0.68rem] text-zinc-300 leading-tight">Sample log message showing RTU status update — {formatDate(new Date())}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#09090b] border border-white/[0.04] rounded-xl p-3">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3 mb-3">
          <div className="flex items-center gap-2 w-full md:w-1/3">
            <label className="text-zinc-400 text-xs">Filter by Status</label>
            <select className="ml-2 bg-black/40 rounded px-2 py-1 text-xs" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="">Please Select</option>
              {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={() => setFilter("")} className="ml-2 px-2 py-1 text-xs bg-white/5 rounded">Clear</button>
          </div>

          <div className="flex items-center gap-2 ml-auto w-full md:w-1/3">
            <input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 bg-black/40 px-2 py-1 rounded text-xs" />
            <button className="px-3 py-1 text-xs bg-[#00F0FF] text-black rounded font-bold">Search</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed text-[0.68rem] border-collapse">
            <thead>
              <tr className="bg-white/[0.03] text-zinc-300 text-xs">
                <th className="px-2 py-2 w-12">No</th>
                <th className="px-2 py-2 w-48">Device</th>
                <th className="px-2 py-2 w-28">Tag</th>
                <th className="px-2 py-2 w-32">Status</th>
                <th className="px-2 py-2 w-44">Class</th>
                <th className="px-2 py-2 w-20">Category</th>
                <th className="px-2 py-2">Location</th>
                <th className="px-2 py-2 w-16">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="odd:bg-white/[0.01] even:bg-transparent align-top">
                  <td className="px-2 py-1 text-zinc-400">{r.id}</td>
                  <td className="px-2 py-1 break-words whitespace-normal leading-tight">{r.device}</td>
                  <td className="px-2 py-1">{r.tag}</td>
                  <td className="px-2 py-1">
                    <span className={`inline-block text-[10px] px-2 py-0.5 rounded ${badgeColor(r.status)}`}>{r.status}</span>
                  </td>
                  <td className="px-2 py-1">{r.class}</td>
                  <td className="px-2 py-1 text-center">{r.category}</td>
                  <td className="px-2 py-1 break-words whitespace-normal leading-tight">{r.location}</td>
                  <td className="px-2 py-1">
                    <button onClick={() => openEditor(r)} className="w-8 h-8 flex items-center justify-center rounded bg-orange-500 text-white text-xs">
                      ⚙
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal / Popup for editing status */}
      {editingRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#09090b] border border-white/[0.06] rounded-lg p-4 w-[320px]">
            <h3 className="text-sm font-bold mb-2">Change status for {editingRow.tag}</h3>
            <div className="flex flex-col gap-2">
              <select className="bg-black/40 px-2 py-1 rounded text-sm" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <div className="flex justify-end gap-2 mt-3">
                <button onClick={() => setEditingRow(null)} className="px-3 py-1 text-xs bg-white/5 rounded">Cancel</button>
                <button onClick={saveStatus} className="px-3 py-1 text-xs bg-green-600 text-white rounded">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
