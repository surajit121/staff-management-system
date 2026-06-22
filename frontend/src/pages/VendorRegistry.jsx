import React, { useState, useMemo, useEffect } from 'react';
import {
  Store, Star, Phone, Mail, MapPin, FileText, Edit2, Trash2,
  Loader2, Plus, X, TrendingUp, Package, ShieldCheck, Truck,
  Zap, Flame, Users, HardHat, ChevronRight, ExternalLink,
  IndianRupee, CalendarDays, CheckCircle2, XCircle, Clock,
  Building2, Tag,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVendors } from '../hooks/useResource';
import { useBilling } from '../hooks/useResource';
import { cn, formatDate } from '../lib/utils';
import { Skeleton } from '../components/ui/skeleton';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { useAction } from '../context/ActionContext';
import { downloadCSV } from '../lib/export';
import AnimatedCounter from '../components/AnimatedCounter';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';

// ── Category config ──────────────────────────────────────────────────────────
const CATEGORIES = [
  { value: 'Materials',        label: 'Materials',         icon: Package,     color: '#F59E0B', bg: 'bg-amber-light',  text: 'text-amber'  },
  { value: 'Security Systems', label: 'Security Systems',  icon: ShieldCheck, color: '#3B82F6', bg: 'bg-accent-light', text: 'text-accent' },
  { value: 'Equipment',        label: 'Equipment',         icon: HardHat,     color: '#8B5CF6', bg: 'bg-purple-light', text: 'text-purple' },
  { value: 'Labour',           label: 'Labour',            icon: Users,       color: '#10B981', bg: 'bg-green-light',  text: 'text-green'  },
  { value: 'Electrical',       label: 'Electrical',        icon: Zap,         color: '#FBBF24', bg: 'bg-amber-light',  text: 'text-amber'  },
  { value: 'Fire Safety',      label: 'Fire Safety',       icon: Flame,       color: '#EF4444', bg: 'bg-red-light',    text: 'text-red'    },
  { value: 'Transport',        label: 'Transport',         icon: Truck,       color: '#06B6D4', bg: 'bg-teal-light',   text: 'text-teal'   },
  { value: 'Other',            label: 'Other',             icon: Store,       color: '#64748B', bg: 'bg-surface2',     text: 'text-text3'  },
];

const getCat = (val) => CATEGORIES.find(c => c.value === val) || CATEGORIES[CATEGORIES.length - 1];

// ── Star Rating display ──────────────────────────────────────────────────────
function StarRating({ value, onChange, size = 16 }) {
  const [hovered, setHovered] = useState(null);
  const display = hovered ?? value;
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type={onChange ? 'button' : undefined}
          onClick={() => onChange?.(n)}
          onMouseEnter={() => onChange && setHovered(n)}
          onMouseLeave={() => onChange && setHovered(null)}
          className={cn('transition-colors', onChange ? 'cursor-pointer' : 'cursor-default')}
        >
          <Star
            size={size}
            className={cn(
              'transition-all',
              n <= display ? 'text-amber fill-amber' : 'text-border fill-transparent'
            )}
          />
        </button>
      ))}
    </div>
  );
}

// ── Zod schema ───────────────────────────────────────────────────────────────
const vendorSchema = z.object({
  name: z.string().min(2, 'Vendor name required'),
  category: z.string().min(1, 'Category is required'),
  contactPerson: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  email: z.string().optional().default(''),
  gstNumber: z.string().optional().default(''),
  address: z.string().optional().default(''),
  paymentTerms: z.string().optional().default(''),
  rating: z.coerce.number().min(1).max(5).default(3),
  notes: z.string().optional().default(''),
  isActive: z.boolean().default(true),
  date: z.string().optional().default(''),
  amount: z.coerce.number().optional().default(0),
  inHold: z.boolean().default(false),
  pendingAmount: z.coerce.number().optional().default(0),
  totalTransactions: z.coerce.number().optional().default(0),
});

