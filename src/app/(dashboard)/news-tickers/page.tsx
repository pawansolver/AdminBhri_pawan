"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, ChevronLeft, ChevronRight, CheckCircle, XCircle } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api";

interface NewsTicker {
  id: number;
  textEnglish: string;
  textHindi: string;
  link: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export default function NewsTickersPage() {
  const [tickers, setTickers] = useState<NewsTicker[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const [textEnglish, setTextEnglish] = useState("");
  const [textHindi, setTextHindi] = useState("");
  const [link, setLink] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const token = () => localStorage.getItem("admin_token") || "";

  const fetchTickers = () => {
    setLoading(true);
    fetch(`${API_BASE}/news-tickers`, {
      headers: { Authorization: `Bearer ${token()}` }
    })
      .then(r => r.json())
      .then(d => { if (d.success) setTickers(d.data); })
      .catch(err => console.error("API error:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTickers(); }, []);

  const resetForm = () => {
    setTextEnglish(""); setTextHindi(""); setLink(""); setSortOrder(0); setIsActive(true);
  };

  const handleSave = async () => {
    const url = editId ? `${API_BASE}/news-tickers/${editId}` : `${API_BASE}/news-tickers`;
    const method = editId ? "PUT" : "POST";

    const payload = {
      textEnglish,
      textHindi,
      link,
      sortOrder,
      isActive
    };

    const res = await fetch(url, {
      method,
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${token()}` 
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      setShowForm(false); setEditId(null); fetchTickers(); resetForm();
    } else {
      alert(data.message || "Failed to save");
    }
  };

  const handleEdit = (item: NewsTicker) => {
    setEditId(item.id);
    setTextEnglish(item.textEnglish); 
    setTextHindi(item.textHindi || ""); 
    setLink(item.link || "");
    setSortOrder(item.sortOrder); 
    setIsActive(item.isActive);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this news ticker?")) return;
    await fetch(`${API_BASE}/news-tickers/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token()}` } });
    fetchTickers();
  };

  const handleToggle = async (id: number) => {
    await fetch(`${API_BASE}/news-tickers/${id}/toggle-status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
    });
    fetchTickers();
  };

  const totalPages = Math.ceil(tickers.length / rowsPerPage) || 1;
  const paginated = tickers.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-800 !text-gray-800">News Tickers</h1>
        <button onClick={() => { setShowForm(true); setEditId(null); resetForm(); }} className="flex items-center gap-2 px-4 py-2 bg-[#1a3a6b] text-white text-sm font-semibold rounded-lg hover:bg-[#0f2557] w-fit">
          <Plus size={16} /> Add Ticker
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4 !text-gray-800 border-b pb-2">{editId ? "Edit News Ticker" : "Add News Ticker"}</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-full">
                <label className="text-xs font-bold text-gray-600 uppercase">Text (English) *</label>
                <input value={textEnglish} onChange={e => setTextEnglish(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" placeholder="e.g. New MRI Machine Installed" />
              </div>
              <div className="col-span-full">
                <label className="text-xs font-bold text-gray-600 uppercase">Text (Hindi)</label>
                <input value={textHindi} onChange={e => setTextHindi(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" placeholder="e.g. नई एमआरआई मशीन स्थापित" />
              </div>
              <div className="col-span-full">
                <label className="text-xs font-bold text-gray-600 uppercase">Link URL (Optional)</label>
                <input value={link} onChange={e => setLink(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" placeholder="https://..." />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase">Sort Order</label>
                <input type="number" value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
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
              <div key={item.id} className={`bg-white rounded-xl border p-4 shadow-sm flex flex-col transition ${!item.isActive ? 'opacity-70 grayscale-[50%]' : 'border-gray-200'}`}>
                <div className="flex justify-between items-start mb-2">
                  <p className="text-xs text-gray-500 font-semibold">Order: {item.sortOrder}</p>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => handleEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={14} /></button>
                    <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-800 mb-1">{item.textEnglish}</p>
                  {item.textHindi && <p className="text-sm text-gray-600">{item.textHindi}</p>}
                  {item.link && <a href={item.link} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline mt-2 inline-block">View Link</a>}
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t">
                  <button onClick={() => handleToggle(item.id)}
                    className={`flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded transition ${item.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                    {item.isActive ? <CheckCircle size={12} /> : <XCircle size={12} />}
                    {item.isActive ? 'Active' : 'Hidden'}
                  </button>
                </div>
              </div>
            ))}
            {tickers.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-xl border border-dashed">No news tickers found. Click &quot;Add Ticker&quot; to create one.</div>
            )}
          </div>

          {tickers.length > rowsPerPage && (
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
