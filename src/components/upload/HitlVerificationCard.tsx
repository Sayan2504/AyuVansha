"use client";

import React, { useState, useTransition } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Plus,
  Trash2,
} from "lucide-react";
import { confirmHitlExtractionAction } from "@/app/actions";
import { DatePicker } from "@/components/ui/date-picker";
import type {
  ConfidenceLevel,
  ExtractedMedicalDocument,
  MedicalDocumentType,
  TimelineEventType,
} from "@/types/database";

interface EditableEventRow {
  id: string;
  event_type: TimelineEventType;
  event_date: string;
  title: string;
  dosage_or_value: string;
  is_active_medication: boolean;
  is_hereditary_condition: boolean;
  confidence: ConfidenceLevel;
  reviewedByCaregiver: boolean;
}

interface HitlVerificationCardProps {
  documentId: string;
  familyId: string;
  memberId: string;
  memberName: string;
  storagePath: string;
  actorIdentifier: string;
  initialExtraction: ExtractedMedicalDocument;
  onVerifiedSuccess?: (insertedCount: number) => void;
}

export function HitlVerificationCard({
  documentId,
  familyId,
  memberId,
  memberName,
  actorIdentifier,
  initialExtraction,
  onVerifiedSuccess,
}: HitlVerificationCardProps) {
  const defaultDate =
    initialExtraction.document_date || new Date().toISOString().slice(0, 10);

  const [documentType, setDocumentType] = useState<MedicalDocumentType>(
    initialExtraction.document_type
  );
  const [documentDate, setDocumentDate] = useState<string>(defaultDate);
  const [doctorOrHospital, setDoctorOrHospital] = useState<string>(
    initialExtraction.doctor_or_hospital || ""
  );

  const [rows, setRows] = useState<EditableEventRow[]>(() =>
    initialExtraction.events.map((ev, index) => ({
      id: `hitl-row-${index}`,
      event_type: ev.event_type,
      event_date: defaultDate,
      title: ev.title,
      dosage_or_value: ev.dosage_or_value ?? "",
      is_active_medication: ev.is_active_medication,
      is_hereditary_condition: ev.is_hereditary_condition,
      confidence: ev.confidence,
      reviewedByCaregiver: ev.confidence === "high" && ev.dosage_or_value !== null,
    }))
  );

  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isCommitted, setIsCommitted] = useState(false);

  const amberFlaggedCount = rows.filter(
    (r) => r.confidence !== "high" || r.dosage_or_value.trim() === ""
  ).length;

  function updateRow(id: string, patch: Partial<EditableEventRow>) {
    setRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              ...patch,
              reviewedByCaregiver: true,
            }
          : row
      )
    );
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((row) => row.id !== id));
  }

  function addManualRow() {
    setRows((prev) => [
      ...prev,
      {
        id: `hitl-manual-${Date.now()}`,
        event_type: "medication",
        event_date: documentDate || new Date().toISOString().slice(0, 10),
        title: "",
        dosage_or_value: "",
        is_active_medication: true,
        is_hereditary_condition: false,
        confidence: "high",
        reviewedByCaregiver: true,
      },
    ]);
  }

  function handleConfirmAndSave(e: React.FormEvent) {
    e.preventDefault();
    setStatusMessage(null);

    const validRows = rows.filter((r) => r.title.trim().length > 0);
    if (validRows.length === 0) {
      setStatusMessage({
        type: "error",
        text: "Please keep at least one item before saving.",
      });
      return;
    }

    startTransition(async () => {
      try {
        const result = await confirmHitlExtractionAction({
          documentId,
          familyId,
          memberId,
          documentType,
          documentDate: documentDate || null,
          doctorOrHospital: doctorOrHospital.trim() || null,
          actorIdentifier,
          verifiedEvents: validRows.map((r) => ({
            event_type: r.event_type,
            event_date: r.event_date || documentDate,
            title: r.title.trim(),
            dosage_or_value: r.dosage_or_value.trim() || null,
            is_active_medication: r.is_active_medication,
            is_hereditary_condition: r.is_hereditary_condition,
            confidence: r.confidence,
          })),
        });

        if (result.ok) {
          setIsCommitted(true);
          setStatusMessage({
            type: "success",
            text: `Saved ${result.insertedCount} verified item(s) to ${memberName}'s timeline.`,
          });
          onVerifiedSuccess?.(result.insertedCount);
        }
      } catch (err) {
        setStatusMessage({
          type: "error",
          text:
            err instanceof Error
              ? err.message
              : "Failed to save verified records.",
        });
      }
    });
  }

  if (isCommitted) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <h3 className="text-sm font-semibold text-emerald-950">
              Saved to Timeline
            </h3>
            <p className="text-xs text-emerald-800">{statusMessage?.text}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleConfirmAndSave}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Review Extracted Details — {memberName}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {amberFlaggedCount > 0
              ? `${amberFlaggedCount} item(s) highlighted in amber need your confirmation before saving.`
              : "All items look clear. Confirm details below to add to timeline."}
          </p>
        </div>

        <button
          type="button"
          onClick={addManualRow}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Item
        </button>
      </div>

      {/* Document Metadata */}
      <div className="grid gap-4 border-b border-slate-100 bg-slate-50/60 px-6 py-4 sm:grid-cols-3">
        <div>
          <label className="block text-xs font-medium text-slate-600">
            Document Type
          </label>
          <select
            value={documentType}
            onChange={(e) =>
              setDocumentType(e.target.value as MedicalDocumentType)
            }
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
          >
            <option value="prescription">Prescription</option>
            <option value="lab_report">Lab Report</option>
            <option value="discharge_summary">Discharge Summary</option>
            <option value="vaccination">Vaccination Record</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Date
          </label>
          <DatePicker
            value={documentDate}
            onChange={setDocumentDate}
            placeholder="Select date"
            ariaLabel="Document date"
            triggerClassName={
              !initialExtraction.document_date
                ? "border-amber-400 bg-amber-50 text-amber-950"
                : ""
            }
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600">
            Doctor or Hospital
          </label>
          <input
            type="text"
            value={doctorOrHospital}
            onChange={(e) => setDoctorOrHospital(e.target.value)}
            placeholder="e.g., Dr. Sharma / Fortis Clinic"
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
          />
        </div>
      </div>

      {/* Extracted Items */}
      <div className="space-y-3 p-6">
        {rows.map((row) => {
          const isAmberFlagged =
            row.confidence === "medium" ||
            row.confidence === "low" ||
            row.dosage_or_value.trim() === "";

          return (
            <div
              key={row.id}
              className={`rounded-xl border p-4 ${
                isAmberFlagged
                  ? "border-amber-300 bg-amber-50/60"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {isAmberFlagged ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-800">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                      {row.dosage_or_value.trim() === ""
                        ? "Dosage or value unclear — please enter"
                        : "Please verify handwriting"}
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-emerald-700">
                      Verified match
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Remove</span>
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-12">
                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-medium text-slate-500">
                    Category
                  </label>
                  <select
                    value={row.event_type}
                    onChange={(e) =>
                      updateRow(row.id, {
                        event_type: e.target.value as TimelineEventType,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-900"
                  >
                    <option value="medication">Medication</option>
                    <option value="diagnosis">Diagnosis</option>
                    <option value="allergy">Allergy</option>
                    <option value="surgery">Surgery</option>
                    <option value="lab_abnormal">Lab Result</option>
                  </select>
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-medium text-slate-500">
                    Name
                  </label>
                  <input
                    type="text"
                    required
                    value={row.title}
                    onChange={(e) =>
                      updateRow(row.id, { title: e.target.value })
                    }
                    placeholder="Drug or condition name"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-900"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-medium text-slate-500">
                    Dosage / Value
                  </label>
                  <input
                    type="text"
                    value={row.dosage_or_value}
                    onChange={(e) =>
                      updateRow(row.id, { dosage_or_value: e.target.value })
                    }
                    placeholder="Enter dosage or value"
                    className={`mt-1 w-full rounded-lg border px-2.5 py-1.5 text-xs ${
                      row.dosage_or_value.trim() === ""
                        ? "border-amber-400 bg-white placeholder:text-amber-700"
                        : "border-slate-300 bg-white"
                    }`}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                    Date
                  </label>
                  <DatePicker
                    value={row.event_date}
                    onChange={(val) => updateRow(row.id, { event_date: val })}
                    placeholder="Select date"
                    compact
                    ariaLabel="Event date"
                  />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-5 text-xs text-slate-600">
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={row.is_active_medication}
                    onChange={(e) =>
                      updateRow(row.id, {
                        is_active_medication: e.target.checked,
                      })
                    }
                    className="h-3.5 w-3.5 rounded border-slate-300 text-teal-600"
                  />
                  <span>Active medication</span>
                </label>

                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={row.is_hereditary_condition}
                    onChange={(e) =>
                      updateRow(row.id, {
                        is_hereditary_condition: e.target.checked,
                      })
                    }
                    className="h-3.5 w-3.5 rounded border-slate-300 text-amber-600"
                  />
                  <span>Hereditary condition</span>
                </label>
              </div>
            </div>
          );
        })}
      </div>

      {statusMessage && (
        <div
          className={`mx-6 mb-4 rounded-xl px-4 py-3 text-xs font-medium ${
            statusMessage.type === "error"
              ? "border border-rose-200 bg-rose-50 text-rose-800"
              : "border border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-end border-t border-slate-100 bg-slate-50/70 px-6 py-4">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-2xs transition hover:bg-teal-700 disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Confirm & Save to Timeline"}
        </button>
      </div>
    </form>
  );
}
