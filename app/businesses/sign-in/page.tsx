"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ShieldCheck,
  CheckCircle2,
  LogIn,
  UserPlus,
  Eye,
  EyeOff,
} from "lucide-react";
import { COUNTRY_CODES, DEFAULT_COUNTRY } from "@/lib/countries";

type Mode = "signin" | "signup";
type Step = "form" | "otp" | "success";

export default function SignInPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [step, setStep] = useState<Step>("form");

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
        <div className="bg-gradient-to-br from-navy to-navy-light px-8 py-7 text-white">
          <span className="inline-flex items-center gap-2 rounded-full bg-gold/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gold-light ring-1 ring-gold/30">
            <ShieldCheck className="h-3.5 w-3.5" />
            Subscriber portal
          </span>
          <h1 className="mt-4 font-heading text-2xl sm:text-3xl font-semibold">
            {step === "success"
              ? "You&apos;re in."
              : mode === "signin"
                ? "Sign in to your account"
                : "Create your subscriber account"}
          </h1>
          <p className="mt-2 text-sm text-gray-200">
            {step === "success"
              ? "We&apos;ll let you know as soon as your access is activated."
              : mode === "signin"
                ? "Enter your email and password. We&apos;ll send a one-time code to confirm it&apos;s you."
                : "We&apos;ll send a one-time code to your email to confirm you own it."}
          </p>
        </div>

        {step === "form" && (
          <>
            <div className="border-b border-gray-100">
              <div className="flex">
                <TabButton
                  active={mode === "signin"}
                  onClick={() => setMode("signin")}
                  icon={<LogIn className="h-4 w-4" />}
                  label="Sign in"
                />
                <TabButton
                  active={mode === "signup"}
                  onClick={() => setMode("signup")}
                  icon={<UserPlus className="h-4 w-4" />}
                  label="Sign up"
                />
              </div>
            </div>
            <div className="px-8 py-7">
              <GoogleButton />
              <Divider />
              {mode === "signin" ? (
                <SignInForm onOtpSent={() => setStep("otp")} switchToSignUp={() => setMode("signup")} />
              ) : (
                <SignUpForm onOtpSent={() => setStep("otp")} switchToSignIn={() => setMode("signin")} />
              )}
            </div>
          </>
        )}

        {step === "otp" && (
          <div className="px-8 py-7">
            <OtpStep mode={mode} onSuccess={() => setStep("success")} onBack={() => setStep("form")} />
          </div>
        )}

        {step === "success" && (
          <div className="px-8 py-10 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <p className="mt-4 text-gray-700 leading-relaxed">
              {mode === "signup"
                ? "Your account is created. Our team will review your access request and activate your full marketplace access. You&apos;ll get an email when that happens."
                : "Signed in successfully. Browse the marketplace from your subscriber dashboard."}
            </p>
            <Link
              href="/businesses/listings"
              className="mt-6 inline-flex items-center justify-center rounded-lg gold-gradient px-6 py-3 text-sm font-semibold text-white shadow-sm hover:shadow-md transition-shadow"
            >
              Browse the marketplace
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function SignUpForm({
  onOtpSent,
  switchToSignIn,
}: {
  onOtpSent: () => void;
  switchToSignIn: () => void;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState(DEFAULT_COUNTRY.code);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirmPw) {
      setError("Passwords don&apos;t match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setSubmitting(true);
    try {
      const selected = COUNTRY_CODES.find((c) => c.code === country);
      const dialPrefix = selected ? `+${selected.dial}` : "";
      const res = await fetch("/api/businesses/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          email,
          phone: `${dialPrefix} ${phone}`.trim(),
          country_code: country,
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Sign-up failed");
        return;
      }
      // Stash email so the OTP step knows who we are.
      sessionStorage.setItem("gto_pending_email", email.trim().toLowerCase());
      sessionStorage.setItem("gto_pending_purpose", "signup");
      onOtpSent();
    } catch {
      setError("Connection error");
    } finally {
      setSubmitting(false);
    }
  }

  const strength = passwordStrength(password);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Full name *">
        <input
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Jane Smith"
          autoComplete="name"
          className="input"
        />
      </Field>

      <Field label="Email *">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          className="input"
        />
      </Field>

      <Field label="Phone *">
        <div className="flex gap-2">
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="input w-[148px] flex-shrink-0"
            aria-label="Country code"
          >
            {COUNTRY_CODES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} +{c.dial} · {c.name}
              </option>
            ))}
          </select>
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="9510 8257"
            autoComplete="tel"
            className="input flex-1"
          />
        </div>
      </Field>

      <Field label="Password * (min 8 characters)">
        <div className="relative">
          <input
            type={showPw ? "text" : "password"}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className="input pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-navy"
            tabIndex={-1}
          >
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {password && <StrengthBar strength={strength} />}
      </Field>

      <Field label="Confirm password *">
        <input
          type={showPw ? "text" : "password"}
          required
          minLength={8}
          value={confirmPw}
          onChange={(e) => setConfirmPw(e.target.value)}
          autoComplete="new-password"
          className="input"
        />
      </Field>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg gold-gradient px-5 py-3 text-base font-semibold text-white shadow-sm hover:shadow-lg transition-shadow disabled:opacity-60"
      >
        {submitting ? "Sending code…" : "Create account"}
      </button>

      <p className="text-xs text-gray-500 text-center pt-2">
        Already have an account?{" "}
        <button type="button" onClick={switchToSignIn} className="text-gold hover:text-gold-dark font-semibold">
          Sign in instead
        </button>
      </p>
    </form>
  );
}

