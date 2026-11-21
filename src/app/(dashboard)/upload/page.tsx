import React from "react";
import { getWorkspaceSnapshot } from "@/lib/data/repository";
import { UploadWorkspaceClient } from "@/components/upload/UploadWorkspaceClient";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const snapshot = await getWorkspaceSnapshot();
  const pendingDocuments = snapshot.documents.filter(
    (d) => d.ocr_status === "needs_review" && d.raw_extraction !== null
  );
  const verifiedDocumentsCount = snapshot.documents.filter(
    (d) => d.ocr_status === "verified"
  ).length;

  return (
    <UploadWorkspaceClient
      family={snapshot.family}
      members={snapshot.members}
      pendingDocuments={pendingDocuments}
      verifiedDocumentsCount={verifiedDocumentsCount}
      actorIdentifier={snapshot.currentUser.email}
    />
  );
}
