"use client";

import React, { useState } from "react";

type EquipmentPart = {
  id: string;
  label: string;
  ongoingRun: number;
  remaining: number;
};

type Equipment = {
  id: string;
  label: string;
  parts: EquipmentPart[];
};

const initialEquipmentData: Equipment[] = [
  {
    id: "refeeding",
    label: "Refeeding",
    parts: [],
  },
  {
    id: "rst1",
    label: "Return Slurry Tank 1",
    parts: [],
  },
  {
    id: "rst2",
    label: "Return Slurry Tank 2",
    parts: [],
  },
  {
    id: "sst1",
    label: "Sand Slurry Tank 1",
    parts: [],
  },
  {
    id: "sst2",
    label: "Sand Slurry Tank 2",
    parts: [],
  },
  {
    id: "tilting1",
    label: "Tilting 1",
    parts: [],
  },
  {
    id: "tcc2",
    label: "Transfer Car Casting 2",
    parts: [
      {
        id: "roda1",
        label: "Roda (Posisi Depan Kanan)",
        ongoingRun: 57004,
        remaining: 31804,
      },
      {
        id: "roda2",
        label: "Roda (Posisi Belakang Kiri)",
        ongoingRun: 56550,
        remaining: 31350,
      },
    ],
  },
  {
    id: "tcm",
    label: "Transfer Car Mixing",
    parts: [
      {
        id: "cam1",
        label: "Cam Follower (Type: KR 80; Depan Kanan Posisi Belakang)",
        ongoingRun: 57004,
        remaining: 31804,
      },
      {
        id: "cam2",
        label: "Cam Follower (Type: KR 80; Depan Kiri Posisi Belakang)",
        ongoingRun: 55181,
        remaining: 31350,
      },
    ],
  },
  {
    id: "trolley1",
    label: "Trolley 1",
    parts: [],
  },
];

