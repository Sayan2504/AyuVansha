import React from "react";
import { getWorkspaceSnapshot } from "@/lib/data/repository";
import { computeFamilyWideRisks } from "@/lib/hereditary/computeRisks";
import { FamilyDashboardClient } from "@/components/family/FamilyDashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardOverviewPage() {
  const snapshot = await getWorkspaceSnapshot();
  const familyAlerts = computeFamilyWideRisks(
    snapshot.members,
    snapshot.events
  );

  return (
    <FamilyDashboardClient
      family={snapshot.family}
      members={snapshot.members}
      documents={snapshot.documents}
      events={snapshot.events}
      auditLogs={snapshot.auditLogs}
      familyAlerts={familyAlerts}
    />
  );
}
