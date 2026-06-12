"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CalendarCheck, Building2, Clock, CheckCircle2, XCircle,
  Activity, ArrowRight, UserCheck, MessageSquare
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api";

// ─── Main Dashboard Page ──────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [stats, setStats] = useState({ totalToday: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0, today: "" });
  const [deptCount, setDeptCount] = useState(0);
  const [docCount, setDocCount] = useState(0);
  const [contactCount, setContactCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    const headers: HeadersInit = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch(`${API_BASE}/appointments/stats`, { headers }).then(r => r.json()).catch(() => ({ success: false })),
      fetch(`${API_BASE}/departments`).then(r => r.json()).catch(() => ({ success: false })),
      fetch(`${API_BASE}/doctors`).then(r => r.json()).catch(() => ({ success: false })),
      fetch(`${API_BASE}/contacts?limit=1&status=new`, { headers }).then(r => r.json()).catch(() => ({ success: false }))
    ]).then(([statsData, deptData, docData, contactData]) => {
      if (statsData.success) setStats(statsData.data);
      if (deptData.success) setDeptCount(deptData.data.length);
      if (docData.success) setDocCount(docData.data.length);
      if (contactData.success) setContactCount(contactData.pagination?.total || 0);
      setIsLoading(false);
    });
  }, []);

  const topCards = [
    { label: "Today's Appointments", value: stats.totalToday, href: "/appointments", icon: CalendarCheck, color: "blue",   bg: "bg-blue-500",   text: "text-blue-600",   lightBg: "bg-blue-50",   border: "border-blue-100" },
    { label: "Pending",              value: stats.pending,    href: "/appointments", icon: Clock,         color: "amber",  bg: "bg-amber-500",  text: "text-amber-600",  lightBg: "bg-amber-50",  border: "border-amber-100" },
    { label: "Confirmed",            value: stats.confirmed,  href: "/appointments", icon: CheckCircle2,  color: "emerald",bg: "bg-emerald-500",text: "text-emerald-600",lightBg: "bg-emerald-50",border: "border-emerald-100" },
    { label: "Cancelled",            value: stats.cancelled,  href: "/appointments", icon: XCircle,       color: "rose",   bg: "bg-rose-500",   text: "text-rose-600",   lightBg: "bg-rose-50",   border: "border-rose-100" },
  ];

  const entityCards = [
    { label: "Total Doctors", value: docCount,      href: "/doctors",      icon: UserCheck,    desc: "Active practitioners",    color: "indigo", text: "text-indigo-600", lightBg: "bg-indigo-50" },
    { label: "Departments",   value: deptCount,     href: "/departments",  icon: Building2,    desc: "Specialized wards",       color: "violet", text: "text-violet-600", lightBg: "bg-violet-50" },
    { label: "New Messages",  value: contactCount,  href: "/contact",      icon: MessageSquare,desc: "Unread contact inquiries", color: "sky",    text: "text-sky-600",    lightBg: "bg-sky-50" },
  ];

  return (
    <div className="max-w-[1600px] mx-auto w-full pt-2 pb-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-[#1a3a6b] to-[#2a5298] rounded-xl shadow-inner">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Overview Dashboard</h1>
            <p className="text-sm text-gray-500 font-medium mt-0.5">
              {stats.today
                ? new Date(stats.today).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
                : new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2.5 bg-gradient-to-r from-gray-900 to-gray-800 text-white font-semibold rounded-xl text-sm shadow-md hover:shadow-lg hover:from-black hover:to-gray-900 transition-all focus:ring-2 focus:ring-gray-900 outline-none">
            Last 30 Days
          </button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div>
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 px-1">Appointments Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {topCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <Link key={i} href={card.href} className={`relative block overflow-hidden bg-white rounded-2xl border ${card.border} p-6 shadow-sm hover:shadow-md hover:ring-2 hover:ring-offset-2 hover:ring-${card.color}-100 transition-all duration-300 group`}>
                <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full opacity-[0.03] group-hover:opacity-[0.06] transition-opacity ${card.bg}`} />
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide group-hover:text-gray-700 transition-colors">{card.label}</h3>
                  <div className={`p-2 rounded-xl ${card.lightBg} transition-transform group-hover:scale-110 duration-300`}>
                    <Icon size={20} className={card.text} />
                  </div>
                </div>
                <div className="relative z-10 flex items-center justify-between">
                  {isLoading ? (
                    <div className="h-10 w-16 bg-gray-100 rounded animate-pulse" />
                  ) : (
                    <div className="flex items-baseline gap-2">
                      <h2 className={`text-4xl font-extrabold ${card.text}`}>{card.value}</h2>
                      <span className="text-sm font-medium text-gray-400">total</span>
                    </div>
                  )}
                  <ArrowRight size={18} className={`opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all duration-300 ${card.text}`} />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Secondary Stats */}
      <div>
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 px-1">Hospital Resources</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {entityCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <Link key={i} href={card.href} className="block bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-300 group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <div className={`p-4 rounded-2xl ${card.lightBg} transition-transform group-hover:-translate-y-1 duration-300`}>
                      <Icon size={28} className={card.text} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide group-hover:text-gray-700 transition-colors">{card.label}</h3>
                      <p className="text-xs font-medium text-gray-400 mt-0.5">{card.desc}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex items-center justify-between border-t border-gray-50 pt-4">
                  {isLoading ? (
                    <div className="h-10 w-16 bg-gray-100 rounded animate-pulse" />
                  ) : (
                    <h2 className="text-3xl font-extrabold text-gray-900">{card.value}</h2>
                  )}
                  <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-gray-900 transition-colors duration-300">
                    <ArrowRight size={14} className="text-gray-400 group-hover:text-white transition-colors duration-300" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

    </div>
  );
}
