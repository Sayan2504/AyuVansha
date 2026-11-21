"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  HeartPulse,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";
import {
  createClient as createBrowserSupabase,
  isSupabaseConfigured,
} from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const liveSupabase = isSupabaseConfigured();

  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "info" | "error" | "success";
    text: string;
  } | null>(null);

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      if (!liveSupabase) {
        setOtpSent(true);
        setMessage({
          type: "info",
          text: "Local Demo Mode active (.env.local uses placeholder Supabase keys). Enter any 6-digit OTP code (e.g., 123456) or click Instant Caregiver Demo Sign-In.",
        });
        setLoading(false);
        return;
      }

      const supabase = createBrowserSupabase();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        throw error;
      }

      setOtpSent(true);
      setMessage({
        type: "success",
        text: `Magic link & 6-digit OTP sent to ${email}. Check your inbox and enter the code below.`,
      });
    } catch (err) {
      setMessage({
        type: "error",
        text:
          err instanceof Error
            ? err.message
            : "Failed to send Email OTP / Magic Link.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      if (!liveSupabase) {
        router.push("/");
        router.refresh();
        return;
      }

      const supabase = createBrowserSupabase();
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otpCode.trim(),
        type: "email",
      });

      if (error) {
        throw error;
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setMessage({
        type: "error",
        text:
          err instanceof Error
            ? err.message
            : "Invalid or expired OTP code.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 px-4 py-12">
      <div className="mx-auto w-full max-w-md">
        {/* Brand Header */}
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 text-white"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-500 text-slate-950 shadow-lg shadow-teal-500/25">
              <HeartPulse className="h-6 w-6" />
            </div>
            <div className="text-left">
              <span className="block text-xl font-extrabold tracking-tight">
                AyuVansha
              </span>
              <span className="block text-xs font-medium text-teal-300">
                Multi-Generational Family Clinical Timeline
              </span>
            </div>
          </Link>
        </div>

        {/* Auth Card */}
        <div className="overflow-hidden rounded-3xl border border-slate-800 bg-white shadow-2xl">
          <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-5">
            <h1 className="text-lg font-extrabold text-slate-900">
              Caregiver Passwordless Sign-In
            </h1>
            <p className="mt-1 text-xs text-slate-600">
              Sign in via Email OTP or Magic Link. First-time login
              automatically provisions your encrypted family workspace.
            </p>
          </div>

          <div className="p-6">
            {!otpSent ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Caregiver Email Address
                  </label>
                  <div className="relative mt-1.5">
                    <Mail className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="aarav.sharma@family.in"
                      className="w-full rounded-xl border border-slate-300 py-2.5 pr-4 pl-10 text-sm font-medium text-slate-900 focus:border-teal-600 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800 disabled:opacity-50"
                >
                  <span>
                    {loading
                      ? "Sending Magic Link & OTP..."
                      : "Send Magic Link / Email OTP"}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Enter 6-Digit Email OTP Code
                  </label>
                  <div className="relative mt-1.5">
                    <KeyRound className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      required
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="123456"
                      className="w-full rounded-xl border border-slate-300 py-2.5 pr-4 pl-10 font-mono text-base font-bold tracking-widest text-slate-900 focus:border-teal-600 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>
                    {loading
                      ? "Verifying & Onboarding Workspace..."
                      : "Verify OTP & Open Family Workspace"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOtpSent(false);
                    setMessage(null);
                  }}
                  className="w-full text-center text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Use a different email address
                </button>
              </form>
            )}

            {message && (
              <div
                className={`mt-4 rounded-xl border p-3.5 text-xs font-medium ${
                  message.type === "error"
                    ? "border-rose-200 bg-rose-50 text-rose-800"
                    : message.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-amber-200 bg-amber-50 text-amber-950"
                }`}
              >
                {message.text}
              </div>
            )}

            <div className="mt-6 border-t border-slate-100 pt-4">
              <Link
                href="/"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
              >
                <ShieldCheck className="h-4 w-4 text-teal-600" />
                <span>
                  Explore Sharma 3-Gen Demo Workspace &amp; Doctor QR Brief
                </span>
              </Link>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 border-t border-slate-100 bg-slate-50 px-6 py-3 text-[11px] font-medium text-slate-500">
            <Lock className="h-3.5 w-3.5 text-teal-600" />
            <span>
              Row-Level Security (RLS) Isolated • Zero-Login Expiring Doctor QR
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
