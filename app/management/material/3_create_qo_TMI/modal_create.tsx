// modal_create.tsx
"use client";
import React, { useState, useEffect, useRef } from "react";
import { X, Layers, Package, PlusCircle, Plus, Trash2, Search, ChevronDown } from "lucide-react";
import { MasterMaterial, FormMotherPart, FormChildPart } from "./types";

// --- KOMPONEN KUSTOM: SEARCHABLE DROPDOWN ---
const SearchableSelect = ({
  options, value, onChange, placeholder,
}: {
  options: MasterMaterial[]; value: number | undefined; onChange: (val: string) => void; placeholder: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt) => {
    const searchString = `${opt.part_number} ${opt.technical_specification || ""} ${opt.description || ""}`.toLowerCase();
    return searchString.includes(search.toLowerCase());
  });

  const selectedOpt = options.find((o) => o.id === value);
  const displayValue = selectedOpt ? `${selectedOpt.part_number} - ${selectedOpt.technical_specification || selectedOpt.description || "No Spec"}` : "";

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="w-full bg-slate-800 border border-slate-700 text-white px-2 py-1.5 rounded cursor-pointer flex justify-between items-center focus:border-blue-500" onClick={() => setIsOpen(!isOpen)}>
        <span className="truncate text-xs text-slate-200">{displayValue || placeholder}</span>
        <ChevronDown className="w-3 h-3 text-slate-400" />
      </div>
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-60 flex flex-col overflow-hidden">
          <div className="p-2 border-b border-slate-700 bg-slate-800 sticky top-0">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
              <input type="text" className="w-full bg-slate-900 border border-slate-700 text-white pl-7 pr-2 py-1.5 rounded text-xs focus:outline-none focus:border-blue-500" placeholder="Cari Part Number / Spec..." value={search} onChange={(e) => setSearch(e.target.value)} onClick={(e) => e.stopPropagation()} autoFocus />
            </div>
          </div>
          <div className="overflow-y-auto flex-1 py-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <div key={opt.id} className="px-3 py-2 text-xs text-slate-200 hover:bg-blue-600 hover:text-white cursor-pointer truncate transition-colors" onClick={() => { onChange(opt.id.toString()); setIsOpen(false); setSearch(""); }}>
                  <span className="font-semibold text-blue-300">{opt.part_number}</span> - {opt.technical_specification || opt.description || "No Spec"}
                </div>
              ))
            ) : (
              <div className="px-3 py-3 text-xs text-slate-400 text-center">Material tidak ditemukan</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface ModalCreateProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  masterMaterials: MasterMaterial[];
}

