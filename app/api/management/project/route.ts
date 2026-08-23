import { createServerSupabaseClient } from "@/app/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// ============================================================================
// Type Definitions
// ============================================================================

interface ProjectStageNotes {
  [key: string]: {
    notes?: string;
    contact_person?: string;
    presentation_url?: string;
    images?: string[];
    documents?: string[];
    links?: string[];
    [key: string]: unknown;
  };
}

interface StageHistoryEntry {
  entered_at?: string | null; 
  completed_at?: string | null; 
  plan_start_date?: string | null; // NEW: Plan Start
  plan_end_date?: string | null;   // NEW: Plan End
}

interface ProjectStageHistory {
  [key: string]: StageHistoryEntry;
}

type FinalCategory = "none" | "completed_green" | "closed_red";

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

const STAGE_ORDER: ProjectStage[] = [
  "opportunity_crm",
  "presales",
  "inspection",
  "bom_design",
  "quotation_po",
  "project_planning",
  "project_running",
  "commissioning",
  "invoicing",
  "payment",
];

// Standard duration in days for each stage
const STAGE_DURATIONS: Record<ProjectStage, number> = {
  opportunity_crm: 5,
  presales: 2,
  inspection: 7,
  bom_design: 4,
  quotation_po: 2,
  project_planning: 4,
  project_running: 10,
  commissioning: 4,
  invoicing: 5,
  payment: 30,
};

interface ProjectManagementRecord {
  id: string;
  project_name: string;
  client_company: string;
  current_stage: ProjectStage;
  status: "In Progress" | "Completed" | "On Hold" | "Delayed";
  stage_notes: ProjectStageNotes;
  stage_history: ProjectStageHistory;
  final_category: FinalCategory;
  start_date: string | null;
  target_completion_date: string | null;
  created_at: string;
  updated_at: string;
}

interface CreateProjectPayload {
  project_name: string;
  client_company: string;
  start_date?: string;
  target_completion_date?: string;
  status?: "In Progress" | "Completed" | "On Hold" | "Delayed";
  stage_notes?: ProjectStageNotes;
}

interface UpdateProjectPayload {
  id: string;
  project_name?: string;
  client_company?: string;
  current_stage?: ProjectStage;
  status?: "In Progress" | "Completed" | "On Hold" | "Delayed";
  stage_notes?: ProjectStageNotes;
  stage_history?: ProjectStageHistory;
  final_category?: FinalCategory;
  start_date?: string;
  target_completion_date?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function validateProjectData(data: Partial<ProjectManagementRecord>): { valid: boolean; error?: string } {
  if (data.project_name && typeof data.project_name !== "string") return { valid: false, error: "project_name must be a string" };
  if (data.client_company && typeof data.client_company !== "string") return { valid: false, error: "client_company must be a string" };
  if (data.status && !["In Progress", "Completed", "On Hold", "Delayed"].includes(data.status)) return { valid: false, error: "Invalid status value" };
  if (data.current_stage && !STAGE_ORDER.includes(data.current_stage)) return { valid: false, error: "Invalid current_stage value" };
  if (data.final_category && !["none", "completed_green", "closed_red"].includes(data.final_category)) return { valid: false, error: "Invalid final_category value" };
  return { valid: true };
}

function withStageTransition(
  existingHistory: ProjectStageHistory,
  fromStage: ProjectStage | undefined,
  toStage: ProjectStage
): ProjectStageHistory {
  const nowIso = new Date().toISOString();
  const history: ProjectStageHistory = { ...existingHistory };

  if (fromStage && history[fromStage] && !history[fromStage].completed_at) {
    history[fromStage] = { ...history[fromStage], completed_at: nowIso };
  }

  if (!history[toStage]) {
    history[toStage] = { entered_at: nowIso };
  } else if (!history[toStage].entered_at) {
    history[toStage].entered_at = nowIso;
  }

  return history;
}

// ============================================================================
// Route Handlers
// ============================================================================

async function handleGET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.from("project_management").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json(data || [], { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: "Database Error", message: err.message, statusCode: 500 }, { status: 500 });
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const payload: CreateProjectPayload = await request.json();
    if (!payload.project_name || !payload.client_company) {
      return NextResponse.json({ error: "Validation Error", message: "project_name and client_company are required", statusCode: 400 }, { status: 400 });
    }

