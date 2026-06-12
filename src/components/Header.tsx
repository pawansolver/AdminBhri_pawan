"use client";

import { useEffect, useState, useRef } from 'react';
import { Bell, ChevronRight, Home, Menu, LogOut, Check, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSidebar } from '@/components/SidebarContext';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api";

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

function timeAgo(dateStr: string) {
  const diff = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function Header() {
  const { setIsMobileOpen } = useSidebar();
  const [userName, setUserName] = useState("Admin");
  
  // Notifications state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const router = useRouter();
  const token = typeof window !== 'undefined' ? localStorage.getItem("admin_token") : "";

  // Click outside to close dropdown
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const u = localStorage.getItem("admin_user");
    if (u) {
      try {
        const parsed = JSON.parse(u);
        if (parsed?.name) setUserName(parsed.name);
      } catch {}
    }
  }, []);

  // Fetch Notifications
  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data);
        setUnreadCount(data.unreadCount);
      }
    } catch {}
  };

  // Initial fetch and polling every 15 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [token]);

  const markAsRead = async (id: number) => {
    try {
      await fetch(`${API_BASE}/notifications/${id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      });
      // Optimistic update
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const markAllAsRead = async () => {
    try {
      await fetch(`${API_BASE}/notifications/mark-all-read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      });
      // Optimistic update
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
  };

  const deleteNotification = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`${API_BASE}/notifications/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      // Optimistic update
      setNotifications(prev => prev.filter(n => n.id !== id));
      const removed = notifications.find(n => n.id === id);
      if (removed && !removed.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch {}
  };

  const deleteAllNotifications = async () => {
    if (!confirm("Are you sure you want to delete all notifications?")) return;
    try {
      await fetch(`${API_BASE}/notifications/delete-all`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications([]);
      setUnreadCount(0);
    } catch {}
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    router.replace("/login");
  };

  // Map notification type to the target page route
  const getNotificationRoute = (type: string): string => {
    const t = type?.toLowerCase() || "";
    if (t.includes("appointment")) return "/appointments";
    if (t.includes("contact"))     return "/contact";
    if (t.includes("doctor"))      return "/doctors";
    if (t.includes("slot"))        return "/slots";
    if (t.includes("department"))  return "/departments";
    return "/"; // default: dashboard
  };

  // Mark as read then navigate to relevant page
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
    setShowDropdown(false);
    router.push(getNotificationRoute(notification.type));
  };

  return (
    <header className="h-16 bg-white shadow-sm border-b border-slate-100 px-4 md:px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setIsMobileOpen(true)}
          className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
        >
          <Menu size={24} />
        </button>
        
        <nav className="hidden sm:flex items-center space-x-2 text-sm font-medium text-slate-500">
          <Link href="/" className="hover:text-amber-600 transition-colors flex items-center gap-1">
            <Home size={16} />
            <span>Home</span>
          </Link>
          <ChevronRight size={16} className="text-slate-400" />
          <span className="text-amber-600">Dashboard</span>
        </nav>
      </div>
      
      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            className="p-2 hover:bg-slate-100 rounded-full relative transition-colors"
          >
            <Bell size={20} className="text-slate-600" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {showDropdown && (
            <div className="fixed sm:absolute top-14 sm:top-auto right-4 sm:right-0 mt-2 w-[calc(100vw-2rem)] sm:w-[360px] max-w-[360px] bg-white rounded-xl shadow-2xl sm:shadow-xl border border-gray-100 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                <h3 className="font-bold text-gray-800 text-sm">Notifications</h3>
                <div className="flex items-center gap-3">
                  {unreadCount > 0 && (
                    <button onClick={markAllAsRead} className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1" title="Mark all as read">
                      <Check size={14} /> Read All
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button onClick={deleteAllNotifications} className="text-xs text-red-500 hover:text-red-600 font-semibold flex items-center gap-1" title="Delete all notifications">
                      <Trash2 size={13} /> Clear All
                    </button>
                  )}
                </div>
              </div>
              
              <div className="max-h-[360px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-400 text-sm">
                    No notifications yet
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {notifications.map(notification => (
                      <div 
                        key={notification.id} 
                        className={`px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer group flex gap-3 ${!notification.isRead ? 'bg-blue-50/30' : ''}`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-0.5">
                            <p className={`text-sm truncate pr-2 ${!notification.isRead ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                              {notification.title}
                            </p>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {!notification.isRead && <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />}
                              <button 
                                onClick={(e) => deleteNotification(notification.id, e)}
                                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity p-1 rounded-md hover:bg-red-50"
                                title="Delete notification"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                          <p className={`text-xs truncate ${!notification.isRead ? 'text-gray-600' : 'text-gray-500'}`}>
                            {notification.message}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-1 font-medium uppercase tracking-wider">
                            {timeAgo(notification.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="p-2 border-t border-gray-100 bg-gray-50/50">
                <Link href="/contact" onClick={() => setShowDropdown(false)} className="block w-full py-2 text-center text-xs font-bold text-gray-500 hover:text-gray-700">
                  View all in Contact/Appointments
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-2 p-1.5 pr-3 rounded-full border border-slate-100 bg-slate-50">
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 shadow-sm font-bold text-sm">
            {userName.charAt(0).toUpperCase()}
          </div>
          <p className="text-sm font-medium text-slate-700 hidden sm:block">{userName}</p>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          title="Logout"
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
        >
          <LogOut size={16} />
          <span className="hidden sm:block font-medium">Logout</span>
        </button>
      </div>
    </header>
  );
}
