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
      const res = await fetch("/api/machine_press_summary", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchPlans();
        resetForm();
      } else {
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
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-teal-500 font-mono font-bold tracking-widest uppercase text-xs">
          <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading PPIC Dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-teal-500/30 p-4 md:p-6 flex flex-col gap-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <header className="bg-slate-900 border border-slate-800 rounded shadow-xl px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-md font-bold tracking-wider text-slate-200 uppercase">PPIC Production Plan</h2>
            <p className="text-xs font-mono text-slate-500 mt-0.5">
              Manage and monitor production targets vs actual output.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-950 border border-slate-800 px-3 py-1.5 rounded">
          <span className="relative flex h-2 w-2">
            {syncing ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-500"></span>
            )}
          </span>
          <span className={syncing ? "text-teal-400" : "text-slate-500"}>
            {syncing ? "Syncing Actual Data..." : "Auto-sync Active (10s)"}
          </span>
        </div>
      </header>

      {/* Form Section */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded shadow-xl">
        <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider font-mono border-b border-slate-800 pb-3 mb-4">
          {isEditing ? "Edit Production Plan" : "Create New Production Plan"}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Machine No */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Machine No</label>
              <select 
                name="machine_no" 
                value={formData.machine_no} 
                onChange={handleInputChange}
                required
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded px-3 py-2 focus:outline-none focus:border-teal-500 font-mono transition-colors"
              >
                {DUMMY_MACHINES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            {/* Product Name */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Product Name</label>
              <input 
                type="text" 
                name="product_name" 
                list="product-list"
                value={formData.product_name} 
                onChange={handleInputChange}
                placeholder="Search or type product..."
                required
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded px-3 py-2 focus:outline-none focus:border-teal-500 font-mono transition-colors"
              />
              <datalist id="product-list">
                {DUMMY_PRODUCTS.map(p => <option key={p} value={p} />)}
              </datalist>
            </div>

            {/* Production Date */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Production Date</label>
              <input 
                type="date" 
                name="production_date" 
                value={formData.production_date} 
                onChange={handleInputChange}
                required
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded px-3 py-2 focus:outline-none focus:border-teal-500 font-mono transition-colors [color-scheme:dark]"
              />
            </div>

            {/* User (PPIC/PIC) */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">PIC / User</label>
              <select 
                name="user" 
                value={formData.user} 
                onChange={handleInputChange}
                required
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded px-3 py-2 focus:outline-none focus:border-teal-500 font-mono transition-colors"
              >
                {users.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>

            {/* Demand Sales Qty */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Demand Sales Qty</label>
              <input 
                type="number" 
                name="demand_sales_qty" 
                value={formData.demand_sales_qty} 
                onChange={handleInputChange}
                min="0"
                required
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded px-3 py-2 focus:outline-none focus:border-teal-500 font-mono transition-colors"
              />
            </div>

            {/* Production Target Qty */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Target Qty</label>
              <input 
                type="number" 
                name="production_qty_target" 
                value={formData.production_qty_target} 
                onChange={handleInputChange}
                min="0"
                required
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded px-3 py-2 focus:outline-none focus:border-teal-500 font-mono transition-colors"
              />
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Status</label>
              <select 
                name="status" 
                value={formData.status} 
                onChange={handleInputChange}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded px-3 py-2 focus:outline-none focus:border-teal-500 font-mono transition-colors"
              >
                <option value="Planned">Planned</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800 mt-4">
            {isEditing && (
              <button 
                type="button" 
                onClick={resetForm}
                className="px-4 py-1.5 text-xs font-bold text-slate-400 bg-slate-950 border border-slate-800 rounded hover:bg-slate-800 hover:text-slate-200 transition-colors font-mono uppercase tracking-wider"
              >
                Cancel
              </button>
            )}
            <button 
              type="submit"
              className="px-6 py-1.5 text-xs font-bold text-white bg-teal-600 rounded hover:bg-teal-500 transition-colors font-mono uppercase tracking-wider"
            >
              {isEditing ? "Update Plan" : "Save Plan"}
            </button>
          </div>
        </form>
      </div>

      {/* Table Section */}
      <div className="bg-slate-900 border border-slate-800 rounded shadow-xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/20">
          <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider font-mono">Production Plan List</h3>
          <button onClick={fetchPlans} className="text-[10px] font-bold text-slate-400 hover:text-teal-400 transition-colors font-mono uppercase tracking-wider flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            Refresh Data
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono whitespace-nowrap">
            <thead className="bg-slate-950/50 text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Machine</th>
                <th className="px-4 py-3 font-semibold">Product</th>
                <th className="px-4 py-3 font-semibold text-right">Demand</th>
                <th className="px-4 py-3 font-semibold text-right">Target</th>
                <th className="px-4 py-3 font-semibold text-right text-teal-400">Actual</th>
                <th className="px-4 py-3 font-semibold text-center">Status</th>
                <th className="px-4 py-3 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-slate-300">
              {plans.length > 0 ? (
                plans.map((plan) => {
                  const progress = plan.production_qty_target > 0 
                    ? Math.min(100, Math.round((plan.production_qty_actual / plan.production_qty_target) * 100)) 
                    : 0;

                  return (
                    <tr key={plan.id} className="hover:bg-slate-950/30 transition-colors">
                      <td className="px-4 py-3 text-slate-400">{plan.production_date}</td>
                      <td className="px-4 py-3 font-semibold text-slate-200">{plan.machine_no}</td>
                      <td className="px-4 py-3">{plan.product_name}</td>
                      <td className="px-4 py-3 text-right">{plan.demand_sales_qty}</td>
                      <td className="px-4 py-3 text-right">{plan.production_qty_target}</td>
                      <td className="px-4 py-3 text-right font-bold text-teal-400">
                        {plan.production_qty_actual}
                        <div className="w-full bg-slate-800 h-1 mt-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${progress >= 100 ? 'bg-teal-500' : 'bg-teal-400'}`} 
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 text-[9px] font-bold uppercase tracking-wider rounded ${
                          plan.status === 'Completed' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' :
                          plan.status === 'In Progress' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          'bg-slate-800/50 text-slate-400 border border-slate-700'
                        }`}>
                          {plan.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center space-x-1">
                        <button 
                          onClick={() => handleEdit(plan)}
                          className="text-slate-400 hover:text-teal-400 transition-colors p-1.5 hover:bg-slate-800 rounded"
                          title="Edit"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                        </button>
                        <button 
                          onClick={() => handleDelete(plan.id!)}
                          className="text-slate-400 hover:text-rose-500 transition-colors p-1.5 hover:bg-slate-800 rounded"
                          title="Delete"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500 italic">
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
