"use no memo";

import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  Wallet,
  Activity,
  Plane,
  Building2,
  Truck,
  Box,
  FileText,
  Banknote,
  CalendarClock,
  ClipboardList,
  BookOpen,
  Store,
  Wrench,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  ChevronRight,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useStaff } from '../hooks/useResource';
import { useAuth } from '../context/AuthContext';

const navGroups = [
  {
    id: 'main',
    header: 'Main',
    items: [
      { label: 'Dashboard',     path: '/dashboard',          icon: LayoutDashboard },
      { label: 'Staff Members', path: '/staff',              icon: Users },
    ],
  },
  {
    id: 'daily',
    header: 'Daily Entry',
    items: [
      { label: 'Attendance',    path: '/attendance',         icon: CalendarCheck },
      { label: 'Leave Requests',path: '/leave',              icon: CalendarClock },
      { label: 'Salary Payment',path: '/salary',             icon: Banknote },
      { label: 'Expenses',      path: '/expenses',           icon: Wallet },
      { label: 'Performance',   path: '/performance',        icon: Activity },
      { label: 'Travel History',path: '/travel',             icon: Plane },
      { label: 'Remarks',       path: '/remarks',            icon: ClipboardList },
    ],
  },
  {
    id: 'inventory',
    header: 'Inventory',
    items: [
      { label: 'Project Master',path: '/projects',           icon: Building2 },
      { label: 'Site Diary',    path: '/site-diary',          icon: BookOpen },
      { label: 'Vendor Registry',path: '/vendors',           icon: Store },
      { label: 'Stock Transfer',path: '/stock',              icon: Truck },
      { label: 'Material Usage',path: '/materials',          icon: Box },
      { label: 'Pending Billing',path: '/billing',           icon: FileText, badgeDot: true },
      { label: 'Assets',         path: '/assets',            icon: Wrench },
    ],
  },
];