export default function Page() {
  const [equipment, setEquipment] = useState<Equipment[]>(initialEquipmentData);
  const [selectedEquipment, setSelectedEquipment] = useState<string | null>(null);
  const [expandedParts, setExpandedParts] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");

  // Modal states
  const [showAddEquipment, setShowAddEquipment] = useState(false);
  const [showAddPart, setShowAddPart] = useState(false);
  const [newEquipmentName, setNewEquipmentName] = useState("");
  const [newPartName, setNewPartName] = useState("");
  const [newPartOngoing, setNewPartOngoing] = useState("");
  const [newPartRemaining, setNewPartRemaining] = useState("");

  const selected = equipment.find((eq) => eq.id === selectedEquipment);

  const calculateProgress = (ongoing: number, remaining: number) => {
    const total = ongoing + remaining;
    return total > 0 ? (ongoing / total) * 100 : 0;
  };

  const handleAddEquipment = () => {
    if (newEquipmentName.trim()) {
      const newId = `eq-${Date.now()}`;
      const newEquip: Equipment = {
        id: newId,
        label: newEquipmentName,
        parts: [],
      };
      setEquipment([...equipment, newEquip]);
      setNewEquipmentName("");
      setShowAddEquipment(false);
      setSelectedEquipment(newId);
    }
  };

  const handleAddPart = () => {
    if (
      selectedEquipment &&
      newPartName.trim() &&
      newPartOngoing.trim() &&
      newPartRemaining.trim()
    ) {
      const newId = `part-${Date.now()}`;
      const newPart: EquipmentPart = {
        id: newId,
        label: newPartName,
        ongoingRun: parseInt(newPartOngoing),
        remaining: parseInt(newPartRemaining),
      };

      setEquipment(
        equipment.map((eq) =>
          eq.id === selectedEquipment ? { ...eq, parts: [...eq.parts, newPart] } : eq
        )
      );

      setNewPartName("");
      setNewPartOngoing("");
      setNewPartRemaining("");
      setShowAddPart(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-teal-500/20 p-4 md:p-6">
      
      {/* Main Grid Layout Dashboard */}
      <main className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start max-w-[1880px] mx-auto">
        
        {/* LEFT COLUMN: Equipment List (Span 1) */}
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
            <div className="bg-teal-50 border-b border-slate-200 px-4 py-2.5 flex justify-between items-center">
              <h3 className="text-xs font-bold text-teal-700 uppercase tracking-wider font-mono">
                Equipment
              </h3>
              <button
                onClick={() => setShowAddEquipment(true)}
                className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-2 py-0.5 rounded flex items-center gap-1 text-[11px] transition-colors shadow-sm"
                title="Add Equipment"
              >
                + Add
              </button>
            </div>
            
            <div className="max-h-[700px] overflow-y-auto divide-y divide-slate-100 text-xs font-mono">
              {equipment.map((equip) => (
                <div
                  key={equip.id}
                  onClick={() => setSelectedEquipment(equip.id)}
                  className={`p-3 cursor-pointer flex items-center gap-2 transition-colors ${
                    selectedEquipment === equip.id
                      ? "bg-teal-50/50 text-teal-700 border-l-2 border-teal-500"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l-2 border-transparent"
                  }`}
                >
                  <span className="text-slate-400">⊙</span>
                  {equip.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Progress & Table (Span 3) */}
        <div className="xl:col-span-3 space-y-6">
          
          {/* TOP BLOCK: Run Time Part Progress */}
          <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
            <div className="bg-teal-50 border-b border-slate-200 px-4 py-2.5 flex justify-between items-center">
              <h3 className="text-xs font-bold text-teal-700 uppercase tracking-wider font-mono">
                {selected ? `⊖ ${selected.label} - Run Time Part` : "Run Time Part"}
              </h3>
              <div className="flex gap-2">
                {selected && (
                  <>
                    <button
                      onClick={() => setShowAddPart(true)}
                      className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-3 py-1 rounded flex items-center gap-1 text-[11px] transition-colors shadow-sm"
                    >
                      + Add Part
                    </button>
                    {selected.parts.length > 0 && (
                      <button
                        onClick={() => setExpandedParts(!expandedParts)}
                        className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-[11px] py-1 px-3 rounded transition-all font-medium shadow-sm"
                      >
                        {expandedParts ? "Hide" : "Show"}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="p-4 font-mono text-xs">
              {selected ? (
                selected.parts.length > 0 ? (
                  expandedParts && (
                    <div className="space-y-4">
                      {selected.parts.map((part) => {
                        const progress = calculateProgress(part.ongoingRun, part.remaining);
                        return (
                          <div key={part.id} className="space-y-1.5 bg-slate-50 p-3 rounded border border-slate-200">
                            <div className="flex justify-between text-[11px] mb-1">
                              <span className="text-slate-700 font-medium">{part.label}</span>
                              <span className="text-teal-600 font-bold">{progress.toFixed(1)} %</span>
                            </div>
                            <div className="flex items-center gap-3 h-4">
                              <div className="flex-1 h-full bg-slate-200 rounded-full overflow-hidden flex relative group">
                                <div
                                  className="bg-teal-500 h-full transition-all"
                                  style={{ width: `${progress}%` }}
                                />
                                <div className="bg-rose-500 h-full flex-1" />
                                {/* Tooltip */}
                                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 py-0.5 rounded text-[10px] text-teal-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-slate-200 shadow-sm">
                                  Current: {part.ongoingRun.toLocaleString()} CT
                                </div>
                              </div>
                              <div className="text-[10px] text-slate-500 w-24 text-right">
                                <span className="text-teal-600 font-semibold">{part.ongoingRun.toLocaleString()}</span> / <span className="text-rose-600 font-semibold">{part.remaining.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : (
                  <div className="text-slate-500 text-center py-8 italic">
                    No lifetime parts data available for this equipment. Click '+ Add Part' to add submachines.
                  </div>
                )
              ) : (
                <div className="text-slate-500 text-center py-8 italic">
                  Select equipment from the left panel to view lifetime part data
                </div>
              )}
            </div>
          </div>

          {/* BOTTOM BLOCK: Data Table */}
          <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
            <div className="bg-teal-50 border-b border-slate-200 px-4 py-2.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h3 className="text-xs font-bold text-teal-700 uppercase tracking-wider font-mono">
                Part Details Matrix
              </h3>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  placeholder="Search part..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full sm:w-48 bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-teal-500 transition-colors shadow-sm"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600 bg-slate-50">
                    <th className="p-3 w-12 text-center font-semibold">No</th>
                    <th className="p-3 w-40 font-semibold">Machine</th>
                    <th className="p-3 font-semibold">Part</th>
                    <th className="p-3 w-28 font-semibold">Ongoing Run</th>
                    <th className="p-3 w-24 font-semibold">Lifetime</th>
                    <th className="p-3 w-48 font-semibold">Plan to do</th>
                    <th className="p-3 w-20 text-center font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selected && selected.parts.length > 0 ? (
                    selected.parts
                      .filter((p) => p.label.toLowerCase().includes(search.toLowerCase()))
                      .map((item, idx) => (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 text-center text-slate-500 font-bold">{idx + 1}</td>
                          <td className="p-3 text-slate-700">{selected.label}</td>
                          <td className="p-3 font-semibold text-teal-700 break-words whitespace-normal leading-tight">
                            {item.label}
                          </td>
                          <td className="p-3 text-slate-700">{item.ongoingRun.toLocaleString()}</td>
                          <td className="p-3 text-slate-700">{item.remaining.toLocaleString()}</td>
                          <td className="p-3 text-rose-600 text-[11px] break-words whitespace-normal leading-tight">
                            Requires maintenance
                          </td>
                          <td className="p-3 text-center">
                            <button className="bg-blue-50 hover:bg-blue-600 border border-blue-200 hover:border-blue-600 text-blue-600 hover:text-white p-1.5 rounded transition-all shadow-sm">
                              ✓
                            </button>
                          </td>
                        </tr>
                      ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-500 italic">
                        Select equipment to view data
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>

      {/* MODAL POP UP 1: ADD EQUIPMENT */}
      {showAddEquipment && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded w-full max-w-sm overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-150 font-mono">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h2 className="text-xs font-bold text-teal-700 uppercase tracking-wider">Add New Equipment</h2>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <input
                type="text"
                placeholder="Equipment name"
                value={newEquipmentName}
                onChange={(e) => setNewEquipmentName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-3 py-2 focus:outline-none focus:border-teal-500 text-slate-800 placeholder-slate-400 shadow-sm"
                onKeyPress={(e) => e.key === "Enter" && handleAddEquipment()}
              />
            </div>
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end gap-2 text-xs">
              <button
                onClick={() => setShowAddEquipment(false)}
                className="bg-white hover:bg-slate-50 text-slate-700 px-4 py-1.5 rounded border border-slate-300 transition-colors shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleAddEquipment}
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-4 py-1.5 rounded transition-colors shadow-sm"
              >
                Add Equipment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL POP UP 2: ADD PART */}
      {showAddPart && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded w-full max-w-sm overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-150 font-mono">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h2 className="text-xs font-bold text-teal-700 uppercase tracking-wider">
                Add New Part to {selected?.label}
              </h2>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <input
                type="text"
                placeholder="Part name"
                value={newPartName}
                onChange={(e) => setNewPartName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-3 py-2 focus:outline-none focus:border-teal-500 text-slate-800 placeholder-slate-400 shadow-sm"
              />
              <input
                type="number"
                placeholder="Ongoing Run (cycle time)"
                value={newPartOngoing}
                onChange={(e) => setNewPartOngoing(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-3 py-2 focus:outline-none focus:border-teal-500 text-slate-800 placeholder-slate-400 shadow-sm"
              />
              <input
                type="number"
                placeholder="Remaining Lifetime"
                value={newPartRemaining}
                onChange={(e) => setNewPartRemaining(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-3 py-2 focus:outline-none focus:border-teal-500 text-slate-800 placeholder-slate-400 shadow-sm"
              />
            </div>
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end gap-2 text-xs">
              <button
                onClick={() => setShowAddPart(false)}
                className="bg-white hover:bg-slate-50 text-slate-700 px-4 py-1.5 rounded border border-slate-300 transition-colors shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPart}
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-4 py-1.5 rounded transition-colors shadow-sm"
              >
                Add Part
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}