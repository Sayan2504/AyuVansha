import { GoogleGenAI, Type, type Schema } from "@google/genai";
import { z } from "zod";
import type { ExtractedMedicalDocument } from "@/types/database";

export const ExtractedMedicalEventZod = z.object({
  event_type: z.enum([
    "diagnosis",
    "medication",
    "allergy",
    "surgery",
    "lab_abnormal",
  ]),
  title: z.string().min(1),
  dosage_or_value: z.string().nullable(),
  is_active_medication: z.boolean(),
  is_hereditary_condition: z.boolean(),
  confidence: z.enum(["high", "medium", "low"]),
});

export const ExtractedMedicalDocumentZod = z.object({
  document_type: z.enum([
    "prescription",
    "lab_report",
    "discharge_summary",
    "vaccination",
    "other",
  ]),
  document_date: z.string().nullable(),
  doctor_or_hospital: z.string().nullable(),
  events: z.array(ExtractedMedicalEventZod),
});

export const GEMINI_EXTRACTION_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  required: ["document_type", "document_date", "doctor_or_hospital", "events"],
  properties: {
    document_type: {
      type: Type.STRING,
      enum: [
        "prescription",
        "lab_report",
        "discharge_summary",
        "vaccination",
        "other",
      ],
      description: "Primary classification of the uploaded clinical document.",
    },
    document_date: {
      type: Type.STRING,
      nullable: true,
      description:
        "Document date formatted as YYYY-MM-DD. Return null if illegible or ambiguous.",
    },
    doctor_or_hospital: {
      type: Type.STRING,
      nullable: true,
      description:
        "Prescribing physician or hospital/clinic name. Return null if unclear.",
    },
    events: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: [
          "event_type",
          "title",
          "dosage_or_value",
          "is_active_medication",
          "is_hereditary_condition",
          "confidence",
        ],
        properties: {
          event_type: {
            type: Type.STRING,
            enum: [
              "diagnosis",
              "medication",
              "allergy",
              "surgery",
              "lab_abnormal",
            ],
          },
          title: {
            type: Type.STRING,
            description:
              "Standardized generic/brand drug name, diagnosis, surgery, allergen, or lab marker.",
          },
          dosage_or_value: {
            type: Type.STRING,
            nullable: true,
            description:
              "Dosage & frequency (e.g., '500mg twice daily') or lab value with unit (e.g., 'HbA1c: 8.2%'). Return null if illegible or ambiguous.",
          },
          is_active_medication: {
            type: Type.BOOLEAN,
            description:
              "True if this is a currently prescribed or ongoing medication.",
          },
          is_hereditary_condition: {
            type: Type.BOOLEAN,
            description:
              "True for conditions with familial/hereditary significance such as diabetes, hypertension, CAD, cancers, thyroid disorders, dyslipidemia, asthma, or major drug allergies.",
          },
          confidence: {
            type: Type.STRING,
            enum: ["high", "medium", "low"],
            description:
              "Confidence level of OCR extraction. Set to 'low' whenever handwriting is illegible or dosage/date is ambiguous.",
          },
        },
      },
    },
  },
};

export const CLINICAL_EXTRACTION_SYSTEM_PROMPT = `You are AyuVansha Clinical Extraction AI, a safety-critical medical document parser.
Analyze the provided prescription, lab report, discharge summary, or vaccination record and extract structured clinical timeline events.

CRITICAL CLINICAL SAFETY & HITL RULES:
1. Never trust raw OCR blindly on handwritten prescriptions. Every extracted entity MUST return a confidence level ("high" | "medium" | "low").
2. Explicit Null Rule: If handwriting is illegible or a dosage/date is ambiguous, return null and set confidence to "low" rather than guessing.
3. Standardize drug and condition titles (e.g., "Metformin 500mg", "Type 2 Diabetes Mellitus", "Essential Hypertension", "Penicillin Allergy").
4. Set is_hereditary_condition = true for conditions known to carry familial risk (Type 2 Diabetes, Hypertension, Coronary Artery Disease, Cancers, Hypothyroidism, Hyperlipidemia, etc.).`;

export interface ExtractMedicalDocInput {
  fileBase64: string;
  mimeType: string;
  fileName?: string;
  clinicalNotesHint?: string;
}

function isLiveGeminiKey(key: string | undefined): key is string {
  return Boolean(
    key &&
      key.trim().length > 10 &&
      !key.includes("your_paid_tier_gemini_api_key") &&
      !key.includes("placeholder")
  );
}

/**
 * Deterministic fallback sample extraction when GEMINI_API_KEY is a placeholder in local dev,
 * intentionally demonstrating both high-confidence and amber-flagged medium/low-confidence HITL items.
 */
