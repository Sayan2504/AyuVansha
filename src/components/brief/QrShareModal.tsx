"use client";

import React, { useEffect, useState, useTransition } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Check,
  Clock,
  Copy,
  ExternalLink,
  KeyRound,
  QrCode,
  ShieldAlert,
  ShieldOff,
  X,
} from "lucide-react";
import {
  generateDoctorQrShareAction,
  revokeDoctorQrShareAction,
} from "@/app/actions";
import { Button } from "@/components/ui/button";

interface QrShareModalProps {
  familyId: string;
  memberId: string;
  memberName: string;
  triggerLabel?: string;
  compact?: boolean;
}

export function QrShareModal({
  familyId,
  memberId,
  memberName,
  triggerLabel = "1-Page Doctor QR Brief",
  compact = false,
}: QrShareModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pinCode, setPinCode] = useState("");
  const [usePin, setUsePin] = useState(false);
  const [generated, setGenerated] = useState<{
    rawToken: string;
    tokenId: string;
    expiresAt: string;
    pinCode: string | null;
  } | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(1800);
  const [copied, setCopied] = useState(false);
  const [isRevoked, setIsRevoked] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!generated || isRevoked) return;
    const targetMs = new Date(generated.expiresAt).getTime();

    const timer = setInterval(() => {
      const diff = Math.max(0, Math.floor((targetMs - Date.now()) / 1000));
      setSecondsLeft(diff);
    }, 1000);

    return () => clearInterval(timer);
  }, [generated, isRevoked]);

  function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setIsRevoked(false);

    startTransition(async () => {
      const res = await generateDoctorQrShareAction({
        familyId,
        memberId,
        pinCode: usePin && /^\d{4}$/.test(pinCode) ? pinCode : null,
      });

      if (res.ok) {
        setGenerated({
          rawToken: res.rawToken,
          tokenId: res.tokenId,
          expiresAt: res.expiresAt,
          pinCode: res.pinCode,
        });
        setSecondsLeft(30 * 60);
      }
    });
  }

  function handleRevoke() {
    if (!generated) return;
    startTransition(async () => {
      await revokeDoctorQrShareAction({
        tokenId: generated.tokenId,
        familyId,
        memberId,
      });
      setIsRevoked(true);
    });
  }

  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const shareUrl = generated ? `${origin}/brief/${generated.rawToken}` : "";

  function copyLink() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  return (
    <>
      <Button
        type="button"
        variant="default"
        size={compact ? "sm" : "default"}
        onClick={() => setIsOpen(true)}
      >
        <QrCode className="h-4 w-4" />
        <span>{triggerLabel}</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-5 py-4 text-white">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/20 text-teal-300">
                  <QrCode className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">
                    Ephemeral 1-Page Doctor QR Brief
                  </h3>
                  <p className="text-xs text-slate-300">
                    Patient: <strong className="text-white">{memberName}</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5">
              {!generated ? (
                <form onSubmit={handleGenerate} className="space-y-4">
                  <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-3.5 text-xs text-teal-950">
                    <p className="font-semibold">
                      Zero-Login 5-Minute Consultation Mode
                    </p>
                    <p className="mt-1 text-teal-800">
                      Generates a single-use SHA-256 hashed token expiring in{" "}
                      <strong>30 minutes</strong>. Every physician scan is
                      immutably recorded in{" "}
                      <code className="rounded bg-teal-100 px-1">
                        audit_logs
                      </code>
                      .
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-3.5">
                    <label className="flex cursor-pointer items-center justify-between">
                      <span className="flex items-center gap-2 text-xs font-bold text-slate-800">
                        <KeyRound className="h-4 w-4 text-amber-600" />
                        Require 4-Digit Consultation PIN (Optional)
                      </span>
                      <input
                        type="checkbox"
                        checked={usePin}
                        onChange={(e) => setUsePin(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-teal-600"
                      />
                    </label>

                    {usePin && (
                      <div className="mt-3">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={4}
                          pattern="\d{4}"
                          required={usePin}
                          value={pinCode}
                          onChange={(e) =>
                            setPinCode(e.target.value.replace(/\D/g, "").slice(0, 4))
                          }
                          placeholder="Enter 4-digit PIN (e.g. 4829)"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-center font-mono text-base font-bold tracking-widest text-slate-900 focus:border-teal-600 focus:outline-none"
                        />
                        <p className="mt-1 text-[11px] text-slate-500">
                          Read this 4-digit PIN aloud to the physician after
                          they scan your QR code.
                        </p>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isPending || (usePin && pinCode.length !== 4)}
                    className="w-full rounded-xl bg-teal-700 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800 disabled:opacity-50"
                  >
                    {isPending
                      ? "Generating SHA-256 Token..."
                      : "Generate 30-Minute Doctor QR Code"}
                  </button>
                </form>
              ) : (
                <div className="space-y-4 text-center">
                  {/* Status / Timer Pill */}
                  <div className="flex items-center justify-center gap-2">
                    {isRevoked ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800">
                        <ShieldOff className="h-3.5 w-3.5" />
                        Token Immediately Revoked
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-950">
                        <Clock className="h-3.5 w-3.5 text-amber-700" />
                        Expires in {String(mins).padStart(2, "0")}:
                        {String(secs).padStart(2, "0")}
                      </span>
                    )}

                    {generated.pinCode && !isRevoked && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-3 py-1 font-mono text-xs font-bold text-indigo-900">
                        <KeyRound className="h-3 w-3" /> PIN: {generated.pinCode}
                      </span>
                    )}
                  </div>

                  {/* QR Code Canvas (Always white background for reliable camera scanning) */}
                  <div
                    style={{ backgroundColor: "#ffffff" }}
                    className={`mx-auto flex h-56 w-56 items-center justify-center rounded-2xl border-2 p-4 ${
                      isRevoked
                        ? "border-rose-200 opacity-30"
                        : "border-teal-600 shadow-inner"
                    }`}
                  >
                    <QRCodeSVG
                      value={shareUrl}
                      size={188}
                      level="M"
                      includeMargin={false}
                    />
                  </div>

                  <p className="text-xs text-slate-600">
                    Ask the physician to scan with their phone camera. Opens a
                    1-page mobile clinical brief in under 60 seconds.
                  </p>

                  {/* Share URL & Direct Open */}
                  {!isRevoked && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={copyLink}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                      >
                        {copied ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                            Copied Brief URL
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            Copy Brief Link
                          </>
                        )}
                      </button>

                      <a
                        href={`/brief/${generated.rawToken}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800"
                      >
                        <span>Open Doctor View</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  )}

                  {/* Revoke / Regenerate Controls */}
                  <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                    <button
                      type="button"
                      onClick={() => setGenerated(null)}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                    >
                      Generate New Token
                    </button>

                    {!isRevoked && (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={handleRevoke}
                        className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100"
                      >
                        <ShieldAlert className="h-3.5 w-3.5" />
                        Revoke Immediately
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
