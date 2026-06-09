import React, { useState, useEffect, useRef } from 'react';
import { Wallet, TrendingUp, AlertTriangle, Edit2, Trash2, Loader2, Plus, Receipt, Clock, ArrowRight, Download, Paperclip, X, FileText, Image, MapPin, ChevronDown, Check, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useExpenses, useStaff } from '../hooks/useResource';
import { cn, formatDate } from '../lib/utils';
import { Skeleton } from '../components/ui/skeleton';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { useAction } from '../context/ActionContext';
import { downloadCSV } from '../lib/export';
import { uploadService } from '../services/api';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";

const DEFAULT_CATEGORIES = [
  'Travel', 'Fuel', 'Bike Oil', 'Vehicle Repair', 'Spare Parts', 'Toll & Parking',
  'Food', 'Meals & Refreshments', 'Accommodation',
  'Tools', 'Materials', 'Supplies', 'Equipment Purchase', 'Safety Gear',
  'Maintenance', 'Cleaning', 'Utilities', 'Electricity', 'Water',
  'Entertainment', 'Office Expenses', 'Communication', 'Printing & Stationery',
  'Medical', 'Training', 'Other'
];

const PURPOSE_SUGGESTIONS = {
  'Travel': ['Site visit fuel', 'Outstation travel allowance', 'Toll charges'],
  'Fuel': ['Refuel bike', 'Diesel for generator', 'Site visit fuel'],
  'Bike Oil': ['Engine oil change', 'Chain lubrication', 'Mobil purchase'],
  'Vehicle Repair': ['Bike servicing', 'Brake pad replacement', 'Tyre puncture repair'],
  'Spare Parts': ['New tyres', 'Spark plug replacement', 'Bike spare parts'],
  'Toll & Parking': ['Toll plaza fee', 'Site parking charges'],
  'Food': ['Laborer lunch allowance', 'Daily food expenses'],
  'Meals & Refreshments': ['Drinking water bottles', 'Tea & snacks for site staff', 'Client lunch meeting'],
  'Accommodation': ['Site worker room rent', 'Hotel stay for outstation work'],
  'Tools': ['Hand tools purchase', 'Measuring tape & hammer', 'Safety helmets'],
  'Materials': ['Cement bags', 'Bricks & sand purchase', 'Steel rods purchase'],
  'Supplies': ['Office stationery', 'Cleaning supplies', 'First aid box items'],
  'Equipment Purchase': ['Drill machine purchase', 'Extension board cord'],
  'Safety Gear': ['Safety helmets', 'Reflective jackets', 'Safety gloves & boots'],
  'Maintenance': ['Office AC repair', 'Generator servicing', 'Site cleanup cost'],
  'Cleaning': ['Cleaning chemical liquid', 'Brooms and mops'],
  'Utilities': ['Electricity bill', 'Water tanker charges', 'Internet recharge'],
  'Electricity': ['Electricity bill payment'],
  'Water': ['Drinking water bottles', 'Water tanker charges'],
  'Entertainment': ['Client dinner meeting', 'Team celebration lunch'],
  'Office Expenses': ['Courier charges', 'Printer paper ream', 'Office tea supplies'],
  'Communication': ['Mobile recharge', 'Wi-Fi broadband bill'],
  'Printing & Stationery': ['Notebooks & pens', 'Printing expense sheets'],
  'Medical': ['First aid medicines', 'Emergency clinic fee'],
  'Training': ['Safety induction training', 'Technical workshop fee'],
  'Other': ['Miscellaneous expense', 'Emergency cash advance']
};

