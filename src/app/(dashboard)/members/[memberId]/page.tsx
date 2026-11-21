import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileUp } from "lucide-react";
import { getWorkspaceSnapshot } from "@/lib/data/repository";
import { computeHereditaryRisks } from "@/lib/hereditary/computeRisks";
import { HereditaryRiskBanner } from "@/components/family/HereditaryRiskBanner";
import { TimelineFeed } from "@/components/timeline/TimelineFeed";
import { QrShareModal } from "@/components/brief/QrShareModal";
import { PurgeMemberButton } from "@/components/timeline/PurgeMemberButton";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { calculateAge, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MemberTimelinePage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;
  const snapshot = await getWorkspaceSnapshot();

  const member = snapshot.members.find((m) => m.id === memberId);
  if (!member) {
    notFound();
  }

  const memberById = new Map(snapshot.members.map((m) => [m.id, m]));
  const mother = member.mother_id ? memberById.get(member.mother_id) : null;
  const father = member.father_id ? memberById.get(member.father_id) : null;

  const memberEvents = snapshot.events.filter(
    (e) => e.member_id === member.id && e.verified_by_user
  );
  const memberDocs = snapshot.documents.filter(
    (d) => d.member_id === member.id
  );

  const riskRollup = computeHereditaryRisks(
    member.id,
    snapshot.members,
    snapshot.events
  );
  const combinedRiskAlerts = [
    ...riskRollup.paternalAlerts,
    ...riskRollup.maternalAlerts,
    ...riskRollup.directAlerts,
  ];

  const age = calculateAge(member.dob);

  return (
    <div className="space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to Overview</span>
      </Link>

      {/* Clean Member Header */}
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
              <Badge variant="secondary" className="text-primary">
                {member.relationship_label}
              </Badge>
              {member.blood_group && (
                <Badge variant="outline">Blood {member.blood_group}</Badge>
              )}
              {member.is_deceased && (
                <Badge variant="secondary">Deceased</Badge>
              )}
            </div>

            <h1 className="mt-2 text-2xl font-bold tracking-tight">
              {member.full_name}
            </h1>

            <p className="mt-1 text-xs text-muted-foreground">
              {age !== null && !member.is_deceased ? `${age} years old` : ""}
              {member.dob ? ` • Born ${formatDate(member.dob)}` : ""}
              {father ? ` • Father: ${father.full_name}` : ""}
              {mother ? ` • Mother: ${mother.full_name}` : ""}
            </p>

            {member.is_deceased && member.cause_of_death && (
              <p className="mt-2 text-xs text-muted-foreground">
                Cause of death: {member.cause_of_death}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <QrShareModal
              familyId={snapshot.family.id}
              memberId={member.id}
              memberName={member.full_name}
              triggerLabel="Share Doctor QR"
            />

            <Link
              href="/upload"
              className={buttonVariants({ variant: "outline" })}
            >
              <FileUp className="h-4 w-4 text-muted-foreground" />
              <span>Upload</span>
            </Link>

            <PurgeMemberButton
              familyId={snapshot.family.id}
              memberId={member.id}
              memberName={member.full_name}
            />
          </div>
        </div>
      </Card>

      {/* Hereditary Context */}
      {combinedRiskAlerts.length > 0 && (
        <HereditaryRiskBanner
          alerts={combinedRiskAlerts}
          subjectName={member.full_name}
          compact
        />
      )}

      {/* Chronological Timeline */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">
          Clinical Timeline ({memberEvents.length})
        </h2>
        <TimelineFeed events={memberEvents} documents={memberDocs} />
      </div>
    </div>
  );
}
