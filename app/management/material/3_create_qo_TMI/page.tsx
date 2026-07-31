"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Plus, ChevronDown, ChevronRight, PlusCircle, X, Package, Layers,
  Search, Building, Box, FileText, ShoppingCart, Printer, Trash2, ClipboardCheck,
} from "lucide-react";

// --- INTERFACES ---
interface MasterMaterial {
  id: number; customer?: string; mother_part?: string; part_number: string;
  description?: string; technical_specification?: string; qty: number;
  unit?: string; margin?: number; price: number; price_margin?: number;
  supplier?: string; markup?: number; date_updated?: string;
}

interface BomItem {
  id: number; customer: string; mother_part: string; part_number: string;
  description?: string; technical_specification?: string; qty: number;
  unit?: string; price: number; margin?: number; markup?: number;
  created_at?: string; updated_at?: string;
}

interface FormChildPart {
  id: string; material_id?: number; part_number: string; description: string;
  technical_specification: string; qty: number; unit: string; price: number;
  margin: number; markup: number;
}

interface FormMotherPart {
  id: string; mother_part_name: string; children: FormChildPart[];
}

interface BomGroup {
  customer: string; date_created: string; total_mother_parts: number;
  total_items: number; total_cost: number; items: BomItem[];
}

type PrintType = "QO" | "PO";

// --- HELPER FUNCTIONS (Untuk menghindari repetisi rumus) ---
const calcTotal = (price: number, margin: number, qty: number) => 
  (Number(qty) || 1) * ((Number(price) || 0) + ((Number(price) || 0) * (Number(margin) || 0) / 100));

const calcMarkup = (price: number, margin: number, qty: number) => 
  (Number(price) || 0) * ((Number(margin) || 0) / 100) * (Number(qty) || 1);

