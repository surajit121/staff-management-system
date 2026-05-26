import React, { useState, useEffect } from 'react';
import { FileText, AlertCircle, TrendingDown, Edit2, Trash2, Loader2, Plus, Receipt, Paperclip, X, Eye, FilePlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBilling, useProjects } from '../hooks/useResource';
import { cn, formatDate } from '../lib/utils';
import { Skeleton } from '../components/ui/skeleton';
import { useForm } from 'react-hook-form';
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
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";

const billingSchema = z.object({
  project: z.string().min(1, "Project reference required"),
  item: z.string().min(2, "Item name is required"),
  vendor: z.string().min(2, "Vendor name is required"),
  qty: z.coerce.number().min(1, "Valid quantity required"),
  rate: z.coerce.number().min(0.01, "Valid rate required"),
  amount: z.coerce.number().min(0.01, "Valid amount required"),
  deliveredDate: z.string().min(1, "Date is required"),
  status: z.enum(['Pending', 'Billed', 'Cancelled']).default('Pending'),
  attachments: z.array(z.object({
    filename: z.string(),
    originalName: z.string(),
    url: z.string(),
    mimetype: z.string(),
    uploadedAt: z.string().optional(),
  })).optional().default([]),
});

export default function PendingBilling() {
  const { data: bills, isLoading, create, update, remove, isCreating, isUpdating } = useBilling();
  const { data: projects } = useProjects();
  const { registerAddAction, registerDownloadAction, searchQuery } = useAction();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef(null);

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
      item: '',
      vendor: '',
      qty: 0,
      rate: 0,
      amount: 0,
      deliveredDate: new Date().toISOString().split('T')[0],
      status: 'Pending',
      attachments: [],
    },
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    try {
      const response = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Upload failed');
      const data = await response.json();
      
      const currentAttachments = form.getValues('attachments') || [];
      form.setValue('attachments', [...currentAttachments, data]);
      toast.success("File attached successfully");
    } catch (error) {
      toast.error("Failed to upload file");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (filename) => {
    const currentAttachments = form.getValues('attachments') || [];
    form.setValue('attachments', currentAttachments.filter(a => a.filename !== filename));
  };

  // Auto-calculate amount when qty or rate changes
  const qty = form.watch('qty');
  const rate = form.watch('rate');
  useEffect(() => {
    form.setValue('amount', (qty || 0) * (rate || 0));
  }, [qty, rate, form]);

  const onSubmit = async (values) => {
    try {
      if (editingRecord) {
        await update({ id: editingRecord._id, data: values });
        toast.success("Billing record updated");
      } else {
        await create(values);
        toast.success("Billing item logged");
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
      item: record.item,
      vendor: record.vendor,
      qty: record.qty,
      rate: record.rate,
      amount: record.amount,
      deliveredDate: record.deliveredDate,
      status: record.status,
      attachments: record.attachments || [],
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
                      <div className="text-[14px] font-bold text-text mb-0.5">{b.item}</div>
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
        <DialogContent className="sm:max-w-[620px] bg-surface text-text border border-border/80 shadow-2xl rounded-xl overflow-hidden p-0">
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="project" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Billing Project</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-surface border-border/60 h-9 text-xs">
                          <SelectValue placeholder="Project Code" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-surface border-border">
                        {projects.map(p => <SelectItem key={p._id} value={p.code}>{p.code} - {p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="item" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Item Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Concrete / Steel" {...field} className="bg-surface border-border/60 h-9 px-3 text-xs focus-visible:ring-accent" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="vendor" render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Vendor / Supplier</FormLabel>
                  <FormControl>
                    <Input placeholder="A1 Steel Co." {...field} className="bg-surface border-border/60 h-9 px-3 text-xs focus-visible:ring-accent" />
                  </FormControl>
                </FormItem>
              )} />
              <div className="grid grid-cols-3 gap-3">
                <FormField control={form.control} name="qty" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Qty</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} className="bg-surface border-border/60 h-9 px-3 text-xs focus-visible:ring-accent" />
                    </FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="rate" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Rate</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} className="bg-surface border-border/60 h-9 px-3 text-xs focus-visible:ring-accent" />
                    </FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="amount" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Total</FormLabel>
                    <FormControl>
                      <Input type="number" disabled {...field} className="bg-surface2 border-border/60 h-9 px-3 text-xs cursor-not-allowed opacity-70" />
                    </FormControl>
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="deliveredDate" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Delivery Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} className="bg-surface border-border/60 h-9 px-3 text-xs focus-visible:ring-accent" />
                    </FormControl>
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
                  </FormItem>
                )} />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-text2 flex items-center justify-between">
                  Attachments
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-2 text-[9px] text-accent hover:bg-accent-light/10"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? <Loader2 size={10} className="animate-spin mr-1" /> : <FilePlus size={10} className="mr-1" />}
                    Add File
                  </Button>
                </label>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleFileUpload}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
                />
                
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
                  {(form.watch('attachments') || []).map((file) => (
                    <div key={file.filename} className="flex items-center justify-between p-2 rounded-lg bg-surface2 border border-border group">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Paperclip size={14} className="text-text3 shrink-0" />
                        <span className="text-[11px] font-medium truncate text-text2">{file.originalName}</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a href={file.url} target="_blank" rel="noreferrer" className="p-1 hover:text-accent">
                          <Eye size={12} />
                        </a>
                        <button type="button" onClick={() => removeAttachment(file.filename)} className="p-1 hover:text-red">
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {(!form.watch('attachments') || form.watch('attachments').length === 0) && (
                    <div className="text-center py-3 border border-dashed border-border/80 rounded-lg text-text3 text-[10px]">
                      No documents attached
                    </div>
                  )}
                </div>
              </div>
              
              <DialogFooter className="pt-3 border-t border-border/60 gap-2 sm:gap-0">
                <Button variant="outline" type="button" onClick={handleClose} className="h-9 px-4 border-border/80 text-text2 hover:text-text hover:bg-surface2/30 text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating || isUpdating} className="h-9 px-4 bg-accent hover:bg-accent/90 text-white font-semibold transition-all duration-200 text-xs">
                  {(isCreating || isUpdating) && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  {editingRecord ? 'Save Changes' : 'Confirm Entry'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
