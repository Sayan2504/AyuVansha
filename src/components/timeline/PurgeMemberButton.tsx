"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ShieldAlert, Trash2, X } from "lucide-react";
import { purgeMemberDataAction } from "@/app/actions";

interface PurgeMemberButtonProps {
  familyId: string;
  memberId: string;
  memberName: string;
}

export function PurgeMemberButton({
  familyId,
  memberId,
  memberName,
}: PurgeMemberButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function handleConfirmPurge(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    startTransition(async () => {
      try {
        const res = await purgeMemberDataAction({
          familyId,
          memberId,
        });
        if (res.ok) {
          setIsOpen(false);
          router.push("/");
          router.refresh();
        }
      } catch (err) {
        setErrorMsg(
          err instanceof Error
            ? err.message
            : "Failed to purge member data and storage objects."
        );
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-800 transition hover:bg-rose-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
        <span>Purge Member Data</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border-2 border-rose-300 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-rose-200 bg-rose-950 px-5 py-4 text-white">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="h-5 w-5 text-rose-400" />
                <div>
                  <h3 className="text-sm font-bold">
                    Right to Erasure — Purge Member Data
                  </h3>
                  <p className="text-xs text-rose-200">
                    Irreversible Privacy &amp; Storage Deletion
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-rose-300 hover:bg-rose-900 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmPurge} className="space-y-4 p-5">
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-950">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                  <div className="space-y-1">
                    <p className="font-bold">
                      This action permanently purges all clinical records for{" "}
                      {memberName}:
                    </p>
                    <ul className="list-inside list-disc space-y-1 text-rose-800">
                      <li>
                        Deletes all files in{" "}
                        <code className="rounded bg-rose-100 px-1 font-mono">
                          medical-records/{familyId.slice(0, 8)}.../{memberId.slice(0, 8)}.../
                        </code>
                      </li>
                      <li>
                        Cascades deletion of{" "}
                        <code className="font-mono">family_members</code>,{" "}
                        <code className="font-mono">medical_documents</code>,{" "}
                        <code className="font-mono">timeline_events</code>, and{" "}
                        <code className="font-mono">share_tokens</code>
                      </li>
                      <li>
                        Records an immutable{" "}
                        <code className="rounded bg-rose-100 px-1 font-mono">
                          PURGED_MEMBER
                        </code>{" "}
                        entry in <code className="font-mono">audit_logs</code>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Type <code className="rounded bg-slate-100 px-1.5">PURGE</code>{" "}
                  to confirm irreversible erasure:
                </label>
                <input
                  type="text"
                  required
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="PURGE"
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-sm font-bold text-slate-900 focus:border-rose-600 focus:outline-none"
                />
              </div>

              {errorMsg && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-800">
                  {errorMsg}
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isPending || confirmText.trim().toUpperCase() !== "PURGE"
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-800 disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>
                    {isPending
                      ? "Purging Storage & DB Rows..."
                      : "Permanently Purge Member"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
