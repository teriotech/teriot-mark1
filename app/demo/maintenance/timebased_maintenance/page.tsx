"use client";

import React, { useState } from "react";

const summaryCards = [
  { title: "Machine Press", value: "", color: "bg-sky-600", icon: "📦" },
  { title: "Machine Injection", value: "77%", color: "bg-emerald-600", icon: "⚡", large: true },
  { title: "Machine Molding", value: "", color: "bg-cyan-600", icon: "🔌" },
  { title: "Utilities", value: "", color: "bg-orange-500", icon: "🛠️" },
  { title: "Boiler", value: "", color: "bg-rose-600", icon: "🔥" },
];

const ringItems = [
  { label: "New", value: 0, color: "border-emerald-500 text-emerald-600" },
  { label: "Mid", value: 117, color: "border-sky-500 text-sky-600" },
  { label: "Old", value: 79, color: "border-indigo-500 text-indigo-600" },
  { label: "Warning", value: 73, color: "border-amber-500 text-amber-600" },
  { label: "Danger", value: 883, color: "border-rose-500 text-rose-600" },
];

const tableRows = [
  {
    no: 1,
    category: "E",
    machine: "Panel Mortar",
    device: "MCB Schneider 6A",
    position: "Cell 02",
    tag: "q",
    price: "100,000",
    install: "2025-08-19",
    lifetime: "1750",
    todayRun: "325",
    nextReplace: "2030-06-04",
    status: "new",
    percentage: "20%",
    rootcause: "di bersihkan kondisi masih bagus",
    lastUser: "-",
  },
  {
    no: 2,
    category: "E",
    machine: "Panel BC Pump House",
    device: "Wago DI 750-430",
    position: "Cell",
    tag: "DI170",
    price: "1,800,000",
    install: "2018-12-12",
    lifetime: "2180",
    todayRun: "2767",
    nextReplace: "2024-11-30",
    status: "danger",
    percentage: "130%",
    rootcause: "-",
    lastUser: "-",
  },
  {
    no: 3,
    category: "E",
    machine: "MCC Panel Rawmat",
    device: "CT T",
    position: "Cell 04",
    tag: "RMA-PRMA-CT-03",
    price: "550,000",
    install: "2018-12-31",
    lifetime: "3225",
    todayRun: "2748",
    nextReplace: "2027-10-30",
    status: "warning",
    percentage: "90%",
    rootcause: "-",
    lastUser: "-",
  },
  {
    no: 4,
    category: "E",
    machine: "CRUSHER",
    device: "Main Motor Crusher",
    position: "55 kW",
    tag: "RMA-CR-M-01",
    price: "10,000,000",
    install: "2020-12-10",
    lifetime: "2180",
    todayRun: "2038",
    nextReplace: "2026-11-29",
    status: "warning",
    percentage: "90%",
    rootcause: "-",
    lastUser: "90689 (Damita Adhi Pratama)",
  },
];

const statusStyles: Record<string, string> = {
  new: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border border-amber-200",
  danger: "bg-rose-50 text-rose-700 border border-rose-200",
};