function SignInForm({
  onOtpSent,
  switchToSignUp,
}: {
  onOtpSent: () => void;
  switchToSignUp: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/businesses/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Sign-in failed");
        return;
      }
      sessionStorage.setItem("gto_pending_email", email.trim().toLowerCase());
      sessionStorage.setItem("gto_pending_purpose", data.requires_verification ? "signup" : "signin");
      onOtpSent();
    } catch {
      setError("Connection error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Email *">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          className="input"
        />
      </Field>

      <Field label="Password *">
        <div className="relative">
          <input
            type={showPw ? "text" : "password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="input pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-navy"
            tabIndex={-1}
          >
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </Field>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg gold-gradient px-5 py-3 text-base font-semibold text-white shadow-sm hover:shadow-lg transition-shadow disabled:opacity-60"
      >
        {submitting ? "Sending code…" : "Continue"}
      </button>

      <p className="text-xs text-gray-500 text-center pt-2">
        Don&apos;t have an account?{" "}
        <button type="button" onClick={switchToSignUp} className="text-gold hover:text-gold-dark font-semibold">
          Sign up here
        </button>
      </p>
    </form>
  );
}

function OtpStep({
  mode,
  onSuccess,
  onBack,
}: {
  mode: Mode;
  onSuccess: () => void;
  onBack: () => void;
}) {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [resending, setResending] = useState(false);
  const [resentNote, setResentNote] = useState("");

  const email = typeof window !== "undefined" ? sessionStorage.getItem("gto_pending_email") ?? "" : "";
  const purpose = typeof window !== "undefined" ? (sessionStorage.getItem("gto_pending_purpose") ?? "signup") : "signup";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/businesses/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, purpose }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Verification failed");
        return;
      }
      sessionStorage.removeItem("gto_pending_email");
      sessionStorage.removeItem("gto_pending_purpose");
      onSuccess();
    } catch {
      setError("Connection error");
    } finally {
      setSubmitting(false);
    }
  }

  async function resendCode() {
    setResending(true);
    setResentNote("");
    try {
      // Re-issue OTP by hitting the appropriate endpoint.
      const endpoint = mode === "signup" ? "/api/businesses/sign-up" : "/api/businesses/sign-in";
      const body =
        mode === "signup"
          ? { email, full_name: "_", phone: "_", country_code: "OM", password: "_" } // server falls into the existing-unverified branch
          : { email, password: "_" };
      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setResentNote("Code re-sent. Check your email.");
    } catch {
      setResentNote("Couldn&apos;t re-send right now. Try again in a moment.");
    } finally {
      setResending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto">
      <div className="text-center">
        <p className="text-sm text-gray-600">
          We sent a 6-digit code to <span className="font-semibold text-navy">{email}</span>.
        </p>
      </div>

      <Field label="Verification code">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          required
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          placeholder="000000"
          className="input text-center text-2xl tracking-widest font-mono"
          autoFocus
        />
      </Field>

      {error && <p className="text-sm text-red-500 text-center">{error}</p>}
      {resentNote && <p className="text-sm text-emerald-600 text-center">{resentNote}</p>}

      <button
        type="submit"
        disabled={submitting || code.length !== 6}
        className="w-full rounded-lg gold-gradient px-5 py-3 text-base font-semibold text-white shadow-sm hover:shadow-lg transition-shadow disabled:opacity-60"
      >
        {submitting ? "Verifying…" : "Verify and continue"}
      </button>

      <div className="flex items-center justify-between text-xs pt-2">
        <button
          type="button"
          onClick={onBack}
          className="text-gray-500 hover:text-navy"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={resendCode}
          disabled={resending}
          className="text-gold hover:text-gold-dark font-semibold disabled:opacity-60"
        >
          {resending ? "Re-sending…" : "Resend code"}
        </button>
      </div>
    </form>
  );
}

function GoogleButton() {
  function handleClick() {
    alert(
      "Sign in with Google is being set up. For now please use email and password — we&apos;ll have Google sign-in live shortly.",
    );
  }
  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full inline-flex items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
    >
      <GoogleLogo />
      Continue with Google
    </button>
  );
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58Z" />
    </svg>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-xs uppercase tracking-wider text-gray-400">or</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-gray-600 mb-1.5 block">{label}</span>
      {children}
      <style jsx>{`
        :global(.input) {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid #e5e7eb;
          padding: 0.625rem 0.875rem;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        :global(.input:focus) {
          border-color: rgb(201 155 60);
          box-shadow: 0 0 0 2px rgba(201, 155, 60, 0.2);
        }
      `}</style>
    </label>
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

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "bg-gray-200" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ["Too short", "Weak", "Fair", "Good", "Strong", "Excellent"];
  const colors = ["bg-red-400", "bg-red-400", "bg-amber-400", "bg-yellow-400", "bg-emerald-400", "bg-emerald-500"];
  return { score, label: labels[score], color: colors[score] };
}

function StrengthBar({ strength }: { strength: ReturnType<typeof passwordStrength> }) {
  return (
    <div className="mt-1.5 flex items-center gap-2">
      <div className="flex-1 h-1 rounded-full bg-gray-200 overflow-hidden">
        <div
          className={`h-full ${strength.color} transition-all`}
          style={{ width: `${(strength.score / 5) * 100}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 w-16 text-right">{strength.label}</span>
    </div>
  );
}
