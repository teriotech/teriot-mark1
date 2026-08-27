"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Plus,
  ChevronDown,
  ChevronRight,
  PlusCircle,
  X,
  Package,
  Layers,
  Search,
  Building,
  Box,
  FileText,
  ShoppingCart,
  Printer,
  Trash2,
} from "lucide-react";

// Interface Master Material (Untuk Dropdown Pilihan)
interface MasterMaterial {
  id: number;
  customer?: string;
  mother_part?: string;
  part_number: string;
  description?: string;
  technical_specification?: string;
  qty: number;
  unit?: string;
  margin?: number;
  price: number;
  price_margin?: number;
  supplier?: string;
  markup?: number;
  date_updated?: string;
}

// Interface Item BOM dari tabel create_bom (Untuk List BOM)
interface BomItem {
  id: number;
  customer: string;
  mother_part: string;
  part_number: string;
  description?: string;
  technical_specification?: string;
  qty: number;
  unit?: string;
  price: number;
  margin?: number;
  markup?: number;
  created_at?: string;
  updated_at?: string;
}

// Interface Child Item di dalam Form Pop-up
interface FormChildPart {
  id: string;
  material_id?: number;
  part_number: string;
  description: string;
  technical_specification: string;
  qty: number;
  unit: string;
  price: number;
  margin: number;
  markup: number;
}

// Interface Mother Part di dalam Form Pop-up
interface FormMotherPart {
  id: string;
  mother_part_name: string;
  children: FormChildPart[];
}

// Interface Data BOM yang tersimpan (Grouping)
interface BomGroup {
  customer: string;
  date_created: string;
  total_mother_parts: number;
  total_items: number;
  total_cost: number;
  items: BomItem[];
}

// Tipe untuk konfigurasi Print (QO atau PO)
type PrintType = "QO" | "PO";

