"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ================= TYPES =================
type EntryType = "income" | "expense" | "allocation";
type AllocGroup = "RAW_MATERIAL" | "TRANSPORT" | "DIVIDEN" | "OTHER";
type Health = "ok" | "warn" | "over" | "none";

type Entry = {
  id: number;
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

/** Angka ringkas yang dipakai kartu KPI (sama untuk mode "Semua Project" maupun 1 project). */
type View = {
  quotation: number;
  plan: number; // total alokasi yang direncanakan
  expense: number; // pengeluaran aktual
  overrun: number; // overrun kategori + pengeluaran di luar alokasi
  locked: number; // net profit terkunci = quotation - plan
  profit: number; // estimasi profit = locked - overrun
  income: number; // pemasukan diterima
};

type Row = {
  p: Project;
  quotation: number;
  plan: number;
  expense: number;
  overrun: number;
  remaining: number;
  usage: number;
  profit: number;
  margin: number;
  income: number;
  health: Health;
};

type Budget = {
  id: number;
  category: string;
  group: AllocGroup;
  allocated: number;
  actual: number;
  remaining: number;
};

type SortKey = "usage" | "profit" | "name";

// ================= CONST =================
const API = "/api/management/cost_analysist";
const ALL = "__ALL__";
const WARN_AT = 85; // % pemakaian plan yang dianggap "waspada"
const HIDDEN_KEY = "cost_analysis_deleted_projects";
const DELETED_STATUSES = ["deleted", "dihapus", "removed"];
const UNALLOCATED = "UNALLOCATED";

const GROUPS: Record<AllocGroup, { label: string; dot: string; bar: string }> = {
  RAW_MATERIAL: { label: "Raw Material", dot: "bg-sky-500", bar: "bg-sky-500" },
  TRANSPORT: { label: "Transport", dot: "bg-amber-500", bar: "bg-amber-500" },
  DIVIDEN: { label: "Dividen", dot: "bg-violet-500", bar: "bg-violet-500" },
  OTHER: { label: "Lainnya", dot: "bg-slate-500", bar: "bg-slate-500" },
};
const GROUP_KEYS = Object.keys(GROUPS) as AllocGroup[];

const HEALTH: Record<Health, { label: string; chip: string; bar: string; text: string }> = {
  ok: { label: "Aman", chip: "bg-emerald-50 text-emerald-700 ring-emerald-200", bar: "bg-emerald-500", text: "text-emerald-600" },
  warn: { label: "Waspada", chip: "bg-amber-50 text-amber-700 ring-amber-200", bar: "bg-amber-500", text: "text-amber-600" },
  over: { label: "Over budget", chip: "bg-rose-50 text-rose-700 ring-rose-200", bar: "bg-rose-500", text: "text-rose-600" },
  none: { label: "Belum alokasi", chip: "bg-slate-100 text-slate-600 ring-slate-200", bar: "bg-slate-300", text: "text-slate-400" },
};
const HEALTH_ORDER: Record<Health, number> = { over: 0, warn: 1, ok: 2, none: 3 };

// ================= HELPERS =================
const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const idr = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n || 0);
const pct = (n: number, d = 1) => `${(Number.isFinite(n) ? n : 0).toFixed(d)}%`;
const norm = (v: string | null | undefined) => (v ?? "").trim().toLowerCase();
const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Number.isFinite(n) ? n : 0));
const sumBy = <T,>(list: T[], f: (x: T) => number) => list.reduce((t, x) => t + f(x), 0);
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

const healthOf = (plan: number, expense: number, overrun: number): Health => {
  if (plan <= 0) return "none";
  if (overrun > 0 || expense > plan) return "over";
  return (expense / plan) * 100 >= WARN_AT ? "warn" : "ok";
};

// ---- project yang sudah dihapus (disimpan lokal oleh halaman lama) tetap disembunyikan ----
type HiddenProject = { id: string | null; name: string };
const readHidden = (): HiddenProject[] => {
  if (typeof window === "undefined") return [];
  try {
    const arr = JSON.parse(window.localStorage.getItem(HIDDEN_KEY) ?? "[]");
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};
const isDeletedProject = (p: Project, hidden: HiddenProject[]) => {
  if (p.deleted_at || p.is_deleted) return true;
  if (DELETED_STATUSES.includes(norm(p.status))) return true;
  return hidden.some((h) => (h.id && p.id === h.id) || (!p.id && norm(h.name) === norm(p.project_name)));
};

async function api(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || `Request gagal (${res.status})`);
  return json;
}

