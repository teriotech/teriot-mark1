"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownUp,
  Building,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  FileText,
  FolderKanban,
  Hash,
  Layers,
  Loader2,
  Package,
  RefreshCw,
  Receipt,
  Search,
  ShoppingCart,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { BomItem, BomGroup, PrintType } from "./types";
import ModalQoPo from "./modal_qo_po";
import ModalBast from "./modal_bast";
import ModalInvoice from "./modal_invoice";

// ================= TYPES =================

type BomRow = BomItem & {
  bom_code?: string | null;
  qo_number?: string | null;
  project_name?: string | null;
  created_at?: string;
};

type BomGroupExt = BomGroup & {
  group_key: string;
  bom_code: string | null;
  project_name: string | null;
  items: BomRow[];
};

type SortOption = "newest" | "oldest" | "customer" | "highest";

type ApiResponse = {
  data?: unknown;
  message?: string;
  error?: string;
};

type SummaryCard = {
  label: string;
  value: string;
  icon: LucideIcon;
  color: string;
  note: string;
};

type DocumentAction = {
  label: string;
  title: string;
  icon: LucideIcon;
  className: string;
  onClick: () => void;
};

// ================= HELPERS =================

const clean = (value: unknown): string =>
  value === undefined || value === null ? "" : String(value).trim();

const toNumber = (value: unknown, fallback = 0): number => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

// Mempertahankan perhitungan qty dari halaman sebelumnya.
const getQty = (item: BomItem): number => toNumber(item.qty, 1) || 1;

const calcLineTotal = (item: BomItem): number => {
  const qty = getQty(item);
  const price = toNumber(item.price);
  const margin = toNumber(item.margin);
  return qty * (price + (price * margin) / 100);
};

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const formatCurrency = (value: unknown): string =>
  currencyFormatter.format(toNumber(value));

