import { NextRequest, NextResponse } from "next/server";
import { extractMedicalDoc } from "@/lib/ai/extractMedicalDoc";
import {
  getWorkspaceSnapshot,
  savePendingDocumentExtraction,
} from "@/lib/data/repository";
import {
  createClient as createServerSupabase,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { SUBSCRIPTION_TIER_LIMITS } from "@/types/database";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      familyId,
      memberId,
      documentId,
      storagePath,
      fileBase64,
      mimeType,
      fileName,
      fileSize,
      clinicalNotesHint,
    } = body as {
      familyId: string;
      memberId: string;
      documentId?: string;
      storagePath?: string;
      fileBase64?: string;
      mimeType?: string;
      fileName?: string;
      fileSize?: number;
      clinicalNotesHint?: string;
    };

    if (!familyId || !memberId) {
      return NextResponse.json(
        { error: "familyId and memberId are required." },
        { status: 400 }
      );
    }

    const snapshot = await getWorkspaceSnapshot(familyId);
    const tierLimits =
      SUBSCRIPTION_TIER_LIMITS[snapshot.family.subscription_tier];

    if (
      tierLimits.maxDocuments !== null &&
      snapshot.documents.length >= tierLimits.maxDocuments
    ) {
      return NextResponse.json(
        {
          error: `Free tier limit reached (${tierLimits.maxDocuments} documents). Upgrade to Family Care or Multi-Gen Plus for unlimited medical document extractions.`,
        },
        { status: 403 }
      );
    }

    let resolvedBase64 = fileBase64 || "";
    let resolvedMimeType = mimeType || "image/jpeg";
    const resolvedDocId = documentId || crypto.randomUUID();
    const ext = (fileName?.split(".").pop() || "pdf").toLowerCase();
    const resolvedStoragePath =
      storagePath || `${familyId}/${memberId}/${resolvedDocId}.${ext}`;

    // If base64 wasn't passed directly and live Supabase Storage is configured, download from private bucket 'medical-records'
    if (!resolvedBase64 && isSupabaseConfigured() && storagePath) {
      const supabase = await createServerSupabase();
      const { data: blob, error: dlErr } = await supabase.storage
        .from("medical-records")
        .download(storagePath);

      if (dlErr || !blob) {
        return NextResponse.json(
          {
            error: `Failed to download document from private bucket medical-records: ${
              dlErr?.message || "Not found"
            }`,
          },
          { status: 404 }
        );
      }

      const arrayBuffer = await blob.arrayBuffer();
      resolvedBase64 = Buffer.from(arrayBuffer).toString("base64");
      resolvedMimeType = blob.type || resolvedMimeType;
    }

    // Run Gemini 3.8 Flash multimodal extraction with strict responseSchema & HITL confidence tagging
    const { extraction, modelUsed, usedSimulationFallback } =
      await extractMedicalDoc({
        fileBase64: resolvedBase64,
        mimeType: resolvedMimeType,
        fileName: fileName || resolvedStoragePath,
        clinicalNotesHint,
      });

    // Save raw_extraction to medical_documents with ocr_status = 'needs_review' (HITL Gate)
    const savedDoc = await savePendingDocumentExtraction({
      documentId: resolvedDocId,
      familyId,
      memberId,
      storagePath: resolvedStoragePath,
      extraction,
      mimeType: resolvedMimeType,
      fileSize,
    });

    return NextResponse.json({
      ok: true,
      document: savedDoc,
      extraction,
      modelUsed,
      usedSimulationFallback,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Unexpected error during clinical extraction.",
      },
      { status: 500 }
    );
  }
}
