import React from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { motion, AnimatePresence } from 'framer-motion';
import { useAction } from '../context/ActionContext';

const pageInfo = {
  '/':           { title: 'Dashboard',          subtitle: 'Overview of all activities' },
  '/staff':      { title: 'Staff Members',      subtitle: 'Manage team directory' },
  '/attendance': { title: 'Attendance',          subtitle: 'Daily attendance records' },
  '/expenses':   { title: 'Expenses',            subtitle: 'Track and manage expenses' },
  '/performance':{ title: 'Performance',         subtitle: 'KPIs and ratings' },
  '/travel':     { title: 'Travel History',      subtitle: 'Movement and trip logs' },
  '/projects':   { title: 'Project Master',      subtitle: 'Project and site registry' },
  '/stock':      { title: 'Stock Transfer',      subtitle: 'Internal material movement' },
  '/materials':  { title: 'Material Usage Log',  subtitle: 'Usage, wastage, and returns' },
  '/billing':    { title: 'Pending Billing',     subtitle: 'Delivered but not billed items' },
  '/salary':     { title: 'Salary Payments',     subtitle: 'Manage staff salaries' },
  '/leave':      { title: 'Leave Management',    subtitle: 'Approve or reject leave' },
  '/remarks':    { title: 'Staff Movement',      subtitle: 'Daily movement and remarks' },
  '/site-diary': { title: 'Site Diary',          subtitle: 'Daily site progress and work logs' },
  '/vendors':    { title: 'Vendor Registry',     subtitle: 'Supplier and subcontractor directory' },
  '/assets':     { title: 'Assets & Equipment',  subtitle: 'Track corporate vehicles and site tools' },
};

export default function Layout({ children }) {
  const location = useLocation();
  const { onAdd } = useAction();
  const info = pageInfo[location.pathname] || { title: 'Management System', subtitle: 'StaffSync Pro' };
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  return (
    <div
      className="flex h-screen overflow-hidden font-sans"
      style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
    >
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar 
          title={info.title} 
          subtitle={info.subtitle} 
          onAdd={onAdd} 
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
        />

        <main
          className="flex-1 overflow-y-auto p-6"
          style={{ background: 'var(--color-bg)' }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.985 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
