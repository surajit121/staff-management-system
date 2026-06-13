import React, { useState, useEffect } from 'react';
import { FileText, AlertCircle, TrendingDown, Edit2, Trash2, Loader2, Plus, Receipt, Paperclip, X, Eye, FilePlus, MapPin, User, Wallet, BarChart3, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBilling, useProjects } from '../hooks/useResource';
import { cn, formatDate } from '../lib/utils';
import { Skeleton } from '../components/ui/skeleton';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { useAction } from '../context/ActionContext';
import { downloadCSV } from '../lib/export';

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
import { Combobox } from "../components/ui/combobox";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";

const billingSchema = z.object({
  project: z.string().min(1, "Project reference required"),
  vendor: z.string().min(2, "Vendor name is required"),
  deliveredDate: z.string().min(1, "Date is required"),
  status: z.enum(['Pending', 'Billed', 'Cancelled']).default('Pending'),
  attachments: z.array(z.object({
    filename: z.string(),
    originalName: z.string(),
    url: z.string(),
    mimetype: z.string(),
    uploadedAt: z.string().optional(),
  })).optional().default([]),
  items: z.array(z.object({
    item: z.string().min(2, "Item name is required"),
    quality: z.string().optional().default(''),
    qty: z.coerce.number().min(0).optional().default(0),
    rate: z.coerce.number().min(0).optional().default(0),
    amount: z.coerce.number().min(0.01, "Valid total amount is required"),
  })).min(1, "At least one item is required"),
});