// ================= SMALL COMPONENTS =================
function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200/70 ${className}`} />;
}

function HealthBadge({ h }: { h: Health }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${HEALTH[h].chip}`}>
      {HEALTH[h].label}
    </span>
  );
}

const TONES = {
  indigo: { accent: "bg-indigo-500", value: "text-slate-900" },
  rose: { accent: "bg-rose-500", value: "text-slate-900" },
  emerald: { accent: "bg-emerald-500", value: "text-emerald-700" },
  amber: { accent: "bg-amber-500", value: "text-amber-700" },
  red: { accent: "bg-rose-500", value: "text-rose-700" },
  slate: { accent: "bg-slate-300", value: "text-slate-400" },
} as const;

function Kpi({
  label,
  value,
  hint,
  tone,
  loading,
}: {
  label: string;
  value: string;
  hint: string;
  tone: keyof typeof TONES;
  loading?: boolean;
}) {
  const t = TONES[tone];
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <span className={`absolute inset-y-0 left-0 w-1 ${t.accent}`} />
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-40" />
      ) : (
        <div className={`mt-1 break-words text-2xl font-bold tabular-nums ${t.value}`}>{value}</div>
      )}
      <div className="mt-1 text-xs text-slate-500">{loading ? <Skeleton className="h-3 w-28" /> : hint}</div>
    </div>
  );
}

function ContextStat({ label, value, tone = "text-slate-800" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`truncate text-sm font-bold tabular-nums ${tone}`}>{value}</div>
    </div>
  );
}

