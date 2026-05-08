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
};

export default function Layout({ children }) {
  const location = useLocation();
  const { onAdd } = useAction();
  const info = pageInfo[location.pathname] || { title: 'Management System', subtitle: 'StaffSync Pro' };

  return (
    <div
      className="flex h-screen overflow-hidden font-sans"
      style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
    >
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar title={info.title} subtitle={info.subtitle} onAdd={onAdd} />

        <main
          className="flex-1 overflow-y-auto p-6"
          style={{ background: 'var(--color-bg)' }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
