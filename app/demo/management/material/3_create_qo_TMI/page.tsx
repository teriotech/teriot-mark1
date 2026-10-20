"use client";
import React, { useState, useEffect, useMemo } from "react";
import { Plus, ChevronDown, ChevronRight, Package, Layers, Search, Building, Box, FileText, ShoppingCart, ClipboardCheck, Receipt, Hash, FolderKanban, CalendarDays } from "lucide-react";
import { MasterMaterial, BomItem, BomGroup, PrintType } from "./types";
import ModalCreate from "./modal_create";
import ModalQoPo from "./modal_qo_po";
import ModalBast from "./modal_bast";
import ModalInvoice from "./modal_invoice";

// ================= LOCAL TYPES =================
// Field tambahan sesuai tabel create_bom (route.ts)
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

// ================= HELPERS =================
const calcLineTotal = (item: BomItem) => {
  const qty = Number(item.qty) || 1;
  const price = Number(item.price) || 0;
  const margin = Number(item.margin) || 0;
  return qty * (price + (price * margin) / 100);
};

const clean = (v: unknown) => (v === undefined || v === null ? "" : String(v).trim());

/**
 * Kunci grup = SUMBER BOM.
 * 1. bom_code  -> sumber utama (1 BOM = 1 bom_code, sama seperti DELETE ?bom_code=)
 * 2. qo_number -> fallback jika bom_code kosong
 * 3. customer + project + created_at -> fallback data lama (1 kali POST bulk = 1 created_at)
 * Nama customer / project yang sama TIDAK akan digabung jika sumber BOM berbeda.
 */
const getGroupKey = (item: BomRow): string => {
  const bomCode = clean(item.bom_code);
  if (bomCode) return `BOM::${bomCode}`;

  const qo = clean(item.qo_number);
  if (qo) return `QO::${qo}`;

  const cust = clean(item.customer) || "Unassigned Customer";
  const proj = clean(item.project_name) || "-";
  const created = clean(item.created_at) || "no-date";
  return `RAW::${cust}::${proj}::${created}`;
};

const formatDate = (iso?: string) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? "-"
    : d.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