export default function PendingBilling() {
  const { data: bills, isLoading, create, update, remove, isCreating, isUpdating, bulkCreate } = useBilling();
  const { data: projects } = useProjects();
  const { registerAddAction, registerDownloadAction, searchQuery } = useAction();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  const filteredBills = (bills || []).filter(b => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      b.item?.toLowerCase().includes(q) ||
      b.vendor?.toLowerCase().includes(q) ||
      b.project?.toLowerCase().includes(q) ||
      b.status?.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    const unregisterAdd = registerAddAction(() => setIsModalOpen(true));
    const unregisterDownload = registerDownloadAction(() => {
      const exportData = filteredBills.map(b => ({
        Item: b.item,
        Vendor: b.vendor,
        Project: b.project,
        Quantity: b.qty,
        Rate: b.rate,
        Amount: b.amount,
        DeliveredDate: b.deliveredDate,
        Status: b.status
      }));
      downloadCSV(exportData, 'Pending_Billing');
    });
    return () => {
      unregisterAdd();
      unregisterDownload();
    };
  }, [registerAddAction, registerDownloadAction, filteredBills]);

  const form = useForm({
    resolver: zodResolver(billingSchema),
    defaultValues: {
      project: '',
      vendor: '',
      deliveredDate: new Date().toISOString().split('T')[0],
      status: 'Pending',
      attachments: [],
      items: [{ item: '', quality: '', qty: 0, rate: 0, amount: 0 }],
    },
  });

  const { fields, append, remove: removeField } = useFieldArray({
    control: form.control,
    name: "items"
  });

  // Track selected project for the info card (must be after useForm)
  const watchedProject = form.watch('project');
  const selectedProjectData = (projects || []).find(p => p.code === watchedProject) || null;

  // Auto-calculate amount when qty or rate are set in the items array
  const watchedItems = form.watch('items');
  useEffect(() => {
    if (!watchedItems) return;
    watchedItems.forEach((item, index) => {
      const q = Number(item?.qty) || 0;
      const r = Number(item?.rate) || 0;
      const expectedAmount = q * r;
      if (item?.amount !== expectedAmount) {
        form.setValue(`items.${index}.amount`, expectedAmount, { shouldValidate: true });
      }
    });
  }, [watchedItems, form]);

  const onSubmit = async (values) => {
    try {
      if (editingRecord) {
        const singleItem = values.items[0] || {};
        const payload = {
          project: values.project,
          vendor: values.vendor,
          deliveredDate: values.deliveredDate,
          status: values.status,
          attachments: values.attachments,
          item: singleItem.item,
          quality: singleItem.quality || '',
          qty: singleItem.qty || 0,
          rate: singleItem.rate || 0,
          amount: singleItem.amount || 0,
        };
        await update({ id: editingRecord._id, data: payload });
        toast.success("Billing record updated");
      } else {
        const payloads = values.items.map(item => ({
          project: values.project,
          vendor: values.vendor,
          deliveredDate: values.deliveredDate,
          status: values.status,
          attachments: values.attachments,
          item: item.item,
          quality: item.quality || '',
          qty: item.qty || 0,
          rate: item.rate || 0,
          amount: item.amount || 0,
        }));
        await bulkCreate(payloads);
        toast.success("Billing items logged");
      }
      handleClose();
    } catch (error) {
      toast.error(error.message || "Failed to save record");
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    form.reset({
      project: record.project,
      vendor: record.vendor,
      deliveredDate: record.deliveredDate,
      status: record.status,
      attachments: record.attachments || [],
      items: [{
        item: record.item,
        quality: record.quality || '',
        qty: record.qty,
        rate: record.rate,
        amount: record.amount,
      }],
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this billing log?")) {
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

  const outstandingAmt = bills.filter(b => b.status === 'Pending').reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { label: 'Outstanding Amt', value: `₹${outstandingAmt.toLocaleString()}`, icon: TrendingDown, color: 'text-red bg-red-light' },
          { label: 'Unbilled Items', value: bills.filter(b => b.status === 'Pending').length, icon: AlertCircle, color: 'text-amber bg-amber-light' },
        ].map(stat => (
          <div key={stat.label} className="bg-surface border border-border rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className={cn("p-3 rounded-lg", stat.color)}>
              <stat.icon size={20} />
            </div>
            <div>
              <div className="text-[12px] text-text2 font-medium">{stat.label}</div>
              <div className="text-xl font-bold">{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

       <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-surface2/50 border-b border-border">
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-text3">Item & Vendor</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-text3">Billing Project</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-text3">Financials</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-text3">Docs</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-text3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="border-b border-border"><td colSpan={4} className="p-4"><Skeleton className="h-12 w-full" /></td></tr>
                  ))
                ) : filteredBills.map((b, idx) => (
                  <motion.tr 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    key={b._id} 
                    className="border-b border-border last:border-0 hover:bg-surface2/30 transition-all group"
                  >
                    <td className="px-6 py-4">
                      <div className="text-[14px] font-bold text-text mb-0.5">
                        {b.item} {b.quality && <span className="text-[11px] font-normal text-text2 ml-1.5">({b.quality})</span>}
                      </div>
                      <div className="text-[11px] font-bold text-text3 uppercase tracking-widest">Supplier: {b.vendor}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[13px] font-bold text-accent uppercase tracking-widest mb-1">{b.project}</div>
                      <div className="text-[11px] text-text3 font-mono uppercase tracking-tighter">Delivered {formatDate(b.deliveredDate)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[14.5px] font-bold text-text">₹{b.amount.toLocaleString()}</div>
                      <span className={cn(
                          "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest",
                          b.status === 'Billed' ? "bg-green-light text-green" :
                          b.status === 'Cancelled' ? "bg-red-light text-red" : "bg-amber-light text-amber"
                      )}>{b.status}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(b.attachments || []).map((att, i) => (
                          <a 
                            key={i} 
                            href={att.url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="p-1.5 rounded bg-surface2 text-text2 hover:text-accent hover:bg-accent-light transition-all"
                            title={att.originalName}
                          >
                            <Paperclip size={14} />
                          </a>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-1 justify-end row-actions">
                        <button onClick={() => handleEdit(b)} className="p-2 rounded-lg text-text2 hover:bg-accent-light hover:text-accent">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(b._id)} className="p-2 rounded-lg text-text2 hover:bg-red-light hover:text-red">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

       <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[800px] bg-surface text-text border border-border/80 shadow-2xl rounded-xl overflow-hidden p-0 flex flex-col max-h-[90vh]">
          <div className="p-4 px-5 border-b border-border/60 bg-surface2/25">
            <DialogHeader className="space-y-0.5">
              <DialogTitle className="text-lg font-bold tracking-tight text-text">
                {editingRecord ? 'Update Billing Log' : 'New Billing Entry'}
              </DialogTitle>
              <DialogDescription className="text-xs text-text2">
                {editingRecord ? 'Modify the billing record for the selected project and item.' : 'Record a new billing transaction with project, vendor, and amount details.'}
              </DialogDescription>
            </DialogHeader>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="project" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Billing Project</FormLabel>
                    <FormControl>
                      <Combobox
                        options={(projects || []).map(p => ({ value: p.code, label: `${p.code} - ${p.name}` }))}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Project Code or Custom Name"
                        className="bg-surface border-border/60"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="vendor" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Vendor / Supplier</FormLabel>
                    <FormControl>
                      <Input placeholder="A1 Steel Co." {...field} className="bg-surface border-border/60 h-9 px-3 text-xs focus-visible:ring-accent" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* ── PROJECT MASTER INFO CARD ── */}
              <AnimatePresence>
                {selectedProjectData && (
                  <motion.div
                    key="project-info-card"
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 4 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="rounded-xl border border-accent/20 bg-accent/5 p-3 space-y-2.5">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-accent/15 flex items-center justify-center">
                            <Package size={12} className="text-accent" />
                          </div>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-accent">Project Master Data</span>
                        </div>
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest",
                          selectedProjectData.status === 'Active' ? 'bg-green-light text-green' :
                          selectedProjectData.status === 'Completed' ? 'bg-accent/10 text-accent' :
                          'bg-amber-light text-amber'
                        )}>{selectedProjectData.status}</span>
                      </div>

                      {/* Project Name */}
                      <div className="text-[13px] font-bold text-text">{selectedProjectData.name}</div>

                      {/* Meta row: manager & location */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-1.5">
                          <User size={11} className="text-text3 shrink-0" />
                          <span className="text-[11px] text-text2 truncate">{selectedProjectData.manager}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin size={11} className="text-text3 shrink-0" />
                          <span className="text-[11px] text-text2 truncate">{selectedProjectData.location}</span>
                        </div>
                      </div>

                      {/* Financials row */}
                      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-accent/10">
                        <div className="space-y-0.5">
                          <div className="text-[9px] font-bold uppercase tracking-widest text-text3">Budget</div>
                          <div className="text-[12px] font-bold text-green">₹{(selectedProjectData.budget || 0).toLocaleString()}</div>
                        </div>
                        <div className="space-y-0.5">
                          <div className="text-[9px] font-bold uppercase tracking-widest text-text3">Total Exp.</div>
                          <div className="text-[12px] font-bold text-red">₹{(selectedProjectData.expense || 0).toLocaleString()}</div>
                        </div>
                        <div className="space-y-0.5">
                          <div className="text-[9px] font-bold uppercase tracking-widest text-text3">Extra Items</div>
                          <div className="text-[12px] font-bold text-amber">
                            ₹{((selectedProjectData.expensiveDetails || []).reduce((a, d) => a + (d.amount || 0), 0)).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {/* Expense Items list */}
                      {(selectedProjectData.expensiveDetails || []).length > 0 && (
                        <div className="pt-1 border-t border-accent/10 space-y-1">
                          <div className="text-[9px] font-bold uppercase tracking-widest text-text3 flex items-center gap-1">
                            <BarChart3 size={9} /> Expense Items
                          </div>
                          <div className="space-y-1 max-h-[100px] overflow-y-auto pr-0.5">
                            {(selectedProjectData.expensiveDetails || []).map((d, i) => (
                              <div key={i} className="flex items-center justify-between text-[10px] py-0.5 border-b border-border/30 last:border-0">
                                <span className="text-text2 font-medium truncate max-w-[55%]">{d.item || '—'}</span>
                                <div className="flex items-center gap-2 text-text3 shrink-0">
                                  <span>x{d.quantity || 0}</span>
                                  <span className="font-bold text-text">₹{(d.amount || 0).toLocaleString()}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="deliveredDate" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Delivery Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} className="bg-surface border-border/60 h-9 px-3 text-xs focus-visible:ring-accent" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Log Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-surface border-border/60 h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-surface border-border">
                        {['Pending', 'Billed', 'Cancelled'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Items Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-border/60 pb-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text2">Items List</h3>
                  {!editingRecord && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => append({ item: '', quality: '', qty: 0, rate: 0, amount: 0 })}
                      className="h-7 px-2.5 text-[11px] font-bold text-accent hover:text-accent hover:bg-accent/10 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={12} /> Add Item
                    </Button>
                  )}
                </div>

                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                  {/* Desktop Headers (Hidden on Mobile) */}
                  <div className="hidden md:grid grid-cols-[4fr_2.5fr_1.2fr_1.8fr_2fr_0.8fr] gap-2.5 px-1 pb-1 border-b border-border/50 text-[9px] font-bold uppercase tracking-wider text-text3">
                    <div>Item Name</div>
                    <div>Quality / Grade</div>
                    <div className="text-center">Qty</div>
                    <div className="text-center">Rate (₹)</div>
                    <div className="text-center">Total (₹)</div>
                    <div></div>
                  </div>

                  {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-12 md:grid-cols-[4fr_2.5fr_1.2fr_1.8fr_2fr_0.8fr] gap-2.5 items-end md:items-center group border-b border-border/40 pb-3 last:border-0 last:pb-0 md:border-0 md:pb-0">
                      
                      <div className="col-span-12 md:col-span-1">
                        <FormField
                          control={form.control}
                          name={`items.${index}.item`}
                          render={({ field }) => (
                            <FormItem className="space-y-1">
                              <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2 md:hidden">Item Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Concrete / Steel" {...field} className="bg-surface border-border/60 h-9 px-2.5 text-xs focus-visible:ring-accent" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="col-span-12 md:col-span-1" >
                        <FormField
                          control={form.control}
                          name={`items.${index}.quality`}
                          render={({ field }) => (
                            <FormItem className="space-y-1">
                              <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2 md:hidden">Quality / Grade</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. Premium" {...field} className="bg-surface border-border/60 h-9 px-2.5 text-xs focus-visible:ring-accent" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="col-span-4 md:col-span-1">
                        <FormField
                          control={form.control}
                          name={`items.${index}.qty`}
                          render={({ field }) => (
                            <FormItem className="space-y-1">
                              <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2 md:hidden">Qty</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} className="bg-surface border-border/60 h-9 px-1 text-xs text-center focus-visible:ring-accent no-spinner" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="col-span-4 md:col-span-1">
                        <FormField
                          control={form.control}
                          name={`items.${index}.rate`}
                          render={({ field }) => (
                            <FormItem className="space-y-1">
                              <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2 md:hidden">Rate</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} className="bg-surface border-border/60 h-9 px-1 text-xs text-center focus-visible:ring-accent no-spinner" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="col-span-4 md:col-span-1">
                        <FormField
                          control={form.control}
                          name={`items.${index}.amount`}
                          render={({ field }) => (
                            <FormItem className="space-y-1">
                              <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2 md:hidden">Total (₹)</FormLabel>
                              <FormControl>
                                <Input type="number" readOnly {...field} className="bg-surface2 h-9 px-1 text-xs cursor-not-allowed text-center border-border/60 no-spinner opacity-80" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="col-span-12 md:col-span-1 pb-0.5 flex justify-end md:justify-center">
                        {!editingRecord && fields.length > 1 ? (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => removeField(index)}
                            className="h-9 w-9 p-0 text-red hover:bg-red-light shrink-0 cursor-pointer rounded-lg border border-border/60 hover:border-red/40"
                            title="Remove Item"
                          >
                            <Trash2 size={14} />
                          </Button>
                        ) : (
                          <div className="h-9 w-9 md:block hidden" />
                        )}
                      </div>

                    </div>
                  ))}
                </div>
              </div>
              </div>

              <div className="px-5 py-3 border-t border-border/60 bg-surface2/25 shrink-0">
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="outline" type="button" onClick={handleClose} className="h-9 px-4 border-border/80 text-text2 hover:text-text hover:bg-surface2/30 text-xs">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isCreating || isUpdating} className="h-9 px-4 bg-accent hover:bg-accent/90 text-white font-semibold transition-all duration-200 text-xs">
                    {(isCreating || isUpdating) && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                    {editingRecord ? 'Save Changes' : 'Confirm Entry'}
                  </Button>
                </DialogFooter>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
