import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  createClient as createServerSupabase,
  createServiceRoleClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { sha256Hex } from "@/lib/utils";
import type {
  AuditActorType,
  AuditLogRow,
  ExtractedMedicalDocument,
  FamilyMemberRow,
  FamilyRow,
  FamilyUserRow,
  MedicalDocumentRow,
  MedicalDocumentType,
  ShareTokenRow,
  SubscriptionTier,
  TimelineEventRow,
} from "@/types/database";

interface DemoStoreState {
  families: FamilyRow[];
  family_users: FamilyUserRow[];
  family_members: FamilyMemberRow[];
  medical_documents: MedicalDocumentRow[];
  timeline_events: TimelineEventRow[];
  share_tokens: ShareTokenRow[];
  audit_logs: AuditLogRow[];
  storage_files: Record<string, { mimeType: string; size: number; createdAt: string }>;
}

const DEMO_STORE_PATH = "/tmp/ayuvansha-demo-store-v1.json";
export const DEMO_USER_ID = "00000000-0000-4000-8000-000000000001";
export const DEMO_FAMILY_ID = "11111111-1111-4000-8000-111111111111";
export const DEMO_SAMPLE_QR_TOKEN = "ayuvansha-demo-rajesh-brief-2026";

function createInitialDemoSeed(): DemoStoreState {
  const now = new Date().toISOString();
  const thirtyMinsLater = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  const memberSelfId = "22222222-2222-4000-8000-000000000001";
  const memberFatherId = "22222222-2222-4000-8000-000000000002";
  const memberMotherId = "22222222-2222-4000-8000-000000000003";
  const memberPaternalGfId = "22222222-2222-4000-8000-000000000004";
  const memberMaternalGmId = "22222222-2222-4000-8000-000000000005";

  const docFatherRxId = "33333333-3333-4000-8000-000000000001";
  const docFatherLabId = "33333333-3333-4000-8000-000000000002";
  const docPendingHitlId = "33333333-3333-4000-8000-000000000003";

  return {
    families: [
      {
        id: DEMO_FAMILY_ID,
        name: "Sharma Multi-Gen Household",
        subscription_tier: "family_care",
        created_by: DEMO_USER_ID,
        created_at: now,
      },
    ],
    family_users: [
      {
        family_id: DEMO_FAMILY_ID,
        user_id: DEMO_USER_ID,
        role: "admin",
      },
    ],
    family_members: [
      {
        id: memberSelfId,
        family_id: DEMO_FAMILY_ID,
        full_name: "Aarav Sharma",
        relationship_label: "Self",
        dob: "1992-04-15",
        biological_sex: "male",
        blood_group: "O+",
        is_deceased: false,
        cause_of_death: null,
        mother_id: memberMotherId,
        father_id: memberFatherId,
        consent_verified: true,
        created_at: now,
      },
      {
        id: memberFatherId,
        family_id: DEMO_FAMILY_ID,
        full_name: "Rajesh Sharma",
        relationship_label: "Father",
        dob: "1959-08-22",
        biological_sex: "male",
        blood_group: "B+",
        is_deceased: false,
        cause_of_death: null,
        mother_id: null,
        father_id: memberPaternalGfId,
        consent_verified: true,
        created_at: now,
      },
      {
        id: memberMotherId,
        family_id: DEMO_FAMILY_ID,
        full_name: "Sunita Sharma",
        relationship_label: "Mother",
        dob: "1964-11-03",
        biological_sex: "female",
        blood_group: "O+",
        is_deceased: false,
        cause_of_death: null,
        mother_id: memberMaternalGmId,
        father_id: null,
        consent_verified: true,
        created_at: now,
      },
      {
        id: memberPaternalGfId,
        family_id: DEMO_FAMILY_ID,
        full_name: "Late Harihar Sharma",
        relationship_label: "Paternal Grandfather",
        dob: "1933-02-10",
        biological_sex: "male",
        blood_group: "B+",
        is_deceased: true,
        cause_of_death: "Acute Myocardial Infarction (Age 78)",
        mother_id: null,
        father_id: null,
        consent_verified: true,
        created_at: now,
      },
      {
        id: memberMaternalGmId,
        family_id: DEMO_FAMILY_ID,
        full_name: "Late Kamala Devi",
        relationship_label: "Maternal Grandmother",
        dob: "1938-07-19",
        biological_sex: "female",
        blood_group: "O+",
        is_deceased: true,
        cause_of_death: "Complications from Hypertension & Age",
        mother_id: null,
        father_id: null,
        consent_verified: true,
        created_at: now,
      },
    ],
    medical_documents: [
      {
        id: docFatherRxId,
        family_id: DEMO_FAMILY_ID,
        member_id: memberFatherId,
        storage_path: `${DEMO_FAMILY_ID}/${memberFatherId}/${docFatherRxId}.pdf`,
        doc_type: "prescription",
        doc_date: "2026-09-12",
        hospital_or_doctor: "Dr. V. N. Mehta — Fortis Escorts Heart Institute",
        ocr_status: "verified",
        raw_extraction: null,
        created_at: now,
      },
      {
        id: docFatherLabId,
        family_id: DEMO_FAMILY_ID,
        member_id: memberFatherId,
        storage_path: `${DEMO_FAMILY_ID}/${memberFatherId}/${docFatherLabId}.pdf`,
        doc_type: "lab_report",
        doc_date: "2026-10-28",
        hospital_or_doctor: "Dr. Lal PathLabs — Senior Metabolic Panel",
        ocr_status: "verified",
        raw_extraction: null,
        created_at: now,
      },
      {
        id: docPendingHitlId,
        family_id: DEMO_FAMILY_ID,
        member_id: memberFatherId,
        storage_path: `${DEMO_FAMILY_ID}/${memberFatherId}/${docPendingHitlId}.jpg`,
        doc_type: "prescription",
        doc_date: "2026-11-18",
        hospital_or_doctor: "Dr. R. K. Sharma — OPD Handwritten Follow-up",
        ocr_status: "needs_review",
        raw_extraction: {
          document_type: "prescription",
          document_date: "2026-11-18",
          doctor_or_hospital: "Dr. R. K. Sharma — OPD Handwritten Follow-up",
          events: [
            {
              event_type: "medication",
              title: "Empagliflozin (Jardiance)",
              dosage_or_value: "10mg once daily morning",
              is_active_medication: true,
              is_hereditary_condition: false,
              confidence: "high",
            },
            {
              event_type: "medication",
              title: "Rosuvastatin (Crestor Handwritten Note)",
              dosage_or_value: null,
              is_active_medication: true,
              is_hereditary_condition: false,
              confidence: "low",
            },
            {
              event_type: "lab_abnormal",
              title: "Post-Prandial Blood Glucose (PPBS)",
              dosage_or_value: "218 mg/dL (Marginally smudged decimal)",
              is_active_medication: false,
              is_hereditary_condition: true,
              confidence: "medium",
            },
          ],
        },
        created_at: now,
      },
    ],
    timeline_events: [
      // Father (Rajesh Sharma) verified clinical timeline
      {
        id: "44444444-4444-4000-8000-000000000001",
        family_id: DEMO_FAMILY_ID,
        member_id: memberFatherId,
        document_id: docFatherRxId,
        event_date: "2018-03-14",
        event_type: "diagnosis",
        title: "Type 2 Diabetes Mellitus",
        details: {
          notes: "Long-standing metabolic diabetes managed with oral hypoglycemics",
          confidence: "high",
        },
        is_hereditary_flag: true,
        verified_by_user: true,
        created_at: now,
      },
      {
        id: "44444444-4444-4000-8000-000000000002",
        family_id: DEMO_FAMILY_ID,
        member_id: memberFatherId,
        document_id: docFatherRxId,
        event_date: "2020-06-20",
        event_type: "diagnosis",
        title: "Essential Hypertension",
        details: {
          notes: "Baseline BP 154/96 prior to ARB therapy",
          confidence: "high",
        },
        is_hereditary_flag: true,
        verified_by_user: true,
        created_at: now,
      },
      {
        id: "44444444-4444-4000-8000-000000000003",
        family_id: DEMO_FAMILY_ID,
        member_id: memberFatherId,
        document_id: docFatherRxId,
        event_date: "2023-11-05",
        event_type: "surgery",
        title: "Percutaneous Coronary Intervention (DES Stent to LAD)",
        details: {
          notes: "Single drug-eluting stent placed in proximal LAD; dual antiplatelet completed",
          confidence: "high",
        },
        is_hereditary_flag: true,
        verified_by_user: true,
        created_at: now,
      },
      {
        id: "44444444-4444-4000-8000-000000000004",
        family_id: DEMO_FAMILY_ID,
        member_id: memberFatherId,
        document_id: docFatherRxId,
        event_date: "2015-01-10",
        event_type: "allergy",
        title: "Penicillin & Amoxicillin Class Antibiotics",
        details: {
          notes: "Severe generalized urticaria & airway swelling",
          confidence: "high",
        },
        is_hereditary_flag: false,
        verified_by_user: true,
        created_at: now,
      },
      {
        id: "44444444-4444-4000-8000-000000000005",
        family_id: DEMO_FAMILY_ID,
        member_id: memberFatherId,
        document_id: docFatherRxId,
        event_date: "2024-02-01",
        event_type: "allergy",
        title: "Iodinated Contrast Dye (Mild Rash)",
        details: {
          notes: "Requires pre-medication prior to CT angiography",
          confidence: "high",
        },
        is_hereditary_flag: false,
        verified_by_user: true,
        created_at: now,
      },
      {
        id: "44444444-4444-4000-8000-000000000006",
        family_id: DEMO_FAMILY_ID,
        member_id: memberFatherId,
        document_id: docFatherRxId,
        event_date: "2026-09-12",
        event_type: "medication",
        title: "Metformin Hydrochloride SR",
        details: {
          dosage: "500mg",
          frequency: "Twice daily after meals",
          is_active: true,
          confidence: "high",
        },
        is_hereditary_flag: false,
        verified_by_user: true,
        created_at: now,
      },
      {
        id: "44444444-4444-4000-8000-000000000007",
        family_id: DEMO_FAMILY_ID,
        member_id: memberFatherId,
        document_id: docFatherRxId,
        event_date: "2026-09-12",
        event_type: "medication",
        title: "Telmisartan",
        details: {
          dosage: "40mg",
          frequency: "Once daily morning",
          is_active: true,
          confidence: "high",
        },
        is_hereditary_flag: false,
        verified_by_user: true,
        created_at: now,
      },
      {
        id: "44444444-4444-4000-8000-000000000008",
        family_id: DEMO_FAMILY_ID,
        member_id: memberFatherId,
        document_id: docFatherRxId,
        event_date: "2026-09-12",
        event_type: "medication",
        title: "Aspirin Gastro-Resistant (Ecosprin)",
        details: {
          dosage: "75mg",
          frequency: "Once daily after lunch",
          is_active: true,
          confidence: "high",
        },
        is_hereditary_flag: false,
        verified_by_user: true,
        created_at: now,
      },
      {
        id: "44444444-4444-4000-8000-000000000009",
        family_id: DEMO_FAMILY_ID,
        member_id: memberFatherId,
        document_id: docFatherLabId,
        event_date: "2026-10-28",
        event_type: "lab_abnormal",
        title: "HbA1c (Glycated Hemoglobin)",
        details: {
          lab_value: "7.8%",
          reference_range: "4.0% - 5.6%",
          confidence: "high",
        },
        is_hereditary_flag: true,
        verified_by_user: true,
        created_at: now,
      },
      {
        id: "44444444-4444-4000-8000-000000000010",
        family_id: DEMO_FAMILY_ID,
        member_id: memberFatherId,
        document_id: docFatherLabId,
        event_date: "2026-10-28",
        event_type: "lab_abnormal",
        title: "LDL Cholesterol (Direct)",
        details: {
          lab_value: "148 mg/dL",
          reference_range: "< 100 mg/dL (Post-PCI target < 70 mg/dL)",
          confidence: "high",
        },
        is_hereditary_flag: true,
        verified_by_user: true,
        created_at: now,
      },
      {
        id: "44444444-4444-4000-8000-000000000011",
        family_id: DEMO_FAMILY_ID,
        member_id: memberFatherId,
        document_id: docFatherLabId,
        event_date: "2026-10-28",
        event_type: "lab_abnormal",
        title: "Serum Creatinine",
        details: {
          lab_value: "1.38 mg/dL",
          reference_range: "0.70 - 1.20 mg/dL",
          confidence: "high",
        },
        is_hereditary_flag: false,
        verified_by_user: true,
        created_at: now,
      },
      // Paternal Grandfather (Harihar Sharma)
      {
        id: "44444444-4444-4000-8000-000000000012",
        family_id: DEMO_FAMILY_ID,
        member_id: memberPaternalGfId,
        document_id: null,
        event_date: "1998-05-10",
        event_type: "diagnosis",
        title: "Type 2 Diabetes Mellitus",
        details: {
          notes: "Diagnosed at age 65",
          confidence: "high",
        },
        is_hereditary_flag: true,
        verified_by_user: true,
        created_at: now,
      },
      {
        id: "44444444-4444-4000-8000-000000000013",
        family_id: DEMO_FAMILY_ID,
        member_id: memberPaternalGfId,
        document_id: null,
        event_date: "2006-08-19",
        event_type: "diagnosis",
        title: "Coronary Artery Disease (Triple Vessel CAD)",
        details: {
          notes: "History of angina & myocardial infarction",
          confidence: "high",
        },
        is_hereditary_flag: true,
        verified_by_user: true,
        created_at: now,
      },
      // Mother (Sunita Sharma)
      {
        id: "44444444-4444-4000-8000-000000000014",
        family_id: DEMO_FAMILY_ID,
        member_id: memberMotherId,
        document_id: null,
        event_date: "2019-04-12",
        event_type: "diagnosis",
        title: "Essential Hypertension",
        details: {
          notes: "Controlled on Amlodipine 5mg",
          confidence: "high",
        },
        is_hereditary_flag: true,
        verified_by_user: true,
        created_at: now,
      },
      {
        id: "44444444-4444-4000-8000-000000000015",
        family_id: DEMO_FAMILY_ID,
        member_id: memberMotherId,
        document_id: null,
        event_date: "2016-11-22",
        event_type: "diagnosis",
        title: "Primary Hypothyroidism (Hashimoto's)",
        details: {
          notes: "Managed on daily Levothyroxine 75mcg",
          confidence: "high",
        },
        is_hereditary_flag: true,
        verified_by_user: true,
        created_at: now,
      },
      {
        id: "44444444-4444-4000-8000-000000000016",
        family_id: DEMO_FAMILY_ID,
        member_id: memberMotherId,
        document_id: null,
        event_date: "2016-11-22",
        event_type: "medication",
        title: "Levothyroxine Sodium (Thyronorm)",
        details: {
          dosage: "75mcg",
          frequency: "Once daily empty stomach",
          is_active: true,
          confidence: "high",
        },
        is_hereditary_flag: false,
        verified_by_user: true,
        created_at: now,
      },
      // Maternal Grandmother (Kamala Devi)
      {
        id: "44444444-4444-4000-8000-000000000017",
        family_id: DEMO_FAMILY_ID,
        member_id: memberMaternalGmId,
        document_id: null,
        event_date: "1995-03-01",
        event_type: "diagnosis",
        title: "Essential Hypertension",
        details: {
          notes: "Maternal familial hypertension",
          confidence: "high",
        },
        is_hereditary_flag: true,
        verified_by_user: true,
        created_at: now,
      },
      {
        id: "44444444-4444-4000-8000-000000000018",
        family_id: DEMO_FAMILY_ID,
        member_id: memberMaternalGmId,
        document_id: null,
        event_date: "2012-09-14",
        event_type: "diagnosis",
        title: "Breast Carcinoma (ER+ Stage IIA)",
        details: {
          notes: "Treated with mastectomy & tamoxifen remission",
          confidence: "high",
        },
        is_hereditary_flag: true,
        verified_by_user: true,
        created_at: now,
      },
    ],
    share_tokens: [
      {
        id: "55555555-5555-4000-8000-000000000001",
        family_id: DEMO_FAMILY_ID,
        member_id: memberFatherId,
        token_hash: sha256Hex(DEMO_SAMPLE_QR_TOKEN),
        pin_code: null,
        expires_at: thirtyMinsLater,
        revoked: false,
        created_by: DEMO_USER_ID,
        created_at: now,
      },
    ],
    audit_logs: [
      {
        id: "66666666-6666-4000-8000-000000000001",
        family_id: DEMO_FAMILY_ID,
        member_id: memberFatherId,
        actor_type: "family_user",
        actor_identifier: "aarav.sharma@family.in",
        action: "VERIFIED_DOC",
        created_at: now,
      },
      {
        id: "66666666-6666-4000-8000-000000000002",
        family_id: DEMO_FAMILY_ID,
        member_id: memberFatherId,
        actor_type: "doctor_qr_session",
        actor_identifier: "QR-Brief-Session (OPD Consultation)",
        action: "VIEWED_QR_BRIEF",
        created_at: now,
      },
    ],
    storage_files: {
      [`${DEMO_FAMILY_ID}/${memberFatherId}/${docFatherRxId}.pdf`]: {
        mimeType: "application/pdf",
        size: 245120,
        createdAt: now,
      },
      [`${DEMO_FAMILY_ID}/${memberFatherId}/${docFatherLabId}.pdf`]: {
        mimeType: "application/pdf",
        size: 189400,
        createdAt: now,
      },
      [`${DEMO_FAMILY_ID}/${memberFatherId}/${docPendingHitlId}.jpg`]: {
        mimeType: "image/jpeg",
        size: 412800,
        createdAt: now,
      },
    },
  };
}

