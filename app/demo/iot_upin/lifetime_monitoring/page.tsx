"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";

type LifetimeData = {
  id: number;
  main_machine: string;
  product_type: string;
  part_machine: string | null;
  ongoing_qty: number;
  lifetime_qty: number;
  created_at: string;
  updated_at: string | null;
  user: string | null;
  user_teknisi: string | null;
  submit_at: string | null; 
  last_reset_qty: number | null; 
  remark: string | null;
};

type UserData = {
  id: number;
  name: string;
};

export default function Page() {
  const [lifetimeData, setLifetimeData] = useState<LifetimeData[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const [userAuthority, setUserAuthority] = useState<string | null>(null);
  const [loggedInUser, setLoggedInUser] = useState<string>(""); 
  const [usersList, setUsersList] = useState<UserData[]>([]);

  const [selectedItem, setSelectedItem] = useState<LifetimeData | null>(null);
  
  // Modal States
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState<boolean>(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState<boolean>(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);

  // Update Form States
  const [editLifetimeQty, setEditLifetimeQty] = useState<number>(0);
  const [editUserTeknisi, setEditUserTeknisi] = useState<string>(""); 
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // History Form States
  const [isSubmittingHistory, setIsSubmittingHistory] = useState<boolean>(false);
  const [historyForm, setHistoryForm] = useState<any>({
    resetQty: false,
    last_reset_qty: 0,
    category_broken: "",
    remark: "",
  });

  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState<boolean>(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("currentUser");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUserAuthority(parsedUser.authority);
        setLoggedInUser(parsedUser.name || parsedUser.username || "Unknown User");
      } catch (error) {
        console.error("Failed to parse user data", error);
      }
    }
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/users");
        const json = await res.json();
        const data = json.data || (Array.isArray(json) ? json : []);
        setUsersList(data);
      } catch (error) {
        console.error("Failed to fetch users:", error);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getActualOngoingQty = (item: LifetimeData) => {
    if (item.last_reset_qty !== null && item.last_reset_qty !== undefined) {
      return Math.max(0, item.ongoing_qty - item.last_reset_qty);
    }
    return item.ongoing_qty;
  };

  const calculateProgress = (ongoing: number, lifetime: number) => {
    if (!lifetime || lifetime === 0) return 0;
    const percentage = (ongoing / lifetime) * 100;
    return percentage > 100 ? 100 : percentage;
  };

  const getPartStatus = (ongoing: number, lifetime: number) => {
    if (!lifetime || lifetime === 0) return "normal";
    if (ongoing < lifetime) {
      return "normal";
    } else if (ongoing >= lifetime && ongoing <= lifetime * 1.1) {
      return "warning";
    } else {
      return "danger";
    }
  };

  // ==========================================
  // FETCH: /api/iot/lifetime_monitoring (data utama)
  // ==========================================
  const fetchLifetimeData = useCallback(async () => {
    try {
      const res = await fetch("/api/upin/lifetime_monitoring");
      const json = await res.json();
      if (json.data) {
        setLifetimeData(json.data);
        if (!selectedMachine && json.data.length > 0) {
          const uniqueMachines = Array.from(new Set(json.data.map((item: LifetimeData) => item.main_machine)));
          if (uniqueMachines.length > 0) setSelectedMachine(uniqueMachines[0] as string);
        }
      }
    } catch (error) {
      console.error("Failed to fetch lifetime data:", error);
    }
  }, [selectedMachine]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchLifetimeData();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  useEffect(() => {
    fetchLifetimeData();
    const intervalId = setInterval(fetchLifetimeData, 10000);
    return () => clearInterval(intervalId);
  }, [fetchLifetimeData]);

  // --- MODAL HANDLERS ---

  const openUpdateModal = (item: LifetimeData) => {
    setSelectedItem(item);
    setEditLifetimeQty(item.lifetime_qty);
    setEditUserTeknisi(item.user_teknisi || ""); 
    setIsUpdateModalOpen(true);
  };

  const openDetailsModal = (item: LifetimeData) => {
    setSelectedItem(item);
    setIsDetailsModalOpen(true);
  };

  const openHistoryModal = (item: LifetimeData) => {
    setSelectedItem(item);
    setHistoryForm({
      resetQty: false,
      last_reset_qty: 0,
      category_broken: "",
      remark: "",
    });
    setIsHistoryModalOpen(true);
  };

  // --- IMAGE UPLOAD HANDLER (Simpan File Asli & Buat Preview) ---
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, fieldKey: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setHistoryForm((prev: any) => ({
        ...prev,
        [fieldKey]: {
          file: file,
          preview: previewUrl
        }
      }));
    }
  };

  // --- SUBMIT HANDLERS ---

  // 1. Update Submit (HANYA update Qty Limit, User, dan User Teknisi)
  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    setIsUpdating(true);
    try {
      const d = new Date();
      const pad = (n: number) => (n < 10 ? '0' + n : n);
      const mysqlDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      
      const payload = {
        id: selectedItem.id,
        product_type: selectedItem.product_type,
        main_machine: selectedItem.main_machine,
        part_machine: selectedItem.part_machine,
        ongoing_qty: selectedItem.ongoing_qty,
        lifetime_qty: Number(editLifetimeQty), 
        last_reset_qty: selectedItem.last_reset_qty, 
        submit_at: selectedItem.submit_at, 
        updated_at: mysqlDate,
        user: loggedInUser || "Unknown", 
        user_teknisi: editUserTeknisi.trim() === "" ? null : editUserTeknisi, 
        remark: selectedItem.remark
      };

      const res = await fetch("/api/upin/lifetime_monitoring", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchLifetimeData();
        setIsUpdateModalOpen(false);
        setSelectedItem(null);
      } else {
        const errorData = await res.json().catch(() => null);
        console.error("Failed to update data. Status:", res.status, "Response:", errorData);
        alert(`Gagal menyimpan data (Error ${res.status}). Cek console browser.`);
      }
    } catch (error) {
      console.error("Error updating data:", error);
      alert("Terjadi kesalahan pada sistem atau jaringan.");
    } finally {
      setIsUpdating(false);
    }
  };

  // 2. History Submit
  const handleHistorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    setIsSubmittingHistory(true);
    try {
      const d = new Date();
      const pad = (n: number) => (n < 10 ? '0' + n : n);
      const mysqlDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

      // A. Kirim data ke API History
      const historyPayload = {
        machine_product_id: selectedItem.id,
        user_teknisi: selectedItem.user_teknisi || loggedInUser,
        last_reset_qty: historyForm.resetQty ? getActualOngoingQty(selectedItem) : 0,
        category_broken: historyForm.category_broken,
        remark: historyForm.remark,
      };

      const resHistory = await fetch("/api/upin/lifetime_monitoring_history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(historyPayload),
      });

      if (!resHistory.ok) {
        const errData = await resHistory.json().catch(() => null);
        console.error("Failed to submit history. Status:", resHistory.status, "Response:", errData);
        throw new Error(errData?.message || `Gagal menyimpan data history (Error ${resHistory.status})`);
      }

      // B. Jika Checkbox Reset Qty dicentang, update data utama
      if (historyForm.resetQty) {
        const resetPayload = {
          id: selectedItem.id,
          product_type: selectedItem.product_type,
          main_machine: selectedItem.main_machine,
          part_machine: selectedItem.part_machine,
          ongoing_qty: selectedItem.ongoing_qty,
          lifetime_qty: selectedItem.lifetime_qty,
          last_reset_qty: selectedItem.ongoing_qty,
          submit_at: mysqlDate, 
          updated_at: mysqlDate,
          user: loggedInUser || "Unknown",
          user_teknisi: selectedItem.user_teknisi,
          remark: selectedItem.remark
        };

        const resReset = await fetch("/api/upin/lifetime_monitoring", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(resetPayload),
        });

        if (!resReset.ok) {
          const errData = await resReset.json().catch(() => null);
          console.error("Failed to reset ongoing qty. Status:", resReset.status, "Response:", errData);
          alert("History berhasil dikirim, tapi gagal mereset Ongoing Qty. Silakan reset manual.");
        }
      }

      await fetchLifetimeData();
      setIsHistoryModalOpen(false);
      setSelectedItem(null);
      alert("History berhasil dikirim!");
    } catch (error: any) {
      console.error("Error submitting history:", error);
      alert(error?.message || "Terjadi kesalahan saat mengirim history.");
    } finally {
      setIsSubmittingHistory(false);
    }
  };

  // --- DATA PREPARATION ---

  const uniqueMachines = Array.from(new Set(lifetimeData.map((item) => item.main_machine))).filter(Boolean);

  const sortedSelectedMachineData = lifetimeData
    .filter((item) => item.main_machine === selectedMachine)
    .sort((a, b) => {
      const actualA = getActualOngoingQty(a);
      const actualB = getActualOngoingQty(b);
      const progA = calculateProgress(actualA, a.lifetime_qty);
      const progB = calculateProgress(actualB, b.lifetime_qty);
      return progB - progA;
    });

  const matrixData = sortedSelectedMachineData.filter((p) => {
    const actualQty = getActualOngoingQty(p);
    const matchesSearch = p.product_type?.toLowerCase().includes(search.toLowerCase());
    const currentStatus = getPartStatus(actualQty, p.lifetime_qty);
    const matchesStatus = statusFilter === "all" || currentStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredUsers = usersList.filter(u => 
    u.name.toLowerCase().includes(editUserTeknisi.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-teal-500/20 p-4 md:p-6 relative w-full">
      {/* Perubahan utama: menghapus max-w-[1880px] mx-auto dan menggantinya dengan w-full */}
      <main className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-stretch w-full">
        
        {/* KIRI: MAIN MESIN */}
        <div className="xl:col-span-1 flex flex-col">
          <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden flex-1 flex flex-col">
            <div className="bg-teal-50 border-b border-slate-200 px-4 py-2.5 flex justify-between items-center">
              <h3 className="text-xs font-bold text-teal-700 uppercase tracking-wider font-mono">Main Mesin</h3>
              <button 
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                title="Refresh Data"
                className="p-1.5 bg-white border border-teal-200 rounded text-teal-600 hover:bg-teal-600 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isRefreshing ? "animate-spin" : ""}>
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
                </svg>
              </button>
            </div>
            <div className="h-[400px] overflow-y-auto divide-y divide-slate-100 text-xs font-mono">
              {uniqueMachines.length > 0 ? (
                uniqueMachines.map((machine, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedMachine(machine as string)}
                    className={`p-3 cursor-pointer flex items-center gap-2 transition-colors ${
                      selectedMachine === machine
                        ? "bg-teal-50 text-teal-700 border-l-2 border-teal-500 font-semibold"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l-2 border-transparent"
                    }`}
                  >
                    <span className={selectedMachine === machine ? "text-teal-500" : "text-slate-400"}>⊙</span>
                    {machine}
                  </div>
                ))
              ) : (
                <div className="p-4 text-slate-400 italic text-center">Menunggu data...</div>
              )}
            </div>
          </div>
        </div>

        {/* KANAN: RUN TIME PART */}
        <div className="xl:col-span-3 flex flex-col">
          <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden flex-1 flex flex-col">
            <div className="bg-teal-50 border-b border-slate-200 px-4 py-2.5 flex justify-between items-center">
              <h3 className="text-xs font-bold text-teal-700 uppercase tracking-wider font-mono">
                {selectedMachine ? `⊖ ${selectedMachine} - Run Time Part (Pareto)` : "Run Time Part"}
              </h3>
            </div>
            <div className="h-[400px] p-4 font-mono text-xs overflow-y-auto">
              {sortedSelectedMachineData.length > 0 ? (
                <div className="space-y-4">
                  {sortedSelectedMachineData.map((item) => {
                    const actualQty = getActualOngoingQty(item);
                    const progress = calculateProgress(actualQty, item.lifetime_qty);
                    return (
                      <div key={item.id} className="space-y-1.5 bg-slate-50 p-3 rounded border border-slate-200">
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-slate-700 font-medium">Product Type: {item.product_type}</span>
                          <span className="text-teal-600 font-bold">{progress.toFixed(1)} %</span>
                        </div>
                        <div className="flex items-center gap-3 h-4">
                          <div className="flex-1 h-full bg-slate-200 rounded-full overflow-hidden flex relative group">
                            <div
                              className={`${progress >= 110 ? 'bg-rose-500' : progress >= 100 ? 'bg-amber-500' : 'bg-teal-500'} h-full transition-all`}
                              style={{ width: `${progress > 100 ? 100 : progress}%` }}
                            />
                            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 py-0.5 rounded text-[10px] text-teal-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-slate-200 shadow-md">
                              Ongoing: {actualQty.toLocaleString()}
                            </div>
                          </div>
                          <div className="text-[10px] text-slate-500 w-24 text-right">
                            <span className="text-teal-600 font-semibold">{actualQty.toLocaleString()}</span> / <span className="text-rose-600 font-semibold">{item.lifetime_qty.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-slate-400 text-center py-8 italic">Pilih Main Mesin di panel kiri</div>
              )}
            </div>
          </div>
        </div>

        {/* BAWAH: PART DETAILS MATRIX */}
        <div className="xl:col-span-4">
          <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
            <div className="bg-teal-50 border-b border-slate-200 px-4 py-2.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h3 className="text-xs font-bold text-teal-700 uppercase tracking-wider font-mono">
                Part Details Matrix ({selectedMachine || "No Machine Selected"})
              </h3>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full sm:w-32 bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-teal-500 transition-colors shadow-sm"
                >
                  <option value="all">All Status</option>
                  <option value="normal">Normal</option>
                  <option value="warning">Warning</option>
                  <option value="danger">Danger</option>
                </select>
                
                <input
                  placeholder="Search product type..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full sm:w-48 bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-teal-500 transition-colors shadow-sm"
                />
              </div>
            </div>

            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-left font-mono text-xs border-collapse min-w-[1200px]">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-slate-200 text-slate-500 bg-slate-100">
                    <th className="p-3 w-12 text-center font-medium">No</th>
                    <th className="p-3 w-32 font-medium">Main Machine</th>
                    <th className="p-3 font-medium">Product Type</th>
                    <th className="p-3 w-24 font-medium">Ongoing Qty</th>
                    <th className="p-3 w-24 font-medium">Last Reset Qty</th>
                    <th className="p-3 w-24 font-medium">Lifetime Qty</th>
                    <th className="p-3 w-32 font-medium">User Teknisi</th>
                    <th className="p-3 w-32 font-medium">Submit Date</th>
                    <th className="p-3 w-28 font-medium">Status</th>
                    <th className="p-3 w-32 text-center font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {matrixData.length > 0 ? (
                    matrixData.map((item, idx) => {
                      const actualQty = getActualOngoingQty(item);
                      const status = getPartStatus(actualQty, item.lifetime_qty);
                      
                      return (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                          <td className="p-3 text-slate-700 font-semibold">{item.main_machine}</td>
                          <td className="p-3 font-semibold text-teal-700 break-words whitespace-normal leading-tight">{item.product_type}</td>
                          <td className="p-3 text-slate-700">{actualQty.toLocaleString()}</td>
                          <td className="p-3 text-slate-700">{item.last_reset_qty !== null ? item.last_reset_qty.toLocaleString() : "-"}</td>
                          <td className="p-3 text-slate-700">{item.lifetime_qty.toLocaleString()}</td>
                          <td className="p-3 text-slate-700">{item.user_teknisi || "-"}</td>
                          <td className="p-3 text-slate-700 text-[11px]">
                            {item.submit_at ? new Date(item.submit_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : "-"}
                          </td>
                          <td className="p-3">
                            <span 
                              className={`inline-block px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${
                                status === 'danger' ? 'bg-rose-50 text-rose-700 border-rose-200' : 
                                status === 'warning' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                                'bg-teal-50 text-teal-700 border-teal-200'
                              }`}
                            >
                              {status}
                            </span>
                          </td>
                          <td className="p-3 text-center flex justify-center gap-2">
                            {userAuthority === "Admin" && (
                              <button 
                                onClick={() => openUpdateModal(item)}
                                title="Update Limit & User" 
                                className="bg-blue-50 hover:bg-blue-600 border border-blue-200 hover:border-blue-500 text-blue-600 hover:text-white p-1.5 rounded transition-all"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                              </button>
                            )}
                            <button 
                              onClick={() => openDetailsModal(item)}
                              title="Details" 
                              className="bg-amber-50 hover:bg-amber-600 border border-amber-200 hover:border-amber-500 text-amber-600 hover:text-white p-1.5 rounded transition-all"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                            </button>
                            <button 
                              onClick={() => openHistoryModal(item)}
                              title="Send History & Reset" 
                              className="bg-teal-50 hover:bg-teal-600 border border-teal-200 hover:border-teal-500 text-teal-600 hover:text-white p-1.5 rounded transition-all"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13"/><path d="l22 2-7 20-4-9-9-4Z"/></svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={10} className="p-6 text-center text-slate-400 italic">Tidak ada data tersedia untuk filter ini</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL UPDATE (Hanya Limit & User) */}
      {isUpdateModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-blue-50 border-b border-blue-100 px-4 py-3 flex justify-between items-center">
              <h3 className="font-bold text-blue-800 text-sm">Update Limit & User</h3>
              <button onClick={() => setIsUpdateModalOpen(false)} className="text-blue-400 hover:text-blue-700">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            <form onSubmit={handleUpdateSubmit} className="p-4 space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500">Main Machine:</span>
                  <span className="font-semibold text-slate-800">{selectedItem.main_machine}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500">Product Type:</span>
                  <span className="font-semibold text-slate-800">{selectedItem.product_type}</span>
                </div>
              </div>
              
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">New Lifetime Qty</label>
                <input 
                  type="number" 
                  required
                  min="1"
                  value={editLifetimeQty}
                  onChange={(e) => setEditLifetimeQty(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Updated By (User)</label>
                <input 
                  type="text"
                  value={loggedInUser || "Unknown User"}
                  disabled
                  className="w-full border border-slate-200 bg-slate-100 text-slate-500 rounded-md px-3 py-2 text-sm cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5 pt-2 relative" ref={userDropdownRef}>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Assign User Teknisi</label>
                <input 
                  type="text"
                  value={editUserTeknisi}
                  onChange={(e) => {
                    setEditUserTeknisi(e.target.value);
                    setIsUserDropdownOpen(true);
                  }}
                  onFocus={() => setIsUserDropdownOpen(true)}
                  placeholder="Search and select user teknisi..."
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  autoComplete="off"
                />
                
                {isUserDropdownOpen && (
                  <ul className="absolute z-10 w-full bg-white border border-slate-200 mt-1 max-h-40 overflow-y-auto rounded-md shadow-lg divide-y divide-slate-100">
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((u) => (
                        <li 
                          key={u.id} 
                          onClick={() => {
                            setEditUserTeknisi(u.name);
                            setIsUserDropdownOpen(false);
                          }}
                          className="px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer transition-colors"
                        >
                          {u.name}
                        </li>
                      ))
                    ) : (
                      <li className="px-3 py-2 text-sm text-slate-400 italic text-center">
                        User tidak ditemukan
                      </li>
                    )}
                  </ul>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsUpdateModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isUpdating}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isUpdating ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SEND HISTORY & RESET */}
      {isHistoryModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-100 rounded-xl shadow-2xl w-full max-w-7xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-6 border border-slate-300">
            
            {/* Header Modal */}
            <div className="bg-teal-700 border-b border-teal-800 px-6 py-3 flex justify-between items-center text-white sticky top-0 z-20">
              <h3 className="font-bold text-base flex items-center gap-2 tracking-wide uppercase">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13"/><path d="l22 2-7 20-4-9-9-4Z"/></svg>
                Send Maintenance History & Action Report
              </h3>
              <button 
                onClick={() => setIsHistoryModalOpen(false)} 
                className="text-teal-200 hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            
            <form onSubmit={handleHistorySubmit} className="p-6">
              {/* Layout 3 Card Utama */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* ================= CARD 1: INFORMASI DETAIL ================= */}
                <div className="bg-white rounded-lg border border-slate-300 shadow-sm p-5 space-y-4 flex flex-col justify-between">
                  <div>
                    <div className="border-b border-slate-200 pb-2 mb-4">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        1. Selected Row Information
                      </h4>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase">ID</span>
                        <p className="font-mono font-semibold text-slate-800 text-sm">{selectedItem.id}</p>
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase">Main Machine</span>
                        <p className="font-semibold text-slate-800">{selectedItem.main_machine || '-'}</p>
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase">Product Type</span>
                        <p className="font-semibold text-teal-700">{selectedItem.product_type || '-'}</p>
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase">Status</span>
                        <span className={`inline-block px-2 py-0.5 mt-1 text-[10px] font-bold rounded uppercase ${
                          getPartStatus(getActualOngoingQty(selectedItem), selectedItem.lifetime_qty) === 'danger' 
                            ? 'bg-rose-100 text-rose-700' 
                            : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {getPartStatus(getActualOngoingQty(selectedItem), selectedItem.lifetime_qty)}
                        </span>
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase">Ongoing Qty</span>
                        <p className="font-semibold text-slate-800">
                          {getActualOngoingQty(selectedItem).toLocaleString()} / {selectedItem.lifetime_qty?.toLocaleString()}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                          <span className="block text-[10px] font-bold text-slate-400 uppercase">User</span>
                          <p className="font-medium text-slate-700">{selectedItem.user || '-'}</p>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                          <span className="block text-[10px] font-bold text-slate-400 uppercase">User Teknisi</span>
                          <p className="font-medium text-slate-700">{selectedItem.user_teknisi || '-'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-[10px] text-slate-400 italic text-right border-t border-slate-100 pt-2">
                    Source: /api/upin/lifetime_monitoring
                  </div>
                </div>

                {/* ================= CARD 2: MAINTENANCE ACTION FORM ================= */}
                <div className="bg-white rounded-lg border border-slate-300 shadow-sm p-5 space-y-4">
                  <div className="border-b border-slate-200 pb-2">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      2. Maintenance Action & Form
                    </h4>
                  </div>

                  <div className="space-y-3 text-xs">
                    {/* User Teknisi (Freeze / Read-Only) */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">User Teknisi (Freeze)</label>
                      <input
                        type="text"
                        value={selectedItem.user_teknisi || loggedInUser || ''}
                        disabled
                        className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded font-semibold text-slate-500 cursor-not-allowed"
                      />
                    </div>

                    {/* Reset Ongoing Qty Logic & Field */}
                    <div className="p-3 bg-rose-50/70 border border-rose-200 rounded space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          name="resetQty"
                          checked={historyForm.resetQty}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            setHistoryForm((prev: any) => ({
                              ...prev,
                              resetQty: isChecked,
                              last_reset_qty: isChecked ? getActualOngoingQty(selectedItem) : 0,
                            }));
                          }}
                          className="w-4 h-4 text-rose-600 rounded border-rose-300 focus:ring-rose-500"
                        />
                        <span className="font-bold text-rose-800">Reset Ongoing Qty to 0</span>
                      </label>

                      {historyForm.resetQty && (
                        <div>
                          <label className="block text-[10px] font-bold text-rose-700 uppercase">Last Reset Qty Captured</label>
                          <input
                            type="number"
                            readOnly
                            value={historyForm.last_reset_qty}
                            className="w-full px-2 py-1.5 bg-white border border-rose-300 rounded font-mono font-bold text-rose-700"
                          />
                        </div>
                      )}
                    </div>

                    {/* Dropdown Category Broken */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Category Broken</label>
                      <select
                        value={historyForm.category_broken || ''}
                        onChange={(e) => setHistoryForm({ ...historyForm, category_broken: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      >
                        <option value="">-- Pilih Kategori --</option>
                        <option value="Pecah">Pecah</option>
                        <option value="Crack">Crack</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </div>

                    {/* Remark */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Remark (General Comment)</label>
                      <textarea
                        rows={4}
                        value={historyForm.remark || ''}
                        onChange={(e) => setHistoryForm({ ...historyForm, remark: e.target.value })}
                        placeholder="Tambahkan catatan perbaikan di sini..."
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      ></textarea>
                    </div>
                  </div>
                </div>

                {/* ================= CARD 3: DOCUMENTATION & UPLOAD (SEMENTARA DINONAKTIFKAN) ================= */}
                <div className="bg-white rounded-lg border border-slate-300 shadow-sm p-5 space-y-4 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        3. Picture Documentation
                      </h4>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-500 uppercase tracking-wider">
                        Sementara Dinonaktifkan
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 italic -mt-2">
                      Upload gambar belum terhubung ke server. Field ini akan diaktifkan kembali
                      setelah sinkronisasi data utama selesai.
                    </p>

                    {/* Bucket Picture Before (1 - 5) */}
                    <div className="space-y-2 opacity-50 pointer-events-none select-none">
                      <label className="block text-[11px] font-bold text-slate-600 uppercase">
                        Bucket Picture Before (1-5)
                      </label>
                      <div className="grid grid-cols-5 gap-1.5">
                        {[1, 2, 3, 4, 5].map((index) => {
                          const fieldKey = `bucket_picture${index}`;
                          const fileVal = historyForm[fieldKey];
                          const imageSrc = fileVal?.preview || (typeof fileVal === 'string' ? fileVal : null);
                          
                          return (
                            <div key={fieldKey} className="relative group aspect-square border border-slate-300 rounded bg-slate-50 flex flex-col items-center justify-center overflow-hidden">
                              {imageSrc ? (
                                <img
                                  src={imageSrc}
                                  alt={`Before ${index}`}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-[10px] text-slate-400 font-bold">{index}</span>
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                disabled
                                onChange={(e) => handleImageUpload(e, fieldKey)}
                                className="absolute inset-0 opacity-0 cursor-not-allowed"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Bucket Picture After (1 - 5) */}
                    <div className="space-y-2 opacity-50 pointer-events-none select-none">
                      <label className="block text-[11px] font-bold text-teal-700 uppercase">
                        Bucket Picture After (1-5)
                      </label>
                      <div className="grid grid-cols-5 gap-1.5">
                        {[1, 2, 3, 4, 5].map((index) => {
                          const fieldKey = `bucket_picture${index}_after`;
                          const fileVal = historyForm[fieldKey];
                          const imageSrc = fileVal?.preview || (typeof fileVal === 'string' ? fileVal : null);

                          return (
                            <div key={fieldKey} className="relative group aspect-square border border-teal-200 rounded bg-teal-50/50 flex flex-col items-center justify-center overflow-hidden">
                              {imageSrc ? (
                                <img
                                  src={imageSrc}
                                  alt={`After ${index}`}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-[10px] text-teal-600 font-bold">{index}</span>
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                disabled
                                onChange={(e) => handleImageUpload(e, fieldKey)}
                                className="absolute inset-0 opacity-0 cursor-not-allowed"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons Submit & Cancel */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 mt-4">
                    <button
                      type="button"
                      onClick={() => setIsHistoryModalOpen(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-200 hover:bg-slate-300 rounded-md transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingHistory}
                      className="px-5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-md transition-colors shadow disabled:opacity-50 flex items-center gap-2"
                    >
                      {isSubmittingHistory ? 'Submitting...' : 'Submit History'}
                    </button>
                  </div>
                </div>

              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETAILS */}
      {isDetailsModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-amber-50 border-b border-amber-100 px-4 py-3 flex justify-between items-center">
              <h3 className="font-bold text-amber-800 text-sm">Part Details Information</h3>
              <button onClick={() => setIsDetailsModalOpen(false)} className="text-amber-400 hover:text-amber-700">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ID</span>
                  <p className="font-semibold text-slate-800">{selectedItem.id}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Main Machine</span>
                  <p className="font-semibold text-slate-800">{selectedItem.main_machine}</p>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Product Type</span>
                  <p className="font-semibold text-teal-700">{selectedItem.product_type}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</span>
                  <p className="font-semibold text-slate-800 uppercase">{getPartStatus(getActualOngoingQty(selectedItem), selectedItem.lifetime_qty)}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ongoing Qty (UI)</span>
                  <p className="font-semibold text-slate-800">{getActualOngoingQty(selectedItem).toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lifetime Qty</span>
                  <p className="font-semibold text-slate-800">{selectedItem.lifetime_qty.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Raw Qty (Cronjob)</span>
                  <p className="font-semibold text-slate-500">{selectedItem.ongoing_qty.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last Reset Qty</span>
                  <p className="font-semibold text-slate-800">{selectedItem.last_reset_qty !== null ? selectedItem.last_reset_qty.toLocaleString() : "-"}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Submit Date</span>
                  <p className="font-semibold text-slate-800">{selectedItem.submit_at ? new Date(selectedItem.submit_at).toLocaleString() : "-"}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Updated At</span>
                  <p className="font-semibold text-slate-800">{selectedItem.updated_at ? new Date(selectedItem.updated_at).toLocaleString() : "-"}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">User</span>
                  <p className="font-semibold text-slate-800">{selectedItem.user || "-"}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">User Teknisi</span>
                  <p className="font-semibold text-slate-800">{selectedItem.user_teknisi || "-"}</p>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button 
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-white bg-slate-800 hover:bg-slate-900 rounded-md transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}