export default function TimeBasedMaintenancePage() {
  const [editRow, setEditRow] = useState<number | null>(null);
  const [uploadRow, setUploadRow] = useState<number | null>(null);
  const [deleteRow, setDeleteRow] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 text-[0.8rem] leading-6 px-4 py-6 md:px-8 lg:px-10">
      {/* Container dibuat full wide dengan menghapus max-w */}
      <div className="mx-auto w-full space-y-6">
        
        {/* HEADER */}
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-teal-600 font-semibold">Time Base Maintenance</p>
              <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-800">
                Overview TBM 90001 <span className="text-sm font-medium text-slate-500">(admin)</span>
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 font-medium">
              <span>Maintenance</span>
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-teal-500" />
              <span>Time Base Maintenance</span>
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-teal-500" />
              <span>Overview</span>
            </div>
          </div>
        </header>

        {/* SUMMARY CARDS */}
        <section className="grid gap-4 xl:grid-cols-[1fr_1.8fr_1fr]">
          {summaryCards.map((card) => (
            <div
              key={card.title}
              className={`rounded-3xl border border-slate-200 p-5 shadow-sm ${card.large ? "xl:col-span-1 xl:row-span-2" : ""} bg-white`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500 font-semibold">{card.title}</p>
                  {card.value ? (
                    <p className="mt-4 text-4xl font-black text-slate-800">{card.value}</p>
                  ) : (
                    <p className="mt-4 text-sm text-slate-400">Status dashboard panel</p>
                  )}
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${card.color}`}>
                  <span className="text-xl text-white">{card.icon}</span>
                </div>
              </div>
              <div className={`mt-5 inline-flex rounded-full px-4 py-2 text-sm font-semibold text-white ${card.color}`}>
                See details
              </div>
            </div>
          ))}
        </section>

        {/* CHARTS & ESTIMATION COST */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500 font-semibold">Grafik Sparepart Area Mixing & Mould Casting</p>
            </div>
            <div className="text-sm text-slate-400 font-medium">Updated just now</div>
          </div>

          <div className="grid gap-5 md:grid-cols-5">
            {ringItems.map((item) => (
              <div key={item.label} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-center">
                <div className={`mx-auto mb-4 flex h-28 w-28 items-center justify-center rounded-full border-8 ${item.color} bg-white shadow-sm`}>
                  <span className="text-2xl font-bold text-slate-800">{item.value}</span>
                </div>
                <p className="text-sm uppercase tracking-[0.25em] text-slate-500 font-semibold">{item.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-center">
            <p className="text-sm uppercase tracking-[0.35em] text-slate-500 font-semibold">Estimation sparepart cost</p>
            <p className="mt-4 text-3xl font-extrabold text-slate-800">IDR Rp 195.140.000</p>

            <div className="mt-6 grid gap-3 sm:grid-cols-5">
              <button className="rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 shadow-sm">WKB Machine</button>
              <button className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 shadow-sm">Mixing & Moulding Casting</button>
              <button className="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 shadow-sm">Boiler & Autoclave</button>
              <button className="rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 shadow-sm">Raw Material</button>
              <button className="rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-600 shadow-sm">Utilities</button>
            </div>
          </div>
        </section>

        {/* TABLE SECTION */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex w-full max-w-xl items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <label className="flex-1">
                <span className="text-sm font-semibold text-slate-600">Category</span>
                <select className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 shadow-sm">
                  <option value="">All Categories</option>
                  <option value="E">E</option>
                  <option value="M">M</option>
                </select>
              </label>
              <button className="whitespace-nowrap rounded-2xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 shadow-sm">Search</button>
            </div>

            <div className="flex flex-wrap gap-3">
              <button className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 shadow-sm">Export Data TBM</button>
              <button className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 shadow-sm">Add Sparepart</button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full border-collapse text-left text-sm text-slate-700">
              <thead>
                <tr className="bg-slate-100 text-[10px] uppercase tracking-[0.3em] text-slate-500">
                  <th className="px-4 py-4 font-semibold">No.</th>
                  <th className="px-4 py-4 font-semibold">Category</th>
                  <th className="px-4 py-4 font-semibold">Machine</th>
                  <th className="px-4 py-4 font-semibold">Device</th>
                  <th className="px-4 py-4 font-semibold">Position</th>
                  <th className="px-4 py-4 font-semibold">Tag</th>
                  <th className="px-4 py-4 font-semibold">Price</th>
                  <th className="px-4 py-4 font-semibold">Last Install</th>
                  <th className="px-4 py-4 font-semibold">Life Time (day)</th>
                  <th className="px-4 py-4 font-semibold">Today Run (day)</th>
                  <th className="px-4 py-4 font-semibold">Next Replacement</th>
                  <th className="px-4 py-4 font-semibold">Status</th>
                  <th className="px-4 py-4 font-semibold">Percentage</th>
                  <th className="px-4 py-4 font-semibold">Rootcause</th>
                  <th className="px-4 py-4 font-semibold">Last User</th>
                  <th className="px-4 py-4 font-semibold">Action</th>
                  <th className="px-4 py-4 font-semibold">Detail</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row) => (
                  <tr key={row.no} className="border-t border-slate-200 last:border-b last:border-slate-200 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4 font-bold text-slate-800">{row.no}</td>
                    <td className="px-4 py-4 font-bold text-teal-700">{row.category}</td>
                    <td className="px-4 py-4 font-medium">{row.machine}</td>
                    <td className="px-4 py-4">{row.device}</td>
                    <td className="px-4 py-4">{row.position}</td>
                    <td className="px-4 py-4">{row.tag}</td>
                    <td className="px-4 py-4">{row.price}</td>
                    <td className="px-4 py-4">{row.install}</td>
                    <td className="px-4 py-4">{row.lifetime}</td>
                    <td className="px-4 py-4">{row.todayRun}</td>
                    <td className="px-4 py-4">{row.nextReplace}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${statusStyles[row.status] || "bg-slate-100 text-slate-600 border border-slate-300"}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{row.percentage}</span>
                        <div className="h-2.5 w-24 overflow-hidden rounded-full bg-slate-200">
                          <div className={`h-full rounded-full ${row.status === "danger" ? "bg-rose-500" : row.status === "warning" ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: row.percentage }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">{row.rootcause}</td>
                    <td className="px-4 py-4">{row.lastUser}</td>
                    <td className="px-4 py-4 space-y-2">
                      <button
                        onClick={() => setEditRow(row.no)}
                        className="w-full rounded-2xl bg-slate-100 border border-slate-300 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-200 hover:text-slate-800"
                      >
                        Edit
                      </button>
                      <div className="relative">
                        <button
                          onClick={() => setUploadRow(uploadRow === row.no ? null : row.no)}
                          className="w-full rounded-2xl bg-teal-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-teal-700 shadow-sm"
                        >
                          Upload
                        </button>
                        {uploadRow === row.no && (
                          <div className="absolute left-0 top-full z-20 mt-2 w-44 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-lg">
                            <button className="w-full rounded-xl px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100">Datasheet</button>
                            <button className="mt-2 w-full rounded-xl px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100">Picture</button>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setDeleteRow(row.no)}
                        className="w-full rounded-2xl bg-rose-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-rose-600 shadow-sm"
                      >
                        Delete
                      </button>
                    </td>
                    <td className="px-4 py-4 font-semibold text-teal-600 underline decoration-teal-600/30 decoration-2 hover:text-teal-700 cursor-pointer">Details</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MODAL EDIT */}
          {editRow !== null && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-extrabold tracking-tight text-slate-800">Edit Row {editRow}</h2>
                    <p className="mt-2 text-sm text-slate-500">Update the selected maintenance entry details.</p>
                  </div>
                  <button onClick={() => setEditRow(null)} className="text-slate-400 transition hover:text-slate-600">✕</button>
                </div>
                <div className="mt-6 space-y-4 text-sm text-slate-600">
                  <p>Form fields can be added here for edit values.</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button className="rounded-2xl bg-teal-600 px-4 py-3 text-sm font-bold text-white hover:bg-teal-700 shadow-sm">Save changes</button>
                    <button onClick={() => setEditRow(null)} className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 shadow-sm">Cancel</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MODAL DELETE */}
          {deleteRow !== null && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
                <h2 className="text-xl font-extrabold tracking-tight text-slate-800">Confirm Delete</h2>
                <p className="mt-3 text-sm text-slate-500">Delete row {deleteRow}? This action cannot be undone in the demo view.</p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button onClick={() => setDeleteRow(null)} className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 shadow-sm">Cancel</button>
                  <button onClick={() => setDeleteRow(null)} className="rounded-2xl bg-rose-500 px-4 py-3 text-sm font-bold text-white hover:bg-rose-600 shadow-sm">Delete</button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}