function readDemoStore(): DemoStoreState {
  try {
    if (fs.existsSync(DEMO_STORE_PATH)) {
      const raw = fs.readFileSync(DEMO_STORE_PATH, "utf-8");
      const parsed = JSON.parse(raw) as DemoStoreState;
      // Ensure the sample demo token stays fresh for live previews
      const sampleHash = sha256Hex(DEMO_SAMPLE_QR_TOKEN);
      const sampleToken = parsed.share_tokens.find(
        (t) => t.token_hash === sampleHash
      );
      if (sampleToken && new Date(sampleToken.expires_at).getTime() <= Date.now()) {
        sampleToken.expires_at = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      }
      return parsed;
    }
  } catch {
    // Re-initialize if corrupted
  }
  const initial = createInitialDemoSeed();
  writeDemoStore(initial);
  return initial;
}

function writeDemoStore(state: DemoStoreState): void {
  const dir = path.dirname(DEMO_STORE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(DEMO_STORE_PATH, JSON.stringify(state, null, 2), "utf-8");
}

export interface WorkspaceSnapshot {
  isLiveSupabase: boolean;
  currentUser: {
    id: string;
    email: string;
  };
  family: FamilyRow;
  families: FamilyRow[];
  members: FamilyMemberRow[];
  documents: MedicalDocumentRow[];
  events: TimelineEventRow[];
  shareTokens: ShareTokenRow[];
  auditLogs: AuditLogRow[];
}

/**
 * Fetches the active workspace snapshot, onboarding a default family if the authenticated
 * user does not have one yet. Seamlessly operates against live Supabase or local demo store.
 */
export async function getWorkspaceSnapshot(
  selectedFamilyId?: string
): Promise<WorkspaceSnapshot> {
  if (!isSupabaseConfigured()) {
    const store = readDemoStore();
    const family =
      store.families.find((f) => f.id === selectedFamilyId) || store.families[0];
    return {
      isLiveSupabase: false,
      currentUser: {
        id: DEMO_USER_ID,
        email: "aarav.sharma@family.in",
      },
      family,
      families: store.families,
      members: store.family_members.filter((m) => m.family_id === family.id),
      documents: store.medical_documents
        .filter((d) => d.family_id === family.id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
      events: store.timeline_events
        .filter((e) => e.family_id === family.id)
        .sort((a, b) => b.event_date.localeCompare(a.event_date)),
      shareTokens: store.share_tokens
        .filter((t) => t.family_id === family.id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
      auditLogs: store.audit_logs
        .filter((a) => a.family_id === family.id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    };
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Fallback to demo preview for unauthenticated visitors browsing the interactive workspace
    const store = readDemoStore();
    const family = store.families[0];
    return {
      isLiveSupabase: true,
      currentUser: {
        id: DEMO_USER_ID,
        email: "guest-preview@ayuvansha.health",
      },
      family,
      families: store.families,
      members: store.family_members,
      documents: store.medical_documents,
      events: store.timeline_events,
      shareTokens: store.share_tokens,
      auditLogs: store.audit_logs,
    };
  }

  // Check if user already belongs to one or more families
  const { data: memberships } = await supabase
    .from("family_users")
    .select("family_id, role")
    .eq("user_id", user.id);

  let families: FamilyRow[] = [];
  if (memberships && memberships.length > 0) {
    const familyIds = memberships.map((m) => m.family_id);
    const { data: famRows } = await supabase
      .from("families")
      .select("*")
      .in("id", familyIds)
      .order("created_at", { ascending: true });
    families = (famRows as FamilyRow[]) || [];
  }

  // Onboarding: create default family if user has none
  if (families.length === 0) {
    const defaultName = user.email
      ? `${user.email.split("@")[0]}'s Family Health Workspace`
      : "My Family Health Workspace";

    const { data: createdFamily, error: createErr } = await supabase
      .from("families")
      .insert({
        name: defaultName,
        subscription_tier: "free",
        created_by: user.id,
      })
      .select("*")
      .single();

    if (createErr || !createdFamily) {
      throw new Error(
        `Failed to onboard default family: ${createErr?.message || "Unknown"}`
      );
    }

    await supabase.from("family_users").insert({
      family_id: createdFamily.id,
      user_id: user.id,
      role: "admin",
    });

    families = [createdFamily as FamilyRow];
  }

  const activeFamily =
    families.find((f) => f.id === selectedFamilyId) || families[0];

  const [membersRes, docsRes, eventsRes, tokensRes, logsRes] = await Promise.all([
    supabase
      .from("family_members")
      .select("*")
      .eq("family_id", activeFamily.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("medical_documents")
      .select("*")
      .eq("family_id", activeFamily.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("timeline_events")
      .select("*")
      .eq("family_id", activeFamily.id)
      .order("event_date", { ascending: false }),
    supabase
      .from("share_tokens")
      .select("*")
      .eq("family_id", activeFamily.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("audit_logs")
      .select("*")
      .eq("family_id", activeFamily.id)
      .order("created_at", { ascending: false })
      .limit(25),
  ]);

  return {
    isLiveSupabase: true,
    currentUser: {
      id: user.id,
      email: user.email || "caregiver@ayuvansha.health",
    },
    family: activeFamily,
    families,
    members: (membersRes.data as FamilyMemberRow[]) || [],
    documents: (docsRes.data as MedicalDocumentRow[]) || [],
    events: (eventsRes.data as TimelineEventRow[]) || [],
    shareTokens: (tokensRes.data as ShareTokenRow[]) || [],
    auditLogs: (logsRes.data as AuditLogRow[]) || [],
  };
}

/**
 * Append an immutable audit log entry.
 */
export async function appendAuditLog(params: {
  familyId: string;
  memberId: string | null;
  actorType: AuditActorType;
  actorIdentifier: string;
  action: string;
}): Promise<void> {
  if (!isSupabaseConfigured()) {
    const store = readDemoStore();
    store.audit_logs.unshift({
      id: crypto.randomUUID(),
      family_id: params.familyId,
      member_id: params.memberId,
      actor_type: params.actorType,
      actor_identifier: params.actorIdentifier,
      action: params.action,
      created_at: new Date().toISOString(),
    });
    writeDemoStore(store);
    return;
  }

  const admin = createServiceRoleClient();
  await admin.from("audit_logs").insert({
    family_id: params.familyId,
    member_id: params.memberId,
    actor_type: params.actorType,
    actor_identifier: params.actorIdentifier,
    action: params.action,
  });
}

export async function insertFamilyMemberRecord(
  input: Omit<FamilyMemberRow, "id" | "created_at">
): Promise<FamilyMemberRow> {
  if (!isSupabaseConfigured()) {
    const store = readDemoStore();
    const created: FamilyMemberRow = {
      ...input,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    store.family_members.push(created);
    writeDemoStore(store);
    return created;
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("family_members")
    .insert(input)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to add family member");
  }
  return data as FamilyMemberRow;
}

export async function updateFamilyTierRecord(
  familyId: string,
  tier: SubscriptionTier
): Promise<void> {
  if (!isSupabaseConfigured()) {
    const store = readDemoStore();
    const fam = store.families.find((f) => f.id === familyId);
    if (fam) {
      fam.subscription_tier = tier;
      writeDemoStore(store);
    }
    return;
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("families")
    .update({ subscription_tier: tier })
    .eq("id", familyId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function createNewFamilyWorkspace(
  name: string,
  tier: SubscriptionTier = "free"
): Promise<FamilyRow> {
  if (!isSupabaseConfigured()) {
    const store = readDemoStore();
    const created: FamilyRow = {
      id: crypto.randomUUID(),
      name,
      subscription_tier: tier,
      created_by: DEMO_USER_ID,
      created_at: new Date().toISOString(),
    };
    store.families.push(created);
    store.family_users.push({
      family_id: created.id,
      user_id: DEMO_USER_ID,
      role: "admin",
    });
    writeDemoStore(store);
    return created;
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { data: fam, error } = await supabase
    .from("families")
    .insert({
      name,
      subscription_tier: tier,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (error || !fam) {
    throw new Error(error?.message || "Failed to create family");
  }

  await supabase.from("family_users").insert({
    family_id: fam.id,
    user_id: user.id,
    role: "admin",
  });

  return fam as FamilyRow;
}

export async function savePendingDocumentExtraction(params: {
  documentId?: string;
  familyId: string;
  memberId: string;
  storagePath: string;
  extraction: ExtractedMedicalDocument;
  mimeType?: string;
  fileSize?: number;
}): Promise<MedicalDocumentRow> {
  const docId = params.documentId || crypto.randomUUID();

  if (!isSupabaseConfigured()) {
    const store = readDemoStore();
    const docRow: MedicalDocumentRow = {
      id: docId,
      family_id: params.familyId,
      member_id: params.memberId,
      storage_path: params.storagePath,
      doc_type: params.extraction.document_type,
      doc_date: params.extraction.document_date,
      hospital_or_doctor: params.extraction.doctor_or_hospital,
      ocr_status: "needs_review",
      raw_extraction: params.extraction,
      created_at: new Date().toISOString(),
    };
    const existingIdx = store.medical_documents.findIndex((d) => d.id === docId);
    if (existingIdx >= 0) {
      store.medical_documents[existingIdx] = docRow;
    } else {
      store.medical_documents.unshift(docRow);
    }
    store.storage_files[params.storagePath] = {
      mimeType: params.mimeType || "application/octet-stream",
      size: params.fileSize || 0,
      createdAt: new Date().toISOString(),
    };
    writeDemoStore(store);
    return docRow;
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("medical_documents")
    .upsert({
      id: docId,
      family_id: params.familyId,
      member_id: params.memberId,
      storage_path: params.storagePath,
      doc_type: params.extraction.document_type,
      doc_date: params.extraction.document_date,
      hospital_or_doctor: params.extraction.doctor_or_hospital,
      ocr_status: "needs_review",
      raw_extraction: params.extraction,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(
      error?.message || "Failed to save pending medical document extraction"
    );
  }
  return data as MedicalDocumentRow;
}

export interface ConfirmHitlEventsInput {
  documentId: string;
  familyId: string;
  memberId: string;
  documentType: MedicalDocumentType;
  documentDate: string | null;
  doctorOrHospital: string | null;
  actorIdentifier: string;
  verifiedEvents: Array<{
    event_type: TimelineEventRow["event_type"];
    event_date: string;
    title: string;
    dosage_or_value: string | null;
    is_active_medication: boolean;
    is_hereditary_condition: boolean;
    confidence: "high" | "medium" | "low";
  }>;
}

export async function confirmAndCommitHitlEvents(
  input: ConfirmHitlEventsInput
): Promise<TimelineEventRow[]> {
  const now = new Date().toISOString();
  const defaultEventDate =
    input.documentDate || new Date().toISOString().slice(0, 10);

  if (!isSupabaseConfigured()) {
    const store = readDemoStore();
    const doc = store.medical_documents.find((d) => d.id === input.documentId);
    if (doc) {
      doc.doc_type = input.documentType;
      doc.doc_date = input.documentDate;
      doc.hospital_or_doctor = input.doctorOrHospital;
      doc.ocr_status = "verified";
    }

    const inserted: TimelineEventRow[] = input.verifiedEvents.map((ev) => ({
      id: crypto.randomUUID(),
      family_id: input.familyId,
      member_id: input.memberId,
      document_id: input.documentId,
      event_date: ev.event_date || defaultEventDate,
      event_type: ev.event_type,
      title: ev.title.trim(),
      details: {
        dosage:
          ev.event_type === "medication" ? ev.dosage_or_value : undefined,
        lab_value:
          ev.event_type === "lab_abnormal" ? ev.dosage_or_value : undefined,
        notes:
          ev.event_type !== "medication" && ev.event_type !== "lab_abnormal"
            ? ev.dosage_or_value
            : undefined,
        is_active: ev.is_active_medication,
        confidence: ev.confidence,
      },
      is_hereditary_flag: ev.is_hereditary_condition,
      verified_by_user: true,
      created_at: now,
    }));

    store.timeline_events.unshift(...inserted);
    store.audit_logs.unshift({
      id: crypto.randomUUID(),
      family_id: input.familyId,
      member_id: input.memberId,
      actor_type: "family_user",
      actor_identifier: input.actorIdentifier,
      action: "VERIFIED_DOC",
      created_at: now,
    });

    writeDemoStore(store);
    return inserted;
  }

  const supabase = await createServerSupabase();

  // 1. Update medical_documents status to 'verified'
  const { error: docErr } = await supabase
    .from("medical_documents")
    .update({
      doc_type: input.documentType,
      doc_date: input.documentDate,
      hospital_or_doctor: input.doctorOrHospital,
      ocr_status: "verified",
    })
    .eq("id", input.documentId)
    .eq("family_id", input.familyId);

  if (docErr) {
    throw new Error(`Failed to mark document verified: ${docErr.message}`);
  }

  // 2. Insert verified rows into timeline_events with verified_by_user = true
  const rowsToInsert = input.verifiedEvents.map((ev) => ({
    family_id: input.familyId,
    member_id: input.memberId,
    document_id: input.documentId,
    event_date: ev.event_date || defaultEventDate,
    event_type: ev.event_type,
    title: ev.title.trim(),
    details: {
      dosage: ev.event_type === "medication" ? ev.dosage_or_value : undefined,
      lab_value:
        ev.event_type === "lab_abnormal" ? ev.dosage_or_value : undefined,
      notes:
        ev.event_type !== "medication" && ev.event_type !== "lab_abnormal"
          ? ev.dosage_or_value
          : undefined,
      is_active: ev.is_active_medication,
      confidence: ev.confidence,
    },
    is_hereditary_flag: ev.is_hereditary_condition,
    verified_by_user: true,
  }));

  const { data: insertedRows, error: insertErr } = await supabase
    .from("timeline_events")
    .insert(rowsToInsert)
    .select("*");

  if (insertErr) {
    throw new Error(`Failed to insert timeline events: ${insertErr.message}`);
  }

  await appendAuditLog({
    familyId: input.familyId,
    memberId: input.memberId,
    actorType: "family_user",
    actorIdentifier: input.actorIdentifier,
    action: "VERIFIED_DOC",
  });

  return (insertedRows as TimelineEventRow[]) || [];
}

/**
 * Right to Erasure: Deletes all files in medical-records/{family_id}/{member_id}/
 * from Supabase Storage, cascades deletion of the family_members row,
 * and logs 'PURGED_MEMBER' in audit_logs.
 */
export async function purgeMemberAndStorageData(params: {
  familyId: string;
  memberId: string;
  actorIdentifier: string;
}): Promise<{ deletedFilesCount: number; memberName: string }> {
  const folderPrefix = `${params.familyId}/${params.memberId}/`;

  if (!isSupabaseConfigured()) {
    const store = readDemoStore();
    const target = store.family_members.find(
      (m) => m.id === params.memberId && m.family_id === params.familyId
    );
    const memberName = target?.full_name || "Member";

    // Delete all files in medical-records/{family_id}/{member_id}/
    let deletedFilesCount = 0;
    for (const filePath of Object.keys(store.storage_files)) {
      if (filePath.startsWith(folderPrefix)) {
        delete store.storage_files[filePath];
        deletedFilesCount++;
      }
    }

    // Clear mother_id / father_id references pointing to this member (ON DELETE SET NULL)
    for (const m of store.family_members) {
      if (m.mother_id === params.memberId) m.mother_id = null;
      if (m.father_id === params.memberId) m.father_id = null;
    }

    // Cascade delete member, documents, timeline events, and share tokens
    store.family_members = store.family_members.filter(
      (m) => m.id !== params.memberId
    );
    store.medical_documents = store.medical_documents.filter(
      (d) => d.member_id !== params.memberId
    );
    store.timeline_events = store.timeline_events.filter(
      (e) => e.member_id !== params.memberId
    );
    store.share_tokens = store.share_tokens.filter(
      (t) => t.member_id !== params.memberId
    );

    // Nullify member_id on historical audit logs (ON DELETE SET NULL) and log PURGED_MEMBER
    for (const log of store.audit_logs) {
      if (log.member_id === params.memberId) {
        log.member_id = null;
      }
    }
    store.audit_logs.unshift({
      id: crypto.randomUUID(),
      family_id: params.familyId,
      member_id: null,
      actor_type: "family_user",
      actor_identifier: `${params.actorIdentifier} (Purged: ${memberName})`,
      action: "PURGED_MEMBER",
      created_at: new Date().toISOString(),
    });

    writeDemoStore(store);
    return { deletedFilesCount, memberName };
  }

  const supabase = await createServerSupabase();

  const { data: memberRow } = await supabase
    .from("family_members")
    .select("full_name")
    .eq("id", params.memberId)
    .eq("family_id", params.familyId)
    .single();

  const memberName = memberRow?.full_name || "Member";

  // 1. List and delete all storage objects under medical-records/{family_id}/{member_id}/
  const { data: filesList } = await supabase.storage
    .from("medical-records")
    .list(`${params.familyId}/${params.memberId}`);

  let deletedFilesCount = 0;
  if (filesList && filesList.length > 0) {
    const pathsToDelete = filesList.map(
      (f) => `${params.familyId}/${params.memberId}/${f.name}`
    );
    await supabase.storage.from("medical-records").remove(pathsToDelete);
    deletedFilesCount = pathsToDelete.length;
  }

  // 2. Cascade delete family_members row
  const { error: delErr } = await supabase
    .from("family_members")
    .delete()
    .eq("id", params.memberId)
    .eq("family_id", params.familyId);

  if (delErr) {
    throw new Error(`Failed to purge member: ${delErr.message}`);
  }

  // 3. Log erasure in immutable audit_logs
  await appendAuditLog({
    familyId: params.familyId,
    memberId: null,
    actorType: "family_user",
    actorIdentifier: `${params.actorIdentifier} (Purged: ${memberName})`,
    action: "PURGED_MEMBER",
  });

  return { deletedFilesCount, memberName };
}

export async function createEphemeralShareToken(params: {
  familyId: string;
  memberId: string;
  rawToken: string;
  pinCode: string | null;
  createdBy: string;
  durationMinutes?: number;
}): Promise<ShareTokenRow> {
  const tokenHash = sha256Hex(params.rawToken);
  const expiresAt = new Date(
    Date.now() + (params.durationMinutes || 30) * 60 * 1000
  ).toISOString();

  if (!isSupabaseConfigured()) {
    const store = readDemoStore();
    const row: ShareTokenRow = {
      id: crypto.randomUUID(),
      family_id: params.familyId,
      member_id: params.memberId,
      token_hash: tokenHash,
      pin_code: params.pinCode || null,
      expires_at: expiresAt,
      revoked: false,
      created_by: params.createdBy,
      created_at: new Date().toISOString(),
    };
    store.share_tokens.unshift(row);
    writeDemoStore(store);
    return row;
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("share_tokens")
    .insert({
      family_id: params.familyId,
      member_id: params.memberId,
      token_hash: tokenHash,
      pin_code: params.pinCode || null,
      expires_at: expiresAt,
      revoked: false,
      created_by: params.createdBy,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to generate QR share token");
  }
  return data as ShareTokenRow;
}

export async function revokeShareTokenById(
  tokenId: string,
  familyId: string
): Promise<void> {
  if (!isSupabaseConfigured()) {
    const store = readDemoStore();
    const found = store.share_tokens.find(
      (t) => t.id === tokenId && t.family_id === familyId
    );
    if (found) {
      found.revoked = true;
      writeDemoStore(store);
    }
    return;
  }

  const supabase = await createServerSupabase();
  await supabase
    .from("share_tokens")
    .update({ revoked: true })
    .eq("id", tokenId)
    .eq("family_id", familyId);
}

export interface DoctorBriefLookupResult {
  status: "valid" | "expired" | "revoked" | "not_found";
  requiresPin: boolean;
  shareToken?: ShareTokenRow;
  member?: FamilyMemberRow;
  familyMembers?: FamilyMemberRow[];
  familyEvents?: TimelineEventRow[];
}

/**
 * Looks up a Doctor QR share token by raw token string using SUPABASE_SERVICE_ROLE_KEY.
 */
export async function lookupDoctorBriefByToken(
  rawToken: string
): Promise<DoctorBriefLookupResult> {
  const tokenHash = sha256Hex(rawToken);

  if (!isSupabaseConfigured()) {
    const store = readDemoStore();
    const tokenRow = store.share_tokens.find((t) => t.token_hash === tokenHash);
    if (!tokenRow) {
      return { status: "not_found", requiresPin: false };
    }
    if (tokenRow.revoked) {
      return { status: "revoked", requiresPin: false, shareToken: tokenRow };
    }
    if (new Date(tokenRow.expires_at).getTime() <= Date.now()) {
      return { status: "expired", requiresPin: false, shareToken: tokenRow };
    }

    const member = store.family_members.find(
      (m) => m.id === tokenRow.member_id
    );
    if (!member) {
      return { status: "not_found", requiresPin: false };
    }

    return {
      status: "valid",
      requiresPin: Boolean(tokenRow.pin_code && tokenRow.pin_code.trim().length > 0),
      shareToken: tokenRow,
      member,
      familyMembers: store.family_members.filter(
        (m) => m.family_id === tokenRow.family_id
      ),
      familyEvents: store.timeline_events.filter(
        (e) => e.family_id === tokenRow.family_id && e.verified_by_user
      ),
    };
  }

  const admin = createServiceRoleClient();
  const { data: tokenRow, error } = await admin
    .from("share_tokens")
    .select("*")
    .eq("token_hash", tokenHash)
    .single();

  if (error || !tokenRow) {
    return { status: "not_found", requiresPin: false };
  }

  const typedToken = tokenRow as ShareTokenRow;
  if (typedToken.revoked) {
    return { status: "revoked", requiresPin: false, shareToken: typedToken };
  }
  if (new Date(typedToken.expires_at).getTime() <= Date.now()) {
    return { status: "expired", requiresPin: false, shareToken: typedToken };
  }

  const [memberRes, allMembersRes, allEventsRes] = await Promise.all([
    admin
      .from("family_members")
      .select("*")
      .eq("id", typedToken.member_id)
      .single(),
    admin
      .from("family_members")
      .select("*")
      .eq("family_id", typedToken.family_id),
    admin
      .from("timeline_events")
      .select("*")
      .eq("family_id", typedToken.family_id)
      .eq("verified_by_user", true)
      .order("event_date", { ascending: false }),
  ]);

  if (!memberRes.data) {
    return { status: "not_found", requiresPin: false };
  }

  return {
    status: "valid",
    requiresPin: Boolean(
      typedToken.pin_code && typedToken.pin_code.trim().length > 0
    ),
    shareToken: typedToken,
    member: memberRes.data as FamilyMemberRow,
    familyMembers: (allMembersRes.data as FamilyMemberRow[]) || [],
    familyEvents: (allEventsRes.data as TimelineEventRow[]) || [],
  };
}
