"use client";

import { useState, useEffect, useRef } from "react";
import {
  Plus, Edit2, Trash2, ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  Search, Camera, X, Upload, GraduationCap, Tag, Star, Eye, EyeOff,
  Users, CheckCircle, AlertCircle
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api";
const ASSET_BASE = process.env.NEXT_PUBLIC_ASSET_BASE || "http://localhost:5000";

// ─── Types ──────────────────────────────────────────────────────────────────
interface Faculty {
  id: number;
  name: string;
  nameHindi?: string | null;
  designation: string;
  department: string;
  credentials: string;
  specialty: string;
  experience: string;
  tags: string[];
  photo?: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// NOTE: DEPT_OPTIONS removed — fetched live from /api/departments

const ROLE_OPTIONS = [
  "Professor & HOD",
  "Associate Professor",
  "Assistant Professor",
  "Professor",
  "Dean & Professor",
  "Medical Superintendent & Professor",
  "Senior Resident",
  "Junior Resident",
  "Tutor",
  "Demonstrator",
];

// ─── Searchable Dropdown Component ──────────────────────────────────────────
const SearchableDropdown = ({ value, onChange, options, placeholder, disabled = false }: {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder: string;
  disabled?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => opt.toLowerCase().includes(search.toLowerCase()));

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div 
        className={`flex items-center w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1 bg-white focus-within:ring-2 focus-within:ring-[#1a3a6b]/30 focus-within:border-[#1a3a6b] transition-all ${disabled ? 'opacity-60 cursor-not-allowed bg-gray-50' : ''}`}
      >
        <input 
          type="text"
          value={isOpen ? search : value}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!isOpen) setIsOpen(true);
            onChange(e.target.value); // Allow arbitrary typing if they want
          }}
          onFocus={() => {
            if (!disabled) {
              setIsOpen(true);
              setSearch("");
            }
          }}
          placeholder={value || placeholder}
          disabled={disabled}
          className="flex-1 outline-none w-full bg-transparent text-sm text-gray-800 placeholder-gray-400"
        />
        <ChevronDown 
          size={16} 
          className={`text-gray-500 cursor-pointer ml-2 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          onClick={() => {
            if (!disabled) {
              if (!isOpen) setSearch("");
              setIsOpen(!isOpen);
            }
          }} 
        />
      </div>
      
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-56 overflow-y-auto">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => (
              <div 
                key={opt} 
                className={`px-3 py-2.5 text-sm cursor-pointer hover:bg-[#1a3a6b]/5 transition-colors ${value === opt ? "bg-[#1a3a6b]/10 font-medium text-[#1a3a6b]" : "text-gray-700"}`}
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                  setSearch("");
                }}
              >
                {opt}
              </div>
            ))
          ) : (
            <div className="px-3 py-3 text-sm text-gray-500 italic text-center">No matches found</div>
          )}
        </div>
      )}
    </div>
  );
};

const DEFAULT_FORM = {
  name: "",
  nameHindi: "",
  designation: "",
  department: "",
  credentials: "",
  specialty: "",
  experience: "",
  tags: "",
  displayOrder: "999",
};