const getTimestamp = (value: unknown): number => {
  const text = clean(value);
  if (!text) return 0;
  const timestamp = new Date(text).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const formatDate = (value: unknown): string => {
  const text = clean(value);
  if (!text) return "-";
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Grouping tetap berdasarkan sumber BOM.
 * Customer / project yang sama tidak otomatis digabung.
 */
const getGroupKey = (item: BomRow): string => {
  const bomCode = clean(item.bom_code);
  if (bomCode) return `BOM::${bomCode}`;

  const qoNumber = clean(item.qo_number);
  if (qoNumber) return `QO::${qoNumber}`;

  const customer = clean(item.customer) || "Unassigned Customer";
  const project = clean(item.project_name) || "-";
  const createdAt = clean(item.created_at) || "no-date";
  return `RAW::${customer}::${project}::${createdAt}`;
};

const buildBomGroups = (rows: BomRow[]): BomGroupExt[] => {
  const grouped = new Map<string, BomRow[]>();

  rows.forEach((item) => {
    const key = getGroupKey(item);
    const existing = grouped.get(key);
    if (existing) {
      existing.push(item);
    } else {
      grouped.set(key, [item]);
    }
  });

  return Array.from(grouped.entries())
    .map(([key, items]) => {
      const first = items[0];
      const motherParts = new Set(
        items.map((item) => clean(item.mother_part) || "General Part"),
      );
      const dates = items
        .map((item) => clean(item.created_at))
        .filter((value) => value && getTimestamp(value) !== 0)
        .sort((a, b) => getTimestamp(a) - getTimestamp(b));

      const group: BomGroupExt = {
        group_key: key,
        bom_code:
          clean(items.find((item) => clean(item.bom_code))?.bom_code) || null,
        project_name:
          clean(items.find((item) => clean(item.project_name))?.project_name) ||
          null,
        qo_number:
          clean(items.find((item) => clean(item.qo_number))?.qo_number) ||
          undefined,
        customer: clean(first?.customer) || "Unassigned Customer",
        date_created: dates[0] || "",
        total_mother_parts: motherParts.size,
        total_items: items.length,
        total_cost: items.reduce(
          (total, item) => total + calcLineTotal(item),
          0,
        ),
        items,
      };
      return group;
    })
    .sort(
      (a, b) => getTimestamp(b.date_created) - getTimestamp(a.date_created),
    );
};

// ================= PAGE =================

export default function QoPoManagementPage() {
  const [bomGroups, setBomGroups] = useState<BomGroupExt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [expandedGroups, setExpandedGroups] = useState<
    Record<string, boolean>
  >({});

  const [printConfig, setPrintConfig] = useState<{
    group: BomGroup;
    type: PrintType;
  } | null>(null);
  const [bastConfig, setBastConfig] = useState<{
    group: BomGroup;
  } | null>(null);
  const [invoiceConfig, setInvoiceConfig] = useState<{
    group: BomGroup;
  } | null>(null);

  // ================= FETCH =================

  const fetchBomList = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/management/create_bom", {
        cache: "no-store",
        signal,
      });
      const result: ApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || result.error || "Gagal mengambil data BOM.",
        );
      }

      if (!Array.isArray(result.data)) {
        throw new Error(
          "Format respons BOM tidak valid. Field data harus berupa array.",
        );
      }

      const rows = result.data.filter(
        (item): item is BomRow => typeof item === "object" && item !== null,
      );

      if (!signal?.aborted) {
        setBomGroups(buildBomGroups(rows));
      }
    } catch (error) {
      if (signal?.aborted) return;
      console.error("Gagal mengambil data BOM:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat mengambil data BOM.",
      );
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetchBomList(controller.signal);
    return () => controller.abort();
  }, [fetchBomList]);

  // ================= DERIVED DATA =================

  const customerBomIndex = useMemo(() => {
    const customerGroups = new Map<string, BomGroupExt[]>();

    bomGroups.forEach((group) => {
      const customer = clean(group.customer).toLowerCase();
      const existing = customerGroups.get(customer);
      if (existing) {
        existing.push(group);
      } else {
        customerGroups.set(customer, [group]);
      }
    });

    const result: Record<string, { index: number; total: number }> = {};

    customerGroups.forEach((groups) => {
      const sorted = [...groups].sort(
        (a, b) => getTimestamp(a.date_created) - getTimestamp(b.date_created),
      );
      sorted.forEach((group, index) => {
        result[group.group_key] = {
          index: index + 1,
          total: sorted.length,
        };
      });
    });

    return result;
  }, [bomGroups]);

  const filteredBomGroups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = bomGroups.filter((group) => {
      if (!query) return true;
      return [
        group.customer,
        group.project_name,
        group.bom_code,
        group.qo_number,
      ].some((value) => clean(value).toLowerCase().includes(query));
    });

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return getTimestamp(a.date_created) - getTimestamp(b.date_created);
        case "customer":
          return a.customer.localeCompare(b.customer, "id", {
            sensitivity: "base",
          });
        case "highest":
          return b.total_cost - a.total_cost;
        default:
          return getTimestamp(b.date_created) - getTimestamp(a.date_created);
      }
    });
  }, [bomGroups, searchQuery, sortBy]);

  const summary = useMemo(
    () => ({
      bomCount: filteredBomGroups.length,
      customerCount: new Set(
        filteredBomGroups.map((group) => clean(group.customer).toLowerCase()),
      ).size,
      itemCount: filteredBomGroups.reduce(
        (total, group) => total + group.total_items,
        0,
      ),
      totalCost: filteredBomGroups.reduce(
        (total, group) => total + group.total_cost,
        0,
      ),
    }),
    [filteredBomGroups],
  );

  const allVisibleExpanded =
    filteredBomGroups.length > 0 &&
    filteredBomGroups.every((group) => expandedGroups[group.group_key]);

  // ================= ACTIONS =================

  const toggleGroupExpand = (key: string) => {
    setExpandedGroups((previous) => ({
      ...previous,
      [key]: !previous[key],
    }));
  };

  const toggleAllVisible = () => {
    setExpandedGroups((previous) => {
      const next = { ...previous };
      filteredBomGroups.forEach((group) => {
        next[group.group_key] = !allVisibleExpanded;
      });
      return next;
    });
  };

  const closePrintModal = () => {
    setPrintConfig(null);
    void fetchBomList();
  };

  const closeBastModal = () => {
    setBastConfig(null);
    void fetchBomList();
  };

  const closeInvoiceModal = () => {
    setInvoiceConfig(null);
    void fetchBomList();
  };

  const summaryCards: SummaryCard[] = [
    {
      label: "Total BOM",
      value: summary.bomCount.toLocaleString("id-ID"),
      icon: Layers,
      color: "border-blue-100 bg-blue-50 text-blue-700",
      note: "Sumber BOM terpisah",
    },
    {
      label: "Customer",
      value: summary.customerCount.toLocaleString("id-ID"),
      icon: Building,
      color: "border-indigo-100 bg-indigo-50 text-indigo-700",
      note: "Customer pada hasil pencarian",
    },
    {
      label: "Material Items",
      value: summary.itemCount.toLocaleString("id-ID"),
      icon: Package,
      color: "border-amber-100 bg-amber-50 text-amber-700",
      note: "Total baris material",
    },
    {
      label: "Estimasi Nilai BOM",
      value: formatCurrency(summary.totalCost),
      icon: Receipt,
      color: "border-emerald-100 bg-emerald-50 text-emerald-700",
      note: "Termasuk margin material",
    },
  ];

  // ================= RENDER =================

  return (
    <>
      <style>{`
        .document-workspace {
          color-scheme: light;
          font-family: Arial, Helvetica, sans-serif;
        }
        .document-workspace button,
        .document-workspace input,
        .document-workspace select {
          font: inherit;
        }
        .document-workspace button:focus-visible,
        .document-workspace input:focus-visible,
        .document-workspace select:focus-visible {
          outline: 2px solid #2563eb;
          outline-offset: 3px;
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            background-color: white !important;
          }
          body * {
            visibility: hidden;
          }
          #print-area,
          #print-area *,
          #print-area-bast,
          #print-area-bast *,
          #print-area-invoice,
          #print-area-invoice * {
            visibility: visible;
          }
          #print-area,
          #print-area-bast,
          #print-area-invoice {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 0.5cm 1cm !important;
            box-sizing: border-box;
            background-color: white;
          }
          html,
          body,
          main {
            height: auto !important;
            overflow: visible !important;
            position: static !important;
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `}</style>

      <div className="document-workspace min-h-screen bg-slate-50 p-4 text-slate-900 print:hidden sm:p-6 lg:p-8">
        <div className="mx-auto w-full space-y-5">
          {/* ================= HEADER ================= */}
          <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700">
                  <FolderKanban className="h-6 w-6" />
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-blue-700">
                    Document Management
                  </p>
                  <h1 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
                    Quotation, PO, BAST &amp; Invoice
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
                    Kelola dan buat dokumen berdasarkan sumber BOM. Setiap BOM
                    tetap terpisah meskipun customer atau project sama.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void fetchBomList()}
                disabled={isLoading}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                />
                Refresh Data
              </button>
            </div>
          </header>

          {/* ================= ERROR ================= */}
          {errorMessage && (
            <div
              role="alert"
              className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                <div>
                  <p className="text-sm font-semibold text-red-800">
                    Data belum berhasil diperbarui
                  </p>
                  <p className="mt-1 text-sm text-red-700">{errorMessage}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void fetchBomList()}
                disabled={isLoading}
                className="shrink-0 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-abled:opacity-50"
              >
                Coba lagi
              </button>
            </div>
          )}

          {/* ================= SUMMARY ================= */}
          <section
            aria-label="Ringkasan hasil BOM"
            aria-busy={isLoading}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
          >
            {summaryCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-slate-500">
                      {card.label}
                    </p>
                    <div className={`rounded-lg border p-2 ${card.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-3 break-words text-2xl font-bold tracking-tight text-slate-950 tabular-nums">
                    {isLoading && bomGroups.length === 0 ? "..." : card.value}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    {card.note}
                  </p>
                </div>
              );
            })}
          </section>

          {/* ================= TOOLBAR ================= */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
              <div className="min-w-0 flex-1">
                <label
                  htmlFor="bom-search"
                  className="mb-2 block text-xs font-semibold text-slate-600"
                >
                  Cari BOM
                </label>
                <div className="relative">
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="bom-search"
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Customer, project, BOM code, atau QO number..."
                    className="h-11 w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      aria-label="Hapus pencarian"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="w-full lg:w-52">
                <label
                  htmlFor="bom-sort"
                  className="mb-2 block text-xs font-semibold text-slate-600"
                >
                  Urutkan berdasarkan
                </label>
                <div className="relative">
                  <ArrowDownUp
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  />
                  <select
                    id="bom-sort"
                    value={sortBy}
                    onChange={(event) =>
                      setSortBy(event.target.value as SortOption)
                    }
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-700 focus:border-blue-500"
                  >
                    <option value="newest">Terbaru</option>
                    <option value="oldest">Terlama</option>
                    <option value="customer">Customer A-Z</option>
                    <option value="highest">Nilai tertinggi</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={toggleAllVisible}
                disabled={isLoading || filteredBomGroups.length === 0}
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {allVisibleExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                {allVisibleExpanded ? "Tutup Semua" : "Buka Semua"}
              </button>
            </div>

            <div
              aria-live="polite"
              className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500"
            >
              <span>
                Menampilkan{" "}
                <strong className="font-semibold text-slate-800">
                  {filteredBomGroups.length}
                </strong>{" "}
                dari {bomGroups.length} BOM
              </span>
              <span>Ringkasan mengikuti hasil pencarian</span>
            </div>
          </section>

          {/* ================= CONTENT ================= */}
          {isLoading && bomGroups.length === 0 ? (
            <div
              role="status"
              className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-20"
            >
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="mt-4 text-sm font-semibold text-slate-700">
                Memuat data BOM...
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Mohon tunggu sebentar.
              </p>
            </div>
          ) : filteredBomGroups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                <Package className="h-8 w-8 text-slate-400" />
              </div>
              <h2 className="mt-4 text-base font-semibold text-slate-800">
                {searchQuery.trim()
                  ? "BOM tidak ditemukan"
                  : errorMessage
                    ? "Data BOM belum dapat ditampilkan"
                    : "Belum ada data BOM"}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
                {searchQuery.trim()
                  ? "Coba gunakan nama customer, project, BOM code, atau nomor QO yang berbeda."
                  : errorMessage
                    ? "Periksa pesan kesalahan di atas, lalu coba muat ulang data."
                    : "Data akan ditampilkan setelah BOM tersedia dari sumber data."}
              </p>
              {searchQuery.trim() && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="mt-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                >
                  Reset Pencarian
                </button>
              )}
            </div>
          ) : (
            <section
              aria-label="Daftar BOM"
              aria-busy={isLoading}
              className="space-y-4"
            >
              {filteredBomGroups.map((group) => {
                const isExpanded = !!expandedGroups[group.group_key];
                const duplicateInfo = customerBomIndex[group.group_key];

                const motherPartMap = new Map<string, BomRow[]>();
                group.items.forEach((item) => {
                  const name = clean(item.mother_part) || "General Part";
                  const existing = motherPartMap.get(name);
                  if (existing) {
                    existing.push(item);
                  } else {
                    motherPartMap.set(name, [item]);
                  }
                });

                const detailId = `bom-detail-${encodeURIComponent(
                  group.group_key,
                )}`;

                const documentActions: DocumentAction[] = [
                  {
                    label: "Quotation",
                    title: "Generate Quotation (QO)",
                    icon: FileText,
                    className:
                      "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100",
                    onClick: () => setPrintConfig({ group, type: "QO" }),
                  },
                  {
                    label: "PO",
                    title: "Generate Purchase Order (PO)",
                    icon: ShoppingCart,
                    className:
                      "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
                    onClick: () => setPrintConfig({ group, type: "PO" }),
                  },
                  {
                    label: "BAST",
                    title: "Generate Berita Acara Serah Terima (BAST)",
                    icon: ClipboardCheck,
                    className:
                      "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100",
                    onClick: () => setBastConfig({ group }),
                  },
                  {
                    label: "Invoice",
                    title: "Generate Invoice",
                    icon: Receipt,
                    className:
                      "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100",
                    onClick: () => setInvoiceConfig({ group }),
                  },
                ];

                return (
                  <article
                    key={group.group_key}
                    className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-colors ${
                      isExpanded
                        ? "border-blue-300"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {/* Clickable header, separate from document actions */}
                    <button
                      type="button"
                      onClick={() => toggleGroupExpand(group.group_key)}
                      aria-expanded={isExpanded}
                      aria-controls={detailId}
                      className="block w-full p-4 text-left transition hover:bg-slate-50 sm:p-5"
                    >
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 sm:flex">
                          <Building className="h-5 w-5" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="break-words text-base font-bold tracking-tight text-slate-950 sm:text-lg">
                              {group.customer}
                            </h2>
                            {duplicateInfo && duplicateInfo.total > 1 && (
                              <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
                                BOM {duplicateInfo.index} /{" "}
                                {duplicateInfo.total}
                              </span>
                            )}
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {group.bom_code && (
                              <span className="inline-flex max-w-full items-center gap-1 rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                                <Hash className="h-3 w-3 shrink-0" />
                                <span className="break-all">
                                  {group.bom_code}
                                </span>
                              </span>
                            )}
                            {group.qo_number && (
                              <span className="max-w-full break-all rounded-md border border-blue-100 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                                {group.qo_number}
                              </span>
                            )}
                          </div>

                          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs leading-relaxed text-slate-500">
                            <span className="inline-flex min-w-0 items-start gap-1.5">
                              <FolderKanban className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                              <span className="break-words">
                                {group.project_name || "Tanpa nama project"}
                              </span>
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                              {formatDate(group.date_created)}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                            isExpanded
                              ? "border-blue-200 bg-blue-50 text-blue-700"
                              : "border-slate-200 bg-white text-slate-500"
                          }`}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </span>
                      </div>
                    </button>

                    {/* Summary and document actions */}
                    <div className="flex flex-col justify-between gap-4 border-t border-slate-100 px-4 py-4 sm:px-5 xl:flex-row xl:items-center">
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                        <div>
                          <p className="text-xs font-medium text-slate-500">
                            Estimasi Total
                          </p>
                          <p className="mt-1 text-lg font-bold tracking-tight text-slate-950 tabular-nums">
                            {formatCurrency(group.total_cost)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600">
                            {group.total_mother_parts} Mother Parts
                          </span>
                          <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600">
                            {group.total_items} Items
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                        {documentActions.map((action) => {
                          const Icon = action.icon;
                          return (
                            <button
                              key={action.label}
                              type="button"
                              title={action.title}
                              onClick={action.onClick}
                              className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${action.className}`}
                            >
                              <Icon className="h-4 w-4 shrink-0" />
                              {action.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* ================= DETAIL ================= */}
                    {isExpanded && (
                      <div
                        id={detailId}
                        className="space-y-4 border-t border-slate-200 bg-slate-50 p-3 sm:p-5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="text-sm font-semibold text-slate-800">
                            Rincian Material
                          </h3>
                          <p className="text-xs text-slate-500">
                            Material diurutkan berdasarkan nilai tertinggi per
                            Mother Part
                          </p>
                        </div>

                        {Array.from(motherPartMap.entries()).map(
                          ([motherPartName, children]) => {
                            const sortedChildren = [...children].sort(
                              (a, b) => calcLineTotal(b) - calcLineTotal(a),
                            );
                            const subtotal = sortedChildren.reduce(
                              (total, item) => total + calcLineTotal(item),
                              0,
                            );

                            return (
                              <div
                                key={`${group.group_key}-${motherPartName}`}
                                className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                              >
                                <div className="flex flex-col justify-between gap-3 border-b border-slate-200 bg-slate-100 px-4 py-3 sm:flex-row sm:items-center">
                                  <div className="flex min-w-0 items-center gap-2">
                                    <Package className="h-4 w-4 shrink-0 text-blue-700" />
                                    <h4 className="break-words text-sm font-semibold text-slate-800">
                                      {motherPartName}
                                    </h4>
                                    <span className="shrink-0 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-xs text-slate-500">
                                      {children.length}
                                    </span>
                                  </div>
                                  <p className="shrink-0 text-xs text-slate-500">
                                    Subtotal{" "}
                                    <strong className="ml-1 font-bold text-slate-900 tabular-nums">
                                      {formatCurrency(subtotal)}
                                    </strong>
                                  </p>
                                </div>

                                <div
                                  role="region"
                                  aria-label={`Tabel material ${motherPartName}`}
                                  tabIndex={0}
                                  className="overflow-x-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
                                >
                                  <table className="w-full min-w-[1050px] text-left text-xs">
                                    <caption className="sr-only">
                                      Rincian material {motherPartName}
                                    </caption>
                                    <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                                      <tr>
                                        <th scope="col" className="px-4 py-3 font-semibold">
                                          Part Number
                                        </th>
                                        <th scope="col" className="px-4 py-3 font-semibold">
                                          Description
                                        </th>
                                        <th scope="col" className="px-4 py-3 font-semibold">
                                          Technical Spec
                                        </th>
                                        <th scope="col" className="whitespace-nowrap px-4 py-3 font-semibold">
                                          Qty / Unit
                                        </th>
                                        <th scope="col" className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                                          Base Price
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-right font-semibold">
                                          Margin
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-right font-semibold">
                                          Markup
                                        </th>
                                        <th scope="col" className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                                          Total Price
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {sortedChildren.map((child, index) => {
                                        const basePrice = toNumber(child.price);
                                        const margin = toNumber(child.margin);
                                        const qty = getQty(child);
                                        const markup =
                                          basePrice * (margin / 100) * qty;

                                        return (
                                          <tr
                                            key={`${clean(child.id)}-${index}`}
                                            className="text-slate-600 transition-colors even:bg-slate-50 hover:bg-blue-50"
                                          >
                                            <td className="px-4 py-3 align-top font-semibold text-slate-900">
                                              {clean(child.part_number) || "-"}
                                            </td>
                                            <td className="max-w-xs whitespace-normal break-words px-4 py-3 align-top leading-relaxed">
                                              {clean(child.description) || "-"}
                                            </td>
                                            <td className="max-w-xs whitespace-pre-wrap break-words px-4 py-3 align-top leading-relaxed">
                                              {clean(child.technical_specification) || "-"}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 align-top tabular-nums">
                                              {qty} {clean(child.unit)}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-right align-top tabular-nums">
                                              {formatCurrency(basePrice)}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-right align-top tabular-nums">
                                              {margin}%
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-right align-top tabular-nums">
                                              {formatCurrency(markup)}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-right align-top font-bold text-slate-900 tabular-nums">
                                              {formatCurrency(calcLineTotal(child))}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                    <tfoot className="border-t border-slate-200 bg-slate-50">
                                      <tr>
                                        <td
                                          colSpan={7}
                                          className="px-4 py-3 text-right font-semibold text-slate-600"
                                        >
                                          Subtotal Mother Part
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-slate-900 tabular-nums">
                                          {formatCurrency(subtotal)}
                                        </td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              </div>
                            );
                          },
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-4">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              Total Estimasi BOM
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {group.total_mother_parts} Mother Parts
                              {" · "}
                              {group.total_items} Material Items
                            </p>
                          </div>
                          <p className="text-xl font-bold tracking-tight text-blue-800 tabular-nums">
                            {formatCurrency(group.total_cost)}
                          </p>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </section>
          )}
        </div>
      </div>

      {/* Modal tetap di luar container print:hidden */}
      <ModalQoPo config={printConfig} onClose={closePrintModal} />
      <ModalBast config={bastConfig} onClose={closeBastModal} />
      <ModalInvoice config={invoiceConfig} onClose={closeInvoiceModal} />
    </>
  );
}