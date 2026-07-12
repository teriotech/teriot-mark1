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
    <div className="text-[0.72rem] max-w-[1880px] mx-auto p-2 md:p-4">
      <div className="bg-[#09090b] border border-white/[0.04] rounded-xl p-4 mb-4">
        <div className="flex items-start gap-4">
          {/* Left Sidebar Equipment List */}
          <div className="w-48 bg-white/[0.02] rounded-lg border border-white/[0.04] p-3 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wide">
                Equipment
              </h3>
              <button
                onClick={() => setShowAddEquipment(true)}
                className="w-5 h-5 flex items-center justify-center rounded bg-green-600 text-white text-[0.65rem] hover:bg-green-700 transition-colors"
                title="Add Equipment"
              >
                +
              </button>
            </div>
            {equipment.map((equip) => (
              <div key={equip.id}>
                <div
                  onClick={() => setSelectedEquipment(equip.id)}
                  className={`py-1.5 px-2 cursor-pointer rounded text-[0.75rem] flex items-center gap-2 transition-colors ${
                    selectedEquipment === equip.id
                      ? "bg-white/[0.1] text-sky-300"
                      : "text-zinc-300 hover:bg-white/[0.05]"
                  }`}
                >
                  <span className="text-zinc-400">⊙</span>
                  {equip.label}
                </div>
              </div>
            ))}
          </div>

          {/* Right Content Area */}
          <div className="flex-1">
            {selected ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                      ⊖ {selected.label}
                    </h2>
                    <h3 className="text-xs text-zinc-400 mt-1">Run Time Part</h3>
                    <p className="text-xs text-zinc-500 mt-1">
                      Runtime based on cycletime cutting
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowAddPart(true)}
                      className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                    >
                      + Add Part
                    </button>
                    {selected.parts.length > 0 && (
                      <button
                        onClick={() => setExpandedParts(!expandedParts)}
                        className="px-3 py-1 text-xs bg-white/5 hover:bg-white/10 rounded transition-colors"
                      >
                        {expandedParts ? "Hide" : "Show"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Bars */}
                {selected.parts.length > 0 ? (
                  expandedParts && (
                    <div className="space-y-3 mt-3">
                      {selected.parts.map((part) => {
                        const progress = calculateProgress(
                          part.ongoingRun,
                          part.remaining
                        );
                        return (
                          <div key={part.id} className="space-y-1">
                            <div className="text-xs text-zinc-300 font-medium">
                              {part.label}
                            </div>
                            <div className="flex items-center gap-2 h-6">
                              <div className="flex-1 h-full bg-white/[0.05] rounded overflow-hidden border border-white/[0.1] relative group">
                                <div className="flex h-full">
                                  <div
                                    className="bg-sky-600 h-full transition-all"
                                    style={{ width: `${progress}%` }}
                                  />
                                  <div className="bg-red-500 h-full flex-1" />
                                </div>
                                {/* Tooltip */}
                                <div className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/80 px-2 py-0.5 rounded text-[0.65rem] text-sky-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                  Current: {part.ongoingRun.toLocaleString()} CT
                                </div>
                              </div>
                              <div className="text-[0.65rem] text-zinc-400 w-24 text-right">
                                {part.ongoingRun.toLocaleString()}
                              </div>
                              <div className="text-[0.65rem] text-zinc-400 w-24 text-right">
                                {part.remaining.toLocaleString()}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : (
                  <div className="text-zinc-500 text-sm py-8">
                    No lifetime parts data available for this equipment. Click '+ Add Part' to add submachines.
                  </div>
                )}
              </div>
            ) : (
              <div className="text-zinc-500 text-sm py-8">
                Select equipment to view lifetime part data
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-[#09090b] border border-white/[0.04] rounded-xl p-3">
        <div className="flex items-center gap-2 mb-3">
          <input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-black/40 px-2 py-1 rounded text-xs"
          />
          <button className="px-3 py-1 text-xs bg-[#00F0FF] text-black rounded font-bold">
            Search
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed text-[0.68rem] border-collapse">
            <thead>
              <tr className="bg-white/[0.03] text-zinc-300 text-xs">
                <th className="px-2 py-2 w-12">No</th>
                <th className="px-2 py-2 w-40">Machine</th>
                <th className="px-2 py-2 flex-1">Part</th>
                <th className="px-2 py-2 w-28">Ongoing Run</th>
                <th className="px-2 py-2 w-24">Lifetime</th>
                <th className="px-2 py-2 w-64">Plan to do</th>
                <th className="px-2 py-2 w-20">Action</th>
              </tr>
            </thead>
            <tbody>
              {selected && selected.parts.length > 0 ? (
                selected.parts.map((item, idx) => (
                  <tr
                    key={item.id}
                    className="odd:bg-white/[0.01] even:bg-transparent align-top border-b border-white/[0.05]"
                  >
                    <td className="px-2 py-2 text-zinc-400">{idx + 1}</td>
                    <td className="px-2 py-2 text-zinc-300">{selected.label}</td>
                    <td className="px-2 py-2 text-zinc-300 break-words whitespace-normal leading-tight">
                      {item.label}
                    </td>
                    <td className="px-2 py-2 text-zinc-300">
                      {item.ongoingRun.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 text-zinc-300">
                      {item.remaining.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 text-red-400 break-words whitespace-normal leading-tight text-xs">
                      Requires maintenance
                    </td>
                    <td className="px-2 py-2">
                      <button className="w-7 h-7 flex items-center justify-center rounded bg-blue-600 text-white text-xs hover:bg-blue-700 transition-colors">
                        ✓
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-2 py-4 text-center text-zinc-500">
                    Select equipment to view data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Equipment Modal */}
      {showAddEquipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#09090b] border border-white/[0.06] rounded-lg p-4 w-[360px]">
            <h3 className="text-sm font-bold mb-3">Add New Equipment</h3>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Equipment name"
                value={newEquipmentName}
                onChange={(e) => setNewEquipmentName(e.target.value)}
                className="bg-black/40 px-2 py-2 rounded text-sm border border-white/[0.1] focus:outline-none focus:border-sky-500 text-white"
                onKeyPress={(e) => e.key === "Enter" && handleAddEquipment()}
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => setShowAddEquipment(false)}
                  className="px-3 py-1 text-xs bg-white/5 rounded hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddEquipment}
                  className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  Add Equipment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Part Modal */}
      {showAddPart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#09090b] border border-white/[0.06] rounded-lg p-4 w-[400px]">
            <h3 className="text-sm font-bold mb-3">Add New Part to {selected?.label}</h3>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Part name"
                value={newPartName}
                onChange={(e) => setNewPartName(e.target.value)}
                className="bg-black/40 px-2 py-2 rounded text-sm border border-white/[0.1] focus:outline-none focus:border-sky-500 text-white"
              />
              <input
                type="number"
                placeholder="Ongoing Run (cycle time)"
                value={newPartOngoing}
                onChange={(e) => setNewPartOngoing(e.target.value)}
                className="bg-black/40 px-2 py-2 rounded text-sm border border-white/[0.1] focus:outline-none focus:border-sky-500 text-white"
              />
              <input
                type="number"
                placeholder="Remaining Lifetime"
                value={newPartRemaining}
                onChange={(e) => setNewPartRemaining(e.target.value)}
                className="bg-black/40 px-2 py-2 rounded text-sm border border-white/[0.1] focus:outline-none focus:border-sky-500 text-white"
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => setShowAddPart(false)}
                  className="px-3 py-1 text-xs bg-white/5 rounded hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddPart}
                  className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  Add Part
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
