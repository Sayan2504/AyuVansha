import assert from "node:assert/strict";
import { computeHereditaryRisks } from "../src/lib/hereditary/computeRisks.ts";
import {
  buildSampleExtractionForFile,
  ExtractedMedicalDocumentZod,
} from "../src/lib/ai/extractMedicalDoc.ts";
import type { FamilyMemberRow, TimelineEventRow } from "../src/types/database.ts";

console.log("Running AyuVansha Clinical Engine & Hereditary Lineage Verification...");

const now = new Date().toISOString();
const familyId = "11111111-1111-4000-8000-111111111111";

const members: FamilyMemberRow[] = [
  {
    id: "self-id",
    family_id: familyId,
    full_name: "Aarav Sharma",
    relationship_label: "Self",
    dob: "1992-04-15",
    biological_sex: "male",
    blood_group: "O+",
    is_deceased: false,
    cause_of_death: null,
    mother_id: "mother-id",
    father_id: "father-id",
    consent_verified: true,
    created_at: now,
  },
  {
    id: "father-id",
    family_id: familyId,
    full_name: "Rajesh Sharma",
    relationship_label: "Father",
    dob: "1959-08-22",
    biological_sex: "male",
    blood_group: "B+",
    is_deceased: false,
    cause_of_death: null,
    mother_id: null,
    father_id: "paternal-gf-id",
    consent_verified: true,
    created_at: now,
  },
  {
    id: "paternal-gf-id",
    family_id: familyId,
    full_name: "Harihar Sharma",
    relationship_label: "Paternal Grandfather",
    dob: "1933-02-10",
    biological_sex: "male",
    blood_group: "B+",
    is_deceased: true,
    cause_of_death: "AMI",
    mother_id: null,
    father_id: null,
    consent_verified: true,
    created_at: now,
  },
  {
    id: "mother-id",
    family_id: familyId,
    full_name: "Sunita Sharma",
    relationship_label: "Mother",
    dob: "1964-11-03",
    biological_sex: "female",
    blood_group: "O+",
    is_deceased: false,
    cause_of_death: null,
    mother_id: null,
    father_id: null,
    consent_verified: true,
    created_at: now,
  },
];

const events: TimelineEventRow[] = [
  {
    id: "ev-1",
    family_id: familyId,
    member_id: "father-id",
    document_id: null,
    event_date: "2018-01-01",
    event_type: "diagnosis",
    title: "Type 2 Diabetes",
    details: {},
    is_hereditary_flag: true,
    verified_by_user: true,
    created_at: now,
  },
  {
    id: "ev-2",
    family_id: familyId,
    member_id: "paternal-gf-id",
    document_id: null,
    event_date: "1998-01-01",
    event_type: "diagnosis",
    title: "Type 2 Diabetes",
    details: {},
    is_hereditary_flag: true,
    verified_by_user: true,
    created_at: now,
  },
  {
    id: "ev-3",
    family_id: familyId,
    member_id: "mother-id",
    document_id: null,
    event_date: "2019-01-01",
    event_type: "diagnosis",
    title: "Hypertension",
    details: {},
    is_hereditary_flag: true,
    verified_by_user: true,
    created_at: now,
  },
];

// 1. Verify Hereditary Risk Rollup specification output format
const rollup = computeHereditaryRisks("self-id", members, events);
assert.equal(rollup.paternalAlerts.length, 1);
assert.equal(
  rollup.paternalAlerts[0].formattedSummary,
  "Paternal Lineage: Type 2 Diabetes (Father, Paternal Grandfather)"
);
assert.equal(rollup.maternalAlerts.length, 1);
assert.equal(
  rollup.maternalAlerts[0].formattedSummary,
  "Maternal Lineage: Hypertension (Mother)"
);
console.log("✓ 3-Generation Maternal & Paternal Hereditary Risk Rollup verified:", rollup.allSummaries);

// 2. Verify Gemini HITL Explicit Null & Confidence Schema validation
const sampleRx = buildSampleExtractionForFile("handwritten-rx.jpg");
const parsed = ExtractedMedicalDocumentZod.parse(sampleRx);
const lowConfidenceNullItem = parsed.events.find(
  (e) => e.dosage_or_value === null && e.confidence === "low"
);
assert.ok(
  lowConfidenceNullItem,
  "Expected explicit null dosage item with low confidence in HITL extraction"
);
console.log("✓ Gemini HITL Explicit Null & Confidence schema validation passed!");
