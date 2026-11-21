"use client";

import React, { useMemo, useState } from "react";
import {
  Activity,
  AlertOctagon,
  Calendar,
  CheckCircle2,
  Dna,
  FlaskConical,
  Pill,
  Scissors,
  Stethoscope,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/search-input";
import { SegmentedTabs } from "@/components/ui/tabs";
import { formatDate } from "@/lib/utils";
import type {
  MedicalDocumentRow,
  TimelineEventRow,
  TimelineEventType,
} from "@/types/database";

interface TimelineFeedProps {
  events: TimelineEventRow[];
  documents?: MedicalDocumentRow[];
}

const EVENT_TYPE_META: Record<
  TimelineEventType,
  {
    label: string;
    badgeClass: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  allergy: {
    label: "Allergy Alert",
    badgeClass: "bg-rose-100 text-rose-900 border-rose-300",
    icon: AlertOctagon,
  },
  medication: {
    label: "Medication",
    badgeClass: "bg-teal-100 text-teal-900 border-teal-300",
    icon: Pill,
  },
  diagnosis: {
    label: "Diagnosis",
    badgeClass: "bg-indigo-100 text-indigo-900 border-indigo-300",
    icon: Stethoscope,
  },
  surgery: {
    label: "Surgery / Procedure",
    badgeClass: "bg-purple-100 text-purple-900 border-purple-300",
    icon: Scissors,
  },
  lab_abnormal: {
    label: "Abnormal Lab Marker",
    badgeClass: "bg-amber-100 text-amber-950 border-amber-300",
    icon: FlaskConical,
  },
};

export function TimelineFeed({ events, documents = [] }: TimelineFeedProps) {
  const [selectedType, setSelectedType] = useState<TimelineEventType | "all">(
    "all"
  );
  const [onlyHereditary, setOnlyHereditary] = useState(false);
  const [onlyActiveMeds, setOnlyActiveMeds] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const docMap = useMemo(
    () => new Map(documents.map((d) => [d.id, d])),
    [documents]
  );

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (selectedType !== "all" && ev.event_type !== selectedType) {
        return false;
      }
      if (onlyHereditary && !ev.is_hereditary_flag) {
        return false;
      }
      if (
        onlyActiveMeds &&
        !(ev.event_type === "medication" && ev.details?.is_active)
      ) {
        return false;
      }
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const inTitle = ev.title.toLowerCase().includes(q);
        const inDetails = JSON.stringify(ev.details || {})
          .toLowerCase()
          .includes(q);
        if (!inTitle && !inDetails) return false;
      }
      return true;
    });
  }, [events, selectedType, onlyHereditary, onlyActiveMeds, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Filter Toolbar */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SegmentedTabs
            value={selectedType}
            onValueChange={setSelectedType}
            items={[
              { value: "all", label: "All Events" },
              { value: "diagnosis", label: "Diagnoses" },
              { value: "medication", label: "Medications" },
              { value: "allergy", label: "Allergies" },
              { value: "surgery", label: "Surgeries" },
              { value: "lab_abnormal", label: "Lab Markers" },
            ]}
          />

          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search drug, lab, diagnosis..."
            containerClassName="min-w-[220px] flex-1 sm:max-w-xs"
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-border pt-3 text-xs">
          <label className="inline-flex cursor-pointer items-center gap-2 font-medium text-muted-foreground hover:text-foreground">
            <input
              type="checkbox"
              checked={onlyHereditary}
              onChange={(e) => setOnlyHereditary(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-input text-primary"
            />
            <span>Hereditary Conditions Only</span>
          </label>

          <label className="inline-flex cursor-pointer items-center gap-2 font-medium text-muted-foreground hover:text-foreground">
            <input
              type="checkbox"
              checked={onlyActiveMeds}
              onChange={(e) => setOnlyActiveMeds(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-input text-primary"
            />
            <span>Active Ongoing Medications Only</span>
          </label>

          <span className="ml-auto text-xs font-medium text-muted-foreground">
            Showing {filteredEvents.length} of {events.length} verified events
          </span>
        </div>
      </Card>

      {/* Chronological Timeline List */}
      {filteredEvents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Activity className="mx-auto h-8 w-8 text-slate-400" />
          <h3 className="mt-2 text-sm font-bold text-slate-800">
            No matching clinical timeline events
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Adjust your filters or upload a prescription/lab report via the HITL
            extraction pipeline.
          </p>
        </div>
      ) : (
        <div className="relative space-y-3 before:absolute before:top-4 before:bottom-4 before:left-5 before:w-0.5 before:bg-slate-200">
          {filteredEvents.map((ev) => {
            const meta = EVENT_TYPE_META[ev.event_type];
            const Icon = meta.icon;
            const sourceDoc = ev.document_id
              ? docMap.get(ev.document_id)
              : undefined;

            return (
              <div
                key={ev.id}
                className="relative flex items-start gap-4 pl-2"
              >
                <div className="z-10 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-white bg-slate-900 text-white shadow-xs">
                  <Icon className="h-3.5 w-3.5" />
                </div>

                <div className="flex-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs transition hover:border-slate-300">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold ${meta.badgeClass}`}
                      >
                        {meta.label}
                      </span>

                      {ev.details?.is_active && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                          Active Medication
                        </span>
                      )}

                      {ev.is_hereditary_flag && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                          <Dna className="h-3 w-3" /> Hereditary Flag
                        </span>
                      )}

                      {ev.verified_by_user && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" /> HITL Verified
                        </span>
                      )}
                    </div>

                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      {formatDate(ev.event_date)}
                    </span>
                  </div>

                  <h4 className="mt-2 text-base font-bold text-slate-900">
                    {ev.title}
                  </h4>

                  {/* Clinical Details */}
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-700">
                    {ev.details?.dosage && (
                      <span>
                        <strong className="text-slate-900">Dosage:</strong>{" "}
                        {ev.details.dosage}
                      </span>
                    )}
                    {ev.details?.frequency && (
                      <span>
                        <strong className="text-slate-900">Frequency:</strong>{" "}
                        {ev.details.frequency}
                      </span>
                    )}
                    {ev.details?.lab_value && (
                      <span className="rounded bg-amber-50 px-1.5 py-0.5 font-mono font-bold text-amber-950">
                        Value: {ev.details.lab_value}
                      </span>
                    )}
                    {ev.details?.reference_range && (
                      <span className="text-slate-500">
                        Ref: {ev.details.reference_range}
                      </span>
                    )}
                    {ev.details?.notes && <span>{ev.details.notes}</span>}
                  </div>

                  {sourceDoc && (
                    <div className="mt-2.5 border-t border-slate-100 pt-2 text-[11px] text-slate-500">
                      Source Record:{" "}
                      <span className="font-semibold text-slate-700">
                        {sourceDoc.hospital_or_doctor || sourceDoc.doc_type}
                      </span>{" "}
                      ({formatDate(sourceDoc.doc_date)})
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
