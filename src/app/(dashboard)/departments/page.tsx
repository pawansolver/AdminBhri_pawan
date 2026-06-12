"use client";

import { useState, useEffect } from "react";
import {
  Plus, Edit2, Trash2, ChevronLeft, ChevronRight, GripVertical, Loader2,
} from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api";

interface Dept {
  id: number;
  name: string;
  nameHi: string;
  icon: string;
  consultationFee: number;
  isActive: boolean;
  sortOrder: number;
}

// ─── Sortable Department Card ─────────────────────────────────────────────────
function SortableCard({
  dept,
  onEdit,
  onDelete,
}: {
  dept: Dept;
  onEdit: (d: Dept) => void;
  onDelete: (id: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: dept.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group bg-white rounded-xl border p-5 transition-all duration-200 select-none
        ${isDragging
          ? "border-blue-300 shadow-xl opacity-30 scale-[1.02] z-50"
          : "border-gray-200 shadow-sm hover:shadow-md hover:border-blue-100"
        }`}
    >
      {/* Drag handle — always visible, more prominent on hover */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-3 left-3 p-1.5 rounded-md cursor-grab active:cursor-grabbing
          text-gray-300 hover:text-blue-500 hover:bg-blue-50
          transition-all duration-150"
        title="Drag to reorder"
      >
        <GripVertical size={15} />
      </div>

      {/* Top row: icon + actions */}
      <div className="flex items-center justify-between mb-2 pl-5">
        <span className="text-2xl">{dept.icon}</span>
        <div className="flex gap-1">
          <button
            onClick={() => onEdit(dept)}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={() => onDelete(dept.id)}
            className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <h3 className="font-bold text-gray-800 pl-5">{dept.name}</h3>
      <p className="text-xs text-gray-400 mt-0.5 pl-5">{dept.nameHi}</p>

      <div className="flex items-center justify-between mt-3 pl-5">
        <p className="text-xs text-gray-400">Order: {dept.sortOrder}</p>
        <span className="text-xs font-bold text-green-700 bg-green-50 border border-green-100 px-2 py-1 rounded-full">
          ₹{Number(dept.consultationFee || 0)}
        </span>
      </div>
    </div>
  );
}

// ─── Drag Overlay (ghost card while dragging) ─────────────────────────────────
function DragGhostCard({ dept }: { dept: Dept }) {
  return (
    <div
      className="bg-white rounded-xl border-2 border-blue-400 shadow-2xl p-5
        rotate-1 scale-[1.04] opacity-95 cursor-grabbing pointer-events-none"
    >
      <div className="flex items-center justify-between mb-2 pl-5">
        <span className="text-2xl">{dept.icon}</span>
        <div className="flex gap-1">
          <div className="p-1.5 text-blue-200 rounded-md"><Edit2 size={14} /></div>
          <div className="p-1.5 text-red-200 rounded-md"><Trash2 size={14} /></div>
        </div>
      </div>
      <h3 className="font-bold text-gray-800 pl-5">{dept.name}</h3>
      <p className="text-xs text-gray-400 mt-0.5 pl-5">{dept.nameHi}</p>
      <div className="flex items-center justify-between mt-3 pl-5">
        <p className="text-xs text-gray-400">Order: {dept.sortOrder}</p>
        <span className="text-xs font-bold text-green-700 bg-green-50 border border-green-100 px-2 py-1 rounded-full">
          ₹{Number(dept.consultationFee || 0)}
        </span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "", nameHi: "", icon: "", consultationFee: 0, sortOrder: 0,
  });

  const [activeDept, setActiveDept] = useState<Dept | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(6);

  const token = () => localStorage.getItem("admin_token") || "";

  // Always sorted by sortOrder asc — drag order drives everything
  const sortedDepts = [...departments].sort((a, b) => a.sortOrder - b.sortOrder);
  const totalPages = Math.ceil(sortedDepts.length / rowsPerPage) || 1;
  const pageStart = (currentPage - 1) * rowsPerPage;
  const paginatedDepts = sortedDepts.slice(pageStart, pageStart + rowsPerPage);

  // DnD sensors: mouse/touch (8px threshold), keyboard
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const fetchDepartments = () => {
    setLoading(true);
    setCurrentPage(1);
    fetch(`${API_BASE}/departments`)
      .then(r => r.json())
      .then(d => { if (d.success) setDepartments(d.data); })
      .catch(err => console.error("API error:", err))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchDepartments(); }, []);

  // ── Drag events ──────────────────────────────────────────────────────────────
  const handleDragStart = (event: DragStartEvent) => {
    const id = Number(event.active.id);
    setActiveDept(departments.find(d => d.id === id) ?? null);
    setSaveError(false);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDept(null);
    if (!over || active.id === over.id) return;

    // Snapshot of current full sorted order
    const snapshot = [...departments].sort((a, b) => a.sortOrder - b.sortOrder);
    const oldIdx = snapshot.findIndex(d => d.id === active.id);
    const newIdx = snapshot.findIndex(d => d.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;

    // Reorder and reassign sortOrder 1…N
    const reordered = arrayMove(snapshot, oldIdx, newIdx);
    const updated = reordered.map((d, i) => ({ ...d, sortOrder: i + 1 }));

    // Optimistic UI update
    setDepartments(updated);

    // Collect only the items whose sortOrder actually changed
    const changed = updated.filter(d => {
      const orig = snapshot.find(o => o.id === d.id);
      return orig !== undefined && orig.sortOrder !== d.sortOrder;
    });

    if (changed.length === 0) return;

    setSaving(true);
    setSaveError(false);
    try {
      await Promise.all(
        changed.map(d =>
          fetch(`${API_BASE}/departments/${d.id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token()}`,
            },
            body: JSON.stringify({ sortOrder: d.sortOrder }),
          })
        )
      );
    } catch (err) {
      console.error("Reorder save failed:", err);
      setSaveError(true);
      // Rollback to server state on error
      fetchDepartments();
    } finally {
      setSaving(false);
    }
  };

  // ── CRUD ─────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const url = editId ? `${API_BASE}/departments/${editId}` : `${API_BASE}/departments`;
    const method = editId ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.success) {
      setShowForm(false);
      setEditId(null);
      fetchDepartments();
      setForm({ name: "", nameHi: "", icon: "", consultationFee: 0, sortOrder: 0 });
    }
  };

  const handleEdit = (dept: Dept) => {
    setEditId(dept.id);
    setForm({
      name: dept.name,
      nameHi: dept.nameHi || "",
      icon: dept.icon || "",
      consultationFee: Number(dept.consultationFee || 0),
      sortOrder: dept.sortOrder,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Deactivate this department?")) return;
    await fetch(`${API_BASE}/departments/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token()}` },
    });
    fetchDepartments();
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-800 !text-gray-800">Departments</h1>
        <button
          onClick={() => { setShowForm(true); setEditId(null); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#1a3a6b] text-white text-sm font-semibold rounded-lg hover:bg-[#0f2557] transition w-fit"
        >
          <Plus size={16} /> Add Department
        </button>
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold mb-4 !text-gray-800">
              {editId ? "Edit Department" : "Add Department"}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Name (English)</label>
                <input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Name (Hindi)</label>
                <input
                  value={form.nameHi}
                  onChange={e => setForm({ ...form, nameHi: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Icon (Emoji)</label>
                <input
                  value={form.icon}
                  onChange={e => setForm({ ...form, icon: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
                  placeholder="🩺"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Consultation Fee (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={form.consultationFee}
                  onChange={e => setForm({ ...form, consultationFee: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
                  placeholder="400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Sort Order</label>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={handleSave}
                className="flex-1 py-2.5 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700"
              >
                Save
              </button>
              <button
                onClick={() => { setShowForm(false); setEditId(null); }}
                className="flex-1 py-2.5 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-lg">
                <GripVertical size={14} className="text-blue-500" />
                <span className="text-xs font-medium text-blue-700">
                  Drag cards to reorder
                </span>
              </div>

              {saving && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                  <Loader2 size={13} className="animate-spin" />
                  Saving order…
                </span>
              )}

              {saveError && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
                  Save failed — order restored
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm font-semibold text-gray-600">Items per page:</span>
              <select
                value={rowsPerPage}
                onChange={e => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="border border-gray-300 rounded px-2 py-1 text-sm outline-none"
              >
                <option value={6}>6</option>
                <option value={12}>12</option>
                <option value={24}>24</option>
                <option value={48}>48</option>
              </select>
            </div>
          </div>

          {/* Drag-and-drop grid */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={paginatedDepts.map(d => d.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedDepts.map(dept => (
                  <SortableCard
                    key={dept.id}
                    dept={dept}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </SortableContext>

            {/* Ghost card while dragging */}
            <DragOverlay
              dropAnimation={{
                duration: 220,
                easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
              }}
            >
              {activeDept ? <DragGhostCard dept={activeDept} /> : null}
            </DragOverlay>
          </DndContext>

          {/* Pagination */}
          {departments.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm">
              <span className="text-xs text-gray-500">
                Page {currentPage} of {totalPages} ({departments.length} total)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="p-1.5 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="p-1.5 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition"
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
