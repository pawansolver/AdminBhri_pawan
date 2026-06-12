"use client";

import { useEffect, useState } from "react";
import { Save, RefreshCw } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api";

type OPDTiming = {
  morningStart: string;
  morningEnd: string;
  eveningStart: string;
  eveningEnd: string;
};

const DEFAULT_TIMING: OPDTiming = {
  morningStart: "09:00",
  morningEnd: "14:00",
  eveningStart: "16:00",
  eveningEnd: "19:00",
};

export default function OPDTimingPage() {
  const [form, setForm] = useState<OPDTiming>(DEFAULT_TIMING);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const token = () => localStorage.getItem("admin_token") || "";

  const loadTiming = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`${API_BASE}/settings/opd-timing`);
      const data = await res.json();
      if (data.success && data.data) {
        setForm({
          morningStart: data.data.morningStart || DEFAULT_TIMING.morningStart,
          morningEnd: data.data.morningEnd || DEFAULT_TIMING.morningEnd,
          eveningStart: data.data.eveningStart || DEFAULT_TIMING.eveningStart,
          eveningEnd: data.data.eveningEnd || DEFAULT_TIMING.eveningEnd,
        });
      }
    } catch (err) {
      console.error("API error:", err);
      setMessage("Failed to load timing. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTiming();
  }, []);

  const saveTiming = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`${API_BASE}/settings/opd-timing`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setMessage("OPD timing updated successfully.");
      } else {
        setMessage(data.message || "Failed to update timing.");
      }
    } catch {
      setMessage("Server not reachable.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 !text-gray-800">OPD Timing Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Website par dikhne wala Morning/Evening timing yahin se control hoga.
          </p>
        </div>
        <button
          onClick={loadTiming}
          className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 w-fit"
          title="Refresh"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-2xl shadow-sm">
        {loading ? (
          <div className="py-10 text-center text-gray-400">Loading timings...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Morning Start</label>
                <input
                  type="time"
                  value={form.morningStart}
                  onChange={(e) => setForm({ ...form, morningStart: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Morning End</label>
                <input
                  type="time"
                  value={form.morningEnd}
                  onChange={(e) => setForm({ ...form, morningEnd: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Evening Start</label>
                <input
                  type="time"
                  value={form.eveningStart}
                  onChange={(e) => setForm({ ...form, eveningStart: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Evening End</label>
                <input
                  type="time"
                  value={form.eveningEnd}
                  onChange={(e) => setForm({ ...form, eveningEnd: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <button
              onClick={saveTiming}
              disabled={saving}
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-[#1a3a6b] text-white font-semibold rounded-lg hover:bg-[#0f2557] disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? "Saving..." : "Save Timing"}
            </button>

            {message && (
              <p className="mt-4 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                {message}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
