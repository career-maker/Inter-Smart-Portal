"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { Eye, EyeOff, LogIn, Lock, Mail, Check } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  const getErrorIcon = (message: string) => {
    if (message.toLowerCase().includes("inactive") || message.toLowerCase().includes("disabled")) {
      return <Lock className="w-4 h-4 mr-2 flex-shrink-0" />;
    }
    if (message.toLowerCase().includes("not found") || message.toLowerCase().includes("invalid")) {
      return <Mail className="w-4 h-4 mr-2 flex-shrink-0" />;
    }
    return null;
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setError("");

    // Validate fields
    const newErrors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!email.includes("@")) {
      newErrors.email = "Please enter a valid email address";
    }
    if (!password) {
      newErrors.password = "Password is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post("/login", { email, password });
      if (response.data.token) {
        localStorage.setItem("token", response.data.token);
        if (rememberDevice) {
          localStorage.setItem("rememberDevice", "true");
        }
        setLoginSuccess(true);
        setTimeout(() => {
          setAuth(response.data.user, response.data.token);
          router.push("/dashboard");
        }, 1500);
      }
    } catch (err: any) {
      console.error("Login error:", err);
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Invalid email or password. Please try again.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen w-screen overflow-hidden relative">
      {/* Video background */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        style={{ zIndex: 0 }}
      >
        <source src="/videos/login-bg.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Video overlay to darken it */}
      <div className="absolute inset-0 bg-black/40" style={{ zIndex: 1 }}></div>

      {/* Fallback gradient background (if video doesn't load) */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 dark:from-slate-900 via-slate-800 to-slate-50 dark:to-slate-900" style={{ zIndex: -1 }}></div>

      {/* Animated gradient background */}
      <div className="absolute inset-0 opacity-20 overflow-hidden pointer-events-none" style={{ zIndex: 2 }}>
        <div className="absolute top-0 -left-40 w-80 h-80 bg-amber-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
        <div className="absolute top-0 -right-40 w-80 h-80 bg-slate-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>
      {/* Left branding panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden" style={{ zIndex: 10 }}>
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Intersmart Logo" className="h-14 w-auto object-contain" />
        </div>
        <div>
          <h1 className="text-5xl font-bold text-slate-900 dark:text-white leading-tight mb-4">
            Your workspace,<br />
            <span className="text-amber-400">all in one place.</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg">
            Manage attendance, leaves, teams, and more — built for the modern workplace.
          </p>
          <div className="mt-10 flex gap-6">
            {["Attendance", "Leave Management", "Team Collaboration"].map(f => (
              <div key={f} className="bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{f}</div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-slate-600 text-sm">© 2026 Intersmart. All rights reserved.</p>
          <p className="text-slate-600 text-sm mt-1">Developed By Team QA</p>
        </div>
      </div>

      {/* Right login form */}
      <div className="flex flex-1 items-center justify-center p-8 relative" style={{ zIndex: 10 }}>
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center justify-center mb-8 lg:hidden">
            <img src="/logo.png" alt="Intersmart Logo" className="h-12 w-auto object-contain" />
          </div>

          {/* Success overlay */}
          {loginSuccess && (
            <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm animate-fadeIn">
              <div className="bg-white rounded-3xl p-12 text-center animate-scaleIn">
                <div className="mb-4 flex justify-center">
                  <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center animate-scaleIn">
                    <Check className="w-10 h-10 text-slate-900 dark:text-white animate-slideDown" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Login Successful!</h3>
                <p className="text-slate-600">Redirecting to dashboard...</p>
              </div>
            </div>
          )}

          <div className="bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-8 backdrop-blur-sm shadow-2xl relative">
            {/* Contact HR link - moved to top-right */}
            <div className="absolute top-6 right-6">
              <a href="mailto:hr@intersmart.in" className="text-xs text-amber-400 hover:text-amber-300 transition flex items-center gap-1">
                <Mail className="w-3 h-3" />
                <span>Need help?</span>
              </a>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Sign in to your account</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Enter your official email and password to continue.</p>
            </div>

            {error && (
              <div className="mb-5 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400 flex items-start gap-3 animate-slideDown">
                {getErrorIcon(error)}
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                  Official Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value);
                    setFieldErrors(prev => ({ ...prev, email: "" }));
                  }}
                  placeholder="name@intersmart.in"
                  required
                  className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:border-transparent transition ${
                    fieldErrors.email
                      ? "border-red-500 focus:ring-red-500"
                      : "border-white/10 focus:ring-amber-500"
                  }`}
                />
                {fieldErrors.email && (
                  <p className="text-red-400 text-xs mt-1">{fieldErrors.email}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">Password</label>
                  <a href="/forgot-password" className="text-xs text-amber-400 hover:text-amber-300 transition">
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => {
                      setPassword(e.target.value);
                      setFieldErrors(prev => ({ ...prev, password: "" }));
                    }}
                    placeholder="••••••••"
                    required
                    className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:border-transparent transition pr-12 ${
                      fieldErrors.password
                        ? "border-red-500 focus:ring-red-500"
                        : "border-white/10 focus:ring-amber-500"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-slate-200 transition"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>

                {fieldErrors.password && (
                  <p className="text-red-400 text-xs mt-1">{fieldErrors.password}</p>
                )}
              </div>

              <div className="flex items-center justify-between mt-4 px-3 py-3 bg-white/5 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 transition">
                <label htmlFor="remember" className="text-sm text-slate-600 dark:text-slate-300 cursor-pointer font-medium">Keep me signed in for 30 days</label>
                <button
                  type="button"
                  onClick={() => setRememberDevice(!rememberDevice)}
                  className={`relative w-12 h-7 rounded-full transition-all duration-300 ${
                    rememberDevice ? "bg-amber-500" : "bg-slate-600"
                  } flex items-center`}
                >
                  <div className={`w-6 h-6 bg-white rounded-full shadow-lg transform transition-transform ${rememberDevice ? "translate-x-5" : "translate-x-0.5"}`}></div>
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-6 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:cursor-not-allowed text-slate-900 font-bold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-slate-900"
              >
                {isLoading ? (
                  <span className="inline-block h-5 w-5 border-2 border-slate-200 dark:border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="h-5 w-5" />
                    Sign in
                  </>
                )}
              </button>
            </form>
          </div>
          <div className="mt-8 text-center lg:hidden">
            <p className="text-slate-600 text-sm">© 2026 Intersmart. All rights reserved.</p>
            <p className="text-slate-600 text-sm mt-1">Developed By Team QA</p>
          </div>
        </div>
      </div>
    </div>
  );
}