export default function QoPoManagementPage() {
  const [bomGroups, setBomGroups] = useState<BomGroupExt[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [masterMaterials, setMasterMaterials] = useState<MasterMaterial[]>([]);

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [printConfig, setPrintConfig] = useState<{ group: BomGroup; type: PrintType } | null>(null);
  const [bastConfig, setBastConfig] = useState<{ group: BomGroup } | null>(null);
  const [invoiceConfig, setInvoiceConfig] = useState<{ group: BomGroup } | null>(null);

  useEffect(() => {
    fetchBomList();
    fetchMasterMaterials();
  }, []);

  const fetchBomList = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/management/create_bom", { cache: "no-store" });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.message || "Gagal mengambil data BOM");

      if (Array.isArray(result.data)) {
        // ---- Group by SUMBER BOM (bukan by customer) ----
        const grouped: Record<string, BomRow[]> = {};
        (result.data as BomRow[]).forEach((item) => {
          const key = getGroupKey(item);
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(item);
        });

        const list: BomGroupExt[] = Object.keys(grouped).map((key) => {
          const items = grouped[key];
          const first = items[0];
          const motherPartSet = new Set(items.map((i) => i.mother_part).filter(Boolean));
          const totalCost = items.reduce((sum, item) => sum + calcLineTotal(item), 0);

          const existingQoNumber = items.find((i) => clean(i.qo_number))?.qo_number || undefined;
          const bomCode = items.find((i) => clean(i.bom_code))?.bom_code || null;
          const projectName = items.find((i) => clean(i.project_name))?.project_name || null;

          // Tanggal paling awal di grup = tanggal BOM dibuat
          const dateCreated =
            items
              .map((i) => i.created_at)
              .filter(Boolean)
              .sort((a, b) => new Date(a as string).getTime() - new Date(b as string).getTime())[0] ||
            new Date().toISOString();

          return {
            group_key: key,
            bom_code: bomCode,
            project_name: projectName,
            qo_number: existingQoNumber,
            customer: clean(first?.customer) || "Unassigned Customer",
            date_created: dateCreated,
            total_mother_parts: motherPartSet.size,
            total_items: items.length,
            total_cost: totalCost,
            items,
          } as BomGroupExt;
        });

        // Terbaru di atas
        list.sort((a, b) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime());
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
      const res = await fetch("/api/management/master_material", { cache: "no-store" });
      const result = await res.json();
      if (Array.isArray(result.data)) setMasterMaterials(result.data);
    } catch (err) {
      console.error("Gagal mengambil data Master Material:", err);
    }
  };

  const toggleGroupExpand = (key: string) => setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));

  // Hitung jumlah BOM per customer -> tampilkan badge "BOM 1 / 2" bila customer sama punya >1 BOM
  const customerBomIndex = useMemo(() => {
    const counter: Record<string, BomGroupExt[]> = {};
    bomGroups.forEach((g) => {
      const c = g.customer.toLowerCase();
      if (!counter[c]) counter[c] = [];
      counter[c].push(g);
    });
    const map: Record<string, { index: number; total: number }> = {};
    Object.values(counter).forEach((groups) => {
      const sorted = [...groups].sort((a, b) => new Date(a.date_created).getTime() - new Date(b.date_created).getTime());
      sorted.forEach((g, idx) => (map[g.group_key] = { index: idx + 1, total: sorted.length }));
    });
    return map;
  }, [bomGroups]);

  const filteredBomGroups = bomGroups.filter((group) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return [group.customer, group.project_name, group.bom_code, group.qo_number]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white !important; }
          body * { visibility: hidden; }
          #print-area, #print-area *, #print-area-bast, #print-area-bast *, #print-area-invoice, #print-area-invoice * { visibility: visible; }
          #print-area, #print-area-bast, #print-area-invoice { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; padding: 0.5cm 1cm !important; box-sizing: border-box; background-color: white; }
          html, body, main { height: auto !important; overflow: visible !important; position: static !important; padding: 0 !important; margin: 0 !important; }
        }
      `}} />

      <div className="min-h-screen bg-slate-50 text-slate-900 p-6 font-sans print:hidden">
        <div className="w-full space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3"><Layers className="w-8 h-8 text-blue-600" /> Quotation, PO, BAST & Invoice Generator</h1>
              <p className="text-sm text-slate-500 mt-1">Generate dokumen QO / PO / BAST / Invoice per sumber BOM (dipisah per BOM Code meskipun customer / project sama).</p>
            </div>
            <button onClick={() => setIsCreateOpen(true)} className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-md shadow-blue-500/20 transition-all duration-200"><Plus className="w-5 h-5" /> Create New</button>
          </div>

          <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Cari customer, project, BOM code, atau QO number..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
            </div>
            <span className="hidden md:inline text-xs text-slate-500 whitespace-nowrap">{filteredBomGroups.length} BOM</span>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-slate-500">Loading data...</div>
          ) : filteredBomGroups.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
              <Box className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Belum ada data yang dibuat.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBomGroups.map((group) => {
                const isExpanded = !!expandedGroups[group.group_key];
                const dupInfo = customerBomIndex[group.group_key];
                const motherPartMap: Record<string, BomRow[]> = {};
                group.items.forEach((item) => {
                  const mpName = item.mother_part || "General Part";
                  if (!motherPartMap[mpName]) motherPartMap[mpName] = [];
                  motherPartMap[mpName].push(item);
                });

                return (
                  <div key={group.group_key} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden transition-all duration-200">
                    <div onClick={() => toggleGroupExpand(group.group_key)} className="p-5 flex flex-col md:flex-row md:items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors gap-4">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-600"><Building className="w-6 h-6" /></div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 flex flex-wrap items-center gap-2">
                            {group.customer}
                            {group.bom_code && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-700 rounded-full border border-slate-300">
                                <Hash className="w-3 h-3" />{group.bom_code}
                              </span>
                            )}
                            {group.qo_number && (
                              <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-600 rounded-full border border-blue-200">
                                {group.qo_number}
                              </span>
                            )}
                            {dupInfo && dupInfo.total > 1 && (
                              <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-700 rounded-full border border-amber-200">
                                BOM {dupInfo.index} / {dupInfo.total}
                              </span>
                            )}
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-0.5">
                            {group.project_name && (
                              <span className="inline-flex items-center gap-1"><FolderKanban className="w-3.5 h-3.5" />{group.project_name}</span>
                            )}
                            <span className="inline-flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{formatDate(group.date_created)}</span>
                            <span>Total {group.total_mother_parts} Mother Parts • {group.total_items} Items</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 md:gap-6">
                        <div className="text-right hidden sm:block">
                          <span className="text-xs text-slate-500 block">Estimated Total Cost</span>
                          <span className="text-lg font-bold text-emerald-600">Rp {group.total_cost.toLocaleString("id-ID")}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={(e) => { e.stopPropagation(); setPrintConfig({ group, type: "QO" }); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors" title="Generate Quotation (QO)"><FileText className="w-5 h-5" /></button>
                          <button onClick={(e) => { e.stopPropagation(); setPrintConfig({ group, type: "PO" }); }} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-colors" title="Generate Purchase Order (PO)"><ShoppingCart className="w-5 h-5" /></button>
                          <button onClick={(e) => { e.stopPropagation(); setBastConfig({ group }); }} className="p-2 text-slate-400 hover:text-purple-600 hover:bg-slate-100 rounded-lg transition-colors" title="Generate BAST"><ClipboardCheck className="w-5 h-5" /></button>
                          <button onClick={(e) => { e.stopPropagation(); setInvoiceConfig({ group }); }} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition-colors" title="Generate Invoice"><Receipt className="w-5 h-5" /></button>
                          <div className="p-2 bg-slate-100 rounded-lg text-slate-600 ml-2">{isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}</div>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-slate-200 bg-slate-50 p-5 space-y-6">
                        {Object.keys(motherPartMap).map((mpName) => {
                          const children = motherPartMap[mpName];
                          const sortedChildren = [...children].sort((a, b) => calcLineTotal(b) - calcLineTotal(a));
                          const subTotal = sortedChildren.reduce((sum, item) => sum + calcLineTotal(item), 0);

                          return (
                            <div key={`${group.group_key}-${mpName}`} className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                              <div className="bg-slate-100 px-4 py-3 flex items-center justify-between border-b border-slate-200">
                                <div className="flex items-center gap-2 text-blue-700 font-semibold"><Package className="w-4 h-4" /><span>Mother Part: {mpName}</span></div>
                                <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">Subtotal: Rp {subTotal.toLocaleString("id-ID")}</span>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs text-slate-700">
                                  <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
                                    <tr><th className="px-4 py-2.5">Part Number</th><th className="px-4 py-2.5">Description</th><th className="px-4 py-2.5">Technical Spec</th><th className="px-4 py-2.5">Qty / Unit</th><th className="px-4 py-2.5 text-right">Base Price</th><th className="px-4 py-2.5 text-right">Margin (%)</th><th className="px-4 py-2.5 text-right">Markup</th><th className="px-4 py-2.5 text-right">Total Price</th></tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-200">
                                    {sortedChildren.map((child) => {
                                      const basePrice = Number(child.price) || 0;
                                      const margin = Number(child.margin) || 0;
                                      const qty = Number(child.qty) || 1;
                                      const calculatedMarkup = basePrice * (margin / 100) * qty;
                                      const totalPrice = calcLineTotal(child);
                                      return (
                                        <tr key={child.id} className="hover:bg-slate-50">
                                          <td className="px-4 py-2.5 font-medium text-slate-900">{child.part_number}</td>
                                          <td className="px-4 py-2.5">{child.description || "-"}</td>
                                          <td className="px-4 py-2.5">{child.technical_specification || "-"}</td>
                                          <td className="px-4 py-2.5">{child.qty} {child.unit}</td>
                                          <td className="px-4 py-2.5 text-right">Rp {basePrice.toLocaleString("id-ID")}</td>
                                          <td className="px-4 py-2.5 text-right">{margin}%</td>
                                          <td className="px-4 py-2.5 text-right">Rp {calculatedMarkup.toLocaleString("id-ID")}</td>
                                          <td className="px-4 py-2.5 text-right font-medium text-emerald-600">Rp {totalPrice.toLocaleString("id-ID")}</td>
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
      </div>

      {/* Modals */}
      <ModalCreate isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onSuccess={() => { setIsCreateOpen(false); fetchBomList(); }} masterMaterials={masterMaterials} />
      <ModalQoPo config={printConfig} onClose={() => { setPrintConfig(null); fetchBomList(); }} />
      <ModalBast config={bastConfig} onClose={() => { setBastConfig(null); fetchBomList(); }} />
      <ModalInvoice config={invoiceConfig} onClose={() => { setInvoiceConfig(null); fetchBomList(); }} />
    </>
  );
}