// ── Vendor Card ──────────────────────────────────────────────────────────────
function VendorCard({ vendor, bills, onEdit, onDelete, onViewDetail }) {
  const cat = getCat(vendor.category);
  const CatIcon = cat.icon;
  const vendorBills = bills.filter(b => b.vendor === vendor.name);
  const totalTransacted = vendorBills.reduce((a, b) => a + (b.amount || 0), 0);
  const displayTotal = vendor.amount !== undefined && vendor.amount !== 0 ? vendor.amount : totalTransacted;
  const displayTransCount = vendor.totalTransactions !== undefined && vendor.totalTransactions !== 0 ? vendor.totalTransactions : vendorBills.length;

  const initials = vendor.name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase())
    .join('');

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-surface border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group relative overflow-hidden cursor-pointer"
      onClick={() => onViewDetail(vendor)}
    >
      {/* Category colour bar */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5 opacity-60"
        style={{ background: `linear-gradient(90deg, ${cat.color}, transparent)` }}
      />

      {/* Inactive overlay */}
      {!vendor.isActive && (
        <div className="absolute inset-0 bg-surface/60 backdrop-blur-[1px] flex items-center justify-center rounded-2xl z-10">
          <span className="text-[10px] font-bold uppercase tracking-widest text-text3 border border-border rounded-full px-3 py-1 bg-surface">
            Inactive
          </span>
        </div>
      )}

      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-[13px] font-extrabold shrink-0"
            style={{ background: `${cat.color}18`, color: cat.color }}
          >
            {initials}
          </div>
          <div>
            <div className="text-[14px] font-bold text-text leading-tight">{vendor.name}</div>
            <div className={cn('flex items-center gap-1 mt-0.5 text-[10px] font-bold uppercase tracking-wider', cat.text)}>
              <CatIcon size={10} />
              {vendor.category}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-all shrink-0"
          onClick={e => e.stopPropagation()}>
          <button
            onClick={() => onEdit(vendor)}
            className="p-1.5 rounded-lg text-text2 hover:bg-accent-light hover:text-accent transition-colors"
          >
            <Edit2 size={13} />
          </button>
          <button
            onClick={() => onDelete(vendor._id)}
            className="p-1.5 rounded-lg text-text2 hover:bg-red-light hover:text-red transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Rating & Hold Status */}
      <div className="flex items-center justify-between mt-2">
        <StarRating value={vendor.rating} />
        {vendor.inHold && (
          <span className="bg-amber-light text-amber border border-amber/20 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full flex items-center gap-1">
            <Clock size={10} /> In Hold
          </span>
        )}
      </div>

      {/* Stats row */}
      <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-2 gap-3">
        <div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-text3 mb-0.5">Transactions</div>
          <div className="text-[13px] font-bold text-text">{displayTransCount}</div>
        </div>
        <div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-text3 mb-0.5">Total Value</div>
          <div className="text-[13px] font-bold text-green">
            ₹{displayTotal >= 100000
              ? `${(displayTotal / 100000).toFixed(1)}L`
              : displayTotal.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Contact snippet */}
      {vendor.phone && (
        <div className="mt-2 flex items-center gap-1.5 text-[10.5px] text-text3">
          <Phone size={10} /> {vendor.phone}
        </div>
      )}

      {/* View detail arrow */}
      <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all translate-x-1 group-hover:translate-x-0">
        <ChevronRight size={16} className="text-text3" />
      </div>
    </motion.div>
  );
}

