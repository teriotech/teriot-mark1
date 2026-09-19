"use client";

import React, { useState } from "react";
import { Calendar, Edit3, Trash2, Plus, Search, X } from "lucide-react";

// interface untuk tipe data schedule list
interface PMScheduleItem {
  id: string;
  jobName: string;
  duration: string;
  description: string;
  formCode: string;
  formName: string;
  tags: ("Active" | "Weekly" | "Monthly" | "Electrical" | "Production" | "Mechanical")[];
  pic: string;
  spareparts: string;
  tools: string;
  area: string;
  executionDate: string;
  repeaterDays: number;
  scheduleInputDate: string;
}

export default function PredictiveMaintenancePage() {
  // State Filter & Navigasi Kalender
  const [currentMonth, setCurrentMonth] = useState("July 2026");
  
  // State untuk Filter List di bagian bawah
  const [filterArea, setFilterArea] = useState("All Area");
  const [filterTag, setFilterTag] = useState("All Tag");
  const [filterFrequency, setFilterFrequency] = useState("All Frequency");
  const [searchQuery, setSearchQuery] = useState("");

  // State untuk mengontrol pop-up modal Edit Form (PM Result Approval Checklist)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<PMScheduleItem | null>(null);

  // --- DATA DUMMY CALENDAR SCHEDULE ---
  const calendarEvents: Record<number, { label: string; type: "electrical" | "production" | "mechanical" }[]> = {
    8: [
      { label: "[Electrical]PM RABU (E-RUN) : UTILITY", type: "electrical" },
      { label: "[Electrical]TRANSFORMER", type: "electrical" },
      { label: "[Electrical]Weekly PM ,Mixer Mortar", type: "electrical" },
      { label: "[Electrical]Weekly PM,Mortar Machine", type: "electrical" },
      { label: "[Mechanical]PM MONTHLY : ROTARY VALVE 272 (MORTAR PLANT)", type: "mechanical" },
    ],
    9: [
      { label: "[Electrical]Weekly PM,Packaging mortar", type: "electrical" },
      { label: "[Electrical]Weekly PM,Screw Cement Mortar", type: "electrical" },
      { label: "[Mechanical]PM JUMAT (M-RUN) : UTILITY", type: "mechanical" },
      { label: "[Mechanical]PM KAMIS (M-RUN) : UTILITY", type: "mechanical" },
      { label: "[Mechanical]PM MONTHLY : ASSY SCREW CEMENT", type: "mechanical" },
      { label: "[Mechanical]PM MONTHLY : GENERATOR SYSTEM", type: "mechanical" },
    ],
    10: [
      { label: "[Electrical]Monthly PM: Fire Alarm ( Office )", type: "electrical" },
      { label: "[Electrical]PM RUN: UTILITY", type: "electrical" },
      { label: "[Electrical]Weekly PM,Rotary cement 350", type: "electrical" },
      { label: "[Electrical]Weekly PM,Rotary Valve 272", type: "electrical" },
      { label: "[Mechanical]PM MONTHLY : MIXER (MORTAR PLANT)", type: "mechanical" },
    ],
    12: [
      { label: "[Production]PM MONTHLY : APAR - TRAFO", type: "production" }
    ],
    13: [
      { label: "[Mechanical]PM MONTHLY : Belt conveyor Mortar", type: "mechanical" },
      { label: "[Mechanical]PM MONTHLY : MORTAR SCREW CONVEYOR 02", type: "mechanical" }
    ],
    14: [
      { label: "[Electrical]PM (E-RUN) : UTILITY", type: "electrical" },
      { label: "[Mechanical]PM MONTHLY : AIR COMPRESSOR 01", type: "mechanical" },
      { label: "[Mechanical]PM MONTHLY : DUST COLLECTOR MORTAR", type: "mechanical" },
      { label: "[Mechanical]PM SELASA (M-RUN) : UTILITY", type: "mechanical" },
      { label: "[Production]PM MONTHLY : Eye Wash MORTAR", type: "production" },
      { label: "[Production]PM MONTHLY : Eye Wash TPS", type: "production" },
    ],
    15: [
      { label: "[Electrical]PM : Incoming Cubicle PLN 20 KV", type: "electrical" },
      { label: "[Electrical]SOLAR CELL SYSTEM", type: "electrical" },
      { label: "[Mechanical]PM MONTHLY : AIR COMPRESSOR 02", type: "mechanical" },
      { label: "[Mechanical]PM MONTHLY : AIR DRYER 01", type: "mechanical" },
      { label: "[Production]PM MONTHLY : APAR-RAW MATERIAL LUAR 1", type: "production" },
    ],
    16: [
      { label: "[Electrical]PM Weekly: SCREW Conveyor CaCO3", type: "electrical" }
    ]
  };

  // --- DATA DUMMY SCHEDULE SETTING LIST ---
  const scheduleItems: PMScheduleItem[] = [
    {
      id: "1",
      jobName: "SOLAR CELL SYSTEM",
      duration: "60mins",
      description: "Periksa kondisi Solar Panel dan ruangan",
      formCode: "UTI-PV-01",
      formName: "[SOLAR CELL SYSTEM]",
      tags: ["Active", "Weekly", "Electrical"],
      pic: "no data",
      spareparts: "no data",
      tools: "Thermogun [ 62MAX+ ], Kuas/painting[ 2 ]",
      area: "Rawmat",
      executionDate: "Wed 15-07-2026",
      repeaterDays: 7,
      scheduleInputDate: "15-07-2026"
    },
    {
      id: "2",
      jobName: "PM SOLAR CELL SYSTEM",
      duration: "60mins",
      description: "Periksa kondisi PV panel dan inverter",
      formCode: "UTI-PV-01",
      formName: "[SOLAR CELL SYSTEM]",
      tags: ["Active", "Monthly", "Electrical"],
      pic: "no data",
      spareparts: "no data",
      tools: "Tang Ampere / Clamp Meter[ 303 ], Thermogun [ 62MAX+ ], Kuas/painting[ 2 ]",
      area: "Rawmat",
      executionDate: "Tue 21-07-2026",
      repeaterDays: 28,
      scheduleInputDate: "21-07-2026"
    },
    {
      id: "3",
      jobName: "APAR CHARGER FORKLIFT",
      duration: "mins",
      description: "Inspeksi rutin bulanan kualitas dan kondisi APAR",
      formCode: "UTI-APAR-40",
      formName: "[Charger Forklift]",
      tags: ["Active", "Monthly", "Production"],
      pic: "no data",
      spareparts: "no data",
      tools: "no data",
      area: "Utility",
      executionDate: "Wed 22-07-2026",
      repeaterDays: 28,
      scheduleInputDate: "22-07-2026"
    },
    {
      id: "4",
      jobName: "Weekly PM,Packaging mortar",
      duration: "mins",
      description: "Pengecekan rutin",
      formCode: "RMA-BR-001",
      formName: "[Packaging Mortar]",
      tags: ["Active", "Weekly", "Electrical"],
      pic: "no data",
      spareparts: "no data",
      tools: "Kuas/cleaning[ 4 ], Tang Ampere / Clamp Meter[ 303 ]",
      area: "Rawmat",
      executionDate: "Fri 10-07-2026",
      repeaterDays: 7,
      scheduleInputDate: "10-07-2026"
    }
  ];

  const getEventBadgeClass = (type: "electrical" | "production" | "mechanical") => {
    switch (type) {
      case "electrical":
        return "bg-teal-50 text-teal-700 border-teal-200";
      case "production":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "mechanical":
      default:
        return "bg-sky-50 text-sky-700 border-sky-200";
    }
  };

  const getTagClass = (tag: string) => {
    switch (tag) {
      case "Active": return "bg-green-50 text-green-700 border-green-200";
      case "Weekly": return "bg-teal-50 text-teal-700 border-teal-200";
      case "Monthly": return "bg-cyan-50 text-cyan-700 border-cyan-200";
      case "Electrical": return "bg-orange-50 text-orange-700 border-orange-200";
      case "Production": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      default: return "bg-slate-100 text-slate-600 border-slate-300";
    }
  };

  // Fungsi saat tombol edit di klik
  const handleEditClick = (item: PMScheduleItem) => {
    setSelectedJob(item);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-teal-500/20 px-4 py-6">
      <div className="max-w-full mx-auto space-y-6">
        
        {/* HEADER BAR */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between border-b border-slate-100">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-teal-600" />
              <div>
                <h1 className="text-lg font-semibold tracking-wide text-slate-800">Predictive Maintenance Schedule</h1>
                <p className="text-xs text-slate-500 mt-1">90006(Atikom Imsap)</p>
              </div>
            </div>
          </div>

          {/* UI CALENDAR SCHEDULE */}
          <div className="p-4 border-b border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-extrabold text-slate-800 tracking-wide font-mono">{currentMonth}</h3>
              <div className="flex items-center gap-1">
                <button className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs px-3 py-1 rounded transition-all font-medium shadow-sm">today</button>
                <button className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs px-2 py-1 rounded font-bold shadow-sm">{"<"}</button>
                <button className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs px-2 py-1 rounded font-bold shadow-sm">{">"}</button>
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <div className="min-w-[1000px] border border-slate-200 rounded-lg overflow-hidden">
                <div className="grid grid-cols-7 bg-slate-50 text-center text-[11px] font-bold uppercase tracking-widest text-slate-500 border-b border-slate-200 py-2">
                  <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
                </div>

                <div className="grid grid-cols-7 bg-white divide-x divide-y divide-slate-200 border-b border-slate-200">
                  <div className="min-h-[140px] p-1"><span className="text-xs text-slate-400 font-mono p-1">5</span></div>
                  <div className="min-h-[140px] p-1"><span className="text-xs text-slate-400 font-mono p-1">6</span></div>
                  <div className="min-h-[140px] p-1"><span className="text-xs text-slate-400 font-mono p-1">7</span></div>
                  
                  <div className="min-h-[140px] p-1 bg-teal-50/30">
                    <span className="text-xs text-slate-700 font-mono p-1 block font-bold">8</span>
                    <div className="space-y-0.5 mt-1">
                      {calendarEvents[8]?.map((ev, i) => (
                        <div key={i} className={`text-[9px] px-1.5 py-0.5 rounded border leading-tight truncate font-mono ${getEventBadgeClass(ev.type)}`} title={ev.label}>
                          {ev.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="min-h-[140px] p-1 bg-teal-50/30">
                    <span className="text-xs text-slate-700 font-mono p-1 block font-bold">9</span>
                    <div className="space-y-0.5 mt-1">
                      {calendarEvents[9]?.map((ev, i) => (
                        <div key={i} className={`text-[9px] px-1.5 py-0.5 rounded border leading-tight truncate font-mono ${getEventBadgeClass(ev.type)}`} title={ev.label}>
                          {ev.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="min-h-[140px] p-1">
                    <span className="text-xs text-slate-700 font-mono p-1 block font-bold">10</span>
                    <div className="space-y-0.5 mt-1">
                      {calendarEvents[10]?.map((ev, i) => (
                        <div key={i} className={`text-[9px] px-1.5 py-0.5 rounded border leading-tight truncate font-mono ${getEventBadgeClass(ev.type)}`} title={ev.label}>
                          {ev.label}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="min-h-[140px] p-1"><span className="text-xs text-slate-400 font-mono p-1">11</span></div>

                  <div className="min-h-[140px] p-1">
                    <span className="text-xs text-slate-700 font-mono p-1 block">12</span>
                    <div className="space-y-0.5 mt-1">
                      {calendarEvents[12]?.map((ev, i) => (
                        <div key={i} className={`text-[9px] px-1.5 py-0.5 rounded border leading-tight truncate font-mono ${getEventBadgeClass(ev.type)}`}>{ev.label}</div>
                      ))}
                    </div>
                  </div>

                  <div className="min-h-[140px] p-1">
                    <span className="text-xs text-slate-700 font-mono p-1 block">13</span>
                    <div className="space-y-0.5 mt-1">
                      {calendarEvents[13]?.map((ev, i) => (
                        <div key={i} className={`text-[9px] px-1.5 py-0.5 rounded border leading-tight truncate font-mono ${getEventBadgeClass(ev.type)}`}>{ev.label}</div>
                      ))}
                    </div>
                  </div>

                  <div className="min-h-[140px] p-1">
                    <span className="text-xs text-slate-700 font-mono p-1 block font-bold">14</span>
                    <div className="space-y-0.5 mt-1">
                      {calendarEvents[14]?.map((ev, i) => (
                        <div key={i} className={`text-[9px] px-1.5 py-0.5 rounded border leading-tight truncate font-mono ${getEventBadgeClass(ev.type)}`}>{ev.label}</div>
                      ))}
                    </div>
                  </div>

                  <div className="min-h-[140px] p-1">
                    <span className="text-xs text-slate-700 font-mono p-1 block font-bold">15</span>
                    <div className="space-y-0.5 mt-1">
                      {calendarEvents[15]?.map((ev, i) => (
                        <div key={i} className={`text-[9px] px-1.5 py-0.5 rounded border leading-tight truncate font-mono ${getEventBadgeClass(ev.type)}`}>{ev.label}</div>
                      ))}
                    </div>
                  </div>

                  <div className="min-h-[140px] p-1">
                    <span className="text-xs text-slate-700 font-mono p-1 block">16</span>
                    <div className="space-y-0.5 mt-1">
                      {calendarEvents[16]?.map((ev, i) => (
                        <div key={i} className={`text-[9px] px-1.5 py-0.5 rounded border leading-tight truncate font-mono ${getEventBadgeClass(ev.type)}`}>{ev.label}</div>
                      ))}
                    </div>
                  </div>
                  <div className="min-h-[140px] p-1"><span className="text-xs text-slate-400 font-mono p-1">17</span></div>
                  <div className="min-h-[140px] p-1"><span className="text-xs text-slate-400 font-mono p-1">18</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SCHEDULE CONFIGURATION SETTING & LIST */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-teal-50 border-b border-slate-200 px-4 py-2.5 flex justify-between items-center">
            <h3 className="text-xs font-bold text-teal-700 uppercase tracking-wider font-mono">Schedule List</h3>
            <button className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-3 py-1 rounded flex items-center gap-1 text-[11px] transition-colors">
              <Plus className="w-3 h-3" /> New Schedule
            </button>
          </div>

          {/* FILTER CONTROLLERS ROW */}
          <div className="bg-white border-b border-slate-200 px-4 py-3 grid grid-cols-1 md:grid-cols-5 gap-3">
            <input
              type="date"
              placeholder="from Date"
              className="bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-teal-500 shadow-sm"
            />
            <input
              type="date"
              placeholder="to Date"
              className="bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-teal-500 shadow-sm"
            />
            <select
              value={filterArea}
              onChange={(e) => setFilterArea(e.target.value)}
              className="bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-teal-500 shadow-sm"
            >
              <option>All Area</option>
              <option>Rawmat</option>
              <option>Utility</option>
            </select>
            <select
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              className="bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-teal-500 shadow-sm"
            >
              <option>All Tag</option>
              <option>Electrical</option>
              <option>Production</option>
            </select>
            <select
              value={filterFrequency}
              onChange={(e) => setFilterFrequency(e.target.value)}
              className="bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-teal-500 shadow-sm"
            >
              <option>All Frequency</option>
              <option>Weekly</option>
              <option>Monthly</option>
            </select>
          </div>

          {/* SEARCH BAR ROW */}
          <div className="bg-white border-b border-slate-200 px-4 py-3 flex gap-2">
            <div className="flex-1 flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search job name or description..."
                className="flex-1 bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-teal-500 shadow-sm"
              />
            </div>
            <button className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-1.5 rounded text-xs font-semibold transition-colors">
              Search
            </button>
          </div>

          <div className="px-4 py-2 text-xs text-slate-500 font-mono italic bg-slate-50">found 9618 data.</div>

          {/* DATA LIST TABLE */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-slate-600 font-mono">Job Name</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-mono">Info</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-mono">Area/Execution</th>
                  <th className="px-4 py-3 text-center text-slate-600 font-mono">Action</th>
                </tr>
              </thead>
              <tbody>
                {scheduleItems.map((item, idx) => (
                  <tr key={item.id} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-slate-50' : 'bg-white'} hover:bg-slate-100 transition-colors`}>
                    
                    {/* KOLOM 1: JOB NAME & BADGES */}
                    <td className="px-4 py-3 space-y-2">
                      <div className="flex flex-wrap items-center gap-1">
                        {item.tags.map((tag, i) => (
                          <span key={i} className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold border ${getTagClass(tag)}`}>
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="text-slate-800 font-semibold">{item.jobName}</div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">{item.description}</p>
                      <div className="text-[10px] text-slate-500 font-mono">
                        <span className="text-slate-600 font-semibold">Form:</span> {item.formCode}{item.formName}
                      </div>
                    </td>

                    {/* KOLOM 2: INFO */}
                    <td className="px-4 py-3 text-[11px] text-slate-600 space-y-1">
                      <div><span className="text-slate-500 font-semibold">PIC:</span> {item.pic}</div>
                      <div><span className="text-slate-500 font-semibold">Sparepart:</span> {item.spareparts}</div>
                      <div className="leading-snug"><span className="text-slate-500 font-semibold">Tool:</span> {item.tools}</div>
                    </td>

                    {/* KOLOM 3: AREA / EXECUTION */}
                    <td className="px-4 py-3 text-[11px] text-slate-600 space-y-0.5 font-mono">
                      <div className="text-slate-800 font-semibold">{item.area}</div>
                      <div>{item.executionDate}</div>
                      <div><span className="text-slate-500 font-semibold">Repeater:</span> {item.repeaterDays} days</div>
                    </td>

                    {/* KOLOM 4: ACTION CONTROLS */}
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => handleEditClick(item)}
                          className="bg-teal-50 hover:bg-teal-100 text-teal-600 p-1.5 rounded border border-teal-200 transition-colors"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          className="bg-amber-50 hover:bg-amber-100 text-amber-600 p-1.5 rounded border border-amber-200 transition-colors"
                          title="Settings"
                        >
                          <Search className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          className="bg-red-50 hover:bg-red-100 text-red-600 p-1.5 rounded border border-red-200 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* BOTTOM PAGINATION CONTROLLER */}
          <div className="px-4 py-3 border-t border-slate-200 flex justify-start items-center gap-1 font-mono text-[10px]">
            <button className="px-2 py-1 bg-teal-600 text-white font-bold rounded">1</button>
            <button className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded text-slate-600">2</button>
            <button className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded text-slate-600">3</button>
            <button className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded text-slate-600">4</button>
            <button className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded text-slate-600">5</button>
            <button className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded text-slate-600">Next</button>
            <button className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded text-slate-600">Last</button>
          </div>
        </div>
      </div>

      {/* POP-UP MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-200">
              <h2 className="text-sm font-bold text-slate-800">PM Result Approval</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded border border-slate-200">
                <div>
                  <p className="text-xs font-mono text-slate-500">Area:</p>
                  <p className="text-sm text-teal-700 font-semibold">{selectedJob?.area || "All Area"}</p>
                </div>
                <div>
                  <p className="text-xs font-mono text-slate-500">Execution:</p>
                  <p className="text-sm text-teal-700 font-semibold">{selectedJob?.executionDate}</p>
                </div>
                <div>
                  <p className="text-xs font-mono text-slate-500">Frequency:</p>
                  <p className="text-sm text-teal-700 font-semibold">{selectedJob?.repeaterDays} days</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono text-slate-500">Job Name</label>
                <p className="text-sm text-slate-800 font-medium">{selectedJob?.jobName}</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono text-slate-500">Description</label>
                <p className="text-sm text-slate-600">{selectedJob?.description}</p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs bg-white hover:bg-slate-50 text-slate-700 rounded border border-slate-300 transition-colors font-medium shadow-sm"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs bg-teal-600 hover:bg-teal-700 text-white rounded transition-colors font-medium shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}