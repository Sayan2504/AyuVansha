"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Lock, ShieldCheck } from "lucide-react";

interface DoctorBriefPinGateProps {
  token: string;
  patientName: string;
}

export function DoctorBriefPinGate({
  token,
  patientName,
}: DoctorBriefPinGateProps) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVerifyPin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/brief/${token}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pin.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Invalid PIN code");
      }

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to verify 4-digit PIN."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-slate-800 bg-white shadow-2xl">
        <div className="bg-slate-900 px-6 py-5 text-center text-white">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/20 text-teal-300">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="mt-3 text-base font-extrabold">
            PIN-Protected 1-Page Doctor Brief
          </h1>
          <p className="mt-1 text-xs text-slate-300">
            Patient: <strong className="text-white">{patientName}</strong>
          </p>
        </div>

        <form onSubmit={handleVerifyPin} className="space-y-4 p-6">
          <div>
            <label className="block text-center text-xs font-bold uppercase tracking-wider text-slate-600">
              Enter 4-Digit Caregiver Consultation PIN
            </label>
            <div className="relative mt-2">
              <KeyRound className="pointer-events-none absolute top-3.5 left-4 h-4 w-4 text-slate-400" />
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                pattern="\d{4}"
                required
                value={pin}
                onChange={(e) =>
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                placeholder="• • • •"
                className="w-full rounded-2xl border-2 border-slate-300 py-3 pr-4 pl-10 text-center font-mono text-xl font-extrabold tracking-[0.4em] text-slate-900 focus:border-teal-600 focus:outline-none"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-center text-xs font-bold text-rose-800">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || pin.length !== 4}
            className="w-full rounded-2xl bg-teal-700 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-teal-800 disabled:opacity-40"
          >
            {loading
              ? "Verifying PIN & Logging Audit..."
              : "Unlock 1-Page Clinical Brief"}
          </button>

          <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
            <span>Access is immutably logged in audit_logs</span>
          </p>
        </form>
      </div>
    </div>
  );
}