// ─── Toast notification ───────────────────────────────────────────────────────
function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-semibold max-w-sm animate-fade-in
      ${type === "success" ? "bg-green-600" : "bg-red-500"}`}>
      {type === "success" ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X size={14} /></button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function FacultyPage() {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  // Departments from API
  const [deptList, setDeptList] = useState<string[]>([]);
  const [deptLoading, setDeptLoading] = useState(true);

  // Photo
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lightbox
  const [lightboxImg, setLightboxImg] = useState<{ url: string; name: string } | null>(null);

  // Table controls
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [deptFilter, setDeptFilter] = useState("all");

  // Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const showToast = (message: string, type: "success" | "error") => setToast({ message, type });

  const token = () => localStorage.getItem("admin_token") || "";

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchFaculty = () => {
    setLoading(true);
    fetch(`${API_BASE}/faculty/admin/all?limit=0`, {
      headers: { Authorization: `Bearer ${token()}` },
    })
      .then((r) => r.json())
      .then((d) => { if (d.success) setFaculty(d.data); })
      .catch((err) => console.error("Faculty API error:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchFaculty(); }, []);

  // ── Fetch Departments from API ───────────────────────────────────────────
  useEffect(() => {
    setDeptLoading(true);
    fetch(`${API_BASE}/departments`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.data)) {
          // Extract department names, filter active only
          const names = d.data
            .filter((dep: { isActive?: boolean }) => dep.isActive !== false)
            .map((dep: { name: string }) => dep.name)
            .sort();
          setDeptList(names);
        }
      })
      .catch(() => console.error("Departments API error"))
      .finally(() => setDeptLoading(false));
  }, []);

  // ── Image helpers ────────────────────────────────────────────────────────
  const handleImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) { showToast("Please select an image file.", "error"); return; }
    if (file.size > 5 * 1024 * 1024) { showToast("Image must be under 5 MB.", "error"); return; }
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
  const removePhoto = () => {
    setPhotoFile(null); setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  const getImageUrl = (img: string | null | undefined) =>
    img ? (img.startsWith("http") ? img : `${ASSET_BASE}${img}`) : null;

  // ── Save (Create / Update) ───────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name.trim()) { showToast("Name is required.", "error"); return; }
    if (!form.designation.trim()) { showToast("Designation is required.", "error"); return; }
    if (!form.department.trim()) { showToast("Department is required.", "error"); return; }
    if (!form.experience.trim()) { showToast("Experience is required.", "error"); return; }

    setSaving(true);
    const url = editId ? `${API_BASE}/faculty/${editId}` : `${API_BASE}/faculty`;
    const method = editId ? "PUT" : "POST";

    const fd = new FormData();
    fd.append("name", form.name.trim());
    fd.append("nameHindi", form.nameHindi?.trim() || "");
    fd.append("designation", form.designation.trim());
    fd.append("department", form.department.trim());
    fd.append("credentials", form.credentials ? form.credentials.trim() : "");
    fd.append("specialty", form.specialty ? form.specialty.trim() : "");
    fd.append("experience", form.experience.trim());
    fd.append("displayOrder", form.displayOrder || "999");

    // Tags: convert comma-separated string to JSON array
    const tagsArr = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
    fd.append("tags", JSON.stringify(tagsArr));

    if (photoFile) fd.append("photo", photoFile);

    try {
      const res = await fetch(url, { method, headers: { Authorization: `Bearer ${token()}` }, body: fd });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || "Saved successfully!", "success");
        handleCloseForm();
        fetchFaculty();
      } else {
        showToast(data.message || "Failed to save.", "error");
      }
    } catch {
      showToast("Network error — could not connect to server.", "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Edit ─────────────────────────────────────────────────────────────────
  const handleEdit = (f: Faculty) => {
    setEditId(f.id);
    setForm({
      name: f.name,
      nameHindi: f.nameHindi || "",
      designation: f.designation,
      department: f.department,
      credentials: f.credentials || "",
      specialty: f.specialty || "",
      experience: f.experience,
      tags: Array.isArray(f.tags) ? f.tags.join(", ") : "",
      displayOrder: String(f.displayOrder ?? 999),
    });
    const imgUrl = getImageUrl(f.photo);
    setPhotoPreview(imgUrl);
    setPhotoFile(null);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false); setEditId(null);
    setForm(DEFAULT_FORM); removePhoto();
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (f: Faculty) => {
    const input = prompt(`⚠️ Type DELETE to permanently remove "${f.name}":`);
    if (input !== "DELETE") { if (input !== null) showToast("Cancelled — type DELETE to confirm.", "error"); return; }
    try {
      const res = await fetch(`${API_BASE}/faculty/${f.id}/permanent`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (data.success) { showToast("Faculty member permanently deleted.", "success"); fetchFaculty(); }
      else showToast(data.message || "Failed to delete.", "error");
    } catch { showToast("Network error — could not delete.", "error"); }
  };

  // ── Soft Delete / Toggle ─────────────────────────────────────────────────
  const handleToggleStatus = async (f: Faculty) => {
    setFaculty((prev) => prev.map((m) => m.id === f.id ? { ...m, isActive: !m.isActive } : m));
    try {
      const res = await fetch(`${API_BASE}/faculty/${f.id}/toggle-status`, {
        method: "PATCH", headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (!data.success) {
        setFaculty((prev) => prev.map((m) => m.id === f.id ? { ...m, isActive: f.isActive } : m));
        showToast(data.message || "Failed to update status.", "error");
      } else {
        showToast(`${f.name} ${!f.isActive ? "activated" : "deactivated"}.`, "success");
      }
    } catch {
      setFaculty((prev) => prev.map((m) => m.id === f.id ? { ...m, isActive: f.isActive } : m));
      showToast("Network error.", "error");
    }
  };

  // ── Sorting & Filtering ───────────────────────────────────────────────────
  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig?.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  };

  const uniqueDepts = ["all", ...Array.from(new Set(faculty.map((f) => f.department))).sort()];

  const filtered = faculty.filter((f) => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q ||
      f.name.toLowerCase().includes(q) ||
      f.department.toLowerCase().includes(q) ||
      f.designation.toLowerCase().includes(q) ||
      f.credentials.toLowerCase().includes(q) ||
      f.specialty.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || (statusFilter === "active" ? f.isActive : !f.isActive);
    const matchDept = deptFilter === "all" || f.department === deptFilter;
    return matchSearch && matchStatus && matchDept;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (!sortConfig) return 0;
    const av = a[sortConfig.key as keyof Faculty] as string;
    const bv = b[sortConfig.key as keyof Faculty] as string;
    if (av < bv) return sortConfig.direction === "asc" ? -1 : 1;
    if (av > bv) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sorted.length / rowsPerPage) || 1;
  const paginated = sorted.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const SortIcon = ({ col }: { col: string }) =>
    sortConfig?.key === col
      ? sortConfig.direction === "asc" ? <ChevronUp size={13} /> : <ChevronDown size={13} />
      : null;

  return (
    <div>
      {/* ── Toast ── */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Faculty Directory</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage academic faculty shown on the website</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setForm(DEFAULT_FORM); removePhoto(); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#1a3a6b] text-white text-sm font-semibold rounded-lg hover:bg-[#0f2557] w-fit shadow-sm"
        >
          <Plus size={16} /> Add Faculty
        </button>
      </div>

      {/* ── Lightbox ── */}
      {lightboxImg && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setLightboxImg(null)}>
          <div className="relative max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setLightboxImg(null)} className="absolute -top-10 right-0 text-white/80 hover:text-white flex items-center gap-1.5 text-sm font-medium">
              <X size={18} /> Close
            </button>
            <div className="rounded-2xl overflow-hidden shadow-2xl border-4 border-white/20">
              <img src={lightboxImg.url} alt={lightboxImg.name} className="w-full max-h-[70vh] object-contain bg-gray-900" />
            </div>
            <p className="text-center text-white/90 text-sm font-semibold mt-3">{lightboxImg.name}</p>
          </div>
        </div>
      )}

      {/* ── Add / Edit Form Modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[95vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold text-gray-800">{editId ? "Edit Faculty Member" : "Add New Faculty Member"}</h3>
                <p className="text-xs text-gray-400 mt-0.5">All fields marked * are required</p>
              </div>
              <button onClick={handleCloseForm} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><X size={18} /></button>
            </div>

            {/* ── Photo Upload ── */}
            <div className="mb-5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block">Passport Photo</label>
              <div className="flex items-center gap-4">
                {/* Preview */}
                <div className="relative flex-shrink-0">
                  <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 overflow-hidden bg-gray-50 flex items-center justify-center">
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
                    <button onClick={removePhoto} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow">
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
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageFile(f); }} />
              </div>
            </div>

            {/* ── Form Fields ── */}
            <div className="grid grid-cols-2 gap-3">

              {/* Name */}
              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-600">Full Name *</label>
                <input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Dr. S. P. Prasad"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1 focus:ring-2 focus:ring-[#1a3a6b]/30 focus:border-[#1a3a6b] outline-none" />
              </div>

              {/* Name Hindi */}
              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-600">Name in Hindi (optional)</label>
                <input value={form.nameHindi ?? ""} onChange={(e) => setForm({ ...form, nameHindi: e.target.value })}
                  placeholder="e.g. डॉ. एस. पी. प्रसाद"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1 focus:ring-2 focus:ring-[#1a3a6b]/30 focus:border-[#1a3a6b] outline-none" />
              </div>

              {/* Designation */}
              <div>
                <label className="text-xs font-semibold text-gray-600">Role / Designation *</label>
                <SearchableDropdown
                  value={form.designation}
                  onChange={(val) => setForm({ ...form, designation: val })}
                  options={ROLE_OPTIONS}
                  placeholder="Type to search or select..."
                />
              </div>

              {/* Department */}
              <div>
                <label className="text-xs font-semibold text-gray-600">Department *</label>
                <SearchableDropdown
                  value={form.department}
                  onChange={(val) => setForm({ ...form, department: val })}
                  options={deptList}
                  placeholder={deptLoading ? "Loading..." : "Type to search or select..."}
                  disabled={deptLoading}
                />
                {deptList.length === 0 && !deptLoading && (
                  <p className="text-[10px] text-amber-600 mt-1">⚠ No departments found — please add departments first.</p>
                )}
              </div>

              {/* Credentials */}
              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-600">Credentials / Qualifications</label>
                <input value={form.credentials ?? ""} onChange={(e) => setForm({ ...form, credentials: e.target.value })}
                  placeholder="e.g. MD, Ph.D. (Medical Biochemistry)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1 focus:ring-2 focus:ring-[#1a3a6b]/30 focus:border-[#1a3a6b] outline-none" />
              </div>

              {/* Specialty */}
              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-600">Specialty / Expertise</label>
                <textarea value={form.specialty ?? ""} onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                  rows={2} placeholder="e.g. Molecular Diagnostics & Metabolic Pathways"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1 focus:ring-2 focus:ring-[#1a3a6b]/30 focus:border-[#1a3a6b] outline-none resize-none" />
              </div>

              {/* Experience */}
              <div>
                <label className="text-xs font-semibold text-gray-600">Experience *</label>
                <input value={form.experience ?? ""} onChange={(e) => setForm({ ...form, experience: e.target.value })}
                  placeholder="e.g. 20+ Years Experience"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1 focus:ring-2 focus:ring-[#1a3a6b]/30 focus:border-[#1a3a6b] outline-none" />
              </div>

              {/* Display Order */}
              <div>
                <label className="text-xs font-semibold text-gray-600">Display Order</label>
                <input type="number" value={form.displayOrder ?? ""} onChange={(e) => setForm({ ...form, displayOrder: e.target.value })}
                  placeholder="e.g. 1 (lower = first)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1 focus:ring-2 focus:ring-[#1a3a6b]/30 focus:border-[#1a3a6b] outline-none" />
              </div>

              {/* Tags */}
              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-600">Tags (comma separated)</label>
                <input value={form.tags ?? ""} onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  placeholder="e.g. HOD, Biochemist, Researcher"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1 focus:ring-2 focus:ring-[#1a3a6b]/30 focus:border-[#1a3a6b] outline-none" />
                <p className="text-[10px] text-gray-400 mt-0.5">Separate multiple tags with a comma</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-60 transition-colors">
                {saving ? "Saving..." : editId ? "Update Faculty" : "Add Faculty"}
              </button>
              <button onClick={handleCloseForm}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Table ── */}
      {loading ? (
        <div className="text-center py-12 text-gray-400 flex flex-col items-center gap-3">
          <GraduationCap size={36} className="opacity-30 animate-pulse" />
          <span>Loading faculty...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search by name, dept, designation, specialty..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1a3a6b] outline-none" />
            </div>
            {/* Dept filter */}
            <select value={deptFilter} onChange={(e) => { setDeptFilter(e.target.value); setCurrentPage(1); }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none bg-white focus:ring-2 focus:ring-[#1a3a6b] max-w-[200px]">
              {uniqueDepts.map((d) => <option key={d} value={d}>{d === "all" ? "All Departments" : d}</option>)}
            </select>
            {/* Status filter */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {(["all", "active", "inactive"] as const).map((f) => (
                <button key={f} onClick={() => { setStatusFilter(f); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-all duration-150
                    ${statusFilter === f
                      ? f === "active" ? "bg-green-500 text-white shadow-sm"
                        : f === "inactive" ? "bg-red-400 text-white shadow-sm"
                        : "bg-white text-gray-700 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"}`}>
                  {f === "all" ? `All (${faculty.length})` : f === "active" ? `Active (${faculty.filter((x) => x.isActive).length})` : `Hidden (${faculty.filter((x) => !x.isActive).length})`}
                </button>
              ))}
            </div>
          </div>

          {/* Table Card */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            {/* Desktop */}
            <div className="hidden md:block overflow-auto max-h-[calc(100vh-17rem)]">
              <table className="w-full text-sm relative">
                <thead className="bg-gray-50 border-b sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 w-14">Photo</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 select-none" onClick={() => handleSort("name")}>
                      <div className="flex items-center gap-1">Name <SortIcon col="name" /></div>
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 select-none" onClick={() => handleSort("dept")}>
                      <div className="flex items-center gap-1">Department <SortIcon col="dept" /></div>
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 select-none" onClick={() => handleSort("designation")}>
                      <div className="flex items-center gap-1">Designation <SortIcon col="designation" /></div>
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Credentials</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-600">Tags</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-600">Status</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((f) => {
                    const imgUrl = getImageUrl(f.photo);
                    const isHOD = f.designation.toLowerCase().includes("hod");
                    return (
                      <tr key={f.id} className={`border-b border-gray-50 transition-colors ${f.isActive ? "hover:bg-gray-50" : "bg-gray-50/60 opacity-70 hover:opacity-100"}`}>
                        {/* Photo */}
                        <td className="px-4 py-2.5">
                          <div
                            className={`w-11 h-11 rounded-xl overflow-hidden bg-[#1a3a6b]/10 flex items-center justify-center flex-shrink-0 border border-gray-100 transition-all
                              ${imgUrl ? "cursor-pointer hover:ring-2 hover:ring-[#1a3a6b] hover:ring-offset-1 hover:scale-110" : ""}`}
                            onClick={() => imgUrl && setLightboxImg({ url: imgUrl, name: f.name })}
                          >
                            {imgUrl ? (
                              <img src={imgUrl} alt={f.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[#1a3a6b] font-bold text-sm">{f.name.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                        </td>
                        {/* Name */}
                        <td className="px-4 py-2.5">
                          <div className="font-semibold text-gray-800">{f.name}</div>
                          {f.nameHindi && <div className="text-xs text-gray-400">{f.nameHindi}</div>}
                          <div className="text-[10px] text-gray-400">{f.experience}</div>
                        </td>
                        {/* Dept */}
                        <td className="px-4 py-2.5 text-gray-600 text-xs max-w-[160px]">
                          <span className="truncate block" title={f.department}>{f.department}</span>
                        </td>
                        {/* Designation */}
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold
                            ${isHOD ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-600"}`}>
                            {isHOD && <Star size={9} className="fill-emerald-500 text-emerald-500" />}
                            {f.designation}
                          </span>
                        </td>
                        {/* Credentials */}
                        <td className="px-4 py-2.5 text-gray-500 text-xs max-w-[140px]">
                          <span className="truncate block" title={f.credentials}>{f.credentials}</span>
                        </td>
                        {/* Tags */}
                        <td className="px-4 py-2.5">
                          <div className="flex flex-wrap gap-1 justify-center">
                            {(Array.isArray(f.tags) ? f.tags : []).slice(0, 2).map((tag, i) => (
                              <span key={i} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[9px] font-semibold border border-blue-100">{tag}</span>
                            ))}
                            {Array.isArray(f.tags) && f.tags.length > 2 && (
                              <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[9px]">+{f.tags.length - 2}</span>
                            )}
                          </div>
                        </td>
                        {/* Toggle */}
                        <td className="px-4 py-2.5 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <button
                              onClick={() => handleToggleStatus(f)}
                              title={f.isActive ? "Click to hide from website" : "Click to show on website"}
                              className={`relative inline-flex items-center w-11 h-6 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-1
                                ${f.isActive ? "bg-green-500 focus:ring-green-400" : "bg-gray-300 focus:ring-gray-400"}`}
                            >
                              <span className={`inline-block w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${f.isActive ? "translate-x-6" : "translate-x-1"}`} />
                            </button>
                            <span className={`text-[9px] font-bold uppercase tracking-wide flex items-center gap-0.5 ${f.isActive ? "text-green-600" : "text-gray-400"}`}>
                              {f.isActive ? <><Eye size={9} /> Shown</> : <><EyeOff size={9} /> Hidden</>}
                            </span>
                          </div>
                        </td>
                        {/* Actions */}
                        <td className="px-4 py-2.5 text-center">
                          <button onClick={() => handleEdit(f)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded mr-1" title="Edit"><Edit2 size={14} /></button>
                          <button onClick={() => handleDelete(f)} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Delete permanently"><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    );
                  })}
                  {paginated.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-gray-400">
                        <Users size={36} className="mx-auto mb-2 opacity-30" />
                        No faculty members found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {paginated.map((f) => {
                const imgUrl = getImageUrl(f.photo);
                return (
                  <div key={f.id} className={`p-4 ${!f.isActive ? "bg-gray-50/60 opacity-70" : ""}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl overflow-hidden bg-[#1a3a6b]/10 flex items-center justify-center flex-shrink-0 border border-gray-100 ${imgUrl ? "cursor-pointer" : ""}`}
                        onClick={() => imgUrl && setLightboxImg({ url: imgUrl, name: f.name })}>
                        {imgUrl ? <img src={imgUrl} alt={f.name} className="w-full h-full object-cover" /> : <span className="text-[#1a3a6b] font-bold">{f.name.charAt(0).toUpperCase()}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-800 truncate">{f.name}</div>
                        <div className="text-xs text-gray-500">{f.designation}</div>
                        <div className="text-xs text-gray-400 truncate">{f.department}</div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleEdit(f)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={14} /></button>
                        <button onClick={() => handleDelete(f)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-gray-500">{f.experience} • {f.credentials}</span>
                      <button onClick={() => handleToggleStatus(f)}
                        className={`relative inline-flex items-center w-10 h-5 rounded-full transition-colors ${f.isActive ? "bg-green-500" : "bg-gray-300"}`}>
                        <span className={`inline-block w-3.5 h-3.5 bg-white rounded-full shadow-md transform transition-transform ${f.isActive ? "translate-x-5" : "translate-x-0.5"}`} />
                      </button>
                    </div>
                  </div>
                );
              })}
              {paginated.length === 0 && <div className="text-center py-10 text-gray-400">No faculty found</div>}
            </div>

            {/* Pagination */}
            {faculty.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-3 border-t border-gray-100 bg-gray-50">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>Rows:</span>
                  <select value={rowsPerPage} onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                    className="border border-gray-300 rounded px-2 py-1 outline-none text-sm">
                    {[5, 10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <span className="text-xs text-gray-500">Page {currentPage} of {totalPages} ({sorted.length} filtered / {faculty.length} total)</span>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1}
                    className="p-1.5 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-200"><ChevronLeft size={16} /></button>
                  <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}
                    className="p-1.5 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-200"><ChevronRight size={16} /></button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
