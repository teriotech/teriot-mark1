"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import * as XLSX from "xlsx";

type MachinePressRecord = {
  id: number;
  machine_no: string;
  count_no: number;
  product_name: string;
  user: string;
  created_at?: string; 
  timestamp?: string;  
};

const DUMMY_PRODUCTS = ["Cover Front A", "Panel Back B", "Bracket C", "Housing D", "Base Plate E"];
const DUMMY_MACHINES = ["Press-01", "Press-02", "Press-03", "Press-04", "Press-05"];

export default function MachinePressPage() {
  const [records, setRecords] = useState<MachinePressRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const [isAutoMode, setIsAutoMode] = useState<boolean>(false);
  const recordsRef = useRef<MachinePressRecord[]>([]);
  const isAutoModeRef = useRef<boolean>(false);

  const tableContainerRef = useRef<HTMLDivElement>(null);

  // --- FUNGSI BARU: Ambil user langsung saat fungsi dipanggil ---
  const getLoggedInUser = () => {
    if (typeof window !== "undefined") {
      const storedUser = localStorage.getItem("currentUser");
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          return parsedUser.name ? parsedUser.name.split(" ")[0] : "User";
        } catch (e) {
          console.error("Gagal membaca data user", e);
        }
      }
    }
    return "Unknown User";
  };
  // --------------------------------------------------------------

  useEffect(() => {
    recordsRef.current = records;
  }, [records]);

  useEffect(() => {
    isAutoModeRef.current = isAutoMode;
  }, [isAutoMode]);

  const fetchRecords = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/machine_press");
      if (!response.ok) throw new Error("Gagal mengambil data dari server");
      const data = await response.json();
      setRecords(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleSimulateTrigger = async () => {
    setIsSimulating(true);
    setError(null);

    try {
      const randomMachine = DUMMY_MACHINES[Math.floor(Math.random() * DUMMY_MACHINES.length)];
      const randomProduct = DUMMY_PRODUCTS[Math.floor(Math.random() * DUMMY_PRODUCTS.length)];
      
      const machineRecords = recordsRef.current.filter((r) => r.machine_no === randomMachine);
      const nextCount = machineRecords.length > 0 
        ? Math.max(...machineRecords.map((r) => r.count_no)) + 1 
        : 1;

      const payload = {
        machine_no: randomMachine,
        count_no: nextCount,
        product_name: randomProduct,
        user: getLoggedInUser(), 
      };

      const response = await fetch("/api/machine_press", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Gagal menyimpan data simulasi");
      }

      await fetchRecords();
    } catch (err: any) {
      setError(err.message); 
    } finally {
      setIsSimulating(false);
    }
  };

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const scheduleNext = () => {
      if (!isAutoModeRef.current) return;
      
      const delay = Math.floor(Math.random() * (70000 - 1000 + 1)) + 1000;
      
      timeoutId = setTimeout(async () => {
        if (isAutoModeRef.current) {
          await handleSimulateTrigger();
          scheduleNext(); 
        }
      }, delay);
    };

    if (isAutoMode) {
      scheduleNext();
    }

    return () => {
      clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAutoMode]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString("id-ID", { 
      timeZone: "Asia/Jakarta",
      day: "2-digit", 
      month: "short", 
      year: "numeric", 
      hour: "2-digit", 
      minute: "2-digit", 
      second: "2-digit",
      timeZoneName: "short" 
    });
  };

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        record.machine_no.toLowerCase().includes(searchLower) ||
        record.product_name.toLowerCase().includes(searchLower) ||
        record.user.toLowerCase().includes(searchLower) ||
        String(record.id).includes(searchLower);

      let matchesDate = true;
      const recordDateStr = record.timestamp || record.created_at;
      
      if (recordDateStr) {
        const recordDate = new Date(recordDateStr);
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

      return matchesSearch && matchesDate;
    });
  }, [records, searchQuery, startDate, endDate]);

  const rowVirtualizer = useVirtualizer({
    count: filteredRecords.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 56, 
    overscan: 5, 
  });

  const handleExportExcel = () => {
    const dataToExport = filteredRecords.map((r) => ({
      "ID": r.id,
      "No. Mesin": r.machine_no,
      "Count": r.count_no,
      "Nama Produk": r.product_name,
      "Operator": r.user,
      "Waktu (WIB)": formatDate(r.timestamp || r.created_at)
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Log");
    
    XLSX.writeFile(workbook, `Machine_Press_Log_${new Date().getTime()}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-teal-500/30 p-4 md:p-6 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER & ACTION SECTION */}
      <header className="bg-slate-900 border border-slate-800 rounded shadow-xl px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-md font-bold tracking-wider text-slate-200 flex items-center gap-2">
              Machine Press <span className="text-teal-400">Logger</span>
            </h1>
            <p className="text-xs font-mono text-slate-500 mt-0.5">
              Log aktivitas mesin press secara real-time.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsAutoMode(!isAutoMode)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider transition-all shrink-0 ${
              isAutoMode 
                ? "bg-rose-900/30 hover:bg-rose-900/50 border border-rose-500/50 text-rose-400" 
                : "bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300"
            }`}
          >
            {isAutoMode ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                Stop Auto Trigger
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                Start Auto Trigger
              </>
            )}
          </button>

          <button
            onClick={handleSimulateTrigger}
            disabled={isSimulating || isLoading || isAutoMode}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {isSimulating ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Memproses...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
                Manual Trigger
              </>
            )}
          </button>
        </div>
      </header>

      {/* FILTER & SEARCH SECTION */}
      <div className="flex flex-col lg:flex-row gap-4 bg-slate-900 border border-slate-800 p-4 rounded shadow-xl">
        <div className="flex-1">
          <label className="text-[10px] font-bold text-teal-400 uppercase tracking-wider font-mono mb-1.5 block">Pencarian</label>
          <input 
            type="text" 
            placeholder="Cari ID, Mesin, Produk, Operator..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500 font-mono transition-colors"
          />
        </div>
        <div className="flex gap-4 flex-1">
          <div className="flex-1">
            <label className="text-[10px] font-bold text-teal-400 uppercase tracking-wider font-mono mb-1.5 block">Dari Tanggal</label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500 font-mono transition-colors [color-scheme:dark]"
            />
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-bold text-teal-400 uppercase tracking-wider font-mono mb-1.5 block">Sampai Tanggal</label>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500 font-mono transition-colors [color-scheme:dark]"
            />
          </div>
        </div>
        <div className="flex items-end">
          <button
            onClick={handleExportExcel}
            disabled={filteredRecords.length === 0}
            className="w-full lg:w-auto flex items-center justify-center gap-1.5 bg-blue-600/20 hover:bg-blue-600 border border-blue-500/30 hover:border-blue-400 text-blue-400 hover:text-white px-4 py-2 rounded text-[11px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export Excel
          </button>
        </div>
      </div>

      {/* ERROR ALERT */}
      {error && (
        <div className="bg-rose-950/40 border-l-2 border-l-rose-500 border-y border-r border-slate-800 p-4 rounded text-xs text-rose-400 flex items-center gap-3 font-mono">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* TABLE SECTION */}
      <div className="bg-slate-900 border border-slate-800 rounded shadow-xl overflow-hidden flex flex-col">
        <div className="bg-teal-950/40 border-b border-slate-800 px-4 py-2.5 flex justify-between items-center">
          <h2 className="text-xs font-bold text-teal-400 uppercase tracking-wider font-mono flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"></span>
            Live Data Log
          </h2>
          <span className="text-[10px] font-mono text-slate-500">
            Menampilkan: {filteredRecords.length} / {records.length} Records
          </span>
        </div>
        
        <div ref={tableContainerRef} className="overflow-auto h-[500px] relative">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur-sm shadow-md">
              <tr className="text-slate-400 border-b border-slate-800 bg-slate-950/30">
                <th className="p-3 font-medium w-20">ID</th>
                <th className="p-3 font-medium">No. Mesin</th>
                <th className="p-3 font-medium w-24">Count</th>
                <th className="p-3 font-medium">Nama Produk</th>
                <th className="p-3 font-medium">Operator (User)</th>
                <th className="p-3 font-medium">Waktu (Timestamp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-slate-300">
              {isLoading && records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-teal-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Memuat data...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 italic">
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
                        key={item.id} 
                        ref={rowVirtualizer.measureElement}
                        data-index={virtualRow.index}
                        className="hover:bg-slate-950/30 transition-colors"
                      >
                        <td className="p-3 text-slate-500 font-bold">#{item.id}</td>
                        <td className="p-3 font-semibold text-teal-400">{item.machine_no}</td>
                        <td className="p-3">
                          <span className="bg-slate-950 border border-slate-800 px-2 py-1 rounded text-[10px]">
                            {String(item.count_no).padStart(4, '0')}
                          </span>
                        </td>
                        <td className="p-3 text-slate-200">{item.product_name}</td>
                        <td className="p-3 flex items-center gap-2">
                          <div className="w-5 h-5 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-[9px] font-bold text-slate-300 uppercase shrink-0">
                            {item.user ? item.user.charAt(0) : "?"}
                          </div>
                          {item.user}
                        </td>
                        <td className="p-3 text-slate-500 text-[11px]">
                          {formatDate(item.timestamp || item.created_at)}
                        </td>
                      </tr>
                    );
                  })}

                  {rowVirtualizer.getVirtualItems().length > 0 && (
                    <tr style={{ 
                      height: `${rowVirtualizer.getTotalSize() - rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1].end}px` 
                    }}></tr>
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