// ── Category dropdown with inline "+ Add" option ───────────────────────────
function CategorySelect({ value = [], onChange }) {
  const [categories, setCategories] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('expense_categories') || '[]');
      const merged = [...DEFAULT_CATEGORIES];
      saved.forEach(c => { if (!merged.includes(c)) merged.push(c); });
      return merged;
    } catch { return DEFAULT_CATEGORIES; }
  });
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newCat, setNewCat] = useState('');
  const ref = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setAdding(false); setNewCat(''); } };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { if (adding && inputRef.current) inputRef.current.focus(); }, [adding]);

  const selectedList = Array.isArray(value) ? value : (value ? [value] : []);

  const toggle = (cat) => {
    const updated = selectedList.includes(cat)
      ? selectedList.filter(c => c !== cat)
      : [...selectedList, cat];
    onChange(updated);
  };

  const handleAdd = () => {
    const trimmed = newCat.trim();
    if (!trimmed) return;
    const updated = [...categories, trimmed];
    setCategories(updated);
    const custom = updated.filter(c => !DEFAULT_CATEGORIES.includes(c));
    localStorage.setItem('expense_categories', JSON.stringify(custom));
    toggle(trimmed);
    setNewCat('');
    setAdding(false);
  };

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setAdding(false); }}
        className={`w-full flex items-center justify-between px-3 h-9 rounded-md border text-xs bg-surface transition-colors ${
          open ? 'border-accent ring-1 ring-accent/30' : 'border-border/60 hover:border-border'
        }`}
      >
        <span className={selectedList.length > 0 ? 'text-text' : 'text-text3'}>
          {selectedList.length === 0
            ? 'Select category(s)'
            : selectedList.length === 1
              ? selectedList[0]
              : `${selectedList.length} categories selected`}
        </span>
        <ChevronDown size={13} className={`text-text3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute z-50 mt-1 w-full bg-surface border border-border rounded-lg shadow-xl overflow-hidden"
          >
            <div className="max-h-52 overflow-y-auto py-1">
              {categories.map(cat => {
                const checked = selectedList.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggle(cat)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-surface2/60 transition-colors text-left",
                      checked && "bg-accent/5"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors",
                      checked ? "bg-accent border-accent" : "border-border"
                    )}>
                      {checked && <Check size={10} className="text-white" strokeWidth={3} />}
                    </div>
                    <span className={cn("text-text", checked && "font-semibold text-accent")}>{cat}</span>
                  </button>
                );
              })}
            </div>

            {/* Add custom category */}
            <div className="border-t border-border/60">
              {adding ? (
                <div className="flex items-center gap-1.5 p-2">
                  <Input
                    ref={inputRef}
                    value={newCat}
                    onChange={e => setNewCat(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } if (e.key === 'Escape') { setAdding(false); setNewCat(''); } }}
                    placeholder="Category name…"
                    className="h-7 text-[11px] flex-1 bg-surface2 border-border/60 px-2"
                  />
                  <button type="button" onClick={handleAdd} className="h-7 px-2.5 bg-accent text-white text-[11px] font-semibold rounded-md hover:bg-accent/90 flex-shrink-0">Add</button>
                  <button type="button" onClick={() => { setAdding(false); setNewCat(''); }} className="h-7 w-7 flex items-center justify-center text-text3 hover:text-red rounded-md"><X size={13} /></button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAdding(true)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-[11px] font-semibold text-accent hover:bg-accent/5 transition-colors"
                >
                  <Plus size={13} /> Add Category
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pill chips */}
      {selectedList.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {selectedList.map(cat => (
            <span
              key={cat}
              className="inline-flex items-center gap-1 bg-accent/10 text-accent text-[10px] font-semibold px-2 py-0.5 rounded-full"
            >
              {cat}
              <button type="button" onClick={() => toggle(cat)} className="hover:text-red ml-0.5">
                <X size={9} strokeWidth={3} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}


const expenseSchema = z.object({
  staffId: z.array(z.string()).min(1, "Select at least one member"),
  date: z.string().min(1, "Date is required"),
  amount: z.coerce.number().min(1, "Valid amount is required"),
  purpose: z.string().min(3, "Purpose is required"),
  category: z.array(z.string()).min(1, "Select at least one category"),
  location: z.object({
    from: z.string().default(''),
    to: z.string().default(''),
  }).default({ from: '', to: '' }),
  receipt: z.boolean().default(false),
  status: z.enum(['Pending', 'Approved', 'Rejected']).default('Pending'),
});

// ── Multi-member checkbox dropdown ──────────────────────────────────────────
function MemberMultiSelect({ staffList, value = [], onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (id) => {
    if (value.includes(id)) onChange(value.filter(v => v !== id));
    else onChange([...value, id]);
  };

  const selected = staffList.filter(s => value.includes(s._id));

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          "w-full flex items-center justify-between gap-2 border rounded-md px-3 h-9 text-xs bg-surface border-border/60 transition-colors",
          open ? "border-accent ring-1 ring-accent/30" : "hover:border-border"
        )}
      >
        <span className="flex-1 text-left truncate text-text2">
          {selected.length === 0
            ? "Choose member(s)"
            : selected.length === 1
              ? selected[0].name
              : `${selected.length} members selected`}
        </span>
        <ChevronDown size={13} className={cn("text-text3 transition-transform", open && "rotate-180")} />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute z-50 mt-1 w-full bg-surface border border-border rounded-lg shadow-xl overflow-hidden"
          >
            <div className="max-h-48 overflow-y-auto py-1">
              {staffList.map(s => {
                const checked = value.includes(s._id);
                return (
                  <button
                    key={s._id}
                    type="button"
                    onClick={() => toggle(s._id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-surface2/60 transition-colors",
                      checked && "bg-accent/5"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors",
                      checked ? "bg-accent border-accent" : "border-border"
                    )}>
                      {checked && <Check size={10} className="text-white" strokeWidth={3} />}
                    </div>
                    <div className="w-6 h-6 rounded-full bg-accent/10 text-accent flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                      {s.initials || s.name?.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-text font-medium">{s.name}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pill chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {selected.map(s => (
            <span
              key={s._id}
              className="inline-flex items-center gap-1 bg-accent/10 text-accent text-[10px] font-semibold px-2 py-0.5 rounded-full"
            >
              {s.name}
              <button type="button" onClick={() => toggle(s._id)} className="hover:text-red ml-0.5">
                <X size={9} strokeWidth={3} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Expenses() {
  const { data: expenses, isLoading, create, update, remove, isCreating, isUpdating } = useExpenses();
  const { staffList } = useStaff();
  const { registerAddAction, registerDownloadAction, searchQuery, dateFilter } = useAction();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  const filteredExpenses = expenses.filter(e => {
    const q = searchQuery.toLowerCase();
    // staffId can be array or legacy single object
    const members = Array.isArray(e.staffId) ? e.staffId : (e.staffId ? [e.staffId] : []);
    const staffName = members.map(m => m?.name || '').join(' ');
    const purpose = e.purpose || '';
    const category = Array.isArray(e.category) ? e.category.join(' ') : (e.category || '');
    
    return !q || (
      staffName.toLowerCase().includes(q) ||
      purpose.toLowerCase().includes(q) ||
      category.toLowerCase().includes(q)
    );
  });

  const handleDownloadCSV = React.useCallback(() => {
    const exportData = expenses.map(e => {
      const members = Array.isArray(e.staffId) ? e.staffId : (e.staffId ? [e.staffId] : []);
      return {
        StaffName: members.map(m => m?.name || 'Unknown').join(', '),
        Date: formatDate(e.date, { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-'),
        Amount: e.amount,
        Category: Array.isArray(e.category) ? e.category.join(', ') : (e.category || ''),
        Purpose: e.purpose,
        From: e.location?.from || '',
        To: e.location?.to || '',
        Status: e.status
      };
    });
    downloadCSV(exportData, 'Expense_Full_Report');
  }, [expenses]);

  useEffect(() => {
    const unregisterAdd = registerAddAction(() => setIsModalOpen(true));
    const unregisterDownload = registerDownloadAction(handleDownloadCSV);
    return () => {
      unregisterAdd();
      unregisterDownload();
    };
  }, [registerAddAction, registerDownloadAction, handleDownloadCSV]);

  const form = useForm({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      staffId: [],
      date: dateFilter,
      amount: 0,
      purpose: '',
      category: ['Other'],
      location: { from: '', to: '' },
      receipt: false,
      status: 'Pending',
    },
  });
  const selectedCategories = form.watch('category') || [];

  const suggestions = React.useMemo(() => {
    let list = [];
    selectedCategories.forEach(cat => {
      if (PURPOSE_SUGGESTIONS[cat]) {
        list = [...list, ...PURPOSE_SUGGESTIONS[cat]];
      }
    });
    if (list.length === 0) {
      list = ['Miscellaneous expense', 'Site visit expenses', 'Office purchase', 'Urgent maintenance'];
    }
    return Array.from(new Set(list)).slice(0, 5);
  }, [selectedCategories]);



  const onSubmit = async (values) => {
    try {
      const payload = {
        ...values,
        attachments: editingRecord?.attachments || []
      };
      if (editingRecord) {
        await update({ id: editingRecord._id, data: payload });
        toast.success("Expense record updated");
      } else {
        await create(payload);
        toast.success("Expense submitted successfully");
      }
      handleClose();
    } catch (error) {
      toast.error(error.message || "Failed to save expense");
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);

    // Normalize staffId: support both legacy single-object and new array
    const members = Array.isArray(record.staffId)
      ? record.staffId.map(m => m?._id || m).filter(Boolean)
      : record.staffId
        ? [record.staffId?._id || record.staffId]
        : [];

    form.reset({
      staffId: members,
      date: record.date,
      amount: record.amount,
      purpose: record.purpose,
      category: Array.isArray(record.category) ? record.category : (record.category ? [record.category] : ['Other']),
      location: record.location || { from: '', to: '' },
      receipt: record.receipt,
      status: record.status,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this expense record?")) {
      try {
        await remove(id);
        toast.success("Record deleted");
      } catch (error) {
        toast.error("Failed to delete record");
      }
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingRecord(null);
    form.reset();
  };



  const totalAmount = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const pendingAmount = filteredExpenses.filter(e => e.status === 'Pending').reduce((acc, curr) => acc + curr.amount, 0);

  // Helper: get members array from an expense (handles legacy single + new array)
  const getMembers = (e) => {
    if (Array.isArray(e.staffId)) return e.staffId.filter(Boolean);
    return e.staffId ? [e.staffId] : [];
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text">Expense Tracker</h2>
          <p className="text-sm text-text2">Monitor and approve team expenses.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Approved', value: `₹${(totalAmount - pendingAmount).toLocaleString()}`, icon: TrendingUp, color: 'text-green bg-green-light' },
          { label: 'Pending Approval', value: `₹${pendingAmount.toLocaleString()}`, icon: AlertTriangle, color: 'text-amber bg-amber-light' },
          { 
            label: 'Total Requests', 
            value: filteredExpenses.length, 
            icon: Wallet, 
            color: 'text-accent bg-accent-light',
            onClick: () => setIsHistoryOpen(true),
            clickable: true
          },
        ].map(stat => (
          <div 
            key={stat.label} 
            onClick={stat.onClick}
            className={cn(
              "bg-surface border border-border rounded-xl p-5 shadow-sm flex items-center gap-4 transition-all",
              stat.clickable && "cursor-pointer hover-lift active:scale-[0.98]"
            )}
          >
            <div className={cn("p-3 rounded-lg", stat.color)}>
              <stat.icon size={20} />
            </div>
            <div>
              <div className="text-[12px] text-text2 font-medium flex items-center gap-2">
                {stat.label}
                {stat.clickable && <Plus size={10} className="text-accent" />}
              </div>
              <div className="text-xl font-bold">{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[650px]">
            <thead>
              <tr className="bg-surface2/50 border-b border-border">
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-text3">Staff & Category</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-text3">Description</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-text3">Amount</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-text3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="border-b border-border"><td colSpan={4} className="p-4"><Skeleton className="h-12 w-full" /></td></tr>
                  ))
                ) : filteredExpenses.map((e) => {
                  const members = getMembers(e);
                  const hasRoute = e.location?.from || e.location?.to;
                  return (
                    <motion.tr 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      key={e._id} 
                      className="border-b border-border last:border-0 hover:bg-surface2/30 transition-all group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          {/* Stacked avatars for multiple members */}
                          <div className="flex -space-x-2 flex-shrink-0 mt-0.5">
                            {members.slice(0, 3).map((m, i) => (
                              <div
                                key={m?._id || i}
                                title={m?.name}
                                className="w-7 h-7 rounded-full bg-accent/10 text-accent border-2 border-surface flex items-center justify-center text-[9px] font-bold"
                                style={{ zIndex: 3 - i }}
                              >
                                {m?.initials || m?.name?.slice(0, 2).toUpperCase() || '??'}
                              </div>
                            ))}
                            {members.length > 3 && (
                              <div className="w-7 h-7 rounded-full bg-surface2 border-2 border-surface flex items-center justify-center text-[9px] font-bold text-text3">
                                +{members.length - 3}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-[13px] font-medium text-text leading-tight">
                              {members.length === 0
                                ? 'Unknown'
                                : members.length === 1
                                  ? members[0]?.name || 'Unknown'
                                  : `${members[0]?.name || '?'} +${members.length - 1}`}
                            </div>
                            <div className="text-[10px] text-accent font-bold uppercase tracking-wide mt-0.5">
                              {Array.isArray(e.category) ? e.category.join(', ') : e.category}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-[13.5px] font-medium text-text">{e.purpose}</div>
                        {hasRoute && (
                          <div className="flex items-center gap-1 mt-0.5 text-[10.5px] text-text3 font-mono">
                            <MapPin size={9} className="text-accent flex-shrink-0" />
                            <span>{e.location.from}</span>
                            {e.location.from && e.location.to && <ArrowRight size={9} className="text-text3" />}
                            <span>{e.location.to}</span>
                          </div>
                        )}
                        <div className="text-[11.5px] text-text3 font-mono mt-0.5">{formatDate(e.date)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-[15px] font-bold text-text">₹{e.amount.toLocaleString()}</div>
                        <div className={cn(
                          "inline-flex mt-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          e.status === 'Approved' ? "bg-green-light text-green" :
                          e.status === 'Rejected' ? "bg-red-light text-red" : "bg-amber-light text-amber"
                        )}>
                          {e.status}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex gap-1 justify-end items-center">
                          {e.attachments?.length > 0 && (
                            <a
                              href={e.attachments[e.attachments.length - 1].url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 rounded-lg text-accent hover:bg-accent-light transition-colors"
                              title={`View receipt: ${e.attachments[e.attachments.length - 1].originalName}`}
                            >
                              <Paperclip size={15} />
                            </a>
                          )}
                          <div className="flex gap-1 row-actions">
                            <button onClick={() => handleEdit(e)} className="p-2 rounded-lg text-text2 hover:bg-accent-light hover:text-accent">
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleDelete(e._id)} className="p-2 rounded-lg text-text2 hover:bg-red-light hover:text-red">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[800px] bg-surface text-text border border-border/80 shadow-2xl rounded-xl overflow-hidden p-0 flex flex-col max-h-[90vh]">
          <div className="p-4 px-5 border-b border-border/60 bg-surface2/25 flex-shrink-0">
            <DialogHeader className="space-y-0.5">
              <DialogTitle className="text-lg font-bold tracking-tight text-text">{editingRecord ? 'Edit Expense' : 'Log Expense'}</DialogTitle>
              <DialogDescription className="text-xs text-text2">
                {editingRecord ? 'Update the details of this expense record.' : 'Enter the details for a new expense request.'}
              </DialogDescription>
            </DialogHeader>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden min-h-0">
              <div className="p-5 space-y-4 overflow-y-auto flex-1">
                {/* ── Staff Members (multi-select) ── */}
                <FormField control={form.control} name="staffId" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2 flex items-center gap-1.5">
                      <Users size={11} /> Staff Members
                    </FormLabel>
                    <MemberMultiSelect
                      staffList={staffList}
                      value={field.value}
                      onChange={field.onChange}
                    />
                    <FormMessage />
                  </FormItem>
                )} />

                {/* ── Date / Category ── */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="date" render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} className="bg-surface border-border/60 h-9 px-3 text-xs focus-visible:ring-accent" />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Category</FormLabel>
                      <CategorySelect value={field.value} onChange={field.onChange} />
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* ── To / From (always visible) ── */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="location.from" render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2 flex items-center gap-1.5">
                        <MapPin size={10} className="text-accent" /> From
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. Office" className="bg-surface border-border/60 h-9 px-3 text-xs focus-visible:ring-accent" />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="location.to" render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2 flex items-center gap-1.5">
                        <ArrowRight size={10} className="text-accent" /> To
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. Bishnupur Site" className="bg-surface border-border/60 h-9 px-3 text-xs focus-visible:ring-accent" />
                      </FormControl>
                    </FormItem>
                  )} />
                </div>

                {/* ── Amount / Status ── */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="amount" render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Amount (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="bg-surface border-border/60 h-9 px-3 text-xs focus-visible:ring-accent" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-surface border-border/60 h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-surface border-border">
                          {['Pending', 'Approved', 'Rejected'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>

                {/* ── Purpose ── */}
                <FormField control={form.control} name="purpose" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Purpose / Description</FormLabel>
                    <FormControl>
                      <Input {...field} className="bg-surface border-border/60 h-9 px-3 text-xs focus-visible:ring-accent" />
                    </FormControl>
                    
                    {/* Dynamic Purpose Suggestions */}
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {suggestions.map(sug => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => form.setValue('purpose', sug, { shouldValidate: true })}
                          className="px-2 py-0.5 border border-border/60 rounded text-[10.5px] text-text3 hover:border-accent hover:text-accent hover:bg-accent/5 transition-colors cursor-pointer"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>

                    <FormMessage />
                  </FormItem>
                )} />
              </div>

               <DialogFooter className="p-4 border-t border-border/60 gap-2 sm:gap-0 flex-shrink-0">
                 <Button variant="outline" type="button" onClick={handleClose} className="h-9 px-4 border-border/80 text-text2 hover:text-text hover:bg-surface2/30 text-xs">
                   Cancel
                 </Button>
                 <Button type="submit" disabled={isCreating || isUpdating} className="h-9 px-4 bg-accent hover:bg-accent/90 text-white font-semibold transition-all duration-200 text-xs">
                   {(isCreating || isUpdating) && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                   {editingRecord ? 'Save Changes' : 'Submit Expense'}
                 </Button>
               </DialogFooter>
             </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="sm:max-w-[750px] bg-surface text-text flex flex-col max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="font-bold flex items-center gap-2">
              <Clock className="text-accent" size={18} /> Detailed Expense History
            </DialogTitle>
            <DialogDescription className="text-[12px] text-text2">Full record of all expense requests logged in the system.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto border border-border rounded-lg bg-surface2/20">
            <table className="w-full text-left border-collapse text-[12px] min-w-[550px]">
              <thead className="sticky top-0 bg-surface border-b border-border z-10">
                <tr>
                  <th className="px-4 py-3 font-bold uppercase text-text3 whitespace-nowrap">Staff & Category</th>
                  <th className="px-4 py-3 font-bold uppercase text-text3 whitespace-nowrap">Purpose / Route</th>
                  <th className="px-4 py-3 font-bold uppercase text-text3 whitespace-nowrap">Amount</th>
                  <th className="px-4 py-3 font-bold uppercase text-text3 whitespace-nowrap text-right">Date</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr><td colSpan={4} className="p-8 text-center text-text3">No expenses found.</td></tr>
                ) : expenses.map(e => {
                  const members = getMembers(e);
                  const hasRoute = e.location?.from || e.location?.to;
                  return (
                    <tr key={e._id} className="border-b border-border/50 hover:bg-surface2/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-text">
                          {members.length === 0
                            ? 'Unknown'
                            : members.map(m => m?.name || 'Unknown').join(', ')}
                        </div>
                        <div className="text-[10px] text-accent font-bold uppercase">
                          {Array.isArray(e.category) ? e.category.join(', ') : e.category}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text2">
                        <div className="text-text font-medium">{e.purpose}</div>
                        {hasRoute && (
                          <div className="flex items-center gap-1 mt-0.5 text-[10px] text-text3 font-mono">
                            <MapPin size={8} className="text-accent" />
                            {e.location.from}
                            {e.location.from && e.location.to && <ArrowRight size={8} />}
                            {e.location.to}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-bold text-text">₹{e.amount.toLocaleString()}</div>
                        <div className={cn(
                          "text-[9px] font-bold uppercase",
                          e.status === 'Approved' ? "text-green" :
                          e.status === 'Rejected' ? "text-red" : "text-amber"
                        )}>
                          {e.status}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-text2 uppercase tracking-tighter">
                        {formatDate(e.date, { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <DialogFooter className="mt-4 pt-3 border-t border-border">
            <Button variant="outline" onClick={() => setIsHistoryOpen(false)}>Close</Button>
            <Button 
              className="bg-green hover:bg-green-dark text-white gap-2"
              onClick={handleDownloadCSV}
            >
              <Download size={14} /> Download Full Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
