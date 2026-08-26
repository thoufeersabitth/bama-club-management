import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, CalendarCheck, CreditCard, Award,
  Building2, MessageSquare, BarChart3, Settings, Globe, LogOut,
  Shield, Menu, X, ChevronDown, Bell, UserCheck, Lock, Search, MapPin, Sparkles, Flame, FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { INITIAL_BRANCHES } from '../services/initialData';

export default function AdminLayout({ children }) {
  const { user, logout, activeBranch, setActiveBranch, hasPermission } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 1024 : false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('bama_admin_notifications');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      { id: 'notif-1', type: 'INQUIRY', title: '📥 New Web Admission Inquiry from Fathima Riya!', desc: 'Branch: Pulikkal Dojo | Program: Kids Karate | Phone: +91 95440 85442', time: '5 mins ago', read: false },
      { id: 'notif-2', type: 'INQUIRY', title: '📥 Admission Inquiry from Rahul V.K.!', desc: 'Branch: Chungam Dojo | Program: Adult Fitness & Sparring | Phone: +91 98470 12345', time: '1 hour ago', read: false }
    ];
  });

  React.useEffect(() => {
    const handleNotifUpdate = () => {
      try {
        const saved = localStorage.getItem('bama_admin_notifications');
        if (saved) setNotifications(JSON.parse(saved));
      } catch (e) {}
    };
    window.addEventListener('bama_notification_updated', handleNotifUpdate);
    return () => window.removeEventListener('bama_notification_updated', handleNotifUpdate);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { label: 'Dashboard', path: '/portal', icon: LayoutDashboard, moduleKey: 'dashboard' },
    { label: 'Student Management', path: '/portal/students', icon: Users, moduleKey: 'students' },
    { label: 'Attendance System', path: '/portal/attendance', icon: CalendarCheck, moduleKey: 'attendance' },
    { label: 'Fee Collection & Invoices', path: '/portal/fees', icon: CreditCard, moduleKey: 'fees' },
    { label: 'Belt Grading & Exams', path: '/portal/belts', icon: Award, moduleKey: 'beltGrading' },
    { label: 'Staff & Instructor Manager', path: '/portal/admins', icon: Shield, moduleKey: 'instructors', superAdminOnly: true },
    { label: 'Branch Management', path: '/portal/branches', icon: Building2, moduleKey: 'branches', superAdminOnly: true },
    { label: 'WhatsApp Reminders', path: '/portal/whatsapp', icon: MessageSquare, moduleKey: 'whatsapp' },
    { label: 'Reports & Analytics', path: '/portal/reports', icon: BarChart3, moduleKey: 'reports' },
    { label: 'Website CMS', path: '/portal/cms', icon: Globe, moduleKey: 'cms', superAdminOnly: true },
    { label: 'System Settings', path: '/portal/settings', icon: Settings, moduleKey: 'settings', superAdminOnly: true },
  ];

  const userRole = user?.role || 'SUPER_ADMIN';

  // Allowed Menu Items based on Granular Permissions & Role
  const allowedMenuItems = menuItems.filter(item => {
    if (userRole === 'SUPER_ADMIN') return true;
    if (item.superAdminOnly) return false;
    return hasPermission(item.moduleKey);
  });

  return (
    <div className="min-h-screen bg-[#F4F6FB] text-gray-800 flex font-sans selection:bg-red-600 selection:text-white overflow-x-hidden">
      {/* Mobile Backdrop Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300 cursor-pointer"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - FIXED HEIGHT NO SCROLLBAR */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200/80 shadow-2xl lg:shadow-md flex flex-col transition-all duration-300 transform ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-20'
        }`}
      >
        {/* Sidebar Header Logo */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-gray-100 flex-shrink-0 bg-white">
          <Link
            to="/portal"
            onClick={() => { if (window.innerWidth < 1024) setIsSidebarOpen(false); }}
            className="flex items-center gap-3 group"
          >
            <div className="relative flex-shrink-0">
              <img
                src="/logo bama_240616_200739.jpg.jpeg"
                alt="B.A.M.A. Official Logo"
                className="w-10 h-10 rounded-full object-cover border-2 border-red-500 shadow-md group-hover:scale-105 transition-transform duration-300 ring-2 ring-red-500/30"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full animate-ping" />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
            </div>
            {isSidebarOpen && (
              <div>
                <h1 className="font-black text-sm bg-gradient-to-r from-red-600 via-red-500 to-amber-500 bg-clip-text text-transparent tracking-wider leading-tight">
                  B.A.M.A.
                </h1>
                <p className="text-[9px] text-gray-900 font-extrabold tracking-widest uppercase">BRAVE ACADEMY OF MARTIAL ARTS</p>
              </div>
            )}
          </Link>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden text-gray-500 hover:text-gray-800 p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 py-2 px-2.5 space-y-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {allowedMenuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path + item.label}
                to={item.path}
                onClick={() => { if (window.innerWidth < 1024) setIsSidebarOpen(false); }}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 relative group ${
                  isActive
                    ? 'bg-gradient-to-r from-red-600 via-red-600 to-red-700 text-white shadow-md shadow-red-500/30 scale-[1.01]'
                    : 'text-gray-700 hover:text-red-600 hover:bg-red-50/80 hover:translate-x-1'
                }`}
              >
                {isActive && (
                  <span className="w-1.5 h-4.5 bg-amber-400 rounded-r-full absolute left-0 shadow-[0_0_8px_#F59E0B]" />
                )}
                <Icon className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-amber-300' : 'text-gray-500 group-hover:text-red-600'}`} />
                {isSidebarOpen && <span className="truncate tracking-wide">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Poster Card - BALANCED INNER PADDING & OBJECT-CONTAIN */}
        {isSidebarOpen && (
          <div className="px-3 py-2 flex-shrink-0">
            <div className="p-3 bg-white border-2 border-red-100 rounded-2xl shadow-md space-y-2 text-center group hover:border-red-300 hover:shadow-lg transition-all duration-300">
              {/* Inner Image Container with Balanced 4-Side Padding */}
              <div className="w-full bg-gradient-to-b from-gray-50 to-red-50/30 p-3 rounded-xl border border-gray-100 flex items-center justify-center">
                <img
                  src="/bama_sidebar_poster.jpg"
                  alt="Martial Arts Poster"
                  className="w-full h-32 object-contain rounded-lg group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              {/* Text Badge Section */}
              <div className="space-y-0.5 pt-1">
                <p className="text-[10px] text-red-600 font-black tracking-widest uppercase flex items-center justify-center gap-1">
                  <Flame className="w-3 h-3 text-red-600 fill-red-600 animate-pulse" /> DISCIPLINE TODAY
                </p>
                <p className="text-xs font-black text-gray-900 tracking-wider">STRENGTH FOREVER</p>
              </div>
            </div>
          </div>
        )}

        {/* Footer Logout */}
        <div className="p-2.5 border-t border-gray-100 flex-shrink-0 bg-white">
          <button
            onClick={() => { logout(); navigate('/portal/login'); }}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2 bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-600 border border-gray-200 hover:border-red-200 rounded-xl font-bold text-xs transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            {isSidebarOpen && <span>Logout Account</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Top Navbar Header */}
        <header className="h-16 bg-white border-b border-gray-200 px-3 sm:px-6 flex items-center justify-between shadow-sm sticky top-0 z-30 max-w-full gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-xl transition flex-shrink-0 cursor-pointer"
              aria-label="Toggle Sidebar Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Official Academy Logo & Brand Link */}
            <Link
              to="/portal"
              className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 group"
              title="B.A.M.A. Portal Dashboard"
            >
              <div className="relative flex-shrink-0">
                <img
                  src="/logo bama_240616_200739.jpg.jpeg"
                  alt="B.A.M.A. Official Logo"
                  className="w-8 h-8 rounded-full object-cover border-2 border-red-500 shadow-md group-hover:scale-105 transition-transform duration-300 ring-2 ring-red-500/20"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 border border-white rounded-full animate-ping" />
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 border border-white rounded-full" />
              </div>
              <div className="hidden min-[480px]:block">
                <span className="font-black text-xs bg-gradient-to-r from-red-600 via-red-500 to-amber-500 bg-clip-text text-transparent tracking-wider">
                  B.A.M.A.
                </span>
              </div>
            </Link>

            {/* Active Branch Selector Pill */}
            <div className="flex items-center gap-1 sm:gap-2 bg-gray-100 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-gray-200 text-[11px] sm:text-xs text-gray-700 font-bold shadow-inner max-w-[100px] min-[400px]:max-w-[130px] sm:max-w-[200px] md:max-w-none truncate">
              <MapPin className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
              <span className="hidden md:inline">Branch:</span>
              {userRole !== 'SUPER_ADMIN' ? (
                <span className="text-gray-900 font-black px-1 flex items-center gap-1 truncate">
                  <span className="truncate">{user?.branch || activeBranch}</span>
                  <span className="text-[10px] bg-red-100 text-red-700 font-bold px-1.5 py-0.2 rounded-md flex-shrink-0">Locked 🔒</span>
                </span>
              ) : (
                <select
                  value={activeBranch}
                  onChange={(e) => setActiveBranch(e.target.value)}
                  className="bg-transparent text-gray-900 font-black focus:outline-none cursor-pointer truncate max-w-full text-[11px] sm:text-xs"
                >
                  <option value="ALL">All Branches</option>
                  {INITIAL_BRANCHES.map(b => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Search Bar & Actions */}
          <div className="flex items-center gap-1 sm:gap-2.5 flex-shrink-0">
            <div className="relative hidden md:block w-48 lg:w-64">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-2.5" />
              <input
                type="text"
                placeholder="Search students, classes..."
                className="w-full bg-gray-100 border border-gray-200 rounded-full pl-9 pr-4 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-red-500 transition"
              />
            </div>

            {/* WhatsApp Quick Link */}
            <Link
              to="/portal/whatsapp"
              className="p-1.5 sm:p-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-full border border-green-200 transition hover:scale-110 shadow-sm"
              title="WhatsApp Center"
            >
              <MessageSquare className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            </Link>

            {/* Notification Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className="p-1.5 sm:p-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-full border border-gray-200 transition hover:scale-110 shadow-sm relative cursor-pointer"
                title="Admin Notifications & Web Inquiries"
              >
                <Bell className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Menu */}
              {showNotifDropdown && (
                <div className="absolute right-0 mt-2 w-[calc(100vw-24px)] sm:w-96 max-w-sm bg-white rounded-3xl border border-gray-200 shadow-2xl z-50 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <div className="flex items-center gap-1.5 font-black text-xs text-gray-900">
                      <Bell className="w-4 h-4 text-red-600" />
                      <span>Admin Alerts & Web Inquiries</span>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => {
                          const updated = notifications.map(n => ({ ...n, read: true }));
                          setNotifications(updated);
                          localStorage.setItem('bama_admin_notifications', JSON.stringify(updated));
                        }}
                        className="text-[10px] font-bold text-red-600 hover:underline cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-2 text-xs">
                    {notifications.length === 0 ? (
                      <p className="text-center py-4 text-gray-400 italic">No new notifications.</p>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          className={`p-3 rounded-2xl border transition-colors ${
                            n.read ? 'bg-gray-50 border-gray-100 text-gray-600' : 'bg-red-50/70 border-red-200 text-gray-900 font-medium'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <strong className="font-black text-xs text-red-700 block">{n.title}</strong>
                            <span className="text-[9px] text-gray-400 font-mono">{n.time}</span>
                          </div>
                          <p className="text-[11px] text-gray-600 mt-1 leading-snug">{n.desc}</p>
                          <div className="mt-2 flex justify-end">
                            <button
                              onClick={() => {
                                setShowNotifDropdown(false);
                                navigate('/portal/students?tab=inquiries');
                              }}
                              className="px-2.5 py-1 bg-red-600 text-white rounded-lg text-[10px] font-bold hover:bg-red-700 transition cursor-pointer"
                            >
                              View Leads List →
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="border-t border-gray-100 pt-2 text-center">
                    <button
                      onClick={() => {
                        setShowNotifDropdown(false);
                        navigate('/portal/students?tab=inquiries');
                      }}
                      className="text-xs font-black text-red-600 hover:underline flex items-center justify-center gap-1 mx-auto cursor-pointer"
                    >
                      <span>Open Full Admission Inquiries Register</span>
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Logout Button */}
            <button
              onClick={() => { logout(); navigate('/portal/login'); }}
              className="p-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-full border border-red-200 transition hover:scale-105 shadow-sm flex-shrink-0 cursor-pointer"
              title="Logout Account"
            >
              <LogOut className="w-4 h-4" />
            </button>

            {/* User Profile Avatar */}
            <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-gray-200">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-600 to-amber-600 text-white font-black text-xs flex items-center justify-center shadow-md border border-white flex-shrink-0">
                {user?.name ? user.name[0].toUpperCase() : 'A'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-black text-gray-900 leading-tight">{user?.name || 'Sensei Abdul Rahman'}</p>
                <span className="text-[9px] font-black text-red-600 uppercase tracking-wider block">
                  {userRole.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Main View Area */}
        <main className="flex-1 p-3.5 sm:p-5 lg:p-8 overflow-y-auto overflow-x-hidden max-w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
