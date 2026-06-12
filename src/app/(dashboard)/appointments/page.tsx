"use client";

import { useState, useEffect, useRef } from "react";
import {
  RefreshCw, ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  Download, FileSpreadsheet, FileText, X, Loader2, CheckCircle2, XCircle, Eye
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api";

interface Appointment {
  id: number; appointmentId: string; tokenNumber: number; patientName: string;
  gender: string; age: number; mobile: string; date: string; time: string; status: string;
  address: string; symptoms: string; aadhaar?: string | null; email?: string | null;
  department?: { id: number; name: string }; doctor?: { id: number; name: string };
}

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${(h % 12 || 12).toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

// ── helper: download file blob ───────────────────────────────────────────────
async function triggerDownload(url: string, filename: string, token: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(await res.text());
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}

// ── Export Modal ─────────────────────────────────────────────────────────────
function ExportModal({
  onClose,
  defaultStartDate,
  defaultEndDate,
  defaultStatus,
}: {
  onClose: () => void;
  defaultStartDate: string;
  defaultEndDate: string;
  defaultStatus: string;
}) {
  const [format, setFormat]   = useState<"excel" | "pdf">("excel");
  const [startDate, setStart] = useState(defaultStartDate);
  const [endDate, setEnd]     = useState(defaultEndDate);
  const [status, setStatus]   = useState(defaultStatus);
  const [isLoading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleExport = async () => {
    if (!startDate || !endDate) {
      setError("Please select both Start Date and End Date.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const token = localStorage.getItem("admin_token") || "";
      const params = new URLSearchParams({ startDate, endDate });
      if (status) params.append("status", status);
      const ext      = format === "excel" ? "xlsx" : "pdf";
      const url      = `${API_BASE}/export/${format}?${params}`;
      const filename = `BHRI_Appointments_${startDate}_to_${endDate}.${ext}`;
      await triggerDownload(url, filename, token);
      setSuccess(true);
      setTimeout(onClose, 1200);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Export failed. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.50)", backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
        style={{ animation: "modalIn 0.22s cubic-bezier(.22,1,.36,1) both" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-[#1a3a6b] to-[#2a5298] rounded-xl">
              <Download className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Export Appointments</h2>
              <p className="text-xs text-gray-400 mt-0.5">Download as Excel or PDF</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Format */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Format</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "excel", label: "Excel (.xlsx)", icon: FileSpreadsheet, color: "emerald" },
                { key: "pdf",   label: "PDF (.pdf)",    icon: FileText,        color: "rose"    },
              ].map(f => {
                const Icon = f.icon;
                const active = format === f.key;
                return (
                  <button
                    key={f.key}
                    onClick={() => setFormat(f.key as "excel" | "pdf")}
                    className={`flex items-center gap-2.5 p-3.5 rounded-xl border-2 font-semibold text-sm transition-all duration-200
                      ${active
                        ? f.color === "emerald"
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                          : "border-rose-500 bg-rose-50 text-rose-700"
                        : "border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300 hover:bg-gray-100"
                      }`}
                  >
                    <Icon size={18} className={active ? undefined : "text-gray-400"} />
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStart(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#2a5298] focus:border-[#2a5298] transition-all bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEnd(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#2a5298] focus:border-[#2a5298] transition-all bg-white"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">
              Status <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#2a5298] focus:border-[#2a5298] transition-all bg-white"
            >
              <option value="">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Error / Success */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
              <XCircle size={14} className="flex-shrink-0" /> {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs">
              <CheckCircle2 size={14} className="flex-shrink-0" /> Download started!
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 pt-1 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isLoading || success}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm text-white transition-all
              ${isLoading || success
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-gradient-to-r from-[#1a3a6b] to-[#2a5298] hover:from-[#15305a] hover:to-[#1e4080] hover:shadow-md active:scale-95"
              }`}
          >
            {isLoading ? (
              <><Loader2 size={14} className="animate-spin" /> Generating…</>
            ) : success ? (
              <><CheckCircle2 size={14} /> Downloaded!</>
            ) : (
              <><Download size={14} /> Download {format === "excel" ? "Excel" : "PDF"}</>
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(6px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);   }
        }
      `}</style>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading]           = useState(true);
  const [filterDate, setFilterDate]     = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [error, setError]               = useState("");
  const [showExport, setShowExport]     = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const [currentPage, setCurrentPage]   = useState(1);
  const [rowsPerPage, setRowsPerPage]   = useState(10);
  const [sortConfig, setSortConfig]     = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  const fetchAppointments = () => {
    const token = localStorage.getItem("admin_token");
    let url = `${API_BASE}/appointments`;
    const params: string[] = [];
    if (filterDate)   params.push(`date=${filterDate}`);
    if (filterStatus) params.push(`status=${filterStatus}`);
    if (params.length > 0) url += `?${params.join("&")}`;
    setLoading(true);
    setError("");
    setCurrentPage(1);
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.success) setAppointments(d.data);
        else setError(d.message || "Failed to load appointments");
      })
      .catch(err => setError(`Network error: ${err.message} — Is the backend running at ${API_BASE}?`))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { fetchAppointments(); }, [filterDate, filterStatus]);

  const updateStatus = (id: number, status: string) => {
    const token = localStorage.getItem("admin_token");
    fetch(`${API_BASE}/appointments/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    }).then(r => r.json()).then(d => { if (d.success) fetchAppointments(); });
  };

  const statusColors: Record<string, string> = {
    pending:   "bg-yellow-100 text-yellow-700",
    confirmed: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };

  const handleSort = (key: string) => {
    setSortConfig(prev =>
      prev?.key === key && prev.direction === "asc"
        ? { key, direction: "desc" }
        : { key, direction: "asc" }
    );
  };

  const sortedAppointments = [...appointments].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    let aVal: string | number = a[key as keyof Appointment] as string | number;
    let bVal: string | number = b[key as keyof Appointment] as string | number;
    if (key === "departmentName") { aVal = a.department?.name || ""; bVal = b.department?.name || ""; }
    if (aVal < bVal) return direction === "asc" ? -1 : 1;
    if (aVal > bVal) return direction === "asc" ?  1 : -1;
    return 0;
  });

  const totalPages          = Math.ceil(sortedAppointments.length / rowsPerPage) || 1;
  const paginatedAppointments = sortedAppointments.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  // compute export defaults from active filters
  const today = new Date().toISOString().split("T")[0];
  const exportStart = filterDate || today;
  const exportEnd   = filterDate || today;

  const renderSortIcon = (col: string) =>
    sortConfig?.key === col
      ? sortConfig.direction === "asc"
        ? <ChevronUp size={13} />
        : <ChevronDown size={13} />
      : null;

  return (
    <div className="space-y-6">
      {/* Export Modal */}
      {showExport && (
        <ExportModal
          onClose={() => setShowExport(false)}
          defaultStartDate={exportStart}
          defaultEndDate={exportEnd}
          defaultStatus={filterStatus}
        />
      )}

      {selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/55 backdrop-blur-sm">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="relative px-6 py-5 bg-gradient-to-r from-[#15305a] via-[#1a3a6b] to-[#2a5298] text-white">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_32%)]" />
              <div className="relative flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-blue-100 font-bold">Appointment Record</p>
                  <h2 className="text-xl font-extrabold mt-1 !text-white">{selectedAppointment.patientName}</h2>
                  <p className="text-xs text-blue-100 mt-1 font-mono">{selectedAppointment.appointmentId}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1.5 rounded-full text-xs font-extrabold uppercase border border-white/20 ${
                    statusColors[selectedAppointment.status] || "bg-white/15 text-white"
                  }`}>
                    {selectedAppointment.status}
                  </span>
                  <button
                    onClick={() => setSelectedAppointment(null)}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto bg-slate-50">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
                <div className="rounded-2xl bg-white border border-gray-100 p-4 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Token No.</p>
                  <p className="text-3xl font-extrabold text-[#1a3a6b] mt-1">#{String(selectedAppointment.tokenNumber).padStart(2, "0")}</p>
                </div>
                <div className="rounded-2xl bg-white border border-gray-100 p-4 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Department</p>
                  <p className="font-bold text-gray-900 mt-2">{selectedAppointment.department?.name || "-"}</p>
                </div>
                <div className="rounded-2xl bg-white border border-gray-100 p-4 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Date & Time</p>
                  <p className="font-bold text-gray-900 mt-2">{selectedAppointment.date}</p>
                  <p className="text-sm font-semibold text-blue-700 mt-0.5">{formatTime(selectedAppointment.time)}</p>
                </div>
              </div>

              <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 bg-white">
                  <h3 className="font-bold text-gray-900">Patient Information</h3>
                  <p className="text-xs text-gray-400 mt-0.5">All submitted form details</p>
                </div>

                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  {[
                    ["Patient Name", selectedAppointment.patientName],
                    ["Gender / Age", `${selectedAppointment.gender}, ${selectedAppointment.age} yrs`],
                    ["Mobile", selectedAppointment.mobile],
                    ["Aadhaar", selectedAppointment.aadhaar || "-"],
                    ["Email", selectedAppointment.email || "-"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-gray-100 bg-slate-50 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">{label}</p>
                      <p className="font-semibold text-gray-800 break-words">{value}</p>
                    </div>
                  ))}

                  <div className="sm:col-span-2 rounded-xl border border-gray-100 bg-slate-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Address</p>
                    <p className="font-semibold text-gray-800 break-words">{selectedAppointment.address || "-"}</p>
                  </div>

                  <div className="sm:col-span-2 rounded-xl border border-gray-100 bg-slate-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Problem / Symptoms</p>
                    <p className="font-semibold text-gray-800 break-words leading-relaxed">{selectedAppointment.symptoms || "-"}</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="px-5 py-2.5 rounded-xl bg-[#1a3a6b] text-white text-sm font-bold hover:bg-[#15305a] transition shadow-sm"
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Appointments</h1>
          <p className="text-sm text-gray-500 mt-1">Manage OPD bookings, patient details, and appointment status.</p>
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-2 flex-wrap">

          {/* ── Export Report button (LEFT of date input) ── */}
          <button
            id="export-report-btn"
            onClick={() => setShowExport(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl text-sm shadow-sm hover:border-[#2a5298] hover:text-[#2a5298] hover:bg-blue-50 transition-all group"
          >
            <Download size={14} className="group-hover:text-[#2a5298] transition-colors" />
            Export Report
          </button>

          {/* Date filter */}
          <input
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm shadow-sm focus:ring-2 focus:ring-[#2a5298] outline-none flex-1 min-w-0"
          />
          {filterDate && (
            <button
              onClick={() => setFilterDate("")}
              className="text-xs text-blue-600 underline hover:text-blue-800 whitespace-nowrap"
            >
              Clear Date
            </button>
          )}

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm shadow-sm focus:ring-2 focus:ring-[#2a5298] outline-none"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Refresh */}
          <button
            onClick={fetchAppointments}
            className="p-2 bg-[#1a3a6b] text-white rounded-xl hover:bg-[#0f2557] shadow-sm"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">
          <p className="text-lg">No appointments found</p>
          <p className="text-sm mt-1">{filterDate ? `No appointments on ${filterDate}` : "No appointments in database yet"}</p>
          <p className="text-xs mt-2 text-gray-400">API: {API_BASE}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-900">Appointment List</h2>
              <p className="text-xs text-gray-400 mt-0.5">{appointments.length} records found</p>
            </div>
          </div>

          {/* ── Desktop Table (hidden on mobile) ── */}
          <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 cursor-pointer hover:bg-gray-200 select-none" onClick={() => handleSort("tokenNumber")}>
                  <div className="flex items-center gap-1">Token {renderSortIcon("tokenNumber")}</div>
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 cursor-pointer hover:bg-gray-200 select-none" onClick={() => handleSort("appointmentId")}>
                  <div className="flex items-center gap-1">Appt ID {renderSortIcon("appointmentId")}</div>
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 cursor-pointer hover:bg-gray-200 select-none" onClick={() => handleSort("patientName")}>
                  <div className="flex items-center gap-1">Patient {renderSortIcon("patientName")}</div>
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Mobile</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 cursor-pointer hover:bg-gray-200 select-none" onClick={() => handleSort("departmentName")}>
                  <div className="flex items-center gap-1">Department {renderSortIcon("departmentName")}</div>
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600 cursor-pointer hover:bg-gray-200 select-none" onClick={() => handleSort("time")}>
                  <div className="flex items-center justify-center gap-1">Time {renderSortIcon("time")}</div>
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600 cursor-pointer hover:bg-gray-200 select-none" onClick={() => handleSort("status")}>
                  <div className="flex items-center justify-center gap-1">Status {renderSortIcon("status")}</div>
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedAppointments.map(apt => (
                <tr key={apt.id} className="border-b border-gray-50 hover:bg-blue-50/40 transition">
                  <td className="px-4 py-3 font-bold text-[#1a3a6b]">#{String(apt.tokenNumber).padStart(2, "0")}</td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-500">{apt.appointmentId}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-800">{apt.patientName}</div>
                    <div className="text-xs text-gray-400">{apt.gender}, {apt.age} yrs</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{apt.mobile}</td>
                  <td className="px-4 py-3 text-gray-600">{apt.department?.name || "-"}</td>
                  <td className="px-4 py-3 text-center font-medium">{formatTime(apt.time)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${statusColors[apt.status] || "bg-gray-100 text-gray-600"}`}>
                      {apt.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setSelectedAppointment(apt)}
                        className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                        title="View full details"
                      >
                        <Eye size={14} />
                      </button>
                      <select
                        value={apt.status}
                        onChange={e => updateStatus(apt.id, e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white shadow-sm"
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {/* ── Mobile Card View (visible only on mobile) ── */}
          <div className="md:hidden divide-y divide-gray-50">
            {paginatedAppointments.map(apt => (
              <div key={apt.id} className="p-4 hover:bg-blue-50/30 transition">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#1a3a6b] text-lg">#{String(apt.tokenNumber).padStart(2, "0")}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColors[apt.status] || "bg-gray-100 text-gray-600"}`}>
                      {apt.status}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedAppointment(apt)}
                    className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                    title="View full details"
                  >
                    <Eye size={14} />
                  </button>
                </div>
                <div className="font-semibold text-gray-800">{apt.patientName}</div>
                <div className="text-xs text-gray-400 mt-0.5">{apt.gender}, {apt.age} yrs • {apt.mobile}</div>
                <div className="flex items-center justify-between mt-2">
                  <div className="text-xs text-gray-500">
                    <span className="font-medium">{apt.department?.name || "-"}</span>
                    {" • "}{formatTime(apt.time)}
                  </div>
                  <select
                    value={apt.status}
                    onChange={e => updateStatus(apt.id, e.target.value)}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white shadow-sm"
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="text-[10px] font-mono text-gray-400 mt-1">{apt.appointmentId}</div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {appointments.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-3 border-t border-gray-100 bg-gray-50">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Rows:</span>
                <select
                  value={rowsPerPage}
                  onChange={e => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="border border-gray-300 rounded px-2 py-1 outline-none"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <span className="text-xs text-gray-500">
                Page {currentPage} of {totalPages} ({appointments.length} total)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="p-1.5 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-200"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="p-1.5 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-200"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
