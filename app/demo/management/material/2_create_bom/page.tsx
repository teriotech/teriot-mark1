"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  PlusCircle,
  X,
  Package,
  Layers,
  Search,
  Building,
  Box,
  Edit,
  Printer,
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
  technical_specification?: string; // Ditambahkan
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
  technical_specification: string; // Ditambahkan
  qty: number | string;
  unit: string;
  price: number | string;
  margin: number | string;
  markup: number | string;
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
        className="w-full bg-white border border-slate-300 text-slate-900 px-3 py-2 rounded-lg cursor-pointer flex justify-between items-center focus:border-blue-500 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate text-xs text-slate-700">
          {displayValue || placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-slate-400" />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-2xl max-h-60 flex flex-col overflow-hidden">
          <div className="p-2 border-b border-slate-200 bg-slate-50 sticky top-0">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                className="w-full bg-white border border-slate-300 text-slate-900 pl-8 pr-3 py-2 rounded-md text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
                  className="px-3 py-2.5 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer truncate transition-colors"
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
              <div className="px-3 py-4 text-xs text-slate-500 text-center">
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

export default function CreateBomPage() {
  const [bomGroups, setBomGroups] = useState<BomGroup[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedCustomers, setExpandedCustomers] = useState<Record<string, boolean>>({});

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [masterMaterials, setMasterMaterials] = useState<MasterMaterial[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [customerName, setCustomerName] = useState<string>("");
  // Project Name is intentionally blank for every new BOM.
  // It is required because a BOM now creates its Project automatically.
  const [projectName, setProjectName] = useState<string>("");
  const [motherParts, setMotherParts] = useState<FormMotherPart[]>([]);

  // State untuk Edit & Print
  const [editingCustomer, setEditingCustomer] = useState<string | null>(null);
  const [originalItemIds, setOriginalItemIds] = useState<number[]>([]);
  const [printGroup, setPrintGroup] = useState<BomGroup | null>(null);

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
            const qty = Number(item.qty) || 0;
            const markup = price * (margin / 100) * qty;
            const totalPrice = (price * qty) + markup;
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
    setEditingCustomer(null);
    setOriginalItemIds([]);
    setCustomerName("");
    setProjectName("");
    setMotherParts([]);
    setIsModalOpen(true);
  };

  const handleEditBom = (group: BomGroup, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCustomer(group.customer);
    setOriginalItemIds(group.items.map((i) => i.id));
    setCustomerName(group.customer);
    setProjectName("");

    const mpMap: Record<string, FormChildPart[]> = {};
    group.items.forEach((item) => {
      if (!mpMap[item.mother_part]) mpMap[item.mother_part] = [];
      
      const matchedMaterial = masterMaterials.find(m => m.part_number === item.part_number);

      mpMap[item.mother_part].push({
        id: `cp-${Date.now()}-${Math.random()}`,
        material_id: matchedMaterial?.id,
        part_number: item.part_number,
        description: item.description || "",
        technical_specification: item.technical_specification || matchedMaterial?.technical_specification || "", // Ditambahkan
        qty: item.qty,
        unit: item.unit || "Pcs",
        price: item.price,
        margin: item.margin || "",
        markup: item.markup || 0,
      });
    });

    const reconstructed: FormMotherPart[] = Object.keys(mpMap).map((mpName, idx) => ({
      id: `mp-${Date.now()}-${idx}`,
      mother_part_name: mpName,
      children: mpMap[mpName],
    }));

    setMotherParts(reconstructed);
    setIsModalOpen(true);
  };

  const handleDeleteBom = async (group: BomGroup, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Apakah Anda yakin ingin menghapus seluruh BOM untuk Customer: ${group.customer}?`)) {
      return;
    }

    try {
      const deleteRequests = group.items.map((item) =>
        fetch(`/api/management/create_bom?id=${item.id}`, { method: "DELETE" })
      );
      await Promise.all(deleteRequests);
      alert("BOM berhasil dihapus.");
      fetchBomList();
    } catch (err) {
      console.error("Gagal menghapus BOM:", err);
      alert("Terjadi kesalahan saat menghapus BOM.");
    }
  };

  const handlePrintPdf = (group: BomGroup, e: React.MouseEvent) => {
    e.stopPropagation();
    setPrintGroup(group);
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
      technical_specification: "", // Ditambahkan
      qty: "", 
      unit: "Pcs",
      price: 0,
      margin: "", 
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
                    technical_specification: mat.technical_specification || "", // Ditambahkan
                    qty: mat.qty > 0 ? mat.qty : "",
                    unit: mat.unit || "Pcs",
                    price: Number(mat.price) || 0,
                    margin: mat.margin ? Number(mat.margin) : "",
                    markup: 0, 
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
      const markup = price * (margin / 100) * qty;
      const totalPrice = (price * qty) + markup;
      return sum + totalPrice;
    }, 0);
  };

  const handleFinishBom = async () => {
    if (!customerName.trim()) {
      alert("Nama Customer tidak boleh kosong.");
      return;
    }

    // A new BOM creates a Project at the BOM & Design stage.
    // Existing BOM edits do not create a duplicate Project.
    if (!editingCustomer && !projectName.trim()) {
      alert("Project Name tidak boleh kosong.");
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

        if (!ch.qty || Number(ch.qty) <= 0) {
          alert(`Qty untuk Part '${ch.part_number}' tidak boleh kosong atau 0.`);
          return;
        }

        const basePrice = Number(ch.price) || 0;
        const margin = Number(ch.margin) || 0;
        const qty = Number(ch.qty);
        const calculatedMarkup = basePrice * (margin / 100) * qty;

        payloadItems.push({
          customer: customerName.trim(),
          mother_part: mp.mother_part_name.trim(),
          part_number: ch.part_number.trim(),
          description: ch.description?.trim() || "",
          technical_specification: ch.technical_specification?.trim() || "", // Ditambahkan ke Payload
          qty: qty,
          unit: ch.unit?.trim() || "Pcs",
          price: basePrice,
          margin: margin,
          markup: calculatedMarkup,
        });
      }
    }

    setIsSubmitting(true);
    try {
      if (editingCustomer && originalItemIds.length > 0) {
        const deleteRequests = originalItemIds.map((id) =>
          fetch(`/api/management/create_bom?id=${id}`, { method: "DELETE" })
        );
        await Promise.all(deleteRequests);
      }

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

      // New BOM -> automatically create the matching Project through the
      // existing Project Management API. The project enters at BOM & Design
      // because this BOM is the triggering workflow stage.
      if (!editingCustomer) {
        const projectResponse = await fetch("/api/management/project", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_name: projectName.trim(),
            client_company: customerName.trim(),
            current_stage: "bom_design",
            status: "In Progress",
            stage_notes: {
              bom_design: {
                notes: "Project created automatically from BOM creation.",
              },
            },
          }),
        });

        if (!projectResponse.ok) {
          const errorData = await projectResponse.json().catch(() => ({}));
          throw new Error(
            errorData.message || "BOM tersimpan, tetapi Project gagal dibuat."
          );
        }
      }

      alert(
        editingCustomer
          ? "BOM Berhasil Diperbarui!"
          : "BOM Berhasil Dibuat dan Project berhasil dibuat."
      );
      setIsModalOpen(false);
      fetchBomList();
    } catch (err: any) {
      console.error("Gagal menyimpan BOM / Project:", err);
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
      <div className="min-h-screen bg-slate-50 text-slate-900 p-6 font-sans print:hidden">
        <div className="w-full space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                <Layers className="w-8 h-8 text-blue-600" />
                Bill of Materials (BOM) Management
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Kelola struktur hirarki material (Mother Part & Child Part) per Customer.
              </p>
            </div>

            <button
              onClick={handleOpenModal}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-md shadow-blue-500/20 transition-all duration-200"
            >
              <Plus className="w-5 h-5" />
              Create BOM
            </button>
          </div>

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

          {isLoading ? (
            <div className="text-center py-12 text-slate-500">Loading BOM data...</div>
          ) : filteredBomGroups.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
              <Box className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Belum ada BOM yang dibuat.</p>
              <p className="text-slate-400 text-sm mt-1">
                Klik tombol &quot;Create BOM&quot; untuk menambahkan data baru.
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

                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => handlePrintPdf(group, e)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Export PDF"
                          >
                            <Printer className="w-5 h-5" />
                          </button>
                          <button
                            onClick={(e) => handleEditBom(group, e)}
                            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit BOM"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteBom(group, e)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Delete BOM"
                          >
                            <Trash2 className="w-5 h-5" />
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
                          const subTotal = children.reduce((sum, item) => {
                            const price = Number(item.price) || 0;
                            const margin = Number(item.margin) || 0;
                            const qty = Number(item.qty) || 0;
                            const markup = price * (margin / 100) * qty;
                            const totalPrice = (price * qty) + markup;
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
                                      <th className="px-4 py-2.5 text-right">Total Markup</th>
                                      <th className="px-4 py-2.5 text-right">Total Price</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-200">
                                    {children.map((child) => {
                                      const basePrice = Number(child.price) || 0;
                                      const margin = Number(child.margin) || 0;
                                      const qty = Number(child.qty) || 0;
                                      const markup = basePrice * (margin / 100) * qty;
                                      const totalPrice = (basePrice * qty) + markup;

                                      // Ambil Technical Spec dari data BOM atau fallback ke masterMaterials
                                      const matchedMaterial = masterMaterials.find(m => m.part_number === child.part_number);
                                      const techSpec = child.technical_specification || matchedMaterial?.technical_specification || "-";

                                      return (
                                        <tr key={child.id} className="hover:bg-slate-50">
                                          <td className="px-4 py-2.5 font-medium text-slate-900">
                                            {child.part_number}
                                          </td>
                                          <td className="px-4 py-2.5">{child.description || "-"}</td>
                                          <td className="px-4 py-2.5">{techSpec}</td>
                                          <td className="px-4 py-2.5">
                                            {child.qty} {child.unit}
                                          </td>
                                          <td className="px-4 py-2.5 text-right">
                                            Rp {basePrice.toLocaleString("id-ID")}
                                          </td>
                                          <td className="px-4 py-2.5 text-right">{margin}%</td>
                                          <td className="px-4 py-2.5 text-right">
                                            Rp {markup.toLocaleString("id-ID")}
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

        {/* POP-UP MODAL: CREATE / EDIT BOM */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-[95vw] max-h-[95vh] flex flex-col shadow-2xl overflow-hidden my-auto">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                    <Layers className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {editingCustomer ? "Edit Bill of Materials" : "Create Bill of Materials"}
                  </h2>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-500 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 overflow-auto flex-1 space-y-6">
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

                  {!editingCustomer && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                          Project Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Masukkan nama project"
                          value={projectName}
                          onChange={(e) => setProjectName(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                        />
                        <p className="text-[11px] text-slate-500 mt-1.5">
                          Dikosongkan secara default. Project akan dibuat otomatis saat BOM disimpan.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                          Project Company
                        </label>
                        <input
                          type="text"
                          value={customerName}
                          readOnly
                          className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed"
                        />
                        <p className="text-[11px] text-slate-500 mt-1.5">
                          Otomatis sama dengan Nama Customer / judul BOM.
                        </p>
                      </div>
                    </div>
                  )}
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
                            <div className="flex items-center justify-between mb-2">
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
                              <div className="space-y-3 pb-2">
                                {mp.children.map((child, childIdx) => {
                                  // Kalkulasi Otomatis
                                  const basePrice = Number(child.price) || 0;
                                  const margin = Number(child.margin) || 0;
                                  const qty = Number(child.qty) || 0;
                                  
                                  const calculatedMarkup = basePrice * (margin / 100) * qty;
                                  const totalPrice = (basePrice * qty) + calculatedMarkup;

                                  return (
                                    <div
                                      key={child.id}
                                      style={{ zIndex: mp.children.length - childIdx }}
                                      className="relative flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs min-w-max transition-all"
                                    >
                                      {/* Material Select */}
                                      <div className="w-64 flex-shrink-0">
                                        <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Master Material</label>
                                        <SearchableSelect
                                          options={masterMaterials}
                                          value={child.material_id}
                                          onChange={(val) => handleSelectMaterialForChild(mp.id, child.id, val)}
                                          placeholder="-- Cari Material --"
                                        />
                                      </div>

                                      {/* Description */}
                                      <div className="w-40 flex-shrink-0">
                                        <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Description</label>
                                        <input
                                          type="text"
                                          value={child.description}
                                          onChange={(e) => updateChildField(mp.id, child.id, "description", e.target.value)}
                                          placeholder="Deskripsi Material"
                                          className="w-full bg-white border border-slate-300 text-slate-900 px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                        />
                                      </div>

                                      {/* Technical Spec (Ditambahkan) */}
                                      <div className="w-40 flex-shrink-0">
                                        <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Tech Spec</label>
                                        <input
                                          type="text"
                                          value={child.technical_specification}
                                          onChange={(e) => updateChildField(mp.id, child.id, "technical_specification", e.target.value)}
                                          placeholder="Spesifikasi Teknis"
                                          className="w-full bg-white border border-slate-300 text-slate-900 px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                        />
                                      </div>

                                      {/* Qty */}
                                      <div className="w-20 flex-shrink-0">
                                        <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Qty</label>
                                        <input
                                          type="number"
                                          min="1"
                                          value={child.qty}
                                          onChange={(e) => updateChildField(mp.id, child.id, "qty", e.target.value)}
                                          className="w-full bg-white border border-slate-300 text-slate-900 px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                        />
                                      </div>

                                      {/* Unit */}
                                      <div className="w-20 flex-shrink-0">
                                        <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Unit</label>
                                        <input
                                          type="text"
                                          value={child.unit}
                                          onChange={(e) => updateChildField(mp.id, child.id, "unit", e.target.value)}
                                          className="w-full bg-white border border-slate-300 text-slate-900 px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                        />
                                      </div>

                                      {/* Base Price */}
                                      <div className="w-32 flex-shrink-0">
                                        <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Base Price (Rp)</label>
                                        <input
                                          type="number"
                                          value={child.price}
                                          onChange={(e) => updateChildField(mp.id, child.id, "price", e.target.value)}
                                          className="w-full bg-white border border-slate-300 text-slate-900 px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                        />
                                      </div>

                                      {/* Margin */}
                                      <div className="w-20 flex-shrink-0">
                                        <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Margin (%)</label>
                                        <input
                                          type="number"
                                          value={child.margin}
                                          onChange={(e) => updateChildField(mp.id, child.id, "margin", e.target.value)}
                                          className="w-full bg-white border border-slate-300 text-slate-900 px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                        />
                                      </div>

                                      {/* Markup (Read Only) */}
                                      <div className="w-32 flex-shrink-0">
                                        <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Total Markup (Rp)</label>
                                        <input
                                          type="number"
                                          value={calculatedMarkup}
                                          readOnly
                                          className="w-full bg-slate-100 border border-slate-200 text-slate-500 px-3 py-2 rounded-lg cursor-not-allowed focus:outline-none"
                                        />
                                      </div>

                                      {/* Total Price Display */}
                                      <div className="w-36 flex-shrink-0 flex flex-col justify-end pb-1">
                                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Total Price</span>
                                        <span className="font-bold text-emerald-600 text-sm">Rp {totalPrice.toLocaleString("id-ID")}</span>
                                      </div>

                                      {/* Delete Button */}
                                      <div className="w-10 flex-shrink-0 flex items-end justify-center pb-1">
                                        <button
                                          type="button"
                                          onClick={() => removeChildPart(mp.id, child.id)}
                                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-slate-200 rounded-lg transition-colors"
                                          title="Hapus Child Part"
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
                  {isSubmitting ? "Menyimpan..." : "Finish & Save BOM"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- TAMPILAN CETAK / EXPORT PDF --- */}
      {printGroup && (
        <div className="hidden print:block bg-white text-black p-8 font-sans">
          <div className="flex items-center border-b-4 border-black pb-4 mb-6">
            <div className="w-24 h-24 bg-gray-200 flex items-center justify-center font-bold text-gray-500 border border-gray-400">
              LOGO
            </div>
            <div className="ml-6">
              <h1 className="text-3xl font-bold uppercase tracking-wide">PT. MOCKUP PERUSAHAAN STANDARD</h1>
              <p className="text-sm mt-1">Jl. Contoh Alamat Perusahaan No. 123, Gedung Perkantoran, Jakarta 12345</p>
              <p className="text-sm">Telp: (021) 1234567 | Email: info@mockup-perusahaan.com | Web: www.mockup-perusahaan.com</p>
            </div>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold underline uppercase">Bill of Materials (BOM)</h2>
            <p className="text-sm mt-2"><strong>Customer:</strong> {printGroup.customer}</p>
            <p className="text-sm"><strong>Tanggal:</strong> {new Date().toLocaleDateString("id-ID")}</p>
          </div>

          <table className="w-full border-collapse border border-black text-sm mb-8">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-black p-2 text-left">Mother Part</th>
                <th className="border border-black p-2 text-left">Part Number</th>
                <th className="border border-black p-2 text-left">Description</th>
                <th className="border border-black p-2 text-left">Technical Spec</th>
                <th className="border border-black p-2 text-center">Qty</th>
                <th className="border border-black p-2 text-right">Unit Price (Rp)</th>
                <th className="border border-black p-2 text-right">Total Price (Rp)</th>
              </tr>
            </thead>
            <tbody>
              {printGroup.items.map((item, idx) => {
                const unitPriceWithMargin = item.price + (item.price * (item.margin || 0) / 100);
                const totalPrice = unitPriceWithMargin * item.qty;
                
                // Ambil Technical Spec dari data BOM atau fallback ke masterMaterials
                const matchedMaterial = masterMaterials.find(m => m.part_number === item.part_number);
                const techSpec = item.technical_specification || matchedMaterial?.technical_specification || "-";

                return (
                  <tr key={item.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="border border-black p-2">{item.mother_part}</td>
                    <td className="border border-black p-2 font-semibold">{item.part_number}</td>
                    <td className="border border-black p-2">{item.description || "-"}</td>
                    <td className="border border-black p-2">{techSpec}</td>
                    <td className="border border-black p-2 text-center">{item.qty} {item.unit}</td>
                    <td className="border border-black p-2 text-right">{unitPriceWithMargin.toLocaleString("id-ID")}</td>
                    <td className="border border-black p-2 text-right font-semibold">{totalPrice.toLocaleString("id-ID")}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-200 font-bold">
                <td colSpan={6} className="border border-black p-2 text-right">GRAND TOTAL ESTIMATION</td>
                <td className="border border-black p-2 text-right">Rp {printGroup.total_cost.toLocaleString("id-ID")}</td>
              </tr>
            </tfoot>
          </table>

          <div className="flex justify-between mt-12 text-sm">
            <div className="w-1/2 pr-8">
              <h3 className="font-bold mb-2 underline">Terms & Conditions:</h3>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Harga yang tertera dapat berubah sewaktu-waktu tanpa pemberitahuan sebelumnya.</li>
                <li>Estimasi biaya di atas belum termasuk pajak (PPN 11%).</li>
                <li>Dokumen ini sah dan diakui sebagai penawaran/estimasi resmi dari perusahaan.</li>
                <li>Pembayaran dilakukan sesuai dengan termin yang telah disepakati bersama.</li>
              </ol>
            </div>
            <div className="w-1/3 text-center">
              <p className="mb-20">Jakarta, {new Date().toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p className="font-bold underline">Nama Penanggung Jawab</p>
              <p>Direktur Utama</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}