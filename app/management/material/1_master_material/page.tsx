"use client";

import React, { useState, useEffect, useCallback } from "react";

// Tipe Data Master Material berdasarkan PostgreSQL Table
interface MasterMaterial {
  id: number;
  part_number: string;
  description: string;
  technical_specification: string;
  qty: number;
  unit: string;
  margin: number;
  price: number;
  price_margin?: number;
  supplier: string;
  markup: number;
  date_updated?: string;
}

// Icon Components
const MaterialIcon = () => (
  <div className="flex items-center justify-center w-10 h-10 bg-teal-500/10 border border-teal-500/20 rounded">
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  </div>
);

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const InitialFormState: Omit<MasterMaterial, "id"> = {
  part_number: "",
  description: "",
  technical_specification: "",
  qty: 0,
  unit: "Pcs",
  margin: 0,
  price: 0,
  supplier: "",
  markup: 0,
};

export default function MasterMaterialPage() {
  const [materials, setMaterials] = useState<MasterMaterial[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Omit<MasterMaterial, "id">>(InitialFormState);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Delete Modal State
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // 1. Fetch Data dari API
  const fetchMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const url = search
        ? `/api/management/master_material?search=${encodeURIComponent(search)}`
        : `/api/management/master_material`;
      const res = await fetch(url);
      const json = await res.json();
      if (res.ok) {
        setMaterials(json.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch materials:", err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMaterials();
    }, 300); // Debounce search
    return () => clearTimeout(timer);
  }, [fetchMaterials]);

  // Helper untuk Memproses URL / Teks pada Kolom Supplier
  const renderSupplierCell = (supplierStr: string) => {
    if (!supplierStr) return "-";

    const isUrl = /^https?:\/\//i.test(supplierStr.trim());

    if (isUrl) {
      try {
        const urlObj = new URL(supplierStr.trim());
        // Ekstrak ID atau teks pendek (5-10 karakter)
        const pathSegments = urlObj.pathname.split("/").filter(Boolean);
        const lastSegment = pathSegments[pathSegments.length - 1] || "link";
        // Ambil 5-8 karakter dari hash atau segment
        const shortCode = lastSegment.replace(/[^a-zA-Z0-9]/g, "").slice(-6) || "link";
        
        // Tampilan label ringkas
        const displayLabel = `Link [${shortCode}]`;

        return (
          <a
            href={supplierStr}
            target="_blank"
            rel="noopener noreferrer"
            title={supplierStr}
            className="inline-flex items-center gap-1 text-teal-400 hover:text-teal-300 underline underline-offset-2 font-mono text-[11px]"
          >
            <span>{displayLabel}</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        );
      } catch {
        return supplierStr.length > 10 ? `${supplierStr.substring(0, 10)}...` : supplierStr;
      }
    }

    return <span title={supplierStr}>{supplierStr.length > 15 ? `${supplierStr.substring(0, 15)}...` : supplierStr}</span>;
  };

  // Handle Form Change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? parseFloat(value) || 0 : value,
    }));
  };

  // Open Modal Add
  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormData(InitialFormState);
    setErrorMessage("");
    setIsModalOpen(true);
  };

  // Open Modal Edit
  const handleOpenEditModal = (material: MasterMaterial) => {
    setEditingId(material.id);
    setFormData({
      part_number: material.part_number,
      description: material.description || "",
      technical_specification: material.technical_specification || "",
      qty: material.qty,
      unit: material.unit || "Pcs",
      margin: material.margin,
      price: material.price,
      supplier: material.supplier || "",
      markup: material.markup,
    });
    setErrorMessage("");
    setIsModalOpen(true);
  };

  // Save / Update Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const isEdit = editingId !== null;
      const url = isEdit
        ? `/api/management/master_material?id=${editingId}`
        : `/api/management/master_material`;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || "Gagal menyimpan data");
      }

      setIsModalOpen(false);
      fetchMaterials();
    } catch (err: any) {
      setErrorMessage(err.message || "Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Handler
  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      const res = await fetch(`/api/management/master_material?id=${deletingId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setDeletingId(null);
        fetchMaterials();
      } else {
        const json = await res.json();
        alert(json.message || "Gagal menghapus material");
      }
    } catch (err) {
      console.error("Failed to delete material:", err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-teal-500/30 p-3 md:p-6 flex flex-col gap-4 md:gap-6 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <header className="bg-slate-900 border border-slate-800 rounded shadow-xl px-4 md:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <MaterialIcon />
          <div>
            <h1 className="text-sm md:text-md font-bold tracking-wider text-slate-200 uppercase">Master Material Management</h1>
            <p className="text-[11px] md:text-xs font-mono text-slate-500 mt-0.5">Kelola inventaris suku cadang dan material produksi</p>
          </div>
        </div>

        {/* Action Button Add */}
        <button
          onClick={handleOpenAddModal}
          className="flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold font-mono text-xs uppercase px-4 py-2.5 rounded transition-colors shadow-lg shadow-teal-500/10 w-full sm:w-auto"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
          </svg>
          Add New Material
        </button>
      </header>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-slate-900 border border-slate-800 rounded shadow-xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <SearchIcon />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Part Number / Description..."
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-teal-500/50 transition-colors"
          />
        </div>
        <div className="text-xs font-mono text-slate-400 w-full sm:w-auto text-right">
          Total Items: <span className="text-teal-400 font-bold">{materials.length}</span>
        </div>
      </div>

      {/* MAIN TABLE SECTION WITH MOBILE SLIDER */}
      <div className="bg-slate-900 border border-slate-800 rounded shadow-xl overflow-hidden">
        
        {/* Banner Petunjuk Swipe Mobile */}
        <div className="md:hidden bg-slate-950/80 px-4 py-1.5 border-b border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <span>← Geser tabel ke kanan/kiri →</span>
          <span className="text-teal-400 font-semibold">Mobile Scroll</span>
        </div>

        {/* Outer Scroll Container */}
        <div className="overflow-x-auto touch-pan-x w-full">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider">
                <th className="p-3">Part Number</th>
                <th className="p-3">Description</th>
                <th className="p-3">Tech Spec</th>
                <th className="p-3 text-right">Qty</th>
                <th className="p-3">Unit</th>
                <th className="p-3 text-right">Price</th>
                <th className="p-3 text-right">Margin (%)</th>
                <th className="p-3 text-right">Price Margin</th>
                <th className="p-3 text-right">Markup</th>
                <th className="p-3 max-w-[120px]">Supplier</th>
                <th className="p-3">Updated</th>
                {/* Kolom Action dibuat Sticky di Mobile */}
                <th className="p-3 text-center sticky right-0 bg-slate-950/95 backdrop-blur-md shadow-l border-l border-slate-800/80 z-10 w-[90px]">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono text-xs">
              {loading ? (
                <tr>
                  <td colSpan={12} className="text-center py-8 text-slate-500 font-mono">
                    Loading material data...
                  </td>
                </tr>
              ) : materials.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-8 text-slate-500 font-mono">
                    Data material tidak ditemukan.
                  </td>
                </tr>
              ) : (
                materials.map((mat) => {
                  const calculatedPriceMargin = mat.price_margin ?? (mat.price + (mat.price * mat.margin) / 100);
                  return (
                    <tr key={mat.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-bold text-teal-400 whitespace-nowrap">{mat.part_number}</td>
                      <td className="p-3 text-slate-200 min-w-[140px] max-w-[200px] truncate" title={mat.description}>
                        {mat.description || "-"}
                      </td>
                      <td className="p-3 text-slate-400 text-[11px] max-w-[180px] truncate" title={mat.technical_specification}>
                        {mat.technical_specification || "-"}
                      </td>
                      <td className="p-3 text-right text-slate-200">{mat.qty}</td>
                      <td className="p-3 text-slate-400">{mat.unit || "-"}</td>
                      <td className="p-3 text-right text-slate-200 whitespace-nowrap">
                        {mat.price.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })}
                      </td>
                      <td className="p-3 text-right text-amber-400">{mat.margin}%</td>
                      <td className="p-3 text-right text-teal-300 font-semibold whitespace-nowrap">
                        {calculatedPriceMargin.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })}
                      </td>
                      <td className="p-3 text-right text-slate-300 whitespace-nowrap">
                        {mat.markup.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })}
                      </td>
                      
                      {/* Sel Supplier dengan penanganan Short URL */}
                      <td className="p-3 text-slate-300 whitespace-nowrap max-w-[120px] truncate">
                        {renderSupplierCell(mat.supplier)}
                      </td>

                      <td className="p-3 text-[10px] text-slate-500 whitespace-nowrap">
                        {mat.date_updated ? new Date(mat.date_updated).toLocaleDateString("id-ID") : "-"}
                      </td>

                      {/* Sel Action Sticky Right */}
                      <td className="p-3 text-center sticky right-0 bg-slate-900/95 backdrop-blur-md border-l border-slate-800/80 z-10">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(mat)}
                            className="p-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded hover:bg-amber-500/20 transition-colors"
                            title="Edit Material"
                          >
                            <EditIcon />
                          </button>
                          <button
                            onClick={() => setDeletingId(mat.id)}
                            className="p-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded hover:bg-rose-500/20 transition-colors"
                            title="Delete Material"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL ADD / EDIT MATERIAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center sticky top-0 bg-slate-900 z-10">
              <h3 className="text-sm font-bold font-mono text-teal-400 uppercase tracking-wider">
                {editingId !== null ? "Edit Material" : "Add New Material"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-500 hover:text-slate-300 font-mono text-lg"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 font-mono text-xs">
              {errorMessage && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded">
                  {errorMessage}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Part Number */}
                <div className="space-y-1">
                  <label className="text-slate-400 text-[10px] uppercase font-bold">Part Number *</label>
                  <input
                    type="text"
                    name="part_number"
                    required
                    value={formData.part_number}
                    onChange={handleInputChange}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-slate-200 focus:outline-none focus:border-teal-500/50"
                  />
                </div>

                {/* Supplier */}
                <div className="space-y-1">
                  <label className="text-slate-400 text-[10px] uppercase font-bold">Supplier / URL</label>
                  <input
                    type="text"
                    name="supplier"
                    value={formData.supplier}
                    onChange={handleInputChange}
                    placeholder="Nama Toko atau Paste URL Link..."
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-slate-200 focus:outline-none focus:border-teal-500/50"
                  />
                </div>

                {/* Qty */}
                <div className="space-y-1">
                  <label className="text-slate-400 text-[10px] uppercase font-bold">Qty</label>
                  <input
                    type="number"
                    name="qty"
                    value={formData.qty}
                    onChange={handleInputChange}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-slate-200 focus:outline-none focus:border-teal-500/50"
                  />
                </div>

                {/* Unit */}
                <div className="space-y-1">
                  <label className="text-slate-400 text-[10px] uppercase font-bold">Unit</label>
                  <input
                    type="text"
                    name="unit"
                    value={formData.unit}
                    onChange={handleInputChange}
                    placeholder="Pcs, Box, Meter, dll."
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-slate-200 focus:outline-none focus:border-teal-500/50"
                  />
                </div>

                {/* Price */}
                <div className="space-y-1">
                  <label className="text-slate-400 text-[10px] uppercase font-bold">Base Price (Rp)</label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-slate-200 focus:outline-none focus:border-teal-500/50"
                  />
                </div>

                {/* Margin */}
                <div className="space-y-1">
                  <label className="text-slate-400 text-[10px] uppercase font-bold">Margin (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="margin"
                    value={formData.margin}
                    onChange={handleInputChange}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-slate-200 focus:outline-none focus:border-teal-500/50"
                  />
                </div>

                {/* Markup */}
                <div className="space-y-1 md:col-span-2">
                  <label className="text-slate-400 text-[10px] uppercase font-bold">Markup (Rp)</label>
                  <input
                    type="number"
                    name="markup"
                    value={formData.markup}
                    onChange={handleInputChange}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-slate-200 focus:outline-none focus:border-teal-500/50"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1 md:col-span-2">
                  <label className="text-slate-400 text-[10px] uppercase font-bold">Description</label>
                  <textarea
                    name="description"
                    rows={2}
                    value={formData.description}
                    onChange={handleInputChange}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-slate-200 focus:outline-none focus:border-teal-500/50"
                  />
                </div>

                {/* Technical Specification */}
                <div className="space-y-1 md:col-span-2">
                  <label className="text-slate-400 text-[10px] uppercase font-bold">Technical Specification</label>
                  <textarea
                    name="technical_specification"
                    rows={3}
                    value={formData.technical_specification}
                    onChange={handleInputChange}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-slate-200 focus:outline-none focus:border-teal-500/50"
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : "Save Material"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deletingId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-2xl w-full max-w-md p-6 space-y-4 font-mono">
            <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wider">Confirm Delete</h3>
            <p className="text-xs text-slate-300">
              Apakah Anda yakin ingin menghapus material dengan ID: <span className="text-amber-400 font-bold">#{deletingId}</span>? Actions ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold text-xs rounded transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}