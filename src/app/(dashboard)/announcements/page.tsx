"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, ChevronLeft, ChevronRight, CheckCircle, XCircle, FileText, ImageIcon } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api";
const ASSET_BASE = process.env.NEXT_PUBLIC_ASSET_BASE || "http://localhost:5000";

interface Announcement {
  id: number;
  title: string;
  content: string;
  thumbnail: string | null;
  pdfAttachment: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const token = () => localStorage.getItem("admin_token") || "";

  const fetchAnnouncements = () => {
    setLoading(true);
    fetch(`${API_BASE}/announcements`)
      .then(r => r.json())
      .then(d => { if (d.success) setAnnouncements(d.data); })
      .catch(err => console.error("API error:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAnnouncements(); }, []);

  const resetForm = () => {
    setTitle(""); setContent(""); setSortOrder(0); setIsActive(true);
    setThumbnailFile(null); setPdfFile(null);
  };

  const handleSave = async () => {
    const url = editId ? `${API_BASE}/announcements/${editId}` : `${API_BASE}/announcements`;
    const method = editId ? "PUT" : "POST";

    const formData = new FormData();
    formData.append("title", title);
    formData.append("content", content);
    formData.append("sortOrder", sortOrder.toString());
    formData.append("isActive", isActive.toString());
    if (thumbnailFile) formData.append("thumbnail", thumbnailFile);
    if (pdfFile) formData.append("pdfAttachment", pdfFile);

    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token()}` },
      body: formData,
    });
    const data = await res.json();
    if (data.success) {
      setShowForm(false); setEditId(null); fetchAnnouncements(); resetForm();
    } else {
      alert(data.message || "Failed to save");
    }
  };

  const handleEdit = (item: Announcement) => {
    setEditId(item.id);
    setTitle(item.title); setContent(item.content); setSortOrder(item.sortOrder); setIsActive(item.isActive);
    setThumbnailFile(null); setPdfFile(null);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this announcement?")) return;
    await fetch(`${API_BASE}/announcements/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token()}` } });
    fetchAnnouncements();
  };

  const handleToggle = async (id: number) => {
    await fetch(`${API_BASE}/announcements/${id}/toggle`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ field: "isActive" }),
    });
    fetchAnnouncements();
  };

  const totalPages = Math.ceil(announcements.length / rowsPerPage) || 1;
  const paginated = announcements.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-800 !text-gray-800">Announcements</h1>
        <button onClick={() => { setShowForm(true); setEditId(null); resetForm(); }} className="flex items-center gap-2 px-4 py-2 bg-[#1a3a6b] text-white text-sm font-semibold rounded-lg hover:bg-[#0f2557] w-fit">
          <Plus size={16} /> Add Announcement
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4 !text-gray-800 border-b pb-2">{editId ? "Edit Announcement" : "Add Announcement"}</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-full">
                <label className="text-xs font-bold text-gray-600 uppercase">Title *</label>
                <input value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" placeholder="Announcement title" />
              </div>
              <div className="col-span-full">
                <label className="text-xs font-bold text-gray-600 uppercase">Content *</label>
                <textarea rows={4} value={content} onChange={e => setContent(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" placeholder="Content..."></textarea>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase">Sort Order</label>
                <input type="number" value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase">Thumbnail Image</label>
                <input type="file" accept="image/*" onChange={e => setThumbnailFile(e.target.files?.[0] || null)} className="w-full px-3 py-2 border rounded-lg text-sm mt-1 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700" />
                {editId && !thumbnailFile && <p className="text-[10px] text-gray-400 mt-1">Leave empty to keep existing.</p>}
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase">PDF Attachment</label>
                <input type="file" accept="application/pdf" onChange={e => setPdfFile(e.target.files?.[0] || null)} className="w-full px-3 py-2 border rounded-lg text-sm mt-1 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-red-700" />
                {editId && !pdfFile && <p className="text-[10px] text-gray-400 mt-1">Leave empty to keep existing.</p>}
              </div>
              <div className="col-span-full flex gap-6 bg-gray-50 p-3 rounded-lg border">
                <label className="flex items-center gap-2 text-sm cursor-pointer font-medium">
                  <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-4 h-4 rounded text-blue-600" />
                  Active (Visible on Website)
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={handleSave} className="flex-1 py-2.5 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition">Save</button>
              <button onClick={() => { setShowForm(false); setEditId(null); resetForm(); }} className="flex-1 py-2.5 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {loading ? <div className="text-center py-12 text-gray-400">Loading...</div> : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginated.map(item => (
              <div key={item.id} className={`bg-white rounded-xl border p-0 shadow-sm flex flex-col overflow-hidden hover:shadow-md transition ${!item.isActive ? 'opacity-70 grayscale-[50%]' : 'border-gray-200'}`}>
                <div className="h-32 bg-gray-100 relative border-b">
                  {item.thumbnail ? (
                    <img src={`${ASSET_BASE}${item.thumbnail}`} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400"><ImageIcon size={32} /></div>
                  )}
                  {item.pdfAttachment && (
                    <a href={`${ASSET_BASE}${item.pdfAttachment}`} target="_blank" className="absolute bottom-2 right-2 bg-white/90 backdrop-blur text-red-600 p-1.5 rounded shadow-sm hover:bg-white" title="View PDF">
                      <FileText size={16} />
                    </a>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-xs text-gray-500 font-semibold">Order: {item.sortOrder}</p>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => handleEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-800 text-sm leading-snug line-clamp-2">{item.title}</h3>
                  <p className="text-xs text-gray-500 mt-2 line-clamp-2 flex-1">{item.content}</p>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 border-t">
                  <button onClick={() => handleToggle(item.id)}
                    className={`flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded transition ${item.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                    {item.isActive ? <CheckCircle size={12} /> : <XCircle size={12} />}
                    {item.isActive ? 'Active' : 'Hidden'}
                  </button>
                </div>
              </div>
            ))}
            {announcements.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-xl border border-dashed">No announcements. Click &quot;Add Announcement&quot; to create one.</div>
            )}
          </div>

          {announcements.length > rowsPerPage && (
            <div className="flex items-center justify-between px-4 py-3 bg-white border rounded-xl shadow-sm">
              <span className="text-xs text-gray-500">Page {currentPage} of {totalPages}</span>
              <div className="flex gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} className="p-1.5 border rounded-lg disabled:opacity-40"><ChevronLeft size={16} /></button>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="p-1.5 border rounded-lg disabled:opacity-40"><ChevronRight size={16} /></button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
