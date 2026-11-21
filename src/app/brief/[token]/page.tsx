import React from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import {
  AlertOctagon,
  Clock,
  Dna,
  FlaskConical,
  HeartPulse,
  Pill,
  ShieldAlert,
  Stethoscope,
} from "lucide-react";
import {
  appendAuditLog,
  lookupDoctorBriefByToken,
} from "@/lib/data/repository";
import { computeHereditaryRisks } from "@/lib/hereditary/computeRisks";
import { DoctorBriefPinGate } from "@/components/brief/DoctorBriefPinGate";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { calculateAge, formatDate, sha256Hex } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EphemeralDoctorBriefPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const lookup = await lookupDoctorBriefByToken(token);

  if (lookup.status !== "valid" || !lookup.member || !lookup.shareToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <h1 className="mt-4 text-base font-semibold text-slate-900">
            {lookup.status === "revoked"
              ? "Consultation Link Revoked"
              : lookup.status === "expired"
              ? "Consultation Link Expired"
              : "Invalid Consultation Link"}
          </h1>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
            Doctor QR links expire after 30 minutes for patient privacy. Ask the
            caregiver to generate a new code.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex items-center justify-center rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700"
          >
            Back to AyuVansha
          </Link>
        </div>
      </div>
    );
  }

  const { member, shareToken, familyMembers = [], familyEvents = [] } = lookup;

  if (lookup.requiresPin) {
    const tokenHash = sha256Hex(token);
    const cookieStore = await cookies();
    const verifiedCookie = cookieStore.get(
      `ayuvansha_pin_${tokenHash.slice(0, 16)}`
    );

    if (verifiedCookie?.value !== "verified") {
      return (
        <DoctorBriefPinGate token={token} patientName={member.full_name} />
      );
    }
  } else {
    await appendAuditLog({
      familyId: shareToken.family_id,
      memberId: member.id,
      actorType: "doctor_qr_session",
      actorIdentifier: `Doctor QR Session (${token.slice(0, 8)})`,
      action: "VIEWED_QR_BRIEF",
    });
  }

  const patientEvents = familyEvents
    .filter((e) => e.member_id === member.id && e.verified_by_user)
    .sort((a, b) => b.event_date.localeCompare(a.event_date));

  const allergies = patientEvents.filter((e) => e.event_type === "allergy");
  const activeMedications = patientEvents.filter(
    (e) => e.event_type === "medication" && e.details?.is_active !== false
  );
  const chronicAndSurgeries = patientEvents.filter(
    (e) => e.event_type === "diagnosis" || e.event_type === "surgery"
  );
  const recentAbnormalLabs = patientEvents
    .filter((e) => e.event_type === "lab_abnormal")
    .slice(0, 3);

  const hereditaryRollup = computeHereditaryRisks(
    member.id,
    familyMembers,
    familyEvents
  );

  const age = calculateAge(member.dob);
  const expiresDate = new Date(shareToken.expires_at);
  const minutesRemaining = Math.max(
    1,
    Math.ceil((expiresDate.getTime() - Date.now()) / 60000)
  );

  return (
    <div className="min-h-screen bg-slate-100 px-3 py-4 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Top Bar */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <div className="flex items-center gap-2">
            <HeartPulse className="h-4 w-4 text-teal-600" />
            <span className="text-xs font-semibold text-slate-900">
              AyuVansha • Clinical Brief
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
              <Clock className="h-3.5 w-3.5" /> Expires in {minutesRemaining}m
            </span>
            <ThemeToggle />
          </div>
        </div>

        {/* 1. Critical Alerts Bar (Red) */}
        <section
          aria-label="Critical Alerts"
          className="bg-red-600 px-5 py-4 text-white"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                {member.full_name}
              </h1>
              <p className="text-xs text-red-100">
                {member.relationship_label}
                {age !== null ? ` • ${age} yrs` : ""}
                {member.biological_sex
                  ? ` • ${member.biological_sex.toUpperCase()}`
                  : ""}
                {member.blood_group ? ` • Blood ${member.blood_group}` : ""}
              </p>
            </div>
          </div>

          <div className="mt-3 rounded-xl bg-red-700/80 p-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-red-100">
              <AlertOctagon className="h-3.5 w-3.5" />
              <span>Allergies</span>
            </div>
            {allergies.length === 0 ? (
              <p className="mt-1 text-xs text-red-100">
                No known drug or food allergies recorded.
              </p>
            ) : (
              <ul className="mt-1.5 space-y-1 text-xs">
                {allergies.map((al) => (
                  <li key={al.id} className="font-semibold">
                    {al.title}
                    {al.details?.notes ? ` — ${al.details.notes}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <div className="divide-y divide-slate-100 p-5">
          {/* 2. Active Medications */}
          <section className="pb-5">
            <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <Pill className="h-4 w-4 text-teal-600" />
              <span>Active Medications ({activeMedications.length})</span>
            </h2>

            {activeMedications.length === 0 ? (
              <p className="text-xs text-slate-400">
                No active medications recorded.
              </p>
            ) : (
              <div className="space-y-2">
                {activeMedications.map((med) => (
                  <div
                    key={med.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {med.title}
                      </p>
                      <p className="text-xs text-slate-600">
                        {[med.details?.dosage, med.details?.frequency]
                          .filter(Boolean)
                          .join(" • ") || "Standard dose"}
                      </p>
                    </div>
                    <span className="text-xs text-slate-400">
                      Since {formatDate(med.event_date)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 3. Chronic Conditions & Past Surgeries */}
          <section className="py-5">
            <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <Stethoscope className="h-4 w-4 text-indigo-600" />
              <span>
                Conditions &amp; Surgeries ({chronicAndSurgeries.length})
              </span>
            </h2>

            {chronicAndSurgeries.length === 0 ? (
              <p className="text-xs text-slate-400">
                No chronic conditions or surgeries recorded.
              </p>
            ) : (
              <ul className="space-y-2">
                {chronicAndSurgeries.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-2 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-900">
                        {item.title}
                      </span>
                      {item.details?.notes && (
                        <p className="text-slate-500">{item.details.notes}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-slate-400">
                      {formatDate(item.event_date)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* 4. Family Hereditary Risk Summary */}
          <section className="py-5">
            <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <Dna className="h-4 w-4 text-amber-600" />
              <span>Family Hereditary History</span>
            </h2>

            {hereditaryRollup.allSummaries.length === 0 ? (
              <p className="text-xs text-slate-400">
                No hereditary conditions recorded in family lineage.
              </p>
            ) : (
              <ul className="space-y-1.5 text-xs text-slate-700">
                {hereditaryRollup.allSummaries.map((summary) => (
                  <li
                    key={summary}
                    className="rounded-lg bg-amber-50/70 px-3 py-2 font-medium text-amber-950"
                  >
                    {summary}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* 5. Recent Abnormal Lab Markers */}
          <section className="pt-5">
            <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <FlaskConical className="h-4 w-4 text-amber-600" />
              <span>Recent Abnormal Labs</span>
            </h2>

            {recentAbnormalLabs.length === 0 ? (
              <p className="text-xs text-slate-400">
                No abnormal lab results recorded.
              </p>
            ) : (
              <div className="grid gap-2.5 sm:grid-cols-3">
                {recentAbnormalLabs.map((lab) => (
                  <div
                    key={lab.id}
                    className="rounded-xl border border-slate-200 p-3"
                  >
                    <p className="text-xs font-semibold text-slate-900">
                      {lab.title}
                    </p>
                    <p className="mt-1 text-sm font-bold text-amber-700">
                      {lab.details?.lab_value ||
                        lab.details?.dosage ||
                        "Abnormal"}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {formatDate(lab.event_date)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-3 text-[11px] text-slate-500">
          <span>Caregiver-verified summary • AyuVansha</span>
          <Link href="/" className="font-medium text-teal-700 hover:underline">
            Dashboard →
          </Link>
        </div>
      </div>
    </div>
  );
}
