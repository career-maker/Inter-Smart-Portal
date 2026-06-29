"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { Eye, EyeOff, LogIn } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [email, setEmail] = useState("admin@intersmart.in");
  const [password, setPassword] = useState("Admin@123456");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const response = await api.post("/login", { email, password });
      localStorage.setItem("token", response.data.token);
      setAuth(response.data.user, response.data.token);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid credentials. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Left branding panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 bg-gradient-to-br from-amber-900/20 to-slate-900">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Intersmart Logo" className="h-14 w-auto object-contain bg-white p-2 rounded-xl" />
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
          <p className="text-slate-600 text-sm">© 2026 Intersmart. All rights reserved.</p>
          <p className="text-slate-600 text-sm mt-1">Developed By Team QA</p>
        </div>
      </div>

      {/* Right login form */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center justify-center mb-8 lg:hidden">
            <img src="/logo.png" alt="Intersmart Logo" className="h-12 w-auto object-contain bg-white p-2 rounded-xl" />
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm shadow-2xl">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-1">Sign in to your account</h2>
              <p className="text-slate-400 text-sm">Enter your official email and password to continue.</p>
            </div>

            {error && (
              <div className="mb-5 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
                {error}
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
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@intersmart.in"
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-300">Password</label>
                  <a href="/forgot-password" className="text-xs text-amber-400 hover:text-amber-300 transition">
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-1">
                <input type="checkbox" id="remember" className="w-4 h-4 rounded border-slate-600 bg-white/5" defaultChecked />
                <label htmlFor="remember" className="text-sm text-slate-400">Keep me signed in for 30 days</label>
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

            <p className="mt-6 text-center text-sm text-slate-500">
              Having trouble?{" "}
              <a href="mailto:hr@intersmart.in" className="text-amber-400 hover:text-amber-300 transition">
                Contact HR
              </a>{" "}
              for assistance.
            </p>
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
