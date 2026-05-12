"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ShieldCheck, Mail, CheckCircle2, LogIn, UserPlus } from "lucide-react";
import { AccessRequestForm } from "@/components/businesses/AccessRequestForm";

type Mode = "signin" | "signup";

export default function SignInPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [signinMessage, setSigninMessage] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/businesses/resend-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Sign-in failed");
        return;
      }
      setSigninMessage(data.message);
    } catch {
      setError("Connection error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-10">
      <Link
        href="/businesses"
        className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gold transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to overview
      </Link>

      <div className="mt-6 rounded-2xl bg-white ring-1 ring-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-navy to-navy-light px-8 py-8 text-white">
          <span className="inline-flex items-center gap-2 rounded-full bg-gold/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gold-light ring-1 ring-gold/30">
            <ShieldCheck className="h-3.5 w-3.5" />
            Subscriber portal
          </span>
          <h1 className="mt-4 font-heading text-2xl sm:text-3xl font-semibold">
            {mode === "signin" ? "Sign in to your account" : "Create your subscriber account"}
          </h1>
          <p className="mt-2 text-sm text-gray-200">
            {mode === "signin"
              ? "Already requested access? Enter your email and we'll resend your details."
              : "First-time visitor? Sign up to request marketplace access."}
          </p>
        </div>

        {/* Tab toggle */}
        <div className="border-b border-gray-100">
          <div className="flex">
            <TabButton
              active={mode === "signin"}
              onClick={() => {
                setMode("signin");
                setSigninMessage(null);
                setError("");
              }}
              icon={<LogIn className="h-4 w-4" />}
              label="Sign in"
            />
            <TabButton
              active={mode === "signup"}
              onClick={() => {
                setMode("signup");
                setSigninMessage(null);
                setError("");
              }}
              icon={<UserPlus className="h-4 w-4" />}
              label="Sign up"
            />
          </div>
        </div>

        <div className="px-8 py-8">
          {mode === "signin" ? (
            signinMessage ? (
              <div className="rounded-xl bg-emerald-50 ring-1 ring-emerald-200 p-6 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
                <p className="mt-3 font-heading text-lg font-semibold text-emerald-900">
                  Request received.
                </p>
                <p className="mt-2 text-sm text-emerald-800">{signinMessage}</p>
                <button
                  type="button"
                  onClick={() => {
                    setSigninMessage(null);
                    setEmail("");
                  }}
                  className="mt-4 text-sm text-emerald-700 hover:text-emerald-900 underline"
                >
                  Submit a different email
                </button>
              </div>
            ) : (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
                    />
                  </div>
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg gold-gradient px-5 py-3 text-base font-semibold text-white shadow-sm hover:shadow-lg transition-shadow disabled:opacity-60"
                >
                  {submitting ? "Checking…" : "Resend my access details"}
                </button>

                <p className="text-xs text-gray-500 text-center leading-relaxed pt-2">
                  Don&apos;t have an account yet?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className="text-gold hover:text-gold-dark font-semibold"
                  >
                    Sign up here
                  </button>
                </p>
              </form>
            )
          ) : (
            <div>
              <p className="text-sm text-gray-600 leading-relaxed mb-5">
                Marketplace access is one-time paid. Submit your details and our
                team will reach out within 24 hours with the invoice and full
                instructions.
              </p>
              <AccessRequestForm />
              <p className="mt-5 text-xs text-gray-500 text-center leading-relaxed pt-2 border-t border-gray-100">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="text-gold hover:text-gold-dark font-semibold"
                >
                  Sign in instead
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 inline-flex items-center justify-center gap-2 py-4 text-sm font-semibold transition-colors ${
        active
          ? "text-gold border-b-2 border-gold bg-gold/5"
          : "text-gray-500 hover:text-navy hover:bg-gray-50"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
