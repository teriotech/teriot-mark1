"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  ChevronRight, Plus, Edit2, Trash2, X, Link as LinkIcon, FileText, ImageIcon,
  AlertCircle, CheckCircle2, Clock, AlertTriangle, Search, Filter, ChevronDown,
  ExternalLink, Calendar, Building2, Loader, ArrowRightCircle, Flag, XCircle,
  Layout, Type, Table as TableIcon, GitMerge
} from "lucide-react";

// ============================================================================
// Type Definitions
// ============================================================================

type ProjectStage =
  | "opportunity_crm" | "presales" | "inspection" | "bom_design" | "quotation_po"
  | "project_planning" | "project_running" | "commissioning" | "invoicing" | "payment";

type ProjectStatus = "In Progress" | "Completed" | "On Hold" | "Delayed";
type StageStatus = "Pending" | "In Progress" | "Completed" | "Issue";

interface StageHistoryEntry {
  entered_at?: string | null;
  completed_at?: string | null;
  plan_start_date?: string | null;
  plan_end_date?: string | null;
}

interface ProjectStageHistory {
  [key: string]: StageHistoryEntry;
}

type FinalCategory = "none" | "completed_green" | "closed_red";

interface ProjectStageNotes {
  [key: string]: {
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
}

interface ProjectManagementRecord {
  id: string;
  project_name: string;
  client_company: string;
  current_stage: ProjectStage;
  status: ProjectStatus;
  stage_notes: ProjectStageNotes;
  stage_history: ProjectStageHistory;
  final_category: FinalCategory;
  start_date: string | null;
  target_completion_date: string | null;
  created_at: string;
  updated_at: string;
}

interface StageUpdateData {
  notes: string;
  stage_status: StageStatus;
  plan_start_date?: string;
  plan_end_date?: string;
}

// ============================================================================
// Constants
// ============================================================================

const PROJECT_STAGES: { id: ProjectStage; label: string; icon: React.ComponentType<any>; description: string; }[] = [
  { id: "opportunity_crm", label: "Opportunity", icon: AlertCircle, description: "Initial opportunity identified in CRM" },
  { id: "presales", label: "Pre-Sales", icon: CheckCircle2, description: "Pre-sales activities and presentations" },
  { id: "inspection", label: "Inspection", icon: Search, description: "Company visit and site assessment" },
  { id: "bom_design", label: "BOM & Design", icon: FileText, description: "Bill of Materials and design phase" },
  { id: "quotation_po", label: "Quotation & PO", icon: FileText, description: "Quotation and Purchase Order phase" },
  { id: "project_planning", label: "Planning", icon: Clock, description: "Timeline, materials, and manpower planning" },
  { id: "project_running", label: "Running", icon: AlertTriangle, description: "Hardware and software installation" },
  { id: "commissioning", label: "Commissioning", icon: CheckCircle2, description: "FAT and SAT testing" },
  { id: "invoicing", label: "Invoicing", icon: FileText, description: "Invoice, BAST, and Tax Invoice" },
  { id: "payment", label: "Payment", icon: CheckCircle2, description: "Payment processing and completion" },
];

// ============================================================================
// Helpers
// ============================================================================

function getStartOfDayTime(dateValue: string | number | Date | null | undefined): number | null {
  if (!dateValue) return null;
  const d = new Date(dateValue);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// ============================================================================
// UI Components
// ============================================================================

const StatusBadge: React.FC<{ status: ProjectStatus }> = ({ status }) => {
  const config = {
    "In Progress": { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200", icon: Clock },
    Completed: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", icon: CheckCircle2 },
    "On Hold": { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", icon: AlertTriangle },
    Delayed: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", icon: AlertCircle },
  }[status];
  const Icon = config.icon;
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium ${config.bg} ${config.text} ${config.border}`}>
      <Icon size={14} /><span>{status}</span>
    </div>
  );
};

const StageStatusBadge: React.FC<{ status: StageStatus }> = ({ status }) => {
  const config = {
    "Pending": { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-200", icon: Clock },
    "In Progress": { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200", icon: Loader },
    "Completed": { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", icon: CheckCircle2 },
    "Issue": { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", icon: AlertTriangle },
  }[status || "Pending"];
  const Icon = config.icon;
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-xs font-bold ${config.bg} ${config.text} ${config.border}`}>
      <Icon size={12} className={status === "In Progress" ? "animate-spin" : ""} />
      <span>{status || "Pending"}</span>
    </div>
  );
};

// ============================================================================
// Project Timeline Chart (Gantt Style)
// ============================================================================
const ProjectTimelineChart: React.FC<{ project: ProjectManagementRecord; onEditStage: (stage: ProjectStage) => void }> = ({ project, onEditStage }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const stageHistory = project.stage_history || {};
  
  const todayTime = getStartOfDayTime(new Date())!;

  let minTime = todayTime - 15 * 86400000;
  let maxTime = todayTime + 15 * 86400000;

  const stagesWithDates = PROJECT_STAGES.map((stage) => {
    const entry = stageHistory[stage.id];
    const status = project.stage_notes[stage.id]?.stage_status || "Pending";
    
    if (entry?.plan_start_date) minTime = Math.min(minTime, getStartOfDayTime(entry.plan_start_date)!);
    if (entry?.plan_end_date) maxTime = Math.max(maxTime, getStartOfDayTime(entry.plan_end_date)!);
    if (entry?.entered_at) minTime = Math.min(minTime, getStartOfDayTime(entry.entered_at)!);
    if (entry?.completed_at) maxTime = Math.max(maxTime, getStartOfDayTime(entry.completed_at)!);
    
    return { ...stage, entry, status };
  });

  minTime -= 2 * 86400000;
  maxTime += 2 * 86400000;

  const totalDays = Math.ceil((maxTime - minTime) / 86400000);
  const DAY_WIDTH = 60; 
  const containerWidth = totalDays * DAY_WIDTH;

  useEffect(() => {
    if (scrollRef.current) {
      const todayOffset = ((todayTime - minTime) / 86400000) * DAY_WIDTH;
      scrollRef.current.scrollLeft = todayOffset - scrollRef.current.clientWidth / 2;
    }
  }, [minTime, todayTime]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 px-6 pt-6 pb-6 shadow-sm">
      <div ref={scrollRef} className="overflow-x-auto custom-scrollbar pb-4 relative">
        <div style={{ width: containerWidth, minWidth: '100%' }} className="relative">
          
          {/* Top Axis (Dates) */}
          <div className="flex border-b border-slate-200 mb-4 relative h-8">
            {Array.from({ length: totalDays }).map((_, i) => {
              const d = new Date(minTime + i * 86400000);
              const isToday = d.getTime() === todayTime;
              return (
                <div key={i} className="absolute top-0 bottom-0 border-l border-slate-100 text-[11px] font-medium text-slate-500 pl-1.5 pt-1" style={{ left: i * DAY_WIDTH, width: DAY_WIDTH }}>
                  <span className={isToday ? "text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded-md border border-red-100" : ""}>
                    {d.getDate()} {d.toLocaleString('default', { month: 'short' })}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Today Vertical Line */}
          <div 
            className="absolute top-8 bottom-0 w-[2px] bg-red-400/70 z-10 pointer-events-none" 
            style={{ left: ((todayTime - minTime) / 86400000) * DAY_WIDTH + (DAY_WIDTH / 2) }}
          />

          {/* Stages Rows */}
          <div className="space-y-4">
            {stagesWithDates.map((s) => {
              const planStart = getStartOfDayTime(s.entry?.plan_start_date);
              const planEnd = getStartOfDayTime(s.entry?.plan_end_date);
              const actualStart = getStartOfDayTime(s.entry?.entered_at);
              
              // Logika Actual End Date: Hanya diisi jika status Completed. Jika belum, gunakan hari ini (todayTime)
              const isCompleted = s.status === "Completed";
              const actualEnd = isCompleted ? getStartOfDayTime(s.entry?.completed_at) : (actualStart ? todayTime : null);

              // Menentukan warna bar berdasarkan Stage Status
              let actualBarColor = 'bg-gradient-to-r from-slate-400 to-slate-500 border-slate-600';
              if (s.status === 'Completed') actualBarColor = 'bg-gradient-to-r from-emerald-400 to-emerald-500 border-emerald-600';
              else if (s.status === 'In Progress') actualBarColor = 'bg-gradient-to-r from-indigo-400 to-indigo-500 border-indigo-600';
              else if (s.status === 'Issue') actualBarColor = 'bg-gradient-to-r from-red-400 to-red-500 border-red-600';

              return (
                <div key={s.id} className="relative h-12 flex items-center group border-b border-slate-50 pb-2">
                  {/* Sticky Label */}
                  <div className="sticky left-0 z-20 w-40 bg-white/95 backdrop-blur-md flex-shrink-0 text-xs font-bold text-slate-700 truncate pr-4 flex items-center gap-2 py-1.5 border-r border-slate-100 shadow-[4px_0_12px_rgba(0,0,0,0.02)]">
                    <s.icon size={14} className="text-indigo-500"/> {s.label}
                  </div>
                  
                  {/* Plan Bar */}
                  {planStart && planEnd && (
                    <div 
                      onClick={() => onEditStage(s.id)}
                      className="absolute top-1.5 h-3 bg-gradient-to-r from-amber-300 to-yellow-400 rounded-sm border border-amber-500 cursor-pointer hover:brightness-110 transition-all shadow-sm z-10"
                      style={{ 
                        left: ((planStart - minTime) / 86400000) * DAY_WIDTH, 
                        width: Math.max((((planEnd - planStart) / 86400000) + 1) * DAY_WIDTH, DAY_WIDTH) 
                      }}
                      title={`Click to edit Plan: ${new Date(planStart).toLocaleDateString()} - ${new Date(planEnd).toLocaleDateString()}`}
                    />
                  )}

                  {/* Actual Bar */}
                  {actualStart && actualEnd && (
                    <div 
                      className={`absolute bottom-1.5 h-4 rounded-md shadow-md border z-10 ${actualBarColor}`}
                      style={{ 
                        left: ((actualStart - minTime) / 86400000) * DAY_WIDTH, 
                        width: Math.max((((actualEnd - actualStart) / 86400000) + 1) * DAY_WIDTH, DAY_WIDTH) 
                      }}
                      title={`Actual: ${new Date(actualStart).toLocaleDateString()} - ${isCompleted ? new Date(actualEnd).toLocaleDateString() : 'In Progress'}`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-6 mt-4 text-xs font-bold text-slate-600 justify-center bg-slate-50 py-2.5 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2"><div className="w-4 h-3 bg-gradient-to-r from-amber-300 to-yellow-400 border border-amber-500 rounded-sm shadow-sm"></div> Plan Timeline</div>
        <div className="flex items-center gap-2"><div className="w-4 h-3 bg-gradient-to-r from-indigo-400 to-indigo-500 border border-indigo-600 rounded-sm shadow-sm"></div> Actual (In Progress)</div>
        <div className="flex items-center gap-2"><div className="w-4 h-3 bg-gradient-to-r from-emerald-400 to-emerald-500 border border-emerald-600 rounded-sm shadow-sm"></div> Actual (Completed)</div>
        <div className="flex items-center gap-2"><div className="w-4 h-3 bg-gradient-to-r from-red-400 to-red-500 border border-red-600 rounded-sm shadow-sm"></div> Actual (Issue)</div>
      </div>
    </div>
  );
};

// ============================================================================
// Horizontal Stage Details Card
// ============================================================================
const StageDetailsCard: React.FC<{
  stage: ProjectStage;
  stageData: ProjectStageNotes[ProjectStage] | undefined;
  historyEntry: StageHistoryEntry | undefined;
  onEdit: () => void;
}> = ({ stage, stageData, historyEntry, onEdit }) => {
  const stageInfo = PROJECT_STAGES.find((s) => s.id === stage);
  if (!stageInfo) return null;

  return (
    <div className="min-w-[320px] max-w-[320px] flex-shrink-0 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow snap-start flex flex-col h-[420px]">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <stageInfo.icon size={18} className="text-indigo-600" />
          <p className="font-bold text-slate-900 text-sm">{stageInfo.label}</p>
        </div>
        {/* Menggunakan StageStatusBadge di Header */}
        <StageStatusBadge status={stageData?.stage_status || "Pending"} />
      </div>

      <div className="p-4 flex-1 overflow-y-auto space-y-4 text-sm">
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-2">
          <div className="flex justify-between"><span className="text-slate-500 font-medium">Plan Start:</span> <span className="font-semibold text-slate-700">{historyEntry?.plan_start_date ? new Date(historyEntry.plan_start_date).toLocaleDateString() : '-'}</span></div>
          <div className="flex justify-between"><span className="text-slate-500 font-medium">Plan End:</span> <span className="font-semibold text-slate-700">{historyEntry?.plan_end_date ? new Date(historyEntry.plan_end_date).toLocaleDateString() : '-'}</span></div>
          <div className="flex justify-between pt-2 border-t border-slate-200 mt-2"><span className="text-slate-500 font-medium">Actual Start:</span> <span className="font-bold text-indigo-600">{historyEntry?.entered_at ? new Date(historyEntry.entered_at).toLocaleDateString() : '-'}</span></div>
          <div className="flex justify-between"><span className="text-slate-500 font-medium">Actual End:</span> <span className="font-bold text-emerald-600">{historyEntry?.completed_at ? new Date(historyEntry.completed_at).toLocaleDateString() : '-'}</span></div>
        </div>

        <div>
          <p className="font-bold text-slate-800 mb-2 text-xs uppercase tracking-wider">Notes</p>
          {stageData?.notes ? (
            <p className="text-slate-700 whitespace-pre-wrap bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 text-xs leading-relaxed mb-2">{stageData.notes}</p>
          ) : (
            <p className="text-slate-400 italic text-xs">No notes available</p>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <button onClick={onEdit} className="w-full py-2.5 bg-white border border-slate-300 text-slate-800 rounded-lg hover:bg-slate-100 hover:border-slate-400 transition-all font-bold text-xs flex items-center justify-center gap-2 shadow-sm">
          <Edit2 size={14} /> Update Stage Data
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// Stage Update Modal (Pop Up)
// ============================================================================
const StageUpdateModal: React.FC<{
  isOpen: boolean; stage: ProjectStage | null; projectId: string; currentData: StageUpdateData;
  onClose: () => void; onSave: (data: StageUpdateData) => Promise<void>; isSaving: boolean;
}> = ({ isOpen, stage, projectId, currentData, onClose, onSave, isSaving }) => {
  const [formData, setFormData] = useState<StageUpdateData>(currentData);

  useEffect(() => { 
    if (isOpen) {
      setFormData(currentData); 
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen || !stage) return null;
  const stageLabel = PROJECT_STAGES.find((s) => s.id === stage)?.label || stage;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Edit2 size={20} className="text-indigo-600"/> Edit {stageLabel}
          </h3>
          <button onClick={onClose} disabled={isSaving} className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-1.5 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <div className="px-6 py-6 overflow-y-auto flex-1 space-y-6 bg-white">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm">
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1.5 uppercase tracking-wide">Stage Status</label>
              <select 
                value={formData.stage_status || "Pending"} 
                onChange={(e) => setFormData(p => ({ ...p, stage_status: e.target.value as StageStatus }))} 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                disabled={isSaving}
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Issue">Issue / Blocked</option>
              </select>
              <p className="text-[10px] text-slate-500 mt-1">Set to Completed to advance stage.</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1.5 uppercase tracking-wide">Plan Start Date</label>
              <input type="date" value={formData.plan_start_date?.split('T')[0] || ''} onChange={(e) => setFormData(p => ({ ...p, plan_start_date: e.target.value ? new Date(e.target.value).toISOString() : undefined }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none bg-white" disabled={isSaving} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1.5 uppercase tracking-wide">Plan End Date</label>
              <input type="date" value={formData.plan_end_date?.split('T')[0] || ''} onChange={(e) => setFormData(p => ({ ...p, plan_end_date: e.target.value ? new Date(e.target.value).toISOString() : undefined }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none bg-white" disabled={isSaving} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-900 mb-2 uppercase tracking-wide">General Notes</label>
            <textarea 
              value={formData.notes} 
              onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))} 
              placeholder="Type general notes here..." 
              className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50" 
              rows={12} 
              disabled={isSaving} 
            />
          </div>
        </div>

        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-3 z-10">
          <button onClick={onClose} disabled={isSaving} className="px-5 py-2.5 border border-slate-300 rounded-lg hover:bg-white text-slate-700 text-sm font-bold transition-colors bg-transparent">Cancel</button>
          <button onClick={() => onSave(formData)} disabled={isSaving} className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-bold flex items-center gap-2 shadow-md transition-colors">
            {isSaving ? <Loader size={16} className="animate-spin"/> : <CheckCircle2 size={16}/>}
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// New Project Modal (Pop Up)
// ============================================================================
const NewProjectModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (projectName: string, clientCompany: string) => void;
  isSaving: boolean;
}> = ({ isOpen, onClose, onSubmit, isSaving }) => {
  const [projectName, setProjectName] = useState("");
  const [clientCompany, setClientCompany] = useState("");

  useEffect(() => {
    if (isOpen) {
      setProjectName("");
      setClientCompany("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden">
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <Plus size={20} className="text-indigo-600"/> Create New Project
          </h3>
          <button onClick={onClose} disabled={isSaving} className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-1.5 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-5 bg-white">
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1.5 uppercase tracking-wide">Project Name</label>
            <input 
              type="text" 
              value={projectName} 
              onChange={(e) => setProjectName(e.target.value)} 
              placeholder="e.g. Smart Factory Implementation" 
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50" 
              disabled={isSaving} 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1.5 uppercase tracking-wide">Client Company</label>
            <input 
              type="text" 
              value={clientCompany} 
              onChange={(e) => setClientCompany(e.target.value)} 
              placeholder="e.g. LG Electronics" 
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50" 
              disabled={isSaving} 
            />
          </div>
        </div>

        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
          <button onClick={onClose} disabled={isSaving} className="px-5 py-2.5 border border-slate-300 rounded-lg hover:bg-white text-slate-700 text-sm font-bold transition-colors bg-transparent">Cancel</button>
          <button 
            onClick={() => onSubmit(projectName, clientCompany)} 
            disabled={isSaving || !projectName.trim() || !clientCompany.trim()} 
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-bold flex items-center gap-2 shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? <Loader size={16} className="animate-spin"/> : <CheckCircle2 size={16}/>}
            {isSaving ? "Creating..." : "Create Project"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Main Page Component
// ============================================================================
export default function ProjectManagementPage() {
  const [projects, setProjects] = useState<ProjectManagementRecord[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [editingStage, setEditingStage] = useState<ProjectStage | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "All">("All");

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/management/project");
      if (res.ok) setProjects(await res.json());
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  };

  const selectedProject = useMemo(() => projects.find((p) => p.id === selectedProjectId), [projects, selectedProjectId]);

  const getStageData = (projectId: string, stage: ProjectStage): StageUpdateData => {
    const project = projects.find((p) => p.id === projectId);
    const stageData = project?.stage_notes[stage] || {};
    const historyData = project?.stage_history[stage] || {};
    return {
      notes: stageData.notes || "", 
      stage_status: stageData.stage_status || "Pending",
      plan_start_date: historyData.plan_start_date || undefined, 
      plan_end_date: historyData.plan_end_date || undefined
    };
  };

  const handleSaveStageUpdate = async (data: StageUpdateData) => {
    if (!selectedProjectId || !editingStage) return;
    setIsSaving(true);
    try {
      const project = projects.find((p) => p.id === selectedProjectId);
      if (!project) throw new Error("Project not found");

      const stageNotes = { ...project.stage_notes };
      stageNotes[editingStage] = { 
        ...stageNotes[editingStage], 
        notes: data.notes,
        stage_status: data.stage_status
      };

      const stageHistory = { ...project.stage_history };
      let newCurrentStage = project.current_stage;

      if (!stageHistory[editingStage]) stageHistory[editingStage] = {};
      if (data.plan_start_date) stageHistory[editingStage].plan_start_date = data.plan_start_date;
      if (data.plan_end_date) stageHistory[editingStage].plan_end_date = data.plan_end_date;

      if (data.stage_status === "Completed") {
        if (!stageHistory[editingStage].completed_at) {
          stageHistory[editingStage].completed_at = new Date().toISOString();
        }
        if (newCurrentStage === editingStage) {
          const currentIndex = PROJECT_STAGES.findIndex(s => s.id === editingStage);
          const nextStage = PROJECT_STAGES[currentIndex + 1];
          if (nextStage) {
            newCurrentStage = nextStage.id;
            if (!stageHistory[newCurrentStage]) stageHistory[newCurrentStage] = {};
            if (!stageHistory[newCurrentStage].entered_at) stageHistory[newCurrentStage].entered_at = new Date().toISOString();
          }
        }
      } else {
        // Jika status diubah dari Completed ke status lain, hapus completed_at
        stageHistory[editingStage].completed_at = null;
        newCurrentStage = editingStage; 
        if (!stageHistory[editingStage].entered_at) {
          stageHistory[editingStage].entered_at = new Date().toISOString();
        }
      }

      const res = await fetch("/api/management/project", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id: selectedProjectId, 
          stage_notes: stageNotes, 
          stage_history: stageHistory,
          current_stage: newCurrentStage 
        }),
      });
      
      if (res.ok) {
        const updated = await res.json();
        setProjects(prev => prev.map(p => p.id === selectedProjectId ? updated : p));
        setIsModalOpen(false);
      }
    } catch (err) { console.error(err); } finally { setIsSaving(false); }
  };

  const handleCreateProject = async (projectName: string, clientCompany: string) => {
    setIsCreating(true);
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 3);

    const initialStageHistory = {
      opportunity_crm: {
        plan_start_date: today.toISOString(),
        plan_end_date: endDate.toISOString(),
        entered_at: today.toISOString(),
      }
    };

    try {
      const res = await fetch("/api/management/project", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          project_name: projectName, 
          client_company: clientCompany,
          stage_history: initialStageHistory,
          current_stage: "opportunity_crm"
        }),
      });
      if (res.ok) {
        const newProject = await res.json();
        setProjects(prev => [newProject, ...prev]);
        setSelectedProjectId(newProject.id);
        setIsNewProjectModalOpen(false);
      }
    } catch (err) { console.error(err); } finally { setIsCreating(false); }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project? This action cannot be undone.")) return;
    try {
      const res = await fetch(`/api/management/project?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setProjects(prev => prev.filter(p => p.id !== id));
        if (selectedProjectId === id) setSelectedProjectId(null);
      }
    } catch (err) { console.error(err); }
  };

  const filteredProjects = useMemo(() => projects.filter(p => 
    (p.project_name.toLowerCase().includes(searchTerm.toLowerCase()) || p.client_company.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (statusFilter === "All" || p.status === statusFilter)
  ), [projects, searchTerm, statusFilter]);

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      <div className="bg-white border-b border-slate-200 px-8 py-5 flex justify-between items-center sticky top-0 z-40 shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Project Management</h1>
          <p className="text-slate-500 text-sm font-medium mt-0.5">Industrial IoT & Automation Dashboard</p>
        </div>
        <button onClick={() => setIsNewProjectModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-bold shadow-md transition-all hover:shadow-lg"><Plus size={18} /> New Project</button>
      </div>

      <div className="p-8 space-y-8 w-full">
        
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2"><Layout size={20} className="text-indigo-600"/> Active Projects</h2>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Search project or company..." 
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select 
                className="border border-slate-300 rounded-lg px-4 py-2 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                <option value="All">All Status</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="On Hold">On Hold</option>
                <option value="Delayed">Delayed</option>
              </select>
            </div>
          </div>

          <div className="max-h-[340px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Project Name</th>
                  <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Company</th>
                  <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Current Stage</th>
                  <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProjects.length > 0 ? filteredProjects.map(p => {
                  const stageInfo = PROJECT_STAGES.find(s => s.id === p.current_stage);
                  const isSelected = selectedProjectId === p.id;
                  return (
                    <tr 
                      key={p.id} 
                      onClick={() => setSelectedProjectId(p.id)}
                      className={`cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}
                    >
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">{p.project_name}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-600 flex items-center gap-1.5 font-medium"><Building2 size={14} className="text-slate-400"/> {p.client_company}</p>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {stageInfo && <stageInfo.icon size={14} className="text-indigo-500"/>}
                          <span className="text-sm font-semibold text-slate-700">{stageInfo?.label || p.current_stage}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteProject(p.id); }} 
                          className="p-2 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                          title="Delete Project"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-medium">No projects found matching your criteria.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selectedProject && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2"><Calendar size={20} className="text-indigo-600"/> Project Timeline</h3>
              </div>
              <ProjectTimelineChart 
                project={selectedProject} 
                onEditStage={(stageId) => { setEditingStage(stageId); setIsModalOpen(true); }} 
              />
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-slate-900 mb-4 flex items-center gap-2">
                <Layout size={20} className="text-indigo-600"/> 
                Stage Details 
                <span className="text-slate-300 font-medium mx-2">|</span> 
                <span className="text-indigo-600">{selectedProject.project_name}</span>
              </h3>
              <div className="flex overflow-x-auto gap-6 pb-6 snap-x snap-mandatory custom-scrollbar">
                {PROJECT_STAGES.map((stage) => {
                  const stageData = selectedProject.stage_notes[stage.id];
                  const historyEntry = selectedProject.stage_history[stage.id];

                  return (
                    <StageDetailsCard
                      key={stage.id} stage={stage.id} stageData={stageData} historyEntry={historyEntry}
                      onEdit={() => { setEditingStage(stage.id); setIsModalOpen(true); }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedProject && editingStage && (
        <StageUpdateModal
          isOpen={isModalOpen} stage={editingStage} projectId={selectedProject.id}
          currentData={getStageData(selectedProject.id, editingStage)}
          onClose={() => setIsModalOpen(false)} onSave={handleSaveStageUpdate} isSaving={isSaving}
        />
      )}

      <NewProjectModal 
        isOpen={isNewProjectModalOpen} 
        onClose={() => setIsNewProjectModalOpen(false)} 
        onSubmit={handleCreateProject} 
        isSaving={isCreating} 
      />
    </div>
  );
}