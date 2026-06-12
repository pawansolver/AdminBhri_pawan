"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, ChevronLeft, ChevronRight, CheckCircle, XCircle, Tag, FileText, ImageIcon } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api";
const ASSET_BASE = process.env.NEXT_PUBLIC_ASSET_BASE || "http://localhost:5000";

interface Notice {
  id: number;
  title: string;
  publishDate: string;
  expiryDate: string | null;
  thumbnail: string | null;
  pdfAttachment: string | null;
  isNewTag: boolean;
  isActive: boolean;
  content: string;
}

export default function NoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  
  // Form State
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [publishDate, setPublishDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [isNewTag, setIsNewTag] = useState(true);
  const [isActive, setIsActive] = useState(true);
  
  // File State
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(6);

  const token = () => localStorage.getItem("admin_token") || "";

  const fetchNotices = () => {
    setLoading(true);
    fetch(`${API_BASE}/notices`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setNotices(d.data);
      })
      .catch(err => console.error("API error:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchNotices(); }, []);

  const resetForm = () => {
    setTitle("");
    setContent("");
    setPublishDate("");
    setExpiryDate("");
    setIsNewTag(true);
    setIsActive(true);
    setThumbnailFile(null);
    setPdfFile(null);
  };

  const handleSave = async () => {
    const url = editId ? `${API_BASE}/notices/${editId}` : `${API_BASE}/notices`;
    const method = editId ? "PUT" : "POST";
    
    // Use FormData for file uploads
    const formData = new FormData();
    formData.append("title", title);
    formData.append("content", content);
    formData.append("publishDate", publishDate);
    if (expiryDate) formData.append("expiryDate", expiryDate);
    formData.append("isNewTag", isNewTag.toString());
    formData.append("isActive", isActive.toString());
    
    if (thumbnailFile) formData.append("thumbnail", thumbnailFile);
    if (pdfFile) formData.append("pdfAttachment", pdfFile);

    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token()}` }, // Do NOT set Content-Type, browser sets it for FormData
      body: formData
    });
    const data = await res.json();
    if (data.success) {
      setShowForm(false);
      setEditId(null);
      fetchNotices();
      resetForm();
    }
  };

  const handleEdit = (notice: Notice) => {
    setEditId(notice.id);
    setTitle(notice.title);
    setContent(notice.content || "");
    setPublishDate(notice.publishDate || "");
    setExpiryDate(notice.expiryDate || "");
    setIsNewTag(notice.isNewTag);
    setIsActive(notice.isActive);
    setThumbnailFile(null); // Keep null to not overwrite unless user selects new
    setPdfFile(null);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this notice completely?")) return;
    await fetch(`${API_BASE}/notices/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token()}` } });
    fetchNotices();
  };

  const handleToggle = async (id: number, field: 'isActive' | 'isNewTag') => {
    await fetch(`${API_BASE}/notices/${id}/toggle`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ field })
    });
    fetchNotices();
  };

  const totalPages = Math.ceil(notices.length / rowsPerPage) || 1;
  const paginatedNotices = notices.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-800 !text-gray-800">Notices & Updates</h1>
        <button onClick={() => { setShowForm(true); setEditId(null); resetForm(); }} className="flex items-center gap-2 px-4 py-2 bg-[#1a3a6b] text-white text-sm font-semibold rounded-lg hover:bg-[#0f2557] w-fit">
          <Plus size={16} /> Add Notice
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4 !text-gray-800 border-b pb-2">{editId ? "Edit Notice" : "Add Notice"}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-full">
                <label className="text-xs font-bold text-gray-600 uppercase">Title *</label>
                <input value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" placeholder="Enter notice title" />
              </div>
              
              <div className="col-span-full">
                <label className="text-xs font-bold text-gray-600 uppercase">Description *</label>
                <textarea rows={3} value={content} onChange={e => setContent(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" placeholder="Detailed description..."></textarea>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 uppercase">Publish Date *</label>
                <input type="date" value={publishDate} onChange={e => setPublishDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 uppercase">Expiry Date (Optional)</label>
                <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 uppercase">Thumbnail Image</label>
                <input type="file" accept="image/*" onChange={e => setThumbnailFile(e.target.files?.[0] || null)} className="w-full px-3 py-2 border rounded-lg text-sm mt-1 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                {editId && !thumbnailFile && <p className="text-[10px] text-gray-400 mt-1">Leave empty to keep existing thumbnail.</p>}
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 uppercase">PDF Attachment (Optional)</label>
                <input type="file" accept="application/pdf" onChange={e => setPdfFile(e.target.files?.[0] || null)} className="w-full px-3 py-2 border rounded-lg text-sm mt-1 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100" />
                {editId && !pdfFile && <p className="text-[10px] text-gray-400 mt-1">Leave empty to keep existing PDF.</p>}
              </div>

              <div className="col-span-full flex gap-6 mt-2 bg-gray-50 p-3 rounded-lg border">
                <label className="flex items-center gap-2 text-sm cursor-pointer font-medium">
                  <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-4 h-4 rounded text-blue-600" />
                  Active (Visible on Website)
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer font-medium">
                  <input type="checkbox" checked={isNewTag} onChange={e => setIsNewTag(e.target.checked)} className="w-4 h-4 rounded text-red-600" />
                  Show "New" Tag
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={handleSave} className="flex-1 py-2.5 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition">Save Notice</button>
              <button onClick={() => { setShowForm(false); setEditId(null); resetForm(); }} className="flex-1 py-2.5 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {loading ? <div className="text-center py-12 text-gray-400">Loading...</div> : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-4 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm font-semibold text-gray-600">Items per page:</span>
              <select 
                value={rowsPerPage} 
                onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="border border-gray-300 rounded px-2 py-1 text-sm outline-none"
              >
                <option value={6}>6</option>
                <option value={12}>12</option>
                <option value={24}>24</option>
                <option value={48}>48</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedNotices.map(notice => (
              <div key={notice.id} className={`bg-white rounded-xl border p-0 shadow-sm flex flex-col overflow-hidden hover:shadow-md transition ${!notice.isActive ? 'opacity-70 grayscale-[50%]' : 'border-gray-200'}`}>
                {/* Image Header */}
                <div className="h-32 bg-gray-100 relative border-b">
                  {notice.thumbnail ? (
                    <img src={`${ASSET_BASE}${notice.thumbnail}`} alt={notice.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <ImageIcon size={32} />
                    </div>
                  )}
                  {notice.isNewTag && (
                    <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">NEW</span>
                  )}
                  {notice.pdfAttachment && (
                    <a href={`${ASSET_BASE}${notice.pdfAttachment}`} target="_blank" className="absolute bottom-2 right-2 bg-white/90 backdrop-blur text-red-600 p-1.5 rounded shadow-sm hover:bg-white" title="View PDF">
                      <FileText size={16} />
                    </a>
                  )}
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-xs text-gray-500 font-semibold">{notice.publishDate}</p>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => handleEdit(notice)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Edit"><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(notice.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Delete"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-800 text-sm leading-snug line-clamp-2">{notice.title}</h3>
                  <p className="text-xs text-gray-500 mt-2 line-clamp-2 flex-1">{notice.content}</p>
                </div>

                {/* Footer Toggles */}
                <div className="flex items-center justify-between p-3 bg-gray-50 border-t">
                  <button 
                    onClick={() => handleToggle(notice.id, 'isActive')}
                    className={`flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded transition ${notice.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                  >
                    {notice.isActive ? <CheckCircle size={12} /> : <XCircle size={12} />}
                    {notice.isActive ? 'Active' : 'Hidden'}
                  </button>

                  <button 
                    onClick={() => handleToggle(notice.id, 'isNewTag')}
                    className={`flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded transition ${notice.isNewTag ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}
                  >
                    <Tag size={12} />
                    {notice.isNewTag ? 'Badge: ON' : 'Badge: OFF'}
                  </button>
                </div>
              </div>
            ))}
            {notices.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-xl border border-dashed">
                No notices found. Click "Add Notice" to create one.
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {notices.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm">
              <span className="text-xs text-gray-500">
                Page {currentPage} of {totalPages} ({notices.length} total)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="p-1.5 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="p-1.5 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
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