/** Bar tipis: terpakai vs plan. */
function Meter({ used, plan, className = "h-2" }: { used: number; plan: number; className?: string }) {
  const p = plan > 0 ? (used / plan) * 100 : 0;
  const color = plan <= 0 ? "bg-slate-300" : p > 100 ? "bg-rose-500" : p >= WARN_AT ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className={`w-full overflow-hidden rounded-full bg-slate-100 ${className}`}>
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${clamp(p)}%` }} />
    </div>
  );
}

/** Jembatan Quotation -> Plan -> Profit terkunci -> Overrun -> Estimasi profit. */
function ProfitBridge({ v }: { v: View }) {
  const base = Math.max(v.quotation, v.plan, 1);
  const w = (n: number) => clamp((n / base) * 100);
  const steps = [
    { label: "Total Quotation", value: v.quotation, left: 0, width: w(v.quotation), cls: "bg-blue-500", sign: "" },
    { label: "Plan Alokasi", value: -v.plan, left: w(Math.max(v.quotation - v.plan, 0)), width: w(Math.min(v.plan, v.quotation)), cls: "bg-indigo-500", sign: "" },
    { label: "Profit Terkunci", value: v.locked, left: 0, width: w(Math.max(v.locked, 0)), cls: v.locked >= 0 ? "bg-emerald-400" : "bg-rose-500", sign: "" },
    { label: "Overrun & luar alokasi", value: -v.overrun, left: w(Math.max(v.locked - v.overrun, 0)), width: w(Math.min(v.overrun, Math.max(v.locked, 0))), cls: "bg-rose-500", sign: "" },
    { label: "Estimasi Profit", value: v.profit, left: 0, width: w(Math.max(v.profit, 0)), cls: v.profit >= 0 ? "bg-emerald-600" : "bg-rose-600", sign: "" },
  ];
  return (
    <div className="space-y-3">
      {steps.map((s, i) => {
        const strong = i === 0 || i === steps.length - 1;
        return (
          <div key={s.label} className="grid grid-cols-[minmax(0,9rem)_1fr] items-center gap-3 sm:grid-cols-[10rem_1fr_9rem]">
            <span className={`truncate text-xs ${strong ? "font-bold text-slate-800" : "text-slate-600"}`}>{s.label}</span>
            <div className="relative order-3 col-span-2 h-3 rounded-full bg-slate-100 sm:order-none sm:col-span-1">
              <div className={`absolute top-0 h-full rounded-full ${s.cls}`} style={{ left: `${s.left}%`, width: `${Math.max(s.width, s.value !== 0 ? 0.8 : 0)}%` }} />
            </div>
            <span className={`justify-self-end text-xs tabular-nums sm:text-right ${strong ? "font-bold text-slate-900" : "font-semibold text-slate-700"} ${s.value < 0 && i !== 1 && i !== 3 ? "text-rose-600" : ""}`}>
              {idr(s.value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ================= PAGE =================
export default function CostAnalysisDashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<string>(ALL);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);

  const [search, setSearch] = useState("");
  const [healthFilter, setHealthFilter] = useState<"all" | Health>("all");
  const [sortKey, setSortKey] = useState<SortKey>("usage");

  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const detailReq = useRef(0);
  const isAll = selected === ALL;

  // ---------- LOAD ----------
  const loadProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      const json = await api(API);
      const hidden = readHidden();
      setProjects((json.projects ?? []).filter((p: Project) => !isDeletedProject(p, hidden)));
      setUpdatedAt(new Date());
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Gagal memuat data");
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  const loadDetail = useCallback(async (name: string) => {
    const req = ++detailReq.current;
    setLoadingDetail(true);
    try {
      const json = await api(`${API}?project_name=${encodeURIComponent(name)}`);
      if (req !== detailReq.current) return; // respons basi (project sudah berganti)
      setEntries(json.entries ?? []);
      setSummary(json.summary ?? null);
      setError(null);
    } catch (e: any) {
      if (req === detailReq.current) setError(e?.message || "Gagal memuat detail project");
    } finally {
      if (req === detailReq.current) setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (isAll) {
      detailReq.current++;
      setEntries([]);
      setSummary(null);
      setLoadingDetail(false);
      return;
    }
    setEntries([]);
    setSummary(null);
    loadDetail(selected);
  }, [selected, isAll, loadDetail]);

  // Project terpilih hilang dari daftar -> kembali ke "Semua Project"
  useEffect(() => {
    if (!loadingProjects && !isAll && !projects.some((p) => p.project_name === selected)) setSelected(ALL);
  }, [projects, loadingProjects, isAll, selected]);

  const refresh = () => {
    loadProjects();
    if (!isAll) loadDetail(selected);
  };

  // ---------- DERIVED: TABEL SEMUA PROJECT ----------
  const rows: Row[] = useMemo(
    () =>
      projects.map((p) => {
        const s = p.summary;
        const quotation = num(s?.quotation_total);
        const plan = num(s?.allocation_total);
        const expense = num(s?.total_expense);
        const overrun = num(s?.overrun);
        const profit = num(s?.net_profit_projected);
        return {
          p,
          quotation,
          plan,
          expense,
          overrun,
          remaining: plan - expense,
          usage: plan > 0 ? (expense / plan) * 100 : 0,
          profit,
          margin: quotation > 0 ? (profit / quotation) * 100 : 0,
          income: num(s?.total_income),
          health: healthOf(plan, expense, overrun),
        };
      }),
    [projects]
  );

  const visibleRows = useMemo(() => {
    const k = search.trim().toLowerCase();
    const list = rows.filter(
      (r) =>
        (healthFilter === "all" || r.health === healthFilter) &&
        (!k || r.p.project_name.toLowerCase().includes(k) || (r.p.client_company ?? "").toLowerCase().includes(k))
    );
    return [...list].sort((a, b) => {
      if (sortKey === "name") return a.p.project_name.localeCompare(b.p.project_name);
      if (sortKey === "profit") return a.profit - b.profit;
      return HEALTH_ORDER[a.health] - HEALTH_ORDER[b.health] || b.usage - a.usage;
    });
  }, [rows, search, healthFilter, sortKey]);

  const healthCount = (h: "all" | Health) => (h === "all" ? rows.length : rows.filter((r) => r.health === h).length);

  // ---------- DERIVED: DETAIL 1 PROJECT ----------
  const selectedProject = useMemo(() => projects.find((p) => p.project_name === selected) ?? null, [projects, selected]);
  const s: Summary | null = summary ?? selectedProject?.summary ?? null;
  const q = num(s?.quotation_total);

  const detail = useMemo(() => {
    const allocations = entries.filter((e) => e.entry_type === "allocation");
    const expenses = entries.filter((e) => e.entry_type === "expense");
    const incomes = entries.filter((e) => e.entry_type === "income");

    const map = new Map<string, Budget>();
    allocations.forEach((a) =>
      map.set(norm(a.category), {
        id: a.id,
        category: a.category,
        group: (a.alloc_group ?? "OTHER") as AllocGroup,
        allocated: num(a.amount),
        actual: 0,
        remaining: 0,
      })
    );
    const un = new Map<string, number>();
    expenses.forEach((e) => {
      const b = map.get(norm(e.category));
      if (b) b.actual += num(e.amount);
      else un.set(e.category, (un.get(e.category) ?? 0) + num(e.amount));
    });
    const budgets = Array.from(map.values()).map((b) => ({ ...b, remaining: b.allocated - b.actual }));
    const unallocated = Array.from(un.entries()).map(([category, amount]) => ({ category, amount }));
    const unallocatedTotal = sumBy(unallocated, (u) => u.amount);

    const byGroup = GROUP_KEYS.map((g) => {
      const list = budgets.filter((b) => b.group === g);
      const allocated = sumBy(list, (b) => b.allocated);
      const actual = sumBy(list, (b) => b.actual);
      return { group: g, count: list.length, allocated, actual, remaining: allocated - actual };
    }).filter((g) => g.count > 0);

    return {
      budgets,
      unallocated,
      unallocatedTotal,
      byGroup,
      plan: sumBy(allocations, (a) => num(a.amount)),
      expense: sumBy(expenses, (e) => num(e.amount)),
      income: sumBy(incomes, (e) => num(e.amount)),
      overrun: sumBy(budgets, (b) => Math.max(0, -b.remaining)) + unallocatedTotal,
      recentExpenses: expenses.slice(0, 6),
    };
  }, [entries]);

  // ---------- VIEW UNTUK KARTU KPI ----------
  const view: View = useMemo(() => {
    if (isAll) {
      const planned = visibleRows.filter((r) => r.plan > 0);
      const quotation = sumBy(planned, (r) => r.quotation);
      const plan = sumBy(planned, (r) => r.plan);
      const overrun = sumBy(planned, (r) => r.overrun);
      return {
        quotation,
        plan,
        expense: sumBy(planned, (r) => r.expense),
        overrun,
        locked: quotation - plan,
        profit: quotation - plan - overrun,
        income: sumBy(planned, (r) => r.income),
      };
    }
    return {
      quotation: q,
      plan: detail.plan,
      expense: detail.expense,
      overrun: detail.overrun,
      locked: q - detail.plan,
      profit: q - detail.plan - detail.overrun,
      income: detail.income,
    };
  }, [isAll, visibleRows, q, detail]);

  const unplanned = useMemo(() => visibleRows.filter((r) => r.plan <= 0), [visibleRows]);
  const hasPlan = view.plan > 0;
  const remaining = view.plan - view.expense;
  const usage = view.plan > 0 ? (view.expense / view.plan) * 100 : 0;
  const margin = view.quotation > 0 ? (view.profit / view.quotation) * 100 : 0;
  const planPct = view.quotation > 0 ? (view.plan / view.quotation) * 100 : 0;
  const health = healthOf(view.plan, view.expense, view.overrun);
  const kpiLoading = isAll ? loadingProjects && projects.length === 0 : loadingDetail && entries.length === 0;
  const scopeLabel = isAll ? `${visibleRows.filter((r) => r.plan > 0).length} project beralokasi` : selected;

  // ================= RENDER =================
  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-800 md:p-6">
      {/* HEADER */}
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Cost Analysis Dashboard</h1>
          <p className="text-sm text-slate-500">
            Ringkasan plan alokasi, pengeluaran, sisa budget, dan estimasi profit
            {updatedAt && <span className="text-slate-400"> · diperbarui {updatedAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            aria-label="Pilih project"
            className="max-w-[16rem] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value={ALL}>Semua Project ({projects.length})</option>
            {projects.map((p) => (
              <option key={p.id ?? p.project_name} value={p.project_name}>
                {p.project_name}
              </option>
            ))}
          </select>
          <button
            onClick={refresh}
            disabled={loadingProjects || loadingDetail}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100 disabled:opacity-50"
          >
            ⟳ Refresh
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200">
          <span>{error}</span>
          <button onClick={refresh} className="rounded-md bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-700">
            Coba lagi
          </button>
        </div>
      )}

      {!loadingProjects && projects.length === 0 && !error ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-400">Belum ada project.</div>
      ) : (
        <div className="space-y-5">
          {/* SCOPE BAR */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {!isAll && (
              <button onClick={() => setSelected(ALL)} className="text-sm font-medium text-blue-600 hover:underline">
                ← Semua project
              </button>
            )}
            <h2 className="text-lg font-bold text-slate-900">{isAll ? "Semua Project" : selected}</h2>
            {!isAll && selectedProject && (
              <span className="text-sm text-slate-500">
                {selectedProject.client_company ?? "—"}
                {selectedProject.current_stage ? ` · ${selectedProject.current_stage.replace(/_/g, " ")}` : ""}
              </span>
            )}
            {!kpiLoading && <HealthBadge h={isAll ? healthOf(view.plan, view.expense, view.overrun) : health} />}
            {isAll && <span className="text-xs text-slate-400">({scopeLabel})</span>}
          </div>

          {/* KPI UTAMA */}
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi
              label="Plan Alokasi"
              tone="indigo"
              loading={kpiLoading}
              value={idr(view.plan)}
              hint={hasPlan ? `${pct(planPct)} dari quotation ${idr(view.quotation)}` : "Belum ada alokasi dibuat"}
            />
            <Kpi
              label="Expenses Terpakai"
              tone="rose"
              loading={kpiLoading}
              value={idr(view.expense)}
              hint={hasPlan ? `${pct(usage)} dari plan alokasi` : "Belum ada plan sebagai pembanding"}
            />
            <Kpi
              label={remaining >= 0 ? "Sisa Alokasi" : "Over Alokasi"}
              tone={!hasPlan ? "slate" : remaining >= 0 ? "emerald" : "red"}
              loading={kpiLoading}
              value={hasPlan ? idr(Math.abs(remaining)) : "—"}
              hint={hasPlan ? (remaining >= 0 ? `${pct(100 - usage)} plan belum terpakai` : "Pengeluaran melebihi plan") : "Atur alokasi terlebih dahulu"}
            />
            <Kpi
              label="Estimasi Profit"
              tone={!hasPlan ? "slate" : view.profit >= 0 ? "emerald" : "red"}
              loading={kpiLoading}
              value={hasPlan ? idr(view.profit) : "—"}
              hint={hasPlan ? `Margin ${pct(margin)} · terkunci ${idr(view.locked)}` : "Dihitung setelah alokasi dibuat"}
            />
          </section>

          {/* KONTEKS TAMBAHAN */}
          {!kpiLoading && (
            <section className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm md:grid-cols-4">
              <ContextStat label="Total Quotation" value={idr(view.quotation)} />
              <ContextStat label="Pemasukan Diterima" value={idr(view.income)} tone="text-emerald-600" />
              <ContextStat label="Cash Balance" value={idr(view.income - view.expense)} tone={view.income - view.expense >= 0 ? "text-emerald-600" : "text-rose-600"} />
              <ContextStat label="Overrun & Luar Alokasi" value={idr(view.overrun)} tone={view.overrun > 0 ? "text-rose-600" : "text-slate-800"} />
            </section>
          )}

          {isAll && unplanned.length > 0 && !loadingProjects && (
            <div className="rounded-lg bg-amber-50 px-4 py-2.5 text-xs text-amber-800 ring-1 ring-amber-200">
              <b>{unplanned.length} project belum punya alokasi</b> sehingga tidak dihitung pada angka di atas
              {sumBy(unplanned, (r) => r.expense) > 0 && <> (pengeluaran tercatat {idr(sumBy(unplanned, (r) => r.expense))})</>}.
            </div>
          )}

          {/* PLAN VS EXPENSES + PROFIT BRIDGE */}
          {hasPlan && !kpiLoading && (
            <section className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-slate-800">Plan vs Expenses</h3>
                  <span className={`text-sm font-bold tabular-nums ${HEALTH[health].text}`}>{pct(usage)} terpakai</span>
                </div>
                <Meter used={view.expense} plan={view.plan} className="h-4" />
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-slate-400">Plan</div>
                    <div className="font-bold tabular-nums text-slate-800">{idr(view.plan)}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Terpakai</div>
                    <div className="font-bold tabular-nums text-rose-600">{idr(view.expense)}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">{remaining >= 0 ? "Sisa" : "Over"}</div>
                    <div className={`font-bold tabular-nums ${remaining >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{idr(Math.abs(remaining))}</div>
                  </div>
                </div>

                {!isAll && detail.byGroup.length > 0 && (
                  <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Per Kelompok</div>
                    {detail.byGroup.map((g) => (
                      <div key={g.group}>
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                            <span className={`h-2 w-2 rounded-full ${GROUPS[g.group].dot}`} />
                            {GROUPS[g.group].label}
                          </span>
                          <span className={`font-bold tabular-nums ${g.remaining >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                            {g.remaining >= 0 ? "Sisa " : "Over "}
                            {idr(Math.abs(g.remaining))}
                          </span>
                        </div>
                        <Meter used={g.actual} plan={g.allocated} className="mt-1 h-1.5" />
                        <div className="mt-0.5 flex justify-between text-[11px] text-slate-500">
                          <span>Aktual {idr(g.actual)}</span>
                          <span>Plan {idr(g.allocated)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-slate-800">Estimasi Profit</h3>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                      view.profit >= 0 ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-rose-50 text-rose-700 ring-rose-200"
                    }`}
                  >
                    {view.profit >= 0 ? "PROFIT" : "LOSS"} · {pct(margin)}
                  </span>
                </div>
                <ProfitBridge v={view} />
                <p className="mt-4 text-[11px] leading-relaxed text-slate-400">
                  Estimasi profit = Quotation − Plan alokasi − Overrun. Sisa alokasi yang belum terpakai tetap dianggap biaya terencana, bukan profit tambahan.
                </p>
              </div>
            </section>
          )}

          {/* ============ MODE SEMUA PROJECT: TABEL ============ */}
          {isAll && (
            <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
                <h3 className="font-semibold text-slate-800">Rincian per Project</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari project / client..."
                    className="w-48 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                  <select
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as SortKey)}
                    aria-label="Urutkan"
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-blue-500"
                  >
                    <option value="usage">Urut: Perlu perhatian</option>
                    <option value="profit">Urut: Profit terendah</option>
                    <option value="name">Urut: Nama</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 border-b border-slate-100 px-5 py-2">
                {(["all", "over", "warn", "ok", "none"] as const).map((h) => (
                  <button
                    key={h}
                    onClick={() => setHealthFilter(h)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      healthFilter === h ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {h === "all" ? "Semua" : HEALTH[h].label} ({healthCount(h)})
                  </button>
                ))}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-sm">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-2 text-left">Project</th>
                      <th className="px-4 py-2 text-right">Plan Alokasi</th>
                      <th className="px-4 py-2 text-right">Expenses</th>
                      <th className="w-40 px-4 py-2 text-left">Pemakaian</th>
                      <th className="px-4 py-2 text-right">Sisa</th>
                      <th className="px-4 py-2 text-right">Estimasi Profit</th>
                      <th className="px-4 py-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loadingProjects && projects.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-6">
                          <Skeleton className="h-6 w-full" />
                        </td>
                      </tr>
                    )}
                    {!loadingProjects && visibleRows.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-400">
                          Tidak ada project yang cocok.
                        </td>
                      </tr>
                    )}
                    {visibleRows.map((r) => {
                      const planned = r.plan > 0;
                      return (
                        <tr
                          key={r.p.id ?? r.p.project_name}
                          onClick={() => setSelected(r.p.project_name)}
                          className="cursor-pointer hover:bg-slate-50"
                        >
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-800">{r.p.project_name}</div>
                            <div className="text-xs text-slate-500">{r.p.client_company ?? "—"}</div>
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">{planned ? idr(r.plan) : "—"}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-rose-600">{idr(r.expense)}</td>
                          <td className="px-4 py-3">
                            {planned ? (
                              <>
                                <Meter used={r.expense} plan={r.plan} />
                                <div className="mt-0.5 text-[11px] tabular-nums text-slate-500">{pct(r.usage, 0)}</div>
                              </>
                            ) : (
                              <span className="text-xs text-slate-300">—</span>
                            )}
                          </td>
                          <td className={`px-4 py-3 text-right font-semibold tabular-nums ${!planned ? "text-slate-300" : r.remaining >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                            {planned ? `${r.remaining >= 0 ? "" : "−"}${idr(Math.abs(r.remaining))}` : "—"}
                          </td>
                          <td className={`px-4 py-3 text-right font-bold tabular-nums ${!planned ? "text-slate-300" : r.profit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                            {planned ? (
                              <>
                                {idr(r.profit)}
                                <div className="text-[11px] font-medium text-slate-400">{pct(r.margin)}</div>
                              </>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <HealthBadge h={r.health} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ============ MODE 1 PROJECT: DETAIL ============ */}
          {!isAll && (
            <>
              {!loadingDetail && !hasPlan && (
                <div className="rounded-lg bg-indigo-50 px-4 py-3 text-sm text-indigo-800 ring-1 ring-indigo-100">
                  Project ini belum punya plan alokasi, jadi sisa dan estimasi profit belum bisa dihitung. Buat alokasi di halaman Cost Analysis.
                </div>
              )}

              <section className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
                {/* Sisa per kategori */}
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-200 px-5 py-3">
                    <h3 className="font-semibold text-slate-800">Sisa Alokasi per Kategori</h3>
                  </div>
                  <div className="space-y-4 p-5">
                    {loadingDetail && entries.length === 0 && <Skeleton className="h-24 w-full" />}
                    {!loadingDetail && detail.budgets.length === 0 && <p className="text-sm text-slate-400">Belum ada alokasi.</p>}
                    {[...detail.budgets]
                      .sort((a, b) => a.remaining / (a.allocated || 1) - b.remaining / (b.allocated || 1))
                      .map((b) => {
                        const used = b.allocated > 0 ? (b.actual / b.allocated) * 100 : 0;
                        const plus = b.remaining >= 0;
                        return (
                          <div key={b.id}>
                            <div className="flex items-center justify-between gap-2 text-sm">
                              <span className="flex min-w-0 items-center gap-1.5 font-semibold text-slate-700">
                                <span className={`h-2 w-2 shrink-0 rounded-full ${GROUPS[b.group].dot}`} />
                                <span className="truncate">{b.category}</span>
                              </span>
                              <span className={`shrink-0 font-bold tabular-nums ${plus ? "text-emerald-600" : "text-rose-600"}`}>
                                {plus ? "Sisa " : "Over "}
                                {idr(Math.abs(b.remaining))}
                              </span>
                            </div>
                            <Meter used={b.actual} plan={b.allocated} className="mt-1.5 h-2" />
                            <div className="mt-0.5 flex justify-between text-[11px] tabular-nums text-slate-500">
                              <span>
                                Aktual {idr(b.actual)} ({used.toFixed(0)}%)
                              </span>
                              <span>Plan {idr(b.allocated)}</span>
                            </div>
                          </div>
                        );
                      })}
                    {detail.unallocated.map((u) => (
                      <div key={u.category} className="flex items-center justify-between gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs ring-1 ring-amber-200">
                        <span className="font-medium text-amber-800">{u.category === UNALLOCATED ? "Di luar alokasi" : u.category} (di luar alokasi)</span>
                        <span className="font-bold tabular-nums text-rose-600">− {idr(u.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-5">
                  {/* Penagihan */}
                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="font-semibold text-slate-800">Penagihan</h3>
                      <span className={`text-xs font-bold ${q - view.income > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                        {q <= 0 ? "—" : q - view.income > 0 ? "Belum lunas" : "Lunas"}
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${clamp(q > 0 ? (view.income / q) * 100 : 0)}%` }} />
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                      <ContextStat label="Quotation" value={idr(q)} />
                      <ContextStat label="Diterima" value={idr(view.income)} tone="text-emerald-600" />
                      <ContextStat label="Belum ditagih" value={idr(Math.max(q - view.income, 0))} tone={q - view.income > 0 ? "text-amber-600" : "text-emerald-600"} />
                    </div>
                  </div>

                  {/* Pengeluaran terbaru */}
                  <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-200 px-5 py-3">
                      <h3 className="font-semibold text-slate-800">Pengeluaran Terbaru</h3>
                    </div>
                    {detail.recentExpenses.length === 0 ? (
                      <p className="p-5 text-sm text-slate-400">{loadingDetail ? "Memuat..." : "Belum ada pengeluaran."}</p>
                    ) : (
                      <ul className="divide-y divide-slate-100">
                        {detail.recentExpenses.map((e) => (
                          <li key={e.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-slate-800">{e.category === UNALLOCATED ? "Di luar alokasi" : e.category}</div>
                              <div className="truncate text-xs text-slate-500">
                                {fmtDate(e.entry_date)}
                                {e.description ? ` · ${e.description}` : ""}
                              </div>
                            </div>
                            <div className="shrink-0 text-sm font-bold tabular-nums text-rose-600">− {idr(num(e.amount))}</div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      )}
    </div>
  );
}