    const validation = validateProjectData(payload);
    if (!validation.valid) {
      return NextResponse.json({ error: "Validation Error", message: validation.error, statusCode: 400 }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const now = new Date();
    const initialStage: ProjectStage = "opportunity_crm";
    
    // Generate Plan Dates automatically
    const generatedStageHistory: ProjectStageHistory = {};
    let currentStartDate = new Date(now);

    STAGE_ORDER.forEach((stage, index) => {
      const duration = STAGE_DURATIONS[stage];
      const currentEndDate = new Date(currentStartDate);
      currentEndDate.setDate(currentEndDate.getDate() + duration);

      generatedStageHistory[stage] = {
        plan_start_date: currentStartDate.toISOString(),
        plan_end_date: currentEndDate.toISOString(),
        ...(index === 0 ? { entered_at: now.toISOString() } : {}) // Only first stage gets entered_at
      };

      currentStartDate = new Date(currentEndDate); // Next stage starts when current ends
    });

    const newProject = {
      project_name: payload.project_name,
      client_company: payload.client_company,
      start_date: payload.start_date || now.toISOString(),
      target_completion_date: payload.target_completion_date || currentStartDate.toISOString(),
      status: payload.status || "In Progress",
      stage_notes: payload.stage_notes || {},
      stage_history: generatedStageHistory,
      final_category: "none" as FinalCategory,
      current_stage: initialStage,
    };

    const { data, error } = await supabase.from("project_management").insert([newProject]).select().single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: "Server Error", message: err.message, statusCode: 500 }, { status: 500 });
  }
}

async function handlePATCH(request: NextRequest) {
  try {
    const payload: UpdateProjectPayload = await request.json();
    if (!payload.id) return NextResponse.json({ error: "Validation Error", message: "id is required", statusCode: 400 }, { status: 400 });

    const supabase = await createServerSupabaseClient();
    let existingRecord: ProjectManagementRecord | null = null;
    
    if (payload.current_stage !== undefined) {
      const { data: existing, error: fetchError } = await supabase.from("project_management").select("*").eq("id", payload.id).single();
      if (fetchError || !existing) return NextResponse.json({ error: "Not Found", message: "Project not found", statusCode: 404 }, { status: 404 });
      existingRecord = existing as ProjectManagementRecord;
    }

    const updateData: Record<string, unknown> = { ...payload };
    delete updateData.id;

    if (payload.current_stage !== undefined && existingRecord) {
      const baseHistory = payload.stage_history || existingRecord.stage_history || {};
      updateData.stage_history = withStageTransition(baseHistory, existingRecord.current_stage, payload.current_stage);
    }

    const { data, error } = await supabase.from("project_management").update(updateData).eq("id", payload.id).select().single();
    if (error) throw error;
    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: "Server Error", message: err.message, statusCode: 500 }, { status: 500 });
  }
}

async function handleDELETE(request: NextRequest) {
  try {
    let projectId = new URL(request.url).searchParams.get("id");
    if (!projectId) {
      const payload = await request.json().catch(() => ({}));
      projectId = payload.id;
    }
    if (!projectId) return NextResponse.json({ error: "Validation Error", message: "id is required", statusCode: 400 }, { status: 400 });

    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from("project_management").delete().eq("id", projectId);
    if (error) throw error;
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: "Server Error", message: err.message, statusCode: 500 }, { status: 500 });
  }
}

export async function GET(request: NextRequest) { return handleGET(request); }
export async function POST(request: NextRequest) { return handlePOST(request); }
export async function PATCH(request: NextRequest) { return handlePATCH(request); }
export async function PUT(request: NextRequest) { return handlePATCH(request); }
export async function DELETE(request: NextRequest) { return handleDELETE(request); }