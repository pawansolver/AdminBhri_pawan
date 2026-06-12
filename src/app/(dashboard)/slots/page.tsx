"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Zap, Plus, Trash2, X, Clock, CheckCircle, AlertCircle, Copy, Search, ChevronDown } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api";

interface Doctor { id: number; name: string; consultationFee?: number; department?: { name: string }; opdStartTime?: string; opdEndTime?: string; slotDuration?: number }
interface Slot { id: number; startTime: string; endTime: string; isBooked: boolean; isBlocked: boolean }

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${(h % 12 || 12).toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function addMinutes(time: string, mins: number) {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export default function SlotsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<number>(0);
  const [docSearch, setDocSearch] = useState("");
  const [docDropdownOpen, setDocDropdownOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [days, setDays] = useState(7);

  // Custom slot add state
  const [customTime, setCustomTime] = useState("09:00");
  const [customDuration, setCustomDuration] = useState(15);
  const [adding, setAdding] = useState(false);

  // Bulk add state
  const [bulkTimes, setBulkTimes] = useState("");
  const [bulkAdding, setBulkAdding] = useState(false);
  const [showBulk, setShowBulk] = useState(false);

  // Feedback
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [clearingAll, setClearingAll] = useState(false);

  const token = () => localStorage.getItem("admin_token") || "";

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetch(`${API_BASE}/departments`)
      .then(r => r.json())
      .then(d => { if (d.success) setDoctors(d.data); })
      .catch(err => console.error("API error:", err));
  }, []);

  const fetchSlots = useCallback(() => {
    if (!selectedDoctor || !selectedDate) return;
    setLoading(true);
    fetch(`${API_BASE}/slots/admin/all?departmentId=${selectedDoctor}&date=${selectedDate}`, {
      headers: { Authorization: `Bearer ${token()}` },
    })
      .then(r => r.json())
      .then(d => { if (d.success) setSlots(d.data); else setSlots([]); })
      .catch(err => console.error("API error:", err))
      .finally(() => setLoading(false));
  }, [selectedDoctor, selectedDate]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (selectedDoctor && selectedDate) fetchSlots();
  }, [selectedDoctor, selectedDate, fetchSlots]);

  // Auto-fill customTime from doctor's OPD start time
  useEffect(() => {
    const doc = doctors.find(d => d.id === selectedDoctor);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (doc?.opdStartTime) setCustomTime(doc.opdStartTime);
    if (doc?.slotDuration) setCustomDuration(doc.slotDuration);
  }, [selectedDoctor, doctors]);

  const generateSlots = async () => {
    showToast("Department slots ke liye Custom/Bulk Add use karein. Doctor auto-generate flow future ke liye disabled hai.", "error");
    setGenerating(false);
  };

  const addCustomSlot = async () => {
    if (!selectedDoctor || !customTime) return;
    setAdding(true);
    const endTime = addMinutes(customTime, customDuration);
    try {
      const res = await fetch(`${API_BASE}/slots`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ departmentId: selectedDoctor, date: selectedDate, startTime: customTime, endTime }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Slot ${formatTime(customTime)} added!`);
        setCustomTime(endTime);
        fetchSlots();
      } else showToast(data.message || "Failed to add slot", "error");
    } catch { showToast("Server error", "error"); }
    setAdding(false);
  };

  const addBulkSlots = async () => {
    if (!selectedDoctor || !bulkTimes.trim()) return;
    const times = bulkTimes.split(",").map(t => t.trim()).filter(t => /^\d{2}:\d{2}$/.test(t));
    if (times.length === 0) { showToast("Sahi format daalo: 09:00, 10:00, 11:30", "error"); return; }
    setBulkAdding(true);
    let added = 0, failed = 0;
    for (const t of times) {
      const endTime = addMinutes(t, customDuration);
      try {
        const res = await fetch(`${API_BASE}/slots`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
          body: JSON.stringify({ departmentId: selectedDoctor, date: selectedDate, startTime: t, endTime }),
        });
        const data = await res.json();
        if (data.success) added++; else failed++;
      } catch { failed++; }
    }
    showToast(`${added} slots added${failed > 0 ? `, ${failed} already exist` : ""}`, added > 0 ? "success" : "error");
    setBulkTimes("");
    setShowBulk(false);
    fetchSlots();
    setBulkAdding(false);
  };

  const deleteSlot = async (id: number) => {
    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE}/slots/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (data.success) { showToast("Slot deleted"); fetchSlots(); }
      else showToast(data.message || "Cannot delete", "error");
    } catch { showToast("Server error", "error"); }
    setDeletingId(null);
  };

  const blockSlot = async (id: number) => {
    await fetch(`${API_BASE}/slots/${id}/block`, { method: "PATCH", headers: { Authorization: `Bearer ${token()}` } });
    fetchSlots();
  };

  const unblockSlot = async (id: number) => {
    await fetch(`${API_BASE}/slots/${id}/unblock`, { method: "PATCH", headers: { Authorization: `Bearer ${token()}` } });
    fetchSlots();
  };

  const clearAllSlots = async () => {
    if (!confirm(`${selectedDate} ke saare unbooked slots delete kar dein?`)) return;
    setClearingAll(true);
    try {
      const res = await fetch(`${API_BASE}/slots/delete-by-date`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ departmentId: selectedDoctor, date: selectedDate }),
      });
      const data = await res.json();
      if (data.success) { showToast(data.message); fetchSlots(); }
      else showToast(data.message || "Failed to clear", "error");
    } catch { showToast("Server error", "error"); }
    setClearingAll(false);
  };

  const selectedDoc = doctors.find(d => d.id === selectedDoctor);
  const available = slots.filter(s => !s.isBooked && !s.isBlocked).length;
  const booked = slots.filter(s => s.isBooked).length;
  const blocked = slots.filter(s => s.isBlocked).length;

  const filteredDoctors = doctors.filter(d => d.name.toLowerCase().includes(docSearch.toLowerCase()));

  const presets = [
    { label: "Morning", times: "09:00, 09:30, 10:00, 10:30, 11:00, 11:30, 12:00, 12:30, 13:00, 13:30" },
    { label: "Evening", times: "16:00, 16:30, 17:00, 17:30, 18:00, 18:30" },
    { label: "Full Day", times: "09:00, 09:30, 10:00, 10:30, 11:00, 11:30, 12:00, 12:30, 16:00, 16:30, 17:00, 17:30" },
  ];

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[9999] flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold transition-all ${
          toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
        }`}>
          {toast.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 !text-gray-800">Slot Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Department ke liye custom time slots set karein</p>
        </div>
        {selectedDoctor && selectedDate && (
          <button onClick={fetchSlots} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 w-fit">
            <RefreshCw size={14} /> Refresh
          </button>
        )}
      </div>

      {/* Step 1: Select Department + Date */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Step 1 — Department & Date Select Karein</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Department</label>
            <div className="relative">
              <div 
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm flex items-center justify-between cursor-pointer bg-white focus-within:ring-2 focus-within:ring-[#1a3a6b]"
                onClick={() => setDocDropdownOpen(!docDropdownOpen)}
              >
                <span className={selectedDoctor ? "text-gray-900 truncate" : "text-gray-500"}>
                  {selectedDoctor ? (
                    (() => {
                      const d = doctors.find(doc => doc.id === selectedDoctor);
                      return d ? `${d.name}` : "";
                    })()
                  ) : "-- Department chunein --"}
                </span>
                <ChevronDown size={16} className={`text-gray-400 transition-transform ${docDropdownOpen ? "rotate-180" : ""}`} />
              </div>
              
              {docDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setDocDropdownOpen(false)} />
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                    <div className="p-2 border-b border-gray-100 flex items-center gap-2 bg-gray-50">
                      <Search size={14} className="text-gray-400 ml-1" />
                      <input 
                        type="text" 
                        placeholder="Search department..." 
                        className="w-full text-sm outline-none bg-transparent"
                        value={docSearch}
                        onChange={e => setDocSearch(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      <div 
                        className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer text-gray-500"
                        onClick={() => { setSelectedDoctor(0); setDocDropdownOpen(false); setDocSearch(""); }}
                      >
                        -- Department chunein --
                      </div>
                      {filteredDoctors.map(d => (
                        <div 
                          key={d.id} 
                          className={`px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer flex items-center justify-between ${selectedDoctor === d.id ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700"}`}
                          onClick={() => { setSelectedDoctor(d.id); setDocDropdownOpen(false); setDocSearch(""); }}
                        >
                          <span>{d.name}</span>
                          <span className="text-[10px] bg-green-50 px-1.5 py-0.5 rounded text-green-700">₹{Number(d.consultationFee || 0)}</span>
                        </div>
                      ))}
                      {filteredDoctors.length === 0 && (
                        <div className="px-3 py-4 text-sm text-center text-gray-400">Koi department nahi mila</div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Date</label>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1a3a6b] outline-none" />
          </div>
        </div>

        {selectedDoc && (
          <div className="mt-3 flex flex-wrap gap-3">
            <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1 rounded-full font-medium">
              Consultation Fee: ₹{Number(selectedDoc.consultationFee || 0)}
            </span>
          </div>
        )}
      </div>

      {selectedDoctor > 0 && (
        <>
          {/* Step 2: Add Custom Slots */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Step 2 — Custom Slots Add Karein (Apni Marzi Ka Time)</p>
            </div>
            <div className="p-5 space-y-5">

              {/* Single Slot Add */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  Ek-ek Slot Add Karein
                </p>
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">Start Time</label>
                    <input type="time" value={customTime} onChange={e => setCustomTime(e.target.value)}
                      className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none w-[140px]" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">Duration (min)</label>
                    <input type="number" value={customDuration} onChange={e => setCustomDuration(Number(e.target.value))}
                      min={5} max={120} step={5}
                      className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none w-[100px]" />
                  </div>
                  {customTime && (
                    <div className="text-xs text-gray-500 pb-2.5">
                      → End: <span className="font-bold text-gray-700">{formatTime(addMinutes(customTime, customDuration))}</span>
                    </div>
                  )}
                  <button onClick={addCustomSlot} disabled={adding || !customTime}
                    className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 disabled:opacity-50 transition">
                    <Plus size={16} /> {adding ? "Adding..." : "Add Slot"}
                  </button>
                </div>
              </div>

              <div className="border-t border-dashed border-gray-200" />

              {/* Bulk Add */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <span className="w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                    Ek Saath Multiple Slots Add Karein
                  </p>
                  <button onClick={() => setShowBulk(!showBulk)} className="text-xs text-blue-600 hover:underline">
                    {showBulk ? "Chhupao" : "Expand Karein"}
                  </button>
                </div>

                {/* Preset Buttons */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {presets.map(p => (
                    <button key={p.label} onClick={() => { setBulkTimes(p.times); setShowBulk(true); }}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-full hover:bg-blue-100 transition">
                      <Copy size={10} /> {p.label} Preset
                    </button>
                  ))}
                </div>

                {showBulk && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-gray-500 block mb-1">
                        Times (comma-separated, 24hr format): <span className="text-gray-400">e.g. 09:00, 10:30, 14:00</span>
                      </label>
                      <textarea value={bulkTimes} onChange={e => setBulkTimes(e.target.value)}
                        rows={2} placeholder="09:00, 09:30, 10:00, 10:30, 11:00, 11:30, 12:00"
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none font-mono" />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">
                        Each slot will be <span className="font-bold text-gray-700">{customDuration} min</span> long
                      </span>
                      <button onClick={addBulkSlots} disabled={bulkAdding || !bulkTimes.trim()}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
                        <Zap size={14} /> {bulkAdding ? "Adding..." : `Add All Slots`}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-dashed border-gray-200" />

              {/* Future doctor-based auto generate flow is disabled for the current department-level booking flow. */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  Auto Generate (Future Doctor Flow)
                </p>
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">Kitne dino ke liye</label>
                    <input type="number" value={days} onChange={e => setDays(Number(e.target.value))} min={1} max={30}
                      className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none w-[100px]" />
                  </div>
                  <button onClick={generateSlots} disabled={generating}
                    className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white text-sm font-bold rounded-lg hover:bg-orange-600 disabled:opacity-50 transition">
                    <Zap size={16} /> {generating ? "Generating..." : "Currently Disabled"}
                  </button>
                  <p className="text-xs text-gray-400 pb-2.5">
                    Abhi department booking active hai. Custom/Bulk slots use karein; doctor flow future ke liye preserved hai.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: View Current Slots */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Current Slots — {selectedDate}</p>
                {slots.length > 0 && (
                  <div className="flex gap-4 mt-1.5">
                    <span className="text-xs text-green-600 font-semibold">✓ {available} Available</span>
                    <span className="text-xs text-red-500 font-semibold">⊗ {booked} Booked</span>
                    <span className="text-xs text-gray-400 font-semibold">⊘ {blocked} Blocked</span>
                  </div>
                )}
              </div>
              {slots.length > 0 && (
                <button onClick={clearAllSlots} disabled={clearingAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 transition">
                  <Trash2 size={12} /> {clearingAll ? "Clearing..." : "Clear All"}
                </button>
              )}
            </div>

            <div className="p-5">
              {loading ? (
                <div className="text-center py-10 text-gray-400">
                  <RefreshCw size={24} className="mx-auto mb-2 animate-spin" />
                  Loading slots...
                </div>
              ) : slots.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Clock size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium text-gray-500">Is date ke liye koi slot nahi hai</p>
                  <p className="text-sm mt-1">Upar se custom slot add karein ya auto-generate karein</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                  {slots.map(slot => (
                    <div key={slot.id}
                      className={`relative group rounded-xl border-2 text-center py-3 px-2 transition-all ${
                        slot.isBooked
                          ? "bg-red-50 border-red-200 text-red-700"
                          : slot.isBlocked
                          ? "bg-gray-100 border-gray-300 text-gray-400"
                          : "bg-green-50 border-green-300 text-green-800 hover:shadow-md"
                      }`}
                    >
                      <div className="text-[13px] font-bold leading-tight">{formatTime(slot.startTime)}</div>
                      <div className="text-[9px] mt-1 font-medium uppercase tracking-wide">
                        {slot.isBooked ? "Booked" : slot.isBlocked ? "Blocked" : "Open"}
                      </div>

                      {!slot.isBooked && (
                        <div className="absolute inset-0 bg-white/90 rounded-xl opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-1">
                          {slot.isBlocked ? (
                            <button onClick={() => unblockSlot(slot.id)}
                              className="text-[9px] px-2 py-1 bg-green-500 text-white rounded font-bold hover:bg-green-600">
                              Unblock
                            </button>
                          ) : (
                            <button onClick={() => blockSlot(slot.id)}
                              className="text-[9px] px-2 py-1 bg-yellow-500 text-white rounded font-bold hover:bg-yellow-600">
                              Block
                            </button>
                          )}
                          <button
                            onClick={() => deleteSlot(slot.id)}
                            disabled={deletingId === slot.id}
                            className="text-[9px] px-2 py-1 bg-red-500 text-white rounded font-bold hover:bg-red-600 disabled:opacity-50"
                          >
                            {deletingId === slot.id ? "..." : <X size={10} />}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {slots.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-3 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <div className="w-3 h-3 rounded bg-green-200 border border-green-300" /> Available
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <div className="w-3 h-3 rounded bg-red-200 border border-red-300" /> Booked
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <div className="w-3 h-3 rounded bg-gray-200 border border-gray-300" /> Blocked
                  </div>
                  <div className="ml-auto text-xs text-gray-400 italic">Slot pe hover karein — Block / Delete options dikhenge</div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {!selectedDoctor && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200 text-gray-400">
          <Clock size={48} className="mx-auto mb-3 opacity-20" />
          <p className="font-medium text-gray-500">Department select karein slots dekhne ke liye</p>
        </div>
      )}
    </div>
  );
}