export default function Sidebar({ isOpen, onClose, isCollapsed = false, onToggleCollapse }) {
  const [animated, setAnimated] = useState(false);
  const [highlighted, setHighlighted] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  const location = useLocation();
  const { data: staffData } = useStaff();
  const { user, logout } = useAuth();
  const staffCount = staffData?.length || 0;

  const handleLogoClick = () => {
    setAnimated(false);
    setHighlighted(true);
    setTimeout(() => setAnimated(true), 10);
    setTimeout(() => {
      setAnimated(false);
      setHighlighted(false);
    }, 1800);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      handleLogoClick();
    }, 0);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Close user menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleGroup = (groupId) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const renderContent = (isMini = false) => (
    <div className="flex flex-col h-full min-h-screen relative select-none">
      {/* ── Header / Brand ── */}
      <div
        className={cn(
          "py-4 flex items-center shrink-0 transition-all duration-300",
          isMini ? "px-2 justify-center flex-col gap-3" : "px-4 justify-between gap-3"
        )}
        style={{ borderBottom: '1px solid var(--color-sidebar-border)' }}
      >
        <div className="flex items-center gap-3 overflow-hidden min-w-0">
          {/* Logo Button */}
          <button
            onClick={handleLogoClick}
            className="relative flex-shrink-0 w-11 h-11 rounded-2xl focus:outline-none group cursor-pointer"
            title="StaffSync Pro"
          >
            <span
              className="absolute inset-0 rounded-2xl blur-sm transition-all duration-300"
              style={{ background: 'rgba(26,107,255,0.25)' }}
            />
            <span
              className="relative flex items-center justify-center w-full h-full rounded-2xl shadow-lg border transition-transform duration-150 active:scale-90"
              style={{
                background: 'linear-gradient(135deg, #1A6BFF 0%, #0040CC 100%)',
                borderColor: 'rgba(255,255,255,0.2)',
              }}
            >
              <span className="text-white font-extrabold text-[13px] tracking-tight">SS</span>
            </span>
            <span className="absolute inset-0 rounded-2xl ring-2 ring-white/20 group-hover:ring-white/40 transition-all duration-300" />
          </button>

          {/* Brand Name (Hidden when mini) */}
          {!isMini && (
            <div className="overflow-hidden min-w-0">
              <motion.div
                animate={animated ? { y: [0, -8, 6, -4, 2, 0] } : { y: 0 }}
                transition={{ duration: 0.8, ease: 'easeInOut' }}
              >
                <div
                  className="text-[15px] font-extrabold leading-tight tracking-wide transition-all duration-300 truncate"
                  style={{
                    color: highlighted ? '#FDE047' : 'var(--color-sidebar-text)',
                    textShadow: highlighted ? '0 0 12px rgba(253,224,71,0.7)' : 'none',
                  }}
                >
                  StaffSync
                </div>
                <div
                  className="text-[10px] font-semibold uppercase tracking-[0.14em] mt-0.5 transition-all duration-300 truncate"
                  style={{
                    color: highlighted ? '#FCD34D' : 'var(--color-sidebar-text2)',
                    textShadow: highlighted ? '0 0 8px rgba(252,211,77,0.5)' : 'none',
                  }}
                >
                  Management Pro
                </div>
              </motion.div>
            </div>
          )}
        </div>

        {/* Desktop Sidebar Collapse Toggle Button */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className={cn(
              "hidden lg:flex items-center justify-center p-2 rounded-xl transition-all duration-200 cursor-pointer border hover:scale-105 active:scale-95",
              isMini ? "w-9 h-9" : "w-8 h-8"
            )}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderColor: 'var(--color-sidebar-border)',
              color: 'var(--color-sidebar-text2)',
            }}
            title={isMini ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isMini ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className={cn("flex-1 py-4 space-y-1 overflow-y-auto custom-scrollbar", isMini ? "px-2" : "px-3")}>
        {navGroups.map((group) => {
          const isGroupCollapsed = !!collapsedGroups[group.id];

          return (
            <div key={group.id} className="mb-3">
              {/* Group Header */}
              {isMini ? (
                <div
                  className="h-px mx-2 my-3"
                  style={{ background: 'var(--color-sidebar-border)' }}
                  title={group.header}
                />
              ) : (
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center justify-between px-2 mt-4 mb-1 text-[10px] font-bold uppercase tracking-widest transition-colors group cursor-pointer focus:outline-none"
                  style={{ color: 'var(--color-sidebar-text3)' }}
                >
                  <span className="group-hover:text-[var(--color-sidebar-text2)] transition-colors">
                    {group.header}
                  </span>
                  <span className="opacity-60 group-hover:opacity-100 transition-opacity">
                    {isGroupCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                  </span>
                </button>
              )}

              {/* Group Nav Items */}
              {!isGroupCollapsed && (
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      title={isMini ? item.label : undefined}
                      onClick={() => {
                        if (onClose) onClose();
                      }}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center rounded-xl text-[13px] font-medium transition-all duration-200 relative group',
                          isMini ? 'justify-center p-2.5' : 'gap-2.5 px-2.5 py-2',
                          isActive ? 'nav-active' : 'nav-idle hover:bg-white/[0.06]'
                        )
                      }
                      style={({ isActive }) => ({
                        background: isActive
                          ? 'var(--color-sidebar-active-bg)'
                          : 'transparent',
                        color: isActive
                          ? 'var(--color-sidebar-active-text)'
                          : 'var(--color-sidebar-text)',
                      })}
                    >
                      {({ isActive }) => (
                        <>
                          {/* Active left bar (Full mode) */}
                          {isActive && !isMini && (
                            <span
                              className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full shadow-sm"
                              style={{ background: 'var(--color-sidebar-active-text)' }}
                            />
                          )}

                          {/* Active ring indicator (Mini mode) */}
                          {isActive && isMini && (
                            <span
                              className="absolute inset-0 rounded-xl ring-1 shadow-sm"
                              style={{
                                borderColor: 'var(--color-sidebar-active-text)',
                                background: 'var(--color-sidebar-active-bg)',
                              }}
                            />
                          )}

                          <item.icon
                            size={16}
                            className="shrink-0 transition-transform duration-200 group-hover:scale-110"
                            style={{
                              opacity: isActive ? 1 : 0.75,
                              color: isActive
                                ? 'var(--color-sidebar-active-text)'
                                : 'var(--color-sidebar-text)',
                            }}
                          />

                          {!isMini && (
                            <>
                              <span className="flex-1 truncate">{item.label}</span>

                              {(item.badge || item.label === 'Staff Members') && (
                                <span
                                  className="badge text-white ml-auto px-2 py-0.5 text-[11px] rounded-full font-bold shadow-xs"
                                  style={{ background: 'var(--color-accent)' }}
                                >
                                  {item.label === 'Staff Members' ? staffCount : item.badge}
                                </span>
                              )}

                              {item.badgeDot && (
                                <span
                                  className="ml-auto w-2 h-2 rounded-full animate-pulse"
                                  style={{ background: 'var(--color-amber)' }}
                                />
                              )}
                            </>
                          )}

                          {/* Mini mode badge dots */}
                          {isMini && (item.badge || item.label === 'Staff Members' || item.badgeDot) && (
                            <span
                              className="absolute top-1 right-1 w-2 h-2 rounded-full"
                              style={{
                                background: item.badgeDot ? 'var(--color-amber)' : 'var(--color-accent)',
                              }}
                            />
                          )}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* ── User Profile Card ── */}
      {user && (
        <div className="relative mx-2 mb-3 shrink-0" ref={userMenuRef}>
          <div
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={cn(
              "rounded-xl flex items-center transition-all duration-300 cursor-pointer hover:bg-white/[0.08] active:scale-98 border shadow-xs group",
              isMini ? "p-2 justify-center" : "px-3 py-2.5 gap-3"
            )}
            style={{
              background: 'rgba(255,255,255,0.03)',
              borderColor: 'rgba(255,255,255,0.06)',
            }}
            title={isMini ? `${user.username || 'User'} (${user.email || 'Admin'})` : "Click for profile menu"}
          >
            {/* Avatar with status indicator */}
            <div className="relative shrink-0">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-white shadow-sm transition-transform duration-300 group-hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, var(--color-accent) 0%, #60A5FA 100%)',
                }}
              >
                {(user.username || 'A').trim().charAt(0).toUpperCase()}
              </div>
              <span
                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ring-1 ring-black/40"
                style={{
                  backgroundColor: 'var(--color-green)',
                  borderColor: 'var(--color-sidebar-bg)',
                }}
                title="Online"
              />
            </div>

            {/* User Details */}
            {!isMini && (
              <div className="flex-1 min-w-0">
                <div
                  className="text-[13px] font-bold truncate leading-snug"
                  style={{ color: 'var(--color-sidebar-text)' }}
                >
                  {user.username}
                </div>
                <div
                  className="text-[10px] font-medium truncate mt-0.5 flex items-center gap-1"
                  style={{ color: 'var(--color-sidebar-text2)' }}
                >
                  <ShieldCheck size={11} className="text-accent shrink-0" />
                  <span className="truncate">{user.email || 'admin@company.com'}</span>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Popover Menu */}
          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className={cn(
                  "absolute bottom-full mb-2 w-56 rounded-2xl border shadow-2xl z-50 overflow-hidden backdrop-blur-xl p-2",
                  isMini ? "left-0" : "left-0 right-0 w-full"
                )}
                style={{
                  background: 'var(--color-sidebar-surface)',
                  borderColor: 'rgba(255,255,255,0.12)',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
                }}
              >
                <div className="p-2.5 border-b border-white/10 mb-1">
                  <div className="text-[13px] font-bold text-white truncate">{user.username}</div>
                  <div className="text-[11px] text-white/60 truncate mt-0.5">{user.email || 'admin@company.com'}</div>
                  <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Active Session
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    if (logout) logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <LogOut size={15} />
                  <span>Sign Out</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Footer ── */}
      <div
        className={cn("py-3 shrink-0 transition-all duration-300", isMini ? "px-1" : "px-4")}
        style={{ borderTop: '1px solid var(--color-sidebar-border)' }}
      >
        <div
          className="text-[10px] font-medium text-center tracking-wide truncate"
          style={{ color: 'var(--color-sidebar-text3)' }}
        >
          {isMini ? "© '26" : "StaffSync Pro © 2026"}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Desktop Sidebar (always visible on lg screens and up) ── */}
      <div
        className={cn(
          "h-screen flex flex-col shrink-0 overflow-y-auto hidden lg:flex transition-all duration-300 ease-in-out",
          isCollapsed ? "w-20" : "w-60"
        )}
        style={{
          background: 'var(--color-sidebar-bg)',
          borderRight: '1px solid var(--color-sidebar-border)',
        }}
      >
        {renderContent(isCollapsed)}
      </div>

      {/* ── Mobile/Tablet Sidebar Drawer (below lg screens) ── */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden"
            />
            {/* Drawer Sliding Panel */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-60 h-full flex flex-col z-50 overflow-y-auto lg:hidden"
              style={{
                background: 'var(--color-sidebar-bg)',
                boxShadow: 'var(--shadow-main)',
              }}
            >
              {renderContent(false)}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
