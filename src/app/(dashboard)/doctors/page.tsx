"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Edit2, Trash2, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Search, Camera, X, Upload, Check } from "lucide-react";

// ── Searchable Select Component ───────────────────────────────────────────────
interface SearchableSelectProps {
  options: { value: number | string; label: string }[];
  value: number | string;
  onChange: (val: number | string) => void;
  placeholder?: string;
  className?: string;
}
function SearchableSelect({ options, value, onChange, placeholder = "Select...", className = "" }: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find(o => o.value === value);
  const filtered  = options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false); setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleOpen = () => { setOpen(true); setQuery(""); setTimeout(() => inputRef.current?.focus(), 0); };
  const handleSelect = (val: number | string) => { onChange(val); setOpen(false); setQuery(""); };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => open ? setOpen(false) : handleOpen()}
        className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg text-sm bg-white transition-all outline-none
          ${open ? "border-[#1a3a6b] ring-2 ring-[#1a3a6b]/20" : "border-gray-300 hover:border-gray-400"}`}
      >
        <span className={selected ? "text-gray-800" : "text-gray-400"}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={15} className={`text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search..."
                className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a3a6b]/30 focus:border-[#1a3a6b]"
              />
            </div>
          </div>
          {/* Options list */}
          <ul className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2.5 text-sm text-gray-400 text-center">No results found</li>
            ) : (
              filtered.map(opt => (
                <li
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  className={`flex items-center justify-between px-3 py-2 cursor-pointer text-sm transition-colors
                    ${opt.value === value
                      ? "bg-[#1a3a6b]/5 text-[#1a3a6b] font-semibold"
                      : "text-gray-700 hover:bg-gray-50"}`}
                >
                  {opt.label}
                  {opt.value === value && <Check size={13} className="text-[#1a3a6b]" />}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api";

interface Doctor {
  id: number; name: string; qualification: string; experience: number; opdStartTime: string; opdEndTime: string;
  consultationFee: number; maxDailyPatients: number; slotDuration: number; availableDays: string; isActive: boolean; departmentId: number;
  photo?: string | null;
  department?: { id: number; name: string };
}
interface Dept { id: number; name: string }

function formatTime(t: string) { const [h, m] = t.split(":").map(Number); return `${(h % 12 || 12).toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`; }

const DEFAULT_FORM = { name: "", qualification: "", experience: "", departmentId: 0, opdStartTime: "09:00", opdEndTime: "14:00", slotDuration: 15, consultationFee: 300, maxDailyPatients: 16, availableDays: "Monday,Tuesday,Wednesday,Thursday,Friday,Saturday" };

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);

  // Image state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lightbox state
  const [lightboxImg, setLightboxImg] = useState<{ url: string; name: string } | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: "asc" | "desc" } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [daysDropdownOpen, setDaysDropdownOpen] = useState(false);
  const daysDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (daysDropdownRef.current && !daysDropdownRef.current.contains(e.target as Node)) {
        setDaysDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const token = () => localStorage.getItem("admin_token") || "";

  const fetchDoctors = () => {
    setLoading(true);
    // Backend returns ALL doctors when no limit is specified (limit=0 is default)
    fetch(`${API_BASE}/doctors/admin/all`, {
      headers: { Authorization: `Bearer ${token()}` }
    })
      .then(r => r.json())
      .then(d => { if (d.success) setDoctors(d.data); })
      .catch(err => console.error("API error:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDoctors();
    fetch(`${API_BASE}/departments`).then(r => r.json()).then(d => { if (d.success) setDepartments(d.data); }).catch(err => console.error("API error:", err));
  }, []);

  // ── Image helpers ──
  const handleImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) { alert("Please select an image file."); return; }
    if (file.size > 5 * 1024 * 1024) { alert("Image must be under 5 MB."); return; }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setPhotoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleImageFile(file);
  };

  const removePhoto = () => { setPhotoFile(null); setPhotoPreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; };

  // ── Save ──
  const handleSave = async () => {
    // ── Frontend validation ──
    if (!form.name.trim()) { alert("❌ Doctor name is required."); return; }
    if (!form.departmentId || form.departmentId === 0) { alert("❌ Please select a department."); return; }
    if (!form.qualification.trim()) { alert("❌ Qualification is required."); return; }

    const url = editId ? `${API_BASE}/doctors/${editId}` : `${API_BASE}/doctors`;
    const method = editId ? "PUT" : "POST";

    const fd = new FormData();
    // Append string fields
    fd.append("name", form.name.trim());
    fd.append("qualification", form.qualification.trim());
    fd.append("opdStartTime", form.opdStartTime);
    fd.append("opdEndTime", form.opdEndTime);
    fd.append("availableDays", form.availableDays);
    // Append numeric fields as actual numbers (important for Joi validation)
    fd.append("departmentId", String(Number(form.departmentId)));
    fd.append("experience", String(Number(form.experience) || 0));
    fd.append("consultationFee", String(Number(form.consultationFee)));
    fd.append("maxDailyPatients", String(Number(form.maxDailyPatients)));
    fd.append("slotDuration", String(Number(form.slotDuration)));
    if (photoFile) fd.append("photo", photoFile);

    let res: Response;
    try {
      res = await fetch(url, { method, headers: { Authorization: `Bearer ${token()}` }, body: fd });
    } catch {
      alert("❌ Cannot connect to server. Please make sure the backend is running at:\n" + API_BASE);
      return;
    }

    // Try to parse JSON; if server returned HTML (404/500 page) show a readable error
    let data: { success: boolean; message?: string } | null = null;
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      data = await res.json();
    } else {
      const text = await res.text();
      alert(`❌ Server error (HTTP ${res.status}):\n${text.substring(0, 300)}`);
      return;
    }

    if (data && data.success) {
      alert(data.message || "Saved successfully");
      setShowForm(false); setEditId(null);
      fetchDoctors();
      setForm(DEFAULT_FORM); removePhoto();
    } else {
      alert(`❌ ${data?.message || "Failed to save doctor"}`);
    }
  };

  // Normalize any short day names (Mon → Monday) so checkboxes match correctly
  const normalizeDays = (days: string): string => {
    const map: Record<string, string> = {
      Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday",
      Thu: "Thursday", Fri: "Friday", Sat: "Saturday", Sun: "Sunday",
    };
    return days
      .split(",")
      .map(d => d.trim())
      .filter(Boolean)
      .map(d => map[d] || d)  // if already full name, keep as is
      .join(",");
  };

  const handleEdit = (doc: Doctor) => {
    setEditId(doc.id);
    setForm({
      name: doc.name,
      qualification: doc.qualification,
      experience: doc.experience !== undefined && doc.experience !== null ? String(doc.experience) : "",
      departmentId: doc.departmentId,
      opdStartTime: doc.opdStartTime,
      opdEndTime: doc.opdEndTime,
      slotDuration: doc.slotDuration,
      consultationFee: doc.consultationFee,
      maxDailyPatients: doc.maxDailyPatients,
      availableDays: normalizeDays(doc.availableDays || ""),
    });
    // Show existing photo as preview
    if (doc.photo) { setPhotoPreview(`${API_BASE.replace("/api", "")}${doc.photo}`); } else { setPhotoPreview(null); }
    setPhotoFile(null);
    setShowForm(true);
  };

  const handleCloseForm = () => { setShowForm(false); setEditId(null); setForm(DEFAULT_FORM); removePhoto(); };

  const handleDelete = async (doc: Doctor) => {
    // If doctor has appointments, backend will block permanent delete
    const confirmMsg = `⚠️ PERMANENTLY delete "${doc.name}"?\n\nThis will remove the doctor from the database forever.\nIf you just want to hide from the website, use the Active/Inactive toggle instead.\n\nType DELETE to confirm:`;
    const input = prompt(confirmMsg);
    if (input !== "DELETE") {
      if (input !== null) alert("Cancelled — you must type DELETE to confirm.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/doctors/${doc.id}/permanent`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (data.success) {
        alert("✅ Doctor permanently deleted.");
        fetchDoctors();
      } else {
        alert(`❌ ${data.message || "Failed to delete"}`);
      }
    } catch {
      alert("❌ Network error — could not delete doctor.");
    }
  };

  // ── Toggle Active / Inactive ──
  const handleToggleStatus = async (doc: Doctor) => {
    // Optimistic UI update
    setDoctors(prev => prev.map(d => d.id === doc.id ? { ...d, isActive: !d.isActive } : d));
    try {
      const res = await fetch(`${API_BASE}/doctors/${doc.id}/toggle-status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (!data.success) {
        // Revert on failure
        setDoctors(prev => prev.map(d => d.id === doc.id ? { ...d, isActive: doc.isActive } : d));
        alert(data.message || "Failed to update status");
      }
    } catch {
      setDoctors(prev => prev.map(d => d.id === doc.id ? { ...d, isActive: doc.isActive } : d));
      alert("Network error — could not toggle doctor status.");
    }
  };

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  };

  const filteredDoctors = doctors.filter(doc => {
    const matchSearch =
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.department?.name && doc.department.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      doc.qualification.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && doc.isActive) ||
      (statusFilter === "inactive" && !doc.isActive);
    return matchSearch && matchStatus;
  });

  const sortedDoctors = [...filteredDoctors].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    let aValue: string | number = a[key as keyof Doctor] as string | number;
    let bValue: string | number = b[key as keyof Doctor] as string | number;
    if (key === "departmentName") { aValue = a.department?.name || ""; bValue = b.department?.name || ""; }
    if (aValue < bValue) return direction === "asc" ? -1 : 1;
    if (aValue > bValue) return direction === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedDoctors.length / rowsPerPage) || 1;
  const paginatedDoctors = sortedDoctors.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const getPhotoUrl = (photo: string | null | undefined) =>
    photo ? `${API_BASE.replace("/api", "")}${photo}` : null;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-800 !text-gray-800">Doctors</h1>
        <button onClick={() => { setShowForm(true); setEditId(null); }} className="flex items-center gap-2 px-4 py-2 bg-[#1a3a6b] text-white text-sm font-semibold rounded-lg hover:bg-[#0f2557] w-fit">
          <Plus size={16} /> Add Doctor
        </button>
      </div>

      {/* ── Lightbox Modal ── */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setLightboxImg(null)}
        >
          <div className="relative max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setLightboxImg(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white flex items-center gap-1.5 text-sm font-medium"
            >
              <X size={18} /> Close
            </button>
            <div className="rounded-2xl overflow-hidden shadow-2xl border-4 border-white/20">
              <img
                src={lightboxImg.url}
                alt={lightboxImg.name}
                className="w-full max-h-[70vh] object-contain bg-gray-900"
              />
            </div>
            <p className="text-center text-white/90 text-sm font-semibold mt-3 tracking-wide">{lightboxImg.name}</p>
          </div>
        </div>
      )}

      {/* ── Form Modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[95vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold !text-gray-800">{editId ? "Edit Doctor" : "Add New Doctor"}</h3>
              <button onClick={handleCloseForm} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><X size={18} /></button>
            </div>

            {/* ── Professional Photo Upload ── */}
            <div className="mb-5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block">Doctor Photo</label>
              <div className="flex items-center gap-4">
                {/* Preview circle */}
                <div className="relative flex-shrink-0">
                  <div className="w-24 h-24 rounded-full border-2 border-dashed border-gray-300 overflow-hidden bg-gray-50 flex items-center justify-center">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-gray-300">
                        <Camera size={28} />
                        <span className="text-[10px]">No photo</span>
                      </div>
                    )}
                  </div>
                  {photoPreview && (
                    <button onClick={removePhoto} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow">
                      <X size={10} />
                    </button>
                  )}
                </div>

                {/* Drop zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex-1 border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-200
                    ${isDragging ? "border-[#1a3a6b] bg-blue-50" : "border-gray-200 hover:border-[#1a3a6b] hover:bg-gray-50"}`}
                >
                  <Upload size={20} className="mx-auto mb-1.5 text-gray-400" />
                  <p className="text-sm font-medium text-gray-600">Drag & drop or <span className="text-[#1a3a6b] font-semibold">click to browse</span></p>
                  <p className="text-xs text-gray-400 mt-0.5">JPG, PNG, WEBP — max 5 MB</p>
                  {photoFile && <p className="text-xs text-green-600 mt-1 font-medium">✓ {photoFile.name}</p>}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageFile(f); }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600">Name</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Department</label>
                <SearchableSelect
                  className="mt-1"
                  placeholder="Select department..."
                  value={form.departmentId}
                  onChange={val => setForm({ ...form, departmentId: Number(val) })}
                  options={departments.map(d => ({ value: d.id, label: d.name }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Qualification</label>
                <input value={form.qualification} onChange={e => setForm({ ...form, qualification: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" placeholder="e.g. MBBS, MD" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Experience (Years)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 5"
                  value={form.experience === "" ? "" : form.experience}
                  onChange={e => setForm({ ...form, experience: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Consultation Fee (₹)</label>
                <input type="number" value={form.consultationFee} onChange={e => setForm({ ...form, consultationFee: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">OPD Start Time</label>
                <input type="time" value={form.opdStartTime} onChange={e => setForm({ ...form, opdStartTime: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">OPD End Time</label>
                <input type="time" value={form.opdEndTime} onChange={e => setForm({ ...form, opdEndTime: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Slot Duration (min)</label>
                <input type="number" value={form.slotDuration} onChange={e => setForm({ ...form, slotDuration: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Max Daily Patients</label>
                <input type="number" value={form.maxDailyPatients} onChange={e => setForm({ ...form, maxDailyPatients: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
              </div>
              <div className="col-span-2 relative" ref={daysDropdownRef}>
                <label className="text-xs font-medium text-gray-600">Available Days</label>
                <button
                  type="button"
                  onClick={() => setDaysDropdownOpen(prev => !prev)}
                  className="w-full px-3 py-2 border rounded-lg text-sm mt-1 text-left bg-white flex items-center justify-between hover:border-gray-400 focus:ring-2 focus:ring-[#1a3a6b] outline-none"
                >
                  <span className={form.availableDays ? "text-gray-800" : "text-gray-400"}>
                    {form.availableDays || "Select days"}
                  </span>
                  <ChevronDown size={16} className={`text-gray-400 transition-transform ${daysDropdownOpen ? "rotate-180" : ""}`} />
                </button>
                {daysDropdownOpen && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg py-1">
                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => {
                      const days = form.availableDays ? form.availableDays.split(",").map(d => d.trim()).filter(Boolean) : [];
                      const isChecked = days.includes(day);
                      return (
                        <label key={day} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-gray-50 select-none">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              const updated = isChecked ? days.filter(d => d !== day) : [...days, day];
                              const order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
                              updated.sort((a, b) => order.indexOf(a) - order.indexOf(b));
                              setForm({ ...form, availableDays: updated.join(",") });
                            }}
                            className="w-4 h-4 rounded border-gray-300 accent-[#1a3a6b]"
                          />
                          <span className="text-sm text-gray-700">{day}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={handleSave} className="flex-1 py-2.5 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700">Save</button>
              <button onClick={handleCloseForm} className="flex-1 py-2.5 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Table ── */}
      {loading ? <div className="text-center py-12 text-gray-400">Loading...</div> : (
        <div className="space-y-4">
          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search doctors by name, department, or qualification..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1a3a6b] outline-none"
              />
            </div>
            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {(["all", "active", "inactive"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => { setStatusFilter(f); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-all duration-150
                    ${statusFilter === f
                      ? f === "active" ? "bg-green-500 text-white shadow-sm"
                        : f === "inactive" ? "bg-red-400 text-white shadow-sm"
                        : "bg-white text-gray-700 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"}`}
                >
                  {f === "all" ? `All (${doctors.length})` : f === "active" ? `Active (${doctors.filter(d => d.isActive).length})` : `Inactive (${doctors.filter(d => !d.isActive).length})`}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-auto max-h-[calc(100vh-17rem)]">
              <table className="w-full text-sm relative">
                <thead className="bg-gray-50 border-b sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 w-12">Photo</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 cursor-pointer hover:bg-gray-200 select-none" onClick={() => handleSort("name")}>
                      <div className="flex items-center gap-1">Name {sortConfig?.key === "name" && (sortConfig.direction === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 cursor-pointer hover:bg-gray-200 select-none" onClick={() => handleSort("departmentName")}>
                      <div className="flex items-center gap-1">Department {sortConfig?.key === "departmentName" && (sortConfig.direction === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 cursor-pointer hover:bg-gray-200 select-none" onClick={() => handleSort("qualification")}>
                      <div className="flex items-center gap-1">Qualification {sortConfig?.key === "qualification" && (sortConfig.direction === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-600">OPD Timing</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-600 cursor-pointer hover:bg-gray-200 select-none" onClick={() => handleSort("consultationFee")}>
                      <div className="flex items-center justify-center gap-1">Fee {sortConfig?.key === "consultationFee" && (sortConfig.direction === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-600">Status</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedDoctors.map(doc => {
                    const photoUrl = getPhotoUrl(doc.photo);
                    return (
                      <tr key={doc.id} className={`border-b border-gray-50 transition-colors ${doc.isActive ? "hover:bg-gray-50" : "bg-gray-50/60 opacity-70 hover:opacity-100"}`}>
                        <td className="px-4 py-2.5">
                          <div
                            className={`w-10 h-10 rounded-full overflow-hidden bg-[#1a3a6b]/10 flex items-center justify-center flex-shrink-0 border border-gray-100 transition-all duration-200
                              ${photoUrl ? "cursor-pointer hover:ring-2 hover:ring-[#1a3a6b] hover:ring-offset-2 hover:scale-110" : ""}`}
                            onClick={() => photoUrl && setLightboxImg({ url: photoUrl, name: doc.name })}
                            title={photoUrl ? `View ${doc.name}'s photo` : ""}
                          >
                            {photoUrl ? (
                              <img src={photoUrl} alt={doc.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[#1a3a6b] font-bold text-sm">{doc.name.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="font-semibold text-gray-800">{doc.name}</div>
                          {!doc.isActive && <span className="text-[10px] font-bold text-red-400 uppercase tracking-wide">Inactive</span>}
                        </td>
                        <td className="px-4 py-2.5 text-gray-600">{doc.department?.name || "-"}</td>
                        <td className="px-4 py-2.5 text-gray-500 text-xs">{doc.qualification}</td>
                        <td className="px-4 py-2.5 text-center font-medium text-[#1a3a6b]">{formatTime(doc.opdStartTime)} - {formatTime(doc.opdEndTime)}</td>
                        <td className="px-4 py-2.5 text-center font-bold text-green-700">₹{doc.consultationFee}</td>
                        {/* ── Status Toggle ── */}
                        <td className="px-4 py-2.5 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <button
                              onClick={() => handleToggleStatus(doc)}
                              title={doc.isActive ? "Click to deactivate" : "Click to activate"}
                              className={`relative inline-flex items-center w-11 h-6 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-1
                                ${doc.isActive ? "bg-green-500 focus:ring-green-400" : "bg-gray-300 focus:ring-gray-400"}`}
                            >
                              <span className={`inline-block w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300
                                ${doc.isActive ? "translate-x-6" : "translate-x-1"}`}
                              />
                            </button>
                            <span className={`text-[10px] font-bold uppercase tracking-wide ${doc.isActive ? "text-green-600" : "text-gray-400"}`}>
                              {doc.isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <button onClick={() => handleEdit(doc)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded mr-1"><Edit2 size={14} /></button>
                          <button onClick={() => handleDelete(doc)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-100">
              {paginatedDoctors.map(doc => {
                const photoUrl = getPhotoUrl(doc.photo);
                return (
                  <div key={doc.id} className={`p-4 ${!doc.isActive ? "bg-gray-50/60 opacity-70" : ""}`}>
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-full overflow-hidden bg-[#1a3a6b]/10 flex items-center justify-center flex-shrink-0 border border-gray-100 ${photoUrl ? "cursor-pointer" : ""}`}
                        onClick={() => photoUrl && setLightboxImg({ url: photoUrl, name: doc.name })}
                      >
                        {photoUrl ? (
                          <img src={photoUrl} alt={doc.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[#1a3a6b] font-bold text-sm">{doc.name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-800 truncate">{doc.name}</div>
                        <div className="text-xs text-gray-500">{doc.qualification} • {doc.department?.name || "-"}</div>
                        <div className="text-xs text-[#1a3a6b] font-medium mt-0.5">{formatTime(doc.opdStartTime)} - {formatTime(doc.opdEndTime)}</div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="text-sm font-bold text-green-700">₹{doc.consultationFee}</div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleEdit(doc)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={14} /></button>
                          <button onClick={() => handleDelete(doc)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <button
                        onClick={() => handleToggleStatus(doc)}
                        className={`relative inline-flex items-center w-10 h-5 rounded-full transition-colors duration-300 ${doc.isActive ? "bg-green-500" : "bg-gray-300"}`}
                      >
                        <span className={`inline-block w-3.5 h-3.5 bg-white rounded-full shadow-md transform transition-transform duration-300 ${doc.isActive ? "translate-x-5" : "translate-x-0.5"}`} />
                      </button>
                      <span className={`text-[11px] font-bold uppercase tracking-wide ${doc.isActive ? "text-green-600" : "text-gray-400"}`}>
                        {doc.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                );
              })}
              {paginatedDoctors.length === 0 && (
                <div className="text-center py-12 text-gray-400">No doctors found</div>
              )}
            </div>

            {/* Pagination */}
            {doctors.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-3 border-t border-gray-100 bg-gray-50">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>Rows:</span>
                  <select value={rowsPerPage} onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="border border-gray-300 rounded px-2 py-1 outline-none">
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
                <span className="text-xs text-gray-500">Page {currentPage} of {totalPages} ({doctors.length} total)</span>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} className="p-1.5 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-200"><ChevronLeft size={16} /></button>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="p-1.5 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-200"><ChevronRight size={16} /></button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
