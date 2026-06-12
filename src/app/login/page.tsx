"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Mail, Lock, Eye, EyeOff, User, ArrowRight, Loader2 } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api";

type Mode = "login" | "signup";

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (mode === "signup" && form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
      const body = mode === "login"
        ? { email: form.email, password: form.password }
        : { name: form.name, email: form.email, password: form.password };

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.success) {
        localStorage.setItem("admin_token", data.data.token);
        localStorage.setItem("admin_user", JSON.stringify(data.data.user));
        router.push("/");
      } else {
        setError(data.message || (mode === "login" ? "Invalid credentials" : "Registration failed"));
      }
    } catch {
      setError("Server not reachable. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setError("");
    setForm({ name: "", email: "", password: "", confirmPassword: "" });
  };

  return (
    <div className="min-h-screen flex bg-[#f5f6fa]">
      {/* Left Panel — Illustration */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#fff8f0] via-[#fef3e8] to-[#fde8d0] items-center justify-center relative overflow-hidden">
        {/* Background circles */}
        <div className="absolute top-[-80px] left-[-80px] w-[350px] h-[350px] rounded-full bg-amber-100/60" />
        <div className="absolute bottom-[-60px] right-[-60px] w-[280px] h-[280px] rounded-full bg-orange-100/50" />
        <div className="absolute top-[30%] right-[10%] w-[120px] h-[120px] rounded-full bg-amber-50/80 border border-amber-200/50" />

        <div className="relative z-10 text-center px-12 max-w-md">
          {/* Hospital illustration placeholder — medical icon grid */}
          <div className="w-64 h-64 mx-auto mb-8 relative">
            {/* Abstract hospital building illustration using CSS */}
            <div className="absolute inset-0 flex items-end justify-center gap-2 pb-4">
              <div className="w-10 h-20 bg-gradient-to-t from-blue-300 to-blue-200 rounded-t-lg opacity-70" />
              <div className="w-14 h-32 bg-gradient-to-t from-indigo-300 to-indigo-200 rounded-t-lg opacity-70" />
              <div className="w-16 h-40 bg-gradient-to-t from-blue-400 to-blue-300 rounded-t-lg opacity-80 relative">
                <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5">
                  <div className="w-5 h-1.5 bg-white/70 rounded-full" />
                  <div className="w-1.5 h-5 bg-white/70 rounded-full -mt-3.5 ml-0" />
                </div>
              </div>
              <div className="w-12 h-28 bg-gradient-to-t from-purple-300 to-purple-200 rounded-t-lg opacity-70" />
              <div className="w-8 h-16 bg-gradient-to-t from-blue-200 to-blue-100 rounded-t-lg opacity-60" />
            </div>
            {/* Gear icons */}
            <div className="absolute top-6 left-8 w-10 h-10 rounded-full border-4 border-blue-200/70 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-blue-200/70" />
            </div>
            <div className="absolute top-2 right-10 w-8 h-8 rounded-full border-4 border-indigo-200/70 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-indigo-200/70" />
            </div>
            {/* Cloud shapes */}
            <div className="absolute top-8 left-1/2 -translate-x-1/2 flex gap-1">
              <div className="w-8 h-6 rounded-full bg-white/50" />
              <div className="w-10 h-7 rounded-full bg-white/60 -ml-3" />
              <div className="w-8 h-6 rounded-full bg-white/50 -ml-3" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-amber-900 mb-3">BHRI Hospital Admin</h2>
          <p className="text-amber-700/70 text-sm leading-relaxed">
            Manage appointments, doctors, departments, and more from a single powerful dashboard.
          </p>

          {/* Stats pills */}
          <div className="flex justify-center gap-3 mt-8 flex-wrap">
            {[
              { label: "Departments", val: "20+" },
              { label: "Doctors", val: "50+" },
              { label: "Patients/day", val: "200+" },
            ].map(s => (
              <div key={s.label} className="bg-white/70 border border-amber-200/60 rounded-full px-4 py-1.5 text-xs">
                <span className="font-bold text-amber-800">{s.val}</span>
                <span className="text-amber-600 ml-1">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-md">

          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-200">
                <span className="text-white font-black text-lg leading-none">BHRI</span>
              </div>
              <div>
                <p className="font-black text-gray-800 text-lg leading-tight">BHRI Admin</p>
                <p className="text-xs text-gray-400 leading-tight">Hospital Management</p>
              </div>
            </div>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-100 border border-gray-100 p-8">

            {/* Title */}
            <h1 className="text-2xl font-bold text-gray-800 mb-1">
              {mode === "login" ? "Sign in to your account" : "Create your account"}
            </h1>
            <p className="text-sm text-gray-400 mb-7">
              {mode === "login" ? "Welcome back! Please enter your credentials." : "Fill in the details to create an admin account."}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name field — signup only */}
              {mode === "signup" && (
                <div>
                  <div className="relative">
                    <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      name="name"
                      placeholder="Full Name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 bg-gray-50 placeholder-gray-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    placeholder="admin@example.com"
                    value={form.email}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 bg-gray-50 placeholder-gray-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPass ? "text" : "password"}
                    name="password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-11 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 bg-gray-50 placeholder-gray-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password — signup only */}
              {mode === "signup" && (
                <div>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showConfirm ? "text" : "password"}
                      name="confirmPassword"
                      placeholder="Confirm password"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      required
                      className="w-full pl-10 pr-11 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 bg-gray-50 placeholder-gray-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Remember me + Forgot — login only */}
              {mode === "login" && (
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={e => setRemember(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-400"
                    />
                    <span className="text-sm text-gray-500">Remember me</span>
                  </label>
                  <button type="button" className="text-sm text-gray-400 hover:text-amber-600 transition">
                    Forgot Password?
                  </button>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 px-4 py-2.5 rounded-xl">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg shadow-amber-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-1"
              >
                {loading ? (
                  <><Loader2 size={16} className="animate-spin" /> {mode === "login" ? "Signing in..." : "Creating account..."}</>
                ) : (
                  <><ArrowRight size={16} /> {mode === "login" ? "Continue" : "Create Account"}</>
                )}
              </button>
            </form>

            {/* Switch mode */}
            <p className="text-center text-sm text-gray-400 mt-6">
              {mode === "login" ? (
                <>Don&apos;t have an account?{" "}
                  <button onClick={() => switchMode("signup")} className="text-amber-500 font-semibold hover:underline">Sign Up</button>
                  {" "}or{" "}
                  <span className="text-gray-400 hover:text-gray-600 cursor-pointer">learn more</span>
                </>
              ) : (
                <>Already have an account?{" "}
                  <button onClick={() => switchMode("login")} className="text-amber-500 font-semibold hover:underline">Sign In</button>
                </>
              )}
            </p>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-gray-300 mt-6">
            © {new Date().getFullYear()} BHRI — Buddha Hospital & Research Institute
          </p>
        </div>
      </div>
    </div>
  );
}
