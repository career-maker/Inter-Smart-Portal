"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { setAuthCookie } from "@/lib/authCookies";
import { toastManager } from "@/components/ui/toast";
import { Eye, EyeOff, LogIn, Lock, Mail, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token) {
      setAuthCookie(token);
      router.replace("/dashboard");
    } else {
      setIsCheckingAuth(false);
    }
  }, [router]);

  const getErrorIcon = (message: string) => {
    if (message.toLowerCase().includes("inactive") || message.toLowerCase().includes("disabled")) {
      return <Lock className="w-4 h-4 !text-rose-400 shrink-0 mt-0.5" />;
    }
    return <AlertCircle className="w-4 h-4 !text-rose-400 shrink-0 mt-0.5" />;
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

    const loginPromise = new Promise<{ user: any; token: string }>(async (resolve, reject) => {
      try {
        const response = await api.post("/login", { email, password });
        if (response.data.token) {
          try {
            localStorage.removeItem("token");
            localStorage.removeItem("auth-storage");
          } catch {}
          localStorage.setItem("token", response.data.token);
          if (rememberDevice) {
            localStorage.setItem("rememberDevice", "true");
          }
          setAuthCookie(response.data.token, rememberDevice ? 30 : 1);
          setAuth(response.data.user, response.data.token);
          resolve(response.data);
        } else {
          reject(new Error("Login failed. No token received."));
        }
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.message ||
          err.message ||
          "Invalid email or password. Please try again.";
        reject(new Error(errorMessage));
      }
    });

    try {
      await toastManager.promise(loginPromise, {
        loading: {
          title: "Signing in…",
          description: "Verifying your credentials.",
        },
        success: (data: any) => {
          setTimeout(() => {
            router.push("/dashboard");
          }, 800);
          return {
            title: "Login Successful!",
            description: `Welcome back, ${data.user?.first_name || "Employee"}! Redirecting to dashboard…`,
          };
        },
        error: (err: any) => {
          setError(err.message);
          return {
            title: "Sign in failed",
            description: err.message || "Please check your email and password.",
            duration: 8000,
          };
        },
      });
    } catch {
      // Handled inside toast promise
    } finally {
      setIsLoading(false);
    }
  }

  if (isCheckingAuth) {
    return (
      <div className="flex min-h-screen w-screen items-center justify-center bg-[#181d24]">
        <span className="inline-block h-8 w-8 border-2 border-white/20 border-t-amber-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-screen overflow-hidden relative bg-[#181d24]">
      {/* Base background layer to prevent any white flashes before video mounts or loads */}
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
        Your browser does not support the video tag.
      </video>

      {/* Video overlay to darken it */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[0.5px]" style={{ zIndex: 2 }}></div>

      {/* Animated gradient background */}
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
            Your workspace,<br />
            <span className="text-amber-400">all in one place.</span>
          </h1>
          <p className="text-slate-400 text-lg">
            Manage attendance, leaves, teams, and more — built for the modern workplace.
          </p>
          <div className="mt-10 flex gap-6">
            {["Attendance", "Leave Management", "Team Collaboration"].map(f => (
              <div key={f} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-300">{f}</div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-slate-600 text-sm">© 2026 Inter Smart. All rights reserved.</p>
          <p className="text-slate-600 text-sm mt-1">Developed By Team QA</p>
        </div>
      </div>

      {/* Right login form */}
      <div className="flex flex-1 items-center justify-center p-8 relative" style={{ zIndex: 10 }}>
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center justify-center mb-8 lg:hidden">
            <img src="/logo.png" alt="Inter Smart Logo" className="h-12 w-auto object-contain" />
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm shadow-2xl relative">
            {/* Contact HR link - responsive positioning */}
            <div className="flex justify-end mb-4 sm:mb-0 sm:absolute sm:top-6 sm:right-6">
              <a
                href="mailto:hr@intersmart.in"
                className="text-xs !text-amber-400 hover:!text-amber-300 font-semibold transition flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg"
              >
                <Mail className="w-3.5 h-3.5 !text-amber-400" />
                <span className="!text-amber-400">Need help?</span>
              </a>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-1">Sign in to your account</h2>
              <p className="text-slate-400 text-sm">Enter your official email and password to continue.</p>
            </div>

            {error && (
              <div className="mb-5 p-3.5 bg-rose-950/90 border border-rose-500/70 rounded-xl text-xs font-semibold !text-rose-100 flex items-start gap-2.5 shadow-lg shadow-rose-950/40 animate-slideDown">
                {getErrorIcon(error)}
                <span className="!text-rose-100 leading-snug font-medium">{error}</span>
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
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
                  className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:border-transparent transition ${
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
                  <label className="block text-sm font-medium text-slate-300">Password</label>
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
                    className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:border-transparent transition pr-12 ${
                      fieldErrors.password
                        ? "border-red-500 focus:ring-red-500"
                        : "border-white/10 focus:ring-amber-500"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>

                {fieldErrors.password && (
                  <p className="text-red-400 text-xs mt-1">{fieldErrors.password}</p>
                )}
              </div>

              <div className="flex items-center justify-between mt-4 px-3 py-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition">
                <label htmlFor="remember" className="text-sm text-slate-300 cursor-pointer font-medium">Keep me signed in for 30 days</label>
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
                  <span className="inline-block h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
            <p className="text-slate-600 text-sm">© 2026 Inter Smart. All rights reserved.</p>
            <p className="text-slate-600 text-sm mt-1">Developed By Team QA</p>
          </div>
        </div>
      </div>
    </div>
  );
}