// --- KOMPONEN KUSTOM: SEARCHABLE DROPDOWN ---
const SearchableSelect = ({ options, value, onChange, placeholder }: {
  options: MasterMaterial[]; value: number | undefined; onChange: (val: string) => void; placeholder: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt) =>
    `${opt.part_number} ${opt.technical_specification || ""} ${opt.description || ""}`.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOpt = options.find((o) => o.id === value);
  const displayValue = selectedOpt ? `${selectedOpt.part_number} - ${selectedOpt.technical_specification || selectedOpt.description || "No Spec"}` : "";

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div
        className="w-full bg-slate-800 border border-slate-700 text-white px-2 py-1.5 rounded cursor-pointer flex justify-between items-center focus:border-blue-500"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate text-xs text-slate-200">{displayValue || placeholder}</span>
        <ChevronDown className="w-3 h-3 text-slate-400" />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-60 flex flex-col overflow-hidden">
          <div className="p-2 border-b border-slate-700 bg-slate-800 sticky top-0">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
              <input
                type="text"
                className="w-full bg-slate-900 border border-slate-700 text-white pl-7 pr-2 py-1.5 rounded text-xs focus:outline-none focus:border-blue-500"
                placeholder="Cari Part Number / Spec..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1 py-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <div
                  key={opt.id}
                  className="px-3 py-2 text-xs text-slate-200 hover:bg-blue-600 hover:text-white cursor-pointer truncate transition-colors"
                  onClick={() => { onChange(opt.id.toString()); setIsOpen(false); setSearch(""); }}
                >
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

export default function QoPoManagementPage() {
  // --- STATES ---
  const [bomGroups, setBomGroups] = useState<BomGroup[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedCustomers, setExpandedCustomers] = useState<Record<string, boolean>>({});
  
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [masterMaterials, setMasterMaterials] = useState<MasterMaterial[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [customerName, setCustomerName] = useState<string>("");
  const [motherParts, setMotherParts] = useState<FormMotherPart[]>([]);

  // Print States (Consolidated)
  const [printConfig, setPrintConfig] = useState<{ group: BomGroup; type: PrintType } | null>(null);
  const [isPrintSettingsOpen, setIsPrintSettingsOpen] = useState<boolean>(false);
  const [printForm, setPrintForm] = useState({
    address: "", subject: "", contact: "", shipment: "", docNumber: "",
    terms: "due to plan & Project activity, it might be change depends on device & condition\n- Status Devices (ready or not) \n- Schedule User (available or not)\nGrace Period 30 Days after User Acceptance Test is Confirmed\nThis price is not include tax (PPN 11%)",
    director: "", accounting: ""
  });

  // BAST States (Consolidated)
  const [isBastModalOpen, setIsBastModalOpen] = useState(false);
  const [bastConfig, setBastConfig] = useState<{ group: BomGroup } | null>(null);
  const [bastForm, setBastForm] = useState({
    qoNumber: "", project: "", customer: "",
    firstCompany: "PT. TRANSINDO MULTI INDUSTRI",
    firstAddress: "Jl. Rawa Bengkok Kp. Koong Parigi, Perum Aryatama Regency 1 Blok E, No 14, Bedahan, Sawangan, Depok",
    firstName: "Damita",
    secondCompany: "", secondAddress: "", secondName: ""
  });

  // --- EFFECTS ---
  useEffect(() => {
    fetchBomList();
    fetchMasterMaterials();
  }, []);

  // --- FETCH DATA ---
  const fetchBomList = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/management/create_bom");
      const contentType = res.headers.get("content-type");
      if (!res.ok || !contentType?.includes("application/json")) throw new Error(`HTTP error! status: ${res.status}`);

      const result = await res.json();
      if (Array.isArray(result.data)) {
        const grouped: Record<string, BomItem[]> = {};
        result.data.forEach((item: BomItem) => {
          const cust = item.customer || "Unassigned Customer";
          if (!grouped[cust]) grouped[cust] = [];
          grouped[cust].push(item);
        });

        const list: BomGroup[] = Object.keys(grouped).map((cust) => {
          const items = grouped[cust];
          const motherPartSet = new Set(items.map((i) => i.mother_part).filter(Boolean));
          const totalCost = items.reduce((sum, item) => sum + calcTotal(item.price, item.margin || 0, item.qty), 0);

          return {
            customer: cust, date_created: items[0]?.created_at || new Date().toISOString(),
            total_mother_parts: motherPartSet.size, total_items: items.length, total_cost: totalCost, items,
          };
        });
        setBomGroups(list);
      }
    } catch (err) {
      console.error("Gagal mengambil data BOM:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMasterMaterials = async () => {
    try {
      const res = await fetch("/api/management/master_material");
      const result = await res.json();
      if (Array.isArray(result.data)) setMasterMaterials(result.data);
    } catch (err) {
      console.error("Gagal mengambil data Master Material:", err);
    }
  };

  // --- HANDLERS ---
  const handleOpenModal = () => { setCustomerName(""); setMotherParts([]); setIsModalOpen(true); };

  const handleOpenPrintSettings = (group: BomGroup, type: PrintType, e: React.MouseEvent) => {
    e.stopPropagation();
    setPrintConfig({ group, type });
    const date = new Date();
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    setPrintForm(prev => ({
      ...prev,
      docNumber: `${type}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getFullYear().toString().slice(-2)}${randomNum}`,
      address: "", subject: "", contact: "", shipment: ""
    }));
    setIsPrintSettingsOpen(true);
  };

  const handleOpenBastSettings = (group: BomGroup, e: React.MouseEvent) => {
    e.stopPropagation();
    setBastConfig({ group });
    const date = new Date();
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    setBastForm(prev => ({
      ...prev,
      customer: group.customer || "",
      secondCompany: group.customer || "",
      qoNumber: `QO${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getFullYear().toString().slice(-2)}${randomNum}`,
      project: "", secondAddress: "", secondName: ""
    }));
    setIsBastModalOpen(true);
  };

  const executePrint = (setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    setter(false);
    setTimeout(() => window.print(), 300);
  };

  // --- FORM BOM HANDLERS ---
  const addMotherPart = () => {
    if (!customerName.trim()) return alert("Silakan masukkan Nama Customer terlebih dahulu.");
    setMotherParts([...motherParts, { id: `mp-${Date.now()}-${Math.random()}`, mother_part_name: `Mother Part #${motherParts.length + 1}`, children: [] }]);
  };

  const updateMotherPartName = (mpId: string, name: string) => 
    setMotherParts(motherParts.map((mp) => (mp.id === mpId ? { ...mp, mother_part_name: name } : mp)));

  const removeMotherPart = (mpId: string) => setMotherParts(motherParts.filter((mp) => mp.id !== mpId));

  const addChildPart = (mpId: string) => {
    const newChild: FormChildPart = { id: `cp-${Date.now()}-${Math.random()}`, part_number: "", description: "", technical_specification: "", qty: 1, unit: "Pcs", price: 0, margin: 0, markup: 0 };
    setMotherParts(motherParts.map((mp) => mp.id === mpId ? { ...mp, children: [...mp.children, newChild] } : mp));
  };

  const handleSelectMaterialForChild = (mpId: string, childId: string, materialIdVal: string) => {
    const mat = masterMaterials.find((m) => m.id === Number(materialIdVal));
    setMotherParts(motherParts.map((mp) => mp.id === mpId ? {
      ...mp, children: mp.children.map((ch) => ch.id === childId ? (mat ? {
        ...ch, material_id: mat.id, part_number: mat.part_number, description: mat.description || "",
        technical_specification: mat.technical_specification || "", qty: mat.qty > 0 ? mat.qty : 1,
        unit: mat.unit || "Pcs", price: Number(mat.price) || 0, margin: Number(mat.margin) || 0, markup: Number(mat.markup) || 0,
      } : { ...ch, material_id: undefined, part_number: "", description: "", technical_specification: "" }) : ch)
    } : mp));
  };

  const updateChildField = (mpId: string, childId: string, field: keyof FormChildPart, val: any) => {
    setMotherParts(motherParts.map((mp) => mp.id === mpId ? {
      ...mp, children: mp.children.map((ch) => ch.id === childId ? { ...ch, [field]: val } : ch)
    } : mp));
  };

  const removeChildPart = (mpId: string, childId: string) => 
    setMotherParts(motherParts.map((mp) => mp.id === mpId ? { ...mp, children: mp.children.filter((ch) => ch.id !== childId) } : mp));

  const calculateMotherPartCost = (children: FormChildPart[]) => children.reduce((sum, ch) => sum + calcTotal(ch.price, ch.margin, ch.qty), 0);

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
          customer: customerName.trim(), mother_part: mp.mother_part_name.trim(), part_number: ch.part_number.trim(),
          description: ch.description?.trim() || "", technical_specification: ch.technical_specification?.trim() || "",
          qty: Number(ch.qty) || 1, unit: ch.unit?.trim() || "Pcs", price: Number(ch.price) || 0, margin: Number(ch.margin) || 0,
          markup: calcMarkup(ch.price, ch.margin, ch.qty),
        });
      }
    }

    setIsSubmitting(true);
    try {
      await Promise.all(payloadItems.map(async (item) => {
        const res = await fetch("/api/management/create_bom", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(item) });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || `Gagal menyimpan part: ${item.part_number}`);
        return res.json();
      }));
      alert("Data Berhasil Dibuat dan Tersimpan!");
      setIsModalOpen(false);
      fetchBomList();
    } catch (err: any) {
      alert(`Terjadi kesalahan saat menyimpan data:\n${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredBomGroups = bomGroups.filter((group) => group.customer.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white !important; }
          body * { visibility: hidden; }
          #print-area, #print-area *, #print-area-bast, #print-area-bast * { visibility: visible; }
          #print-area, #print-area-bast { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; padding: 0.5cm 1cm !important; box-sizing: border-box; background-color: white; }
          html, body, main { height: auto !important; overflow: visible !important; position: static !important; padding: 0 !important; margin: 0 !important; }
        }
      `}} />

      {/* --- TAMPILAN UTAMA --- */}
      <div className="min-h-screen bg-slate-900 text-slate-100 p-6 font-sans print:hidden">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                <Layers className="w-8 h-8 text-blue-500" /> Quotation & Purchase Order Generator
              </h1>
              <p className="text-sm text-slate-400 mt-1">Generate dokumen QO / PO per Customer berdasarkan data BOM.</p>
            </div>
            <button onClick={handleOpenModal} className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg shadow-blue-500/20 transition-all duration-200">
              <Plus className="w-5 h-5" /> Create New
            </button>
          </div>

          <div className="flex items-center gap-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Cari berdasarkan nama customer..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-900/80 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-colors" />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-slate-400">Loading data...</div>
          ) : filteredBomGroups.length === 0 ? (
            <div className="text-center py-16 bg-slate-800/30 rounded-xl border border-dashed border-slate-700">
              <Box className="w-12 h-12 text-slate-500 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">Belum ada data yang dibuat.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBomGroups.map((group) => {
                const isExpanded = !!expandedCustomers[group.customer];
                const motherPartMap: Record<string, BomItem[]> = {};
                group.items.forEach((item) => {
                  const mpName = item.mother_part || "General Part";
                  if (!motherPartMap[mpName]) motherPartMap[mpName] = [];
                  motherPartMap[mpName].push(item);
                });

                return (
                  <div key={group.customer} className="bg-slate-800/60 border border-slate-700/60 rounded-xl overflow-hidden transition-all duration-200">
                    <div onClick={() => setExpandedCustomers(prev => ({ ...prev, [group.customer]: !prev[group.customer] }))} className="p-5 flex flex-col md:flex-row md:items-center justify-between cursor-pointer hover:bg-slate-700/30 transition-colors gap-4">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400"><Building className="w-6 h-6" /></div>
                        <div>
                          <h3 className="text-lg font-bold text-white flex items-center gap-2">{group.customer}</h3>
                          <p className="text-xs text-slate-400 mt-0.5">Total {group.total_mother_parts} Mother Parts • {group.total_items} Items</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 md:gap-6">
                        <div className="text-right hidden sm:block">
                          <span className="text-xs text-slate-400 block">Estimated Total Cost</span>
                          <span className="text-lg font-bold text-emerald-400">Rp {group.total_cost.toLocaleString("id-ID")}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={(e) => handleOpenPrintSettings(group, "QO", e)} className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-700/50 rounded-lg transition-colors" title="Generate Quotation (QO)"><FileText className="w-5 h-5" /></button>
                          <button onClick={(e) => handleOpenPrintSettings(group, "PO", e)} className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-700/50 rounded-lg transition-colors" title="Generate Purchase Order (PO)"><ShoppingCart className="w-5 h-5" /></button>
                          <button onClick={(e) => handleOpenBastSettings(group, e)} className="p-2 text-slate-400 hover:text-purple-400 hover:bg-slate-700/50 rounded-lg transition-colors" title="Generate BAST"><ClipboardCheck className="w-5 h-5" /></button>
                          <div className="p-2 bg-slate-700/50 rounded-lg text-slate-300 ml-2">{isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}</div>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-slate-700/50 bg-slate-900/40 p-5 space-y-6">
                        {Object.keys(motherPartMap).map((mpName) => {
                          const sortedChildren = [...motherPartMap[mpName]].sort((a, b) => calcTotal(b.price, b.margin || 0, b.qty) - calcTotal(a.price, a.margin || 0, a.qty));
                          const subTotal = sortedChildren.reduce((sum, item) => sum + calcTotal(item.price, item.margin || 0, item.qty), 0);

                          return (
                            <div key={mpName} className="bg-slate-800/80 border border-slate-700 rounded-lg overflow-hidden">
                              <div className="bg-slate-800 px-4 py-3 flex items-center justify-between border-b border-slate-700/60">
                                <div className="flex items-center gap-2 text-blue-400 font-semibold"><Package className="w-4 h-4" /><span>Mother Part: {mpName}</span></div>
                                <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">Subtotal: Rp {subTotal.toLocaleString("id-ID")}</span>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs text-slate-300">
                                  <thead className="bg-slate-900/50 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-700/50">
                                    <tr>
                                      <th className="px-4 py-2.5">Part Number</th><th className="px-4 py-2.5">Description</th><th className="px-4 py-2.5">Technical Spec</th>
                                      <th className="px-4 py-2.5">Qty / Unit</th><th className="px-4 py-2.5 text-right">Base Price</th><th className="px-4 py-2.5 text-right">Margin (%)</th>
                                      <th className="px-4 py-2.5 text-right">Markup</th><th className="px-4 py-2.5 text-right">Total Price</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-700/30">
                                    {sortedChildren.map((child) => (
                                      <tr key={child.id} className="hover:bg-slate-700/20">
                                        <td className="px-4 py-2.5 font-medium text-white">{child.part_number}</td>
                                        <td className="px-4 py-2.5">{child.description || "-"}</td>
                                        <td className="px-4 py-2.5">{child.technical_specification || "-"}</td>
                                        <td className="px-4 py-2.5">{child.qty} {child.unit}</td>
                                        <td className="px-4 py-2.5 text-right">Rp {(Number(child.price) || 0).toLocaleString("id-ID")}</td>
                                        <td className="px-4 py-2.5 text-right">{child.margin || 0}%</td>
                                        <td className="px-4 py-2.5 text-right">Rp {calcMarkup(child.price, child.margin || 0, child.qty).toLocaleString("id-ID")}</td>
                                        <td className="px-4 py-2.5 text-right font-medium text-emerald-400">Rp {calcTotal(child.price, child.margin || 0, child.qty).toLocaleString("id-ID")}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* --- MODAL PRINT SETTINGS --- */}
        {isPrintSettingsOpen && printConfig && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl flex flex-col shadow-2xl overflow-hidden my-auto">
              <div className="px-6 py-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg"><Printer className="w-5 h-5" /></div>
                  <h2 className="text-xl font-bold text-white">Pengaturan Cetak {printConfig.type === "QO" ? "Quotation" : "Purchase Order"}</h2>
                </div>
                <button onClick={() => setIsPrintSettingsOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50"><X className="w-6 h-6" /></button>
              </div>
              <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['address', 'subject', 'contact', 'shipment'].map((field) => (
                    <div key={field}>
                      <label className="block text-sm font-semibold text-slate-300 mb-2 capitalize">{field}</label>
                      <input type="text" placeholder="Kosongkan jika tidak ada" value={(printForm as any)[field]} onChange={(e) => setPrintForm({ ...printForm, [field]: e.target.value })} className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors" />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Terms & Conditions</label>
                  <textarea rows={4} value={printForm.terms} onChange={(e) => setPrintForm({ ...printForm, terms: e.target.value })} className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Checked by (Accounting/Purchasing)</label>
                    <input type="text" placeholder="Kosongkan jika ingin ditulis tangan" value={printForm.accounting} onChange={(e) => setPrintForm({ ...printForm, accounting: e.target.value })} className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Approved by (Director)</label>
                    <input type="text" placeholder="Kosongkan jika ingin ditulis tangan" value={printForm.director} onChange={(e) => setPrintForm({ ...printForm, director: e.target.value })} className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors" />
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 bg-slate-800 border-t border-slate-700 flex items-center justify-end gap-3">
                <button type="button" onClick={() => setIsPrintSettingsOpen(false)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm font-medium transition-colors">Batal</button>
                <button type="button" onClick={() => executePrint(setIsPrintSettingsOpen)} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"><Printer className="w-4 h-4" /> Generate PDF</button>
              </div>
            </div>
          </div>
        )}

        {/* --- MODAL BAST SETTINGS --- */}
        {isBastModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-2xl shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center border-b border-slate-700 pb-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><ClipboardCheck className="w-5 h-5 text-purple-400" /> Settings BAST</h3>
                <button onClick={() => setIsBastModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="col-span-2 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 space-y-3">
                  <div><label className="block text-slate-300 text-xs font-semibold mb-1">Quotation Number</label><input type="text" value={bastForm.qoNumber} onChange={(e) => setBastForm({ ...bastForm, qoNumber: e.target.value })} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-white" /></div>
                  <div><label className="block text-slate-300 text-xs font-semibold mb-1">Project Name</label><input type="text" placeholder="Contoh: Automation Machine Setup" value={bastForm.project} onChange={(e) => setBastForm({ ...bastForm, project: e.target.value })} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-white" /></div>
                </div>
                <div className="space-y-3 bg-slate-900/30 p-3 rounded-lg border border-slate-700/30">
                  <h4 className="font-bold text-purple-400 text-xs uppercase tracking-wider">1st Participant (Pihak Ke-1)</h4>
                  <div><label className="block text-slate-300 text-xs mb-1">Company Name</label><input type="text" value={bastForm.firstCompany} onChange={(e) => setBastForm({ ...bastForm, firstCompany: e.target.value })} className="w-full bg-slate-800 border border-slate-600 rounded px-2.5 py-1 text-white text-xs" /></div>
                  <div><label className="block text-slate-300 text-xs mb-1">Address</label><textarea rows={2} value={bastForm.firstAddress} onChange={(e) => setBastForm({ ...bastForm, firstAddress: e.target.value })} className="w-full bg-slate-800 border border-slate-600 rounded px-2.5 py-1 text-white text-xs" /></div>
                  <div><label className="block text-slate-300 text-xs mb-1">Responsible Name</label><input type="text" value={bastForm.firstName} onChange={(e) => setBastForm({ ...bastForm, firstName: e.target.value })} className="w-full bg-slate-800 border border-slate-600 rounded px-2.5 py-1 text-white text-xs" /></div>
                </div>
                <div className="space-y-3 bg-slate-900/30 p-3 rounded-lg border border-slate-700/30">
                  <h4 className="font-bold text-emerald-400 text-xs uppercase tracking-wider">2nd Participant (Customer)</h4>
                  <div><label className="block text-slate-300 text-xs mb-1">Company Name</label><input type="text" value={bastForm.secondCompany} onChange={(e) => setBastForm({ ...bastForm, secondCompany: e.target.value })} className="w-full bg-slate-800 border border-slate-600 rounded px-2.5 py-1 text-white text-xs" /></div>
                  <div><label className="block text-slate-300 text-xs mb-1">Address</label><textarea rows={2} placeholder="Masukkan alamat customer..." value={bastForm.secondAddress} onChange={(e) => setBastForm({ ...bastForm, secondAddress: e.target.value })} className="w-full bg-slate-800 border border-slate-600 rounded px-2.5 py-1 text-white text-xs" /></div>
                  <div><label className="block text-slate-300 text-xs mb-1">Responsible Name</label><input type="text" placeholder="Nama penanggung jawab customer..." value={bastForm.secondName} onChange={(e) => setBastForm({ ...bastForm, secondName: e.target.value })} className="w-full bg-slate-800 border border-slate-600 rounded px-2.5 py-1 text-white text-xs" /></div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-700">
                <button onClick={() => setIsBastModalOpen(false)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg">Cancel</button>
                <button onClick={() => executePrint(setIsBastModalOpen)} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-lg flex items-center gap-2"><Printer className="w-4 h-4" /> Export BAST PDF</button>
              </div>
            </div>
          </div>
        )}

        {/* --- MODAL CREATE NEW --- */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-[95vw] max-h-[95vh] flex flex-col shadow-2xl overflow-hidden my-auto">
              <div className="px-6 py-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3"><div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg"><Layers className="w-5 h-5" /></div><h2 className="text-xl font-bold text-white">Create New Data</h2></div>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50"><X className="w-6 h-6" /></button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/60">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Nama Customer <span className="text-red-400">*</span></label>
                  <input type="text" placeholder="Masukkan Nama Customer" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors" />
                </div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2"><Package className="w-5 h-5 text-blue-400" /> Mother & Child Parts Structure</h3>
                  <button type="button" onClick={addMotherPart} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-sm text-blue-400 font-medium transition-colors"><PlusCircle className="w-4 h-4" /> Tambah Mother Part</button>
                </div>
                {motherParts.length === 0 ? (
                  <div className="text-center py-8 bg-slate-800/20 border border-dashed border-slate-700 rounded-xl"><p className="text-slate-400 text-sm">Belum ada Mother Part.</p></div>
                ) : (
                  <div className="space-y-6">
                    {motherParts.map((mp, mpIdx) => (
                      <div key={mp.id} className="bg-slate-800/40 border border-slate-700 rounded-xl p-5 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/80 p-3 rounded-lg border border-slate-700/60">
                          <div className="flex items-center gap-3 flex-1">
                            <span className="text-xs font-bold px-2 py-1 bg-blue-500/20 text-blue-400 rounded">#{mpIdx + 1}</span>
                            <input type="text" value={mp.mother_part_name} onChange={(e) => updateMotherPartName(mp.id, e.target.value)} placeholder="Nama Mother Part" className="bg-slate-900 border border-slate-700 px-3 py-1.5 rounded text-sm text-white font-semibold focus:outline-none focus:border-blue-500 flex-1" />
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right"><span className="text-[10px] text-slate-400 block uppercase">Subtotal Cost</span><span className="text-sm font-bold text-emerald-400">Rp {calculateMotherPartCost(mp.children).toLocaleString("id-ID")}</span></div>
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
                              {mp.children.map((child) => (
                                <div key={child.id} className="flex items-center gap-3 bg-slate-900/60 p-3 rounded-lg border border-slate-700/50 text-xs min-w-max">
                                  <div className="w-48 flex-shrink-0"><label className="block text-[10px] text-slate-400 mb-1">Master Material</label><SearchableSelect options={masterMaterials} value={child.material_id} onChange={(val) => handleSelectMaterialForChild(mp.id, child.id, val)} placeholder="-- Cari Material --" /></div>
                                  <div className="w-32 flex-shrink-0"><label className="block text-[10px] text-slate-400 mb-1">Description</label><input type="text" value={child.description} onChange={(e) => updateChildField(mp.id, child.id, "description", e.target.value)} className="w-full bg-slate-800 border border-slate-700 text-white px-2 py-1.5 rounded focus:outline-none focus:border-blue-500" /></div>
                                  <div className="w-32 flex-shrink-0"><label className="block text-[10px] text-slate-400 mb-1">Tech Spec</label><input type="text" value={child.technical_specification} onChange={(e) => updateChildField(mp.id, child.id, "technical_specification", e.target.value)} className="w-full bg-slate-800 border border-slate-700 text-white px-2 py-1.5 rounded focus:outline-none focus:border-blue-500" /></div>
                                  <div className="w-16 flex-shrink-0"><label className="block text-[10px] text-slate-400 mb-1">Qty</label><input type="number" min="1" value={child.qty} onChange={(e) => updateChildField(mp.id, child.id, "qty", Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 text-white px-2 py-1.5 rounded focus:outline-none focus:border-blue-500" /></div>
                                  <div className="w-16 flex-shrink-0"><label className="block text-[10px] text-slate-400 mb-1">Unit</label><input type="text" value={child.unit} onChange={(e) => updateChildField(mp.id, child.id, "unit", e.target.value)} className="w-full bg-slate-800 border border-slate-700 text-white px-2 py-1.5 rounded focus:outline-none focus:border-blue-500" /></div>
                                  <div className="w-24 flex-shrink-0"><label className="block text-[10px] text-slate-400 mb-1">Base Price (Rp)</label><input type="number" value={child.price} onChange={(e) => updateChildField(mp.id, child.id, "price", Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 text-white px-2 py-1.5 rounded focus:outline-none focus:border-blue-500" /></div>
                                  <div className="w-16 flex-shrink-0"><label className="block text-[10px] text-slate-400 mb-1">Margin (%)</label><input type="number" value={child.margin} onChange={(e) => updateChildField(mp.id, child.id, "margin", Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 text-white px-2 py-1.5 rounded focus:outline-none focus:border-blue-500" /></div>
                                  <div className="w-24 flex-shrink-0"><label className="block text-[10px] text-slate-400 mb-1">Markup (Rp)</label><input type="number" value={calcMarkup(child.price, child.margin, child.qty)} readOnly className="w-full bg-slate-700 border border-slate-600 text-slate-300 px-2 py-1.5 rounded cursor-not-allowed" /></div>
                                  <div className="w-28 flex-shrink-0 flex flex-col justify-end pb-1"><span className="text-[10px] text-slate-400">Total Price</span><span className="font-bold text-emerald-400">Rp {calcTotal(child.price, child.margin, child.qty).toLocaleString("id-ID")}</span></div>
                                  <div className="w-10 flex-shrink-0 flex items-end justify-center pb-1"><button type="button" onClick={() => removeChildPart(mp.id, child.id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"><Trash2 className="w-4 h-4" /></button></div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="px-6 py-4 bg-slate-800 border-t border-slate-700 flex items-center justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm font-medium transition-colors">Batal</button>
                <button type="button" onClick={handleFinishBom} disabled={isSubmitting} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">{isSubmitting ? "Menyimpan..." : "Finish & Save"}</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- TAMPILAN CETAK BAST --- */}
      {bastConfig && (
        <div id="print-area-bast" className="hidden print:flex flex-col justify-between bg-white text-black font-sans w-full text-xs max-h-[280mm] h-[280mm] box-border p-2">
          <div className="flex-1 flex flex-col">
            <div className="flex justify-between items-start border-b-2 border-black pb-2 mb-4">
              <div className="w-44 h-14 flex items-center"><img src="/image/transindo.png" alt="TRANSINDO Logo" loading="eager" className="max-w-full max-h-full object-contain" style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }} /></div>
              <div className="text-right leading-tight text-[9.5px]">
                <h1 className="text-xs font-bold uppercase tracking-wider">PT. TRANSINDO MULTI INDUSTRI</h1>
                <p>www.transindomu.com</p><p>Jl. Rawa Bengkok Kp. Koong Parigi, Perum Aryatama Regency 1 Blok E, No 14</p><p>Kelurahan Bedahan, Sawangan, Depok, Jawa Barat 16514</p><p>Phone : (+62) 8516 3657 641 email : sales@transindomu.com</p>
              </div>
            </div>
            <div className="space-y-1 text-xs mb-6 font-sans">
              <div className="flex"><span className="w-36 font-semibold">Quotation Number</span><span>: {bastForm.qoNumber || "-"}</span></div>
              <div className="flex"><span className="w-36 font-semibold">Project</span><span>: {bastForm.project || "-"}</span></div>
              <div className="flex"><span className="w-36 font-semibold">Customer</span><span>: {bastForm.secondCompany || bastForm.customer || "-"}</span></div>
            </div>
            <div className="text-center my-4"><h2 className="text-base font-bold uppercase tracking-widest border-b-2 border-black inline-block pb-0.5">CERTIFICATE OF COMPLETION</h2></div>
            <p className="text-xs mb-4">This Certificate of completion is made by and between :</p>
            <div className="space-y-4 text-xs mb-6">
              <div>
                <p className="font-bold">1.</p>
                <div className="pl-4 space-y-1">
                  <div className="flex"><span className="w-32 font-semibold">Company Name</span><span>: {bastForm.firstCompany}</span></div>
                  <div className="flex"><span className="w-32 font-semibold">Address</span><span className="flex-1">: {bastForm.firstAddress}</span></div>
                  <div className="flex"><span className="w-32 font-semibold">Name</span><span>: {bastForm.firstName || "____________________"}</span></div>
                  <p className="pt-0.5">As the responsible from <span className="font-semibold">{bastForm.firstCompany}</span>, now will be called as the First Participant.</p>
                </div>
              </div>
              <div>
                <p className="font-bold">2.</p>
                <div className="pl-4 space-y-1">
                  <div className="flex"><span className="w-32 font-semibold">Company Name</span><span>: {bastForm.secondCompany || bastForm.customer}</span></div>
                  <div className="flex"><span className="w-32 font-semibold">Address</span><span className="flex-1">: {bastForm.secondAddress || "-"}</span></div>
                  <div className="flex"><span className="w-32 font-semibold">Name</span><span>: {bastForm.secondName || "____________________"}</span></div>
                  <p className="pt-0.5">As the responsible from <span className="font-semibold">{bastForm.secondCompany || bastForm.customer}</span>, now will be called as the Second.</p>
                </div>
              </div>
            </div>
            <div className="space-y-3 text-xs text-justify leading-relaxed">
              <p>First Participant and Second Participant area already doing the assessment for <span className="font-semibold">{bastForm.project || "Project"}</span> refer from quotation number <span className="font-semibold">{bastForm.qoNumber}</span>.</p>
              <p>As the assessment, both participants agree that the work is 100% ( One Hundred Percent ) finished and works properly.</p>
              <p>In witness whereof, the participants here caused this agreement to be made and signed so that it shall be used as it must.</p>
            </div>
          </div>
          <div className="break-inside-avoid pt-6 mb-8">
            <div className="flex justify-between items-start text-xs">
              <div className="w-56 text-left"><p className="font-bold uppercase">FIRST PARTICIPANT</p><p className="font-semibold text-[11px]">{bastForm.firstCompany}</p><div className="h-20"></div><div className="border-b border-black w-full"></div></div>
              <div className="w-56 text-left"><p className="font-bold uppercase">SECOND PARTICIPANT</p><p className="font-semibold text-[11px]">{bastForm.secondCompany || bastForm.customer}</p><div className="h-20"></div><div className="border-b border-black w-full"></div></div>
            </div>
          </div>
        </div>
      )}

      {/* --- TAMPILAN CETAK QO / PO --- */}
      {printConfig && (() => {
        const isCompact = (printConfig.group?.items?.length || 0) > 5;
        return (
          <>
            <style jsx global>{`@media print { @page { size: A4 portrait; margin: 8mm 10mm; } body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: #fff !important; } #print-area { page-break-after: avoid !important; page-break-inside: avoid !important; } }`}</style>
            <div id="print-area" className="hidden print:flex flex-col justify-between bg-white text-black font-sans w-full text-xs max-h-[280mm] h-[280mm] box-border">
              <div className="flex-1 flex flex-col">
                <div className="flex justify-between items-start border-b-2 border-black pb-2 mb-3">
                  <div className="w-44 h-14 flex items-center"><img src="/image/transindo.png" alt="TRANSINDO Logo" loading="eager" className="max-w-full max-h-full object-contain" style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }} /></div>
                  <div className="text-right leading-tight text-[9.5px]">
                    <h1 className="text-xs font-bold uppercase tracking-wider">PT. TRANSINDO MULTI INDUSTRI</h1>
                    <p>www.transindomu.com</p><p>Jl. Rawa Bengkok Kp. Koong Parigi, Perum Aryatama Regency 1 Blok E, No 14</p><p>Kelurahan Bedahan, Sawangan, Depok, Jawa Barat 16514</p><p>Phone : (+62) 8516 3657 641 email : sales@transindomu.com</p>
                  </div>
                </div>
                <div className="text-center my-1.5"><h2 className="text-sm font-bold uppercase tracking-widest border-b border-black pb-0.5 inline-block w-full">{printConfig.type === "QO" ? "QUOTATION" : "PURCHASE ORDER"}</h2></div>
                <div className="grid grid-cols-2 gap-3 border-b border-black pb-2 mb-3 text-[10.5px]">
                  <div className="space-y-0.5">
                    <div className="flex"><span className="w-16 font-semibold">{printConfig.type === "PO" ? "From" : "To"}</span><span className="flex-1 truncate">: {printConfig.type === "PO" ? "PT. TRANSINDO MULTI INDUSTRI" : printConfig.group.customer}</span></div>
                    <div className="flex"><span className="w-16 font-semibold">Address</span><span className="flex-1 leading-none">: {printForm.address || "-"}</span></div>
                    <div className="flex pt-1"><span className="w-16 font-semibold">Subject</span><span className="flex-1 truncate">: {printForm.subject || "-"}</span></div>
                    <div className="flex"><span className="w-16 font-semibold">Contact</span><span className="flex-1 truncate">: {printForm.contact || "-"}</span></div>
                  </div>
                  <div className="space-y-0.5 pl-3 border-l border-gray-300">
                    <div className="flex"><span className="w-24 font-semibold">{printConfig.type === "QO" ? "QO Number" : "PO Number"}</span><span>: {printForm.docNumber}</span></div>
                    <div className="flex"><span className="w-24 font-semibold">Date</span><span>: {new Date().toISOString().split('T')[0].replace(/-/g, '/')}</span></div>
                    <div className="flex"><span className="w-24 font-semibold">Page</span><span>: 1 of 1</span></div>
                    <div className="flex"><span className="w-24 font-semibold">Shipment</span><span>: {printForm.shipment || "-"}</span></div>
                  </div>
                </div>
                <div className="w-full break-inside-avoid">
                  <table className={`w-full border-collapse border border-black mb-0 ${isCompact ? 'text-[9.5px]' : 'text-[10.5px]'}`}>
                    <thead>
                      <tr className="bg-blue-100/50 text-left font-semibold">
                        <th className={`border border-black w-8 text-center ${isCompact ? 'py-1 px-1' : 'py-1.5 px-1.5'}`}>No</th>
                        <th className={`border border-black w-1/4 ${isCompact ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>Description Item</th>
                        <th className={`border border-black ${isCompact ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>Technical Spec</th>
                        <th className={`border border-black w-16 text-center ${isCompact ? 'py-1 px-1' : 'py-1.5 px-1.5'}`}>Qty</th>
                        {printConfig.type === "QO" && (
                          <><th className={`border border-black w-24 text-right ${isCompact ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>Unit Price</th><th className={`border border-black w-28 text-right ${isCompact ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>Total Price</th></>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {[...printConfig.group.items].sort((a, b) => calcTotal(b.price, b.margin || 0, b.qty) - calcTotal(a.price, a.margin || 0, a.qty)).map((item, idx) => (
                        <tr key={item.id || idx} className="align-top">
                          <td className={`border-x border-black text-center ${isCompact ? 'py-1 px-1' : 'py-1.5 px-1.5'}`}>{idx + 1}</td>
                          <td className={`border-x border-black ${isCompact ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}><div className="font-semibold leading-snug break-words">{item.description || item.mother_part || "General Part"}</div></td>
                          <td className={`border-x border-black ${isCompact ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}><div className="leading-snug text-gray-800 break-words">{item.technical_specification || "-"}</div></td>
                          <td className={`border-x border-black text-center whitespace-nowrap ${isCompact ? 'py-1 px-1' : 'py-1.5 px-1.5'}`}>{item.qty} {item.unit || "EA"}</td>
                          {printConfig.type === "QO" && (
                            <>
                              <td className={`border-x border-black text-right whitespace-nowrap ${isCompact ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>Rp{(item.price + (item.price * (item.margin || 0) / 100)).toLocaleString("id-ID")}</td>
                              <td className={`border-x border-black text-right font-semibold whitespace-nowrap ${isCompact ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>Rp{calcTotal(item.price, item.margin || 0, item.qty).toLocaleString("id-ID")}</td>
                            </>
                          )}
                        </tr>
                      ))}
                      {!isCompact && <tr className="h-4"><td className="border-x border-black"></td><td className="border-x border-black"></td><td className="border-x border-black"></td><td className="border-x border-black"></td>{printConfig.type === "QO" && <><td className="border-x border-black"></td><td className="border-x border-black"></td></>}</tr>}
                    </tbody>
                  </table>
                  {printConfig.type === "QO" && (
                    <div className="border border-t-0 border-black mb-3">
                      <div className={`flex justify-between items-center bg-blue-100/50 border-t border-black font-bold ${isCompact ? 'p-1 text-[9.5px]' : 'p-1.5 text-[10.5px]'}`}><span className="w-full text-right pr-4">Sub Total</span><span className="w-32 text-right">Rp{printConfig.group.total_cost.toLocaleString("id-ID")}</span></div>
                      <div className={`bg-blue-50/50 border-t border-black space-y-0.5 ${isCompact ? 'p-1 text-[9px]' : 'p-1.5 text-[10px]'}`}>
                        <div className="flex justify-between font-semibold"><span className="w-full text-right pr-4">Sub Total (Product, Material, Service) :</span><span className="w-32 text-right">Rp{printConfig.group.total_cost.toLocaleString("id-ID")}</span></div>
                        <div className="flex justify-between font-bold text-[10.5px] pt-0.5 border-t border-gray-300"><span className="w-full text-right pr-4">Grand Total :</span><span className="w-32 text-right">Rp{printConfig.group.total_cost.toLocaleString("id-ID")}</span></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="break-inside-avoid mt-2 pt-1">
                <div className="flex justify-between items-start gap-4 my-2">
                  <div className="flex-1 space-y-0.5 text-[9.5px] leading-tight">
                    <h3 className="font-bold">Term & Condition :</h3>
                    <ol className="list-decimal pl-3 space-y-0.5">{printForm.terms.split('\n').map((term, index) => term.trim() !== "" && <li key={index}>{term}</li>)}</ol>
                  </div>
                  <div className="text-center w-48 shrink-0">
                    <p className="font-bold mb-1 text-[10.5px]">Approved By</p>
                    <div className={isCompact ? "h-12" : "h-16"}></div>
                    <p className="font-bold underline uppercase border-t border-black pt-0.5 text-[10.5px]">{printForm.director || "Damita"}</p>
                    <p className="font-bold text-[9.5px]">Project Manager</p>
                  </div>
                </div>
                <div className="mt-2 text-center text-[8.5px] font-bold tracking-tight text-gray-600 border-t border-gray-200 pt-1">* Dokumen ini dicetak dari sistem TRANSINDO MULTI INDUSTRI, <br />* Dokumen ini sah dan berlaku sebagai bukti transaksi.</div>
              </div>
            </div>
          </>
        );
      })()}
    </>
  );
}
