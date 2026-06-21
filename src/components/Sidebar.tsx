"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarCheck,
  Stethoscope,
  Building2,
  Timer,
  Clock,
  MessageSquare,
  Megaphone,
  Volume2,
  CalendarDays,
  GraduationCap,
  ChevronsLeft,
  ChevronsRight,
  X,
  Activity
} from 'lucide-react';
import { useSidebar } from '@/components/SidebarContext';

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { isMobileOpen, setIsMobileOpen } = useSidebar();
  const pathname = usePathname();

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/' },
    { name: 'Appointments', icon: CalendarCheck, href: '/appointments' },
    { name: 'Doctors', icon: Stethoscope, href: '/doctors' },
    { name: 'Faculty', icon: GraduationCap, href: '/faculty' },
    { name: 'Departments', icon: Building2, href: '/departments' },
    { name: 'OPD Timing', icon: Timer, href: '/opd-timing' },
    { name: 'Slots', icon: Clock, href: '/slots' },
    { name: 'Contact', icon: MessageSquare, href: '/contact' },
    { name: 'Notices', icon: Megaphone, href: '/notices' },
    { name: 'Announcements', icon: Volume2, href: '/announcements' },
    { name: 'News Tickers', icon: Activity, href: '/news-tickers' },
    { name: 'Events', icon: CalendarDays, href: '/events' },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 md:relative md:translate-x-0 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} ${isCollapsed ? 'w-20' : 'w-64'} bg-amber-50 text-amber-950 min-h-screen flex flex-col border-r border-amber-200`}>

        {/* Collapse Toggle Button - Positioned outside, hidden on mobile */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex items-center justify-center absolute -right-3 top-8 bg-white border border-amber-200 text-amber-700 hover:text-amber-900 hover:bg-amber-100 rounded-full p-1 shadow-sm transition-colors z-20"
        >
          {isCollapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
        </button>

        {/* Header with Logo */}
        <div className={`p-4 md:p-6 flex items-center border-b border-amber-100/50 ${isCollapsed ? 'justify-center' : 'justify-between md:justify-center'}`}>
          <Link href="/">
            <Image
              src="/logo.webp"
              alt="BHRI Logo"
              width={isCollapsed ? 40 : 60}
              height={isCollapsed ? 40 : 60}
              className="transition-all duration-300"
            />
          </Link>
          <button
            className="md:hidden text-amber-700 hover:bg-amber-200 p-1.5 rounded-lg"
            onClick={() => setIsMobileOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className={`flex-1 px-3 mt-6 space-y-2 overflow-y-auto ${isCollapsed ? 'px-2' : ''}`}>
          {menuItems.map((item) => {
            // Determine if the item is active
            const isActive = pathname === item.href || (pathname === '/slots' && item.href === '/slots') || (item.name === 'Slots' && pathname !== '/' && !menuItems.some(m => m.href === pathname));

            return (
              <Link
                key={item.name}
                href={item.href}
                title={item.name}
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center gap-3 py-3 rounded-lg transition-colors ${isActive
                    ? 'bg-amber-100 text-amber-900'
                    : 'text-amber-700 hover:bg-amber-100 hover:text-amber-900'
                  } ${isCollapsed ? 'justify-center px-0' : 'px-4'}`}
              >
                <item.icon size={20} className="shrink-0" />
                {!isCollapsed && <span className={isActive ? "font-semibold whitespace-nowrap" : "font-medium whitespace-nowrap"}>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className={`p-4 text-xs text-amber-700 border-t border-amber-200/50 font-medium ${isCollapsed ? 'text-center px-1' : ''}`}>
          &copy; {!isCollapsed && ` ${new Date().getFullYear()} BHRI`}
        </div>
      </aside>
    </>
  );
}
