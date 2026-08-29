"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Lock, Eye, EyeOff, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import api from "@/services/api";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isLinkInvalid = !token || !email;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    if (password !== passwordConfirmation) {
      setErrorMessage("Password confirmation does not match.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await api.post("/reset-password", {
        token,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });

      setSuccessMessage(
        res.data?.message || "Your password has been reset successfully! Redirecting to login..."
      );

      setTimeout(() => {
        router.push("/login");
      }, 2500);
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.message || "Failed to reset password. The link may have expired."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        fontFamily: '"Proxima Nova", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
      className="flex min-h-screen w-screen overflow-hidden relative bg-[#181d24]"
    >
      {/* Base background layer */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#181d24]" style={{ zIndex: 0 }}></div>

      {/* Video background */}
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ zIndex: 1 }}
      >
        <source src="/videos/login-bg.mp4" type="video/mp4" />
      </video>

      {/* Video overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[0.5px]" style={{ zIndex: 2 }}></div>

      {/* Animated gradient blobs */}
      <div className="absolute inset-0 opacity-20 overflow-hidden pointer-events-none" style={{ zIndex: 3 }}>
        <div className="absolute top-0 -left-40 w-80 h-80 bg-amber-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
        <div className="absolute top-0 -right-40 w-80 h-80 bg-slate-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      {/* Left branding panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden" style={{ zIndex: 10 }}>
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Inter Smart Logo" className="h-14 w-auto object-contain" />
        </div>
        <div>
          <h1 className="text-5xl font-bold text-white leading-tight mb-4">
            Set a new password,<br />
            <span className="text-amber-400">protect your account.</span>
          </h1>
          <p className="text-slate-400 text-lg">
            Choose a strong password with at least 8 characters to keep your workplace data safe.
          </p>
          <div className="mt-10 flex gap-6">
            {["Encrypted Token", "Instant Sync", "Active Session Safety"].map((f) => (
              <div key={f} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-300">
                {f}
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-slate-600 text-sm">© 2026 Inter Smart. All rights reserved.</p>
          <p className="text-slate-600 text-sm mt-1">Developed By Team QA</p>
        </div>
      </div>

      {/* Right centered form panel */}
      <div className="flex flex-1 items-center justify-center p-8 relative" style={{ zIndex: 10 }}>
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center justify-center mb-8 lg:hidden">
            <img src="/logo.png" alt="Inter Smart Logo" className="h-12 w-auto object-contain" />
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm shadow-2xl relative">
            <div className="mb-6">
              <a
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-amber-400 transition-colors mb-4 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Login</span>
              </a>
              <h2 className="text-2xl font-bold text-white mb-1">Create New Password</h2>
              <p className="text-slate-400 text-sm">
                {email ? (
                  <>Resetting password for <strong className="text-slate-200">{email}</strong></>
                ) : (
                  "Enter a strong new password for your account."
                )}
              </p>
            </div>

            {isLinkInvalid && (
              <div className="mb-5 p-3.5 bg-amber-950/90 border border-amber-500/70 rounded-xl text-xs font-semibold text-amber-100 flex items-start gap-2.5 shadow-lg shadow-amber-950/40">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold block">Invalid or Missing Reset Token</span>
                  <p className="text-amber-200 font-normal">
                    This password reset link is incomplete. Please request a new recovery link.
                  </p>
                  <a
                    href="/forgot-password"
                    className="inline-block mt-2 text-xs font-bold text-amber-300 hover:underline"
                  >
                    Go to Forgot Password →
                  </a>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="mb-5 p-3.5 bg-rose-950/90 border border-rose-500/70 rounded-xl text-xs font-semibold text-rose-100 flex items-start gap-2.5 shadow-lg shadow-rose-950/40 animate-slideDown">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-snug">{errorMessage}</span>
              </div>
            )}

            {successMessage ? (
              <div className="space-y-5">
                <div className="p-4 bg-emerald-950/90 border border-emerald-500/70 rounded-xl text-xs font-semibold text-emerald-100 flex items-start gap-3 shadow-lg shadow-emerald-950/40">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-emerald-200 text-sm">Password Reset Complete</p>
                    <p className="text-slate-300 font-normal leading-relaxed">{successMessage}</p>
                  </div>
                </div>

                <a
                  href="/login"
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold rounded-xl transition flex items-center justify-center gap-2 text-sm cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  Sign In Now
                </a>
              </div>
            ) : (
              !isLinkInvalid && (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      New Password (min 8 characters)
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        required
                        minLength={8}
                        disabled={loading}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white transition cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirm ? "text" : "password"}
                        value={passwordConfirmation}
                        onChange={(e) => setPasswordConfirmation(e.target.value)}
                        placeholder="••••••••••••"
                        required
                        minLength={8}
                        disabled={loading}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white transition cursor-pointer"
                      >
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer text-sm"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Resetting Password...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Update Password & Sign In</span>
                      </>
                    )}
                  </button>
                </form>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-screen flex items-center justify-center bg-[#181d24]">
          <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