export function buildSampleExtractionForFile(
  fileName = "prescription.pdf",
  clinicalNotesHint?: string
): ExtractedMedicalDocument {
  const lower = `${fileName} ${clinicalNotesHint || ""}`.toLowerCase();

  if (lower.includes("lab") || lower.includes("blood") || lower.includes("hba1c")) {
    return {
      document_type: "lab_report",
      document_date: "2026-10-14",
      doctor_or_hospital: "Apollo Diagnostics & Pathology Centre",
      events: [
        {
          event_type: "lab_abnormal",
          title: "HbA1c (Glycated Hemoglobin)",
          dosage_or_value: "8.2% (Ref: 4.0% - 5.6%)",
          is_active_medication: false,
          is_hereditary_condition: true,
          confidence: "high",
        },
        {
          event_type: "lab_abnormal",
          title: "LDL Cholesterol (Direct)",
          dosage_or_value: "164 mg/dL (High > 130 mg/dL)",
          is_active_medication: false,
          is_hereditary_condition: true,
          confidence: "high",
        },
        {
          event_type: "lab_abnormal",
          title: "Serum TSH (Thyroid Stimulating Hormone)",
          dosage_or_value: null, // Ambiguous smudges on scanned copy
          is_active_medication: false,
          is_hereditary_condition: true,
          confidence: "low",
        },
      ],
    };
  }

  return {
    document_type: "prescription",
    document_date: "2026-11-10",
    doctor_or_hospital: "Dr. R. K. Sharma — Fortis Heart & Metabolic Clinic",
    events: [
      {
        event_type: "diagnosis",
        title: "Type 2 Diabetes Mellitus",
        dosage_or_value: "Fasting glucose elevated; long-standing",
        is_active_medication: false,
        is_hereditary_condition: true,
        confidence: "high",
      },
      {
        event_type: "medication",
        title: "Metformin Hydrochloride (Glycomet SR)",
        dosage_or_value: "500mg twice daily after meals",
        is_active_medication: true,
        is_hereditary_condition: false,
        confidence: "high",
      },
      {
        event_type: "medication",
        title: "Telmisartan (Telma)",
        dosage_or_value: "40mg once daily morning",
        is_active_medication: true,
        is_hereditary_condition: false,
        confidence: "medium",
      },
      {
        event_type: "medication",
        title: "Atorvastatin (Handwritten addendum)",
        dosage_or_value: null, // Explicit Null Rule triggered for illegible handwritten dosage
        is_active_medication: true,
        is_hereditary_condition: false,
        confidence: "low",
      },
      {
        event_type: "allergy",
        title: "Penicillin / Amoxicillin Group",
        dosage_or_value: "Severe urticaria & anaphylaxis risk",
        is_active_medication: false,
        is_hereditary_condition: false,
        confidence: "medium",
      },
    ],
  };
}

export async function extractMedicalDoc(
  input: ExtractMedicalDocInput
): Promise<{
  extraction: ExtractedMedicalDocument;
  modelUsed: string;
  usedSimulationFallback: boolean;
}> {
  const apiKey = process.env.GEMINI_API_KEY;
  // Defaults to gemini-3.8-flash per specification, with GEMINI_MODEL override support
  const preferredModel = process.env.GEMINI_MODEL || "gemini-3.8-flash";

  if (!isLiveGeminiKey(apiKey)) {
    return {
      extraction: buildSampleExtractionForFile(
        input.fileName,
        input.clinicalNotesHint
      ),
      modelUsed: `${preferredModel} (HITL Simulation Mode)`,
      usedSimulationFallback: true,
    };
  }

  const ai = new GoogleGenAI({ apiKey });
  const candidateModels = Array.from(
    new Set([preferredModel, "gemini-2.5-flash"])
  );

  let lastError: unknown = null;
  for (const modelName of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${CLINICAL_EXTRACTION_SYSTEM_PROMPT}\n${
                  input.clinicalNotesHint
                    ? `Caregiver context note: ${input.clinicalNotesHint}`
                    : ""
                }`,
              },
              {
                inlineData: {
                  mimeType: input.mimeType || "image/jpeg",
                  data: input.fileBase64,
                },
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: GEMINI_EXTRACTION_RESPONSE_SCHEMA,
          temperature: 0.1,
        },
      });

      const rawText = response.text;
      if (!rawText) {
        throw new Error("Empty response from Gemini extraction model");
      }

      const parsedJson = JSON.parse(rawText);
      const validated = ExtractedMedicalDocumentZod.parse(parsedJson);

      // Post-processing safety enforcement: if any event has null dosage_or_value on a medication/lab, force low/medium confidence
      const normalizedEvents = validated.events.map((ev) => ({
        ...ev,
        confidence:
          ev.dosage_or_value === null && ev.confidence === "high"
            ? ("low" as const)
            : ev.confidence,
      }));

      return {
        extraction: {
          ...validated,
          events: normalizedEvents,
        },
        modelUsed: modelName,
        usedSimulationFallback: false,
      };
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Failed to extract medical document via Gemini API");
}
