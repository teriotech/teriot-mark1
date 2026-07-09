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
  timestamp?: string; // PERBAIKAN: Menggunakan timestamp sesuai database
}

export default function DashboardPage() {
  const [rawData, setRawData] = useState<MachineData[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]); // Default Today
  const [selectedMachine, setSelectedMachine] = useState<string>("All");
  const [timeFilter, setTimeFilter] = useState<string>("daily"); // Untuk chart bawah

  // Fetch Data dari API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/machine_press");
        if (res.ok) {
          const data = await res.json();
          // PERBAIKAN: Gunakan timestamp untuk sorting
          const sortedData = data.sort((a: MachineData, b: MachineData) => 
            new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime()
          );
          setRawData(sortedData);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Dapatkan daftar mesin unik untuk Dropdown
  const machineList = useMemo(() => {
    const machines = Array.from(new Set(rawData.map((d) => d.machine_no).filter(Boolean)));
    return ["All", ...machines];
  }, [rawData]);

  // Proses Data berdasarkan Filter (Date & Machine)
  const processedData = useMemo(() => {
    // 1. Filter Data
    const filtered = rawData.filter((d) => {
      // PERBAIKAN: Cek apakah d.timestamp ada sebelum memanggil startsWith
      const dateMatch = d.timestamp ? d.timestamp.startsWith(selectedDate) : false;
      const machineMatch = selectedMachine === "All" || d.machine_no === selectedMachine;
      return dateMatch && machineMatch;
    });

    // 2. Hitung Cycle Time & Kategori
    let totalDowntimeCount = 0;
    const chartData: any[] = [];
    const alerts: any[] = [];

    for (let i = 0; i < filtered.length; i++) {
      let cycleTime = 0;
      if (i > 0) {
        const current = new Date(filtered[i].timestamp || 0).getTime();
        const prev = new Date(filtered[i - 1].timestamp || 0).getTime();
        cycleTime = (current - prev) / 1000; // dalam detik
      }

      let status = "Good";
      let color = "#00FF66"; // Hijau (< 10s)
      
      if (cycleTime > 60) {
        status = "Downtime";
        color = "#f43f5e"; // Merah (> 60s)
        totalDowntimeCount++;
        alerts.push({
          time: filtered[i].timestamp ? new Date(filtered[i].timestamp!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "-",
          msg: `Downtime detected (${Math.round(cycleTime)}s)`,
          product: filtered[i].product_name || "Unknown",
          user: filtered[i].user || "Unknown",
          type: "error"
        });
      } else if (cycleTime >= 10 && cycleTime <= 60) {
        status = "Slow Speed";
        color = "#eab308"; // Kuning (10 - 60s)
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

    // 3. Hitung Metrics
    const totalOutput = filtered.length;
    const activeUsers = Array.from(new Set(filtered.map(d => d.user).filter(Boolean)));
    const downtimeRate = totalOutput > 0 ? ((totalDowntimeCount / totalOutput) * 100).toFixed(1) : "0.0";

    // 4. Hitung Electricity Cost (Asumsi 500k / jam dari data pertama ke terakhir di hari itu)
    let electricityCost = 0;
    if (filtered.length > 1 && filtered[0].timestamp && filtered[filtered.length - 1].timestamp) {
      const firstTime = new Date(filtered[0].timestamp!).getTime();
      const lastTime = new Date(filtered[filtered.length - 1].timestamp!).getTime();
      const hoursDiff = (lastTime - firstTime) / (1000 * 60 * 60);
      electricityCost = Math.max(0, hoursDiff * 500000); // Pastikan tidak minus
    }

    return {
      filtered,
      chartData,
      alerts: alerts.reverse(), // Terbaru di atas
      totalOutput,
      activeUsers,
      downtimeRate,
      electricityCost
    };
  }, [rawData, selectedDate, selectedMachine]);

  // Proses Data untuk Bottom Bar Chart (Date vs Qty)
  const bottomChartData = useMemo(() => {
    const grouped: Record<string, number> = {};
    
    // Filter hanya berdasarkan mesin (abaikan selectedDate agar bisa melihat weekly/monthly)
    const machineFiltered = rawData.filter(d => selectedMachine === "All" || d.machine_no === selectedMachine);

    machineFiltered.forEach(d => {
      if (!d.timestamp) return; // PERBAIKAN: Lewati jika tidak ada timestamp

      const dateObj = new Date(d.timestamp);
      let key = "";

      if (timeFilter === "daily") {
        // Group by Hour untuk hari ini
        if (d.timestamp.startsWith(selectedDate)) {
          key = `${dateObj.getHours().toString().padStart(2, '0')}:00`;
        }
      } else if (timeFilter === "weekly") {
        // Group by Day
        key = dateObj.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
      } else if (timeFilter === "monthly") {
        // Group by Date
        key = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      } else if (timeFilter === "yearly") {
        // Group by Month
        key = dateObj.toLocaleDateString('id-ID', { month: 'short' });
      }

      if (key) {
        grouped[key] = (grouped[key] || 0) + 1;
      }
    });

    return Object.keys(grouped).map(key => ({
      label: key,
      qty: grouped[key]
    }));
  }, [rawData, selectedMachine, selectedDate, timeFilter]);

  // Custom Dot untuk Line Chart (Warna berdasarkan kriteria)
  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    return (
      <circle cx={cx} cy={cy} r={4} fill={payload.color} stroke="#09090b" strokeWidth={2} />
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-[#00F0FF] animate-pulse font-bold tracking-widest uppercase text-sm">Loading Dashboard...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Production Monitoring</h2>
          <p className="text-sm text-zinc-400 mt-1">Real-time metrics based on Machine Press API.</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Filter 1: Date */}
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-[#09090b] border border-white/[0.1] text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:border-[#00F0FF]/50"
          />
          {/* Filter 2: Machine Dropdown */}
          <select 
            value={selectedMachine}
            onChange={(e) => setSelectedMachine(e.target.value)}
            className="bg-[#09090b] border border-white/[0.1] text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:border-[#00F0FF]/50"
          >
            {machineList.map(mc => (
              <option key={mc} value={mc}>{mc === "All" ? "All Machines" : mc}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Output */}
        <div className="bg-[#09090b] border border-white/[0.05] p-5 rounded-xl shadow-sm hover:border-[#00F0FF]/30 transition-colors">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Total Output</h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{processedData.totalOutput}</span>
            <span className="text-xs text-zinc-500 font-medium">pcs</span>
          </div>
        </div>
        
        {/* Card 2: Active Users */}
        <div className="bg-[#09090b] border border-white/[0.05] p-5 rounded-xl shadow-sm hover:border-[#00F0FF]/30 transition-colors">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Active Users</h3>
          <div className="mt-2 flex flex-col gap-1">
            <span className="text-2xl font-extrabold text-white">{processedData.activeUsers.length} <span className="text-sm text-zinc-500 font-normal">Users</span></span>
            <span className="text-[10px] text-zinc-400 truncate">
              {processedData.activeUsers.length > 0 ? processedData.activeUsers.join(", ") : "No active users"}
            </span>
          </div>
        </div>
        
        {/* Card 3: Downtime Rate */}
        <div className="bg-[#09090b] border border-white/[0.05] p-5 rounded-xl shadow-sm hover:border-rose-500/30 transition-colors">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Downtime Rate</h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold ${Number(processedData.downtimeRate) > 10 ? 'text-rose-500' : 'text-[#00F0FF]'}`}>
              {processedData.downtimeRate}%
            </span>
            <span className="text-[10px] text-zinc-500 font-medium">(&gt;60s cycle)</span>
          </div>
        </div>
        
        {/* Card 4: Electricity Cost */}
        <div className="bg-[#09090b] border border-white/[0.05] p-5 rounded-xl shadow-sm hover:border-amber-500/30 transition-colors">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Electricity Cost</h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-amber-400">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(processedData.electricityCost)}
            </span>
          </div>
          <p className="text-[9px] text-zinc-500 mt-1">Est. 500k/hour based on runtime</p>
        </div>
      </div>

      {/* Charts & Activity Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Chart: Production Output (Cycle Time) */}
        <div className="lg:col-span-2 bg-[#09090b] border border-white/[0.05] p-5 rounded-xl min-h-[350px] flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Cycle Time Analysis</h3>
              <p className="text-[10px] text-zinc-400">
                <span className="text-[#00FF66]">● &lt;10s (Good)</span> | <span className="text-amber-400">● 10-60s (Slow)</span> | <span className="text-rose-500">● &gt;60s (Downtime)</span>
              </p>
            </div>
          </div>
          <div className="flex-1 w-full h-full min-h-[250px]">
            {processedData.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={processedData.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="time" stroke="#71717a" fontSize={10} tickMargin={10} />
                  <YAxis stroke="#71717a" fontSize={10} tickFormatter={(val) => `${val}s`} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#09090b', borderColor: '#ffffff20', borderRadius: '8px', fontSize: '12px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="cycleTime" 
                    stroke="#00F0FF" 
                    strokeWidth={2} 
                    dot={<CustomDot />}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-600 text-sm">No data available for selected date.</div>
            )}
          </div>
        </div>

        {/* Recent Alerts: Cycle Time Alerts */}
        <div className="bg-[#09090b] border border-white/[0.05] p-5 rounded-xl flex flex-col h-[350px]">
          <h3 className="text-sm font-bold text-white mb-4">Cycle Time Alerts</h3>
          <div className="space-y-3 flex-1 overflow-y-auto pr-2 [&::-webkit-scrollbar]:hidden">
            {processedData.alerts.length > 0 ? (
              processedData.alerts.map((alert, i) => (
                <div key={i} className="flex gap-3 items-start p-3 rounded-lg bg-white/[0.02] border border-white/[0.02] hover:bg-white/[0.04] transition-colors">
                  <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 shadow-[0_0_8px_currentColor] ${
                    alert.type === 'error' ? 'bg-rose-500 text-rose-500' : 'bg-amber-400 text-amber-400'
                  }`} />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-zinc-200 leading-snug">{alert.msg}</p>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-[10px] text-zinc-400">{alert.product} • {alert.user}</p>
                      <p className="text-[9px] text-zinc-500">{alert.time}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-600 text-xs">No alerts for today.</div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Chart: Date vs Qty */}
      <div className="bg-[#09090b] border border-white/[0.05] p-5 rounded-xl min-h-[300px] flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-sm font-bold text-white">Production Quantity Trend</h3>
          <select 
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="bg-white/[0.05] border border-white/[0.1] text-xs text-zinc-300 rounded-lg px-3 py-1.5 outline-none focus:border-[#00F0FF]/50"
          >
            <option value="daily">Daily (Hours)</option>
            <option value="weekly">Weekly (Days)</option>
            <option value="monthly">Monthly (Dates)</option>
            <option value="yearly">Yearly (Months)</option>
          </select>
        </div>
        
        <div className="flex-1 w-full h-[250px]">
          {bottomChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bottomChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="label" stroke="#71717a" fontSize={10} tickMargin={10} />
                <YAxis stroke="#71717a" fontSize={10} />
                <RechartsTooltip 
                  cursor={{ fill: '#ffffff05' }}
                  contentStyle={{ backgroundColor: '#09090b', borderColor: '#ffffff20', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="qty" radius={[4, 4, 0, 0]}>
                  {bottomChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill="#0066FF" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-zinc-600 text-sm">No data available for selected filter.</div>
          )}
        </div>
      </div>

    </div>
  );
}