// ── Vendor Detail Drawer ─────────────────────────────────────────────────────
function VendorDetailDrawer({ vendor, bills, open, onClose, onEdit, onUpdate }) {
  const cat = getCat(vendor?.category);
  const CatIcon = cat.icon;
  const vendorBills = useMemo(() =>
    (bills || []).filter(b => b.vendor === vendor?.name)
  , [bills, vendor]);

  const totalTransacted = vendorBills.reduce((a, b) => a + (b.amount || 0), 0);
  const pendingAmt = vendorBills.filter(b => b.status === 'Pending').reduce((a, b) => a + (b.amount || 0), 0);

  const [isEditingInline, setIsEditingInline] = useState(false);
  const [inlineAmount, setInlineAmount] = useState(0);
  const [inlineDate, setInlineDate] = useState('');
  const [inlinePaymentTerms, setInlinePaymentTerms] = useState('');
  const [inlinePendingAmount, setInlinePendingAmount] = useState(0);
  const [inlineTotalTransactions, setInlineTotalTransactions] = useState(0);

  useEffect(() => {
    if (vendor) {
      setInlineAmount(vendor.amount || 0);
      setInlineDate(vendor.date || '');
      setInlinePaymentTerms(vendor.paymentTerms || '');
      setInlinePendingAmount(vendor.pendingAmount || 0);
      setInlineTotalTransactions(vendor.totalTransactions || 0);
      setIsEditingInline(false);
    }
  }, [vendor]);

  if (!vendor) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          {/* Drawer */}
          <motion.div
            key="drawer"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-[480px] bg-surface border-l border-border shadow-2xl z-50 flex flex-col"
          >
            {/* Drawer Header */}
            <div className="p-5 border-b border-border flex-shrink-0" style={{ background: `${cat.color}08` }}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-[14px] font-extrabold"
                    style={{ background: `${cat.color}18`, color: cat.color }}
                  >
                    {vendor.name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('')}
                  </div>
                  <div>
                    <div className="text-[16px] font-bold text-text">{vendor.name}</div>
                    <div className={cn('flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider mt-0.5', cat.text)}>
                      <CatIcon size={10} /> {vendor.category}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => { onClose(); onEdit(vendor); }}
                    className="p-2 rounded-lg text-text2 hover:bg-accent-light hover:text-accent transition-colors"
                  >
                    <Edit2 size={15} />
                  </button>
                  <button onClick={onClose} className="p-2 rounded-lg text-text2 hover:bg-surface2 transition-colors">
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Rating + Status */}
              <div className="flex items-center justify-between mt-3">
                <StarRating value={vendor.rating} size={14} />
                <span className={cn(
                  'text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full',
                  vendor.isActive ? 'bg-green-light text-green' : 'bg-surface2 text-text3'
                )}>
                  {vendor.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            {/* Drawer Body — scrollable */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">

              {/* Financial Summary */}
              {(() => {
                const displayTotal = vendor.amount !== undefined && vendor.amount !== 0 ? vendor.amount : totalTransacted;
                const displayPending = vendor.pendingAmount !== undefined && vendor.pendingAmount !== 0 ? vendor.pendingAmount : pendingAmt;
                const displayTransCount = vendor.totalTransactions !== undefined && vendor.totalTransactions !== 0 ? vendor.totalTransactions : vendorBills.length;
                return (
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Total Transacted', value: `₹${displayTotal >= 100000 ? `${(displayTotal / 100000).toFixed(1)}L` : displayTotal.toLocaleString()}`, color: 'text-green' },
                      { label: 'Pending Amount', value: `₹${displayPending.toLocaleString()}`, color: 'text-amber' },
                      { label: 'Transactions', value: displayTransCount, color: 'text-accent' },
                    ].map(s => (
                      <div
                        key={s.label}
                        onClick={() => setIsEditingInline(!isEditingInline)}
                        className="bg-surface2/50 border border-border/50 rounded-xl p-3 text-center cursor-pointer hover:bg-surface2 transition-all"
                      >
                        <div className="text-[9px] font-bold uppercase tracking-widest text-text3 mb-0.5">{s.label}</div>
                        <div className={cn('text-[13px] font-extrabold', s.color)}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Quick Edit collapsible bar */}
              <AnimatePresence>
                {isEditingInline && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden bg-surface2/30 border border-border/50 rounded-xl p-4 space-y-3"
                  >
                    <div className="text-[10px] font-bold uppercase tracking-widest text-text2 flex items-center justify-between">
                      <span>Quick Edit Details</span>
                      <button
                        type="button"
                        onClick={() => setIsEditingInline(false)}
                        className="text-text3 hover:text-text cursor-pointer animate-fade-in"
                      >
                        <X size={12} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-text3">Amount (₹)</label>
                        <Input
                          type="number"
                          value={inlineAmount}
                          onChange={e => setInlineAmount(e.target.value === '' ? '' : Number(e.target.value))}
                          className="bg-surface border-border/60 h-8 px-2 text-xs focus-visible:ring-accent"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-text3">Date</label>
                        <Input
                          type="date"
                          value={inlineDate}
                          onChange={e => setInlineDate(e.target.value)}
                          className="bg-surface border-border/60 h-8 px-2 text-xs focus-visible:ring-accent"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-text3">Pending Amount (₹)</label>
                        <Input
                          type="number"
                          value={inlinePendingAmount}
                          onChange={e => setInlinePendingAmount(e.target.value === '' ? '' : Number(e.target.value))}
                          className="bg-surface border-border/60 h-8 px-2 text-xs focus-visible:ring-accent"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-text3">Total Transactions</label>
                        <Input
                          type="number"
                          value={inlineTotalTransactions}
                          onChange={e => setInlineTotalTransactions(e.target.value === '' ? '' : Number(e.target.value))}
                          className="bg-surface border-border/60 h-8 px-2 text-xs focus-visible:ring-accent"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-text3">Payment Terms</label>
                      <Select value={inlinePaymentTerms} onValueChange={setInlinePaymentTerms}>
                        <SelectTrigger className="bg-surface border-border/60 h-8 text-xs">
                          <SelectValue placeholder="Select terms..." />
                        </SelectTrigger>
                        <SelectContent className="bg-surface border-border">
                          {['Immediate', 'Advance', 'Net 7 days', 'Net 15 days', 'Net 30 days', 'Net 60 days', 'Credit', 'COD'].map(t => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex gap-2 justify-end pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsEditingInline(false);
                          setInlineAmount(vendor.amount || 0);
                          setInlineDate(vendor.date || '');
                          setInlinePaymentTerms(vendor.paymentTerms || '');
                          setInlinePendingAmount(vendor.pendingAmount || 0);
                          setInlineTotalTransactions(vendor.totalTransactions || 0);
                        }}
                        className="h-7 px-3 text-[10px] font-semibold border-border/80 text-text2"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={async () => {
                          try {
                            await onUpdate(vendor._id, {
                              amount: inlineAmount,
                              date: inlineDate,
                              paymentTerms: inlinePaymentTerms,
                              pendingAmount: inlinePendingAmount,
                              totalTransactions: inlineTotalTransactions
                            });
                            setIsEditingInline(false);
                            toast.success('Vendor details updated successfully');
                          } catch (err) {
                            toast.error(err.message || 'Failed to update vendor');
                          }
                        }}
                        className="h-7 px-3 text-[10px] font-semibold bg-accent text-white"
                      >
                        Save
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Contact Details */}
              <div className="space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-widest text-text3">Contact</div>
                <div className="bg-surface2/30 border border-border/50 rounded-xl p-3 space-y-2">
                  {vendor.contactPerson && (
                    <div className="flex items-center gap-2 text-[12px]">
                      <Users size={12} className="text-text3 shrink-0" />
                      <span className="font-semibold text-text">{vendor.contactPerson}</span>
                    </div>
                  )}
                  {vendor.phone && (
                    <a href={`tel:${vendor.phone}`} className="flex items-center gap-2 text-[12px] hover:text-accent transition-colors">
                      <Phone size={12} className="text-text3 shrink-0" />
                      <span className="font-mono text-text">{vendor.phone}</span>
                    </a>
                  )}
                  {vendor.email && (
                    <a href={`mailto:${vendor.email}`} className="flex items-center gap-2 text-[12px] hover:text-accent transition-colors">
                      <Mail size={12} className="text-text3 shrink-0" />
                      <span className="text-text">{vendor.email}</span>
                    </a>
                  )}
                  {vendor.address && (
                    <div className="flex items-start gap-2 text-[12px]">
                      <MapPin size={12} className="text-text3 shrink-0 mt-0.5" />
                      <span className="text-text2">{vendor.address}</span>
                    </div>
                  )}
                  {(!vendor.contactPerson && !vendor.phone && !vendor.email && !vendor.address) && (
                    <span className="text-[11px] text-text3 italic">No contact details added</span>
                  )}
                </div>
              </div>

              {/* Business Details */}
              {(vendor.gstNumber || vendor.paymentTerms || vendor.date || vendor.amount || vendor.inHold) && (
                <div className="space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-text3">Business Details</div>
                  <div className="bg-surface2/30 border border-border/50 rounded-xl p-3 space-y-2">
                    {vendor.gstNumber && (
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="text-text3">GST Number</span>
                        <span className="font-mono font-bold text-text text-[11px] bg-surface px-2 py-0.5 rounded border border-border">{vendor.gstNumber}</span>
                      </div>
                    )}
                    {vendor.paymentTerms && (
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="text-text3">Payment Terms</span>
                        <span className="font-semibold text-accent">{vendor.paymentTerms}</span>
                      </div>
                    )}
                    {vendor.date && (
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="text-text3">Date</span>
                        <span className="font-semibold text-text">{formatDate(vendor.date)}</span>
                      </div>
                    )}
                    {vendor.amount !== undefined && vendor.amount !== null && vendor.amount !== 0 && (
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="text-text3">Amount</span>
                        <span className="font-bold text-text">₹{vendor.amount.toLocaleString()}</span>
                      </div>
                    )}
                    {vendor.inHold && (
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="text-text3">Hold Status</span>
                        <span className="font-extrabold text-amber bg-amber-light px-2 py-0.5 rounded border border-amber/20 text-[10px] uppercase tracking-wider">In Hold</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {vendor.notes && (
                <div className="space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-text3">Notes</div>
                  <p className="text-[12px] text-text2 bg-surface2/30 border border-border/50 rounded-xl p-3 leading-relaxed">
                    {vendor.notes}
                  </p>
                </div>
              )}

              {/* Billing History */}
              <div className="space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-widest text-text3">
                  Billing History ({vendorBills.length})
                </div>
                {vendorBills.length === 0 ? (
                  <div className="text-center py-6 text-text3 text-[11px] bg-surface2/30 border border-dashed border-border rounded-xl">
                    No billing transactions yet
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-0.5">
                    {vendorBills.map(b => (
                      <div key={b._id} className="flex items-center justify-between bg-surface2/30 border border-border/40 rounded-xl px-3 py-2.5">
                        <div className="flex-1 min-w-0">
                          <div className="text-[12.5px] font-semibold text-text truncate">{b.item}</div>
                          <div className="text-[10px] text-text3 font-mono mt-0.5">
                            {b.project} · {formatDate(b.deliveredDate)}
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <div className="text-[13px] font-bold text-text">₹{b.amount.toLocaleString()}</div>
                          <span className={cn(
                            'text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded',
                            b.status === 'Billed' ? 'bg-green-light text-green' :
                            b.status === 'Cancelled' ? 'bg-red-light text-red' : 'bg-amber-light text-amber'
                          )}>
                            {b.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-border flex-shrink-0 bg-surface2/20">
              <div className="text-[9px] text-text3 text-center">
                Vendor since {vendor.createdAt ? formatDate(vendor.createdAt) : '—'}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function VendorRegistry() {
  const { data: vendors, isLoading, create, update, remove, isCreating, isUpdating } = useVendors();
  const { data: bills } = useBilling();
  const { registerAddAction, registerDownloadAction, searchQuery } = useAction();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [detailVendor, setDetailVendor] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [filterCat, setFilterCat] = useState('all');
  const [filterActive, setFilterActive] = useState('all'); // 'all' | 'active' | 'inactive'
  const [ratingValue, setRatingValue] = useState(3);
  const [isCustomCategory, setIsCustomCategory] = useState(false);

  const form = useForm({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      name: '', category: 'Materials', contactPerson: '', phone: '',
      email: '', gstNumber: '', address: '', paymentTerms: '',
      rating: 3, notes: '', isActive: true,
      date: '', amount: 0, inHold: false,
      pendingAmount: 0, totalTransactions: 0,
    },
  });

  // Sync rating state with form
  const watchedRating = form.watch('rating');
  useEffect(() => { setRatingValue(watchedRating || 3); }, [watchedRating]);

  // Filter vendors
  const filteredVendors = useMemo(() => {
    return (vendors || []).filter(v => {
      const q = searchQuery.toLowerCase();
      const matchSearch = !searchQuery ||
        v.name?.toLowerCase().includes(q) ||
        v.category?.toLowerCase().includes(q) ||
        v.contactPerson?.toLowerCase().includes(q);
      const matchCat = filterCat === 'all' || v.category === filterCat;
      const matchActive = filterActive === 'all' ||
        (filterActive === 'active' && v.isActive) ||
        (filterActive === 'inactive' && !v.isActive);
      return matchSearch && matchCat && matchActive;
    });
  }, [vendors, searchQuery, filterCat, filterActive]);

  useEffect(() => {
    const unregisterAdd = registerAddAction(() => {
      setEditingVendor(null);
      setRatingValue(3);
      setIsCustomCategory(false);
      form.reset({
        name: '', category: 'Materials', contactPerson: '', phone: '',
        email: '', gstNumber: '', address: '', paymentTerms: '',
        rating: 3, notes: '', isActive: true,
        date: '', amount: 0, inHold: false,
        pendingAmount: 0, totalTransactions: 0,
      });
      setIsModalOpen(true);
    });

    const unregisterDownload = registerDownloadAction(() => {
      const data = filteredVendors.map(v => ({
        Name: v.name, Category: v.category, ContactPerson: v.contactPerson,
        Phone: v.phone, Email: v.email, GST: v.gstNumber,
        Address: v.address, PaymentTerms: v.paymentTerms,
        Rating: `${v.rating}/5`, Status: v.isActive ? 'Active' : 'Inactive',
        Notes: v.notes,
        Date: v.date || '', Amount: v.amount || 0, HoldStatus: v.inHold ? 'In Hold' : 'Normal',
        PendingAmount: v.pendingAmount || 0, TotalTransactions: v.totalTransactions || 0,
      }));
      downloadCSV(data, 'Vendor_Registry');
    });

    return () => { unregisterAdd(); unregisterDownload(); };
  }, [registerAddAction, registerDownloadAction, filteredVendors, form]);

  const onSubmit = async (values) => {
    try {
      if (editingVendor) {
        await update({ id: editingVendor._id, data: values });
        toast.success('Vendor updated');
      } else {
        await create(values);
        toast.success('Vendor added to registry');
      }
      handleClose();
    } catch (err) {
      toast.error(err.message || 'Failed to save vendor');
    }
  };

  const handleEdit = (vendor) => {
    setEditingVendor(vendor);
    setRatingValue(vendor.rating || 3);
    const isStandard = CATEGORIES.some(c => c.value === vendor.category);
    setIsCustomCategory(!isStandard && vendor.category !== '');
    form.reset({
      name: vendor.name || '', category: vendor.category || 'Materials',
      contactPerson: vendor.contactPerson || '', phone: vendor.phone || '',
      email: vendor.email || '', gstNumber: vendor.gstNumber || '',
      address: vendor.address || '', paymentTerms: vendor.paymentTerms || '',
      rating: vendor.rating || 3, notes: vendor.notes || '',
      isActive: vendor.isActive !== false,
      date: vendor.date || '',
      amount: vendor.amount || 0,
      inHold: !!vendor.inHold,
      pendingAmount: vendor.pendingAmount || 0,
      totalTransactions: vendor.totalTransactions || 0,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Remove this vendor from the registry?')) {
      try {
        await remove(id);
        toast.success('Vendor removed');
      } catch {
        toast.error('Failed to remove vendor');
      }
    }
  };

  const handleViewDetail = (vendor) => {
    setDetailVendor(vendor);
    setIsDrawerOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingVendor(null);
    setIsCustomCategory(false);
    form.reset();
  };

  // Summary stats
  const totalVendors = (vendors || []).length;
  const activeVendors = (vendors || []).filter(v => v.isActive).length;
  const totalValue = (bills || []).reduce((a, b) => a + (b.amount || 0), 0);
  const uniqueVendorNames = new Set((bills || []).map(b => b.vendor)).size;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Vendors',    value: totalVendors,      icon: Store,         color: 'text-accent bg-accent-light' },
          { label: 'Active Vendors',   value: activeVendors,     icon: CheckCircle2,  color: 'text-green bg-green-light' },
          { label: 'Vendors in Bills', value: uniqueVendorNames, icon: FileText,      color: 'text-amber bg-amber-light' },
          { label: 'Total Billed',     value: totalValue / 1000, icon: IndianRupee,   color: 'text-purple bg-purple-light', prefix: '₹', suffix: 'K' },
        ].map(s => (
          <div key={s.label} className="bg-surface border border-border rounded-xl p-4 shadow-sm flex items-center gap-3">
            <div className={cn('p-2.5 rounded-lg shrink-0', s.color)}>
              <s.icon size={18} />
            </div>
            <div>
              <div className="text-[11px] text-text2 font-medium">{s.label}</div>
              <div className="text-xl font-bold text-text">
                <AnimatedCounter value={s.value} decimals={s.suffix === 'K' ? 1 : 0} prefix={s.prefix || ''} suffix={s.suffix || ''} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 flex-wrap items-center">
        {/* Category filter */}
        <button
          onClick={() => setFilterCat('all')}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
            filterCat === 'all' ? 'bg-accent text-white border-accent' : 'bg-surface border-border text-text2 hover:border-border/80'
          )}
        >All Categories</button>
        {CATEGORIES.map(c => {
          const Icon = c.icon;
          return (
            <button
              key={c.value}
              onClick={() => setFilterCat(f => f === c.value ? 'all' : c.value)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                filterCat === c.value ? `${c.bg} ${c.text} border-current/30` : 'bg-surface border-border text-text2 hover:border-border/80'
              )}
            >
              <Icon size={11} />{c.label}
            </button>
          );
        })}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Active filter */}
        <div className="flex gap-1">
          {[
            { val: 'all', label: 'All' },
            { val: 'active', label: 'Active' },
            { val: 'inactive', label: 'Inactive' },
          ].map(f => (
            <button key={f.val}
              onClick={() => setFilterActive(f.val)}
              className={cn(
                'px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all',
                filterActive === f.val ? 'bg-surface2 border-border text-text' : 'bg-surface border-border/50 text-text3 hover:border-border'
              )}
            >{f.label}</button>
          ))}
        </div>
      </div>

      {/* Vendor Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="bg-surface border border-border rounded-2xl p-5 space-y-3">
              <Skeleton className="h-11 w-11 rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      ) : filteredVendors.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-text3 bg-surface border border-dashed border-border/60 rounded-2xl"
        >
          <Store size={40} className="mb-3 opacity-25" />
          <p className="font-semibold text-[13px]">No vendors found</p>
          <p className="text-[11px] opacity-70 mt-1">
            {searchQuery ? `No results for "${searchQuery}"` : 'Click "+ Add Vendor" to register your first supplier.'}
          </p>
        </motion.div>
      ) : (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
          initial="hidden" animate="visible"
        >
          <AnimatePresence>
            {filteredVendors.map(v => (
              <VendorCard
                key={v._id}
                vendor={v}
                bills={bills || []}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onViewDetail={handleViewDetail}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Detail Drawer */}
      <VendorDetailDrawer
        vendor={detailVendor}
        bills={bills || []}
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onEdit={handleEdit}
        onUpdate={async (id, data) => {
          await update({ id, data });
          setDetailVendor(prev => prev && prev._id === id ? { ...prev, ...data } : prev);
        }}
      />

      {/* Add / Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[740px] bg-surface text-text border border-border/80 shadow-2xl rounded-xl overflow-hidden p-0 flex flex-col max-h-[90vh]">
          <div className="p-4 px-5 border-b border-border/60 bg-surface2/25 shrink-0">
            <DialogHeader className="space-y-0.5">
              <DialogTitle className="text-lg font-bold text-text flex items-center gap-2">
                <Store size={18} className="text-accent" />
                {editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
              </DialogTitle>
              <DialogDescription className="text-xs text-text2">
                {editingVendor
                  ? 'Update vendor details and transaction information.'
                  : 'Register a new supplier or subcontractor in the vendor registry.'}
              </DialogDescription>
            </DialogHeader>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 space-y-4">

                {/* Name + Category */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Vendor / Company Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. A1 Steel Traders" {...field} className="bg-surface border-border/60 h-9 px-3 text-xs focus-visible:ring-accent" />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem className="space-y-1">
                      <div className="flex justify-between items-center h-4">
                        <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Category</FormLabel>
                        <button
                          type="button"
                          onClick={() => {
                            setIsCustomCategory(!isCustomCategory);
                            form.setValue('category', !isCustomCategory ? '' : 'Materials');
                          }}
                          className="text-[10px] font-bold text-accent hover:underline cursor-pointer"
                        >
                          {isCustomCategory ? 'Select Preset' : 'Type Custom'}
                        </button>
                      </div>
                      {isCustomCategory ? (
                        <FormControl>
                          <Input placeholder="e.g. Plumbing or Catering" {...field} className="bg-surface border-border/60 h-9 px-3 text-xs focus-visible:ring-accent" />
                        </FormControl>
                      ) : (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-surface border-border/60 h-9 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-surface border-border">
                            {CATEGORIES.map(c => (
                              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </FormItem>
                  )} />
                </div>

                {/* Contact Person + Phone */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="contactPerson" render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Contact Person</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Ramesh Gupta" {...field} className="bg-surface border-border/60 h-9 px-3 text-xs focus-visible:ring-accent" />
                      </FormControl>
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 9876543210" {...field} className="bg-surface border-border/60 h-9 px-3 text-xs focus-visible:ring-accent" />
                      </FormControl>
                    </FormItem>
                  )} />
                </div>

                {/* Email + GST */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="vendor@email.com" {...field} className="bg-surface border-border/60 h-9 px-3 text-xs focus-visible:ring-accent" />
                      </FormControl>
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="gstNumber" render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">GST Number</FormLabel>
                      <FormControl>
                        <Input placeholder="22AAAAA0000A1Z5" {...field} className="bg-surface border-border/60 h-9 px-3 text-xs font-mono focus-visible:ring-accent" />
                      </FormControl>
                    </FormItem>
                  )} />
                </div>

                {/* Address */}
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Shop address or city" {...field} className="bg-surface border-border/60 h-9 px-3 text-xs focus-visible:ring-accent" />
                    </FormControl>
                  </FormItem>
                )} />

                {/* Payment Terms + Active Status */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="paymentTerms" render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Payment Terms</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-surface border-border/60 h-9 text-xs">
                            <SelectValue placeholder="Select terms..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-surface border-border">
                          {['Immediate', 'Advance', 'Net 7 days', 'Net 15 days', 'Net 30 days', 'Net 60 days', 'Credit', 'COD'].map(t => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="isActive" render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Status</FormLabel>
                      <div className="flex gap-2 pt-0.5">
                        {[{ val: true, label: 'Active' }, { val: false, label: 'Inactive' }].map(opt => (
                          <button
                            key={String(opt.val)}
                            type="button"
                            onClick={() => field.onChange(opt.val)}
                            className={cn(
                              'flex-1 h-9 rounded-md border text-xs font-semibold transition-all',
                              field.value === opt.val
                                ? opt.val ? 'bg-green-light text-green border-green/30' : 'bg-red-light text-red border-red/30'
                                : 'bg-surface border-border text-text2'
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </FormItem>
                  )} />
                </div>

                {/* Date + Amount */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="date" render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} className="bg-surface border-border/60 h-9 px-3 text-xs focus-visible:ring-accent" />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="amount" render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Amount (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g. 150000" {...field} className="bg-surface border-border/60 h-9 px-3 text-xs focus-visible:ring-accent" />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )} />
                </div>

                {/* Pending Amount + Total Transactions */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="pendingAmount" render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Pending Amount (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g. 5000" {...field} className="bg-surface border-border/60 h-9 px-3 text-xs focus-visible:ring-accent" />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="totalTransactions" render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Total Transactions</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g. 10" {...field} className="bg-surface border-border/60 h-9 px-3 text-xs focus-visible:ring-accent" />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )} />
                </div>

                {/* In Hold + Rating */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="inHold" render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Hold Status</FormLabel>
                      <div className="flex gap-2 pt-0.5">
                        {[{ val: false, label: 'Normal' }, { val: true, label: 'On Hold' }].map(opt => (
                          <button
                            key={String(opt.val)}
                            type="button"
                            onClick={() => field.onChange(opt.val)}
                            className={cn(
                              'flex-1 h-9 rounded-md border text-xs font-semibold transition-all',
                              field.value === opt.val
                                ? opt.val ? 'bg-amber-light text-amber border-amber/30' : 'bg-green-light text-green border-green/30'
                                : 'bg-surface border-border text-text2'
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="rating" render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Vendor Rating</FormLabel>
                      <div className="flex items-center gap-3 h-9 pt-1.5">
                        <StarRating
                          value={ratingValue}
                          size={20}
                          onChange={(n) => {
                            setRatingValue(n);
                            field.onChange(n);
                          }}
                        />
                        <span className="text-[10px] text-text3 font-semibold">
                          {['', 'Poor', 'Below Avg', 'Average', 'Good', 'Excellent'][ratingValue]}
                        </span>
                      </div>
                    </FormItem>
                  )} />
                </div>

                {/* Notes */}
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Notes</FormLabel>
                    <FormControl>
                      <textarea
                        {...field}
                        rows={2}
                        placeholder="Any additional notes about this vendor..."
                        className="w-full bg-surface border border-border/60 rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-accent resize-none text-text placeholder:text-text3"
                      />
                    </FormControl>
                  </FormItem>
                )} />

              </div>

              <DialogFooter className="p-4 border-t border-border/60 bg-surface2/25 gap-2 sm:gap-0 shrink-0">
                <Button variant="outline" type="button" onClick={handleClose}
                  className="h-9 px-4 border-border/80 text-text2 hover:text-text hover:bg-surface2/30 text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating || isUpdating}
                  className="h-9 px-4 bg-accent hover:bg-accent/90 text-white font-semibold transition-all text-xs">
                  {(isCreating || isUpdating) && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  {editingVendor ? 'Save Changes' : 'Add Vendor'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
