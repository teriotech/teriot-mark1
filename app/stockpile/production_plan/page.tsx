"use client";

import React, { useState, useEffect, useCallback } from "react";

// Tipe Data
interface ProductionPlan {
  id?: number;
  timestamp?: string;
  machine_no: string;
  product_name: string;
  production_date: string;
  user: string;
  demand_sales_qty: number;
  production_qty_target: number;
  production_qty_actual: number;
  status: string;
}

interface MachinePressData {
  id: number;
  machine_no: string;
  product_name: string;
  timestamp: string;
}

// Dummy Data untuk Dropdown
const DUMMY_MACHINES = ["Press-01", "Press-02", "Press-03", "Press-04", "Press-05"];
const DUMMY_PRODUCTS = ["Cover Front A", "Panel Back B", "Bracket C", "Housing D", "Base Plate E"];

export default function PPICDashboardPage() {
  const [plans, setPlans] = useState<ProductionPlan[]>([]);
  const [users, setUsers] = useState<string[]>(["PPIC_Admin", "Operator_1", "Operator_2"]); 
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Form State
  const [formData, setFormData] = useState<ProductionPlan>({
    machine_no: DUMMY_MACHINES[0],
    product_name: "",
    production_date: new Date().toISOString().split("T")[0],
    user: "",
    demand_sales_qty: 0,
    production_qty_target: 0,
    production_qty_actual: 0,
    status: "Planned",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  // ==========================================
  // 1. FETCH INITIAL DATA
  // ==========================================
  const fetchPlans = async () => {
    try {
      // PERBAIKAN: Ubah URL ke /api/machine_press_summary
      const res = await fetch("/api/machine_press_summary");
      if (res.ok) {
        const data = await res.json();
        setPlans(data);
      }
    } catch (error) {
      console.error("Failed to fetch plans:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.map((u: any) => u.username || u.name));
        if (data.length > 0) setFormData(prev => ({ ...prev, user: data[0].username || data[0].name }));
      }
    } catch (error) {
      console.warn("Using dummy users, failed to fetch /api/users");
      setFormData(prev => ({ ...prev, user: users[0] }));
    }
  };

  useEffect(() => {
    fetchPlans();
    fetchUsers();
  }, []);

  // ==========================================
  // 2. AUTO SYNC ACTUAL QTY (Setiap 10 Detik)
  // ==========================================
  const syncActualQty = useCallback(async () => {
    if (plans.length === 0) return;
    setSyncing(true);

    try {
      const res = await fetch("/api/machine_press");
      if (!res.ok) throw new Error("Failed to fetch machine press data");
      const machineData: MachinePressData[] = await res.json();

      let hasUpdates = false;
      const updatedPlans = [...plans];

      for (let i = 0; i < updatedPlans.length; i++) {
        const plan = updatedPlans[i];
        
        const actualCount = machineData.filter((m) => {
          if (!m.timestamp) return false;
          const mDate = m.timestamp.split("T")[0]; 
          return (
            m.machine_no === plan.machine_no &&
            m.product_name === plan.product_name &&
            mDate === plan.production_date
          );
        }).length;

        if (actualCount !== plan.production_qty_actual) {
          updatedPlans[i].production_qty_actual = actualCount;
          
          if (actualCount >= plan.production_qty_target && plan.production_qty_target > 0) {
            updatedPlans[i].status = "Completed";
          } else if (actualCount > 0 && plan.status === "Planned") {
            updatedPlans[i].status = "In Progress";
          }

          hasUpdates = true;

          // PERBAIKAN: Ubah URL ke /api/machine_press_summary
          await fetch("/api/machine_press_summary", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: plan.id,
              production_qty_actual: updatedPlans[i].production_qty_actual,
              status: updatedPlans[i].status
            }),
          });
        }
      }

      if (hasUpdates) {
        setPlans(updatedPlans);
      }
    } catch (error) {
      console.error("Sync error:", error);
    } finally {
      setSyncing(false);
    }
  }, [plans]);

  useEffect(() => {
    const interval = setInterval(() => {
      syncActualQty();
    }, 10000); 

    return () => clearInterval(interval);
  }, [syncActualQty]);

  // ==========================================
  // 3. CRUD HANDLERS
  // ==========================================
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name.includes("qty") ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = isEditing ? "PUT" : "POST";
    const payload = isEditing ? { ...formData, id: editId } : formData;

    try {
      // PERBAIKAN: Ubah URL ke /api/machine_press_summary
      const res = await fetch("/api/machine_press_summary", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchPlans();
        resetForm();
      } else {
        // PERBAIKAN: Menangkap pesan error dari backend agar mudah di-debug
        const errorData = await res.json();
        alert(`Gagal menyimpan data: ${errorData.error || res.statusText}`);
        console.error("Submit error detail:", errorData);
      }
    } catch (error) {
      console.error("Submit error:", error);
      alert("Terjadi kesalahan jaringan saat menyimpan data.");
    }
  };

  const handleEdit = (plan: ProductionPlan) => {
    setFormData(plan);
    setEditId(plan.id!);
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus plan ini?")) return;
    try {
      // PERBAIKAN: Ubah URL ke /api/machine_press_summary
      const res = await fetch(`/api/machine_press_summary?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setPlans(plans.filter((p) => p.id !== id));
      } else {
        const errorData = await res.json();
        alert(`Gagal menghapus data: ${errorData.error || res.statusText}`);
      }
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      machine_no: DUMMY_MACHINES[0],
      product_name: "",
      production_date: new Date().toISOString().split("T")[0],
      user: users[0] || "",
      demand_sales_qty: 0,
      production_qty_target: 0,
      production_qty_actual: 0,
      status: "Planned",
    });
    setIsEditing(false);
    setEditId(null);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-[#00F0FF] animate-pulse font-bold tracking-widest uppercase text-sm">Loading PPIC Dashboard...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">PPIC Production Plan</h2>
          <p className="text-sm text-zinc-400 mt-1">
            Manage and monitor production targets vs actual output.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium">
          <span className="relative flex h-3 w-3">
            {syncing ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00F0FF] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#00F0FF]"></span>
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-3 w-3 bg-zinc-500"></span>
            )}
          </span>
          <span className={syncing ? "text-[#00F0FF]" : "text-zinc-500"}>
            {syncing ? "Syncing Actual Data..." : "Auto-sync Active (10s)"}
          </span>
        </div>
      </div>

      {/* Form Section */}
      <div className="bg-[#09090b] border border-white/[0.05] p-6 rounded-xl shadow-sm">
        <h3 className="text-sm font-bold text-white mb-4 border-b border-white/[0.05] pb-3">
          {isEditing ? "Edit Production Plan" : "Create New Production Plan"}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Machine No */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase">Machine No</label>
              <select 
                name="machine_no" 
                value={formData.machine_no} 
                onChange={handleInputChange}
                required
                className="w-full bg-[#09090b] border border-white/[0.1] text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:border-[#00F0FF]/50"
              >
                {DUMMY_MACHINES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            {/* Product Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase">Product Name</label>
              <input 
                type="text" 
                name="product_name" 
                list="product-list"
                value={formData.product_name} 
                onChange={handleInputChange}
                placeholder="Search or type product..."
                required
                className="w-full bg-[#09090b] border border-white/[0.1] text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:border-[#00F0FF]/50"
              />
              <datalist id="product-list">
                {DUMMY_PRODUCTS.map(p => <option key={p} value={p} />)}
              </datalist>
            </div>

            {/* Production Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase">Production Date</label>
              <input 
                type="date" 
                name="production_date" 
                value={formData.production_date} 
                onChange={handleInputChange}
                required
                className="w-full bg-[#09090b] border border-white/[0.1] text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:border-[#00F0FF]/50 [color-scheme:dark]"
              />
            </div>

            {/* User (PPIC/PIC) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase">PIC / User</label>
              <select 
                name="user" 
                value={formData.user} 
                onChange={handleInputChange}
                required
                className="w-full bg-[#09090b] border border-white/[0.1] text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:border-[#00F0FF]/50"
              >
                {users.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>

            {/* Demand Sales Qty */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase">Demand Sales Qty</label>
              <input 
                type="number" 
                name="demand_sales_qty" 
                value={formData.demand_sales_qty} 
                onChange={handleInputChange}
                min="0"
                required
                className="w-full bg-[#09090b] border border-white/[0.1] text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:border-[#00F0FF]/50"
              />
            </div>

            {/* Production Target Qty */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase">Target Qty</label>
              <input 
                type="number" 
                name="production_qty_target" 
                value={formData.production_qty_target} 
                onChange={handleInputChange}
                min="0"
                required
                className="w-full bg-[#09090b] border border-white/[0.1] text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:border-[#00F0FF]/50"
              />
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase">Status</label>
              <select 
                name="status" 
                value={formData.status} 
                onChange={handleInputChange}
                className="w-full bg-[#09090b] border border-white/[0.1] text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:border-[#00F0FF]/50"
              >
                <option value="Planned">Planned</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            {isEditing && (
              <button 
                type="button" 
                onClick={resetForm}
                className="px-4 py-2 text-sm font-medium text-zinc-300 bg-transparent border border-white/[0.1] rounded-lg hover:bg-white/[0.05] transition-colors"
              >
                Cancel
              </button>
            )}
            <button 
              type="submit"
              className="px-6 py-2 text-sm font-bold text-black bg-[#00F0FF] rounded-lg hover:bg-[#00F0FF]/80 transition-colors shadow-[0_0_15px_rgba(0,240,255,0.3)]"
            >
              {isEditing ? "Update Plan" : "Save Plan"}
            </button>
          </div>
        </form>
      </div>

      {/* Table Section */}
      <div className="bg-[#09090b] border border-white/[0.05] rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-5 border-b border-white/[0.05] flex justify-between items-center">
          <h3 className="text-sm font-bold text-white">Production Plan List</h3>
          <button onClick={fetchPlans} className="text-xs text-[#00F0FF] hover:underline">Refresh Data</button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-400 whitespace-nowrap">
            <thead className="bg-white/[0.02] text-xs uppercase text-zinc-300">
              <tr>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Machine</th>
                <th className="px-4 py-3 font-semibold">Product</th>
                <th className="px-4 py-3 font-semibold text-right">Demand</th>
                <th className="px-4 py-3 font-semibold text-right">Target</th>
                <th className="px-4 py-3 font-semibold text-right text-[#00F0FF]">Actual</th>
                <th className="px-4 py-3 font-semibold text-center">Status</th>
                <th className="px-4 py-3 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {plans.length > 0 ? (
                plans.map((plan) => {
                  const progress = plan.production_qty_target > 0 
                    ? Math.min(100, Math.round((plan.production_qty_actual / plan.production_qty_target) * 100)) 
                    : 0;

                  return (
                    <tr key={plan.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">{plan.production_date}</td>
                      <td className="px-4 py-3 font-medium text-zinc-200">{plan.machine_no}</td>
                      <td className="px-4 py-3">{plan.product_name}</td>
                      <td className="px-4 py-3 text-right">{plan.demand_sales_qty}</td>
                      <td className="px-4 py-3 text-right">{plan.production_qty_target}</td>
                      <td className="px-4 py-3 text-right font-bold text-[#00F0FF]">
                        {plan.production_qty_actual}
                        <div className="w-full bg-white/[0.1] h-1 mt-1 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${progress >= 100 ? 'bg-[#00FF66]' : 'bg-[#00F0FF]'}`} 
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md ${
                          plan.status === 'Completed' ? 'bg-[#00FF66]/10 text-[#00FF66] border border-[#00FF66]/20' :
                          plan.status === 'In Progress' ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20' :
                          'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                        }`}>
                          {plan.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center space-x-2">
                        <button 
                          onClick={() => handleEdit(plan)}
                          className="text-zinc-400 hover:text-[#00F0FF] transition-colors"
                          title="Edit"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                        </button>
                        <button 
                          onClick={() => handleDelete(plan.id!)}
                          className="text-zinc-400 hover:text-rose-500 transition-colors"
                          title="Delete"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                    Belum ada data Production Plan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}