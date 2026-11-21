"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  FileUp,
  Loader2,
  UploadCloud,
} from "lucide-react";
import { HitlVerificationCard } from "@/components/upload/HitlVerificationCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectDropdown } from "@/components/ui/select-dropdown";
import {
  createClient as createBrowserSupabase,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import type {
  ExtractedMedicalDocument,
  FamilyMemberRow,
  FamilyRow,
  MedicalDocumentRow,
} from "@/types/database";

interface UploadWorkspaceClientProps {
  family: FamilyRow;
  members: FamilyMemberRow[];
  pendingDocuments: MedicalDocumentRow[];
  verifiedDocumentsCount: number;
  actorIdentifier: string;
}

export function UploadWorkspaceClient({
  family,
  members,
  pendingDocuments,
  verifiedDocumentsCount,
  actorIdentifier,
}: UploadWorkspaceClientProps) {
  const router = useRouter();
  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    () =>
      members.find((m) => m.relationship_label.toLowerCase() === "father")
        ?.id ||
      members[0]?.id ||
      ""
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [clinicalNotesHint, setClinicalNotesHint] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [freshExtraction, setFreshExtraction] = useState<{
    document: MedicalDocumentRow;
    extraction: ExtractedMedicalDocument;
    modelUsed: string;
  } | null>(null);

  const memberMap = new Map(members.map((m) => [m.id, m]));

  async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === "string" ? reader.result : "";
        const base64 = result.includes(",") ? result.split(",")[1] : result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleRunExtraction(
    e: React.FormEvent,
    presetHint?: { fileName: string; hint: string }
  ) {
    e.preventDefault();
    if (!selectedMemberId) return;

    setExtractError(null);
    setIsExtracting(true);

    try {
      const docId = crypto.randomUUID();
      const fileName =
        presetHint?.fileName ||
        selectedFile?.name ||
        "handwritten-opd-prescription.jpg";
      const ext = (fileName.split(".").pop() || "jpg").toLowerCase();
      const storagePath = `${family.id}/${selectedMemberId}/${docId}.${ext}`;

      let fileBase64 = "";
      const mimeType = selectedFile?.type || "image/jpeg";

      if (selectedFile) {
        fileBase64 = await fileToBase64(selectedFile);

        if (isSupabaseConfigured()) {
          const supabase = createBrowserSupabase();
          await supabase.storage
            .from("medical-records")
            .upload(storagePath, selectedFile, {
              upsert: true,
              contentType: mimeType,
            });
        }
      }

      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyId: family.id,
          memberId: selectedMemberId,
          documentId: docId,
          storagePath,
          fileBase64,
          mimeType,
          fileName,
          fileSize: selectedFile?.size || 320000,
          clinicalNotesHint: presetHint?.hint || clinicalNotesHint,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Extraction failed");
      }

      setFreshExtraction({
        document: data.document,
        extraction: data.extraction,
        modelUsed: data.modelUsed,
      });
      router.refresh();
    } catch (err) {
      setExtractError(
        err instanceof Error
          ? err.message
          : "Unable to process document. Please try again."
      );
    } finally {
      setIsExtracting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Upload &amp; Review Medical Records
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Upload prescriptions, lab reports, or discharge summaries. Unclear
            handwriting is flagged for your confirmation before saving.
          </p>
        </div>
        <span className="text-xs font-medium text-slate-500">
          {verifiedDocumentsCount} verified • {pendingDocuments.length} pending
        </span>
      </div>

      {/* Upload Card */}
      <form
        onSubmit={handleRunExtraction}
        className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Family Member
            </label>
            <SelectDropdown
              value={selectedMemberId}
              onValueChange={setSelectedMemberId}
              options={members.map((m) => ({
                value: m.id,
                label: `${m.full_name} (${m.relationship_label})`,
              }))}
              className="w-full"
              ariaLabel="Select family member"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Note (Optional)
            </label>
            <Input
              type="text"
              value={clinicalNotesHint}
              onChange={(e) => setClinicalNotesHint(e.target.value)}
              placeholder="e.g., Cardiology follow-up"
            />
          </div>
        </div>

        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-8 text-center transition hover:border-teal-500 hover:bg-teal-50/30">
          <UploadCloud className="h-8 w-8 text-teal-600" />
          <span className="mt-2.5 text-sm font-medium text-slate-900">
            {selectedFile
              ? `${selectedFile.name} (${Math.round(selectedFile.size / 1024)} KB)`
              : "Choose a prescription photo or lab PDF"}
          </span>
          <span className="mt-1 text-xs text-slate-500">
            Supports JPG, PNG, and PDF files
          </span>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            className="hidden"
          />
        </label>

        {extractError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-800">
            {extractError}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <Button
            type="submit"
            disabled={isExtracting || !selectedMemberId}
          >
            {isExtracting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Reading Document...</span>
              </>
            ) : (
              <>
                <FileUp className="h-4 w-4" />
                <span>Extract Clinical Items</span>
              </>
            )}
          </Button>

          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-400">Try sample:</span>
            <button
              type="button"
              disabled={isExtracting || !selectedMemberId}
              onClick={(e) =>
                handleRunExtraction(e, {
                  fileName: "fortis-handwritten-cardiology-rx.jpg",
                  hint: "Handwritten cardiology prescription",
                })
              }
              className="font-medium text-teal-700 hover:underline"
            >
              Sample Prescription
            </button>
            <button
              type="button"
              disabled={isExtracting || !selectedMemberId}
              onClick={(e) =>
                handleRunExtraction(e, {
                  fileName: "apollo-metabolic-hba1c-lab-report.pdf",
                  hint: "Lab report with HbA1c and lipid panel",
                })
              }
              className="font-medium text-teal-700 hover:underline"
            >
              Sample Lab Report
            </button>
          </div>
        </div>
      </form>

      {/* Newly Extracted Card */}
      {freshExtraction && (
        <HitlVerificationCard
          documentId={freshExtraction.document.id}
          familyId={family.id}
          memberId={freshExtraction.document.member_id}
          memberName={
            memberMap.get(freshExtraction.document.member_id)?.full_name ||
            "Family Member"
          }
          storagePath={freshExtraction.document.storage_path}
          actorIdentifier={actorIdentifier}
          initialExtraction={freshExtraction.extraction}
        />
      )}

      {/* Pending Review Queue */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-slate-900">
          Pending Your Review ({pendingDocuments.length})
        </h2>

        {pendingDocuments.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <CheckCircle2 className="mx-auto h-7 w-7 text-teal-600" />
            <p className="mt-2 text-sm font-medium text-slate-900">
              All caught up
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              No uploaded records are waiting for review.
            </p>
          </div>
        ) : (
          pendingDocuments
            .filter((doc) => doc.id !== freshExtraction?.document.id)
            .map((doc) => {
              if (!doc.raw_extraction) return null;
              const member = memberMap.get(doc.member_id);
              return (
                <HitlVerificationCard
                  key={doc.id}
                  documentId={doc.id}
                  familyId={family.id}
                  memberId={doc.member_id}
                  memberName={member?.full_name || "Family Member"}
                  storagePath={doc.storage_path}
                  actorIdentifier={actorIdentifier}
                  initialExtraction={doc.raw_extraction}
                />
              );
            })
        )}
      </div>
    </div>
  );
}
