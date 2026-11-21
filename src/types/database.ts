export type SubscriptionTier = "free" | "family_care" | "multi_gen_plus";
export type FamilyRole = "admin" | "editor" | "viewer";
export type BiologicalSex = "male" | "female" | "other";
export type MedicalDocumentType =
  | "prescription"
  | "lab_report"
  | "discharge_summary"
  | "vaccination"
  | "other";
export type OcrStatus = "pending" | "needs_review" | "verified" | "failed";
export type TimelineEventType =
  | "diagnosis"
  | "medication"
  | "allergy"
  | "surgery"
  | "lab_abnormal";
export type ConfidenceLevel = "high" | "medium" | "low";
export type AuditActorType = "family_user" | "doctor_qr_session";

export interface ExtractedMedicalEvent {
  event_type: TimelineEventType;
  title: string; // Standardized generic/brand drug or condition name
  dosage_or_value: string | null; // e.g., "500mg twice daily" or "HbA1c: 8.2%"
  is_active_medication: boolean;
  is_hereditary_condition: boolean; // True for diabetes, hypertension, CAD, cancers, thyroid, etc.
  confidence: ConfidenceLevel;
}

export interface ExtractedMedicalDocument {
  document_type: MedicalDocumentType;
  document_date: string | null; // YYYY-MM-DD
  doctor_or_hospital: string | null;
  events: ExtractedMedicalEvent[];
}

export interface TimelineEventDetails {
  dosage?: string | null;
  frequency?: string | null;
  is_active?: boolean;
  lab_value?: string | null;
  reference_range?: string | null;
  confidence?: ConfidenceLevel;
  notes?: string | null;
}

export interface FamilyRow {
  id: string;
  name: string;
  subscription_tier: SubscriptionTier;
  created_by: string;
  created_at: string;
}

export interface FamilyUserRow {
  family_id: string;
  user_id: string;
  role: FamilyRole;
}

export interface FamilyMemberRow {
  id: string;
  family_id: string;
  full_name: string;
  relationship_label: string;
  dob: string | null;
  biological_sex: BiologicalSex | null;
  blood_group: string | null;
  is_deceased: boolean;
  cause_of_death: string | null;
  mother_id: string | null;
  father_id: string | null;
  consent_verified: boolean;
  created_at: string;
}

export interface MedicalDocumentRow {
  id: string;
  family_id: string;
  member_id: string;
  storage_path: string;
  doc_type: MedicalDocumentType;
  doc_date: string | null;
  hospital_or_doctor: string | null;
  ocr_status: OcrStatus;
  raw_extraction: ExtractedMedicalDocument | null;
  created_at: string;
}

export interface TimelineEventRow {
  id: string;
  family_id: string;
  member_id: string;
  document_id: string | null;
  event_date: string;
  event_type: TimelineEventType;
  title: string;
  details: TimelineEventDetails;
  is_hereditary_flag: boolean;
  verified_by_user: boolean;
  created_at: string;
}

export interface ShareTokenRow {
  id: string;
  family_id: string;
  member_id: string;
  token_hash: string;
  pin_code: string | null;
  expires_at: string;
  revoked: boolean;
  created_by: string;
  created_at: string;
}

export interface AuditLogRow {
  id: string;
  family_id: string;
  member_id: string | null;
  actor_type: AuditActorType;
  actor_identifier: string;
  action: string;
  created_at: string;
}

export interface TierLimitConfig {
  tier: SubscriptionTier;
  label: string;
  priceMonthly: string;
  maxMembers: number | null; // null = unlimited
  maxDocuments: number | null; // null = unlimited
  maxGenerations: number | null;
  description: string;
}

export const DEMO_SAMPLE_QR_TOKEN = "ayuvansha-demo-rajesh-brief-2026";

export const SUBSCRIPTION_TIER_LIMITS: Record<
  SubscriptionTier,
  TierLimitConfig
> = {
  free: {
    tier: "free",
    label: "Free Caregiver",
    priceMonthly: "₹0 / $0",
    maxMembers: 1,
    maxDocuments: 15,
    maxGenerations: 1,
    description: "1 member profile and up to 15 clinical documents.",
  },
  family_care: {
    tier: "family_care",
    label: "Family Care",
    priceMonthly: "₹499 / $9 mo",
    maxMembers: 6,
    maxDocuments: null,
    maxGenerations: 3,
    description: "Up to 6 members, unlimited documents & 1-Page Doctor QR Briefs.",
  },
  multi_gen_plus: {
    tier: "multi_gen_plus",
    label: "Multi-Gen Plus",
    priceMonthly: "₹999 / $19 mo",
    maxMembers: null,
    maxDocuments: null,
    maxGenerations: null,
    description:
      "Unlimited generations, extended hereditary lineage mapping & audit compliance.",
  },
};
