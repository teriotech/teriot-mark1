"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import * as XLSX from "xlsx";

/* -----------------------------------------------------------------------
 * Types
 * ---------------------------------------------------------------------*/

type MachineApiRow = {
  id: number;
  is_fg: number | boolean | null;
  product_type: string | null;
  timestamp?: string | null;
};

type MachineApiResponse =
  | { success: true; data: MachineApiRow[] }
  | { success: false; error?: string; message?: string };

type MachineKey = "17A" | "17B";

type MachinePressRecord = {
  id: number;
  machine: MachineKey;
  machine_label: string;
  product_type: string;
  isGood: boolean;
  timestamp?: string;
};

const MACHINES: { key: MachineKey; label: string; endpoint: string }[] = [
  { key: "17A", label: "Press 17A – TRF2000", endpoint: "/api/upin/machine_press/machine_17a_trf2000" },
  { key: "17B", label: "Press 17B – TRF2000", endpoint: "/api/upin/machine_press/machine_17b_trf2000" },
];

const REFRESH_INTERVAL_MS = 5000;

/* -----------------------------------------------------------------------
 * Helper untuk mendapatkan tanggal hari ini (Format: YYYY-MM-DD)
 * ---------------------------------------------------------------------*/
const getTodayDateString = () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

/* -----------------------------------------------------------------------
 * Component
 * ---------------------------------------------------------------------*/

