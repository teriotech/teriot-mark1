"use client";

import {
  FormEvent,
  MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  AlertTriangle,
  Archive,
  ArchiveRestore,
  ArrowRight,
  BarChart3,
  Bold,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Edit2,
  Eye,
  EyeOff,
  FileText,
  FolderKanban,
  Hash,
  Layers3,
  Italic,
  List,
  ListOrdered,
  Loader2,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  ShoppingCart,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Underline,
  WalletCards,
  X,
  type LucideIcon,
} from "lucide-react";

// Reuse generator/modal yang sudah ada pada page:
// /demo/management/material/3_create_qo_TMI
import ModalQoPo from "@/app/demo/management/material/3_create_qo_TMI/modal_qo_po";
import ModalBast from "@/app/demo/management/material/3_create_qo_TMI/modal_bast";
import ModalInvoice from "@/app/demo/management/material/3_create_qo_TMI/modal_invoice";
import type {
  BomGroup,
  BomItem,
  PrintType,
} from "@/app/demo/management/material/3_create_qo_TMI/types";

/* ========================================================================== */
/* API                                                                        */
/* ========================================================================== */

const PROJECT_API = "/api/management/project";
const BOM_API = "/api/management/create_bom";
const COST_API = "/api/management/cost_analysist";

async function requestJson(url: string, method = "GET", body?: unknown) {
  const response = await fetch(url, {
    method,
    cache: "no-store",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  let result: any = {};
  try {
    result = text ? JSON.parse(text) : {};
  } catch {
    result = { message: text || `HTTP ${response.status}` };
  }

  if (!response.ok) {
    throw new Error(result?.message || result?.error || `HTTP ${response.status}`);
  }
  return result;
}

/* ========================================================================== */
/* Shared types                                                               */
/* ========================================================================== */

type ProjectStage =
  | "opportunity_crm"
  | "presales"
  | "inspection"
  | "bom_design"
  | "quotation_po"
  | "project_planning"
  | "project_running"
  | "commissioning"
  | "invoicing"
  | "payment";

type ProjectStatus =
  | "In Progress"
  | "Completed"
  | "On Hold"
  | "Delayed"
  | "Drop";

type StageStatus = "Pending" | "In Progress" | "Completed" | "Issue";
type FinalCategory = "none" | "completed_green" | "closed_red";

type StageHistoryEntry = {
  entered_at?: string | null;
  completed_at?: string | null;
  plan_start_date?: string | null;
  plan_end_date?: string | null;
};

type StageNote = {
  notes?: string;
  stage_status?: StageStatus;
  rich_text?: string;
  contact_person?: string;
  presentation_url?: string;
  images?: string[];
  documents?: string[];
  links?: string[];
  [key: string]: unknown;
};

type ProjectRecord = {
  id: string;
  project_name: string;
  client_company: string;
  current_stage: ProjectStage;
  status: ProjectStatus;
  stage_notes: Partial<Record<ProjectStage, StageNote>>;
  stage_history: Partial<Record<ProjectStage, StageHistoryEntry>>;
  final_category: FinalCategory;
  start_date: string | null;
  target_completion_date: string | null;
  created_at: string;
  updated_at: string;
  synthetic?: boolean;
};

type StageUpdateData = {
  notes: string;
  rich_text: string;
  stage_status: StageStatus;
  plan_start_date?: string;
  plan_end_date?: string;
};

type StageMeta = {
  id: ProjectStage;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  color: string;
  soft: string;
  border: string;
};

const PROJECT_STAGES: StageMeta[] = [
  {
    id: "opportunity_crm",
    label: "Opportunity / CRM",
    shortLabel: "CRM",
    description: "Initial opportunity identified in CRM",
    icon: AlertCircle,
    color: "bg-sky-500",
    soft: "bg-sky-50 text-sky-700",
    border: "border-sky-300",
  },
  {
    id: "presales",
    label: "Pre-Sales",
    shortLabel: "PRE",
    description: "Pre-sales activities and presentations",
    icon: Target,
    color: "bg-blue-500",
    soft: "bg-blue-50 text-blue-700",
    border: "border-blue-300",
  },
  {
    id: "inspection",
    label: "Inspection",
    shortLabel: "INS",
    description: "Company visit and site assessment",
    icon: Search,
    color: "bg-cyan-500",
    soft: "bg-cyan-50 text-cyan-700",
    border: "border-cyan-300",
  },
  {
    id: "bom_design",
    label: "BOM & Design",
    shortLabel: "BOM",
    description: "Bill of Materials and design phase",
    icon: Package,
    color: "bg-indigo-500",
    soft: "bg-indigo-50 text-indigo-700",
    border: "border-indigo-300",
  },
  {
    id: "quotation_po",
    label: "Quotation & PO",
    shortLabel: "QO/PO",
    description: "Quotation and Purchase Order phase",
    icon: FileText,
    color: "bg-violet-500",
    soft: "bg-violet-50 text-violet-700",
    border: "border-violet-300",
  },
  {
    id: "project_planning",
    label: "Project Planning",
    shortLabel: "PLAN",
    description: "Timeline, materials, and manpower planning",
    icon: CalendarDays,
    color: "bg-fuchsia-500",
    soft: "bg-fuchsia-50 text-fuchsia-700",
    border: "border-fuchsia-300",
  },
  {
    id: "project_running",
    label: "Project Running",
    shortLabel: "RUN",
    description: "Hardware and software installation",
    icon: ArrowRight,
    color: "bg-amber-500",
    soft: "bg-amber-50 text-amber-700",
    border: "border-amber-300",
  },
  {
    id: "commissioning",
    label: "Commissioning",
    shortLabel: "COMM",
    description: "FAT and SAT testing",
    icon: ClipboardCheck,
    color: "bg-orange-500",
    soft: "bg-orange-50 text-orange-700",
    border: "border-orange-300",
  },
  {
    id: "invoicing",
    label: "Invoicing",
    shortLabel: "INV",
    description: "Invoice, BAST, and tax invoice",
    icon: Receipt,
    color: "bg-rose-500",
    soft: "bg-rose-50 text-rose-700",
    border: "border-rose-300",
  },
  {
    id: "payment",
    label: "Payment",
    shortLabel: "PAY",
    description: "Payment processing and project completion",
    icon: CheckCircle2,
    color: "bg-emerald-500",
    soft: "bg-emerald-50 text-emerald-700",
    border: "border-emerald-300",
  },
];

/* ========================================================================== */
/* BOM/document types                                                         */
/* ========================================================================== */

type BomRow = BomItem & {
  bom_code?: string | null;
  qo_number?: string | null;
  project_name?: string | null;
  created_at?: string;
};

type DocumentGroup = BomGroup & {
  group_key: string;
  bom_code: string | null;
  project_name: string | null;
  qo_number?: string;
  date_created: string;
  items: BomRow[];
};

/* ========================================================================== */
/* Cost types                                                                 */
/* ========================================================================== */

type EntryType = "income" | "expense" | "allocation";
type TransactionType = Exclude<EntryType, "allocation">;
type AllocationGroup = "RAW_MATERIAL" | "TRANSPORT" | "DIVIDEN" | "OTHER";

type CostEntry = {
  id: number;
  project_id: string | null;
  project_name: string;
  entry_type: EntryType;
  category: string;
  description: string | null;
  amount: number;
  entry_date: string;
  reference_no: string | null;
  alloc_group: AllocationGroup | null;
  percent: number | null;
  is_auto: boolean | null;
  created_at: string;
};

type CostSummary = {
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

type TransactionForm = {
  entry_type: TransactionType;
  category: string;
  amount: string;
  entry_date: string;
  reference_no: string;
  description: string;
};

type AllocationRow = {
  key: string;
  id: number | null;
  originalName: string | null;
  group: AllocationGroup;
  name: string;
  auto: boolean;
  percent: string;
  amount: string;
};

/* ========================================================================== */
/* Helpers                                                                    */
/* ========================================================================== */

const DAY_MS = 86_400_000;

const numberOf = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const idr = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const percentText = (value: number) =>
  `${(Number.isFinite(value) ? value : 0).toFixed(1)}%`;

const normalize = (value: unknown) => String(value ?? "").trim().toLowerCase();

// Drop memakai final_category yang sudah ada agar tidak mengirim nilai "Drop"
// ke enum PostgreSQL project_status yang belum tentu memilikinya.
// Record lama yang sudah menyimpan status "Drop" tetap didukung.
const isDroppedProject = (project: Pick<ProjectRecord, "status" | "final_category">) =>
  project.status === "Drop" || project.final_category === "closed_red";

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const plainTextToRichText = (value: string) =>
  escapeHtml(value).replace(/\r?\n/g, "<br>");

/**
 * Rich text stage hanya mengizinkan tag format dasar tanpa attribute.
 * Ini menjaga render dangerouslySetInnerHTML tetap terbatas pada format yang
 * dibuat toolbar (bold, italic, underline, bullet, dan numbered list).
 */
const sanitizeRichText = (value: string) => {
  if (!value) return "";
  const withoutUnsafeBlocks = value.replace(
    /<\s*(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,
    "",
  );

  return withoutUnsafeBlocks.replace(/<[^>]*>/g, (tag) => {
    if (/^<\s*div\s*>$/i.test(tag)) return "";
    if (/^<\s*\/\s*div\s*>$/i.test(tag)) return "<br>";
    const match = tag.match(
      /^<\s*(\/?)\s*(p|br|strong|b|em|i|u|ul|ol|li)\s*\/?\s*>$/i,
    );
    if (!match) return "";
    const closing = match[1] ? "/" : "";
    const name = match[2].toLowerCase();
    return name === "br" ? "<br>" : `<${closing}${name}>`;
  });
};

const todayInput = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

const dateValue = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

const formatDate = (value?: string | null, withTime = false) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
};

const stageIndex = (stage: ProjectStage) =>
  PROJECT_STAGES.findIndex((item) => item.id === stage);

const stageMeta = (stage: ProjectStage) =>
  PROJECT_STAGES.find((item) => item.id === stage) ?? PROJECT_STAGES[0];

const emptyProject = (name: string, customer: string): ProjectRecord => ({
  id: `bom-${encodeURIComponent(name)}`,
  project_name: name,
  client_company: customer,
  current_stage: "bom_design",
  status: "In Progress",
  stage_notes: {
    bom_design: {
      stage_status: "In Progress",
      notes: "Project tersedia dari BOM. Record project management belum ditemukan.",
    },
  },
  stage_history: {},
  final_category: "none",
  start_date: null,
  target_completion_date: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  synthetic: true,
});

const normalizeProject = (raw: any): ProjectRecord => ({
  id: String(raw?.id ?? raw?.project_id ?? raw?.project_name ?? crypto.randomUUID()),
  project_name: String(raw?.project_name ?? raw?.projectName ?? raw?.name ?? "Untitled Project").trim(),
  client_company: String(raw?.client_company ?? raw?.clientCompany ?? raw?.customer ?? "—").trim(),
  current_stage: (raw?.current_stage || "opportunity_crm") as ProjectStage,
  status: (raw?.status || "In Progress") as ProjectStatus,
  stage_notes: raw?.stage_notes && typeof raw.stage_notes === "object" ? raw.stage_notes : {},
  stage_history: raw?.stage_history && typeof raw.stage_history === "object" ? raw.stage_history : {},
  final_category: (raw?.final_category || "none") as FinalCategory,
  start_date: raw?.start_date ?? null,
  target_completion_date: raw?.target_completion_date ?? null,
  created_at: raw?.created_at ?? new Date().toISOString(),
  updated_at: raw?.updated_at ?? new Date().toISOString(),
});

const extractArray = (raw: any): any[] => {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.data?.data)) return raw.data.data;
  if (Array.isArray(raw?.rows)) return raw.rows;
  if (Array.isArray(raw?.projects)) return raw.projects;
  return [];
};

const getBomGroupKey = (item: BomRow) => {
  const bomCode = String(item.bom_code ?? "").trim();
  if (bomCode) return `BOM::${bomCode}`;
  const qoNumber = String(item.qo_number ?? "").trim();
  if (qoNumber) return `QO::${qoNumber}`;
  return `RAW::${item.customer ?? "-"}::${item.project_name ?? "-"}::${item.created_at ?? "no-date"}`;
};

const bomLineTotal = (item: BomRow) => {
  const qty = numberOf(item.qty) || 1;
  const price = numberOf(item.price);
  const margin = numberOf(item.margin);
  return qty * (price + (price * margin) / 100);
};

const groupBomRows = (rows: BomRow[]): DocumentGroup[] => {
  const map = new Map<string, BomRow[]>();
  rows.forEach((row) => {
    const key = getBomGroupKey(row);
    map.set(key, [...(map.get(key) ?? []), row]);
  });

  return Array.from(map.entries())
    .map(([key, items]) => {
      const first = items[0];
      const motherParts = new Set(items.map((item) => item.mother_part).filter(Boolean));
      const dates = items
        .map((item) => item.created_at)
        .filter(Boolean)
        .sort((a, b) => new Date(a as string).getTime() - new Date(b as string).getTime());

      return {
        group_key: key,
        bom_code: items.find((item) => item.bom_code)?.bom_code ?? null,
        qo_number: items.find((item) => item.qo_number)?.qo_number ?? undefined,
        project_name: items.find((item) => item.project_name)?.project_name ?? null,
        customer: String(first?.customer ?? "Unassigned Customer"),
        date_created: dates[0] ?? new Date().toISOString(),
        total_mother_parts: motherParts.size,
        total_items: items.length,
        total_cost: items.reduce((sum, item) => sum + bomLineTotal(item), 0),
        items,
      } as DocumentGroup;
    })
    .sort(
      (a, b) =>
        new Date(b.date_created).getTime() - new Date(a.date_created).getTime(),
    );
};

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100";

const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

/* ========================================================================== */
/* Small UI components                                                        */
/* ========================================================================== */

function StatusBadge({ status, inverse = false }: { status: StageStatus; inverse?: boolean }) {
  const styles: Record<StageStatus, string> = {
    Pending: "border-slate-200 bg-slate-100 text-slate-600",
    "In Progress": "border-blue-200 bg-blue-50 text-blue-700",
    Completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
    Issue: "border-rose-200 bg-rose-50 text-rose-700",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
        inverse ? "border-white/30 bg-white/15 text-white" : styles[status]
      }`}
    >
      {status === "Completed" ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : status === "Issue" ? (
        <AlertTriangle className="h-3 w-3" />
      ) : (
        <Clock3 className="h-3 w-3" />
      )}
      {status}
    </span>
  );
}

function MoneyStat({
  label,
  value,
  hint,
  tone = "slate",
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "slate" | "blue" | "green" | "red";
  icon: LucideIcon;
}) {
  const toneClass = {
    slate: "bg-slate-50 text-slate-700",
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-rose-50 text-rose-700",
  }[tone];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <span className={`rounded-lg p-1.5 ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-1 text-base font-extrabold text-slate-900">{value}</p>
      {hint && <p className="mt-0.5 text-[10px] text-slate-400">{hint}</p>}
    </div>
  );
}

