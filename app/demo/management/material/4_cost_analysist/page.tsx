"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

// ================= TYPES =================
type EntryType = "income" | "expense" | "allocation";
type TxType = Exclude<EntryType, "allocation">;
type AllocGroup = "RAW_MATERIAL" | "TRANSPORT" | "DIVIDEN" | "OTHER";

type Entry = {
  id: number;
  project_id: string | null;
  project_name: string;
  entry_type: EntryType;
  category: string;
  description: string | null;
  amount: number;
  entry_date: string;
  reference_no: string | null;
  alloc_group: AllocGroup | null;
  percent: number | null;
  is_auto: boolean | null;
  created_at: string;
};

type Summary = {
  project_name: string;
  quotation_total: number;
  bom_cost_total: number;
  bom_count: number;
  allocation_total: number;
  total_income: number;
  total_expense: number;
  entry_count: number;
  net_profit: number;
  net_profit_projected: number;
  income_remaining: number;
  overrun: number;
  cash_balance: number;
};

type Project = {
  id: string | null;
  project_name: string;
  client_company: string | null;
  status: string | null;
  current_stage: string | null;
  source: "project" | "bom";
  summary: Summary;
  deleted_at?: string | null;
  is_deleted?: boolean | null;
};

type FormState = {
  entry_type: TxType;
  category: string;
  amount: string;
  entry_date: string;
  reference_no: string;
  description: string;
};

type PlanRow = {
  key: string;
  id: number | null;
  origName: string | null;
  group: AllocGroup;
  name: string;
  auto: boolean;
  percent: string;
  amount: string;
};

type Budget = {
  id: number;
  category: string;
  group: AllocGroup;
  allocated: number;
  percent: number;
  auto: boolean;
  actual: number;
  remaining: number;
};

type HiddenProject = { id: string | null; name: string };

// ================= CONST =================
const API = "/api/management/cost_analysist";
const BOM_API = "/api/management/create_bom";
const UNALLOCATED = "UNALLOCATED";
const HIDDEN_KEY = "cost_analysis_deleted_projects";
const DELETED_STATUSES = ["deleted", "dihapus", "removed"];

const INCOME_OPTIONS = [
  { value: "DOWN_PAYMENT", label: "Down Payment (DP)" },
  { value: "TERMIN_PAYMENT", label: "Pembayaran Termin" },
  { value: "FINAL_PAYMENT", label: "Pelunasan" },
  { value: "OTHER_INCOME", label: "Pemasukan Lain" },
];

const ALLOC_GROUPS: Record<AllocGroup, { label: string; name: string; bar: string; chip: string }> = {
  RAW_MATERIAL: { label: "Raw Material Estimate", name: "Raw Material", bar: "bg-sky-500", chip: "bg-sky-50 text-sky-700 ring-sky-200" },
  TRANSPORT: { label: "Transport", name: "Transport", bar: "bg-amber-500", chip: "bg-amber-50 text-amber-700 ring-amber-200" },
  DIVIDEN: { label: "Dividen", name: "Dividen", bar: "bg-violet-500", chip: "bg-violet-50 text-violet-700 ring-violet-200" },
  OTHER: { label: "Lainnya", name: "Lainnya", bar: "bg-slate-500", chip: "bg-slate-100 text-slate-700 ring-slate-200" },
};
const GROUP_KEYS = Object.keys(ALLOC_GROUPS) as AllocGroup[];

const TYPE_META: Record<EntryType, { label: string; badge: string; amount: string; sign: string }> = {
  income: { label: "Pemasukan", badge: "bg-emerald-50 text-emerald-700 ring-emerald-200", amount: "text-emerald-600", sign: "+" },
  expense: { label: "Pengeluaran", badge: "bg-rose-50 text-rose-700 ring-rose-200", amount: "text-rose-600", sign: "−" },
  allocation: { label: "Alokasi", badge: "bg-indigo-50 text-indigo-700 ring-indigo-200", amount: "text-indigo-600", sign: "•" },
};

// ================= HELPERS =================
const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const idr = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n || 0);
const pctText = (n: number) => `${(Number.isFinite(n) ? n : 0).toFixed(1)}%`;
const norm = (v: string | null | undefined) => (v ?? "").trim().toLowerCase();
const today = () => new Date().toISOString().slice(0, 10);
const sumOf = (list: Entry[]) => list.reduce((t, e) => t + num(e.amount), 0);
let keySeq = 0;
const newKey = () => `row_${Date.now()}_${keySeq++}`;
const rowAmount = (r: PlanRow, q: number) => (r.auto ? Math.round((q * num(r.percent)) / 100) : Math.round(num(r.amount)));
const incomeLabel = (c: string) => INCOME_OPTIONS.find((o) => o.value === c)?.label ?? c;
const expenseLabel = (c: string) => (c === UNALLOCATED ? "Di luar alokasi" : c);