export default function MachinePressPage() {
  const [records, setRecords] = useState<MachinePressRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // Modifikasi: Set default state menggunakan tanggal hari ini
  const [startDate, setStartDate] = useState<string>(getTodayDateString());
  const [endDate, setEndDate] = useState<string>(getTodayDateString());
  
  const [machineFilter, setMachineFilter] = useState<"ALL" | MachineKey>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "FG" | "NG">("ALL");
  const [productFilter, setProductFilter] = useState<string>("ALL");

  const [isLiveUpdate, setIsLiveUpdate] = useState<boolean>(true);
  const isLiveUpdateRef = useRef<boolean>(true);

  const tableContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    isLiveUpdateRef.current = isLiveUpdate;
  }, [isLiveUpdate]);

  /* --- Fetching -------------------------------------------------------- */

  const fetchRecords = useCallback(async (silent: boolean = false) => {
    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    const errors: string[] = [];

    const results = await Promise.all(
      MACHINES.map(async (machine) => {
        try {
          const response = await fetch(machine.endpoint, { cache: "no-store" });
          const payload: MachineApiResponse = await response.json();

          if (!response.ok || !payload.success) {
            const message =
              (!payload.success && (payload.error || payload.message)) ||
              `Gagal mengambil data ${machine.label}`;
            errors.push(message);
            return [] as MachinePressRecord[];
          }

          return payload.data.map<MachinePressRecord>((row) => ({
            id: row.id,
            machine: machine.key,
            machine_label: machine.label,
            product_type: row.product_type ?? "-",
            isGood: Number(row.is_fg ?? 0) === 0,
            timestamp: row.timestamp ?? undefined,
          }));
        } catch (err: any) {
          errors.push(`${machine.label}: ${err.message || "Gagal terhubung ke server"}`);
          return [] as MachinePressRecord[];
        }
      })
    );

    const merged = results.flat().sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      if (timeB !== timeA) return timeB - timeA;
      return b.id - a.id;
    });

    setRecords(merged);
    setLastUpdated(new Date());
    if (errors.length > 0) setError(errors.join(" | "));

    setIsLoading(false);
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    if (!isLiveUpdate) return;

    const intervalId = setInterval(() => {
      if (isLiveUpdateRef.current) {
        fetchRecords(true);
      }
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [isLiveUpdate, fetchRecords]);

  /* --- Helpers ----------------------------------------------------------*/

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "short",
    });
  };

  const productTypeList = useMemo(() => {
    const types = Array.from(new Set(records.map((r) => r.product_type).filter(Boolean)));
    types.sort((a, b) => a.localeCompare(b));
    return types;
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        searchLower === "" ||
        record.product_type.toLowerCase().includes(searchLower) ||
        record.machine_label.toLowerCase().includes(searchLower) ||
        String(record.id).includes(searchLower);

      const matchesMachine = machineFilter === "ALL" || record.machine === machineFilter;

      const matchesProduct = productFilter === "ALL" || record.product_type === productFilter;

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "FG" && record.isGood) ||
        (statusFilter === "NG" && !record.isGood);

      let matchesDate = true;
      if (record.timestamp) {
        const recordDate = new Date(record.timestamp);
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          matchesDate = matchesDate && recordDate >= start;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          matchesDate = matchesDate && recordDate <= end;
        }
      }

      return matchesSearch && matchesMachine && matchesProduct && matchesStatus && matchesDate;
    });
  }, [records, searchQuery, machineFilter, productFilter, statusFilter, startDate, endDate]);

  const rowVirtualizer = useVirtualizer({
    count: filteredRecords.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 56,
    overscan: 5,
    getItemKey: (index) => `${filteredRecords[index].machine}-${filteredRecords[index].id}`,
  });

  const handleExportExcel = () => {
    const dataToExport = filteredRecords.map((r) => ({
      ID: r.id,
      Mesin: r.machine_label,
      "Tipe Produk": r.product_type,
      Status: r.isGood ? "Good (FG)" : "Reject (NG)",
      "Waktu (WIB)": formatDate(r.timestamp),
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Log");

    XLSX.writeFile(workbook, `Machine_Press_Log_${new Date().getTime()}.xlsx`);
  };

  const goodCount = useMemo(() => filteredRecords.filter((r) => r.isGood).length, [filteredRecords]);
  const rejectCount = filteredRecords.length - goodCount;

  /* --- Render -------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-teal-500/20 p-4 md:p-6 flex flex-col gap-6">

      {/* HEADER & ACTION SECTION */}
      <header className="bg-white border border-slate-200 rounded shadow-sm px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-md font-bold tracking-wider text-slate-800 flex items-center gap-2">
            Machine Press <span className="text-teal-600">Logger</span>
          </h1>
          <p className="text-xs font-mono text-slate-500 mt-0.5">
            Log aktivitas mesin press 17A &amp; 17B TRF2000.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-mono text-slate-400 mr-1">
            {lastUpdated ? `Update: ${formatDate(lastUpdated.toISOString())}` : ""}
          </span>

          <button
            onClick={() => setIsLiveUpdate(!isLiveUpdate)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider transition-all shrink-0 border ${
              isLiveUpdate
                ? "bg-teal-50 hover:bg-teal-100 border-teal-300 text-teal-700"
                : "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-500"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isLiveUpdate ? "bg-teal-500 animate-pulse" : "bg-slate-400"
              }`}
            ></span>
            {isLiveUpdate ? "Live Update: ON" : "Live Update: OFF"}
          </button>

          <button
            onClick={() => fetchRecords(true)}
            disabled={isRefreshing || isLoading}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
            Refresh
          </button>
        </div>
      </header>

      {/* STAT SUMMARY */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded shadow-sm px-4 py-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Total</p>
          <p className="text-xl font-bold text-slate-800 mt-1">{filteredRecords.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded shadow-sm px-4 py-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Good (FG)</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">{goodCount}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded shadow-sm px-4 py-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Reject (NG)</p>
          <p className="text-xl font-bold text-rose-600 mt-1">{rejectCount}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded shadow-sm px-4 py-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Mesin Aktif</p>
          <p className="text-xl font-bold text-slate-800 mt-1">{MACHINES.length}</p>
        </div>
      </div>

      {/* FILTER & SEARCH SECTION */}
      <div className="flex flex-col lg:flex-row gap-4 bg-white border border-slate-200 p-4 rounded shadow-sm">
        <div className="flex-1">
          <label className="text-[10px] font-bold text-teal-600 uppercase tracking-wider font-mono mb-1.5 block">
            Pencarian
          </label>
          <input
            type="text"
            placeholder="Cari ID, Mesin, Tipe Produk..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-teal-500 font-mono transition-colors"
          />
        </div>

        <div className="flex-1">
          <label className="text-[10px] font-bold text-teal-600 uppercase tracking-wider font-mono mb-1.5 block">
            Mesin
          </label>
          <select
            value={machineFilter}
            onChange={(e) => setMachineFilter(e.target.value as "ALL" | MachineKey)}
            className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-teal-500 font-mono transition-colors"
          >
            <option value="ALL">Semua Mesin</option>
            {MACHINES.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <label className="text-[10px] font-bold text-teal-600 uppercase tracking-wider font-mono mb-1.5 block">
            Tipe Produk
          </label>
          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-teal-500 font-mono transition-colors"
          >
            <option value="ALL">Semua Produk</option>
            {productTypeList.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <label className="text-[10px] font-bold text-teal-600 uppercase tracking-wider font-mono mb-1.5 block">
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "ALL" | "FG" | "NG")}
            className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-teal-500 font-mono transition-colors"
          >
            <option value="ALL">Semua Status</option>
            <option value="FG">Good (FG)</option>
            <option value="NG">Reject (NG)</option>
          </select>
        </div>

        <div className="flex gap-4 flex-1">
          <div className="flex-1">
            <label className="text-[10px] font-bold text-teal-600 uppercase tracking-wider font-mono mb-1.5 block">
              Dari Tanggal
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-teal-500 font-mono transition-colors"
            />
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-bold text-teal-600 uppercase tracking-wider font-mono mb-1.5 block">
              Sampai Tanggal
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-teal-500 font-mono transition-colors"
            />
          </div>
        </div>

        <div className="flex items-end">
          <button
            onClick={handleExportExcel}
            disabled={filteredRecords.length === 0}
            className="w-full lg:w-auto flex items-center justify-center gap-1.5 bg-blue-50 hover:bg-blue-600 border border-blue-300 hover:border-blue-500 text-blue-600 hover:text-white px-4 py-2 rounded text-[11px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-3.5 h-3.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
            Export Excel
          </button>
        </div>
      </div>

      {/* ERROR ALERT */}
      {error && (
        <div className="bg-rose-50 border-l-2 border-l-rose-500 border-y border-r border-rose-200 p-4 rounded text-xs text-rose-700 flex items-center gap-3 font-mono">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* TABLE SECTION */}
      <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden flex flex-col">
        <div className="bg-teal-50 border-b border-slate-200 px-4 py-2.5 flex justify-between items-center">
          <h2 className="text-xs font-bold text-teal-700 uppercase tracking-wider font-mono flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>
            Live Data Log
          </h2>
          <span className="text-[10px] font-mono text-slate-500">
            Menampilkan: {filteredRecords.length} / {records.length} Records
          </span>
        </div>

        <div ref={tableContainerRef} className="overflow-auto h-[500px] relative">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm shadow-sm">
              <tr className="text-slate-500 border-b border-slate-200">
                <th className="p-3 font-medium w-20">ID</th>
                <th className="p-3 font-medium">Mesin</th>
                <th className="p-3 font-medium">Tipe Produk</th>
                <th className="p-3 font-medium w-28">Status</th>
                <th className="p-3 font-medium">Waktu (Timestamp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading && records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <svg
                        className="animate-spin h-5 w-5 text-teal-500"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      <span>Memuat data...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                    Tidak ada data yang ditemukan.
                  </td>
                </tr>
              ) : (
                <>
                  {rowVirtualizer.getVirtualItems().length > 0 && (
                    <tr style={{ height: `${rowVirtualizer.getVirtualItems()[0].start}px` }}></tr>
                  )}

                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const item = filteredRecords[virtualRow.index];
                    return (
                      <tr
                        key={`${item.machine}-${item.id}`}
                        ref={rowVirtualizer.measureElement}
                        data-index={virtualRow.index}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="p-3 text-slate-400 font-bold">#{item.id}</td>
                        <td className="p-3 font-semibold text-teal-700">{item.machine_label}</td>
                        <td className="p-3 text-slate-800">{item.product_type}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-1 rounded text-[10px] font-bold border ${
                              item.isGood
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                : "bg-rose-50 border-rose-200 text-rose-700"
                            }`}
                          >
                            {item.isGood ? "GOOD (FG)" : "REJECT (NG)"}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500 text-[11px]">{formatDate(item.timestamp)}</td>
                      </tr>
                    );
                  })}

                  {rowVirtualizer.getVirtualItems().length > 0 && (
                    <tr
                      style={{
                        height: `${
                          rowVirtualizer.getTotalSize() -
                          rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1].end
                        }px`,
                      }}
                    ></tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}