function EmptyState({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-8 text-center">
      <Icon className="mb-2 h-9 w-9 text-slate-300" />
      <p className="font-bold text-slate-600">{title}</p>
      <p className="mt-1 max-w-xl text-xs text-slate-400">{text}</p>
    </div>
  );
}

/* ========================================================================== */
/* Sidebar                                                                    */
/* ========================================================================== */

function ProjectSidebar({
  projects,
  selectedId,
  onSelect,
  loading,
  collapsed,
  onToggle,
  showCompleted,
  onToggleCompleted,
  showDropped,
  onToggleDropped,
}: {
  projects: ProjectRecord[];
  selectedId: string;
  onSelect: (id: string) => void;
  loading: boolean;
  collapsed: boolean;
  onToggle: () => void;
  showCompleted: boolean;
  onToggleCompleted: () => void;
  showDropped: boolean;
  onToggleDropped: () => void;
}) {
  const [search, setSearch] = useState("");
  const completedCount = projects.filter((project) => project.status === "Completed").length;
  const droppedCount = projects.filter(isDroppedProject).length;
  const filtered = useMemo(() => {
    const keyword = normalize(search);
    return projects.filter((project) => {
      if (!showCompleted && project.status === "Completed") return false;
      if (!showDropped && isDroppedProject(project)) return false;
      return `${project.project_name} ${project.client_company}`.toLowerCase().includes(keyword);
    });
  }, [projects, search, showCompleted, showDropped]);

  if (collapsed) {
    return (
      <aside className="sticky top-0 hidden h-screen w-16 shrink-0 border-r border-slate-200 bg-white p-3 lg:block">
        <button
          onClick={onToggle}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
          title="Tampilkan project sidebar"
        >
          <PanelLeftOpen className="h-5 w-5" />
        </button>
        <div className="mt-4 flex flex-col gap-2">
          {filtered.slice(0, 8).map((project) => (
            <button
              key={project.id}
              onClick={() => onSelect(project.id)}
              title={`${project.project_name}${isDroppedProject(project) ? " (Dropped)" : ""}`}
              className={`flex h-10 w-10 items-center justify-center rounded-xl text-xs font-black ${
                selectedId === project.id
                  ? isDroppedProject(project)
                    ? "bg-slate-600 text-white"
                    : "bg-blue-600 text-white"
                  : isDroppedProject(project)
                    ? "bg-slate-200 text-slate-500 hover:bg-slate-300"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {project.project_name.slice(0, 2).toUpperCase()}
            </button>
          ))}
        </div>
      </aside>
    );
  }

  return (
    <aside className="sticky top-0 hidden h-screen w-[310px] shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
      <div className="border-b border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">
              Project workspace
            </p>
            <h2 className="mt-0.5 text-lg font-extrabold text-slate-900">
              Project ({filtered.length}/{projects.length})
            </h2>
          </div>
          <button
            onClick={onToggle}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            title="Sembunyikan project sidebar"
          >
            <PanelLeftClose className="h-5 w-5" />
          </button>
        </div>
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari project / client..."
            className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            onClick={onToggleCompleted}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-[10px] font-bold transition ${
              showCompleted
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
            }`}
            title={showCompleted ? "Sembunyikan project completed" : "Tampilkan project completed"}
          >
            {showCompleted ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            Completed ({completedCount})
          </button>
          <button
            onClick={onToggleDropped}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-[10px] font-bold transition ${
              showDropped
                ? "border-slate-300 bg-slate-100 text-slate-700"
                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
            }`}
            title={showDropped ? "Sembunyikan project dropped" : "Tampilkan project dropped agar bisa di-undrop"}
          >
            {showDropped ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            Dropped ({droppedCount})
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5">
        {loading && (
          <div className="flex items-center justify-center gap-2 p-8 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Memuat project...
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <p className="p-6 text-center text-sm text-slate-400">
            Project tidak ditemukan. Gunakan tombol Completed/Dropped untuk membuka project tersembunyi.
          </p>
        )}
        {filtered.map((project) => {
          const active = selectedId === project.id;
          const dropped = isDroppedProject(project);
          const meta = stageMeta(project.current_stage);
          const status = project.stage_notes?.[project.current_stage]?.stage_status || "Pending";
          return (
            <button
              key={project.id}
              onClick={() => onSelect(project.id)}
              className={`mb-2 w-full rounded-xl border p-3 text-left transition ${
                dropped
                  ? active
                    ? "border-slate-400 bg-slate-200 shadow-sm"
                    : "border-slate-200 bg-slate-100 opacity-80 hover:border-slate-300 hover:bg-slate-200"
                  : active
                    ? "border-blue-300 bg-blue-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className={`line-clamp-2 text-sm font-extrabold ${dropped ? "text-slate-500 line-through" : "text-slate-900"}`}>
                  {project.project_name}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  {dropped && (
                    <span className="rounded bg-slate-600 px-1.5 py-0.5 text-[9px] font-bold text-white">DROP</span>
                  )}
                  {project.synthetic && (
                    <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 ring-1 ring-amber-200">
                      BOM
                    </span>
                  )}
                </div>
              </div>
              <p className={`mt-1 line-clamp-1 text-xs ${dropped ? "text-slate-400" : "text-slate-500"}`}>
                {project.client_company}
              </p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${dropped ? "bg-slate-200 text-slate-500" : meta.soft}`}>
                  {meta.shortLabel}
                </span>
                <StatusBadge status={status} />
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

/* ========================================================================== */
/* Document card                                                              */
/* ========================================================================== */

function DocumentWorkspace({ groups, projectName }: { groups: DocumentGroup[]; projectName: string }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [printConfig, setPrintConfig] = useState<{ group: BomGroup; type: PrintType } | null>(null);
  const [bastConfig, setBastConfig] = useState<{ group: BomGroup } | null>(null);
  const [invoiceConfig, setInvoiceConfig] = useState<{ group: BomGroup } | null>(null);

  useEffect(() => {
    setExpanded({});
  }, [projectName]);

  const total = groups.reduce((sum, group) => sum + numberOf(group.total_cost), 0);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-blue-50 p-2.5 text-blue-600 ring-1 ring-blue-100">
            <FileText className="h-5 w-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-slate-900">Project Documents</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                {groups.length} BOM
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Dokumen otomatis difilter berdasarkan BOM project terpilih.
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Quotation total</p>
          <p className="font-extrabold text-emerald-600">{idr(total)}</p>
        </div>
      </div>

      <div className="p-4">
        {groups.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Dokumen BOM belum ditemukan"
            text={`Belum ada BOM yang terhubung ke project “${projectName}”. Buat BOM terlebih dahulu agar QO, PO, BAST, dan Invoice muncul otomatis.`}
          />
        ) : (
          <div className="space-y-3">
            {groups.map((group) => {
              const open = !!expanded[group.group_key];
              const motherParts = new Map<string, BomRow[]>();
              group.items.forEach((item) => {
                const key = String(item.mother_part || "General Part");
                motherParts.set(key, [...(motherParts.get(key) ?? []), item]);
              });

              return (
                <div key={group.group_key} className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="flex flex-col gap-3 p-4 xl:flex-row xl:items-center xl:justify-between">
                    <button
                      onClick={() =>
                        setExpanded((previous) => ({
                          ...previous,
                          [group.group_key]: !previous[group.group_key],
                        }))
                      }
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <span className="rounded-lg bg-slate-100 p-2 text-slate-600">
                        <Package className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-slate-900">{group.customer}</span>
                          {group.bom_code && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                              <Hash className="h-3 w-3" /> {group.bom_code}
                            </span>
                          )}
                          {group.qo_number && (
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                              {group.qo_number}
                            </span>
                          )}
                        </span>
                        <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                          <span>{formatDate(group.date_created, true)}</span>
                          <span>{group.total_mother_parts} mother parts</span>
                          <span>{group.total_items} items</span>
                          <span className="font-bold text-emerald-600">{idr(numberOf(group.total_cost))}</span>
                        </span>
                      </span>
                    </button>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setPrintConfig({ group, type: "QO" })}
                        className={buttonClass}
                        title="Generate Quotation"
                      >
                        <FileText className="h-4 w-4 text-blue-600" /> QO
                      </button>
                      <button
                        onClick={() => setPrintConfig({ group, type: "PO" })}
                        className={buttonClass}
                        title="Generate Purchase Order"
                      >
                        <ShoppingCart className="h-4 w-4 text-emerald-600" /> PO
                      </button>
                      <button
                        onClick={() => setBastConfig({ group })}
                        className={buttonClass}
                        title="Generate BAST"
                      >
                        <ClipboardCheck className="h-4 w-4 text-violet-600" /> BAST
                      </button>
                      <button
                        onClick={() => setInvoiceConfig({ group })}
                        className={buttonClass}
                        title="Generate Invoice"
                      >
                        <Receipt className="h-4 w-4 text-amber-600" /> Invoice
                      </button>
                      <button
                        onClick={() =>
                          setExpanded((previous) => ({
                            ...previous,
                            [group.group_key]: !previous[group.group_key],
                          }))
                        }
                        className="rounded-lg bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"
                      >
                        {open ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  {open && (
                    <div className="space-y-3 border-t border-slate-200 bg-slate-50 p-4">
                      {Array.from(motherParts.entries()).map(([name, items]) => (
                        <div key={name} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                          <div className="flex items-center justify-between bg-slate-100 px-4 py-2.5">
                            <p className="flex items-center gap-2 text-xs font-bold text-slate-700">
                              <Layers3 className="h-4 w-4 text-blue-600" /> {name}
                            </p>
                            <p className="text-xs font-bold text-emerald-600">
                              {idr(items.reduce((sum, item) => sum + bomLineTotal(item), 0))}
                            </p>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="min-w-full text-left text-xs">
                              <thead className="border-y border-slate-200 bg-white text-[10px] uppercase tracking-wider text-slate-400">
                                <tr>
                                  <th className="px-4 py-2">Part number</th>
                                  <th className="px-4 py-2">Description</th>
                                  <th className="px-4 py-2">Qty</th>
                                  <th className="px-4 py-2 text-right">Price</th>
                                  <th className="px-4 py-2 text-right">Margin</th>
                                  <th className="px-4 py-2 text-right">Total</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {items.map((item) => (
                                  <tr key={item.id} className="hover:bg-slate-50">
                                    <td className="whitespace-nowrap px-4 py-2.5 font-semibold text-slate-800">
                                      {item.part_number}
                                    </td>
                                    <td className="max-w-xs px-4 py-2.5 text-slate-500">
                                      {item.description || item.technical_specification || "—"}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                                      {item.qty} {item.unit}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-2.5 text-right text-slate-600">
                                      {idr(numberOf(item.price))}
                                    </td>
                                    <td className="px-4 py-2.5 text-right text-slate-600">
                                      {numberOf(item.margin)}%
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-2.5 text-right font-bold text-emerald-600">
                                      {idr(bomLineTotal(item))}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ModalQoPo config={printConfig} onClose={() => setPrintConfig(null)} />
      <ModalBast config={bastConfig} onClose={() => setBastConfig(null)} />
      <ModalInvoice config={invoiceConfig} onClose={() => setInvoiceConfig(null)} />
    </section>
  );
}

/* ========================================================================== */
/* Cost analysis card                                                         */
/* ========================================================================== */

const allocationMeta: Record<
  AllocationGroup,
  { label: string; color: string; soft: string }
> = {
  RAW_MATERIAL: { label: "Raw Material", color: "bg-sky-500", soft: "bg-sky-50 text-sky-700" },
  TRANSPORT: { label: "Transport", color: "bg-amber-500", soft: "bg-amber-50 text-amber-700" },
  DIVIDEN: { label: "Dividen", color: "bg-violet-500", soft: "bg-violet-50 text-violet-700" },
  OTHER: { label: "Lainnya", color: "bg-slate-500", soft: "bg-slate-100 text-slate-700" },
};

const incomeOptions = [
  { value: "DOWN_PAYMENT", label: "Down Payment (DP)" },
  { value: "TERMIN_PAYMENT", label: "Pembayaran Termin" },
  { value: "FINAL_PAYMENT", label: "Pelunasan" },
  { value: "OTHER_INCOME", label: "Pemasukan Lain" },
];

let allocationSequence = 0;
const allocationKey = () => `allocation-${Date.now()}-${allocationSequence++}`;

function CostAnalysisWorkspace({ project }: { project: ProjectRecord }) {
  const [entries, setEntries] = useState<CostEntry[]>([]);
  const [summary, setSummary] = useState<CostSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"all" | EntryType>("all");
  const [modal, setModal] = useState<"transaction" | "allocation" | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [form, setForm] = useState<TransactionForm>({
    entry_type: "expense",
    category: "UNALLOCATED",
    amount: "",
    entry_date: todayInput(),
    reference_no: "",
    description: "",
  });
  const [allocationRows, setAllocationRows] = useState<AllocationRow[]>([]);

  const notify = useCallback((type: "ok" | "error", text: string) => {
    setMessage({ type, text });
    window.setTimeout(() => setMessage(null), 4000);
  }, []);

  const load = useCallback(async () => {
    if (!project.project_name) return;
    setLoading(true);
    try {
      const result = await requestJson(
        `${COST_API}?project_name=${encodeURIComponent(project.project_name)}`,
      );
      setEntries(Array.isArray(result.entries) ? result.entries : []);
      setSummary(result.summary ?? null);
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Gagal memuat cost analysis");
      setEntries([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [project.project_name, notify]);

  useEffect(() => {
    setTab("all");
    setModal(null);
    setEditingId(null);
    load();
  }, [load]);

  const allocations = useMemo(
    () => entries.filter((entry) => entry.entry_type === "allocation"),
    [entries],
  );
  const incomes = useMemo(
    () => entries.filter((entry) => entry.entry_type === "income"),
    [entries],
  );
  const expenses = useMemo(
    () => entries.filter((entry) => entry.entry_type === "expense"),
    [entries],
  );

  const quotation = numberOf(summary?.quotation_total);
  const bomCost = numberOf(summary?.bom_cost_total);
  const allocationTotal = allocations.reduce((sum, entry) => sum + numberOf(entry.amount), 0);
  const totalIncome = incomes.reduce((sum, entry) => sum + numberOf(entry.amount), 0);
  const totalExpense = expenses.reduce((sum, entry) => sum + numberOf(entry.amount), 0);
  const incomeRemaining = quotation - totalIncome;
  const cashBalance = totalIncome - totalExpense;

  const budgets = useMemo(() => {
    return allocations.map((allocation) => {
      const actual = expenses
        .filter((expense) => normalize(expense.category) === normalize(allocation.category))
        .reduce((sum, expense) => sum + numberOf(expense.amount), 0);
      return {
        ...allocation,
        actual,
        remaining: numberOf(allocation.amount) - actual,
        group: (allocation.alloc_group || "OTHER") as AllocationGroup,
      };
    });
  }, [allocations, expenses]);

  const unallocatedExpense = expenses
    .filter(
      (expense) =>
        !allocations.some(
          (allocation) => normalize(allocation.category) === normalize(expense.category),
        ),
    )
    .reduce((sum, expense) => sum + numberOf(expense.amount), 0);

  const overrun =
    budgets.reduce((sum, budget) => sum + Math.max(0, -budget.remaining), 0) +
    unallocatedExpense;
  const lockedProfit = quotation - allocationTotal;
  const projectedProfit = lockedProfit - overrun;
  const lockedProfitPercent = quotation > 0 ? (lockedProfit / quotation) * 100 : 0;
  const billingPercent = quotation > 0 ? Math.min((totalIncome / quotation) * 100, 100) : 0;

  const filteredEntries = useMemo(
    () => (tab === "all" ? entries : entries.filter((entry) => entry.entry_type === tab)),
    [entries, tab],
  );

  const countByType = (type: "all" | EntryType) =>
    type === "all" ? entries.length : entries.filter((entry) => entry.entry_type === type).length;

  const openTransaction = (entry?: CostEntry) => {
    if (entry?.entry_type === "allocation") {
      openAllocation();
      return;
    }
    const type = (entry?.entry_type || (allocations.length ? "expense" : "income")) as TransactionType;
    setEditingId(entry?.id ?? null);
    setForm({
      entry_type: type,
      category:
        entry?.category ||
        (type === "income" ? "DOWN_PAYMENT" : budgets[0]?.category || "UNALLOCATED"),
      amount: entry ? String(numberOf(entry.amount)) : "",
      entry_date: entry?.entry_date?.slice(0, 10) || todayInput(),
      reference_no: entry?.reference_no || "",
      description: entry?.description || "",
    });
    setModal("transaction");
  };

  const allocationAmount = (row: AllocationRow) =>
    row.auto
      ? Math.round((quotation * numberOf(row.percent)) / 100)
      : Math.round(numberOf(row.amount));

  const openAllocation = () => {
    setEditingId(null);
    setAllocationRows(
      allocations.length
        ? allocations.map((entry) => ({
            key: allocationKey(),
            id: entry.id,
            originalName: entry.category,
            group: (entry.alloc_group || "OTHER") as AllocationGroup,
            name: entry.category,
            auto: !!entry.is_auto,
            percent:
              entry.percent != null
                ? String(numberOf(entry.percent))
                : quotation > 0
                  ? ((numberOf(entry.amount) / quotation) * 100).toFixed(2)
                  : "",
            amount: String(numberOf(entry.amount)),
          }))
        : [
            {
              key: allocationKey(),
              id: null,
              originalName: null,
              group: "RAW_MATERIAL",
              name: "Raw Material",
              auto: true,
              percent: quotation > 0 && bomCost > 0 ? ((bomCost / quotation) * 100).toFixed(2) : "",
              amount: "",
            },
            {
              key: allocationKey(),
              id: null,
              originalName: null,
              group: "TRANSPORT",
              name: "Transport",
              auto: true,
              percent: "",
              amount: "",
            },
          ],
    );
    setModal("allocation");
  };

  const saveTransaction = async (event: FormEvent) => {
    event.preventDefault();
    const amount = numberOf(form.amount);
    if (amount <= 0) {
      notify("error", "Amount harus lebih dari 0.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        project_id: project.id,
        project_name: project.project_name,
        ...form,
        amount,
        alloc_group: null,
        percent: null,
        is_auto: false,
      };
      const result = await requestJson(
        editingId ? `${COST_API}?id=${editingId}` : COST_API,
        editingId ? "PUT" : "POST",
        payload,
      );
      notify("ok", result.message || "Transaksi berhasil disimpan.");
      setModal(null);
      await load();
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Gagal menyimpan transaksi");
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async (entry: CostEntry) => {
    if (!window.confirm(`Hapus ${entry.entry_type} “${entry.category}”?`)) return;
    try {
      const result = await requestJson(`${COST_API}?id=${entry.id}`, "DELETE");
      notify("ok", result.message || "Data dihapus.");
      await load();
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Gagal menghapus data");
    }
  };

  const saveAllocations = async () => {
    const active = allocationRows
      .map((row) => ({ ...row, name: row.name.trim(), calculated: allocationAmount(row) }))
      .filter((row) => row.calculated > 0);

    if (!active.length) {
      notify("error", "Minimal satu alokasi harus memiliki nilai.");
      return;
    }
    if (active.some((row) => !row.name)) {
      notify("error", "Nama kategori alokasi wajib diisi.");
      return;
    }
    const names = active.map((row) => normalize(row.name));
    if (new Set(names).size !== names.length) {
      notify("error", "Nama kategori alokasi tidak boleh duplikat.");
      return;
    }

    const keepIds = new Set(active.filter((row) => row.id).map((row) => row.id as number));
    const removed = allocations.filter((entry) => !keepIds.has(entry.id));
    setSaving(true);
    try {
      for (const entry of removed) {
        await requestJson(`${COST_API}?id=${entry.id}`, "DELETE");
      }
      for (const row of active) {
        const existing = row.id ? allocations.find((entry) => entry.id === row.id) : null;
        const payload = {
          project_id: project.id,
          project_name: project.project_name,
          entry_type: "allocation",
          category: row.name,
          alloc_group: row.group,
          is_auto: row.auto,
          percent:
            row.auto
              ? numberOf(row.percent)
              : quotation > 0
                ? Number(((row.calculated / quotation) * 100).toFixed(3))
                : null,
          amount: row.calculated,
          entry_date: existing?.entry_date?.slice(0, 10) || todayInput(),
          reference_no: existing?.reference_no || null,
          description: existing?.description || null,
        };
        await requestJson(
          row.id ? `${COST_API}?id=${row.id}` : COST_API,
          row.id ? "PUT" : "POST",
          payload,
        );

        if (row.originalName && normalize(row.originalName) !== normalize(row.name)) {
          const affected = expenses.filter(
            (entry) => normalize(entry.category) === normalize(row.originalName),
          );
          for (const expense of affected) {
            await requestJson(`${COST_API}?id=${expense.id}`, "PUT", {
              project_id: expense.project_id,
              project_name: expense.project_name,
              entry_type: expense.entry_type,
              category: row.name,
              description: expense.description,
              amount: expense.amount,
              entry_date: expense.entry_date,
              reference_no: expense.reference_no,
              alloc_group: expense.alloc_group,
              percent: expense.percent,
              is_auto: expense.is_auto,
            });
          }
        }
      }
      notify("ok", "Alokasi dan net profit berhasil diperbarui.");
      setModal(null);
      await load();
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Gagal menyimpan alokasi");
    } finally {
      setSaving(false);
    }
  };

  const updateAllocation = (key: string, patch: Partial<AllocationRow>) =>
    setAllocationRows((rows) =>
      rows.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600 ring-1 ring-emerald-100">
            <BarChart3 className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-extrabold text-slate-900">Cost Analysis</h2>
            <p className="text-xs text-slate-500">
              Alokasi budget, pengeluaran, penagihan, dan net profit tanpa sidebar ganda.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={load} className={buttonClass} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button onClick={openAllocation} className={buttonClass}>
            <WalletCards className="h-4 w-4 text-indigo-600" /> Atur Alokasi
          </button>
          <button
            onClick={() => openTransaction()}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> Input Transaksi
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`mx-5 mt-4 rounded-lg border px-3 py-2 text-sm font-medium ${
            message.type === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-5 p-5">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <MoneyStat
            label="Total quotation"
            value={idr(quotation)}
            hint={`BOM cost ${idr(bomCost)}`}
            tone="blue"
            icon={FileText}
          />
          <MoneyStat
            label="Total alokasi"
            value={idr(allocationTotal)}
            hint={`${percentText(quotation > 0 ? (allocationTotal / quotation) * 100 : 0)} dari quotation`}
            icon={WalletCards}
          />
          <MoneyStat
            label="Pemasukan diterima"
            value={idr(totalIncome)}
            hint={`Sisa tagihan ${idr(incomeRemaining)}`}
            tone="green"
            icon={TrendingUp}
          />
          <MoneyStat
            label="Pengeluaran aktual"
            value={idr(totalExpense)}
            hint={`Cash balance ${idr(cashBalance)}`}
            tone="red"
            icon={TrendingDown}
          />
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
            <h3 className="text-sm font-extrabold text-slate-800">Riwayat Input</h3>
            <div className="flex flex-wrap gap-1 rounded-lg bg-slate-200/60 p-1">
              {(["all", "income", "expense", "allocation"] as const).map((item) => (
                <button
                  key={item}
                  onClick={() => setTab(item)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                    tab === item ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                  }`}
                >
                  {item === "all"
                    ? "Semua"
                    : item === "income"
                      ? "Pemasukan"
                      : item === "expense"
                        ? "Pengeluaran"
                        : "Alokasi"} ({countByType(item)})
                </button>
              ))}
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 p-8 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Memuat cost analysis...
              </div>
            ) : filteredEntries.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-400">
                Belum ada data untuk project ini.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {filteredEntries.map((entry) => {
                  const income = entry.entry_type === "income";
                  const allocation = entry.entry_type === "allocation";
                  return (
                    <li
                      key={entry.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              income
                                ? "bg-emerald-50 text-emerald-700"
                                : allocation
                                  ? "bg-indigo-50 text-indigo-700"
                                  : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            {income ? "Pemasukan" : allocation ? "Alokasi" : "Pengeluaran"}
                          </span>
                          <span className="text-sm font-bold text-slate-800">{entry.category}</span>
                          {allocation && entry.alloc_group && (
                            <span className="text-[10px] text-slate-400">
                              {allocationMeta[entry.alloc_group].label}
                              {entry.is_auto && entry.percent != null
                                ? ` · ${numberOf(entry.percent).toFixed(1)}% AUTO`
                                : ""}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {formatDate(entry.entry_date)}
                          {entry.reference_no ? ` · Ref: ${entry.reference_no}` : ""}
                          {entry.description ? ` · ${entry.description}` : ""}
                        </p>
                      </div>
                      <p
                        className={`text-sm font-extrabold ${
                          income ? "text-emerald-600" : allocation ? "text-indigo-600" : "text-rose-600"
                        }`}
                      >
                        {income ? "+" : allocation ? "•" : "−"} {idr(numberOf(entry.amount))}
                      </p>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openTransaction(entry)}
                          className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100"
                          title="Edit"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => deleteEntry(entry)}
                          className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                          title="Hapus"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
              <h3 className="text-sm font-extrabold text-slate-800">Profit Waterfall</h3>
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                  projectedProfit >= 0
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-rose-50 text-rose-700"
                }`}
              >
                {projectedProfit >= 0 ? "PROFIT" : "LOSS"} · {percentText(lockedProfitPercent)}
              </span>
            </div>
            <div className="divide-y divide-slate-100 text-sm">
              <div className="flex justify-between px-4 py-3 font-bold text-slate-800">
                <span>Total Quotation (BOM)</span>
                <span>{idr(quotation)}</span>
              </div>
              {budgets.map((budget) => (
                <div key={budget.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span className="flex min-w-0 items-center gap-2 text-slate-600">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${allocationMeta[budget.group].color}`} />
                    <span className="truncate">{budget.category}</span>
                  </span>
                  <span className="font-semibold text-rose-600">− {idr(numberOf(budget.amount))}</span>
                </div>
              ))}
              <div
                className={`flex justify-between px-4 py-3 font-extrabold ${
                  lockedProfit >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                }`}
              >
                <span>Net Profit Terkunci</span>
                <span>{idr(lockedProfit)}</span>
              </div>
              <div className="flex justify-between px-4 py-2.5 text-slate-600">
                <span>Overrun & di luar alokasi</span>
                <span className="font-semibold text-rose-600">− {idr(overrun)}</span>
              </div>
              <div className="flex justify-between bg-slate-50 px-4 py-3 font-extrabold text-slate-900">
                <span>Proyeksi Net Profit</span>
                <span className={projectedProfit >= 0 ? "text-emerald-600" : "text-rose-600"}>
                  {idr(projectedProfit)}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 p-4">
              <h3 className="mb-3 text-sm font-extrabold text-slate-800">Sisa Alokasi per Kategori</h3>
              {budgets.length === 0 ? (
                <p className="text-xs text-slate-400">Belum ada alokasi.</p>
              ) : (
                <div className="space-y-3">
                  {budgets.map((budget) => {
                    const used = numberOf(budget.amount) > 0 ? (budget.actual / numberOf(budget.amount)) * 100 : 0;
                    return (
                      <div key={budget.id}>
                        <div className="flex justify-between gap-3 text-xs">
                          <span className="font-bold text-slate-700">{budget.category}</span>
                          <span className={budget.remaining >= 0 ? "font-bold text-emerald-600" : "font-bold text-rose-600"}>
                            {budget.remaining >= 0 ? "Sisa" : "Over"} {idr(Math.abs(budget.remaining))}
                          </span>
                        </div>
                        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${
                              budget.remaining < 0 ? "bg-rose-500" : used > 85 ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                            style={{ width: `${Math.min(used, 100)}%` }}
                          />
                        </div>
                        <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                          <span>Aktual {idr(budget.actual)} ({used.toFixed(0)}%)</span>
                          <span>Alokasi {idr(numberOf(budget.amount))}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-extrabold text-slate-800">Penagihan</span>
                <span className={incomeRemaining > 0 ? "text-xs font-bold text-amber-600" : "text-xs font-bold text-emerald-600"}>
                  {incomeRemaining > 0 ? "Belum lunas" : "Lunas"}
                </span>
              </div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${billingPercent}%` }} />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-[9px] uppercase text-slate-400">Quotation</p>
                  <p className="mt-1 text-xs font-bold text-slate-700">{idr(quotation)}</p>
                </div>
                <div className="rounded-lg bg-emerald-50 p-2">
                  <p className="text-[9px] uppercase text-emerald-500">Diterima</p>
                  <p className="mt-1 text-xs font-bold text-emerald-700">{idr(totalIncome)}</p>
                </div>
                <div className="rounded-lg bg-amber-50 p-2">
                  <p className="text-[9px] uppercase text-amber-500">Sisa</p>
                  <p className="mt-1 text-xs font-bold text-amber-700">{idr(incomeRemaining)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {modal === "transaction" && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <form onSubmit={saveTransaction} className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="font-extrabold text-slate-900">{editingId ? "Edit Transaksi" : "Input Transaksi"}</h3>
                <p className="text-xs text-slate-500">{project.project_name}</p>
              </div>
              <button type="button" onClick={() => setModal(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <label className="text-xs font-bold text-slate-600">
                Tipe
                <select
                  value={form.entry_type}
                  onChange={(event) => {
                    const type = event.target.value as TransactionType;
                    setForm((current) => ({
                      ...current,
                      entry_type: type,
                      category: type === "income" ? "DOWN_PAYMENT" : budgets[0]?.category || "UNALLOCATED",
                    }));
                  }}
                  className={`${inputClass} mt-1`}
                  disabled={!!editingId}
                >
                  <option value="income">Pemasukan</option>
                  <option value="expense">Pengeluaran</option>
                </select>
              </label>
              <label className="text-xs font-bold text-slate-600">
                Kategori
                <select
                  value={form.category}
                  onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                  className={`${inputClass} mt-1`}
                >
                  {form.entry_type === "income" ? (
                    incomeOptions.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))
                  ) : (
                    <>
                      {budgets.map((budget) => (
                        <option key={budget.id} value={budget.category}>
                          {budget.category} — sisa {idr(budget.remaining)}
                        </option>
                      ))}
                      <option value="UNALLOCATED">Di luar alokasi</option>
                    </>
                  )}
                </select>
              </label>
              <label className="text-xs font-bold text-slate-600">
                Amount
                <input
                  type="number"
                  min="1"
                  value={form.amount}
                  onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                  className={`${inputClass} mt-1`}
                  required
                />
              </label>
              <label className="text-xs font-bold text-slate-600">
                Tanggal
                <input
                  type="date"
                  value={form.entry_date}
                  onChange={(event) => setForm((current) => ({ ...current, entry_date: event.target.value }))}
                  className={`${inputClass} mt-1`}
                  required
                />
              </label>
              <label className="text-xs font-bold text-slate-600 sm:col-span-2">
                Reference No.
                <input
                  value={form.reference_no}
                  onChange={(event) => setForm((current) => ({ ...current, reference_no: event.target.value }))}
                  className={`${inputClass} mt-1`}
                  placeholder="PO / Invoice / Receipt number"
                />
              </label>
              <label className="text-xs font-bold text-slate-600 sm:col-span-2">
                Description
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  className={`${inputClass} mt-1 min-h-24`}
                  placeholder="Catatan transaksi..."
                />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4">
              <button type="button" onClick={() => setModal(null)} className={buttonClass}>Batal</button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Simpan
              </button>
            </div>
          </form>
        </div>
      )}

      {modal === "allocation" && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="font-extrabold text-slate-900">Atur Alokasi & Kunci Net Profit</h3>
                <p className="text-xs text-slate-500">Quotation {idr(quotation)}</p>
              </div>
              <button onClick={() => setModal(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="mb-3 hidden grid-cols-[150px_1fr_90px_130px_48px] gap-2 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 md:grid">
                <span>Group</span><span>Category</span><span>Mode</span><span>Value</span><span />
              </div>
              <div className="space-y-2">
                {allocationRows.map((row) => (
                  <div key={row.key} className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[150px_1fr_90px_130px_48px]">
                    <select
                      value={row.group}
                      onChange={(event) => updateAllocation(row.key, { group: event.target.value as AllocationGroup })}
                      className={inputClass}
                    >
                      {(Object.keys(allocationMeta) as AllocationGroup[]).map((group) => (
                        <option key={group} value={group}>{allocationMeta[group].label}</option>
                      ))}
                    </select>
                    <input
                      value={row.name}
                      onChange={(event) => updateAllocation(row.key, { name: event.target.value })}
                      className={inputClass}
                      placeholder="Nama alokasi"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const amount = allocationAmount(row);
                        updateAllocation(row.key, row.auto
                          ? { auto: false, amount: String(amount) }
                          : { auto: true, percent: quotation > 0 ? ((amount / quotation) * 100).toFixed(2) : "" });
                      }}
                      className={`rounded-lg border px-2 py-2 text-xs font-bold ${row.auto ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-300 bg-white text-slate-600"}`}
                    >
                      {row.auto ? "AUTO %" : "MANUAL"}
                    </button>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step={row.auto ? "0.01" : "1"}
                        value={row.auto ? row.percent : row.amount}
                        onChange={(event) => updateAllocation(row.key, row.auto ? { percent: event.target.value } : { amount: event.target.value })}
                        className={`${inputClass} pr-8`}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        {row.auto ? "%" : "Rp"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAllocationRows((rows) => rows.filter((item) => item.key !== row.key))}
                      className="flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <div className="text-xs text-slate-500 md:col-span-5">
                      Hasil alokasi: <b className="text-slate-800">{idr(allocationAmount(row))}</b>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setAllocationRows((rows) => [...rows, {
                  key: allocationKey(), id: null, originalName: null, group: "OTHER", name: "Lainnya", auto: false, percent: "", amount: "",
                }])}
                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                <Plus className="h-4 w-4" /> Tambah alokasi
              </button>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <MoneyStat label="Total allocation" value={idr(allocationRows.reduce((sum, row) => sum + allocationAmount(row), 0))} icon={WalletCards} />
                <MoneyStat label="Locked net profit" value={idr(quotation - allocationRows.reduce((sum, row) => sum + allocationAmount(row), 0))} tone="green" icon={TrendingUp} />
                <MoneyStat label="Quotation" value={idr(quotation)} tone="blue" icon={FileText} />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4">
              <button onClick={() => setModal(null)} className={buttonClass}>Batal</button>
              <button
                onClick={saveAllocations}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Simpan Alokasi
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ========================================================================== */
/* Timeline                                                                   */
/* ========================================================================== */

function ProjectTimeline({ project, onEdit }: { project: ProjectRecord; onEdit: (stage: ProjectStage) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dayWidth = 26;
  const labelWidth = 190;
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const range = useMemo(() => {
    const dates: Date[] = [today];
    PROJECT_STAGES.forEach((stage) => {
      const history = project.stage_history?.[stage.id];
      [history?.plan_start_date, history?.plan_end_date, history?.entered_at, history?.completed_at].forEach((value) => {
        const parsed = dateValue(value);
        if (parsed) dates.push(parsed);
      });
    });
    const projectStart = dateValue(project.start_date);
    const projectEnd = dateValue(project.target_completion_date);
    if (projectStart) dates.push(projectStart);
    if (projectEnd) dates.push(projectEnd);

    const minRaw = new Date(Math.min(...dates.map((date) => date.getTime())));
    const maxRaw = new Date(Math.max(...dates.map((date) => date.getTime())));
    const start = new Date(minRaw.getFullYear(), minRaw.getMonth(), 1);
    start.setDate(start.getDate() - 7);
    const end = new Date(maxRaw.getFullYear(), maxRaw.getMonth() + 2, 0);
    const minimumEnd = new Date(start.getTime() + 150 * DAY_MS);
    return { start, end: end < minimumEnd ? minimumEnd : end };
  }, [project, today]);

  const totalDays = Math.max(1, Math.ceil((range.end.getTime() - range.start.getTime()) / DAY_MS) + 1);
  const timelineWidth = totalDays * dayWidth;
  const fullWidth = labelWidth + timelineWidth;
  const todayOffset = labelWidth + ((today.getTime() - range.start.getTime()) / DAY_MS) * dayWidth;

  const months = useMemo(() => {
    const result: { key: string; label: string; left: number; width: number }[] = [];
    let cursor = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
    while (cursor <= range.end) {
      const monthStart = cursor < range.start ? range.start : cursor;
      const nextMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      const monthEnd = nextMonth > range.end ? new Date(range.end.getTime() + DAY_MS) : nextMonth;
      const left = labelWidth + Math.max(0, (monthStart.getTime() - range.start.getTime()) / DAY_MS) * dayWidth;
      const width = Math.max(dayWidth, ((monthEnd.getTime() - monthStart.getTime()) / DAY_MS) * dayWidth);
      result.push({
        key: `${cursor.getFullYear()}-${cursor.getMonth()}`,
        label: cursor.toLocaleDateString("en-US", { month: "short", year: "numeric" }).toUpperCase(),
        left,
        width,
      });
      cursor = nextMonth;
    }
    return result;
  }, [range, labelWidth, dayWidth]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollLeft = Math.max(0, todayOffset - scrollRef.current.clientWidth / 2);
  }, [project.id, todayOffset]);

  const milestones = PROJECT_STAGES.map((stage) => ({
    stage,
    date: project.stage_history?.[stage.id]?.plan_end_date,
    status: project.stage_notes?.[stage.id]?.stage_status || "Pending",
  })).filter((item) => item.date);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-xs font-black uppercase tracking-[0.18em] text-slate-700">Timeline Schedule</h3>
          {PROJECT_STAGES.map((stage) => {
            const status = project.stage_notes?.[stage.id]?.stage_status || "Pending";
            if (status === "Pending") return null;
            return (
              <span key={stage.id} className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${stage.soft}`}>
                {stage.shortLabel}: {status}
              </span>
            );
          })}
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
          <span className="h-3 border-l-2 border-dashed border-red-500" /> TODAY
          <span className="h-2.5 w-5 rounded bg-blue-500" /> PHASE
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {(milestones.length ? milestones.slice(0, 5) : PROJECT_STAGES.slice(0, 5).map((stage) => ({ stage, date: null, status: "Pending" as StageStatus }))).map(({ stage, date, status }) => (
          <button
            key={stage.id}
            onClick={() => onEdit(stage.id)}
            className={`rounded-xl border bg-white p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md ${stage.border}`}
          >
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${stage.color}`} />
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">{stage.label}</span>
            </div>
            <p className="mt-1 text-sm font-extrabold text-slate-900">{date ? formatDate(date) : "Not scheduled"}</p>
            <p className="mt-0.5 text-[10px] text-slate-400">{status}</p>
          </button>
        ))}
      </div>

      <div ref={scrollRef} className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <div className="relative" style={{ width: fullWidth, minWidth: "100%" }}>
          <div className="sticky top-0 z-30 h-11 border-b border-slate-200 bg-slate-50">
            <div className="sticky left-0 z-40 flex h-11 w-[190px] items-center border-r border-slate-200 bg-slate-50 px-3 text-[10px] font-black uppercase tracking-wider text-slate-500">
              Project / Stage
            </div>
            {months.map((month) => (
              <div
                key={month.key}
                className="absolute top-0 flex h-11 items-center justify-center border-r border-slate-200 text-[10px] font-black tracking-wider text-slate-600"
                style={{ left: month.left, width: month.width }}
              >
                {month.label}
              </div>
            ))}
          </div>

          <div
            className="pointer-events-none absolute bottom-0 top-11 z-20 border-l-2 border-dashed border-red-500"
            style={{ left: todayOffset }}
          >
            <span className="absolute -left-3.5 -top-1 rounded bg-red-600 px-1 py-0.5 text-[8px] font-black text-white">
              {today.getDate()}
            </span>
          </div>

          {PROJECT_STAGES.map((stage, index) => {
            const history = project.stage_history?.[stage.id];
            const status = project.stage_notes?.[stage.id]?.stage_status || "Pending";
            const start = dateValue(history?.plan_start_date || history?.entered_at);
            const end = dateValue(history?.plan_end_date || history?.completed_at || (start && status === "In Progress" ? today.toISOString() : null));
            const barStart = start
              ? labelWidth + ((start.getTime() - range.start.getTime()) / DAY_MS) * dayWidth
              : null;
            const duration = start && end ? Math.max(1, Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1) : 0;
            const barWidth = Math.max(dayWidth * 2, duration * dayWidth);
            const statusColor =
              status === "Completed"
                ? "bg-emerald-500 border-emerald-600"
                : status === "Issue"
                  ? "bg-rose-500 border-rose-600"
                  : status === "In Progress"
                    ? `${stage.color} ${stage.border}`
                    : "bg-slate-200 border-slate-300 text-slate-500";

            return (
              <div key={stage.id} className={`relative h-14 border-b border-slate-100 ${index % 2 ? "bg-slate-50/30" : "bg-white"}`}>
                <button
                  onClick={() => onEdit(stage.id)}
                  className="sticky left-0 z-10 flex h-14 w-[190px] items-center gap-2 border-r border-slate-200 bg-inherit px-3 text-left hover:bg-blue-50"
                >
                  <span className={`rounded-lg p-1.5 ${stage.soft}`}>
                    <stage.icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-extrabold text-slate-800">{stage.label}</span>
                    <span className="block text-[9px] text-slate-400">{status}</span>
                  </span>
                </button>

                {barStart !== null && end ? (
                  <button
                    onClick={() => onEdit(stage.id)}
                    className={`absolute top-2.5 h-9 overflow-hidden rounded-md border px-2 text-left text-white shadow-sm transition hover:brightness-105 ${statusColor}`}
                    style={{ left: barStart, width: barWidth }}
                    title={`${stage.label}: ${formatDate(start?.toISOString())} - ${formatDate(end.toISOString())}`}
                  >
                    <span className="block truncate text-[10px] font-black">{stage.shortLabel}</span>
                    <span className="block truncate text-[8px] font-semibold opacity-90">
                      {start?.toLocaleDateString("id-ID", { day: "2-digit", month: "short" })} → {end.toLocaleDateString("id-ID", { day: "2-digit", month: "short" })} · {duration}D
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={() => onEdit(stage.id)}
                    className="absolute top-3 h-8 rounded-md border border-dashed border-slate-300 bg-white px-3 text-[9px] font-bold text-slate-400 hover:border-blue-300 hover:text-blue-600"
                    style={{ left: labelWidth + 12 }}
                  >
                    + SET PLAN DATE
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StageUpdateModal({
  stage,
  project,
  saving,
  onClose,
  onSave,
}: {
  stage: ProjectStage | null;
  project: ProjectRecord;
  saving: boolean;
  onClose: () => void;
  onSave: (data: StageUpdateData) => Promise<void>;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<StageUpdateData>({
    notes: "",
    rich_text: "",
    stage_status: "Pending",
  });

  useEffect(() => {
    if (!stage) return;
    const note = project.stage_notes?.[stage];
    const history = project.stage_history?.[stage];
    const richText = sanitizeRichText(
      note?.rich_text || plainTextToRichText(note?.notes || ""),
    );
    setData({
      notes: note?.notes || "",
      rich_text: richText,
      stage_status: note?.stage_status || "Pending",
      plan_start_date: history?.plan_start_date?.slice(0, 10) || "",
      plan_end_date: history?.plan_end_date?.slice(0, 10) || "",
    });
    if (editorRef.current) editorRef.current.innerHTML = richText;
  }, [stage, project]);

  const syncEditor = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const richText = sanitizeRichText(editor.innerHTML);
    const notes = editor.innerText.trim();
    if (editor.innerHTML !== richText) editor.innerHTML = richText;
    setData((current) => ({ ...current, notes, rich_text: richText }));
  };

  const applyFormat = (
    command: "bold" | "italic" | "underline" | "insertUnorderedList" | "insertOrderedList",
  ) => {
    editorRef.current?.focus();
    document.execCommand(command, false);
    syncEditor();
  };

  if (!stage) return null;
  const meta = stageMeta(stage);
  const formatActions: Array<{
    command: "bold" | "italic" | "underline" | "insertUnorderedList" | "insertOrderedList";
    label: string;
    icon: LucideIcon;
  }> = [
    { command: "bold", label: "Bold", icon: Bold },
    { command: "italic", label: "Italic", icon: Italic },
    { command: "underline", label: "Underline", icon: Underline },
    { command: "insertUnorderedList", label: "Bullet list", icon: List },
    { command: "insertOrderedList", label: "Numbered list", icon: ListOrdered },
  ];

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className={`rounded-xl p-2 ${meta.soft}`}><meta.icon className="h-5 w-5" /></span>
            <div>
              <h3 className="font-extrabold text-slate-900">Update {meta.label}</h3>
              <p className="text-xs text-slate-500">{project.project_name}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-3">
          <label className="text-xs font-bold text-slate-600">
            Stage Status
            <select
              value={data.stage_status}
              onChange={(event) => setData((current) => ({ ...current, stage_status: event.target.value as StageStatus }))}
              className={`${inputClass} mt-1`}
            >
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Issue">Issue / Blocked</option>
            </select>
          </label>
          <label className="text-xs font-bold text-slate-600">
            Plan Start
            <input
              type="date"
              value={data.plan_start_date || ""}
              onChange={(event) => setData((current) => ({ ...current, plan_start_date: event.target.value }))}
              className={`${inputClass} mt-1`}
            />
          </label>
          <label className="text-xs font-bold text-slate-600">
            Plan End
            <input
              type="date"
              value={data.plan_end_date || ""}
              onChange={(event) => setData((current) => ({ ...current, plan_end_date: event.target.value }))}
              className={`${inputClass} mt-1`}
            />
          </label>

          <div className="sm:col-span-3">
            <div className="mb-1 flex items-end justify-between gap-3">
              <label className="text-xs font-bold text-slate-600">Notes / Analysis</label>
              <span className="text-[10px] text-slate-400">Rich text tersimpan per stage</span>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-300 bg-white transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
              <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 p-2">
                {formatActions.map(({ command, label, icon: Icon }) => (
                  <button
                    key={command}
                    type="button"
                    title={label}
                    aria-label={label}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      applyFormat(command);
                    }}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-slate-600 transition hover:border-slate-200 hover:bg-white hover:text-blue-700"
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
              <div
                ref={editorRef}
                contentEditable={!saving}
                suppressContentEditableWarning
                role="textbox"
                aria-multiline="true"
                data-placeholder="Analysis, progress, issue, PIC, dan next action..."
                onInput={syncEditor}
                onBlur={syncEditor}
                onPaste={(event) => {
                  event.preventDefault();
                  document.execCommand(
                    "insertText",
                    false,
                    event.clipboardData.getData("text/plain"),
                  );
                  syncEditor();
                }}
                className="min-h-40 px-4 py-3 text-sm leading-6 text-slate-800 outline-none empty:before:pointer-events-none empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)] [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-1 [&_p]:mb-2"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4">
          <button type="button" onClick={onClose} disabled={saving} className={buttonClass}>Batal</button>
          <button
            type="button"
            onClick={() => onSave({ ...data, rich_text: sanitizeRichText(data.rich_text) })}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Stage
          </button>
        </div>
      </div>
    </div>
  );
}

function ProjectManagementWorkspace({
  project,
  onProjectUpdated,
}: {
  project: ProjectRecord;
  onProjectUpdated: (project: ProjectRecord) => void;
}) {
  const [editingStage, setEditingStage] = useState<ProjectStage | null>(null);
  const [saving, setSaving] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<ProjectStage, boolean>>({} as Record<ProjectStage, boolean>);

  useEffect(() => {
    setCollapsed(
      Object.fromEntries(
        PROJECT_STAGES.map((stage) => [
          stage.id,
          (project.stage_notes?.[stage.id]?.stage_status || "Pending") === "Pending",
        ]),
      ) as Record<ProjectStage, boolean>,
    );
  }, [project.id]);

  const completedStageCount = PROJECT_STAGES.filter(
    (stage) => project.stage_notes?.[stage.id]?.stage_status === "Completed",
  ).length;

  const stageDetails = PROJECT_STAGES.map((stage, originalIndex) => ({
    stage,
    originalIndex,
    status: project.stage_notes?.[stage.id]?.stage_status || "Pending" as StageStatus,
  }))
    .filter(({ status }) => status !== "Completed")
    .sort((left, right) => {
      const priority: Record<StageStatus, number> = {
        "In Progress": 0,
        Issue: 1,
        Pending: 2,
        Completed: 3,
      };
      return priority[left.status] - priority[right.status]
        || left.originalIndex - right.originalIndex;
    });

  const saveStage = async (data: StageUpdateData) => {
    if (!editingStage || project.synthetic) return;
    setSaving(true);
    try {
      const notes = { ...project.stage_notes };
      const history = { ...project.stage_history };
      notes[editingStage] = {
        ...(notes[editingStage] || {}),
        notes: data.notes,
        rich_text: sanitizeRichText(data.rich_text),
        stage_status: data.stage_status,
      };
      history[editingStage] = { ...(history[editingStage] || {}) };
      history[editingStage]!.plan_start_date = data.plan_start_date || null;
      history[editingStage]!.plan_end_date = data.plan_end_date || null;

      let currentStage = project.current_stage;
      let projectStatus = project.status;
      const now = new Date().toISOString();

      if (data.stage_status === "In Progress" && !history[editingStage]!.entered_at) {
        history[editingStage]!.entered_at = now;
        currentStage = editingStage;
      }
      if (data.stage_status === "Completed") {
        history[editingStage]!.entered_at = history[editingStage]!.entered_at || now;
        history[editingStage]!.completed_at = history[editingStage]!.completed_at || now;
        if (currentStage === editingStage) {
          const next = PROJECT_STAGES[stageIndex(editingStage) + 1];
          if (next) {
            currentStage = next.id;
            history[next.id] = history[next.id] || { entered_at: now };
          } else {
            projectStatus = "Completed";
          }
        }
      } else {
        history[editingStage]!.completed_at = null;
      }

      const result = await requestJson(PROJECT_API, "PATCH", {
        id: project.id,
        stage_notes: notes,
        stage_history: history,
        current_stage: currentStage,
        status: projectStatus,
      });
      onProjectUpdated(normalizeProject(result));
      setEditingStage(null);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Gagal menyimpan stage");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-violet-50 p-2.5 text-violet-600 ring-1 ring-violet-100">
            <CalendarDays className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-extrabold text-slate-900">Timeline & Project Management</h2>
            <p className="text-xs text-slate-500">
              Gantt timeline dan seluruh detail stage ditampilkan vertikal dalam satu card.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-5">
        {project.synthetic && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Project ini ditemukan dari BOM, tetapi record Project Management belum tersedia. Sinkronkan/create project pada API project agar stage dapat diedit.
          </div>
        )}

        <ProjectTimeline project={project} onEdit={(stage) => !project.synthetic && setEditingStage(stage)} />

        <div className="border-t border-slate-200 pt-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-extrabold text-slate-900">Stage Details</h3>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                  {stageDetails.length} active
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                In Progress ditampilkan paling atas; Pending tetap ringkas di bawahnya.
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-emerald-600">
                {completedStageCount}/{PROJECT_STAGES.length} completed
              </p>
              <p className="text-[10px] text-slate-400">Completed stages disembunyikan</p>
            </div>
          </div>

          {stageDetails.length === 0 ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-5 text-center">
              <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-600" />
              <p className="mt-2 text-sm font-extrabold text-emerald-800">Semua stage completed</p>
              <p className="mt-0.5 text-xs text-emerald-700">Tidak ada active stage yang perlu ditampilkan.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stageDetails.map(({ stage, originalIndex: index, status }) => {
                const note = project.stage_notes?.[stage.id];
                const history = project.stage_history?.[stage.id];
                const isCollapsed = !!collapsed[stage.id];
                const strongTone = status === "In Progress" || status === "Issue";
                const headerTone = status === "In Progress"
                  ? "border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-100"
                  : status === "Issue"
                    ? "border-rose-600 bg-rose-600 text-white shadow-sm shadow-rose-100"
                    : "border-slate-200 bg-slate-100 text-slate-900";

                return (
                  <article key={stage.id} className={`overflow-hidden rounded-xl border ${headerTone}`}>
                    <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                      <button
                        type="button"
                        onClick={() => setCollapsed((current) => ({ ...current, [stage.id]: !current[stage.id] }))}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-4 ${
                          strongTone
                            ? "bg-white/15 text-white ring-white/10"
                            : `${stage.soft} ring-white/70`
                        }`}>
                          <stage.icon className="h-5 w-5" />
                        </span>
                        <span className="min-w-0">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className={`text-[10px] font-black ${strongTone ? "text-white/70" : "text-slate-400"}`}>
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <span className={`font-extrabold ${strongTone ? "text-white" : "text-slate-900"}`}>
                              {stage.label}
                            </span>
                            <StatusBadge status={status} inverse={strongTone} />
                          </span>
                          <span className={`mt-0.5 block text-xs ${strongTone ? "text-white/75" : "text-slate-500"}`}>
                            {stage.description}
                          </span>
                        </span>
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingStage(stage.id)}
                          disabled={project.synthetic}
                          className={strongTone
                            ? "inline-flex items-center justify-center gap-2 rounded-lg border border-white/30 bg-white/15 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-50"
                            : buttonClass}
                        >
                          <Edit2 className="h-4 w-4" /> Update
                        </button>
                        <button
                          type="button"
                          aria-label={isCollapsed ? `Buka detail ${stage.label}` : `Tutup detail ${stage.label}`}
                          onClick={() => setCollapsed((current) => ({ ...current, [stage.id]: !current[stage.id] }))}
                          className={strongTone
                            ? "rounded-lg border border-white/20 bg-white/15 p-2 text-white transition hover:bg-white/25"
                            : "rounded-lg bg-white/70 p-2 text-slate-500 transition hover:bg-white"}
                        >
                          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {!isCollapsed && (
                      <div className="grid gap-4 border-t border-slate-200 bg-white p-4 text-slate-900 xl:grid-cols-[320px_1fr]">
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            ["Plan Start", history?.plan_start_date, "text-blue-600"],
                            ["Plan End", history?.plan_end_date, "text-violet-600"],
                            ["Actual Start", history?.entered_at, "text-amber-600"],
                            ["Actual End", history?.completed_at, "text-emerald-600"],
                          ].map(([label, value, color]) => (
                            <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                              <p className={`mt-1 text-xs font-extrabold ${color}`}>{formatDate(value)}</p>
                            </div>
                          ))}
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Notes / Analysis</p>
                          {note?.rich_text ? (
                            <div
                              className="mt-2 text-sm leading-6 text-slate-700 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-1 [&_p]:mb-2"
                              dangerouslySetInnerHTML={{ __html: sanitizeRichText(note.rich_text) }}
                            />
                          ) : (
                            <p className={`mt-2 whitespace-pre-wrap text-sm leading-6 ${note?.notes ? "text-slate-700" : "italic text-slate-400"}`}>
                              {note?.notes || "Belum ada notes untuk stage ini."}
                            </p>
                          )}
                          {(note?.documents?.length || note?.links?.length) && (
                            <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-200 pt-3">
                              {note.documents?.map((document, documentIndex) => (
                                <span key={`${document}-${documentIndex}`} className="rounded-md bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">
                                  Document {documentIndex + 1}
                                </span>
                              ))}
                              {note.links?.map((link, linkIndex) => (
                                <a key={`${link}-${linkIndex}`} href={link} target="_blank" rel="noreferrer" className="rounded-md bg-white px-2 py-1 text-[10px] font-bold text-slate-600 ring-1 ring-slate-200 hover:text-blue-600">
                                  Link {linkIndex + 1}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <StageUpdateModal
        stage={editingStage}
        project={project}
        saving={saving}
        onClose={() => setEditingStage(null)}
        onSave={saveStage}
      />
    </section>
  );
}

/* ========================================================================== */
/* Main page                                                                  */
/* ========================================================================== */

export default function IntegratedProjectWorkspacePage() {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [bomRows, setBomRows] = useState<BomRow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [workspaceMessage, setWorkspaceMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileProjectsOpen, setMobileProjectsOpen] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showDropped, setShowDropped] = useState(false);
  const [statusActionBusy, setStatusActionBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProjectRecord | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deletingProject, setDeletingProject] = useState(false);

  const notifyWorkspace = useCallback((type: "ok" | "error", text: string) => {
    setWorkspaceMessage({ type, text });
    window.setTimeout(() => setWorkspaceMessage(null), 6000);
  }, []);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [projectResult, bomResult] = await Promise.all([
        requestJson(PROJECT_API),
        requestJson(BOM_API),
      ]);
      // Jangan membuang project Drop di sini. Project Drop tetap disimpan di state,
      // lalu disembunyikan secara default oleh filter sidebar agar bisa di-undrop.
      const serverProjects = extractArray(projectResult)
        .map(normalizeProject)
        .filter((project) => project.project_name);
      const rows = extractArray(bomResult) as BomRow[];
      setBomRows(rows);

      const byName = new Map<string, ProjectRecord>();
      serverProjects.forEach((project) => byName.set(normalize(project.project_name), project));
      rows.forEach((row) => {
        const projectName = String(row.project_name ?? "").trim();
        if (!projectName || byName.has(normalize(projectName))) return;
        byName.set(normalize(projectName), emptyProject(projectName, String(row.customer ?? "—")));
      });

      const merged = Array.from(byName.values()).sort((a, b) => {
        const stageDifference = stageIndex(b.current_stage) - stageIndex(a.current_stage);
        if (stageDifference !== 0) return stageDifference;
        return a.project_name.localeCompare(b.project_name);
      });
      setProjects(merged);

      setSelectedId((current) => {
        if (current && merged.some((project) => project.id === current)) return current;
        const queryName = typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("project")
          : null;
        const fromQuery = queryName
          ? merged.find(
              (project) =>
                normalize(project.project_name) === normalize(queryName) &&
                project.status !== "Completed" &&
                !isDroppedProject(project),
            )
          : null;
        const firstVisible = merged.find(
          (project) => project.status !== "Completed" && !isDroppedProject(project),
        );
        return fromQuery?.id || firstVisible?.id || "";
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Gagal memuat workspace");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  const visibleProjects = useMemo(
    () =>
      projects.filter(
        (project) =>
          (showCompleted || project.status !== "Completed") &&
          (showDropped || !isDroppedProject(project)),
      ),
    [projects, showCompleted, showDropped],
  );

  useEffect(() => {
    if (visibleProjects.some((project) => project.id === selectedId)) return;
    setSelectedId(visibleProjects[0]?.id || "");
  }, [selectedId, visibleProjects]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedId) ?? null,
    [projects, selectedId],
  );

  const allDocumentGroups = useMemo(() => groupBomRows(bomRows), [bomRows]);
  const selectedDocuments = useMemo(() => {
    if (!selectedProject) return [];
    return allDocumentGroups.filter(
      (group) => normalize(group.project_name) === normalize(selectedProject.project_name),
    );
  }, [allDocumentGroups, selectedProject]);

  useEffect(() => {
    if (!selectedProject || typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("project", selectedProject.project_name);
    window.history.replaceState({}, "", url.toString());
  }, [selectedProject]);

  const updateProject = (updated: ProjectRecord) => {
    setProjects((current) =>
      current.map((project) => (project.id === updated.id ? updated : project)),
    );
  };

  const toggleProjectDrop = async () => {
    if (!selectedProject || selectedProject.synthetic || statusActionBusy) return;
    const dropping = !isDroppedProject(selectedProject);
    const nextStatus: ProjectStatus = dropping ? "On Hold" : "In Progress";
    const nextFinalCategory: FinalCategory = dropping ? "closed_red" : "none";
    setStatusActionBusy(true);
    try {
      const result = await requestJson(PROJECT_API, "PATCH", {
        id: selectedProject.id,
        status: nextStatus,
        final_category: nextFinalCategory,
      });
      const rawProject = result?.project ?? result?.data ?? result;
      const updated = rawProject?.id
        ? {
            ...normalizeProject(rawProject),
            final_category: (rawProject.final_category || nextFinalCategory) as FinalCategory,
          }
        : {
            ...selectedProject,
            status: nextStatus,
            final_category: nextFinalCategory,
            updated_at: new Date().toISOString(),
          };
      updateProject(updated);
      notifyWorkspace(
        "ok",
        dropping
          ? `Project “${selectedProject.project_name}” di-drop dan masuk ke daftar tersembunyi.`
          : `Project “${selectedProject.project_name}” aktif kembali dengan status In Progress.`,
      );
    } catch (actionError) {
      notifyWorkspace(
        "error",
        actionError instanceof Error ? actionError.message : "Gagal mengubah status project",
      );
    } finally {
      setStatusActionBusy(false);
    }
  };

  const openDeleteProject = () => {
    if (!selectedProject) return;
    setDeleteConfirm("");
    setDeleteTarget(selectedProject);
  };

  const closeDeleteProject = () => {
    if (deletingProject) return;
    setDeleteTarget(null);
    setDeleteConfirm("");
  };

  const deleteProjectCascade = async (event: FormEvent) => {
    event.preventDefault();
    if (!deleteTarget || deletingProject) return;
    if (deleteConfirm.trim() !== deleteTarget.project_name.trim()) {
      notifyWorkspace("error", "Nama project yang diketik tidak sama.");
      return;
    }

    const projectName = deleteTarget.project_name;
    const costQuery = new URLSearchParams({ project_name: projectName });
    if (!deleteTarget.synthetic && deleteTarget.id) {
      costQuery.set("project_id", deleteTarget.id);
    }
    const bomQuery = new URLSearchParams({ project_name: projectName });

    setDeletingProject(true);
    try {
      // Endpoint Cost Analysis menghapus semua entry cost sekaligus record Project Management.
      // Endpoint Create BOM menghapus seluruh row BOM; nomor QO/PO dan metadata dokumen
      // tersimpan di row yang sama, sehingga data dokumen project ikut terhapus.
      const [costResult, bomResult] = await Promise.allSettled([
        requestJson(`${COST_API}?${costQuery.toString()}`, "DELETE"),
        requestJson(`${BOM_API}?${bomQuery.toString()}`, "DELETE"),
      ]);

      const failures: string[] = [];
      if (costResult.status === "rejected") {
        failures.push(`Project/Cost Analysis: ${costResult.reason instanceof Error ? costResult.reason.message : "gagal"}`);
      }
      if (bomResult.status === "rejected") {
        failures.push(`BOM/QO: ${bomResult.reason instanceof Error ? bomResult.reason.message : "gagal"}`);
      }

      if (failures.length) {
        await loadWorkspace();
        notifyWorkspace(
          "error",
          `Penghapusan belum lengkap. ${failures.join(" · ")}. Periksa data sebelum mencoba lagi.`,
        );
        return;
      }

      setProjects((current) =>
        current.filter((project) => normalize(project.project_name) !== normalize(projectName)),
      );
      setBomRows((current) =>
        current.filter((row) => normalize(row.project_name) !== normalize(projectName)),
      );
      setDeleteTarget(null);
      setDeleteConfirm("");
      notifyWorkspace(
        "ok",
        `Project “${projectName}” beserta Cost Analysis, data QO, dan seluruh BOM berhasil dihapus.`,
      );
      await loadWorkspace();
    } catch (deleteError) {
      notifyWorkspace(
        "error",
        deleteError instanceof Error ? deleteError.message : "Gagal menghapus project dan data terkait",
      );
    } finally {
      setDeletingProject(false);
    }
  };

  const selectedStatusClass =
    selectedProject && isDroppedProject(selectedProject)
      ? "bg-slate-200 text-slate-700 ring-slate-300"
      : selectedProject?.status === "Completed"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : selectedProject?.status === "Delayed"
        ? "bg-rose-50 text-rose-700 ring-rose-200"
          : selectedProject?.status === "On Hold"
          ? "bg-amber-50 text-amber-700 ring-amber-200"
          : "bg-blue-50 text-blue-700 ring-blue-200";

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-900">
      <div className="flex min-h-screen">
        <ProjectSidebar
          projects={projects}
          selectedId={selectedId}
          onSelect={setSelectedId}
          loading={loading}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((current) => !current)}
          showCompleted={showCompleted}
          onToggleCompleted={() => setShowCompleted((current) => !current)}
          showDropped={showDropped}
          onToggleDropped={() => setShowDropped((current) => !current)}
        />

        <main className="min-w-0 flex-1">
          {/* Satu-satunya information header. Ringkasan lama digabung di sini agar tidak double header. */}
          <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur-md md:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  onClick={() => setMobileProjectsOpen(true)}
                  className="rounded-lg border border-slate-200 p-2 text-slate-500 lg:hidden"
                  aria-label="Buka daftar project"
                >
                  <PanelLeftOpen className="h-5 w-5" />
                </button>
                <span className="hidden rounded-xl bg-blue-600 p-2.5 text-white shadow-lg shadow-blue-200 sm:block">
                  <FolderKanban className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-600">
                    Integrated project control
                  </p>
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h1 className="truncate text-lg font-black text-slate-900 md:text-xl">
                      {selectedProject?.project_name || "Project Workspace"}
                    </h1>
                    {selectedProject && (
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ${selectedStatusClass}`}>
                        {isDroppedProject(selectedProject) ? "Drop" : selectedProject.status}
                      </span>
                    )}
                    {selectedProject?.synthetic && (
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700 ring-1 ring-amber-200">
                        BOM ONLY
                      </span>
                    )}
                  </div>
                  {selectedProject && (
                    <p className="truncate text-xs text-slate-500">{selectedProject.client_company}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                {selectedProject && (
                  <>
                    <button
                      onClick={toggleProjectDrop}
                      disabled={statusActionBusy || selectedProject.synthetic}
                      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        isDroppedProject(selectedProject)
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : "border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
                      }`}
                      title={
                        selectedProject.synthetic
                          ? "Project BOM-only harus disinkronkan ke Project Management sebelum bisa di-drop"
                          : isDroppedProject(selectedProject)
                            ? "Undrop dan aktifkan project kembali"
                            : "Drop project tanpa menghapus data"
                      }
                    >
                      {statusActionBusy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isDroppedProject(selectedProject) ? (
                        <ArchiveRestore className="h-4 w-4" />
                      ) : (
                        <Archive className="h-4 w-4" />
                      )}
                      {isDroppedProject(selectedProject) ? "Undrop" : "Drop"}
                    </button>
                    <button
                      onClick={openDeleteProject}
                      className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700 transition hover:bg-rose-100"
                      title="Hapus permanen project dan seluruh data terkait"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </>
                )}
                <button onClick={loadWorkspace} className={buttonClass} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  Refresh All
                </button>
              </div>
            </div>

            {selectedProject && (
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 sm:grid-cols-4">
                <div className="min-w-0 rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
                  <p className="text-[9px] font-bold uppercase text-slate-400">Current stage</p>
                  <p className="mt-0.5 truncate text-xs font-extrabold text-blue-700">
                    {stageMeta(selectedProject.current_stage).label}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
                  <p className="text-[9px] font-bold uppercase text-slate-400">Documents</p>
                  <p className="mt-0.5 text-xs font-extrabold text-slate-800">{selectedDocuments.length} BOM group</p>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
                  <p className="text-[9px] font-bold uppercase text-slate-400">Start date</p>
                  <p className="mt-0.5 text-xs font-extrabold text-slate-800">{formatDate(selectedProject.start_date)}</p>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
                  <p className="text-[9px] font-bold uppercase text-slate-400">Target finish</p>
                  <p className="mt-0.5 text-xs font-extrabold text-slate-800">{formatDate(selectedProject.target_completion_date)}</p>
                </div>
              </div>
            )}
          </header>

          {error && (
            <div className="m-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 md:m-6">
              {error}
            </div>
          )}
          {workspaceMessage && (
            <div
              className={`m-4 rounded-xl border p-4 text-sm font-semibold md:m-6 ${
                workspaceMessage.type === "ok"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              {workspaceMessage.text}
            </div>
          )}

          <div className="space-y-5 p-4 md:p-6">
            {loading && !selectedProject ? (
              <div className="flex min-h-[60vh] items-center justify-center gap-3 text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                Memuat project, BOM, document, cost, dan timeline...
              </div>
            ) : !selectedProject ? (
              <EmptyState
                icon={FolderKanban}
                title="Belum ada project aktif"
                text="Project Completed dan Dropped disembunyikan secara default. Gunakan tombol filter di sidebar untuk menampilkannya kembali."
              />
            ) : (
              <>
                <DocumentWorkspace groups={selectedDocuments} projectName={selectedProject.project_name} />
                <CostAnalysisWorkspace project={selectedProject} />
                <ProjectManagementWorkspace project={selectedProject} onProjectUpdated={updateProject} />
              </>
            )}
          </div>
        </main>
      </div>

      {mobileProjectsOpen && (
        <div className="fixed inset-0 z-[90] bg-slate-950/50 lg:hidden" onClick={() => setMobileProjectsOpen(false)}>
          <div
            className="h-full w-[88%] max-w-sm bg-white shadow-2xl"
            onClick={(event: ReactMouseEvent<HTMLDivElement>) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-blue-600">Projects</p>
                <h2 className="font-extrabold text-slate-900">Select project</h2>
              </div>
              <button onClick={() => setMobileProjectsOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 border-b border-slate-200 p-3">
              <button
                onClick={() => setShowCompleted((current) => !current)}
                className={`rounded-lg border px-2 py-2 text-xs font-bold ${showCompleted ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500"}`}
              >
                {showCompleted ? "Hide" : "Show"} Completed
              </button>
              <button
                onClick={() => setShowDropped((current) => !current)}
                className={`rounded-lg border px-2 py-2 text-xs font-bold ${showDropped ? "border-slate-300 bg-slate-100 text-slate-700" : "border-slate-200 text-slate-500"}`}
              >
                {showDropped ? "Hide" : "Show"} Dropped
              </button>
            </div>
            <div className="h-[calc(100vh-134px)] overflow-y-auto p-3">
              {visibleProjects.map((project) => {
                const dropped = isDroppedProject(project);
                return (
                  <button
                    key={project.id}
                    onClick={() => {
                      setSelectedId(project.id);
                      setMobileProjectsOpen(false);
                    }}
                    className={`mb-2 w-full rounded-xl border p-3 text-left ${
                      dropped
                        ? project.id === selectedId
                          ? "border-slate-400 bg-slate-200"
                          : "border-slate-200 bg-slate-100 opacity-80"
                        : project.id === selectedId
                          ? "border-blue-300 bg-blue-50"
                          : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className={`font-bold ${dropped ? "text-slate-500 line-through" : "text-slate-900"}`}>
                        {project.project_name}
                      </p>
                      {dropped && <span className="rounded bg-slate-600 px-1.5 py-0.5 text-[9px] font-bold text-white">DROP</span>}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{project.client_company}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onClick={closeDeleteProject}>
          <form
            onSubmit={deleteProjectCascade}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-rose-100 bg-rose-50 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="rounded-xl bg-rose-100 p-2.5 text-rose-700">
                  <Trash2 className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-rose-600">Permanent delete</p>
                  <h3 className="font-black text-slate-900">Hapus project dan seluruh data terkait</h3>
                </div>
              </div>
              <button type="button" onClick={closeDeleteProject} disabled={deletingProject} className="rounded-lg p-2 text-slate-400 hover:bg-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-5 text-sm text-slate-700">
              <p>
                Project <b className="text-slate-950">{deleteTarget.project_name}</b> akan dihapus permanen.
                Tindakan ini tidak sama dengan Drop dan tidak dapat di-undrop.
              </p>
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                <p className="font-bold text-rose-800">Data yang ikut dihapus:</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-rose-700">
                  <li>Project Management, stage, notes, dan timeline history</li>
                  <li>Seluruh entry Cost Analysis: allocation, income, dan expense</li>
                  <li>Seluruh row BOM untuk project ini</li>
                  <li>Data QO/PO, BAST, Invoice, dan metadata dokumen yang tersimpan pada BOM</li>
                </ul>
              </div>
              <label className="block text-xs font-bold text-slate-600">
                Ketik <span className="text-rose-700">{deleteTarget.project_name}</span> untuk konfirmasi
                <input
                  autoFocus
                  value={deleteConfirm}
                  onChange={(event) => setDeleteConfirm(event.target.value)}
                  placeholder={deleteTarget.project_name}
                  className={`${inputClass} mt-1.5`}
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4">
              <button type="button" onClick={closeDeleteProject} disabled={deletingProject} className={buttonClass}>
                Batal
              </button>
              <button
                type="submit"
                disabled={deletingProject || deleteConfirm.trim() !== deleteTarget.project_name.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deletingProject ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Hapus Semua Data
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