export default function ModalCreate({ isOpen, onClose, onSuccess, masterMaterials }: ModalCreateProps) {
  const [customerName, setCustomerName] = useState<string>("");
  const [motherParts, setMotherParts] = useState<FormMotherPart[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      setCustomerName("");
      setMotherParts([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const addMotherPart = () => {
    if (!customerName.trim()) return alert("Silakan masukkan Nama Customer terlebih dahulu.");
    setMotherParts([...motherParts, { id: `mp-${Date.now()}-${Math.random()}`, mother_part_name: `Mother Part #${motherParts.length + 1}`, children: [] }]);
  };

  const updateMotherPartName = (mpId: string, name: string) => setMotherParts(motherParts.map((mp) => (mp.id === mpId ? { ...mp, mother_part_name: name } : mp)));
  const removeMotherPart = (mpId: string) => setMotherParts(motherParts.filter((mp) => mp.id !== mpId));

  const addChildPart = (mpId: string) => {
    const newChild: FormChildPart = { id: `cp-${Date.now()}-${Math.random()}`, part_number: "", description: "", technical_specification: "", qty: 1, unit: "Pcs", price: 0, margin: 0, markup: 0 };
    setMotherParts(motherParts.map((mp) => mp.id === mpId ? { ...mp, children: [...mp.children, newChild] } : mp));
  };

  const handleSelectMaterialForChild = (mpId: string, childId: string, materialIdVal: string) => {
    const mat = masterMaterials.find((m) => m.id === Number(materialIdVal));
    setMotherParts(motherParts.map((mp) => {
      if (mp.id === mpId) {
        return {
          ...mp, children: mp.children.map((ch) => {
            if (ch.id === childId) {
              if (mat) return { ...ch, material_id: mat.id, part_number: mat.part_number, description: mat.description || "", technical_specification: mat.technical_specification || "", qty: mat.qty > 0 ? mat.qty : 1, unit: mat.unit || "Pcs", price: Number(mat.price) || 0, margin: Number(mat.margin) || 0, markup: Number(mat.markup) || 0 };
              return { ...ch, material_id: undefined, part_number: "", description: "", technical_specification: "" };
            }
            return ch;
          })
        };
      }
      return mp;
    }));
  };

  const updateChildField = (mpId: string, childId: string, field: keyof FormChildPart, val: any) => {
    setMotherParts(motherParts.map((mp) => mp.id === mpId ? { ...mp, children: mp.children.map((ch) => ch.id === childId ? { ...ch, [field]: val } : ch) } : mp));
  };

  const removeChildPart = (mpId: string, childId: string) => {
    setMotherParts(motherParts.map((mp) => mp.id === mpId ? { ...mp, children: mp.children.filter((ch) => ch.id !== childId) } : mp));
  };

  const calculateMotherPartCost = (children: FormChildPart[]) => children.reduce((sum, ch) => sum + (Number(ch.qty) || 0) * ((Number(ch.price) || 0) + ((Number(ch.price) || 0) * (Number(ch.margin) || 0) / 100)), 0);

  const handleFinishBom = async () => {
    if (!customerName.trim()) return alert("Nama Customer tidak boleh kosong.");
    if (motherParts.length === 0) return alert("Tambahkan setidaknya satu Mother Part.");

    const payloadItems: any[] = [];
    for (const mp of motherParts) {
      if (!mp.mother_part_name.trim()) return alert("Nama Mother Part tidak boleh kosong.");
      if (mp.children.length === 0) return alert(`Mother Part '${mp.mother_part_name}' tidak memiliki Child Part.`);
      for (const ch of mp.children) {
        if (!ch.part_number.trim()) return alert(`Pilih atau isi Part Number untuk Child Part di '${mp.mother_part_name}'.`);
        payloadItems.push({
          customer: customerName.trim(), mother_part: mp.mother_part_name.trim(), part_number: ch.part_number.trim(), description: ch.description?.trim() || "", technical_specification: ch.technical_specification?.trim() || "", qty: Number(ch.qty) || 1, unit: ch.unit?.trim() || "Pcs", price: Number(ch.price) || 0, margin: Number(ch.margin) || 0, markup: Number(ch.price) * (Number(ch.margin) / 100) * (Number(ch.qty) || 1),
        });
      }
    }

    setIsSubmitting(true);
    try {
      const requests = payloadItems.map(async (item) => {
        const res = await fetch("/api/management/create_bom", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(item) });
        if (!res.ok) throw new Error(`Gagal menyimpan part: ${item.part_number}`);
        return res.json();
      });
      await Promise.all(requests);
      alert("Data Berhasil Dibuat dan Tersimpan!");
      onSuccess();
    } catch (err: any) {
      alert(`Terjadi kesalahan saat menyimpan data:\n${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-[95vw] max-h-[95vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        <div className="px-6 py-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg"><Layers className="w-5 h-5" /></div>
            <h2 className="text-xl font-bold text-white">Create New Data</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50"><X className="w-6 h-6" /></button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/60">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Nama Customer <span className="text-red-400">*</span></label>
            <input type="text" placeholder="Masukkan Nama Customer" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500" />
          </div>

          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-lg font-bold text-white flex items-center gap-2"><Package className="w-5 h-5 text-blue-400" /> Mother & Child Parts Structure</h3>
            <button type="button" onClick={addMotherPart} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-sm text-blue-400 font-medium"><PlusCircle className="w-4 h-4" /> Tambah Mother Part</button>
          </div>

          {motherParts.length === 0 ? (
            <div className="text-center py-8 bg-slate-800/20 border border-dashed border-slate-700 rounded-xl"><p className="text-slate-400 text-sm">Belum ada Mother Part.</p></div>
          ) : (
            <div className="space-y-6">
              {motherParts.map((mp, mpIdx) => {
                const motherCost = calculateMotherPartCost(mp.children);
                return (
                  <div key={mp.id} className="bg-slate-800/40 border border-slate-700 rounded-xl p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/80 p-3 rounded-lg border border-slate-700/60">
                      <div className="flex items-center gap-3 flex-1">
                        <span className="text-xs font-bold px-2 py-1 bg-blue-500/20 text-blue-400 rounded">#{mpIdx + 1}</span>
                        <input type="text" value={mp.mother_part_name} onChange={(e) => updateMotherPartName(mp.id, e.target.value)} placeholder="Nama Mother Part" className="bg-slate-900 border border-slate-700 px-3 py-1.5 rounded text-sm text-white font-semibold focus:outline-none focus:border-blue-500 flex-1" />
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block uppercase">Subtotal Cost</span>
                          <span className="text-sm font-bold text-emerald-400">Rp {motherCost.toLocaleString("id-ID")}</span>
                        </div>
                        <button type="button" onClick={() => removeMotherPart(mp.id)} className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-700/50"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>

                    <div className="pl-2 sm:pl-4 border-l-2 border-slate-700 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Child Parts Selection</span>
                        <button type="button" onClick={() => addChildPart(mp.id)} className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium"><Plus className="w-3.5 h-3.5" /> Tambah Child Part</button>
                      </div>
                      {mp.children.length === 0 ? (
                        <p className="text-xs text-slate-500 italic py-2">Belum ada child part.</p>
                      ) : (
                        <div className="space-y-3 overflow-x-auto pb-2">
                          {mp.children.map((child) => {
                            const totalPrice = child.qty * (child.price + (child.price * child.margin / 100));
                            const calculatedMarkup = child.price * (child.margin / 100) * child.qty;
                            return (
                              <div key={child.id} className="flex items-center gap-3 bg-slate-900/60 p-3 rounded-lg border border-slate-700/50 text-xs min-w-max">
                                <div className="w-48 flex-shrink-0">
                                  <label className="block text-[10px] text-slate-400 mb-1">Master Material</label>
                                  <SearchableSelect options={masterMaterials} value={child.material_id} onChange={(val) => handleSelectMaterialForChild(mp.id, child.id, val)} placeholder="-- Cari Material --" />
                                </div>
                                <div className="w-32 flex-shrink-0">
                                  <label className="block text-[10px] text-slate-400 mb-1">Description</label>
                                  <input type="text" value={child.description} onChange={(e) => updateChildField(mp.id, child.id, "description", e.target.value)} className="w-full bg-slate-800 border border-slate-700 text-white px-2 py-1.5 rounded focus:outline-none focus:border-blue-500" />
                                </div>
                                <div className="w-32 flex-shrink-0">
                                  <label className="block text-[10px] text-slate-400 mb-1">Tech Spec</label>
                                  <input type="text" value={child.technical_specification} onChange={(e) => updateChildField(mp.id, child.id, "technical_specification", e.target.value)} className="w-full bg-slate-800 border border-slate-700 text-white px-2 py-1.5 rounded focus:outline-none focus:border-blue-500" />
                                </div>
                                <div className="w-16 flex-shrink-0">
                                  <label className="block text-[10px] text-slate-400 mb-1">Qty</label>
                                  <input type="number" min="1" value={child.qty} onChange={(e) => updateChildField(mp.id, child.id, "qty", Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 text-white px-2 py-1.5 rounded focus:outline-none focus:border-blue-500" />
                                </div>
                                <div className="w-16 flex-shrink-0">
                                  <label className="block text-[10px] text-slate-400 mb-1">Unit</label>
                                  <input type="text" value={child.unit} onChange={(e) => updateChildField(mp.id, child.id, "unit", e.target.value)} className="w-full bg-slate-800 border border-slate-700 text-white px-2 py-1.5 rounded focus:outline-none focus:border-blue-500" />
                                </div>
                                <div className="w-24 flex-shrink-0">
                                  <label className="block text-[10px] text-slate-400 mb-1">Base Price (Rp)</label>
                                  <input type="number" value={child.price} onChange={(e) => updateChildField(mp.id, child.id, "price", Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 text-white px-2 py-1.5 rounded focus:outline-none focus:border-blue-500" />
                                </div>
                                <div className="w-16 flex-shrink-0">
                                  <label className="block text-[10px] text-slate-400 mb-1">Margin (%)</label>
                                  <input type="number" value={child.margin} onChange={(e) => updateChildField(mp.id, child.id, "margin", Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 text-white px-2 py-1.5 rounded focus:outline-none focus:border-blue-500" />
                                </div>
                                <div className="w-24 flex-shrink-0">
                                  <label className="block text-[10px] text-slate-400 mb-1">Markup (Rp)</label>
                                  <input type="number" value={calculatedMarkup} readOnly className="w-full bg-slate-700 border border-slate-600 text-slate-300 px-2 py-1.5 rounded cursor-not-allowed" />
                                </div>
                                <div className="w-28 flex-shrink-0 flex flex-col justify-end pb-1">
                                  <span className="text-[10px] text-slate-400">Total Price</span>
                                  <span className="font-bold text-emerald-400">Rp {totalPrice.toLocaleString("id-ID")}</span>
                                </div>
                                <div className="w-10 flex-shrink-0 flex items-end justify-center pb-1">
                                  <button type="button" onClick={() => removeChildPart(mp.id, child.id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"><Trash2 className="w-4 h-4" /></button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-slate-800 border-t border-slate-700 flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm font-medium transition-colors">Batal</button>
          <button type="button" onClick={handleFinishBom} disabled={isSubmitting} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
            {isSubmitting ? "Menyimpan..." : "Finish & Save"}
          </button>
        </div>
      </div>
    </div>
  );
}