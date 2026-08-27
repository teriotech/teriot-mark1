"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";

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

// Tipe Data khusus untuk Form agar bisa menerima string kosong ("") pada input number
interface MaterialFormData {
  part_number: string;
  description: string;
  technical_specification: string;
  qty: number | "";
  unit: string;
  margin: number | "";
  price: number | "";
  supplier: string;
  markup: number | "";
}

// Icon Components
const MaterialIcon = () => (
  <div className="flex items-center justify-center w-10 h-10 bg-teal-50 border border-teal-200 rounded">
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  </div>
);

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

const InitialFormState: MaterialFormData = {
  part_number: "",
  description: "",
  technical_specification: "",
  qty: "",
  unit: "Pcs",
  margin: "",
  price: "",
  supplier: "",
  markup: "",
};

export default function MasterMaterialPage() {
  const [materials, setMaterials] = useState<MasterMaterial[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<MaterialFormData>(InitialFormState);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Dropdown States
  const [showDescDropdown, setShowDescDropdown] = useState<boolean>(false);
  const [showUnitDropdown, setShowUnitDropdown] = useState<boolean>(false);

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

  // Mendapatkan daftar description unik untuk dropdown
  const uniqueDescriptions = useMemo(() => {
    const descs = materials.map((m) => m.description).filter(Boolean);
    return Array.from(new Set(descs));
  }, [materials]);

  // Mendapatkan daftar unit unik untuk dropdown
  const uniqueUnits = useMemo(() => {
    const units = materials.map((m) => m.unit).filter(Boolean);
    return Array.from(new Set(units));
  }, [materials]);

  // Fungsi Auto Generate Part Number
  const generatePartNumber = (desc: string) => {
    if (!desc || desc.length < 3) return "";
    
    const prefix = desc.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
    
    const existingNumbers = materials
      .filter((m) => m.part_number.startsWith(`${prefix}-`))
      .map((m) => {
        const parts = m.part_number.split("-");
        return parseInt(parts[1]) || 0;
      });

    const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    const nextNumber = (maxNumber + 1).toString().padStart(3, "0");
    
    return `${prefix}-${nextNumber}`;
  };

  // Handle Description Change (Untuk Dropdown & Auto Generate)
  const handleDescriptionChange = (value: string) => {
    const newPartNumber = editingId === null ? generatePartNumber(value) : formData.part_number;
    
    setFormData((prev) => ({
      ...prev,
      description: value,
      part_number: newPartNumber || prev.part_number,
    }));
  };

  // Helper untuk Memproses URL / Teks pada Kolom Supplier
  const renderSupplierCell = (supplierStr: string) => {
    if (!supplierStr) return "-";
    const isUrl = /^https?:\/\//i.test(supplierStr.trim());

    if (isUrl) {
      try {
        const urlObj = new URL(supplierStr.trim());
        const pathSegments = urlObj.pathname.split("/").filter(Boolean);
        const lastSegment = pathSegments[pathSegments.length - 1] || "link";
        const shortCode = lastSegment.replace(/[^a-zA-Z0-9]/g, "").slice(-6) || "link";
        const displayLabel = `Link [${shortCode}]`;

        return (
          <a
            href={supplierStr}
            target="_blank"
            rel="noopener noreferrer"
            title={supplierStr}
            className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-700 underline underline-offset-2 font-mono text-[11px]"
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

  // Handle Form Change & Auto Calculate Markup
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    // Jika input number kosong, set sebagai string kosong ("") agar placeholder muncul
    const parsedValue = type === "number" ? (value === "" ? "" : parseFloat(value)) : value;

    setFormData((prev) => {
      const newData = { ...prev, [name]: parsedValue };

      // Kalkulasi otomatis Markup: Base Price (100%) + (Base Price * Margin %)
      if (name === "price" || name === "margin") {
        const p = Number(newData.price) || 0;
        const m = Number(newData.margin) || 0;
        newData.markup = p + (p * m) / 100;
      }

      return newData;
    });
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
      qty: material.qty ?? "",
      unit: material.unit || "Pcs",
      margin: material.margin ?? "",
      price: material.price ?? "",
      supplier: material.supplier || "",
      markup: material.markup ?? "",
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

      // Pastikan nilai kosong ("") dikonversi menjadi 0 sebelum dikirim ke API
      const payload = {
        ...formData,
        qty: Number(formData.qty) || 0,
        margin: Number(formData.margin) || 0,
        price: Number(formData.price) || 0,
        markup: Number(formData.markup) || 0,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-teal-500/30 p-3 md:p-6 flex flex-col gap-4 md:gap-6 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <header className="bg-white border border-slate-200 rounded shadow-sm px-4 md:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <MaterialIcon />
          <div>
            <h1 className="text-sm md:text-md font-bold tracking-wider text-slate-800 uppercase">Master Material Management</h1>
            <p className="text-[11px] md:text-xs font-mono text-slate-500 mt-0.5">Kelola inventaris suku cadang dan material produksi</p>
          </div>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold font-mono text-xs uppercase px-4 py-2.5 rounded transition-colors shadow-md shadow-teal-500/20 w-full sm:w-auto"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
          </svg>
          Add New Material
        </button>
      </header>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white border border-slate-200 rounded shadow-sm p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <SearchIcon />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Part Number / Description..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded font-mono text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
          />
        </div>
        <div className="text-xs font-mono text-slate-500 w-full sm:w-auto text-right">
          Total Items: <span className="text-teal-600 font-bold">{materials.length}</span>
        </div>
      </div>

      {/* MAIN TABLE SECTION */}
      <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
        <div className="md:hidden bg-slate-50/80 px-4 py-1.5 border-b border-slate-200 flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <span>← Geser tabel ke kanan/kiri →</span>
          <span className="text-teal-600 font-semibold">Mobile Scroll</span>
        </div>

        <div className="overflow-x-auto touch-pan-x w-full">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-mono uppercase font-bold text-slate-600 tracking-wider">
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
                <th className="p-3 text-center sticky right-0 bg-slate-50/95 backdrop-blur-md shadow-l border-l border-slate-200 z-10 w-[90px]">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono text-xs">
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
                    <tr key={mat.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-bold text-teal-600 whitespace-nowrap">{mat.part_number}</td>
                      <td className="p-3 text-slate-800 min-w-[140px] max-w-[200px] truncate" title={mat.description}>
                        {mat.description || "-"}
                      </td>
                      <td className="p-3 text-slate-500 text-[11px] max-w-[180px] truncate" title={mat.technical_specification}>
                        {mat.technical_specification || "-"}
                      </td>
                      <td className="p-3 text-right text-slate-800">{mat.qty}</td>
                      <td className="p-3 text-slate-600">{mat.unit || "-"}</td>
                      <td className="p-3 text-right text-slate-800 whitespace-nowrap">
                        {mat.price.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })}
                      </td>
                      <td className="p-3 text-right text-amber-600">{mat.margin}%</td>
                      <td className="p-3 text-right text-teal-600 font-semibold whitespace-nowrap">
                        {calculatedPriceMargin.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })}
                      </td>
                      <td className="p-3 text-right text-slate-700 whitespace-nowrap">
                        {mat.markup.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })}
                      </td>
                      <td className="p-3 text-slate-700 whitespace-nowrap max-w-[120px] truncate">
                        {renderSupplierCell(mat.supplier)}
                      </td>
                      <td className="p-3 text-[10px] text-slate-500 whitespace-nowrap">
                        {mat.date_updated ? new Date(mat.date_updated).toLocaleDateString("id-ID") : "-"}
                      </td>
                      <td className="p-3 text-center sticky right-0 bg-white/95 backdrop-blur-md border-l border-slate-200 z-10">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(mat)}
                            className="p-1.5 bg-amber-50 text-amber-600 border border-amber-200 rounded hover:bg-amber-100 transition-colors"
                            title="Edit Material"
                          >
                            <EditIcon />
                          </button>
                          <button
                            onClick={() => setDeletingId(mat.id)}
                            className="p-1.5 bg-rose-50 text-rose-600 border border-rose-200 rounded hover:bg-rose-100 transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white z-20">
              <h3 className="text-sm font-bold font-mono text-teal-600 uppercase tracking-wider">
                {editingId !== null ? "Edit Material" : "Add New Material"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-mono text-lg"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6 font-mono text-xs">
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded">
                  {errorMessage}
                </div>
              )}

              {/* CARD 1: Material Details */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4">
                <h4 className="text-teal-600 font-bold uppercase tracking-wider border-b border-slate-200 pb-2 mb-3">
                  1. Material Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Description (Searchable Dropdown) */}
                  <div className="space-y-1 relative md:col-span-2">
                    <label className="text-slate-600 text-[10px] uppercase font-bold">Description *</label>
                    <input
                      type="text"
                      required
                      value={formData.description}
                      onChange={(e) => handleDescriptionChange(e.target.value)}
                      onFocus={() => setShowDescDropdown(true)}
                      onBlur={() => setTimeout(() => setShowDescDropdown(false), 200)}
                      placeholder="Ketik atau pilih description..."
                      className="w-full p-2 bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    />
                    {/* Dropdown List */}
                    {showDescDropdown && (
                      <ul className="absolute z-30 w-full mt-1 max-h-40 overflow-y-auto bg-white border border-slate-200 rounded shadow-xl">
                        {uniqueDescriptions
                          .filter((d) => d.toLowerCase().includes(formData.description.toLowerCase()))
                          .map((desc, idx) => (
                            <li
                              key={idx}
                              onClick={() => handleDescriptionChange(desc)}
                              className="px-3 py-2 hover:bg-teal-50 cursor-pointer text-slate-700 transition-colors"
                            >
                              {desc}
                            </li>
                          ))}
                        {uniqueDescriptions.filter((d) => d.toLowerCase().includes(formData.description.toLowerCase())).length === 0 && (
                          <li className="px-3 py-2 text-slate-500 italic">Tekan enter/simpan untuk membuat baru</li>
                        )}
                      </ul>
                    )}
                  </div>

                  {/* Part Number */}
                  <div className="space-y-1">
                    <label className="text-slate-600 text-[10px] uppercase font-bold">Part Number *</label>
                    <input
                      type="text"
                      name="part_number"
                      required
                      value={formData.part_number}
                      onChange={handleInputChange}
                      placeholder="Auto-generated..."
                      className="w-full p-2 bg-white border border-slate-300 rounded text-teal-600 font-bold focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    />
                  </div>

                  {/* Supplier */}
                  <div className="space-y-1">
                    <label className="text-slate-600 text-[10px] uppercase font-bold">Supplier / URL</label>
                    <input
                      type="text"
                      name="supplier"
                      value={formData.supplier}
                      onChange={handleInputChange}
                      placeholder="Nama Toko atau Paste URL Link..."
                      className="w-full p-2 bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    />
                  </div>

                  {/* Technical Specification */}
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-slate-600 text-[10px] uppercase font-bold">Technical Specification</label>
                    <textarea
                      name="technical_specification"
                      rows={2}
                      value={formData.technical_specification}
                      onChange={handleInputChange}
                      className="w-full p-2 bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>

              {/* CARD 2: Inventory */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4">
                <h4 className="text-teal-600 font-bold uppercase tracking-wider border-b border-slate-200 pb-2 mb-3">
                  2. Inventory
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Qty */}
                  <div className="space-y-1">
                    <label className="text-slate-600 text-[10px] uppercase font-bold">Qty</label>
                    <input
                      type="number"
                      name="qty"
                      value={formData.qty}
                      onChange={handleInputChange}
                      placeholder="0"
                      className="w-full p-2 bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    />
                  </div>

                  {/* Unit (Searchable Dropdown) */}
                  <div className="space-y-1 relative">
                    <label className="text-slate-600 text-[10px] uppercase font-bold">Unit</label>
                    <input
                      type="text"
                      name="unit"
                      value={formData.unit}
                      onChange={handleInputChange}
                      onFocus={() => setShowUnitDropdown(true)}
                      onBlur={() => setTimeout(() => setShowUnitDropdown(false), 200)}
                      placeholder="Pcs, Box, Meter, dll."
                      className="w-full p-2 bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    />
                    {/* Dropdown List */}
                    {showUnitDropdown && (
                      <ul className="absolute z-30 w-full mt-1 max-h-40 overflow-y-auto bg-white border border-slate-200 rounded shadow-xl">
                        {uniqueUnits
                          .filter((u) => u.toLowerCase().includes(formData.unit.toLowerCase()))
                          .map((u, idx) => (
                            <li
                              key={idx}
                              onClick={() => setFormData((prev) => ({ ...prev, unit: u }))}
                              className="px-3 py-2 hover:bg-teal-50 cursor-pointer text-slate-700 transition-colors"
                            >
                              {u}
                            </li>
                          ))}
                        {uniqueUnits.filter((u) => u.toLowerCase().includes(formData.unit.toLowerCase())).length === 0 && (
                          <li className="px-3 py-2 text-slate-500 italic">Ketik untuk membuat unit baru</li>
                        )}
                      </ul>
                    )}
                  </div>
                </div>
              </div>

              {/* CARD 3: Pricing */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4">
                <h4 className="text-teal-600 font-bold uppercase tracking-wider border-b border-slate-200 pb-2 mb-3">
                  3. Pricing & Commercials
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Price */}
                  <div className="space-y-1">
                    <label className="text-slate-600 text-[10px] uppercase font-bold">Base Price (Rp)</label>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      placeholder="Masukkan harga..."
                      className="w-full p-2 bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    />
                  </div>

                  {/* Margin */}
                  <div className="space-y-1">
                    <label className="text-slate-600 text-[10px] uppercase font-bold">Margin (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="margin"
                      value={formData.margin}
                      onChange={handleInputChange}
                      placeholder="0"
                      className="w-full p-2 bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    />
                  </div>

                  {/* Markup (Auto Calculated) */}
                  <div className="space-y-1">
                    <label className="text-slate-600 text-[10px] uppercase font-bold">Markup (Rp) - Auto</label>
                    <input
                      type="number"
                      name="markup"
                      readOnly
                      value={formData.markup}
                      placeholder="Otomatis..."
                      className="w-full p-2 bg-slate-100 border border-slate-200 rounded text-teal-700 font-bold focus:outline-none cursor-not-allowed"
                      title="Dihitung otomatis: Base Price + (Base Price x Margin %)"
                    />
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3 sticky bottom-0 bg-white py-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded transition-colors disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xl w-full max-w-md p-6 space-y-4 font-mono">
            <h3 className="text-sm font-bold text-rose-600 uppercase tracking-wider">Confirm Delete</h3>
            <p className="text-xs text-slate-600">
              Apakah Anda yakin ingin menghapus material dengan ID: <span className="text-amber-600 font-bold">#{deletingId}</span>? Actions ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded transition-colors"
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