"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, RefreshCw, Trash2, Eye, X, Mail, Phone, MessageSquare, CheckCircle, AlertCircle, ChevronUp, ChevronDown } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api";

interface Contact {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: "new" | "read" | "resolved";
  createdAt: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  read: "bg-yellow-100 text-yellow-700",
  resolved: "bg-green-100 text-green-700",
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function ContactPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 20, totalPages: 1 });

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: "asc" | "desc" } | null>(null);

  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const token = () => localStorage.getItem("admin_token") || "";

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchContacts = useCallback((page = 1) => {
    setLoading(true);
    let url = `${API_BASE}/contacts?page=${page}&limit=${rowsPerPage}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (filterStatus) url += `&status=${filterStatus}`;

    fetch(url, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setContacts(d.data);
          setPagination(d.pagination);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, filterStatus, rowsPerPage]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const updateStatus = async (id: number, status: string) => {
    const res = await fetch(`${API_BASE}/contacts/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (data.success) {
      showToast("Status updated");
      fetchContacts(pagination.page);
      if (selectedContact?.id === id) {
        setSelectedContact(prev => prev ? { ...prev, status: status as Contact["status"] } : null);
      }
    } else {
      showToast("Failed to update status", "error");
    }
  };

  const deleteContact = async (id: number) => {
    if (!confirm("This contact message ko delete karna chahte hain?")) return;
    setDeletingId(id);
    const res = await fetch(`${API_BASE}/contacts/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token()}` },
    });
    const data = await res.json();
    if (data.success) {
      showToast("Contact deleted");
      if (selectedContact?.id === id) setSelectedContact(null);
      fetchContacts(pagination.page);
    } else {
      showToast("Failed to delete", "error");
    }
    setDeletingId(null);
  };

  // When opening a "new" contact — mark it as "read"
  const openContact = (contact: Contact) => {
    setSelectedContact(contact);
    if (contact.status === "new") {
      updateStatus(contact.id, "read");
    }
  };

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortedContacts = [...contacts].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    
    let aValue: any = a[key as keyof Contact];
    let bValue: any = b[key as keyof Contact];

    if (aValue < bValue) return direction === "asc" ? -1 : 1;
    if (aValue > bValue) return direction === "asc" ? 1 : -1;
    return 0;
  });

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[9999] flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold ${
          toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
        }`}>
          {toast.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 !text-gray-800">Contact Messages</h1>
          <p className="text-sm text-gray-500 mt-0.5">Website se aaye hue contact form submissions</p>
        </div>
        <button onClick={() => fetchContacts(pagination.page)} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 w-fit">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, phone, message..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1a3a6b] outline-none"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1a3a6b] outline-none"
        >
          <option value="">All Status</option>
          <option value="new">New</option>
          <option value="read">Read</option>
          <option value="resolved">Resolved</option>
        </select>
        <div className="text-xs text-gray-500 font-medium">
          Total: <span className="font-bold text-gray-700">{pagination.total}</span>
        </div>
      </div>

      {/* Table + Detail Panel */}
      <div className={`flex flex-col lg:flex-row gap-4 ${selectedContact ? "items-start" : ""}`}>

        {/* Table */}
        <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex-1 min-w-0`}>
          {loading ? (
            <div className="text-center py-16 text-gray-400">
              <RefreshCw size={24} className="mx-auto mb-2 animate-spin" />
              Loading...
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium text-gray-500">Koi contact message nahi mila</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 cursor-pointer hover:bg-gray-200 select-none" onClick={() => handleSort("id")}>
                        <div className="flex items-center gap-1"># {sortConfig?.key === "id" && (sortConfig.direction === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 cursor-pointer hover:bg-gray-200 select-none" onClick={() => handleSort("name")}>
                        <div className="flex items-center gap-1">Name {sortConfig?.key === "name" && (sortConfig.direction === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 cursor-pointer hover:bg-gray-200 select-none" onClick={() => handleSort("email")}>
                        <div className="flex items-center gap-1">Email / Phone {sortConfig?.key === "email" && (sortConfig.direction === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Message</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-600 cursor-pointer hover:bg-gray-200 select-none" onClick={() => handleSort("status")}>
                        <div className="flex items-center justify-center gap-1">Status {sortConfig?.key === "status" && (sortConfig.direction === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
                      </th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-600 cursor-pointer hover:bg-gray-200 select-none" onClick={() => handleSort("createdAt")}>
                        <div className="flex items-center justify-center gap-1">Date {sortConfig?.key === "createdAt" && (sortConfig.direction === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
                      </th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedContacts.map(c => (
                      <tr
                        key={c.id}
                        className={`border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors ${selectedContact?.id === c.id ? "bg-blue-50/50" : ""} ${c.status === "new" ? "font-semibold" : ""}`}
                        onClick={() => openContact(c)}
                      >
                        <td className="px-4 py-3 text-gray-400 text-xs">{c.id}</td>
                        <td className="px-4 py-3">
                          <div className={`text-gray-800 flex items-center gap-1.5 ${c.status === "new" ? "font-bold" : "font-medium"}`}>
                            {c.status === "new" && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />}
                            {c.name}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-gray-600 text-xs">{c.email}</div>
                          {c.phone && <div className="text-gray-400 text-xs mt-0.5">{c.phone}</div>}
                        </td>
                        <td className="px-4 py-3 max-w-[200px]">
                          <p className="text-gray-600 text-xs truncate">{c.message}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${statusColors[c.status]}`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-gray-500 whitespace-nowrap">{formatDate(c.createdAt)}</td>
                        <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => openContact(c)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="View">
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => deleteContact(c.id)}
                              disabled={deletingId === c.id}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded disabled:opacity-50"
                              title="Delete"
                            >
                              {deletingId === c.id ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {(pagination.totalPages > 1 || contacts.length > 0) && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-3 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>Rows:</span>
                    <select 
                      value={rowsPerPage} 
                      onChange={(e) => setRowsPerPage(Number(e.target.value))}
                      className="border border-gray-300 rounded px-2 py-1 outline-none"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                  <span className="text-xs text-gray-500">
                    Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => fetchContacts(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                      className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                    >
                      ← Prev
                    </button>
                    <button
                      onClick={() => fetchContacts(pagination.page + 1)}
                      disabled={pagination.page >= pagination.totalPages}
                      className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Detail Panel */}
        {selectedContact && (
          <div className="w-full lg:w-[340px] flex-shrink-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden self-start lg:sticky lg:top-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-gray-800 text-sm">Message Detail</h3>
              <button onClick={() => setSelectedContact(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded">
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Name */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Name</p>
                <p className="text-gray-800 font-semibold">{selectedContact.name}</p>
              </div>

              {/* Email */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Email</p>
                <a href={`mailto:${selectedContact.email}`} className="text-blue-600 text-sm flex items-center gap-1.5 hover:underline">
                  <Mail size={12} /> {selectedContact.email}
                </a>
              </div>

              {/* Phone */}
              {selectedContact.phone && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Phone</p>
                  <a href={`tel:${selectedContact.phone}`} className="text-gray-700 text-sm flex items-center gap-1.5 hover:underline">
                    <Phone size={12} /> {selectedContact.phone}
                  </a>
                </div>
              )}

              {/* Message */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Message</p>
                <p className="text-gray-700 text-sm leading-relaxed bg-gray-50 rounded-lg p-3 border border-gray-100">
                  {selectedContact.message}
                </p>
              </div>

              {/* Date */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Received</p>
                <p className="text-gray-600 text-sm">{formatDate(selectedContact.createdAt)}</p>
              </div>

              {/* Status Update */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Update Status</p>
                <div className="flex gap-2 flex-wrap">
                  {(["new", "read", "resolved"] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => updateStatus(selectedContact.id, s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        selectedContact.status === s
                          ? statusColors[s] + " border-current"
                          : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Delete */}
              <button
                onClick={() => deleteContact(selectedContact.id)}
                disabled={deletingId === selectedContact.id}
                className="w-full py-2.5 bg-red-50 text-red-600 border border-red-200 font-bold rounded-lg text-sm hover:bg-red-100 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Trash2 size={14} /> Delete Message
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
