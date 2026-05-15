import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
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
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useStaff } from '../hooks/useResource';

const navItems = [
  { label: 'Main', isHeader: true },
  { label: 'Dashboard',     path: '/',          icon: LayoutDashboard },
  { label: 'Staff Members', path: '/staff',      icon: Users },
  { label: 'Daily Entry', isHeader: true },
  { label: 'Attendance',    path: '/attendance', icon: CalendarCheck },
  { label: 'Leave Requests',path: '/leave',      icon: CalendarClock },
  { label: 'Salary Payment',path: '/salary',     icon: Banknote },
  { label: 'Expenses',      path: '/expenses',   icon: Wallet },
  { label: 'Performance',   path: '/performance',icon: Activity },
  { label: 'Travel History',path: '/travel',     icon: Plane },
  { label: 'Remarks',       path: '/remarks',    icon: ClipboardList },
  { label: 'Inventory', isHeader: true },
  { label: 'Project Master',path: '/projects',   icon: Building2 },
  { label: 'Stock Transfer',path: '/stock',      icon: Truck },
  { label: 'Material Usage',path: '/materials',  icon: Box },
  { label: 'Pending Billing',path: '/billing',   icon: FileText, badgeDot: true },
];

export default function Sidebar() {
  const [animated, setAnimated] = useState(false);
  const [highlighted, setHighlighted] = useState(false);
  const location = useLocation();
  const { data: staffData } = useStaff();
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
    handleLogoClick();
  }, [location.pathname]);


  return (
    <div
      className="w-60 h-screen flex flex-col shrink-0 overflow-y-auto"
      style={{
        background: 'var(--color-sidebar-bg)',
        borderRight: '1px solid var(--color-sidebar-border)',
      }}
    >
      {/* ── Header / Brand ── */}
      <div
        className="px-4 py-4 flex items-center gap-3 shrink-0"
        style={{ borderBottom: '1px solid var(--color-sidebar-border)' }}
      >
        {/* Logo Button */}
        <button
          onClick={handleLogoClick}
          className="relative flex-shrink-0 w-11 h-11 rounded-2xl focus:outline-none group"
          title="StaffSync Pro"
        >
          <span className="absolute inset-0 rounded-2xl blur-sm transition-all duration-300"
            style={{ background: 'rgba(91,138,248,0.25)' }} />
          <span className="relative flex items-center justify-center w-full h-full rounded-2xl shadow-lg border transition-transform duration-150 active:scale-90"
            style={{
              background: 'linear-gradient(135deg, #3B6CF6 0%, #6B8DF9 60%, #8BA5FB 100%)',
              borderColor: 'rgba(255,255,255,0.2)',
            }}
          >
            <span className="text-white font-extrabold text-[13px] tracking-tight">SS</span>
          </span>
          <span className="absolute inset-0 rounded-2xl ring-2 ring-white/20 group-hover:ring-white/40 transition-all duration-300" />
        </button>

        {/* Brand name */}
        <div className="overflow-hidden">
          <motion.div
            animate={animated ? { y: [0, -8, 6, -4, 2, 0] } : { y: 0 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
          >
            <div
              className="text-[15px] font-extrabold leading-tight tracking-wide transition-all duration-300"
              style={{
                color: highlighted
                  ? '#FDE047'
                  : 'var(--color-sidebar-text)',
                textShadow: highlighted ? '0 0 12px rgba(253,224,71,0.7)' : 'none',
              }}
            >
              StaffSync
            </div>
            <div
              className="text-[10px] font-semibold uppercase tracking-[0.14em] mt-0.5 transition-all duration-300"
              style={{
                color: highlighted
                  ? '#FCD34D'
                  : 'var(--color-sidebar-text2)',
                textShadow: highlighted ? '0 0 8px rgba(252,211,77,0.5)' : 'none',
              }}
            >
              Management Pro
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 py-4 px-3 space-y-0.5">
        {navItems.map((item, idx) =>
          item.isHeader ? (
            <div
              key={idx}
              className="text-[10px] font-bold uppercase tracking-widest px-2 mt-5 mb-2 first:mt-0"
              style={{ color: 'var(--color-sidebar-text3)' }}
            >
              {item.label}
            </div>
          ) : (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 relative group',
                  isActive ? 'nav-active' : 'nav-idle'
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
                  {/* Active left bar */}
                  {isActive && (
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                      style={{ background: 'var(--color-sidebar-active-text)' }}
                    />
                  )}

                  <item.icon
                    size={15}
                    className="shrink-0 transition-transform duration-200 group-hover:scale-110"
                    style={{
                      opacity: isActive ? 1 : 0.7,
                      color: isActive
                        ? 'var(--color-sidebar-active-text)'
                        : 'var(--color-sidebar-text)',
                    }}
                  />

                  <span className="flex-1 truncate">{item.label}</span>

                  {(item.badge || item.label === 'Staff Members') && (
                    <span
                      className="badge text-white ml-auto"
                      style={{ background: 'var(--color-accent)' }}
                    >
                      {item.label === 'Staff Members' ? staffCount : item.badge}
                    </span>
                  )}

                  {item.badgeDot && (
                    <span
                      className="ml-auto w-1.5 h-1.5 rounded-full"
                      style={{ background: 'var(--color-amber)' }}
                    />
                  )}
                </>
              )}
            </NavLink>
          )
        )}
      </nav>

      {/* ── Footer ── */}
      <div
        className="px-4 py-3 shrink-0"
        style={{ borderTop: '1px solid var(--color-sidebar-border)' }}
      >
        <div
          className="text-[10px] font-medium text-center tracking-wide"
          style={{ color: 'var(--color-sidebar-text3)' }}
        >
          StaffSync Pro &copy; 2026
        </div>
      </div>
    </div>
  );
}