// --- KOMPONEN KUSTOM: SEARCHABLE DROPDOWN ---
const SearchableSelect = ({
  options,
  value,
  onChange,
  placeholder,
}: {
  options: MasterMaterial[];
  value: number | undefined;
  onChange: (val: string) => void;
  placeholder: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt) => {
    const searchString = `${opt.part_number} ${opt.technical_specification || ""} ${opt.description || ""}`.toLowerCase();
    return searchString.includes(search.toLowerCase());
  });

  const selectedOpt = options.find((o) => o.id === value);
  const displayValue = selectedOpt
    ? `${selectedOpt.part_number} - ${selectedOpt.technical_specification || selectedOpt.description || "No Spec"}`
    : "";

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div
        className="w-full bg-white border border-slate-300 text-slate-900 px-2 py-1.5 rounded cursor-pointer flex justify-between items-center focus:border-blue-500 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate text-xs text-slate-700">
          {displayValue || placeholder}
        </span>
        <ChevronDown className="w-3 h-3 text-slate-400" />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 flex flex-col overflow-hidden">
          <div className="p-2 border-b border-slate-200 bg-slate-50 sticky top-0">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
              <input
                type="text"
                className="w-full bg-white border border-slate-300 text-slate-900 pl-7 pr-2 py-1.5 rounded text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
                  className="px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer truncate transition-colors"
                  onClick={() => {
                    onChange(opt.id.toString());
                    setIsOpen(false);
                    setSearch("");
                  }}
                >
                  <span className="font-semibold text-blue-600">{opt.part_number}</span> - {opt.technical_specification || opt.description || "No Spec"}
                </div>
              ))
            ) : (
              <div className="px-3 py-3 text-xs text-slate-500 text-center">
                Material tidak ditemukan
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
// --- END KOMPONEN KUSTOM ---

export default function QoPoManagementPage() {
  const [bomGroups, setBomGroups] = useState<BomGroup[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedCustomers, setExpandedCustomers] = useState<Record<string, boolean>>({});

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [masterMaterials, setMasterMaterials] = useState<MasterMaterial[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [customerName, setCustomerName] = useState<string>("");
  const [motherParts, setMotherParts] = useState<FormMotherPart[]>([]);

  // State Print menyimpan data grup dan tipe cetakan (QO atau PO)
  const [printConfig, setPrintConfig] = useState<{ group: BomGroup; type: PrintType } | null>(null);
  
  // State untuk Pop-up Print Settings
  const [isPrintSettingsOpen, setIsPrintSettingsOpen] = useState<boolean>(false);
  
  // State Form Print
  const [printAddress, setPrintAddress] = useState<string>("");
  const [printSubject, setPrintSubject] = useState<string>("");
  const [printContact, setPrintContact] = useState<string>("");
  const [printShipment, setPrintShipment] = useState<string>("");
  const [printDocNumber, setPrintDocNumber] = useState<string>("");
  
  const [printTerms, setPrintTerms] = useState<string>(
    "Harga yang tertera dapat berubah sewaktu-waktu tanpa pemberitahuan sebelumnya.\nEstimasi biaya di atas belum termasuk pajak (PPN 11%).\nDokumen ini sah dan diakui sebagai penawaran/estimasi resmi dari perusahaan.\nPembayaran dilakukan sesuai dengan termin yang telah disepakati bersama."
  );
  const [printDirector, setPrintDirector] = useState<string>("");
  const [printAccounting, setPrintAccounting] = useState<string>("");

  useEffect(() => {
    fetchBomList();
    fetchMasterMaterials();
  }, []);

  const fetchBomList = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/management/create_bom");
      const contentType = res.headers.get("content-type");
      if (!res.ok || !contentType || !contentType.includes("application/json")) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

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
          
          const totalCost = items.reduce((sum, item) => {
            const price = Number(item.price) || 0;
            const margin = Number(item.margin) || 0;
            const qty = Number(item.qty) || 1;
            // Kalkulasi Total Price = qty * (base price + (base price * margin %))
            const totalPrice = qty * (price + (price * margin / 100));
            return sum + totalPrice;
          }, 0);

          return {
            customer: cust,
            date_created: items[0]?.created_at || new Date().toISOString(),
            total_mother_parts: motherPartSet.size,
            total_items: items.length,
            total_cost: totalCost,
            items: items,
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
      if (Array.isArray(result.data)) {
        setMasterMaterials(result.data);
      }
    } catch (err) {
      console.error("Gagal mengambil data Master Material:", err);
    }
  };

  const handleOpenModal = () => {
    setCustomerName("");
    setMotherParts([]);
    setIsModalOpen(true);
  };

  // --- FITUR EXPORT PDF (QO & PO) DENGAN POP-UP SETTINGS ---
  const handleOpenPrintSettings = (group: BomGroup, type: PrintType, e: React.MouseEvent) => {
    e.stopPropagation();
    setPrintConfig({ group, type });
    
    // Generate Auto Number (Format: QO/PO + MM + YY + 3 Digit Random)
    const date = new Date();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    setPrintDocNumber(`${type}${month}${year}${randomNum}`);
    
    // Reset field opsional
    setPrintAddress("");
    setPrintSubject("");
    setPrintContact("");
    setPrintShipment("");
    
    setIsPrintSettingsOpen(true);
  };

  const executePrint = () => {
    setIsPrintSettingsOpen(false);
    // Beri waktu React untuk merender komponen print dan menutup modal sebelum memanggil window.print
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const addMotherPart = () => {
    if (!customerName.trim()) {
      alert("Silakan masukkan Nama Customer terlebih dahulu.");
      return;
    }
    const newMother: FormMotherPart = {
      id: `mp-${Date.now()}-${Math.random()}`,
      mother_part_name: `Mother Part #${motherParts.length + 1}`,
      children: [],
    };
    setMotherParts([...motherParts, newMother]);
  };

  const updateMotherPartName = (mpId: string, name: string) => {
    setMotherParts(
      motherParts.map((mp) => (mp.id === mpId ? { ...mp, mother_part_name: name } : mp))
    );
  };

  const removeMotherPart = (mpId: string) => {
    setMotherParts(motherParts.filter((mp) => mp.id !== mpId));
  };

  const addChildPart = (mpId: string) => {
    const newChild: FormChildPart = {
      id: `cp-${Date.now()}-${Math.random()}`,
      part_number: "",
      description: "",
      technical_specification: "",
      qty: 1,
      unit: "Pcs",
      price: 0,
      margin: 0,
      markup: 0,
    };

    setMotherParts(
      motherParts.map((mp) => {
        if (mp.id === mpId) {
          return { ...mp, children: [...mp.children, newChild] };
        }
        return mp;
      })
    );
  };

  const handleSelectMaterialForChild = (mpId: string, childId: string, materialIdVal: string) => {
    const mat = masterMaterials.find((m) => m.id === Number(materialIdVal));

    setMotherParts(
      motherParts.map((mp) => {
        if (mp.id === mpId) {
          return {
            ...mp,
            children: mp.children.map((ch) => {
              if (ch.id === childId) {
                if (mat) {
                  return {
                    ...ch,
                    material_id: mat.id,
                    part_number: mat.part_number,
                    description: mat.description || "",
                    technical_specification: mat.technical_specification || "",
                    qty: mat.qty > 0 ? mat.qty : 1,
                    unit: mat.unit || "Pcs",
                    price: Number(mat.price) || 0,
                    margin: Number(mat.margin) || 0,
                    markup: Number(mat.markup) || 0,
                  };
                }
                return { ...ch, material_id: undefined, part_number: "", description: "", technical_specification: "" };
              }
              return ch;
            }),
          };
        }
        return mp;
      })
    );
  };

  const updateChildField = (
    mpId: string,
    childId: string,
    field: keyof FormChildPart,
    val: any
  ) => {
    setMotherParts(
      motherParts.map((mp) => {
        if (mp.id === mpId) {
          return {
            ...mp,
            children: mp.children.map((ch) =>
              ch.id === childId ? { ...ch, [field]: val } : ch
            ),
          };
        }
        return mp;
      })
    );
  };

  const removeChildPart = (mpId: string, childId: string) => {
    setMotherParts(
      motherParts.map((mp) => {
        if (mp.id === mpId) {
          return { ...mp, children: mp.children.filter((ch) => ch.id !== childId) };
        }
        return mp;
      })
    );
  };

  const calculateMotherPartCost = (children: FormChildPart[]) => {
    return children.reduce((sum, ch) => {
      const price = Number(ch.price) || 0;
      const margin = Number(ch.margin) || 0;
      const qty = Number(ch.qty) || 0;
      // Kalkulasi Total Price = qty * (base price + (base price * margin %))
      const totalPrice = qty * (price + (price * margin / 100));
      return sum + totalPrice;
    }, 0);
  };

  const handleFinishBom = async () => {
    if (!customerName.trim()) {
      alert("Nama Customer tidak boleh kosong.");
      return;
    }

    if (motherParts.length === 0) {
      alert("Tambahkan setidaknya satu Mother Part.");
      return;
    }

    const payloadItems: any[] = [];

    for (const mp of motherParts) {
      if (!mp.mother_part_name.trim()) {
        alert("Nama Mother Part tidak boleh kosong.");
        return;
      }

      if (mp.children.length === 0) {
        alert(`Mother Part '${mp.mother_part_name}' tidak memiliki Child Part.`);
        return;
      }

      for (const ch of mp.children) {
        if (!ch.part_number.trim()) {
          alert(`Pilih atau isi Part Number untuk Child Part di '${mp.mother_part_name}'.`);
          return;
        }

        payloadItems.push({
          customer: customerName.trim(),
          mother_part: mp.mother_part_name.trim(),
          part_number: ch.part_number.trim(),
          description: ch.description?.trim() || "",
          technical_specification: ch.technical_specification?.trim() || "",
          qty: Number(ch.qty) || 1,
          unit: ch.unit?.trim() || "Pcs",
          price: Number(ch.price) || 0,
          margin: Number(ch.margin) || 0,
          // Kalkulasi Markup = base price * margin * qty
          markup: Number(ch.price) * (Number(ch.margin) / 100) * (Number(ch.qty) || 1),
        });
      }
    }

    setIsSubmitting(true);
    try {
      const requests = payloadItems.map(async (item) => {
        const res = await fetch("/api/management/create_bom", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
        });
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || `Gagal menyimpan part: ${item.part_number}`);
        }
        return res.json();
      });

      await Promise.all(requests);

      alert("Data Berhasil Dibuat dan Tersimpan!");
      setIsModalOpen(false);
      fetchBomList();
    } catch (err: any) {
      console.error("Gagal menyimpan data:", err);
      alert(`Terjadi kesalahan saat menyimpan data:\n${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleCustomerExpand = (customer: string) => {
    setExpandedCustomers((prev) => ({
      ...prev,
      [customer]: !prev[customer],
    }));
  };

  const filteredBomGroups = bomGroups.filter((group) =>
    group.customer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { 
            size: A4 portrait;
            margin: 0; /* Menghilangkan header/footer bawaan browser */
          }
          body { 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact;
            background-color: white !important;
          }
          /* Sembunyikan SEMUA elemen di halaman */
          body * {
            visibility: hidden;
          }
          /* Tampilkan HANYA area cetak dan anak-anaknya */
          #print-area, #print-area * {
            visibility: visible;
          }
          /* Posisikan area cetak di paling atas kiri kertas secara absolut */
          #print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            /* Padding disesuaikan agar mepet ke atas dan muat 1 page */
            padding: 0.5cm 1cm !important; 
            box-sizing: border-box;
            background-color: white;
          }
          /* HAPUS 'div' dari sini agar tidak membatalkan position: absolute pada #print-area */
          html, body, main {
            height: auto !important;
            overflow: visible !important;
            position: static !important;
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `}} />

      {/* --- TAMPILAN UTAMA (Disembunyikan saat Print) --- */}
      <div className="min-h-screen bg-slate-50 text-slate-900 p-6 font-sans print:hidden">
        <div className="w-full space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                <Layers className="w-8 h-8 text-blue-600" />
                Quotation & Purchase Order Generator
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Generate dokumen QO / PO per Customer berdasarkan data BOM.
              </p>
            </div>

            <button
              onClick={handleOpenModal}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-md shadow-blue-500/20 transition-all duration-200"
            >
              <Plus className="w-5 h-5" />
              Create New
            </button>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari berdasarkan nama customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Daftar BOM / QO / PO */}
          {isLoading ? (
            <div className="text-center py-12 text-slate-500">Loading data...</div>
          ) : filteredBomGroups.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
              <Box className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Belum ada data yang dibuat.</p>
              <p className="text-slate-400 text-sm mt-1">
                Klik tombol &quot;Create New&quot; untuk menambahkan data baru.
              </p>
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
                  <div
                    key={group.customer}
                    className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden transition-all duration-200"
                  >
                    <div
                      onClick={() => toggleCustomerExpand(group.customer)}
                      className="p-5 flex flex-col md:flex-row md:items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors gap-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-600">
                          <Building className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            {group.customer}
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Total {group.total_mother_parts} Mother Parts • {group.total_items} Items
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 md:gap-6">
                        <div className="text-right hidden sm:block">
                          <span className="text-xs text-slate-500 block">Estimated Total Cost</span>
                          <span className="text-lg font-bold text-emerald-600">
                            Rp {group.total_cost.toLocaleString("id-ID")}
                          </span>
                        </div>

                        {/* Action Buttons (Hanya Export QO & PO) */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => handleOpenPrintSettings(group, "QO", e)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Generate Quotation (QO)"
                          >
                            <FileText className="w-5 h-5" />
                          </button>
                          <button
                            onClick={(e) => handleOpenPrintSettings(group, "PO", e)}
                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Generate Purchase Order (PO)"
                          >
                            <ShoppingCart className="w-5 h-5" />
                          </button>
                          <div className="p-2 bg-slate-100 rounded-lg text-slate-600 ml-2">
                            {isExpanded ? (
                              <ChevronDown className="w-5 h-5" />
                            ) : (
                              <ChevronRight className="w-5 h-5" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-slate-200 bg-slate-50 p-5 space-y-6">
                        {Object.keys(motherPartMap).map((mpName) => {
                          const children = motherPartMap[mpName];
                          
                          // Urutkan berdasarkan Total Price tertinggi
                          const sortedChildren = [...children].sort((a, b) => {
                            const totalA = (Number(a.qty) || 1) * ((Number(a.price) || 0) + ((Number(a.price) || 0) * (Number(a.margin) || 0) / 100));
                            const totalB = (Number(b.qty) || 1) * ((Number(b.price) || 0) + ((Number(b.price) || 0) * (Number(b.margin) || 0) / 100));
                            return totalB - totalA;
                          });

                          const subTotal = sortedChildren.reduce((sum, item) => {
                            const price = Number(item.price) || 0;
                            const margin = Number(item.margin) || 0;
                            const qty = Number(item.qty) || 1;
                            const totalPrice = qty * (price + (price * margin / 100));
                            return sum + totalPrice;
                          }, 0);

                          return (
                            <div
                              key={mpName}
                              className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm"
                            >
                              <div className="bg-slate-100 px-4 py-3 flex items-center justify-between border-b border-slate-200">
                                <div className="flex items-center gap-2 text-blue-700 font-semibold">
                                  <Package className="w-4 h-4" />
                                  <span>Mother Part: {mpName}</span>
                                </div>
                                <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                                  Subtotal: Rp {subTotal.toLocaleString("id-ID")}
                                </span>
                              </div>

                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs text-slate-700">
                                  <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
                                    <tr>
                                      <th className="px-4 py-2.5">Part Number</th>
                                      <th className="px-4 py-2.5">Description</th>
                                      <th className="px-4 py-2.5">Technical Spec</th>
                                      <th className="px-4 py-2.5">Qty / Unit</th>
                                      <th className="px-4 py-2.5 text-right">Base Price</th>
                                      <th className="px-4 py-2.5 text-right">Margin (%)</th>
                                      <th className="px-4 py-2.5 text-right">Markup</th>
                                      <th className="px-4 py-2.5 text-right">Total Price</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-200">
                                    {sortedChildren.map((child) => {
                                      const basePrice = Number(child.price) || 0;
                                      const margin = Number(child.margin) || 0;
                                      const qty = Number(child.qty) || 1;
                                      
                                      // Kalkulasi Markup = base price * margin * qty
                                      const calculatedMarkup = basePrice * (margin / 100) * qty;
                                      // Kalkulasi Total Price = qty * (base price + (base price * margin %))
                                      const totalPrice = qty * (basePrice + (basePrice * margin / 100));

                                      return (
                                        <tr key={child.id} className="hover:bg-slate-50">
                                          <td className="px-4 py-2.5 font-medium text-slate-900">
                                            {child.part_number}
                                          </td>
                                          <td className="px-4 py-2.5">{child.description || "-"}</td>
                                          <td className="px-4 py-2.5">{child.technical_specification || "-"}</td>
                                          <td className="px-4 py-2.5">
                                            {child.qty} {child.unit}
                                          </td>
                                          <td className="px-4 py-2.5 text-right">
                                            Rp {basePrice.toLocaleString("id-ID")}
                                          </td>
                                          <td className="px-4 py-2.5 text-right">{margin}%</td>
                                          <td className="px-4 py-2.5 text-right">
                                            Rp {calculatedMarkup.toLocaleString("id-ID")}
                                          </td>
                                          <td className="px-4 py-2.5 text-right font-medium text-emerald-600">
                                            Rp {totalPrice.toLocaleString("id-ID")}
                                          </td>
                                        </tr>
                                      );
                                    })}
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

        {/* POP-UP MODAL: PRINT SETTINGS */}
        {isPrintSettingsOpen && printConfig && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl flex flex-col shadow-2xl overflow-hidden my-auto">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                    <Printer className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Pengaturan Cetak {printConfig.type === "QO" ? "Quotation" : "Purchase Order"}
                  </h2>
                </div>
                <button
                  onClick={() => setIsPrintSettingsOpen(false)}
                  className="text-slate-500 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                {/* Metadata Dokumen */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Address</label>
                    <input
                      type="text"
                      placeholder="Kosongkan jika tidak ada"
                      value={printAddress}
                      onChange={(e) => setPrintAddress(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Subject</label>
                    <input
                      type="text"
                      placeholder="Kosongkan jika tidak ada"
                      value={printSubject}
                      onChange={(e) => setPrintSubject(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Contact</label>
                    <input
                      type="text"
                      placeholder="Kosongkan jika tidak ada"
                      value={printContact}
                      onChange={(e) => setPrintContact(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Shipment</label>
                    <input
                      type="text"
                      placeholder="Kosongkan jika tidak ada"
                      value={printShipment}
                      onChange={(e) => setPrintShipment(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Terms & Conditions */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Terms & Conditions (Pisahkan dengan Enter untuk list angka)
                  </label>
                  <textarea
                    rows={4}
                    value={printTerms}
                    onChange={(e) => setPrintTerms(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Checked by (Accounting/Purchasing)
                    </label>
                    <input
                      type="text"
                      placeholder="Kosongkan jika ingin ditulis tangan"
                      value={printAccounting}
                      onChange={(e) => setPrintAccounting(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Approved by (Director)
                    </label>
                    <input
                      type="text"
                      placeholder="Kosongkan jika ingin ditulis tangan"
                      value={printDirector}
                      onChange={(e) => setPrintDirector(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsPrintSettingsOpen(false)}
                  className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={executePrint}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Generate PDF
                </button>
              </div>
            </div>
          </div>
        )}

        {/* POP-UP MODAL: CREATE NEW */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-[95vw] max-h-[95vh] flex flex-col shadow-2xl overflow-hidden my-auto">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                    <Layers className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">Create New Data</h2>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-500 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Nama Customer <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Masukkan Nama Customer (Contoh: PT. Astra Honda Motor)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>

                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Package className="w-5 h-5 text-blue-600" />
                    Mother & Child Parts Structure
                  </h3>
                  <button
                    type="button"
                    onClick={addMotherPart}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-sm text-blue-600 font-medium transition-colors"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Tambah Mother Part
                  </button>
                </div>

                {motherParts.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                    <p className="text-slate-500 text-sm">
                      Belum ada Mother Part. Klik &quot;Tambah Mother Part&quot; di atas untuk memulai.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {motherParts.map((mp, mpIdx) => {
                      const motherCost = calculateMotherPartCost(mp.children);

                      return (
                        <div
                          key={mp.id}
                          className="bg-white border border-slate-200 shadow-sm rounded-xl p-5 space-y-4"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                            <div className="flex items-center gap-3 flex-1">
                              <span className="text-xs font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                #{mpIdx + 1}
                              </span>
                              <input
                                type="text"
                                value={mp.mother_part_name}
                                onChange={(e) => updateMotherPartName(mp.id, e.target.value)}
                                placeholder="Nama Mother Part (Contoh: Main Frame Assembly)"
                                className="bg-white border border-slate-300 px-3 py-1.5 rounded text-sm text-slate-900 font-semibold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 flex-1"
                              />
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <span className="text-[10px] text-slate-500 block uppercase">
                                  Subtotal Cost
                                </span>
                                <span className="text-sm font-bold text-emerald-600">
                                  Rp {motherCost.toLocaleString("id-ID")}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => removeMotherPart(mp.id)}
                                className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-200"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="pl-2 sm:pl-4 border-l-2 border-slate-200 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Child Parts Selection
                              </span>
                              <button
                                type="button"
                                onClick={() => addChildPart(mp.id)}
                                className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Tambah Child Part
                              </button>
                            </div>

                            {mp.children.length === 0 ? (
                              <p className="text-xs text-slate-500 italic py-2">
                                Belum ada child part di dalam mother part ini.
                              </p>
                            ) : (
                              <div className="space-y-3 overflow-x-auto pb-2">
                                {mp.children.map((child) => {
                                  // Kalkulasi Total Price = qty * (base price + (base price * margin %))
                                  const totalPrice = child.qty * (child.price + (child.price * child.margin / 100));
                                  // Kalkulasi Markup = base price * margin * qty
                                  const calculatedMarkup = child.price * (child.margin / 100) * child.qty;

                                  return (
                                    <div
                                      key={child.id}
                                      className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs min-w-max"
                                    >
                                      {/* Material Select */}
                                      <div className="w-48 flex-shrink-0">
                                        <label className="block text-[10px] text-slate-500 mb-1">Master Material</label>
                                        <SearchableSelect
                                          options={masterMaterials}
                                          value={child.material_id}
                                          onChange={(val) => handleSelectMaterialForChild(mp.id, child.id, val)}
                                          placeholder="-- Cari Material --"
                                        />
                                      </div>

                                      {/* Description */}
                                      <div className="w-32 flex-shrink-0">
                                        <label className="block text-[10px] text-slate-500 mb-1">Description</label>
                                        <input
                                          type="text"
                                          value={child.description}
                                          onChange={(e) => updateChildField(mp.id, child.id, "description", e.target.value)}
                                          placeholder="Deskripsi"
                                          className="w-full bg-white border border-slate-300 text-slate-900 px-2 py-1.5 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        />
                                      </div>

                                      {/* Technical Spec */}
                                      <div className="w-32 flex-shrink-0">
                                        <label className="block text-[10px] text-slate-500 mb-1">Tech Spec</label>
                                        <input
                                          type="text"
                                          value={child.technical_specification}
                                          onChange={(e) => updateChildField(mp.id, child.id, "technical_specification", e.target.value)}
                                          placeholder="Spesifikasi"
                                          className="w-full bg-white border border-slate-300 text-slate-900 px-2 py-1.5 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        />
                                      </div>

                                      {/* Qty */}
                                      <div className="w-16 flex-shrink-0">
                                        <label className="block text-[10px] text-slate-500 mb-1">Qty</label>
                                        <input
                                          type="number"
                                          min="1"
                                          value={child.qty}
                                          onChange={(e) => updateChildField(mp.id, child.id, "qty", Number(e.target.value))}
                                          className="w-full bg-white border border-slate-300 text-slate-900 px-2 py-1.5 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        />
                                      </div>

                                      {/* Unit */}
                                      <div className="w-16 flex-shrink-0">
                                        <label className="block text-[10px] text-slate-500 mb-1">Unit</label>
                                        <input
                                          type="text"
                                          value={child.unit}
                                          onChange={(e) => updateChildField(mp.id, child.id, "unit", e.target.value)}
                                          className="w-full bg-white border border-slate-300 text-slate-900 px-2 py-1.5 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        />
                                      </div>

                                      {/* Base Price */}
                                      <div className="w-24 flex-shrink-0">
                                        <label className="block text-[10px] text-slate-500 mb-1">Base Price (Rp)</label>
                                        <input
                                          type="number"
                                          value={child.price}
                                          onChange={(e) => updateChildField(mp.id, child.id, "price", Number(e.target.value))}
                                          className="w-full bg-white border border-slate-300 text-slate-900 px-2 py-1.5 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        />
                                      </div>

                                      {/* Margin */}
                                      <div className="w-16 flex-shrink-0">
                                        <label className="block text-[10px] text-slate-500 mb-1">Margin (%)</label>
                                        <input
                                          type="number"
                                          value={child.margin}
                                          onChange={(e) => updateChildField(mp.id, child.id, "margin", Number(e.target.value))}
                                          className="w-full bg-white border border-slate-300 text-slate-900 px-2 py-1.5 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        />
                                      </div>

                                      {/* Markup (Read Only) */}
                                      <div className="w-24 flex-shrink-0">
                                        <label className="block text-[10px] text-slate-500 mb-1">Markup (Rp)</label>
                                        <input
                                          type="number"
                                          value={calculatedMarkup}
                                          readOnly
                                          className="w-full bg-slate-100 border border-slate-200 text-slate-500 px-2 py-1.5 rounded cursor-not-allowed focus:outline-none"
                                        />
                                      </div>

                                      {/* Total Price Display */}
                                      <div className="w-28 flex-shrink-0 flex flex-col justify-end pb-1">
                                        <span className="text-[10px] text-slate-500">Total Price</span>
                                        <span className="font-bold text-emerald-600">Rp {totalPrice.toLocaleString("id-ID")}</span>
                                      </div>

                                      {/* Delete Button */}
                                      <div className="w-10 flex-shrink-0 flex items-end justify-center pb-1">
                                        <button
                                          type="button"
                                          onClick={() => removeChildPart(mp.id, child.id)}
                                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-200 rounded transition-colors"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
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

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleFinishBom}
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan..." : "Finish & Save"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- TAMPILAN CETAK / EXPORT PDF (Hanya muncul saat di-print) --- */}
      {printConfig && (
        <div id="print-area" className="hidden print:block bg-white text-black font-sans w-full text-xs">
          {/* KOP Perusahaan */}
          <div className="flex justify-between items-start border-b-2 border-black pb-2 mb-4">
            {/* Logo Perusahaan */}
            <div className="w-48 h-16 flex items-center">
              <img 
                src="/image/teriot.png" 
                alt="TERIOT Logo" 
                loading="eager"
                className="max-w-full max-h-full object-contain"
                style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
              />
            </div>
            {/* Detail Informasi Perusahaan Header Right */}
            <div className="text-right leading-snug">
              <h1 className="text-base font-bold uppercase tracking-wider">PT. TERIOT DIGITAL TECHNOLOGY</h1>
              <p>www.teriot.id</p>
              <p>Aurelia Ruko No G33</p>
              <p>Bekasi, Jawa Barat 17320</p>
              <p>Phone : (+62) 8516 3657 641 email : sales@teriot.id</p>
            </div>
          </div>

          {/* Judul Dokumen */}
          <div className="text-center my-3">
            <h2 className="text-lg font-bold uppercase tracking-widest border-b border-black pb-1 inline-block w-full">
              {printConfig.type === "QO" ? "QUOTATION" : "PURCHASE ORDER"}
            </h2>
          </div>

          {/* Section Informasi Metadata Dokumen (Two Column Header) */}
          <div className="grid grid-cols-2 gap-4 border-b border-black pb-3 mb-4">
            {/* Sisi Kiri: Detail Customer */}
            <div className="space-y-1">
              <div className="flex">
                <span className="w-20 font-semibold">{printConfig.type === "PO" ? "From" : "To"}</span>
                <span>: {printConfig.type === "PO" ? "PT. TERIOT TECHNOLOGY" : printConfig.group.customer}</span>
              </div>
              <div className="flex">
                <span className="w-20 font-semibold">Address</span>
                <span className="flex-1">: {printAddress || "-"}</span>
              </div>
              <div className="flex pt-2">
                <span className="w-20 font-semibold">Subject</span>
                <span>: {printSubject || "-"}</span>
              </div>
              <div className="flex">
                <span className="w-20 font-semibold">Contact</span>
                <span>: {printContact || "-"}</span>
              </div>
            </div>

            {/* Sisi Kanan: Metadata Transaksi */}
            <div className="space-y-1 pl-4 border-l border-gray-300">
              <div className="flex">
                <span className="w-28 font-semibold">{printConfig.type === "QO" ? "QO Number" : "PO Number"}</span>
                <span>: {printDocNumber}</span>
              </div>
              <div className="flex">
                <span className="w-28 font-semibold">Date</span>
                <span>: {new Date().toISOString().split('T')[0].replace(/-/g, '/')}</span>
              </div>
              <div className="flex">
                <span className="w-28 font-semibold">Page</span>
                <span>: 1</span>
              </div>
              <div className="flex">
                <span className="w-28 font-semibold">Shipment</span>
                <span>: {printShipment || "-"}</span>
              </div>
            </div>
          </div>

          {/* Tabel Data Items */}
          <table className="w-full border-collapse border border-black mb-0">
            <thead>
              <tr className="bg-blue-100/50 text-left">
                <th className="border border-black p-1.5 w-10 text-center font-semibold">No</th>
                <th className="border border-black p-1.5 font-semibold">Description Item</th>
                <th className="border border-black p-1.5 w-20 text-center font-semibold">Qty</th>
                {printConfig.type === "QO" && (
                  <>
                    <th className="border border-black p-1.5 w-32 text-right font-semibold">Unit Price</th>
                    <th className="border border-black p-1.5 w-36 text-right font-semibold">Total Price</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {/* Urutkan item berdasarkan Total Price tertinggi ke terendah */}
              {[...printConfig.group.items]
                .sort((a, b) => {
                  const totalA = (Number(a.qty) || 1) * ((Number(a.price) || 0) + ((Number(a.price) || 0) * (Number(a.margin) || 0) / 100));
                  const totalB = (Number(b.qty) || 1) * ((Number(b.price) || 0) + ((Number(b.price) || 0) * (Number(b.margin) || 0) / 100));
                  return totalB - totalA;
                })
                .map((item, idx) => {
                  const unitPriceWithMargin = item.price + (item.price * (item.margin || 0) / 100);
                  const totalPrice = unitPriceWithMargin * item.qty;
                  
                  // PERBAIKAN: Format Description - Technical Spec agar lebih aman
                  const descParts = [];
                  if (item.description) descParts.push(item.description);
                  if (item.technical_specification) descParts.push(item.technical_specification);
                  
                  const displayDescription = descParts.length > 0 
                    ? descParts.join(" - ") 
                    : item.mother_part || "General Part";

                  return (
                    <tr key={item.id || idx} className="align-top">
                      <td className="border-x border-black p-1.5 text-center">{idx + 1}</td>
                      <td className="border-x border-black p-1.5">
                        <div className="font-semibold">{displayDescription}</div>
                      </td>
                      <td className="border-x border-black p-1.5 text-center">
                        {item.qty} {item.unit || "EA"}
                      </td>
                      {printConfig.type === "QO" && (
                        <>
                          <td className="border-x border-black p-1.5 text-right">
                            Rp{unitPriceWithMargin.toLocaleString("id-ID")}
                          </td>
                          <td className="border-x border-black p-1.5 text-right font-semibold">
                            Rp{totalPrice.toLocaleString("id-ID")}
                          </td>
                        </>
                      )}
                    </tr>
                  );
              })}
              {/* Spacer Baris Kosong untuk menjaga tinggi tabel */}
              <tr className="h-8">
                <td className="border-x border-black"></td>
                <td className="border-x border-black"></td>
                <td className="border-x border-black"></td>
                {printConfig.type === "QO" && (
                  <>
                    <td className="border-x border-black"></td>
                    <td className="border-x border-black"></td>
                  </>
                )}
              </tr>
            </tbody>
          </table>

          {/* Section Total & Summary (Hanya Muncul di QO) */}
          {printConfig.type === "QO" && (
            <div className="border border-t-0 border-black mb-6">
              <div className="flex justify-between items-center bg-blue-100/50 border-t border-black p-1.5 font-bold">
                <span className="w-full text-right pr-4">Sub Total</span>
                <span className="w-36 text-right">Rp{printConfig.group.total_cost.toLocaleString("id-ID")}</span>
              </div>
              <div className="bg-blue-50/50 border-t border-black p-2 space-y-1">
                <div className="flex justify-between font-semibold">
                  <span className="w-full text-right pr-4">Sub Total (Product, Material, Service) :</span>
                  <span className="w-36 text-right">Rp{printConfig.group.total_cost.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span className="w-full text-right pr-4">Discount % :</span>
                  <span className="w-36 text-right">0</span>
                </div>
                <div className="flex justify-between font-bold text-sm pt-1 border-t border-gray-300">
                  <span className="w-full text-right pr-4">Grand Total :</span>
                  <span className="w-36 text-right">Rp{printConfig.group.total_cost.toLocaleString("id-ID")}</span>
                </div>
              </div>
            </div>
          )}

          {/* Terms & Conditions Section */}
          <div className="mb-8 space-y-1 leading-tight">
            <h3 className="font-bold mb-1">Term & Condition :</h3>
            <ol className="list-decimal pl-4 space-y-1">
              {printTerms.split('\n').map((term, index) => (
                term.trim() !== "" && <li key={index}>{term}</li>
              ))}
            </ol>
          </div>

          {/* Tanda Tangan & Stamp Supplier */}
          <div className="flex justify-between items-end mt-8 mb-4">
            {/* Approved By */}
            <div className="text-center w-48">
              <p className="font-bold mb-2">Approved By</p>
              <div className="h-24 flex items-center justify-center">
                <img 
                  src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://teriot.id" 
                  alt="Barcode teriot.id" 
                  className="w-16 h-16 object-contain" 
                />
              </div>
              <p className="font-bold underline uppercase border-t border-black pt-1">{printDirector || "Damita"}</p>
              <p className="font-bold text-[10px]">Director</p>
            </div>

            {/* Checked By */}
            <div className="text-center w-48">
              <p className="font-bold mb-2">Checked By</p>
              <div className="h-24 flex items-center justify-center">
                <img 
                  src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://teriot.id" 
                  alt="Barcode teriot.id" 
                  className="w-16 h-16 object-contain" 
                />
              </div>
              <p className="font-bold border-t border-black pt-1">{printAccounting || "Revalgi"}</p>
              <p className="text-[10px]">Purchasing</p>
            </div>

            {/* Supplier Box */}
            <div className="border border-dashed border-gray-500 w-64 h-28 flex flex-col justify-between p-2 text-center text-gray-500">
              <span className="font-semibold text-xs uppercase tracking-wider">Customer</span>
              <span className="text-[10px] uppercase tracking-widest">COMPANY NAME & STAMP</span>
            </div>
          </div>

          {/* Footer Document Note */}
          <div className="mt-8 text-center text-[10px] font-bold tracking-tight text-gray-700">
            * Dokumen ini dicetak dari sistem TERIOT DIGITAL TECHNOLOGY, <br />
            * Dokumen ini sah dan berlaku sebagai bukti transaksi.
          </div>
        </div>
      )}
    </>
  );
}