"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  FileUp,
  History,
  UserPlus,
  X,
} from "lucide-react";
import {
  addFamilyMemberAction,
  switchSubscriptionTierAction,
} from "@/app/actions";
import { HereditaryRiskBanner } from "@/components/family/HereditaryRiskBanner";
import { QrShareModal } from "@/components/brief/QrShareModal";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { SelectDropdown } from "@/components/ui/select-dropdown";
import {
  computeHereditaryRisks,
  type HereditaryConditionAlert,
} from "@/lib/hereditary/computeRisks";
import { calculateAge } from "@/lib/utils";
import {
  SUBSCRIPTION_TIER_LIMITS,
  type AuditLogRow,
  type BiologicalSex,
  type FamilyMemberRow,
  type FamilyRow,
  type MedicalDocumentRow,
  type SubscriptionTier,
  type TimelineEventRow,
} from "@/types/database";

interface FamilyDashboardClientProps {
  family: FamilyRow;
  members: FamilyMemberRow[];
  documents: MedicalDocumentRow[];
  events: TimelineEventRow[];
  auditLogs: AuditLogRow[];
  familyAlerts: HereditaryConditionAlert[];
}

export function FamilyDashboardClient({
  family,
  members,
  documents,
  events,
  auditLogs,
  familyAlerts,
}: FamilyDashboardClientProps) {
  const router = useRouter();
  const [selectedRiskSubjectId, setSelectedRiskSubjectId] = useState<string>(
    () =>
      members.find((m) => m.relationship_label.toLowerCase() === "self")?.id ||
      members[0]?.id ||
      ""
  );
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");

  // Add Member Form State
  const [fullName, setFullName] = useState("");
  const [relationshipLabel, setRelationshipLabel] = useState("Mother");
  const [dob, setDob] = useState("");
  const [biologicalSex, setBiologicalSex] = useState<BiologicalSex>("female");
  const [bloodGroup, setBloodGroup] = useState("O+");
  const [isDeceased, setIsDeceased] = useState(false);
  const [causeOfDeath, setCauseOfDeath] = useState("");
  const [motherId, setMotherId] = useState("");
  const [fatherId, setFatherId] = useState("");
  const [consentVerified, setConsentVerified] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const memberById = new Map(members.map((m) => [m.id, m]));
  const selectedSubject = memberById.get(selectedRiskSubjectId) || members[0];
  const computedRollup = selectedSubject
    ? computeHereditaryRisks(selectedSubject.id, members, events)
    : null;

  const displayedAlerts =
    computedRollup &&
    (computedRollup.paternalAlerts.length > 0 ||
      computedRollup.maternalAlerts.length > 0)
      ? [...computedRollup.paternalAlerts, ...computedRollup.maternalAlerts]
      : familyAlerts;

  const pendingHitlDocs = documents.filter(
    (d) => d.ocr_status === "needs_review"
  );
  const tierConfig = SUBSCRIPTION_TIER_LIMITS[family.subscription_tier];

  const filteredMembers = memberSearch.trim()
    ? members.filter((m) => {
        const q = memberSearch.toLowerCase();
        return (
          m.full_name.toLowerCase().includes(q) ||
          m.relationship_label.toLowerCase().includes(q) ||
          (m.blood_group || "").toLowerCase().includes(q)
        );
      })
    : members;

  function handleAddMemberSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    startTransition(async () => {
      const res = await addFamilyMemberAction({
        familyId: family.id,
        fullName,
        relationshipLabel,
        dob: dob || null,
        biologicalSex,
        bloodGroup: bloodGroup || null,
        isDeceased,
        causeOfDeath: isDeceased ? causeOfDeath || null : null,
        motherId: motherId || null,
        fatherId: fatherId || null,
        consentVerified,
      });

      if (!res.ok) {
        setFormError(res.error || "Failed to add family member");
        return;
      }

      setFullName("");
      setDob("");
      setCauseOfDeath("");
      setMotherId("");
      setFatherId("");
      setShowAddMemberModal(false);
      router.refresh();
    });
  }

  function handleSelectTier(tier: SubscriptionTier) {
    startTransition(async () => {
      await switchSubscriptionTierAction({
        familyId: family.id,
        tier,
      });
      setShowPlansModal(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      {/* Clean Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {family.name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {members.length} family member{members.length === 1 ? "" : "s"} •{" "}
            {events.filter((e) => e.verified_by_user).length} verified clinical
            records •{" "}
            <button
              type="button"
              onClick={() => setShowPlansModal(true)}
              className="font-medium text-teal-700 hover:underline"
            >
              {tierConfig.label} Plan
            </button>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowAddMemberModal(true)}
          >
            <UserPlus className="h-4 w-4 text-muted-foreground" />
            <span>Add Member</span>
          </Button>

          <Link href="/upload" className={buttonVariants({ variant: "default" })}>
            <FileUp className="h-4 w-4" />
            <span>Upload Record</span>
          </Link>
        </div>
      </div>

      {/* Slim Pending Review Notification */}
      {pendingHitlDocs.length > 0 && (
        <Link
          href="/upload"
          className="flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm transition hover:bg-amber-50"
        >
          <div className="flex items-center gap-2.5 text-amber-900">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span>
              <strong>{pendingHitlDocs.length} uploaded document</strong>{" "}
              {pendingHitlDocs.length === 1 ? "needs" : "need"} your review
              before adding to the timeline.
            </span>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800">
            Review <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      )}

      {/* Family Members Grid */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Family Members</h2>
          <SearchInput
            value={memberSearch}
            onChange={setMemberSearch}
            placeholder="Search family members..."
            containerClassName="w-full sm:w-64"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredMembers.map((member) => {
            const age = calculateAge(member.dob);
            const memberEvents = events.filter(
              (e) => e.member_id === member.id && e.verified_by_user
            );
            const activeMedsCount = memberEvents.filter(
              (e) => e.event_type === "medication" && e.details?.is_active
            ).length;
            const allergiesCount = memberEvents.filter(
              (e) => e.event_type === "allergy"
            ).length;

            return (
              <Card
                key={member.id}
                className="flex flex-col justify-between p-5 transition-colors hover:border-foreground/20"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-medium text-primary">
                        {member.relationship_label}
                        {member.is_deceased ? " • Deceased" : ""}
                      </span>
                      <h3 className="mt-0.5 text-base font-semibold">
                        {member.full_name}
                      </h3>
                    </div>

                    {member.blood_group && (
                      <Badge variant="secondary">{member.blood_group}</Badge>
                    )}
                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    {age !== null && !member.is_deceased
                      ? `${age} yrs`
                      : member.is_deceased && member.cause_of_death
                      ? member.cause_of_death
                      : "Age not specified"}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                    <span>{memberEvents.length} records</span>
                    {activeMedsCount > 0 && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span>{activeMedsCount} active meds</span>
                      </>
                    )}
                    {allergiesCount > 0 && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="font-medium text-rose-600">
                          {allergiesCount} allerg
                          {allergiesCount === 1 ? "y" : "ies"}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between gap-2 border-t border-border pt-3.5">
                  <Link
                    href={`/members/${member.id}`}
                    className={buttonVariants({
                      variant: "ghost",
                      size: "sm",
                      className: "-ml-2 text-xs",
                    })}
                  >
                    View Timeline →
                  </Link>

                  <QrShareModal
                    familyId={family.id}
                    memberId={member.id}
                    memberName={member.full_name}
                    triggerLabel="Share QR"
                    compact
                  />
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Hereditary Risk Summary */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Hereditary Risk Map</h2>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Perspective:</span>
            <SelectDropdown
              value={selectedSubject?.id || ""}
              onValueChange={setSelectedRiskSubjectId}
              options={members.map((m) => ({
                value: m.id,
                label: `${m.full_name} (${m.relationship_label})`,
              }))}
              className="w-56"
              align="right"
              ariaLabel="Select hereditary risk perspective"
            />
          </div>
        </div>

        <HereditaryRiskBanner
          alerts={displayedAlerts}
          subjectName={
            selectedSubject
              ? `${selectedSubject.full_name}`
              : family.name
          }
        />
      </section>

      {/* Collapsible Activity & Access Log (Uncluttered by default) */}
      <section className="rounded-2xl border border-slate-200 bg-white">
        <button
          type="button"
          onClick={() => setShowAuditLogs((v) => !v)}
          className="flex w-full items-center justify-between px-5 py-3.5 text-left"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <History className="h-4 w-4 text-slate-400" />
            <span>Access &amp; Privacy Activity Log</span>
            <span className="text-xs text-slate-400">
              ({auditLogs.length} events)
            </span>
          </div>
          {showAuditLogs ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </button>

        {showAuditLogs && (
          <div className="divide-y divide-slate-100 border-t border-slate-100">
            {auditLogs.slice(0, 10).map((log) => {
              const relatedMember = log.member_id
                ? memberById.get(log.member_id)
                : null;
              return (
                <div
                  key={log.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 text-xs text-slate-600"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900">
                      {log.action.replaceAll("_", " ")}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span>{log.actor_identifier}</span>
                    {relatedMember && (
                      <>
                        <span className="text-slate-400">•</span>
                        <span>{relatedMember.full_name}</span>
                      </>
                    )}
                  </div>
                  <span className="text-slate-400">
                    {new Date(log.created_at).toLocaleString("en-IN")}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Add Family Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-base font-semibold text-slate-900">
                Add Family Member
              </h3>
              <button
                type="button"
                onClick={() => setShowAddMemberModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddMemberSubmit} className="space-y-4 p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g., Meera Sharma"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Relationship
                  </label>
                  <input
                    type="text"
                    required
                    value={relationshipLabel}
                    onChange={(e) => setRelationshipLabel(e.target.value)}
                    placeholder="e.g., Mother, Father"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Date of Birth
                  </label>
                  <DatePicker
                    value={dob}
                    onChange={setDob}
                    placeholder="Select DOB"
                    ariaLabel="Date of Birth"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Sex
                  </label>
                  <SelectDropdown
                    value={biologicalSex}
                    onValueChange={(val) =>
                      setBiologicalSex(val as BiologicalSex)
                    }
                    options={[
                      { value: "female", label: "Female" },
                      { value: "male", label: "Male" },
                      { value: "other", label: "Other" },
                    ]}
                    className="w-full"
                    ariaLabel="Sex"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Blood Group
                  </label>
                  <SelectDropdown
                    value={bloodGroup}
                    onValueChange={setBloodGroup}
                    options={["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"].map(
                      (bg) => ({ value: bg, label: bg })
                    )}
                    className="w-full"
                    ariaLabel="Blood Group"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Mother (Optional)
                  </label>
                  <SelectDropdown
                    value={motherId}
                    onValueChange={setMotherId}
                    options={[
                      { value: "", label: "Not linked" },
                      ...members.map((m) => ({
                        value: m.id,
                        label: `${m.full_name} (${m.relationship_label})`,
                      })),
                    ]}
                    className="w-full"
                    ariaLabel="Mother"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Father (Optional)
                  </label>
                  <SelectDropdown
                    value={fatherId}
                    onValueChange={setFatherId}
                    options={[
                      { value: "", label: "Not linked" },
                      ...members.map((m) => ({
                        value: m.id,
                        label: `${m.full_name} (${m.relationship_label})`,
                      })),
                    ]}
                    className="w-full"
                    ariaLabel="Father"
                  />
                </div>
              </div>

              <div className="space-y-2.5 pt-1 text-xs">
                <label className="flex cursor-pointer items-center gap-2 font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={isDeceased}
                    onChange={(e) => setIsDeceased(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-teal-600"
                  />
                  <span>Deceased relative</span>
                </label>

                {isDeceased && (
                  <input
                    type="text"
                    value={causeOfDeath}
                    onChange={(e) => setCauseOfDeath(e.target.value)}
                    placeholder="Recorded cause of death (optional)"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                )}

                <label className="flex cursor-pointer items-center gap-2 font-medium text-slate-700">
                  <input
                    type="checkbox"
                    required
                    checked={consentVerified}
                    onChange={(e) => setConsentVerified(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-teal-600"
                  />
                  <span>Family caregiver consent verified</span>
                </label>
              </div>

              {formError && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddMemberModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Saving..." : "Save Member"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Plans Modal */}
      {showPlansModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Subscription Plans
                </h3>
                <p className="text-xs text-slate-500">
                  Switch tiers to test member and document limits.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPlansModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {(
                Object.keys(SUBSCRIPTION_TIER_LIMITS) as SubscriptionTier[]
              ).map((tierKey) => {
                const tier = SUBSCRIPTION_TIER_LIMITS[tierKey];
                const isCurrent = family.subscription_tier === tierKey;

                return (
                  <div
                    key={tierKey}
                    className={`flex flex-col justify-between rounded-2xl border p-5 ${
                      isCurrent
                        ? "border-teal-600 bg-teal-50/40"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">
                        {tier.label}
                      </h4>
                      <p className="mt-1 text-xl font-bold text-slate-900">
                        {tier.priceMonthly}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        {tier.description}
                      </p>
                      <ul className="mt-4 space-y-2 text-xs text-slate-700">
                        <li className="flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5 text-teal-600" />
                          <span>
                            {tier.maxMembers === null
                              ? "Unlimited"
                              : tier.maxMembers}{" "}
                            member{tier.maxMembers === 1 ? "" : "s"}
                          </span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5 text-teal-600" />
                          <span>
                            {tier.maxDocuments === null
                              ? "Unlimited"
                              : tier.maxDocuments}{" "}
                            documents
                          </span>
                        </li>
                      </ul>
                    </div>

                    <button
                      type="button"
                      disabled={isCurrent || isPending}
                      onClick={() => handleSelectTier(tierKey)}
                      className={`mt-5 w-full rounded-xl py-2 text-xs font-semibold transition ${
                        isCurrent
                          ? "bg-slate-200 text-slate-600"
                          : "bg-slate-900 text-white hover:bg-slate-800"
                      }`}
                    >
                      {isCurrent ? "Current Plan" : "Select Plan"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