// ---- daftar project yang sudah dihapus (disimpan lokal supaya tidak muncul lagi di sidebar) ----
const readHidden = (): HiddenProject[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HIDDEN_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

const addHidden = (p: { id: string | null; project_name: string }) => {
  if (typeof window === "undefined") return;
  try {
    const list = readHidden();
    list.push({ id: p.id ?? null, name: p.project_name });
    window.localStorage.setItem(HIDDEN_KEY, JSON.stringify(list.slice(-300)));
  } catch {
    /* abaikan jika storage tidak tersedia */
  }
};

const isDeletedProject = (p: Project, hidden: HiddenProject[]) => {
  if (p.deleted_at || p.is_deleted) return true;
  if (DELETED_STATUSES.includes(norm(p.status))) return true;
  return hidden.some((h) => (h.id && p.id === h.id) || (!p.id && !h.id && norm(h.name) === norm(p.project_name)) || (!p.id && h.id && norm(h.name) === norm(p.project_name)));
};

const emptyForm = (type: TxType = "expense", category = UNALLOCATED): FormState => ({
  entry_type: type,
  category,
  amount: "",
  entry_date: today(),
  reference_no: "",
  description: "",
});

const toPayload = (e: Entry) => ({
  project_id: e.project_id,
  project_name: e.project_name,
  entry_type: e.entry_type,
  category: e.category,
  amount: num(e.amount),
  entry_date: (e.entry_date ?? today()).slice(0, 10),
  reference_no: e.reference_no,
  description: e.description,
  alloc_group: e.alloc_group,
  percent: e.percent,
  is_auto: e.is_auto,
});

async function api(url: string, method = "GET", body?: unknown) {
  const res = await fetch(url, {
    method,
    cache: "no-store",
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || `Request gagal (${res.status})`);
  return json;
}

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100";

// ================= PAGE =================
export default function CostAnalysisPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | EntryType>("all");
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<EntryType>("expense");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [percent, setPercent] = useState("");
  const [plan, setPlan] = useState<PlanRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  // hapus project
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  const notify = useCallback((type: "ok" | "err", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4500);
  }, []);

  // ---------- LOAD ----------
  const loadProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      const json = await api(API);
      const hidden = readHidden();
      const list: Project[] = (json.projects ?? []).filter((p: Project) => !isDeletedProject(p, hidden));
      setProjects(list);
    } catch (e: any) {
      notify("err", e.message);
    } finally {
      setLoadingProjects(false);
    }
  }, [notify]);

  const loadDetail = useCallback(
    async (name: string) => {
      if (!name) return;
      setLoadingDetail(true);
      try {
        const json = await api(`${API}?project_name=${encodeURIComponent(name)}`);
        setEntries(json.entries ?? []);
        setSummary(json.summary ?? null);
      } catch (e: any) {
        notify("err", e.message);
      } finally {
        setLoadingDetail(false);
      }
    },
    [notify]
  );

  const refresh = useCallback(() => Promise.all([loadDetail(selected), loadProjects()]), [loadDetail, loadProjects, selected]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Pastikan project terpilih selalu ada di daftar (tidak menunjuk project yang sudah dihapus)
  useEffect(() => {
    if (loadingProjects) return;
    if (!projects.length) {
      if (selected) {
        setSelected("");
        setEntries([]);
        setSummary(null);
      }
      return;
    }
    if (!selected || !projects.some((p) => p.project_name === selected)) {
      setSelected(projects[0].project_name);
    }
  }, [projects, selected, loadingProjects]);

  useEffect(() => {
    if (selected) loadDetail(selected);
  }, [selected, loadDetail]);

  // ---------- DERIVED ----------
  const selectedProject = useMemo(() => projects.find((p) => p.project_name === selected) ?? null, [projects, selected]);
  const s: Summary | null = summary ?? selectedProject?.summary ?? null;
  const q = num(s?.quotation_total);
  const bomCost = num(s?.bom_cost_total);

  const filteredProjects = useMemo(() => {
    const k = search.trim().toLowerCase();
    if (!k) return projects;
    return projects.filter(
      (p) => p.project_name.toLowerCase().includes(k) || (p.client_company ?? "").toLowerCase().includes(k)
    );
  }, [projects, search]);

  const { allocations, incomes, expenses } = useMemo(
    () => ({
      allocations: entries.filter((e) => e.entry_type === "allocation"),
      incomes: entries.filter((e) => e.entry_type === "income"),
      expenses: entries.filter((e) => e.entry_type === "expense"),
    }),
    [entries]
  );

  const totalIncome = sumOf(incomes);
  const totalExpense = sumOf(expenses);
  const allocationTotal = sumOf(allocations);

  const { budgets, unallocated } = useMemo(() => {
    const map = new Map<string, Budget>();
    allocations.forEach((a) => {
      const allocated = num(a.amount);
      map.set(norm(a.category), {
        id: a.id,
        category: a.category,
        group: (a.alloc_group ?? "OTHER") as AllocGroup,
        allocated,
        percent: a.is_auto && a.percent != null ? num(a.percent) : q > 0 ? (allocated / q) * 100 : 0,
        auto: !!a.is_auto,
        actual: 0,
        remaining: 0,
      });
    });
    const un = new Map<string, number>();
    expenses.forEach((e) => {
      const b = map.get(norm(e.category));
      if (b) b.actual += num(e.amount);
      else un.set(e.category, (un.get(e.category) ?? 0) + num(e.amount));
    });
    return {
      budgets: Array.from(map.values()).map((b) => ({ ...b, remaining: b.allocated - b.actual })),
      unallocated: Array.from(un.entries()).map(([category, amount]) => ({ category, amount })),
    };
  }, [allocations, expenses, q]);

  const unallocatedTotal = unallocated.reduce((t, u) => t + u.amount, 0);
  const overrun = budgets.reduce((t, b) => t + Math.max(0, -b.remaining), 0) + unallocatedTotal;
  const netLocked = q - allocationTotal;
  const netLockedPct = q > 0 ? (netLocked / q) * 100 : 0;
  const netProjected = netLocked - overrun;
  const incomeRemaining = q - totalIncome;
  const incomePct = q > 0 ? Math.min((totalIncome / q) * 100, 100) : 0;
  const cashBalance = totalIncome - totalExpense;
  const staleAuto =
    q > 0 &&
    allocations.some((a) => a.is_auto && a.percent != null && Math.round((q * num(a.percent)) / 100) !== Math.round(num(a.amount)));
  const lockedSince = allocations.length
    ? allocations.map((a) => a.created_at || a.entry_date).filter(Boolean).sort()[0]
    : null;

  const filteredEntries = useMemo(
    () => (tab === "all" ? entries : entries.filter((e) => e.entry_type === tab)),
    [entries, tab]
  );
  const tabCount = (t: "all" | EntryType) => (t === "all" ? entries.length : entries.filter((e) => e.entry_type === t).length);

  // ---------- FORM LIVE INFO ----------
  const editingEntry = useMemo(() => (editingId ? entries.find((e) => e.id === editingId) ?? null : null), [editingId, entries]);
  const formAmount = num(form.amount);

  const expenseInfo = useMemo(() => {
    if (form.entry_type !== "expense") return null;
    const b = budgets.find((x) => norm(x.category) === norm(form.category));
    if (!b) return null;
    const self =
      editingEntry && editingEntry.entry_type === "expense" && norm(editingEntry.category) === norm(form.category)
        ? num(editingEntry.amount)
        : 0;
    const used = b.actual - self;
    const before = b.allocated - used;
    return { allocated: b.allocated, used, before, after: before - formAmount };
  }, [form.entry_type, form.category, budgets, editingEntry, formAmount]);

  const incomeInfo = useMemo(() => {
    if (form.entry_type !== "income") return null;
    const self = editingEntry?.entry_type === "income" ? num(editingEntry.amount) : 0;
    const received = totalIncome - self;
    const before = q - received;
    return { received, before, after: before - formAmount };
  }, [form.entry_type, editingEntry, totalIncome, q, formAmount]);

  const expenseOptions = useMemo(() => {
    const opts = budgets.map((b) => ({ value: b.category, label: `${b.category} — sisa ${idr(b.remaining)}` }));
    if (
      form.entry_type === "expense" &&
      form.category &&
      form.category !== UNALLOCATED &&
      !budgets.some((b) => norm(b.category) === norm(form.category))
    ) {
      opts.push({ value: form.category, label: `${form.category} (di luar alokasi)` });
    }
    opts.push({ value: UNALLOCATED, label: "Di luar alokasi (langsung kurangi net profit)" });
    return opts;
  }, [budgets, form.entry_type, form.category]);

  // ---------- PLANNER (ALOKASI) ----------
  const templatePlan = (): PlanRow[] => {
    const rmPct = q > 0 && bomCost > 0 ? ((bomCost / q) * 100).toFixed(2) : "";
    return [
      { key: newKey(), id: null, origName: null, group: "RAW_MATERIAL", name: "Raw Material", auto: true, percent: rmPct, amount: "" },
      { key: newKey(), id: null, origName: null, group: "TRANSPORT", name: "Transport", auto: true, percent: "", amount: "" },
      { key: newKey(), id: null, origName: null, group: "DIVIDEN", name: "Dividen 1", auto: true, percent: "", amount: "" },
      { key: newKey(), id: null, origName: null, group: "DIVIDEN", name: "Dividen 2", auto: true, percent: "", amount: "" },
    ];
  };

  const planFromEntries = (): PlanRow[] =>
    allocations.length
      ? allocations.map((a) => ({
          key: newKey(),
          id: a.id,
          origName: a.category,
          group: (a.alloc_group ?? "OTHER") as AllocGroup,
          name: a.category,
          auto: !!a.is_auto,
          percent:
            a.is_auto && a.percent != null ? String(num(a.percent)) : q > 0 ? ((num(a.amount) / q) * 100).toFixed(2) : "",
          amount: String(Math.round(num(a.amount))),
        }))
      : templatePlan();

  const planCalc = useMemo(() => {
    const rows = plan.map((r) => {
      const amt = rowAmount(r, q);
      return { ...r, amt, pct: q > 0 ? (amt / q) * 100 : 0 };
    });
    const total = rows.reduce((t, r) => t + r.amt, 0);
    return {
      rows,
      total,
      totalPct: q > 0 ? (total / q) * 100 : 0,
      net: q - total,
      netPct: q > 0 ? ((q - total) / q) * 100 : 0,
    };
  }, [plan, q]);

  const usedFor = (r: PlanRow) =>
    r.origName ? budgets.find((b) => norm(b.category) === norm(r.origName))?.actual ?? 0 : 0;

  const uniqueName = (base: string, exceptKey?: string) => {
    const used = new Set(plan.filter((r) => r.key !== exceptKey).map((r) => norm(r.name)));
    if (!used.has(norm(base))) return base;
    let i = 2;
    while (used.has(norm(`${base} ${i}`))) i++;
    return `${base} ${i}`;
  };

  const updateRow = (key: string, patch: Partial<PlanRow>) =>
    setPlan((p) => p.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const changeGroup = (r: PlanRow, g: AllocGroup) => {
    const isDefaultName = !r.name.trim() || GROUP_KEYS.some((k) => norm(ALLOC_GROUPS[k].name) === norm(r.name));
    updateRow(r.key, { group: g, name: isDefaultName ? uniqueName(ALLOC_GROUPS[g].name, r.key) : r.name });
  };

  const addRow = (g: AllocGroup) =>
    setPlan((p) => [
      ...p,
      { key: newKey(), id: null, origName: null, group: g, name: uniqueName(ALLOC_GROUPS[g].name), auto: true, percent: "", amount: "" },
    ]);

  const removeRow = (key: string) => setPlan((p) => p.filter((r) => r.key !== key));

  const toggleAuto = (r: PlanRow) => {
    const amt = rowAmount(r, q);
    if (r.auto) updateRow(r.key, { auto: false, amount: String(amt) });
    else updateRow(r.key, { auto: true, percent: q > 0 ? ((amt / q) * 100).toFixed(2) : "" });
  };

  // ---------- MODAL ----------
  const defaultCategory = (t: TxType) => (t === "income" ? "DOWN_PAYMENT" : budgets[0]?.category ?? UNALLOCATED);

  const openModal = (m: EntryType) => {
    if (!selected) return notify("err", "Pilih project terlebih dahulu.");
    setEditingId(null);
    setPercent("");
    setMode(m);
    if (m === "allocation") setPlan(planFromEntries());
    else setForm(emptyForm(m, defaultCategory(m)));
    setModalOpen(true);
  };

  const openCreate = () => openModal(allocations.length ? "expense" : "allocation");

  const openEdit = (e: Entry) => {
    if (e.entry_type === "allocation") return openModal("allocation");
    const t = e.entry_type as TxType;
    setEditingId(e.id);
    setMode(t);
    setPercent("");
    setForm({
      entry_type: t,
      category: e.category,
      amount: String(num(e.amount)),
      entry_date: e.entry_date?.slice(0, 10) || today(),
      reference_no: e.reference_no ?? "",
      description: e.description ?? "",
    });
    setModalOpen(true);
  };

  const changeMode = (m: EntryType) => {
    if (editingId) return;
    setMode(m);
    setPercent("");
    if (m === "allocation") {
      setPlan(planFromEntries());
      return;
    }
    setForm((f) => ({ ...f, entry_type: m, category: defaultCategory(m), amount: "" }));
  };

  const applyPercent = (val: string) => {
    setPercent(val);
    const p = Number(val);
    if (q > 0 && Number.isFinite(p) && p > 0) setForm((f) => ({ ...f, amount: String(Math.round((q * p) / 100)) }));
  };

  // ---------- SAVE ALOKASI ----------
  const savePlan = async () => {
    const rows = planCalc.rows.map((r) => ({ ...r, name: r.name.trim() }));
    const active = rows.filter((r) => r.amt > 0);

    if (active.some((r) => !r.name)) return notify("err", "Nama kategori alokasi wajib diisi.");
    if (active.some((r) => norm(r.name) === norm(UNALLOCATED))) return notify("err", `Nama "${UNALLOCATED}" tidak boleh dipakai.`);
    const names = active.map((r) => norm(r.name));
    if (new Set(names).size !== names.length) return notify("err", "Nama kategori alokasi tidak boleh duplikat.");
    if (planCalc.net < 0 && !confirm(`Total alokasi melebihi quotation. Net profit terkunci = ${idr(planCalc.net)}. Tetap simpan?`)) return;

    const keepIds = new Set(active.filter((r) => r.id).map((r) => r.id as number));
    const toDelete = allocations.filter((a) => !keepIds.has(a.id));
    const orphan = toDelete.filter((a) => expenses.some((e) => norm(e.category) === norm(a.category)));
    if (
      orphan.length &&
      !confirm(
        `Alokasi ${orphan.map((o) => `"${o.category}"`).join(", ")} sudah punya pengeluaran. Pengeluaran tersebut akan menjadi "di luar alokasi". Lanjutkan?`
      )
    )
      return;

    const allocPayload = (r: (typeof active)[number]) => {
      const existing = r.id ? allocations.find((a) => a.id === r.id) : null;
      return {
        project_id: selectedProject?.id ?? null,
        project_name: selected,
        entry_type: "allocation",
        category: r.name,
        alloc_group: r.group,
        is_auto: r.auto,
        percent: r.auto ? num(r.percent) : q > 0 ? Number(((r.amt / q) * 100).toFixed(3)) : null,
        amount: r.amt,
        entry_date: existing?.entry_date?.slice(0, 10) || today(),
        reference_no: existing?.reference_no ?? null,
        description: existing?.description ?? null,
      };
    };

    setSaving(true);
    try {
      for (const a of toDelete) await api(`${API}?id=${a.id}`, "DELETE");

      for (const r of active.filter((x) => x.id)) {
        await api(`${API}?id=${r.id}`, "PUT", allocPayload(r));
        // Rename kategori -> ikut pindahkan pengeluaran lama
        if (r.origName && norm(r.origName) !== norm(r.name)) {
          for (const e of expenses.filter((x) => norm(x.category) === norm(r.origName))) {
            await api(`${API}?id=${e.id}`, "PUT", { ...toPayload(e), category: r.name });
          }
        }
      }

      for (const r of active.filter((x) => !x.id)) await api(API, "POST", allocPayload(r));

      notify("ok", `Alokasi tersimpan. Net profit terkunci ${idr(planCalc.net)}`);
      setModalOpen(false);
      await refresh();
    } catch (e: any) {
      notify("err", e.message);
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  // ---------- SAVE TRANSAKSI ----------
  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (mode === "allocation") return savePlan();

    const amount = num(form.amount);
    if (!(amount > 0)) return notify("err", "Amount harus lebih dari 0.");
    if (
      expenseInfo &&
      expenseInfo.after < 0 &&
      !confirm(`Pengeluaran melebihi sisa alokasi "${form.category}" sebesar ${idr(-expenseInfo.after)}. Net profit akan berkurang. Lanjutkan?`)
    )
      return;
    if (
      incomeInfo &&
      incomeInfo.after < 0 &&
      !confirm(`Pemasukan melebihi sisa tagihan sebesar ${idr(-incomeInfo.after)}. Lanjutkan?`)
    )
      return;

    setSaving(true);
    try {
      const base = editingEntry ? toPayload(editingEntry) : {};
      const payload = {
        ...base,
        ...form,
        amount,
        project_id: selectedProject?.id ?? null,
        project_name: selected,
        alloc_group: null,
        percent: null,
        is_auto: false,
      };
      const json = await api(editingId ? `${API}?id=${editingId}` : API, editingId ? "PUT" : "POST", payload);
      notify("ok", json.message || "Tersimpan");
      setModalOpen(false);
      await refresh();
    } catch (e: any) {
      notify("err", e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e: Entry) => {
    const hasExpense = e.entry_type === "allocation" && expenses.some((x) => norm(x.category) === norm(e.category));
    const msg = hasExpense
      ? `Alokasi "${e.category}" sudah punya pengeluaran. Pengeluaran akan menjadi "di luar alokasi". Hapus?`
      : "Hapus data ini?";
    if (!confirm(msg)) return;
    try {
      const json = await api(`${API}?id=${e.id}`, "DELETE");
      notify("ok", json.message);
      await refresh();
    } catch (err: any) {
      notify("err", err.message);
    }
  };

  // ---------- HAPUS PROJECT ----------
  const openDeleteProject = () => {
    if (!selectedProject) return;
    setDeleteConfirm("");
    setDeleteTarget(selectedProject);
  };

  const closeDeleteProject = () => {
    if (deleting) return;
    setDeleteTarget(null);
    setDeleteConfirm("");
  };

  const handleDeleteProject = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!deleteTarget) return;
    if (deleteConfirm.trim() !== deleteTarget.project_name.trim()) {
      return notify("err", "Nama project yang diketik tidak sama.");
    }

    const name = deleteTarget.project_name;
    setDeleting(true);
    try {
      // 1) Hapus project + data cost analysis
      const qs = new URLSearchParams({ project_name: name });
      if (deleteTarget.id) qs.set("project_id", deleteTarget.id);
      const json = await api(`${API}?${qs.toString()}`, "DELETE");

      // 2) Hapus seluruh BOM milik project ini
      let bomDeleted = 0;
      let bomError: string | null = null;
      try {
        const bomRes = await api(`${BOM_API}?${new URLSearchParams({ project_name: name }).toString()}`, "DELETE");
        bomDeleted = num(bomRes?.deleted);
      } catch (bomErr: any) {
        bomError = bomErr?.message || "Gagal menghapus BOM";
      }

      // Catat project yang sudah dihapus agar tidak muncul lagi di sidebar
      addHidden({ id: deleteTarget.id, project_name: name });

      // Update list lokal dulu supaya auto-select tidak memilih project yang baru dihapus
      const remaining = projects.filter((p) => p.project_name !== name);
      setProjects(remaining);
      setEntries([]);
      setSummary(null);
      setTab("all");
      setSelected(remaining[0]?.project_name ?? "");

      setDeleteTarget(null);
      setDeleteConfirm("");

      if (bomError) {
        notify("err", `Project terhapus, tetapi BOM gagal dihapus: ${bomError}`);
      } else {
        const base = json.message || "Project berhasil dihapus";
        notify("ok", bomDeleted > 0 ? `${base} · ${bomDeleted} item BOM ikut terhapus` : base);
      }

      // Sinkronkan dengan server (project yang dihapus tetap disaring)
      await loadProjects();
    } catch (err: any) {
      notify("err", err.message);
    } finally {
      setDeleting(false);
    }
  };

  // ================= RENDER =================
  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-800 md:p-6">
      {/* HEADER */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Cost Analysis</h1>
          <p className="text-sm text-slate-500">Alokasi budget, pengeluaran, penagihan & net profit per project</p>
        </div>
        <button
          onClick={() => {
            loadProjects();
            if (selected) loadDetail(selected);
          }}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100"
        >
          ⟳ Refresh
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        {/* SIDEBAR PROJECT */}
        <aside className="h-fit rounded-xl border border-slate-200 bg-white shadow-sm lg:sticky lg:top-4">
          <div className="border-b border-slate-200 p-4">
            <h2 className="mb-2 text-sm font-semibold text-slate-700">Project ({projects.length})</h2>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari project / client..." className={inputCls} />
          </div>
          <div className="max-h-[70vh] overflow-y-auto p-2">
            {loadingProjects && <p className="p-3 text-sm text-slate-400">Memuat...</p>}
            {!loadingProjects && filteredProjects.length === 0 && <p className="p-3 text-sm text-slate-400">Tidak ada project.</p>}
            {filteredProjects.map((p) => {
              const active = p.project_name === selected;
              const np = num(p.summary?.net_profit);
              const hasAlloc = num(p.summary?.allocation_total) > 0;
              return (
                <button
                  key={p.id ?? p.project_name}
                  onClick={() => {
                    setSelected(p.project_name);
                    setTab("all");
                  }}
                  className={`mb-1 w-full rounded-lg border px-3 py-2.5 text-left transition ${
                    active ? "border-blue-300 bg-blue-50" : "border-transparent hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="line-clamp-1 text-sm font-semibold text-slate-800">{p.project_name}</span>
                    {p.source === "bom" && (
                      <span className="shrink-0 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-200">BOM</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">{p.client_company ?? "—"}</div>
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="text-slate-600">{idr(num(p.summary?.quotation_total))}</span>
                    <span className={`font-semibold ${!hasAlloc ? "text-slate-400" : np >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {hasAlloc ? `🔒 ${idr(np)}` : "Belum alokasi"}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-400">Sisa tagih {idr(num(p.summary?.income_remaining))}</div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* MAIN */}
        <main className="space-y-5">
          {!selected ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-400">Pilih project</div>
          ) : (
            <>
              {/* CARD 1: OVERVIEW */}
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{selected}</h2>
                    <p className="text-sm text-slate-500">
                      {selectedProject?.client_company ?? "—"}
                      {selectedProject?.status ? ` · ${selectedProject.status}` : ""}
                      {selectedProject?.current_stage ? ` · ${selectedProject.current_stage.replace(/_/g, " ")}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedProject?.source === "project" && (
                      <button
                        onClick={openDeleteProject}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                        title="Hapus project beserta seluruh data cost analysis dan BOM (juga terhapus di Project Management)"
                      >
                        🗑 Hapus Project
                      </button>
                    )}
                    <button
                      onClick={() => openModal("allocation")}
                      className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
                    >
                      ⚙ Atur Alokasi
                    </button>
                    <button onClick={openCreate} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
                      + Input Transaksi
                    </button>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                  <Stat label="Total Quotation" value={idr(q)} tone="blue" hint={`BOM cost ${idr(bomCost)}`} />
                  <Stat label="Total Alokasi" value={idr(allocationTotal)} hint={`${pctText(q > 0 ? (allocationTotal / q) * 100 : 0)} dari quotation`} />
                  <Stat label="Pemasukan Diterima" value={idr(totalIncome)} tone="green" hint={`Sisa tagihan ${idr(incomeRemaining)}`} />
                  <Stat label="Pengeluaran Aktual" value={idr(totalExpense)} tone="red" hint={`Cash balance ${idr(cashBalance)}`} />
                </div>
              </section>

              {/* CARD 2: LIST INPUT */}
              <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-3">
                  <h3 className="font-semibold text-slate-800">Riwayat Input</h3>
                  <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
                    {(["all", "income", "expense", "allocation"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                          tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        {t === "all" ? "Semua" : TYPE_META[t].label} ({tabCount(t)})
                      </button>
                    ))}
                  </div>
                </div>

                <div className="max-h-[420px] overflow-y-auto">
                  {loadingDetail ? (
                    <p className="p-5 text-sm text-slate-400">Memuat...</p>
                  ) : filteredEntries.length === 0 ? (
                    <p className="p-8 text-center text-sm text-slate-400">Belum ada data. Klik “+ Input Transaksi”.</p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {filteredEntries.map((e) => {
                        const isAlloc = e.entry_type === "allocation";
                        const isExp = e.entry_type === "expense";
                        const outOfAlloc = isExp && !budgets.some((b) => norm(b.category) === norm(e.category));
                        const group = (e.alloc_group ?? "OTHER") as AllocGroup;
                        return (
                          <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${TYPE_META[e.entry_type].badge}`}>
                                  {TYPE_META[e.entry_type].label}
                                </span>
                                {isAlloc && (
                                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${ALLOC_GROUPS[group].chip}`}>
                                    {ALLOC_GROUPS[group].label}
                                  </span>
                                )}
                                <span className="text-sm font-semibold text-slate-800">
                                  {e.entry_type === "income" ? incomeLabel(e.category) : isExp ? expenseLabel(e.category) : e.category}
                                </span>
                                {isAlloc && (
                                  <span className="text-[11px] text-slate-500">
                                    {pctText(e.is_auto && e.percent != null ? num(e.percent) : q > 0 ? (num(e.amount) / q) * 100 : 0)}
                                    {e.is_auto ? " · AUTO" : ""}
                                  </span>
                                )}
                                {outOfAlloc && (
                                  <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-200">
                                    di luar alokasi
                                  </span>
                                )}
                              </div>
                              <div className="mt-0.5 text-xs text-slate-500">
                                {new Date(e.entry_date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                                {e.reference_no ? ` · Ref: ${e.reference_no}` : ""}
                                {e.description ? ` · ${e.description}` : ""}
                              </div>
                            </div>
                            <div className={`text-sm font-bold ${TYPE_META[e.entry_type].amount}`}>
                              {TYPE_META[e.entry_type].sign} {idr(num(e.amount))}
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => openEdit(e)}
                                className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(e)}
                                className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                              >
                                Hapus
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </section>

              {/* CARD 3: COST ANALYSIS */}
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-slate-800">Cost Analysis</h3>
                    {lockedSince && (
                      <p className="text-[11px] text-slate-400">
                        Net profit dikunci sejak {new Date(lockedSince).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    )}
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                      netProjected >= 0 ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-rose-50 text-rose-700 ring-rose-200"
                    }`}
                  >
                    {netProjected >= 0 ? "PROFIT" : "LOSS"} · 🔒 {pctText(netLockedPct)}
                  </span>
                </div>

                {staleAuto && (
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
                    <span>Total quotation berubah. Alokasi mode AUTO perlu dihitung ulang.</span>
                    <button onClick={() => openModal("allocation")} className="rounded-md bg-amber-600 px-2.5 py-1 font-semibold text-white hover:bg-amber-700">
                      Recalc Auto
                    </button>
                  </div>
                )}

                {allocations.length === 0 && (
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-800 ring-1 ring-indigo-100">
                    <span>Belum ada alokasi. Buat alokasi untuk mengunci net profit di awal project.</span>
                    <button onClick={() => openModal("allocation")} className="rounded-md bg-indigo-600 px-2.5 py-1 font-semibold text-white hover:bg-indigo-700">
                      Buat Alokasi
                    </button>
                  </div>
                )}

                <div className="grid gap-5 md:grid-cols-2">
                  {/* Waterfall */}
                  <div className="space-y-4">
                    <div className="rounded-lg border border-slate-200">
                      <Row label="Total Quotation (BOM)" value={q} bold />
                      {budgets.map((b) => (
                        <Row key={b.id} label={b.category} value={-b.allocated} dot={ALLOC_GROUPS[b.group].bar} sub={`${pctText(b.percent)}${b.auto ? " · auto" : ""}`} />
                      ))}
                      <div className={`flex items-center justify-between px-4 py-3 ${netLocked >= 0 ? "bg-emerald-50" : "bg-rose-50"}`}>
                        <span className="text-sm font-bold text-slate-800">🔒 Net Profit Terkunci</span>
                        <span className={`text-base font-bold ${netLocked >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{idr(netLocked)}</span>
                      </div>
                      <Row label="Overrun & di luar alokasi" value={-overrun} />
                      <div className={`flex items-center justify-between rounded-b-lg px-4 py-3 ${netProjected >= 0 ? "bg-emerald-50/60" : "bg-rose-50/60"}`}>
                        <span className="text-sm font-semibold text-slate-700">Proyeksi Net Profit</span>
                        <span className={`text-sm font-bold ${netProjected >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{idr(netProjected)}</span>
                      </div>
                    </div>

                    {q > 0 && allocations.length > 0 && (
                      <div className="rounded-lg border border-slate-200 p-3">
                        <AllocBar
                          items={budgets.map((b) => ({ label: b.category, pct: q > 0 ? (b.allocated / q) * 100 : 0, cls: ALLOC_GROUPS[b.group].bar }))}
                          netPct={netLockedPct}
                        />
                      </div>
                    )}
                  </div>

                  {/* Budget per kategori + Penagihan */}
                  <div className="space-y-4">
                    <div className="rounded-lg border border-slate-200 p-4">
                      <div className="mb-3 text-sm font-semibold text-slate-700">Sisa Alokasi per Kategori</div>
                      {budgets.length === 0 && <p className="text-xs text-slate-400">Belum ada alokasi.</p>}
                      <div className="space-y-3">
                        {budgets.map((b) => {
                          const usedPct = b.allocated > 0 ? (b.actual / b.allocated) * 100 : 0;
                          const plus = b.remaining >= 0;
                          return (
                            <div key={b.id}>
                              <div className="flex items-center justify-between gap-2 text-xs">
                                <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                                  <span className={`h-2 w-2 rounded-full ${ALLOC_GROUPS[b.group].bar}`} />
                                  {b.category}
                                </span>
                                <span className={`font-bold ${plus ? "text-emerald-600" : "text-rose-600"}`}>
                                  {plus ? "Sisa " : "Over "}
                                  {idr(Math.abs(b.remaining))}
                                </span>
                              </div>
                              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className={`h-full rounded-full ${!plus ? "bg-rose-500" : usedPct > 85 ? "bg-amber-500" : "bg-emerald-500"}`}
                                  style={{ width: `${Math.min(usedPct, 100)}%` }}
                                />
                              </div>
                              <div className="mt-0.5 flex justify-between text-[11px] text-slate-500">
                                <span>Aktual {idr(b.actual)} ({usedPct.toFixed(0)}%)</span>
                                <span>Alokasi {idr(b.allocated)}</span>
                              </div>
                            </div>
                          );
                        })}
                        {unallocated.map((u) => (
                          <div key={u.category} className="flex items-center justify-between rounded-md bg-amber-50 px-2 py-1.5 text-xs ring-1 ring-amber-200">
                            <span className="font-medium text-amber-800">{expenseLabel(u.category)} (di luar alokasi)</span>
                            <span className="font-bold text-rose-600">− {idr(u.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-700">Penagihan</span>
                        <span className={`text-xs font-bold ${incomeRemaining > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                          {incomeRemaining > 0 ? "Belum lunas" : "Lunas"}
                        </span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${incomePct}%` }} />
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                        <Mini label="Quotation" value={idr(q)} />
                        <Mini label={`Diterima (${incomePct.toFixed(0)}%)`} value={idr(totalIncome)} tone="green" />
                        <Mini label="Belum ditagih" value={idr(incomeRemaining)} tone={incomeRemaining > 0 ? "red" : "green"} />
                      </div>
                    </div>

                    <Stat
                      label="Cash Balance"
                      value={idr(cashBalance)}
                      tone={cashBalance >= 0 ? "green" : "red"}
                      hint="Pemasukan diterima − Pengeluaran aktual"
                    />
                  </div>
                </div>
              </section>
            </>
          )}
        </main>
      </div>

      {/* MODAL INPUT */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => !saving && setModalOpen(false)}>
          <form
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
            className={`flex max-h-[92vh] w-full flex-col rounded-xl bg-white shadow-xl ${mode === "allocation" ? "max-w-3xl" : "max-w-lg"}`}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="font-bold text-slate-900">
                  {mode === "allocation" ? "Atur Alokasi & Kunci Net Profit" : editingId ? "Edit Transaksi" : "Input Transaksi"}
                </h3>
                <p className="text-xs text-slate-500">
                  {selected} · Quotation {idr(q)}
                </p>
              </div>
              <button type="button" onClick={() => setModalOpen(false)} className="text-xl leading-none text-slate-400 hover:text-slate-600">
                ×
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto px-5 py-4">
              <div className="grid grid-cols-3 gap-2">
                {(["income", "expense", "allocation"] as const).map((t) => (
                  <button
                    type="button"
                    key={t}
                    disabled={!!editingId && mode !== t}
                    onClick={() => changeMode(t)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      mode === t ? `${TYPE_META[t].badge} ring-1` : "border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    {TYPE_META[t].label}
                  </button>
                ))}
              </div>

              {mode === "allocation" ? (
                /* ================= PLANNER ALOKASI ================= */
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-indigo-50/60 px-3 py-2 text-xs text-indigo-800 ring-1 ring-indigo-100">
                    <span>
                      Basis: <b>Total Quotation {idr(q)}</b>
                      {bomCost > 0 && q > 0 && (
                        <>
                          {" "}
                          · BOM Cost {idr(bomCost)} ({pctText((bomCost / q) * 100)})
                        </>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPlan(templatePlan())}
                      className="rounded-md border border-indigo-200 bg-white px-2.5 py-1 font-medium text-indigo-700 hover:bg-indigo-50"
                    >
                      Reset Template
                    </button>
                  </div>

                  {q <= 0 && (
                    <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
                      Quotation masih 0. Mode Auto (%) menghasilkan Rp 0, jadi gunakan mode Manual.
                    </p>
                  )}

                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full min-w-[680px] text-sm">
                      <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-3 py-2 text-left">Format</th>
                          <th className="px-3 py-2 text-left">Nama Kategori</th>
                          <th className="px-3 py-2 text-center">Auto Fill</th>
                          <th className="px-3 py-2 text-right">%</th>
                          <th className="px-3 py-2 text-right">Amount</th>
                          <th className="w-8" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {planCalc.rows.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-3 py-6 text-center text-xs text-slate-400">
                              Belum ada baris. Tambahkan kategori di bawah.
                            </td>
                          </tr>
                        )}
                        {planCalc.rows.map((r) => {
                          const used = usedFor(r);
                          return (
                            <tr key={r.key} className="align-top">
                              <td className="px-3 py-2">
                                <select value={r.group} onChange={(e) => changeGroup(r, e.target.value as AllocGroup)} className={`${inputCls} py-1.5`}>
                                  {GROUP_KEYS.map((g) => (
                                    <option key={g} value={g}>
                                      {ALLOC_GROUPS[g].label}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  value={r.name}
                                  onChange={(e) => updateRow(r.key, { name: e.target.value })}
                                  placeholder="Nama kategori"
                                  className={`${inputCls} py-1.5`}
                                />
                                {used > 0 && (
                                  <div className={`mt-0.5 text-[10px] ${used > r.amt ? "font-semibold text-rose-600" : "text-slate-400"}`}>
                                    Terpakai {idr(used)}
                                    {used > r.amt ? " (melebihi alokasi)" : ""}
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <Toggle on={r.auto} onClick={() => toggleAuto(r)} />
                                <div className="mt-0.5 text-[10px] text-slate-400">{r.auto ? "Auto %" : "Manual"}</div>
                              </td>
                              <td className="px-3 py-2">
                                {r.auto ? (
                                  <input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={r.percent}
                                    onChange={(e) => updateRow(r.key, { percent: e.target.value })}
                                    placeholder="0"
                                    className={`${inputCls} ml-auto w-24 py-1.5 text-right`}
                                  />
                                ) : (
                                  <div className="py-1.5 text-right text-slate-500">{pctText(r.pct)}</div>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {r.auto ? (
                                  <div className="py-1.5 text-right font-semibold text-slate-800">{idr(r.amt)}</div>
                                ) : (
                                  <input
                                    type="number"
                                    min={0}
                                    value={r.amount}
                                    onChange={(e) => updateRow(r.key, { amount: e.target.value })}
                                    placeholder="0"
                                    className={`${inputCls} py-1.5 text-right`}
                                  />
                                )}
                              </td>
                              <td className="px-2 py-2 text-center">
                                <button type="button" onClick={() => removeRow(r.key)} className="py-1.5 text-slate-400 hover:text-rose-600" title="Hapus baris">
                                  ✕
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {GROUP_KEYS.map((g) => (
                      <button
                        type="button"
                        key={g}
                        onClick={() => addRow(g)}
                        className="rounded-md border border-dashed border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        + {ALLOC_GROUPS[g].label}
                      </button>
                    ))}
                  </div>

                  <div className={`rounded-lg border p-3 ${planCalc.net >= 0 ? "border-emerald-200 bg-emerald-50/40" : "border-rose-200 bg-rose-50/40"}`}>
                    <AllocBar
                      items={planCalc.rows.map((r) => ({ label: r.name || "-", pct: r.pct, cls: ALLOC_GROUPS[r.group].bar }))}
                      netPct={planCalc.netPct}
                    />
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <Mini label="Total Quotation" value={idr(q)} />
                      <Mini label={`Total Alokasi (${pctText(planCalc.totalPct)})`} value={idr(planCalc.total)} />
                      <Mini label={`🔒 Net Profit (${pctText(planCalc.netPct)})`} value={idr(planCalc.net)} tone={planCalc.net >= 0 ? "green" : "red"} />
                    </div>
                    <p className="mt-2 text-[11px] text-slate-500">
                      Baris dengan amount 0 tidak disimpan. Kategori alokasi otomatis jadi pilihan kategori saat input pengeluaran.
                    </p>
                  </div>
                </div>
              ) : (
                /* ================= FORM TRANSAKSI ================= */
                <>
                  <Field label="Kategori">
                    {form.entry_type === "income" ? (
                      <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputCls}>
                        {INCOME_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputCls}>
                        {expenseOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </Field>

                  {form.entry_type === "expense" && budgets.length === 0 && (
                    <div className="flex items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
                      <span>Belum ada alokasi untuk project ini.</span>
                      {!editingId && (
                        <button type="button" onClick={() => changeMode("allocation")} className="rounded-md bg-amber-600 px-2.5 py-1 font-semibold text-white">
                          Buat Alokasi
                        </button>
                      )}
                    </div>
                  )}

                  {expenseInfo && (
                    <RemainBox
                      title={`Sisa alokasi: ${form.category}`}
                      totalLabel="Alokasi"
                      total={expenseInfo.allocated}
                      usedLabel="Terpakai"
                      used={expenseInfo.used}
                      before={expenseInfo.before}
                      after={expenseInfo.after}
                      input={formAmount}
                      okText="Masih Plus"
                      badText="Over Budget"
                    />
                  )}

                  {form.entry_type === "expense" && !expenseInfo && budgets.length > 0 && (
                    <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
                      Pengeluaran di luar alokasi langsung mengurangi proyeksi net profit.
                    </p>
                  )}

                  {incomeInfo && (
                    <RemainBox
                      title="Sisa tagihan (Quotation − Diterima)"
                      totalLabel="Quotation"
                      total={q}
                      usedLabel="Diterima"
                      used={incomeInfo.received}
                      before={incomeInfo.before}
                      after={incomeInfo.after}
                      input={formAmount}
                      okText="Sisa Tagihan"
                      badText="Melebihi Quotation"
                    />
                  )}

                  <div className="flex flex-wrap gap-2">
                    {expenseInfo && expenseInfo.before > 0 && (
                      <QuickBtn onClick={() => setForm({ ...form, amount: String(Math.round(expenseInfo.before)) })}>
                        Isi sisa alokasi {idr(expenseInfo.before)}
                      </QuickBtn>
                    )}
                    {incomeInfo && incomeInfo.before > 0 && (
                      <QuickBtn onClick={() => setForm({ ...form, amount: String(Math.round(incomeInfo.before)) })}>
                        Isi sisa tagihan {idr(incomeInfo.before)}
                      </QuickBtn>
                    )}
                    {form.entry_type === "income" &&
                      [30, 50, 100].map((p) => (
                        <QuickBtn key={p} onClick={() => applyPercent(String(p))}>
                          {p}% quotation
                        </QuickBtn>
                      ))}
                  </div>

                  {form.entry_type === "income" && (
                    <Field label="% dari Total Quotation (opsional)">
                      <input
                        type="number"
                        min={0}
                        step="0.1"
                        value={percent}
                        onChange={(e) => applyPercent(e.target.value)}
                        placeholder="contoh: 30"
                        className={inputCls}
                      />
                    </Field>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Amount (Rp)">
                      <input
                        type="number"
                        min={0}
                        required
                        value={form.amount}
                        onChange={(e) => setForm({ ...form, amount: e.target.value })}
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Tanggal">
                      <input
                        type="date"
                        required
                        value={form.entry_date}
                        onChange={(e) => setForm({ ...form, entry_date: e.target.value })}
                        className={inputCls}
                      />
                    </Field>
                  </div>
                  {formAmount > 0 && <p className="-mt-2 text-xs text-slate-500">{idr(formAmount)}</p>}

                  <Field label="No. Referensi (PO / Invoice)">
                    <input value={form.reference_no} onChange={(e) => setForm({ ...form, reference_no: e.target.value })} className={inputCls} />
                  </Field>
                  <Field label="Keterangan">
                    <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} />
                  </Field>
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? "Menyimpan..." : mode === "allocation" ? "🔒 Simpan & Kunci" : editingId ? "Update" : "Simpan"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL HAPUS PROJECT */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center bg-slate-900/50 p-4" onClick={closeDeleteProject}>
          <form
            onSubmit={handleDeleteProject}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl bg-white shadow-xl"
          >
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="font-bold text-rose-700">Hapus Project</h3>
              <p className="mt-0.5 text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan.</p>
            </div>

            <div className="space-y-3 px-5 py-4 text-sm text-slate-700">
              <p>
                Project <b className="text-slate-900">{deleteTarget.project_name}</b> akan dihapus permanen dari{" "}
                <b>Cost Analysis</b>, <b>BOM</b>, dan <b>Project Management</b>.
              </p>
              <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600">
                <li>
                  Seluruh data cost analysis ({num(deleteTarget.summary?.entry_count)} entri: alokasi, pemasukan, pengeluaran) ikut terhapus.
                </li>
                <li>
                  Seluruh data BOM project ini ({num(deleteTarget.summary?.bom_count)} item) ikut terhapus.
                </li>
                <li>Project hilang dari halaman Project Management beserta stage, catatan, dan riwayatnya.</li>
              </ul>
              <Field label={`Ketik "${deleteTarget.project_name}" untuk konfirmasi`}>
                <input
                  autoFocus
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder={deleteTarget.project_name}
                  className={inputCls}
                />
              </Field>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button
                type="button"
                onClick={closeDeleteProject}
                disabled={deleting}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={deleting || deleteConfirm.trim() !== deleteTarget.project_name.trim()}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? "Menghapus..." : "Hapus Permanen"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-[60] max-w-sm rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === "ok" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ================= SMALL COMPONENTS =================
function Stat({ label, value, tone, hint }: { label: string; value: string; tone?: "blue" | "green" | "red"; hint?: string }) {
  const color =
    tone === "blue" ? "text-blue-700" : tone === "green" ? "text-emerald-700" : tone === "red" ? "text-rose-700" : "text-slate-800";
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3" title={hint}>
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-base font-bold ${color}`}>{value}</div>
      {hint && <div className="mt-0.5 text-[10px] text-slate-400">{hint}</div>}
    </div>
  );
}

function Row({ label, value, bold, dot, sub }: { label: string; value: number; bold?: boolean; dot?: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
      <span className={`flex items-center gap-2 text-sm ${bold ? "font-semibold text-slate-800" : "text-slate-600"}`}>
        {dot && <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />}
        {label}
        {sub && <span className="text-[11px] text-slate-400">{sub}</span>}
      </span>
      <span className={`text-sm ${bold ? "font-bold text-blue-700" : value < 0 ? "text-rose-600" : "text-slate-700"}`}>
        {value < 0 ? `− ${idr(Math.abs(value))}` : idr(value)}
      </span>
    </div>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone?: "green" | "red" }) {
  const color = tone === "green" ? "text-emerald-700" : tone === "red" ? "text-rose-700" : "text-slate-800";
  return (
    <div>
      <div className="text-slate-500">{label}</div>
      <div className={`font-semibold ${color}`}>{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function QuickBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-dashed border-blue-300 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
    >
      {children}
    </button>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={on ? "Auto (% dari quotation)" : "Manual (Rp)"}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${on ? "bg-indigo-600" : "bg-slate-300"}`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition ${on ? "translate-x-4" : "translate-x-0.5"}`} />
    </button>
  );
}

function AllocBar({ items, netPct }: { items: { label: string; pct: number; cls: string }[]; netPct: number }) {
  const net = Math.max(netPct, 0);
  const total = items.reduce((t, i) => t + Math.max(i.pct, 0), 0) + net;
  const scale = total > 100 ? 100 / total : 1;
  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
        {items.map((i, idx) =>
          i.pct > 0 ? <div key={idx} className={i.cls} style={{ width: `${i.pct * scale}%` }} title={`${i.label} ${pctText(i.pct)}`} /> : null
        )}
        {net > 0 && <div className="bg-emerald-500" style={{ width: `${net * scale}%` }} title={`Net Profit ${pctText(net)}`} />}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600">
        {items
          .filter((i) => i.pct > 0)
          .map((i, idx) => (
            <span key={idx} className="flex items-center gap-1">
              <span className={`h-2 w-2 rounded-full ${i.cls}`} />
              {i.label} {pctText(i.pct)}
            </span>
          ))}
        <span className={`flex items-center gap-1 font-semibold ${netPct >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Net Profit {pctText(netPct)}
        </span>
      </div>
    </div>
  );
}

function RemainBox({
  title,
  totalLabel,
  total,
  usedLabel,
  used,
  before,
  after,
  input,
  okText,
  badText,
}: {
  title: string;
  totalLabel: string;
  total: number;
  usedLabel: string;
  used: number;
  before: number;
  after: number;
  input: number;
  okText: string;
  badText: string;
}) {
  const usedPct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  const inPct = total > 0 ? Math.min((Math.max(input, 0) / total) * 100, 100 - usedPct) : 0;
  const ok = after >= 0;
  return (
    <div className={`rounded-lg border p-3 ${ok ? "border-slate-200 bg-slate-50/60" : "border-rose-200 bg-rose-50/60"}`}>
      <div className="mb-2 flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-slate-700">{title}</span>
        <span className={`font-bold ${ok ? "text-emerald-600" : "text-rose-600"}`}>{ok ? okText : badText}</span>
      </div>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div className="bg-slate-500" style={{ width: `${usedPct}%` }} />
        <div className={ok ? "bg-blue-500" : "bg-rose-500"} style={{ width: `${inPct}%` }} />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
        <Mini label={totalLabel} value={idr(total)} />
        <Mini label={usedLabel} value={idr(used)} />
        <Mini label="Sisa saat ini" value={idr(before)} tone={before >= 0 ? "green" : "red"} />
        <Mini label="Sisa setelah input" value={idr(after)} tone={ok ? "green" : "red"} />
      </div>
    </div>
  );
}