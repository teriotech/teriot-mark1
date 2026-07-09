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

const DUMMY_PRODUCTS = ["Casing Cover A1", "Mainboard Bracket", "Power Button", "Cooling Fan Blade", "Metal Frame B2"];
const DUMMY_MACHINES = ["PRESS-M01", "PRESS-M02", "PRESS-M03"];

export default function MachinePressPage() {
  const [records, setRecords] = useState<MachinePressRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // State untuk Filter & Search
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const loggedInUser = "Admin LGE"; 
  const tableContainerRef = useRef<HTMLDivElement>(null);

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
      
      const machineRecords = records.filter((r) => r.machine_no === randomMachine);
      const nextCount = machineRecords.length > 0 
        ? Math.max(...machineRecords.map((r) => r.count_no)) + 1 
        : 1;

      const payload = {
        machine_no: randomMachine,
        count_no: nextCount,
        product_name: randomProduct,
        user: loggedInUser,
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

  // 1. Logika Filter & Search
  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      // Filter Search (General)
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        record.machine_no.toLowerCase().includes(searchLower) ||
        record.product_name.toLowerCase().includes(searchLower) ||
        record.user.toLowerCase().includes(searchLower) ||
        String(record.id).includes(searchLower);

      // Filter Tanggal
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

  // 2. Setup Virtualizer
  const rowVirtualizer = useVirtualizer({
    count: filteredRecords.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 56, // Estimasi tinggi baris (px)
    overscan: 5, // Render 5 baris ekstra di luar layar agar scroll mulus
  });

  // 3. Fungsi Export Excel
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
    
    // Generate file dan download
    XLSX.writeFile(workbook, `Machine_Press_Log_${new Date().getTime()}.xlsx`);
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER & ACTION SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tighter text-white">
            Machine Press <span className="bg-gradient-to-r from-[#00F0FF] to-[#0066FF] bg-clip-text text-transparent">Logger</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Log aktivitas mesin press secara real-time.
          </p>
        </div>

        <button
          onClick={handleSimulateTrigger}
          disabled={isSimulating || isLoading}
          className="flex items-center gap-2 bg-[#00F0FF]/10 hover:bg-[#00F0FF]/20 border border-[#00F0FF]/30 text-[#00F0FF] px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(0,240,255,0.15)] disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          {isSimulating ? (
            <>
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Memproses...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
              Simulasi Trigger Mesin
            </>
          )}
        </button>
      </div>

      {/* FILTER & SEARCH SECTION */}
      <div className="flex flex-col lg:flex-row gap-4 bg-[#09090b]/80 backdrop-blur-xl border border-white/[0.05] p-4 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
        <div className="flex-1">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">Pencarian</label>
          <input 
            type="text" 
            placeholder="Cari ID, Mesin, Produk, Operator..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/[0.02] border border-white/[0.1] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00F0FF]/50 transition-colors"
          />
        </div>
        <div className="flex gap-4 flex-1">
          <div className="flex-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">Dari Tanggal</label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-white/[0.02] border border-white/[0.1] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00F0FF]/50 transition-colors [color-scheme:dark]"
            />
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">Sampai Tanggal</label>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-white/[0.02] border border-white/[0.1] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00F0FF]/50 transition-colors [color-scheme:dark]"
            />
          </div>
        </div>
        <div className="flex items-end">
          <button
            onClick={handleExportExcel}
            disabled={filteredRecords.length === 0}
            className="w-full lg:w-auto flex items-center justify-center gap-2 bg-[#00FF66]/10 hover:bg-[#00FF66]/20 border border-[#00FF66]/30 text-[#00FF66] px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export Excel
          </button>
        </div>
      </div>

      {/* ERROR ALERT */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-lg text-xs text-rose-400 flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="font-mono">{error}</span>
        </div>
      )}

      {/* TABLE SECTION */}
      <div className="bg-[#09090b]/80 backdrop-blur-xl border border-white/[0.05] rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col">
        <div className="p-5 border-b border-white/[0.05] flex justify-between items-center bg-white/[0.01]">
          <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00FF66] animate-pulse shadow-[0_0_5px_#00FF66]"></span>
            Live Data Log
          </h2>
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            Menampilkan: {filteredRecords.length} / {records.length} Records
          </span>
        </div>
        
        {/* Container untuk Virtualizer (Harus memiliki height dan overflow-auto) */}
        <div 
          ref={tableContainerRef} 
          className="overflow-auto h-[500px] relative custom-scrollbar"
        >
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-[#09090b] shadow-md">
              <tr className="bg-white/[0.02] text-[10px] uppercase tracking-widest text-zinc-500 border-b border-white/[0.05]">
                <th className="p-4 font-medium">ID</th>
                <th className="p-4 font-medium">No. Mesin</th>
                <th className="p-4 font-medium">Count</th>
                <th className="p-4 font-medium">Nama Produk</th>
                <th className="p-4 font-medium">Operator (User)</th>
                <th className="p-4 font-medium">Waktu (Timestamp)</th>
              </tr>
            </thead>
            <tbody className="text-xs text-zinc-300">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-zinc-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <svg className="animate-spin h-6 w-6 text-[#00F0FF]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Memuat data...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-zinc-500">
                    Tidak ada data yang ditemukan.
                  </td>
                </tr>
              ) : (
                <>
                  {/* Padding Atas untuk Virtualizer */}
                  {rowVirtualizer.getVirtualItems().length > 0 && (
                    <tr style={{ height: `${rowVirtualizer.getVirtualItems()[0].start}px` }}></tr>
                  )}
                  
                  {/* Render Baris yang Terlihat Saja */}
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const item = filteredRecords[virtualRow.index];
                    return (
                      <tr 
                        key={item.id} 
                        ref={rowVirtualizer.measureElement}
                        data-index={virtualRow.index}
                        className="border-b border-white/[0.02] hover:bg-white/[0.04] transition-colors"
                      >
                        <td className="p-4 font-mono text-zinc-500">#{item.id}</td>
                        <td className="p-4 font-bold text-[#00F0FF]">{item.machine_no}</td>
                        <td className="p-4">
                          <span className="bg-white/[0.05] border border-white/[0.1] px-2 py-1 rounded text-[10px] font-mono">
                            {String(item.count_no).padStart(4, '0')}
                          </span>
                        </td>
                        <td className="p-4 font-medium text-white">{item.product_name}</td>
                        <td className="p-4 flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#00F0FF] to-[#7000FF] flex items-center justify-center text-[8px] font-bold text-white uppercase shrink-0">
                            {item.user.charAt(0)}
                          </div>
                          {item.user}
                        </td>
                        <td className="p-4 text-zinc-500 font-mono text-[10px]">
                          {formatDate(item.timestamp || item.created_at)}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Padding Bawah untuk Virtualizer */}
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