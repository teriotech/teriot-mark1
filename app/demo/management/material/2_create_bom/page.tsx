"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
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
  CheckSquare,
  ListPlus,
  FolderKanban,
  Check,
  Copy,
  Database,
  PenLine,
  ClipboardPaste,
  Users,
  Wallet,
  FileText,
} from "lucide-react";

// ================= INTERFACES =================
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

interface BomItem {
  id: number;
  bom_code?: string | null;
  customer: string;
  project_name?: string | null;
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

type ChildSource = "master" | "manual";

interface FormChildPart {
  id: string;
  source: ChildSource;
  material_id?: number;
  part_number: string;
  description: string;
  technical_specification: string;
  qty: number | string;
  unit: string;
  price: number | string;
  margin: number | string;
  markup: number | string;
}

interface FormMotherPart {
  id: string;
  mother_part_name: string;
  children: FormChildPart[];
}

interface ManualRow {
  id: string;
  part_number: string;
  description: string;
  technical_specification: string;
  qty: number | string;
  unit: string;
  price: number | string;
  margin: number | string;
}

interface BomGroup {
  groupKey: string;
  bomCode: string | null;
  customer: string;
  projectName: string;
  date_created: string;
  total_mother_parts: number;
  total_items: number;
  total_cost: number;
  items: BomItem[];
}

interface ProjectOption {
  id?: number | string;
  project_name: string;
  client_company: string;
  status?: string;
}

// ================= HELPERS =================
const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const calcLine = (price: any, margin: any, qty: any) => {
  const p = Number(price) || 0;
  const m = Number(margin) || 0;
  const q = Number(qty) || 0;
  const markup = p * (m / 100) * q;
  return { markup, total: p * q + markup };
};

const formatRp = (n: any) => `Rp ${(Number(n) || 0).toLocaleString("id-ID")}`;

// Parsing angka dari paste Excel (support format 1.250.000 / 1,250,000 / 12,5 / Rp 10.000)
const parseNum = (v: any): number | "" => {
  let s = String(v ?? "").replace(/[^\d.,-]/g, "");
  if (!s) return "";
  if (s.includes(",") && s.includes(".")) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (s.includes(",")) {
    s = /,\d{3}$/.test(s) ? s.replace(/,/g, "") : s.replace(",", ".");
  } else if ((s.match(/\./g) || []).length > 1 || /\.\d{3}$/.test(s)) {
    s = s.replace(/\./g, "");
  }
  const n = Number(s);
  return isNaN(n) ? "" : n;
};

// Kode unik per BOM -> BOM dengan Customer sama tetap terpisah
const generateBomCode = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(
    d.getMinutes()
  )}${pad(d.getSeconds())}`;
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `BOM-${stamp}-${rand}`;
};

// Normalisasi response API project (tahan terhadap beda struktur / nama field)
const normalizeProjects = (raw: any): ProjectOption[] => {
  const arr: any[] = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.data)
    ? raw.data
    : Array.isArray(raw?.data?.data)
    ? raw.data.data
    : Array.isArray(raw?.projects)
    ? raw.projects
    : Array.isArray(raw?.rows)
    ? raw.rows
    : [];

  const seen = new Set<string>();
  return arr
    .map((p) => ({
      id: p.id ?? p.project_id,
      project_name: String(p.project_name ?? p.projectName ?? p.name ?? p.title ?? "").trim(),
      client_company: String(p.client_company ?? p.clientCompany ?? p.customer ?? p.company ?? p.client ?? "").trim(),
      status: String(p.status ?? ""),
    }))
    .filter((p) => {
      if (!p.project_name) return false;
      if (p.status.toLowerCase() === "drop") return false;
      const key = p.project_name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const blankManualRow = (): ManualRow => ({
  id: uid("mr"),
  part_number: "",
  description: "",
  technical_specification: "",
  qty: 1,
  unit: "Pcs",
  price: "",
  margin: "",
});

// Cegah angka berubah saat scroll mouse di input number
const blurOnWheel = (e: React.WheelEvent<HTMLInputElement>) => (e.target as HTMLInputElement).blur();

// ================= STYLE TOKENS =================
const cellInput =
  "w-full h-9 bg-white border border-slate-300 text-slate-900 px-2.5 rounded-md text-xs placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors";
const cellInputRight = `${cellInput} text-right tabular-nums`;
const labelCls = "block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5";

const CHILD_COLS: { key: string; label: string; w: number; align?: "left" | "right" | "center" }[] = [
  { key: "no", label: "#", w: 44, align: "center" },
  { key: "src", label: "Source", w: 96 },
  { key: "pn", label: "Part Number", w: 250 },
  { key: "desc", label: "Description", w: 190 },
  { key: "spec", label: "Tech Spec", w: 190 },
  { key: "qty", label: "Qty", w: 76, align: "right" },
  { key: "unit", label: "Unit", w: 76 },
  { key: "price", label: "Base Price (Rp)", w: 130, align: "right" },
  { key: "margin", label: "Margin %", w: 84, align: "right" },
  { key: "markup", label: "Markup (Rp)", w: 120, align: "right" },
  { key: "total", label: "Total (Rp)", w: 136, align: "right" },
  { key: "act", label: "Aksi", w: 76, align: "center" },
];
const CHILD_TABLE_WIDTH = CHILD_COLS.reduce((s, c) => s + c.w, 0);

const MANUAL_COLS: { key: string; label: string; w: number; align?: "left" | "right" | "center" }[] = [
  { key: "no", label: "#", w: 40, align: "center" },
  { key: "pn", label: "Part Number *", w: 200 },
  { key: "desc", label: "Description", w: 200 },
  { key: "spec", label: "Tech Spec", w: 220 },
  { key: "qty", label: "Qty *", w: 80, align: "right" },
  { key: "unit", label: "Unit", w: 80 },
  { key: "price", label: "Base Price (Rp)", w: 140, align: "right" },
  { key: "margin", label: "Margin %", w: 90, align: "right" },
  { key: "total", label: "Total (Rp)", w: 130, align: "right" },
  { key: "act", label: "", w: 50, align: "center" },
];
const MANUAL_TABLE_WIDTH = MANUAL_COLS.reduce((s, c) => s + c.w, 0);

const alignCls = (a?: string) => (a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left");

// ================= SEARCHABLE SELECT (MATERIAL) - dropdown via portal agar tidak terpotong =================
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
  const [pos, setPos] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const updatePos = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = Math.max(r.width, 400);
    const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
    const spaceBelow = window.innerHeight - r.bottom;
    if (spaceBelow < 300 && r.top > spaceBelow) {
      setPos({ left, width, bottom: window.innerHeight - r.top + 4 });
    } else {
      setPos({ left, width, top: r.bottom + 4 });
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updatePos();
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || dropdownRef.current?.contains(t)) return;
      setIsOpen(false);
    };
    const onScroll = (e: Event) => {
      if (dropdownRef.current?.contains(e.target as Node)) return;
      updatePos();
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", updatePos);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [isOpen, updatePos]);

  const filteredOptions = useMemo(() => {
    const q = search.toLowerCase();
    return options
      .filter((opt) =>
        `${opt.part_number} ${opt.technical_specification || ""} ${opt.description || ""}`.toLowerCase().includes(q)
      )
      .slice(0, 300);
  }, [options, search]);

  const selectedOpt = options.find((o) => o.id === value);
  const displayValue = selectedOpt
    ? `${selectedOpt.part_number} - ${selectedOpt.technical_specification || selectedOpt.description || "No Spec"}`
    : "";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className={`w-full h-9 bg-white border text-left px-2.5 rounded-md flex justify-between items-center gap-2 transition-colors ${
          isOpen ? "border-blue-500 ring-1 ring-blue-500" : "border-slate-300 hover:border-slate-400"
        }`}
      >
        <span className={`truncate text-xs ${displayValue ? "text-slate-900 font-medium" : "text-slate-400"}`}>
          {displayValue || placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
      </button>

      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{ position: "fixed", zIndex: 100, ...pos }}
            className="bg-white border border-slate-200 rounded-lg shadow-2xl max-h-72 flex flex-col overflow-hidden"
          >
            <div className="p-2 border-b border-slate-200 bg-slate-50">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  className="w-full bg-white border border-slate-300 text-slate-900 pl-8 pr-3 py-2 rounded-md text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Cari Part Number / Spec / Deskripsi..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5 px-0.5">
                {filteredOptions.length} dari {options.length} material
              </p>
            </div>
            <div className="overflow-y-auto flex-1 py-1">
              {options.length === 0 ? (
                <div className="px-3 py-4 text-xs text-slate-500 text-center">
                  Master material kosong / API tidak tersedia. Gunakan mode <b>Manual</b>.
                </div>
              ) : filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => (
                  <div
                    key={opt.id}
                    className={`px-3 py-2 text-xs cursor-pointer flex items-center justify-between gap-3 transition-colors ${
                      opt.id === value ? "bg-blue-50" : "hover:bg-slate-50"
                    }`}
                    onClick={() => {
                      onChange(opt.id.toString());
                      setIsOpen(false);
                      setSearch("");
                    }}
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-blue-700 truncate">{opt.part_number}</p>
                      <p className="text-slate-500 truncate">
                        {opt.technical_specification || opt.description || "No Spec"}
                      </p>
                    </div>
                    <span className="text-[11px] text-slate-600 tabular-nums whitespace-nowrap">
                      {formatRp(opt.price)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="px-3 py-4 text-xs text-slate-500 text-center">Material tidak ditemukan</div>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

// ================= PROJECT COMBOBOX (PILIH EXISTING / KETIK BARU) =================
const ProjectCombobox = ({
  projects,
  value,
  onChange,
  onSelectExisting,
}: {
  projects: ProjectOption[];
  value: string;
  onChange: (val: string) => void;
  onSelectExisting: (proj: ProjectOption) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const keyword = value.trim().toLowerCase();
  const filtered = projects.filter(
    (p) =>
      !keyword || p.project_name.toLowerCase().includes(keyword) || p.client_company.toLowerCase().includes(keyword)
  );
  const exactMatch = projects.find((p) => p.project_name.toLowerCase() === keyword);

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <FolderKanban className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={value}
          placeholder="Pilih project existing atau ketik baru..."
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
            const match = projects.find((p) => p.project_name.toLowerCase() === e.target.value.trim().toLowerCase());
            if (match) onSelectExisting(match);
          }}
          className={`w-full h-10 pl-9 pr-10 bg-white border rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 transition-colors ${
            exactMatch
              ? "border-emerald-500 ring-1 ring-emerald-500 focus:border-emerald-500 focus:ring-emerald-500"
              : "border-slate-300 focus:border-blue-500 focus:ring-blue-500"
          }`}
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-[70] w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-2xl max-h-64 overflow-y-auto py-1">
          {projects.length === 0 && (
            <div className="px-3 py-3 text-xs text-slate-500 text-center">
              Tidak ada project dari API (/api/management/project).
            </div>
          )}
          {filtered.map((p) => (
            <div
              key={`${p.id ?? ""}-${p.project_name}`}
              onClick={() => {
                onChange(p.project_name);
                onSelectExisting(p);
                setIsOpen(false);
              }}
              className="px-3 py-2.5 text-xs cursor-pointer hover:bg-blue-50 flex items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <p className="font-semibold text-slate-900 truncate">{p.project_name}</p>
                <p className="text-slate-500 truncate">{p.client_company || "-"}</p>
              </div>
              {exactMatch?.project_name === p.project_name && <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
            </div>
          ))}
          {value.trim() && !exactMatch && (
            <div
              onClick={() => setIsOpen(false)}
              className="px-3 py-2.5 text-xs cursor-pointer border-t border-slate-100 text-blue-700 hover:bg-blue-50 flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              Buat project baru: <span className="font-semibold">{value.trim()}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ================= SMALL UI =================
const SourceBadge = ({ source, onClick }: { source: ChildSource; onClick?: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    title={onClick ? "Klik untuk ganti mode Master / Manual" : undefined}
    className={`inline-flex items-center gap-1 h-7 px-2 rounded-md text-[10px] font-bold uppercase tracking-wider border transition-colors ${
      source === "master"
        ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
        : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
    } ${onClick ? "cursor-pointer" : "cursor-default"}`}
  >
    {source === "master" ? <Database className="w-3 h-3" /> : <PenLine className="w-3 h-3" />}
    {source === "master" ? "Master" : "Manual"}
  </button>
);

// ================= PAGE =================
export default function CreateBomPage() {
  const [bomGroups, setBomGroups] = useState<BomGroup[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [masterMaterials, setMasterMaterials] = useState<MasterMaterial[]>([]);
  const [existingProjects, setExistingProjects] = useState<ProjectOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [customerName, setCustomerName] = useState<string>("");
  const [projectName, setProjectName] = useState<string>("");
  const [motherParts, setMotherParts] = useState<FormMotherPart[]>([]);
  const [collapsedMp, setCollapsedMp] = useState<Record<string, boolean>>({});

  // Edit & Print
  const [editingGroupKey, setEditingGroupKey] = useState<string | null>(null);
  const [editingBomCode, setEditingBomCode] = useState<string | null>(null);
  const [originalItemIds, setOriginalItemIds] = useState<number[]>([]);
  const [printGroup, setPrintGroup] = useState<BomGroup | null>(null);

  // Bulk Select (Master)
  const [bulkModal, setBulkModal] = useState<{ isOpen: boolean; mpId: string }>({ isOpen: false, mpId: "" });
  const [bulkSearch, setBulkSearch] = useState<string>("");
  const [bulkSelectedIds, setBulkSelectedIds] = useState<number[]>([]);

  // Manual Input
  const [manualModal, setManualModal] = useState<{ isOpen: boolean; mpId: string }>({ isOpen: false, mpId: "" });
  const [manualRows, setManualRows] = useState<ManualRow[]>([]);
  const [pasteText, setPasteText] = useState<string>("");
  const [showPaste, setShowPaste] = useState<boolean>(false);

  useEffect(() => {
    fetchBomList();
    fetchMasterMaterials();
    fetchExistingProjects();
  }, []);

  // ESC hanya menutup sub-modal (bulk / manual), bukan modal utama agar data tidak hilang
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (manualModal.isOpen) setManualModal({ isOpen: false, mpId: "" });
      else if (bulkModal.isOpen) setBulkModal({ isOpen: false, mpId: "" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [manualModal.isOpen, bulkModal.isOpen]);

  // ---------- FETCH ----------
  const fetchBomList = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/management/create_bom", { cache: "no-store" });
      const contentType = res.headers.get("content-type");
      if (!res.ok || !contentType || !contentType.includes("application/json")) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const result = await res.json();
      const rows: BomItem[] = Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];

      const grouped: Record<string, BomItem[]> = {};
      rows.forEach((item) => {
        const cust = item.customer || "Unassigned Customer";
        const groupKey = item.bom_code
          ? `code:${item.bom_code}`
          : `legacy:${cust}_${item.created_at ? String(item.created_at).substring(0, 16) : "unknown_time"}`;
        if (!grouped[groupKey]) grouped[groupKey] = [];
        grouped[groupKey].push(item);
      });

      const list: BomGroup[] = Object.keys(grouped).map((groupKey) => {
        const items = grouped[groupKey];
        const motherPartSet = new Set(items.map((i) => i.mother_part).filter(Boolean));
        const totalCost = items.reduce((sum, i) => sum + calcLine(i.price, i.margin, i.qty).total, 0);
        const earliest = items
          .map((i) => i.created_at)
          .filter(Boolean)
          .sort()[0];
        return {
          groupKey,
          bomCode: items[0]?.bom_code || null,
          customer: items[0]?.customer || "Unassigned Customer",
          projectName: items.find((i) => i.project_name)?.project_name || "",
          date_created: earliest || new Date().toISOString(),
          total_mother_parts: motherPartSet.size,
          total_items: items.length,
          total_cost: totalCost,
          items,
        };
      });

      list.sort((a, b) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime());
      setBomGroups(list);
    } catch (err) {
      console.error("Gagal mengambil data BOM:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMasterMaterials = async () => {
    try {
      const res = await fetch("/api/management/master_material", { cache: "no-store" });
      const result = await res.json();
      const rows = Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];
      setMasterMaterials(rows);
    } catch (err) {
      console.error("Gagal mengambil data Master Material:", err);
    }
  };

  const fetchExistingProjects = async () => {
    try {
      const res = await fetch("/api/management/project", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const result = await res.json();
      const projects = normalizeProjects(result);
      setExistingProjects(projects);
      if (projects.length === 0) {
        console.warn("Response /api/management/project tidak berisi project yang dikenali:", result);
      }
    } catch (err) {
      console.error("Gagal mengambil data Project:", err);
    }
  };

  // ---------- MODAL ----------
  const handleOpenModal = () => {
    setEditingGroupKey(null);
    setEditingBomCode(null);
    setOriginalItemIds([]);
    setCustomerName("");
    setProjectName("");
    setMotherParts([]);
    setCollapsedMp({});
    fetchExistingProjects();
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    const hasData = motherParts.some((mp) => mp.children.length > 0);
    if (hasData && !confirm("Perubahan yang belum disimpan akan hilang. Tutup form?")) return;
    setIsModalOpen(false);
  };

  const handleEditBom = (group: BomGroup, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingGroupKey(group.groupKey);
    setEditingBomCode(group.bomCode);
    setOriginalItemIds(group.items.map((i) => i.id));
    setCustomerName(group.customer);
    setProjectName(group.projectName || "");
    setCollapsedMp({});

    const mpMap: Record<string, FormChildPart[]> = {};
    group.items.forEach((item) => {
      const mpName = item.mother_part || "General Part";
      if (!mpMap[mpName]) mpMap[mpName] = [];
      const matched = masterMaterials.find((m) => m.part_number === item.part_number);
      mpMap[mpName].push({
        id: uid("cp"),
        source: matched ? "master" : "manual",
        material_id: matched?.id,
        part_number: item.part_number,
        description: item.description || "",
        technical_specification: item.technical_specification || matched?.technical_specification || "",
        qty: item.qty,
        unit: item.unit || "Pcs",
        price: item.price,
        margin: item.margin ?? "",
        markup: item.markup || 0,
      });
    });

    setMotherParts(
      Object.keys(mpMap).map((mpName) => ({
        id: uid("mp"),
        mother_part_name: mpName,
        children: mpMap[mpName],
      }))
    );
    fetchExistingProjects();
    setIsModalOpen(true);
  };

  const handleDeleteBom = async (group: BomGroup, e: React.MouseEvent) => {
    e.stopPropagation();
    const dateStr = new Date(group.date_created).toLocaleString("id-ID");
    if (!confirm(`Apakah Anda yakin ingin menghapus BOM ${group.bomCode || ""}\nCustomer: ${group.customer}\nDibuat: ${dateStr}?`)) {
      return;
    }
    try {
      await Promise.all(group.items.map((item) => fetch(`/api/management/create_bom?id=${item.id}`, { method: "DELETE" })));
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
    setTimeout(() => window.print(), 300);
  };

  // ---------- MOTHER / CHILD ----------
  const addMotherPart = () => {
    if (!customerName.trim()) {
      alert("Silakan masukkan Nama Customer terlebih dahulu.");
      return;
    }
    setMotherParts((prev) => [
      ...prev,
      { id: uid("mp"), mother_part_name: `Mother Part #${prev.length + 1}`, children: [] },
    ]);
  };

  const updateMotherPartName = (mpId: string, name: string) => {
    setMotherParts((prev) => prev.map((mp) => (mp.id === mpId ? { ...mp, mother_part_name: name } : mp)));
  };

  const removeMotherPart = (mp: FormMotherPart) => {
    if (mp.children.length > 0 && !confirm(`Hapus '${mp.mother_part_name}' beserta ${mp.children.length} child part?`)) return;
    setMotherParts((prev) => prev.filter((m) => m.id !== mp.id));
  };

  const toggleCollapseMp = (mpId: string) => setCollapsedMp((prev) => ({ ...prev, [mpId]: !prev[mpId] }));

  const setAllCollapsed = (collapsed: boolean) => {
    const next: Record<string, boolean> = {};
    motherParts.forEach((mp) => (next[mp.id] = collapsed));
    setCollapsedMp(next);
  };

  // Mode 2: 1 baris dari master material
  const addChildPart = (mpId: string) => {
    const newChild: FormChildPart = {
      id: uid("cp"),
      source: "master",
      part_number: "",
      description: "",
      technical_specification: "",
      qty: "",
      unit: "Pcs",
      price: 0,
      margin: "",
      markup: 0,
    };
    setMotherParts((prev) => prev.map((mp) => (mp.id === mpId ? { ...mp, children: [...mp.children, newChild] } : mp)));
    setCollapsedMp((prev) => ({ ...prev, [mpId]: false }));
  };

  const duplicateChildPart = (mpId: string, childId: string) => {
    setMotherParts((prev) =>
      prev.map((mp) => {
        if (mp.id !== mpId) return mp;
        const idx = mp.children.findIndex((c) => c.id === childId);
        if (idx < 0) return mp;
        const copy = { ...mp.children[idx], id: uid("cp") };
        const children = [...mp.children];
        children.splice(idx + 1, 0, copy);
        return { ...mp, children };
      })
    );
  };

  const toggleChildSource = (mpId: string, childId: string) => {
    setMotherParts((prev) =>
      prev.map((mp) =>
        mp.id !== mpId
          ? mp
          : {
              ...mp,
              children: mp.children.map((ch) => {
                if (ch.id !== childId) return ch;
                if (ch.source === "master") return { ...ch, source: "manual", material_id: undefined };
                const matched = masterMaterials.find((m) => m.part_number === ch.part_number);
                return { ...ch, source: "master", material_id: matched?.id };
              }),
            }
      )
    );
  };

  // ---------- MODE 1: BULK (MASTER) ----------
  const openBulkModal = (mpId: string) => {
    setBulkModal({ isOpen: true, mpId });
    setBulkSearch("");
    setBulkSelectedIds([]);
  };

  const filteredBulkMaterials = useMemo(() => {
    const q = bulkSearch.toLowerCase();
    return masterMaterials.filter((m) =>
      `${m.part_number} ${m.technical_specification || ""} ${m.description || ""}`.toLowerCase().includes(q)
    );
  }, [masterMaterials, bulkSearch]);

  const toggleBulkSelection = (materialId: number) => {
    setBulkSelectedIds((prev) => (prev.includes(materialId) ? prev.filter((id) => id !== materialId) : [...prev, materialId]));
  };

  const allFilteredSelected =
    filteredBulkMaterials.length > 0 && filteredBulkMaterials.every((m) => bulkSelectedIds.includes(m.id));

  const toggleSelectAllFiltered = () => {
    const ids = filteredBulkMaterials.map((m) => m.id);
    setBulkSelectedIds((prev) =>
      allFilteredSelected ? prev.filter((id) => !ids.includes(id)) : Array.from(new Set([...prev, ...ids]))
    );
  };

  const applyBulkSelection = () => {
    const selected = masterMaterials.filter((m) => bulkSelectedIds.includes(m.id));
    const newChildren: FormChildPart[] = selected.map((mat) => ({
      id: uid("cp"),
      source: "master",
      material_id: mat.id,
      part_number: mat.part_number,
      description: mat.description || "",
      technical_specification: mat.technical_specification || "",
      qty: Number(mat.qty) > 0 ? Number(mat.qty) : 1,
      unit: mat.unit || "Pcs",
      price: Number(mat.price) || 0,
      margin: mat.margin ? Number(mat.margin) : "",
      markup: 0,
    }));
    setMotherParts((prev) =>
      prev.map((mp) => (mp.id === bulkModal.mpId ? { ...mp, children: [...mp.children, ...newChildren] } : mp))
    );
    setCollapsedMp((prev) => ({ ...prev, [bulkModal.mpId]: false }));
    setBulkModal({ isOpen: false, mpId: "" });
  };

  // ---------- MODE 3: MANUAL INPUT (TANPA MASTER DATA) ----------
  const openManualModal = (mpId: string) => {
    setManualModal({ isOpen: true, mpId });
    setManualRows([blankManualRow(), blankManualRow(), blankManualRow()]);
    setPasteText("");
    setShowPaste(false);
  };

  const updateManualRow = (id: string, field: keyof ManualRow, val: any) => {
    setManualRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: val } : r)));
  };

  const addManualRow = () => setManualRows((prev) => [...prev, blankManualRow()]);

  const removeManualRow = (id: string) =>
    setManualRows((prev) => (prev.length <= 1 ? [blankManualRow()] : prev.filter((r) => r.id !== id)));

  const handleParsePaste = () => {
    const lines = pasteText
      .split(/\r?\n/)
      .map((l) => l.replace(/\s+$/, ""))
      .filter((l) => l.trim());
    if (lines.length === 0) {
      alert("Tidak ada data untuk diproses. Paste data dari Excel terlebih dahulu.");
      return;
    }
    const delim = lines[0].includes("\t") ? "\t" : lines[0].includes(";") ? ";" : ",";
    const start = /part|description|deskripsi|qty|spec/i.test(lines[0]) ? 1 : 0;

    const parsed: ManualRow[] = lines
      .slice(start)
      .map((line) => {
        const c = line.split(delim).map((s) => s.trim());
        return {
          ...blankManualRow(),
          part_number: c[0] || "",
          description: c[1] || "",
          technical_specification: c[2] || "",
          qty: parseNum(c[3]) || 1,
          unit: c[4] || "Pcs",
          price: parseNum(c[5]),
          margin: parseNum(c[6]),
        };
      })
      .filter((r) => r.part_number);

    if (parsed.length === 0) {
      alert("Format tidak dikenali. Pastikan kolom pertama adalah Part Number.");
      return;
    }
    setManualRows((prev) => [...prev.filter((r) => r.part_number.trim() || r.description.trim()), ...parsed]);
    setPasteText("");
    setShowPaste(false);
  };

  const validManualRows = manualRows.filter((r) => r.part_number.trim());

  const applyManualRows = () => {
    if (validManualRows.length === 0) {
      alert("Isi minimal 1 baris dengan Part Number.");
      return;
    }
    const badQty = validManualRows.find((r) => !r.qty || Number(r.qty) <= 0);
    if (badQty) {
      alert(`Qty untuk Part '${badQty.part_number}' tidak boleh kosong atau 0.`);
      return;
    }
    const newChildren: FormChildPart[] = validManualRows.map((r) => ({
      id: uid("cp"),
      source: "manual",
      material_id: undefined,
      part_number: r.part_number.trim(),
      description: r.description.trim(),
      technical_specification: r.technical_specification.trim(),
      qty: Number(r.qty),
      unit: r.unit.trim() || "Pcs",
      price: Number(r.price) || 0,
      margin: r.margin === "" ? "" : Number(r.margin) || 0,
      markup: 0,
    }));
    setMotherParts((prev) =>
      prev.map((mp) => (mp.id === manualModal.mpId ? { ...mp, children: [...mp.children, ...newChildren] } : mp))
    );
    setCollapsedMp((prev) => ({ ...prev, [manualModal.mpId]: false }));
    setManualModal({ isOpen: false, mpId: "" });
  };

  // ---------- CHILD FIELD ----------
  const handleSelectMaterialForChild = (mpId: string, childId: string, materialIdVal: string) => {
    const mat = masterMaterials.find((m) => m.id === Number(materialIdVal));
    setMotherParts((prev) =>
      prev.map((mp) => {
        if (mp.id !== mpId) return mp;
        return {
          ...mp,
          children: mp.children.map((ch) => {
            if (ch.id !== childId) return ch;
            if (mat) {
              return {
                ...ch,
                source: "master",
                material_id: mat.id,
                part_number: mat.part_number,
                description: mat.description || "",
                technical_specification: mat.technical_specification || "",
                qty: Number(mat.qty) > 0 ? Number(mat.qty) : ch.qty || 1,
                unit: mat.unit || "Pcs",
                price: Number(mat.price) || 0,
                margin: mat.margin ? Number(mat.margin) : "",
                markup: 0,
              };
            }
            return { ...ch, material_id: undefined, part_number: "", description: "", technical_specification: "" };
          }),
        };
      })
    );
  };

  const updateChildField = (mpId: string, childId: string, field: keyof FormChildPart, val: any) => {
    setMotherParts((prev) =>
      prev.map((mp) =>
        mp.id === mpId
          ? { ...mp, children: mp.children.map((ch) => (ch.id === childId ? { ...ch, [field]: val } : ch)) }
          : mp
      )
    );
  };

  const removeChildPart = (mpId: string, childId: string) => {
    setMotherParts((prev) =>
      prev.map((mp) => (mp.id === mpId ? { ...mp, children: mp.children.filter((ch) => ch.id !== childId) } : mp))
    );
  };

  const calculateMotherPartCost = (children: FormChildPart[]) =>
    children.reduce((sum, ch) => sum + calcLine(ch.price, ch.margin, ch.qty).total, 0);

  // ---------- FORM SUMMARY ----------
  const formSummary = useMemo(() => {
    let items = 0;
    let manual = 0;
    let total = 0;
    motherParts.forEach((mp) => {
      items += mp.children.length;
      manual += mp.children.filter((c) => c.source === "manual").length;
      total += calculateMotherPartCost(mp.children);
    });
    return { items, manual, total };
  }, [motherParts]);

  // ---------- SAVE ----------
  const handleFinishBom = async () => {
    if (!customerName.trim()) {
      alert("Nama Customer tidak boleh kosong.");
      return;
    }
    if (!editingGroupKey && !projectName.trim()) {
      alert("Project Name tidak boleh kosong.");
      return;
    }
    if (motherParts.length === 0) {
      alert("Tambahkan setidaknya satu Mother Part.");
      return;
    }

    const bomCode = editingBomCode || generateBomCode();
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
        payloadItems.push({
          bom_code: bomCode,
          customer: customerName.trim(),
          project_name: projectName.trim() || null,
          mother_part: mp.mother_part_name.trim(),
          part_number: ch.part_number.trim(),
          description: ch.description?.trim() || "",
          technical_specification: ch.technical_specification?.trim() || "",
          qty,
          unit: ch.unit?.trim() || "Pcs",
          price: basePrice,
          margin,
          markup: calcLine(basePrice, margin, qty).markup,
        });
      }
    }

    setIsSubmitting(true);
    try {
      // 1. Simpan data baru dulu (aman: data lama tidak hilang jika gagal)
      await Promise.all(
        payloadItems.map(async (item) => {
          const res = await fetch("/api/management/create_bom", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item),
          });
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.message || `Gagal menyimpan part: ${item.part_number}`);
          }
          return res.json().catch(() => ({}));
        })
      );

      // 2. Jika edit, hapus item lama setelah item baru tersimpan
      if (editingGroupKey && originalItemIds.length > 0) {
        await Promise.all(originalItemIds.map((id) => fetch(`/api/management/create_bom?id=${id}`, { method: "DELETE" })));
      }

      // 3. Buat Project jika belum ada
      if (projectName.trim()) {
        const isProjectExist = existingProjects.some(
          (p) => p.project_name.toLowerCase() === projectName.trim().toLowerCase()
        );
        if (!isProjectExist) {
          const projectResponse = await fetch("/api/management/project", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              project_name: projectName.trim(),
              client_company: customerName.trim(),
              current_stage: "bom_design",
              status: "In Progress",
              stage_notes: {
                bom_design: { notes: `Project created automatically from BOM ${bomCode}.` },
              },
            }),
          });
          if (!projectResponse.ok) {
            const errorData = await projectResponse.json().catch(() => ({}));
            throw new Error(errorData.message || "BOM tersimpan, tetapi Project gagal dibuat.");
          }
        }
      }

      alert(
        editingGroupKey
          ? `BOM ${bomCode} Berhasil Diperbarui!`
          : `BOM ${bomCode} Berhasil Dibuat dan Project berhasil disinkronisasi.`
      );
      setIsModalOpen(false);
      fetchBomList();
      fetchExistingProjects();
    } catch (err: any) {
      console.error("Gagal menyimpan BOM / Project:", err);
      alert(`Terjadi kesalahan saat menyimpan data:\n${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

 const toggleGroupExpand = (groupKey: string) => {
  setExpandedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
};

  const filteredBomGroups = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return bomGroups.filter(
      (g) =>
        g.customer.toLowerCase().includes(q) ||
        g.projectName.toLowerCase().includes(q) ||
        (g.bomCode || "").toLowerCase().includes(q)
    );
  }, [bomGroups, searchQuery]);

  const customerBomIndex = useMemo(() => {
    const map: Record<string, number> = {};
    const sortedAsc = [...bomGroups].sort(
      (a, b) => new Date(a.date_created).getTime() - new Date(b.date_created).getTime()
    );
    const counter: Record<string, number> = {};
    sortedAsc.forEach((g) => {
      const c = g.customer.toLowerCase();
      counter[c] = (counter[c] || 0) + 1;
      map[g.groupKey] = counter[c];
    });
    return map;
  }, [bomGroups]);

  const pageStats = useMemo(() => {
    const customers = new Set(bomGroups.map((g) => g.customer.toLowerCase()));
    return {
      totalBom: bomGroups.length,
      totalCustomer: customers.size,
      totalItems: bomGroups.reduce((s, g) => s + g.total_items, 0),
      totalValue: bomGroups.reduce((s, g) => s + g.total_cost, 0),
    };
  }, [bomGroups]);

  const masterPartNumbers = useMemo(() => new Set(masterMaterials.map((m) => m.part_number)), [masterMaterials]);

  const isExistingProjectSelected = existingProjects.some(
    (p) => p.project_name.toLowerCase() === projectName.trim().toLowerCase()
  );

  const manualTargetMp = motherParts.find((m) => m.id === manualModal.mpId);
  const bulkTargetMp = motherParts.find((m) => m.id === bulkModal.mpId);

  // ================= RENDER =================
  return (
    <>
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans print:hidden">
        <div className="w-full p-4 md:p-6 space-y-5">
          {/* ===== HEADER ===== */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600 rounded-lg text-white shadow-sm">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
                  Bill of Materials (BOM) Management
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Kelola struktur hirarki material (Mother Part &amp; Child Part) per Customer &amp; Project.
                </p>
              </div>
            </div>
            <button
              onClick={handleOpenModal}
              className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create BOM
            </button>
          </div>

          {/* ===== STATS ===== */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total BOM", value: pageStats.totalBom.toLocaleString("id-ID"), icon: FileText, tone: "blue" },
              { label: "Customer", value: pageStats.totalCustomer.toLocaleString("id-ID"), icon: Users, tone: "indigo" },
              { label: "Total Item", value: pageStats.totalItems.toLocaleString("id-ID"), icon: Box, tone: "amber" },
              { label: "Total Nilai BOM", value: formatRp(pageStats.totalValue), icon: Wallet, tone: "emerald" },
            ].map((s) => {
              const Icon = s.icon;
              const tones: Record<string, string> = {
                blue: "bg-blue-50 text-blue-600 border-blue-100",
                indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
                amber: "bg-amber-50 text-amber-600 border-amber-100",
                emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
              };
              return (
                <div key={s.label} className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex items-center gap-3">
                  <div className={`p-2.5 rounded-lg border ${tones[s.tone]}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{s.label}</p>
                    <p className="text-lg font-bold text-slate-900 truncate tabular-nums">{s.value}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ===== TOOLBAR ===== */}
          <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari berdasarkan customer, project, atau BOM code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-9 pr-4 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-3 h-10 inline-flex items-center rounded-lg whitespace-nowrap">
              {filteredBomGroups.length} BOM
            </span>
          </div>

          {/* ===== LIST ===== */}
          {isLoading ? (
            <div className="text-center py-12 text-slate-500 bg-white border border-slate-200 rounded-xl">
              Loading BOM data...
            </div>
          ) : filteredBomGroups.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
              <Box className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">Belum ada BOM yang dibuat.</p>
              <p className="text-slate-400 text-sm mt-1">Klik tombol &quot;Create BOM&quot; untuk menambahkan data baru.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBomGroups.map((group) => {
                const isExpanded = !!expandedGroups[group.groupKey];
                const motherPartMap: Record<string, BomItem[]> = {};
                group.items.forEach((item) => {
                  const mpName = item.mother_part || "General Part";
                  if (!motherPartMap[mpName]) motherPartMap[mpName] = [];
                  motherPartMap[mpName].push(item);
                });

                return (
                  <div
                    key={group.groupKey}
                    className={`bg-white border rounded-xl shadow-sm overflow-hidden transition-colors ${
                      isExpanded ? "border-blue-300" : "border-slate-200"
                    }`}
                  >
                    <div
                      onClick={() => toggleGroupExpand(group.groupKey)}
                      className="px-5 py-4 grid grid-cols-1 md:grid-cols-[1fr_auto] items-center gap-4 cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-600 flex-shrink-0">
                          <Building className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base font-bold text-slate-900 flex flex-wrap items-center gap-2">
                            <span className="truncate">{group.customer}</span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                              BOM #{customerBomIndex[group.groupKey] || 1}
                            </span>
                            {group.bomCode && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                {group.bomCode}
                              </span>
                            )}
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500">
                            {group.projectName && (
                              <span className="inline-flex items-center gap-1">
                                <FolderKanban className="w-3.5 h-3.5" />
                                <span className="font-semibold text-slate-700">{group.projectName}</span>
                              </span>
                            )}
                            <span>
                              {new Date(group.date_created).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                            </span>
                            <span>{group.total_mother_parts} Mother Parts</span>
                            <span>{group.total_items} Items</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-5">
                        <div className="text-right">
                          <span className="text-[11px] text-slate-500 block uppercase tracking-wider">Estimated Total</span>
                          <span className="text-base font-bold text-emerald-600 tabular-nums">{formatRp(group.total_cost)}</span>
                        </div>
                        <div className="flex items-center gap-1 border-l border-slate-200 pl-4">
                          <button
                            onClick={(e) => handlePrintPdf(group, e)}
                            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Export PDF"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleEditBom(group, e)}
                            className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Edit BOM"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteBom(group, e)}
                            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete BOM"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <div className="p-2 bg-slate-100 rounded-lg text-slate-600 ml-1">
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </div>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-slate-200 bg-slate-50 p-4 space-y-4">
                        {Object.keys(motherPartMap).map((mpName) => {
                          const children = motherPartMap[mpName];
                          const subTotal = children.reduce((sum, i) => sum + calcLine(i.price, i.margin, i.qty).total, 0);
                          return (
                            <div key={mpName} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                              <div className="bg-slate-100 px-4 py-2.5 flex items-center justify-between border-b border-slate-200">
                                <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                                  <Package className="w-4 h-4 text-blue-600" />
                                  <span>{mpName}</span>
                                  <span className="text-[11px] font-medium text-slate-500">({children.length} item)</span>
                                </div>
                                <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full tabular-nums">
                                  Subtotal: {formatRp(subTotal)}
                                </span>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full min-w-[900px] text-left text-xs text-slate-700">
                                  <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
                                    <tr>
                                      <th className="px-4 py-2.5 w-10 text-center">#</th>
                                      <th className="px-4 py-2.5">Part Number</th>
                                      <th className="px-4 py-2.5">Description</th>
                                      <th className="px-4 py-2.5">Technical Spec</th>
                                      <th className="px-4 py-2.5 text-right">Qty / Unit</th>
                                      <th className="px-4 py-2.5 text-right">Base Price</th>
                                      <th className="px-4 py-2.5 text-right">Margin</th>
                                      <th className="px-4 py-2.5 text-right">Markup</th>
                                      <th className="px-4 py-2.5 text-right">Total Price</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {children.map((child, idx) => {
                                      const { markup, total } = calcLine(child.price, child.margin, child.qty);
                                      const matched = masterMaterials.find((m) => m.part_number === child.part_number);
                                      const techSpec = child.technical_specification || matched?.technical_specification || "-";
                                      const isManual = masterMaterials.length > 0 && !masterPartNumbers.has(child.part_number);
                                      return (
                                        <tr key={child.id} className="hover:bg-slate-50">
                                          <td className="px-4 py-2.5 text-center text-slate-400">{idx + 1}</td>
                                          <td className="px-4 py-2.5 font-medium text-slate-900">
                                            <span className="inline-flex items-center gap-2">
                                              {child.part_number}
                                              {isManual && (
                                                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                                  Manual
                                                </span>
                                              )}
                                            </span>
                                          </td>
                                          <td className="px-4 py-2.5">{child.description || "-"}</td>
                                          <td className="px-4 py-2.5">{techSpec}</td>
                                          <td className="px-4 py-2.5 text-right tabular-nums">
                                            {child.qty} {child.unit}
                                          </td>
                                          <td className="px-4 py-2.5 text-right tabular-nums">{formatRp(child.price)}</td>
                                          <td className="px-4 py-2.5 text-right tabular-nums">{Number(child.margin) || 0}%</td>
                                          <td className="px-4 py-2.5 text-right tabular-nums">{formatRp(markup)}</td>
                                          <td className="px-4 py-2.5 text-right font-semibold text-emerald-600 tabular-nums">
                                            {formatRp(total)}
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

        {/* ========== MODAL CREATE / EDIT ========== */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
            <div className="relative bg-white border border-slate-200 rounded-2xl w-full max-w-[96vw] h-[94vh] flex flex-col shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="shrink-0 px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600 text-white rounded-lg">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      {editingGroupKey ? "Edit Bill of Materials" : "Create Bill of Materials"}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {editingBomCode ? (
                        <span className="font-mono text-blue-600">{editingBomCode}</span>
                      ) : (
                        "Kode BOM akan dibuat otomatis saat disimpan."
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="text-slate-500 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-100"
                  title="Tutup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Info Section */}
              <div className="shrink-0 relative z-20 px-6 py-4 bg-slate-50 border-b border-slate-200">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  <div className="lg:col-span-4">
                    <label className={labelCls}>
                      Project Name {!editingGroupKey && <span className="text-red-500">*</span>}
                    </label>
                    <ProjectCombobox
                      projects={existingProjects}
                      value={projectName}
                      onChange={setProjectName}
                      onSelectExisting={(proj) => {
                        if (proj.client_company) setCustomerName(proj.client_company);
                      }}
                    />
                    <p className="text-[11px] mt-1.5">
                      {projectName.trim() ? (
                        isExistingProjectSelected ? (
                          <span className="text-emerald-600 font-medium">✓ Project existing terpilih.</span>
                        ) : (
                          <span className="text-blue-600 font-medium">+ Project baru akan dibuat otomatis.</span>
                        )
                      ) : (
                        <span className="text-slate-500">{existingProjects.length} project tersedia.</span>
                      )}
                    </p>
                  </div>

                  <div className="lg:col-span-4">
                    <label className={labelCls}>
                      Nama Customer / Project Company <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Contoh: PT. Astra Honda Motor"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full h-10 pl-9 pr-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5">Otomatis terisi jika memilih project existing.</p>
                  </div>

                  <div className="lg:col-span-4">
                    <label className={labelCls}>Ringkasan</label>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-white border border-slate-200 rounded-lg px-3 py-2">
                        <p className="text-[10px] text-slate-500 uppercase font-semibold">Mother Part</p>
                        <p className="text-base font-bold text-slate-900 tabular-nums">{motherParts.length}</p>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-lg px-3 py-2">
                        <p className="text-[10px] text-slate-500 uppercase font-semibold">Item</p>
                        <p className="text-base font-bold text-slate-900 tabular-nums">{formSummary.items}</p>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-lg px-3 py-2">
                        <p className="text-[10px] text-slate-500 uppercase font-semibold">Manual</p>
                        <p className="text-base font-bold text-amber-600 tabular-nums">{formSummary.manual}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Structure Toolbar */}
              <div className="shrink-0 px-6 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-600" />
                    Struktur Mother &amp; Child Part
                  </h3>
                  <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-500">
                    <SourceBadge source="master" /> dari master material
                    <SourceBadge source="manual" /> input manual
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {motherParts.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setAllCollapsed(false)}
                        className="h-9 px-3 text-xs font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
                      >
                        Expand All
                      </button>
                      <button
                        type="button"
                        onClick={() => setAllCollapsed(true)}
                        className="h-9 px-3 text-xs font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
                      >
                        Collapse All
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={addMotherPart}
                    className="inline-flex items-center gap-2 h-9 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs text-white font-semibold transition-colors"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Tambah Mother Part
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-auto bg-slate-50 p-4 md:p-5 space-y-4">
                {motherParts.length === 0 ? (
                  <div className="h-full min-h-[240px] flex flex-col items-center justify-center text-center bg-white border border-dashed border-slate-300 rounded-xl p-8">
                    <Package className="w-10 h-10 text-slate-300 mb-3" />
                    <p className="text-slate-600 text-sm font-medium">Belum ada Mother Part.</p>
                    <p className="text-slate-400 text-xs mt-1">
                      Isi Nama Customer, lalu klik &quot;Tambah Mother Part&quot; untuk memulai.
                    </p>
                  </div>
                ) : (
                  motherParts.map((mp, mpIdx) => {
                    const motherCost = calculateMotherPartCost(mp.children);
                    const isCollapsed = !!collapsedMp[mp.id];
                    return (
                      <div key={mp.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        {/* Mother header */}
                        <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-slate-100 border-b border-slate-200">
                          <button
                            type="button"
                            onClick={() => toggleCollapseMp(mp.id)}
                            className="p-1.5 rounded-md text-slate-600 hover:bg-white border border-transparent hover:border-slate-200"
                            title={isCollapsed ? "Expand" : "Collapse"}
                          >
                            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          <span className="text-[11px] font-bold px-2 py-1 bg-blue-600 text-white rounded">MP {mpIdx + 1}</span>
                          <input
                            type="text"
                            value={mp.mother_part_name}
                            onChange={(e) => updateMotherPartName(mp.id, e.target.value)}
                            placeholder="Nama Mother Part (Contoh: Main Frame Assembly)"
                            className="flex-1 min-w-[220px] h-9 bg-white border border-slate-300 px-3 rounded-md text-sm text-slate-900 font-semibold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          />
                          <span className="text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 px-2.5 h-9 inline-flex items-center rounded-md">
                            {mp.children.length} item
                          </span>
                          <div className="text-right min-w-[150px] bg-white border border-slate-200 rounded-md px-3 py-1">
                            <span className="text-[10px] text-slate-500 block uppercase font-semibold">Subtotal</span>
                            <span className="text-sm font-bold text-emerald-600 tabular-nums">{formatRp(motherCost)}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeMotherPart(mp)}
                            className="p-2 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50"
                            title="Hapus Mother Part"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {!isCollapsed && (
                          <>
                            {/* Add mode toolbar */}
                            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-200 bg-white">
                              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                Tambah Child Part
                              </span>
                              <div className="inline-flex rounded-lg border border-slate-300 overflow-hidden divide-x divide-slate-300 shadow-sm">
                                <button
                                  type="button"
                                  onClick={() => openBulkModal(mp.id)}
                                  className="inline-flex items-center gap-1.5 h-8 px-3 bg-white text-xs text-emerald-700 hover:bg-emerald-50 font-medium transition-colors"
                                  title="Pilih banyak material dari master data"
                                >
                                  <ListPlus className="w-3.5 h-3.5" />
                                  Bulk (Master)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => addChildPart(mp.id)}
                                  className="inline-flex items-center gap-1.5 h-8 px-3 bg-white text-xs text-blue-700 hover:bg-blue-50 font-medium transition-colors"
                                  title="Tambah 1 baris, pilih dari master data"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  1 Baris (Master)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openManualModal(mp.id)}
                                  className="inline-flex items-center gap-1.5 h-8 px-3 bg-white text-xs text-amber-700 hover:bg-amber-50 font-medium transition-colors"
                                  title="Input manual tanpa master data (bisa paste dari Excel)"
                                >
                                  <PenLine className="w-3.5 h-3.5" />
                                  Input Manual
                                </button>
                              </div>
                            </div>

                            {mp.children.length === 0 ? (
                              <div className="px-4 py-6 text-center text-xs text-slate-500 italic">
                                Belum ada child part. Pilih salah satu mode di atas untuk menambahkan.
                              </div>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="table-fixed text-xs" style={{ width: "100%", minWidth: CHILD_TABLE_WIDTH }}>
                                  <colgroup>
                                    {CHILD_COLS.map((c) => (
                                      <col key={c.key} style={{ width: c.w }} />
                                    ))}
                                  </colgroup>
                                  <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                      {CHILD_COLS.map((c) => (
                                        <th
                                          key={c.key}
                                          className={`px-2 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider ${alignCls(c.align)}`}
                                        >
                                          {c.label}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {mp.children.map((child, childIdx) => {
                                      const { markup: calculatedMarkup, total: totalPrice } = calcLine(
                                        child.price,
                                        child.margin,
                                        child.qty
                                      );
                                      return (
                                        <tr
                                          key={child.id}
                                          className={`align-middle ${
                                            child.source === "manual" ? "bg-amber-50/30" : "bg-white"
                                          } hover:bg-slate-50`}
                                        >
                                          <td className="px-2 py-2 text-center text-slate-400 font-medium">{childIdx + 1}</td>
                                          <td className="px-2 py-2">
                                            <SourceBadge source={child.source} onClick={() => toggleChildSource(mp.id, child.id)} />
                                          </td>
                                          <td className="px-2 py-2">
                                            {child.source === "master" ? (
                                              <SearchableSelect
                                                options={masterMaterials}
                                                value={child.material_id}
                                                onChange={(val) => handleSelectMaterialForChild(mp.id, child.id, val)}
                                                placeholder={child.part_number || "-- Cari Material --"}
                                              />
                                            ) : (
                                              <input
                                                type="text"
                                                value={child.part_number}
                                                onChange={(e) => updateChildField(mp.id, child.id, "part_number", e.target.value)}
                                                placeholder="Ketik Part Number"
                                                className={`${cellInput} font-medium`}
                                              />
                                            )}
                                          </td>
                                          <td className="px-2 py-2">
                                            <input
                                              type="text"
                                              value={child.description}
                                              onChange={(e) => updateChildField(mp.id, child.id, "description", e.target.value)}
                                              placeholder="Deskripsi"
                                              className={cellInput}
                                            />
                                          </td>
                                          <td className="px-2 py-2">
                                            <input
                                              type="text"
                                              value={child.technical_specification}
                                              onChange={(e) =>
                                                updateChildField(mp.id, child.id, "technical_specification", e.target.value)
                                              }
                                              placeholder="Spesifikasi"
                                              className={cellInput}
                                            />
                                          </td>
                                          <td className="px-2 py-2">
                                            <input
                                              type="number"
                                              min="1"
                                              value={child.qty}
                                              onWheel={blurOnWheel}
                                              onChange={(e) => updateChildField(mp.id, child.id, "qty", e.target.value)}
                                              className={cellInputRight}
                                            />
                                          </td>
                                          <td className="px-2 py-2">
                                            <input
                                              type="text"
                                              value={child.unit}
                                              onChange={(e) => updateChildField(mp.id, child.id, "unit", e.target.value)}
                                              className={cellInput}
                                            />
                                          </td>
                                          <td className="px-2 py-2">
                                            <input
                                              type="number"
                                              min="0"
                                              value={child.price}
                                              onWheel={blurOnWheel}
                                              onChange={(e) => updateChildField(mp.id, child.id, "price", e.target.value)}
                                              className={cellInputRight}
                                            />
                                          </td>
                                          <td className="px-2 py-2">
                                            <input
                                              type="number"
                                              value={child.margin}
                                              onWheel={blurOnWheel}
                                              onChange={(e) => updateChildField(mp.id, child.id, "margin", e.target.value)}
                                              placeholder="0"
                                              className={cellInputRight}
                                            />
                                          </td>
                                          <td className="px-2 py-2 text-right text-slate-600 tabular-nums">
                                            {calculatedMarkup.toLocaleString("id-ID")}
                                          </td>
                                          <td className="px-2 py-2 text-right font-bold text-emerald-600 tabular-nums">
                                            {totalPrice.toLocaleString("id-ID")}
                                          </td>
                                          <td className="px-2 py-2">
                                            <div className="flex items-center justify-center gap-0.5">
                                              <button
                                                type="button"
                                                onClick={() => duplicateChildPart(mp.id, child.id)}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                                title="Duplikat baris"
                                              >
                                                <Copy className="w-3.5 h-3.5" />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => removeChildPart(mp.id, child.id)}
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                title="Hapus baris"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                  <tfoot className="bg-slate-50 border-t border-slate-200">
                                    <tr>
                                      <td colSpan={10} className="px-2 py-2.5 text-right text-[11px] font-semibold uppercase text-slate-500">
                                        Subtotal {mp.mother_part_name || `MP ${mpIdx + 1}`}
                                      </td>
                                      <td className="px-2 py-2.5 text-right font-bold text-emerald-700 tabular-nums">
                                        {motherCost.toLocaleString("id-ID")}
                                      </td>
                                      <td />
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="shrink-0 px-6 py-3 bg-white border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Grand Total</span>
                  <span className="text-xl font-bold text-emerald-600 tabular-nums">{formatRp(formSummary.total)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="h-10 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleFinishBom}
                    disabled={isSubmitting}
                    className="h-10 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    {isSubmitting ? "Menyimpan..." : "Finish & Save BOM"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========== MODAL BULK SELECT (MASTER) ========== */}
        {bulkModal.isOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60" onClick={() => setBulkModal({ isOpen: false, mpId: "" })} />
            <div className="relative bg-white border border-slate-200 rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="shrink-0 px-5 py-4 bg-white border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <ListPlus className="w-5 h-5 text-emerald-600" />
                    Pilih Material dari Master (Bulk)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Target: <span className="font-semibold text-slate-700">{bulkTargetMp?.mother_part_name || "-"}</span>
                  </p>
                </div>
                <button
                  onClick={() => setBulkModal({ isOpen: false, mpId: "" })}
                  className="text-slate-500 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="shrink-0 p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari Part Number, Spesifikasi, atau Deskripsi..."
                    value={bulkSearch}
                    onChange={(e) => setBulkSearch(e.target.value)}
                    className="w-full h-10 pl-9 pr-4 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    autoFocus
                  />
                </div>
                <button
                  type="button"
                  onClick={toggleSelectAllFiltered}
                  disabled={filteredBulkMaterials.length === 0}
                  className="h-10 px-3 text-xs font-medium border border-slate-300 bg-white rounded-lg hover:bg-slate-100 disabled:opacity-50 whitespace-nowrap"
                >
                  {allFilteredSelected ? "Batal Pilih Semua" : "Pilih Semua Hasil"}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-2">
                {masterMaterials.length === 0 ? (
                  <div className="py-10 text-center text-sm text-slate-500">
                    Master material kosong / API tidak tersedia.
                    <br />
                    Gunakan mode <span className="font-semibold text-amber-700">Input Manual</span>.
                  </div>
                ) : filteredBulkMaterials.length === 0 ? (
                  <div className="py-10 text-center text-sm text-slate-500">Material tidak ditemukan.</div>
                ) : (
                  filteredBulkMaterials.map((mat) => {
                    const isSelected = bulkSelectedIds.includes(mat.id);
                    return (
                      <div
                        key={mat.id}
                        onClick={() => toggleBulkSelection(mat.id)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors mb-1 border ${
                          isSelected ? "bg-emerald-50 border-emerald-200" : "hover:bg-slate-50 border-transparent"
                        }`}
                      >
                        <div
                          className={`flex items-center justify-center w-5 h-5 rounded border flex-shrink-0 ${
                            isSelected ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 bg-white"
                          }`}
                        >
                          {isSelected && <CheckSquare className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900">{mat.part_number}</p>
                          <p className="text-xs text-slate-500 truncate">
                            {mat.technical_specification || mat.description || "No Spec"}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs font-semibold text-slate-700 tabular-nums">{formatRp(mat.price)}</p>
                          <p className="text-[10px] text-slate-400">{mat.unit || "Pcs"}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="shrink-0 px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <span className="text-sm text-slate-600 font-medium">{bulkSelectedIds.length} Material Terpilih</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setBulkModal({ isOpen: false, mpId: "" })}
                    className="h-10 px-4 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-sm font-medium"
                  >
                    Batal
                  </button>
                  <button
                    onClick={applyBulkSelection}
                    disabled={bulkSelectedIds.length === 0}
                    className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                  >
                    Tambahkan ke Mother Part
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========== MODAL INPUT MANUAL ========== */}
        {manualModal.isOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60" />
            <div className="relative bg-white border border-slate-200 rounded-xl w-full max-w-[1300px] max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="shrink-0 px-5 py-4 bg-white border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <PenLine className="w-5 h-5 text-amber-600" />
                    Input Manual Child Part
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Target: <span className="font-semibold text-slate-700">{manualTargetMp?.mother_part_name || "-"}</span>{" "}
                    • Tidak bergantung pada master material.
                  </p>
                </div>
                <button
                  onClick={() => setManualModal({ isOpen: false, mpId: "" })}
                  className="text-slate-500 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Paste from Excel */}
              <div className="shrink-0 px-5 py-3 border-b border-slate-200 bg-slate-50">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-slate-600">
                    Urutan kolom paste:{" "}
                    <span className="font-mono text-[11px] bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                      Part Number | Description | Tech Spec | Qty | Unit | Price | Margin
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowPaste((s) => !s)}
                    className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium border border-slate-300 bg-white rounded-lg hover:bg-slate-100"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5" />
                    {showPaste ? "Tutup Paste" : "Paste dari Excel"}
                  </button>
                </div>
                {showPaste && (
                  <div className="mt-3 space-y-2">
                    <textarea
                      value={pasteText}
                      onChange={(e) => setPasteText(e.target.value)}
                      rows={5}
                      placeholder={"Copy baris dari Excel lalu paste di sini...\nContoh:\nPN-001\tBracket\tSPCC 1.2mm\t2\tPcs\t15000\t10"}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleParsePaste}
                        className="h-8 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold"
                      >
                        Proses Paste ke Tabel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Manual table */}
              <div className="flex-1 overflow-auto">
                <table className="table-fixed text-xs" style={{ width: "100%", minWidth: MANUAL_TABLE_WIDTH }}>
                  <colgroup>
                    {MANUAL_COLS.map((c) => (
                      <col key={c.key} style={{ width: c.w }} />
                    ))}
                  </colgroup>
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      {MANUAL_COLS.map((c) => (
                        <th
                          key={c.key}
                          className={`px-2 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider ${alignCls(c.align)}`}
                        >
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {manualRows.map((r, idx) => {
                      const { total } = calcLine(r.price, r.margin, r.qty);
                      return (
                        <tr key={r.id} className="hover:bg-slate-50">
                          <td className="px-2 py-2 text-center text-slate-400 font-medium">{idx + 1}</td>
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              value={r.part_number}
                              onChange={(e) => updateManualRow(r.id, "part_number", e.target.value)}
                              placeholder="Part Number"
                              className={`${cellInput} font-medium`}
                              autoFocus={idx === 0}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              value={r.description}
                              onChange={(e) => updateManualRow(r.id, "description", e.target.value)}
                              placeholder="Deskripsi"
                              className={cellInput}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              value={r.technical_specification}
                              onChange={(e) => updateManualRow(r.id, "technical_specification", e.target.value)}
                              placeholder="Spesifikasi teknis"
                              className={cellInput}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              min="1"
                              value={r.qty}
                              onWheel={blurOnWheel}
                              onChange={(e) => updateManualRow(r.id, "qty", e.target.value)}
                              className={cellInputRight}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              value={r.unit}
                              onChange={(e) => updateManualRow(r.id, "unit", e.target.value)}
                              className={cellInput}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              min="0"
                              value={r.price}
                              onWheel={blurOnWheel}
                              onChange={(e) => updateManualRow(r.id, "price", e.target.value)}
                              placeholder="0"
                              className={cellInputRight}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              value={r.margin}
                              onWheel={blurOnWheel}
                              onChange={(e) => updateManualRow(r.id, "margin", e.target.value)}
                              placeholder="0"
                              className={cellInputRight}
                            />
                          </td>
                          <td className="px-2 py-2 text-right font-semibold text-emerald-600 tabular-nums">
                            {total.toLocaleString("id-ID")}
                          </td>
                          <td className="px-2 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeManualRow(r.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                              title="Hapus baris"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="p-3">
                  <button
                    type="button"
                    onClick={addManualRow}
                    className="w-full h-9 inline-flex items-center justify-center gap-1.5 border border-dashed border-slate-300 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-amber-400 hover:text-amber-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah Baris
                  </button>
                </div>
              </div>

              <div className="shrink-0 px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-sm text-slate-600">
                  <span className="font-semibold text-slate-900">{validManualRows.length}</span> baris valid •{" "}
                  Total{" "}
                  <span className="font-semibold text-emerald-600 tabular-nums">
                    {formatRp(validManualRows.reduce((s, r) => s + calcLine(r.price, r.margin, r.qty).total, 0))}
                  </span>
                  <span className="text-xs text-slate-400 ml-2">(baris tanpa Part Number diabaikan)</span>
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setManualModal({ isOpen: false, mpId: "" })}
                    className="h-10 px-4 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-sm font-medium"
                  >
                    Batal
                  </button>
                  <button
                    onClick={applyManualRows}
                    disabled={validManualRows.length === 0}
                    className="h-10 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                  >
                    Tambahkan ke Mother Part
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========== PRINT / EXPORT PDF ========== */}
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
            {printGroup.bomCode && (
              <p className="text-sm mt-2">
                <strong>BOM Code:</strong> {printGroup.bomCode}
              </p>
            )}
            <p className="text-sm">
              <strong>Customer:</strong> {printGroup.customer}
            </p>
            {printGroup.projectName && (
              <p className="text-sm">
                <strong>Project:</strong> {printGroup.projectName}
              </p>
            )}
            <p className="text-sm">
              <strong>Tanggal:</strong> {new Date(printGroup.date_created).toLocaleDateString("id-ID")}
            </p>
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
                const price = Number(item.price) || 0;
                const margin = Number(item.margin) || 0;
                const qty = Number(item.qty) || 0;
                const unitPriceWithMargin = price + (price * margin) / 100;
                const totalPrice = unitPriceWithMargin * qty;
                const matched = masterMaterials.find((m) => m.part_number === item.part_number);
                const techSpec = item.technical_specification || matched?.technical_specification || "-";
                return (
                  <tr key={item.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="border border-black p-2">{item.mother_part}</td>
                    <td className="border border-black p-2 font-semibold">{item.part_number}</td>
                    <td className="border border-black p-2">{item.description || "-"}</td>
                    <td className="border border-black p-2">{techSpec}</td>
                    <td className="border border-black p-2 text-center">
                      {qty} {item.unit}
                    </td>
                    <td className="border border-black p-2 text-right">{unitPriceWithMargin.toLocaleString("id-ID")}</td>
                    <td className="border border-black p-2 text-right font-semibold">{totalPrice.toLocaleString("id-ID")}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-200 font-bold">
                <td colSpan={6} className="border border-black p-2 text-right">
                  GRAND TOTAL ESTIMATION
                </td>
                <td className="border border-black p-2 text-right">Rp {printGroup.total_cost.toLocaleString("id-ID")}</td>
              </tr>
            </tfoot>
          </table>

          <div className="flex justify-between mt-12 text-sm">
            <div className="w-1/2 pr-8">
              <h3 className="font-bold mb-2 underline">Terms &amp; Conditions:</h3>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Harga yang tertera dapat berubah sewaktu-waktu tanpa pemberitahuan sebelumnya.</li>
                <li>Estimasi biaya di atas belum termasuk pajak (PPN 11%).</li>
                <li>Dokumen ini sah dan diakui sebagai penawaran/estimasi resmi dari perusahaan.</li>
                <li>Pembayaran dilakukan sesuai dengan termin yang telah disepakati bersama.</li>
              </ol>
            </div>
            <div className="w-1/3 text-center">
              <p className="mb-20">
                Jakarta, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
              </p>
              <p className="font-bold underline">Nama Penanggung Jawab</p>
              <p>Direktur Utama</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}