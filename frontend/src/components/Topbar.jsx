import React from 'react';
import { Calendar, Filter, Plus, Download, Search, X, Moon, Sun, LayoutPanelLeft } from 'lucide-react';
import { useAction } from '../context/ActionContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function Topbar({ title, subtitle }) {
  const {
    onAdd, onImport, onDownload,
    searchQuery, setSearchQuery,
    isFilterOpen, toggleFilter,
    theme, toggleTheme,
    dateFilter, setDateFilter,
  } = useAction();

  const [isAddDropdownOpen, setIsAddDropdownOpen] = React.useState(false);
  const dateInputRef = React.useRef(null);

  const [y, m, d] = dateFilter.split('-').map(Number);
  const displayDate = new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const handleDateClick = () => {
    if (dateInputRef.current && typeof dateInputRef.current.showPicker === 'function') {
      dateInputRef.current.showPicker();
    }
  };

  return (
    <div
      className="px-6 py-3.5 flex items-center gap-3 shrink-0 sticky top-0 z-50 backdrop-blur-md"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--color-surface) 85%, transparent)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      {/* Title block */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex h-10 w-10 rounded-xl items-center justify-center border shadow-sm"
          style={{ 
            background: 'var(--color-surface2)',
            borderColor: 'var(--color-border)',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <LayoutPanelLeft size={18} className="text-accent" strokeWidth={2.5} />
        </div>
        <div>
          <div
            className="text-[17px] font-bold leading-tight"
            style={{ color: 'var(--color-text)' }}
          >
            {title}
          </div>
          <div
            className="text-[12px] mt-0.5"
            style={{ color: 'var(--color-text2)' }}
          >
            {subtitle}
          </div>
        </div>
      </div>

      <div className="ml-auto flex gap-2 items-center">
        {/* Dedicated Search bar */}
        <div className="relative overflow-hidden group">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-accent"
            size={13}
            style={{ color: 'var(--color-text3)' }}
          />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-[160px] md:w-[220px] pl-8 pr-3 py-1.5 text-[13px] rounded-lg border focus:outline-none focus:ring-2 transition-all shadow-sm"
            style={{
              background: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)',
              '--tw-ring-color': 'var(--color-accent-ring)',
            }}
          />
        </div>

        {/* Date picker */}
        <div
          onClick={handleDateClick}
          className="relative rounded-lg px-3 py-1.5 text-[12px] font-mono hidden md:flex items-center gap-2 overflow-hidden cursor-pointer transition-all duration-200 active:scale-95 border hover:border-accent/40 shadow-sm"
          style={{
            background: 'var(--color-surface2)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text2)',
          }}
        >
          <Calendar size={13} className="text-accent" />
          <span style={{ color: 'var(--color-text2)' }}>{displayDate}</span>
          <input
            ref={dateInputRef}
            type="date"
            className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>

        {/* Filter toggle */}
        <div className="relative">
          <button
            onClick={toggleFilter}
            title="Advanced Filters"
            className="flex items-center justify-center w-[34px] h-[34px] rounded-lg text-[13px] font-medium transition-all duration-200 active:scale-95 border shadow-sm"
            style={
              isFilterOpen
                ? {
                    background: 'var(--color-accent-light)',
                    borderColor: 'var(--color-accent)',
                    color: 'var(--color-accent)',
                    boxShadow: '0 0 10px var(--color-accent-ring)',
                  }
                : {
                    background: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text2)',
                  }
            }
          >
            {isFilterOpen ? <X size={15} /> : <Filter size={14} />}
          </button>
          
          <AnimatePresence>
            {isFilterOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-72 rounded-xl border shadow-main z-50 overflow-hidden"
                style={{ 
                  background: 'var(--color-surface)',
                  borderColor: 'var(--color-border)'
                }}
              >
                <div className="p-4 bg-surface2/50 border-b border-border flex justify-between items-center" style={{ borderColor: 'var(--color-border)' }}>
                  <h4 className="text-[13px] font-bold text-text m-0">Advanced Filters</h4>
                  <span className="text-[9px] font-bold uppercase tracking-wider bg-accent-light text-accent px-2 py-0.5 rounded-full">Coming Soon</span>
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-[12px] text-text2 leading-relaxed m-0">
                    Advanced property filtering by status, categorical tags, and advanced matching rules is currently under development.
                  </p>
                  <p className="text-[11px] text-text3 italic m-0">
                    Tip: Use the permanent search bar to your left for instant text-based filtering.
                  </p>
                </div>
                <div className="p-3 border-t border-border flex justify-end" style={{ borderColor: 'var(--color-border)' }}>
                  <button 
                    onClick={toggleFilter} 
                    className="px-4 py-1.5 text-[12px] font-medium text-text rounded-lg border transition-colors shadow-sm"
                    style={{ background: 'var(--color-surface2)', borderColor: 'var(--color-border)' }}
                  >
                    Got it
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          className="theme-toggle"
          aria-label="Toggle theme"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={theme}
              initial={{ rotate: -30, opacity: 0, scale: 0.7 }}
              animate={{ rotate: 0,   opacity: 1, scale: 1   }}
              exit={{    rotate:  30, opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-center"
            >
              {theme === 'dark'
                ? <Sun size={14} style={{ color: 'var(--color-amber)' }} />
                : <Moon size={14} style={{ color: 'var(--color-accent)' }} />
              }
            </motion.span>
          </AnimatePresence>
        </button>

        {/* Add Entry */}
        {onAdd && (
          <div className="relative">
            <button
              onClick={() => onImport ? setIsAddDropdownOpen(!isAddDropdownOpen) : onAdd()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium text-white transition-all duration-200 active:scale-95"
              style={{
                background: 'var(--color-accent)',
              }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--shadow-glow)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
            >
              <Plus size={13} />
              Add Entry
            </button>

            <AnimatePresence>
              {isAddDropdownOpen && onImport && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 top-full mt-2 w-48 py-1.5 rounded-xl border shadow-xl z-50 overflow-hidden"
                  style={{ 
                    background: 'var(--color-surface)',
                    borderColor: 'var(--color-border)'
                  }}
                >
                  <button
                    onClick={() => { onAdd(); setIsAddDropdownOpen(false); }}
                    className="w-full text-left px-4 py-2 text-[13px] hover:bg-surface2 transition-colors flex items-center gap-2"
                    style={{ color: 'var(--color-text)' }}
                  >
                    <Plus size={14} className="text-accent" />
                    Manual Entry
                  </button>
                  <button
                    onClick={() => { onImport(); setIsAddDropdownOpen(false); }}
                    className="w-full text-left px-4 py-2 text-[13px] hover:bg-surface2 transition-colors flex items-center gap-2"
                    style={{ color: 'var(--color-text)' }}
                  >
                    <Download size={14} className="text-green rotate-180" />
                    Import from Excel
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Download Report */}
        {onDownload && (
          <button
            onClick={onDownload}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all duration-200 active:scale-95 border shadow-sm group"
            style={{ 
              borderColor: 'var(--color-green)',
              color: 'var(--color-green)',
              background: 'transparent'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--color-green-light)';
              e.currentTarget.style.boxShadow = '0 0 10px rgba(22,163,74,0.15)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
            }}
          >
            <Download size={13} className="transition-transform group-hover:-translate-y-0.5" />
            Export
          </button>
        )}
      </div>
    </div>
  );
}
