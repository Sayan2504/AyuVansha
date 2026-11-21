import React from "react";
import { getWorkspaceSnapshot } from "@/lib/data/repository";
import { FamilySwitcherHeader } from "@/components/dashboard/FamilySwitcherHeader";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const snapshot = await getWorkspaceSnapshot();
  const pendingHitlCount = snapshot.documents.filter(
    (d) => d.ocr_status === "needs_review"
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 transition-colors duration-150 dark:bg-slate-950">
      <FamilySwitcherHeader
        activeFamily={snapshot.family}
        families={snapshot.families}
        userEmail={snapshot.currentUser.email}
        isLiveSupabase={snapshot.isLiveSupabase}
        memberCount={snapshot.members.length}
        documentCount={snapshot.documents.length}
        pendingHitlCount={pendingHitlCount}
      />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
