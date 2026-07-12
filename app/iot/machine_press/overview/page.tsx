"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from "recharts";

// Tipe data sesuai dengan response API
interface MachineData {
  id: number;
  machine_no: string;
  count_no: number;
  product_name: string;
  user: string;
  timestamp?: string; 
}

// Fungsi untuk mengubah detik menjadi format Jam, Menit, Detik
const formatDuration = (totalSeconds: number) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  
  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0 || parts.length === 0) parts.push(`${s}s`);
  
  return parts.join(" ");
};

export default function DashboardPage() {
  const [rawData, setRawData] = useState<MachineData[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]); // Default Today
  const [selectedMachine, setSelectedMachine] = useState<string>("All");
  const [timeFilter, setTimeFilter] = useState<string>("daily"); // Untuk chart bawah

  // Fetch Data dari API setiap 10 detik
  useEffect(() => {
    const fetchData = async (isInitialLoad = false) => {
      try {
        const res = await fetch("/api/machine_press");
        if (res.ok) {
          const data = await res.json();
          const sortedData = data.sort((a: MachineData, b: MachineData) => 
            new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime()
          );
          setRawData(sortedData);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        // Hanya matikan loading screen pada load pertama kali
        if (isInitialLoad) {
          setLoading(false);
        }
      }
    };

    // Panggil fetch pertama kali saat komponen di-mount
    fetchData(true);

    // Set interval untuk fetch ulang setiap 10 detik (10000 ms)
    const intervalId = setInterval(() => {
      fetchData(false);
    }, 10000);

    // Cleanup function untuk membersihkan interval saat komponen di-unmount
    return () => clearInterval(intervalId);
  }, []);

  // Dapatkan daftar mesin unik untuk Dropdown
  const machineList = useMemo(() => {
    const machines = Array.from(new Set(rawData.map((d) => d.machine_no).filter(Boolean)));
    return ["All", ...machines];
  }, [rawData]);

  // Proses Data berdasarkan Filter (Date & Machine) untuk Top Cards & Line Chart
  const processedData = useMemo(() => {
    const filtered = rawData.filter((d) => {
      const dateMatch = d.timestamp ? d.timestamp.startsWith(selectedDate) : false;
      const machineMatch = selectedMachine === "All" || d.machine_no === selectedMachine;
      return dateMatch && machineMatch;
    });

    let totalDowntimeCount = 0;
    const chartData: any[] = [];
    const alerts: any[] = [];

    for (let i = 0; i < filtered.length; i++) {
      let cycleTime = 0;
      if (i > 0) {
        const current = new Date(filtered[i].timestamp || 0).getTime();
        const prev = new Date(filtered[i - 1].timestamp || 0).getTime();
        cycleTime = (current - prev) / 1000; 
      }

      let status = "Good";
      let color = "#2dd4bf"; // teal-400 (menggantikan #00FF66)
      
      if (cycleTime > 60) {
        status = "Downtime";
        color = "#f43f5e"; // rose-500
        totalDowntimeCount++;
        alerts.push({
          time: filtered[i].timestamp ? new Date(filtered[i].timestamp!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "-",
          msg: `Downtime detected (${formatDuration(cycleTime)})`,
          product: filtered[i].product_name || "Unknown",
          user: filtered[i].user || "Unknown",
          type: "error"
        });
      } else if (cycleTime >= 10 && cycleTime <= 60) {
        status = "Slow Speed";
        color = "#fbbf24"; // amber-400
        alerts.push({
          time: filtered[i].timestamp ? new Date(filtered[i].timestamp!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "-",
          msg: `Slow speed (${Math.round(cycleTime)}s)`,
          product: filtered[i].product_name || "Unknown",
          user: filtered[i].user || "Unknown",
          type: "warning"
        });
      }

      chartData.push({
        time: filtered[i].timestamp ? new Date(filtered[i].timestamp!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-",
        cycleTime: Math.round(cycleTime),
        status,
        color
      });
    }

    const totalOutput = filtered.length;
    const activeUsers = Array.from(new Set(filtered.map(d => d.user).filter(Boolean)));
    const downtimeRate = totalOutput > 0 ? ((totalDowntimeCount / totalOutput) * 100).toFixed(1) : "0.0";

    let electricityCost = 0;
    if (filtered.length > 1 && filtered[0].timestamp && filtered[filtered.length - 1].timestamp) {
      const firstTime = new Date(filtered[0].timestamp!).getTime();
      const lastTime = new Date(filtered[filtered.length - 1].timestamp!).getTime();
      const hoursDiff = (lastTime - firstTime) / (1000 * 60 * 60);
      electricityCost = Math.max(0, hoursDiff * 500000); 
    }

    return {
      filtered,
      chartData,
      alerts: alerts.reverse(), 
      totalOutput,
      activeUsers,
      downtimeRate,
      electricityCost
    };
  }, [rawData, selectedDate, selectedMachine]);

  // ==========================================
  // DATA REAL-TIME UNTUK BOTTOM CHART
  // ==========================================
  const bottomChartData = useMemo(() => {
    const machineFiltered = rawData.filter(d => selectedMachine === "All" || d.machine_no === selectedMachine);
    
    const targetDate = new Date(selectedDate);
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth();
    
    let result: { label: string; qty: number }[] = [];

    if (timeFilter === "daily") {
      result = Array.from({ length: 24 }, (_, i) => ({
        label: `${i.toString().padStart(2, '0')}:00`,
        qty: 0
      }));

      machineFiltered.forEach(d => {
        if (!d.timestamp) return;
        if (d.timestamp.startsWith(selectedDate)) {
          const hour = new Date(d.timestamp).getHours();
          result[hour].qty += 1;
        }
      });

    } else if (timeFilter === "weekly") {
      const days = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
      result = days.map(day => ({ label: day, qty: 0 }));

      const dayOfWeek = targetDate.getDay(); 
      const diffToMonday = targetDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      
      const startOfWeek = new Date(targetDate);
      startOfWeek.setDate(diffToMonday);
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      machineFiltered.forEach(d => {
        if (!d.timestamp) return;
        const dDate = new Date(d.timestamp);
        if (dDate >= startOfWeek && dDate <= endOfWeek) {
          let dayIdx = dDate.getDay() - 1; 
          if (dayIdx === -1) dayIdx = 6; 
          result[dayIdx].qty += 1;
        }
      });

    } else if (timeFilter === "monthly") {
      const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
      result = Array.from({ length: daysInMonth }, (_, i) => ({
        label: `${i + 1}`,
        qty: 0
      }));

      machineFiltered.forEach(d => {
        if (!d.timestamp) return;
        const dDate = new Date(d.timestamp);
        if (dDate.getFullYear() === targetYear && dDate.getMonth() === targetMonth) {
          const day = dDate.getDate();
          result[day - 1].qty += 1;
        }
      });

    } else if (timeFilter === "yearly") {
      const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
      result = months.map(m => ({ label: m, qty: 0 }));

      machineFiltered.forEach(d => {
        if (!d.timestamp) return;
        const dDate = new Date(d.timestamp);
        if (dDate.getFullYear() === targetYear) {
          const month = dDate.getMonth();
          result[month].qty += 1;
        }
      });
    }

    return result;
  }, [rawData, selectedMachine, selectedDate, timeFilter]);

  const hasBottomChartData = bottomChartData.some(d => d.qty > 0);

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    return (
      <circle cx={cx} cy={cy} r={4} fill={payload.color} stroke="#0f172a" strokeWidth={2} />
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-teal-500 font-mono font-bold tracking-widest uppercase text-xs">
          <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading Dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-teal-500/30 p-4 md:p-6 flex flex-col gap-6 animate-in fade-in duration-500">
      
      {/* Header & Filters */}
      <header className="bg-slate-900 border border-slate-800 rounded shadow-xl px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-md font-bold tracking-wider text-slate-200 uppercase">Overview Monitoring Production</h2>
            <p className="text-xs font-mono text-slate-500 mt-0.5">
              Real-time Machine Press : <span className="text-teal-400 font-semibold">{selectedMachine === "All" ? "All Machines" : selectedMachine}</span>
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded px-3 py-2 focus:outline-none focus:border-teal-500 font-mono transition-colors [color-scheme:dark]"
          />
          <select 
            value={selectedMachine}
            onChange={(e) => setSelectedMachine(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded px-3 py-2 focus:outline-none focus:border-teal-500 font-mono transition-colors"
          >
            {machineList.map(mc => (
              <option key={mc} value={mc}>{mc === "All" ? "All Machines" : mc}</option>
            ))}
          </select>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded shadow-xl hover:border-teal-500/30 transition-colors">
          <h3 className="text-[11px] font-bold text-teal-400 uppercase tracking-wider font-mono border-b border-slate-800 pb-1.5 mb-2">Total Output</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-100 font-mono">{processedData.totalOutput}</span>
            <span className="text-[10px] text-slate-500 font-mono">pcs</span>
          </div>
        </div>
        
        <div className="bg-slate-900 border border-slate-800 p-4 rounded shadow-xl hover:border-teal-500/30 transition-colors">
          <h3 className="text-[11px] font-bold text-teal-400 uppercase tracking-wider font-mono border-b border-slate-800 pb-1.5 mb-2">Active Users</h3>
          <div className="flex flex-col gap-0.5">
            <span className="text-2xl font-bold text-slate-100 font-mono">{processedData.activeUsers.length} <span className="text-[10px] text-slate-500 font-normal">Users</span></span>
            <span className="text-[10px] text-slate-400 font-mono truncate">
              {processedData.activeUsers.length > 0 ? processedData.activeUsers.join(", ") : "No active users"}
            </span>
          </div>
        </div>
        
        <div className="bg-slate-900 border border-slate-800 p-4 rounded shadow-xl hover:border-rose-500/30 transition-colors">
          <h3 className="text-[11px] font-bold text-teal-400 uppercase tracking-wider font-mono border-b border-slate-800 pb-1.5 mb-2">Downtime Rate</h3>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold font-mono ${Number(processedData.downtimeRate) > 10 ? 'text-rose-400' : 'text-teal-400'}`}>
              {processedData.downtimeRate}%
            </span>
            <span className="text-[10px] text-slate-500 font-mono">(&gt;60s cycle)</span>
          </div>
        </div>
        
        <div className="bg-slate-900 border border-slate-800 p-4 rounded shadow-xl hover:border-amber-500/30 transition-colors">
          <h3 className="text-[11px] font-bold text-teal-400 uppercase tracking-wider font-mono border-b border-slate-800 pb-1.5 mb-2">Electricity Cost</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-amber-400 font-mono">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(processedData.electricityCost)}
            </span>
          </div>
          <p className="text-[9px] text-slate-500 font-mono mt-1">Est. 500k/hour based on runtime</p>
        </div>
      </div>

      {/* Charts & Activity Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Chart: Production Output (Cycle Time) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-5 rounded shadow-xl min-h-[350px] flex flex-col">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-4">
            <div>
              <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider font-mono">Cycle Time Analysis</h3>
              <p className="text-[10px] font-mono text-slate-400 mt-1">
                <span className="text-teal-400">● &lt;10s (Good)</span> | <span className="text-amber-400">● 10-60s (Slow)</span> | <span className="text-rose-500">● &gt;60s (Downtime)</span>
              </p>
            </div>
          </div>
          <div className="flex-1 w-full h-full min-h-[250px]">
            {processedData.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={processedData.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickMargin={10} fontFamily="monospace" />
                  <YAxis stroke="#64748b" fontSize={10} tickFormatter={(val) => `${val}s`} fontFamily="monospace" />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace' }}
                    itemStyle={{ color: '#f1f5f9' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="cycleTime" 
                    stroke="#2dd4bf" 
                    strokeWidth={2} 
                    dot={<CustomDot />}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-600 text-xs font-mono">No data available for selected date.</div>
            )}
          </div>
        </div>

        {/* Recent Alerts: Cycle Time Alerts */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded shadow-xl flex flex-col h-[350px]">
          <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider font-mono border-b border-slate-800 pb-2 mb-4">Cycle Time Alerts</h3>
          <div className="space-y-2.5 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {processedData.alerts.length > 0 ? (
              processedData.alerts.map((alert, i) => (
                <div key={i} className="flex gap-3 items-start p-3 rounded bg-slate-950/40 border border-slate-800/60 hover:bg-slate-800/50 transition-colors font-mono">
                  <div className={`w-1.5 h-1.5 mt-1.5 rounded-full shrink-0 ${
                    alert.type === 'error' ? 'bg-rose-500 shadow-[0_0_5px_#f43f5e]' : 'bg-amber-400 shadow-[0_0_5px_#fbbf24]'
                  }`} />
                  <div className="flex-1">
                    <p className="text-[11px] font-semibold text-slate-300 leading-snug">{alert.msg}</p>
                    <div className="flex justify-between items-center mt-1.5">
                      <p className="text-[10px] text-slate-500">{alert.product} • {alert.user}</p>
                      <p className="text-[9px] text-slate-600">{alert.time}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex items-center justify-center text-slate-600 text-xs font-mono">No alerts for today.</div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Chart: Date vs Qty */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded shadow-xl flex flex-col">
        <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-4">
          <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider font-mono">
            Production Quantity Trend
          </h3>
          <select 
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-[10px] text-slate-300 rounded px-2 py-1 outline-none focus:border-teal-500 font-mono transition-colors"
          >
            <option value="daily">Daily (Hours)</option>
            <option value="weekly">Weekly (Days)</option>
            <option value="monthly">Monthly (Dates)</option>
            <option value="yearly">Yearly (Months)</option>
          </select>
        </div>
        
        <div className="w-full h-[300px]">
          {hasBottomChartData ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bottomChartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                
                <XAxis 
                  dataKey="label" 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickMargin={10} 
                  fontFamily="monospace"
                  angle={timeFilter === 'monthly' ? -45 : 0}
                  textAnchor={timeFilter === 'monthly' ? 'end' : 'middle'}
                />
                
                <YAxis stroke="#64748b" fontSize={10} allowDecimals={false} fontFamily="monospace" />
                <RechartsTooltip 
                  cursor={{ fill: '#1e293b' }}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace' }}
                  itemStyle={{ color: '#f1f5f9' }}
                />
                
                <Bar dataKey="qty" radius={[2, 2, 0, 0]} maxBarSize={50}>
                  {bottomChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.qty > 0 ? "#2dd4bf" : "#1e293b"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-600 text-xs font-mono">
              Tidak ada data produksi untuk filter waktu ini.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
