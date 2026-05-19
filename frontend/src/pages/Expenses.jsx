import React, { useState, useEffect, useRef } from 'react';
import { Wallet, TrendingUp, AlertTriangle, Edit2, Trash2, Loader2, Plus, Receipt, Clock, ArrowRight, Download, Paperclip, X, FileText, Image } from 'lucide-react';
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

const expenseSchema = z.object({
  staffId: z.string().min(1, "Staff selection is required"),
  date: z.string().min(1, "Date is required"),
  amount: z.coerce.number().min(1, "Valid amount is required"),
  purpose: z.string().min(3, "Purpose is required"),
  category: z.enum(['Travel', 'Entertainment', 'Supplies', 'Maintenance', 'Food', 'Other']),
  receipt: z.boolean().default(false),
  status: z.enum(['Pending', 'Approved', 'Rejected']).default('Pending'),
});

export default function Expenses() {
  const { data: expenses, isLoading, create, update, remove, isCreating, isUpdating } = useExpenses();
  const { staffList } = useStaff();
  const { registerAddAction, registerDownloadAction, searchQuery, dateFilter } = useAction();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);   // { file, previewUrl }
  const [isUploading, setIsUploading] = useState(false);
  const [savedAttachment, setSavedAttachment] = useState(null); // uploaded attachment object
  const fileInputRef = useRef(null);

  const filteredExpenses = expenses.filter(e => {
    const q = searchQuery.toLowerCase();
    const staffName = e.staffId?.name || '';
    const purpose = e.purpose || '';
    const category = e.category || '';
    
    return !q || (
      staffName.toLowerCase().includes(q) ||
      purpose.toLowerCase().includes(q) ||
      category.toLowerCase().includes(q)
    );
  });

  const handleDownloadCSV = React.useCallback(() => {
    const exportData = expenses.map(e => ({
      StaffName: e.staffId?.name || 'Unknown',
      Date: formatDate(e.date, { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-'),
      Amount: e.amount,
      Category: e.category,
      Purpose: e.purpose,
      Status: e.status
    }));
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
      staffId: '',
      date: dateFilter,
      amount: 0,
      purpose: '',
      category: 'Other',
      receipt: false,
      status: 'Pending',
    },
  });

  const onSubmit = async (values) => {
    try {
      const payload = {
        ...values,
        attachments: savedAttachment
          ? [...(editingRecord?.attachments || []), savedAttachment]
          : editingRecord?.attachments || []
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
    setSavedAttachment(null);
    setPendingFile(null);
    form.reset({
      staffId: record.staffId?._id || record.staffId,
      date: record.date,
      amount: record.amount,
      purpose: record.purpose,
      category: record.category,
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
    setPendingFile(null);
    setSavedAttachment(null);
    form.reset();
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setPendingFile({ file, previewUrl });
  };

  const handleUpload = async () => {
    if (!pendingFile) return;
    try {
      setIsUploading(true);
      const result = await uploadService.upload(pendingFile.file);
      setSavedAttachment(result);
      setPendingFile(null);
      toast.success('Receipt uploaded!');
    } catch (err) {
      toast.error('Upload failed. Try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAttachment = async () => {
    if (savedAttachment) {
      try { await uploadService.delete(savedAttachment.filename); } catch {}
    }
    setSavedAttachment(null);
    setPendingFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const totalAmount = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const pendingAmount = filteredExpenses.filter(e => e.status === 'Pending').reduce((acc, curr) => acc + curr.amount, 0);

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
                ) : filteredExpenses.map((e, idx) => (
                  <motion.tr 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    key={e._id} 
                    className="border-b border-border last:border-0 hover:bg-surface2/30 transition-all group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center text-[10px] font-bold">
                          {e.staffId?.initials || '??'}
                        </div>
                        <div>
                          <div className="text-[14px] font-medium text-text">{e.staffId?.name || 'Unknown'}</div>
                          <div className="text-[11px] text-accent font-bold uppercase tracking-wide">{e.category}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[13.5px] font-medium text-text">{e.purpose}</div>
                      <div className="text-[11.5px] text-text3 font-mono">{formatDate(e.date)}</div>
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
                        {/* Attachment icon — always visible if has attachments */}
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
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-surface text-text">
          <DialogHeader>
            <DialogTitle className="font-bold">{editingRecord ? 'Edit Expense' : 'Log Expense'}</DialogTitle>
            <DialogDescription className="text-xs text-text3">
              {editingRecord ? 'Update the details of this expense record.' : 'Enter the details for a new expense request.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField control={form.control} name="staffId" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase tracking-wider text-text2">Staff member</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger className="bg-surface2"><SelectValue placeholder="Choose a member" /></SelectTrigger></FormControl>
                    <SelectContent className="bg-surface border-border">
                      {staffList.map(s => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-text2">Date</FormLabel>
                    <FormControl><Input type="date" {...field} className="bg-surface2" /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-text2">Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger className="bg-surface2"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent className="bg-surface border-border">
                        {['Travel', 'Entertainment', 'Supplies', 'Maintenance', 'Food', 'Other'].map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase tracking-wider text-text2">Amount (₹)</FormLabel>
                  <FormControl><Input type="number" {...field} className="bg-surface2" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="purpose" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase tracking-wider text-text2">Purpose / Description</FormLabel>
                  <FormControl><Input {...field} className="bg-surface2" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
               <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-text2">Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger className="bg-surface2"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent className="bg-surface border-border">
                        {['Pending', 'Approved', 'Rejected'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
              <div className="pt-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-text2 mb-2">Attach Receipt / Invoice</p>
                
                {/* Show existing attachments for edits */}
                {editingRecord?.attachments?.length > 0 && !savedAttachment && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {editingRecord.attachments.map((att, i) => (
                      <a key={i} href={att.url} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 px-2 py-1 bg-accent/10 text-accent text-[11px] rounded-lg hover:bg-accent/20 transition-colors"
                      >
                        <Paperclip size={11} /> {att.originalName}
                      </a>
                    ))}
                  </div>
                )}

                {savedAttachment ? (
                  <div className="flex items-center gap-2 p-2 bg-green/10 border border-green/20 rounded-lg">
                    <div className="p-1 bg-green/20 rounded text-green"><Paperclip size={14} /></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-medium text-text truncate">{savedAttachment.originalName}</div>
                      <div className="text-[10px] text-green">Uploaded ✓</div>
                    </div>
                    <button type="button" onClick={handleRemoveAttachment} className="p-1 text-red hover:bg-red-light rounded">
                      <X size={13} />
                    </button>
                  </div>
                ) : pendingFile ? (
                  <div className="flex items-center gap-2 p-2 bg-surface2 border border-border rounded-lg">
                    <div className="p-1 bg-accent/20 rounded text-accent">
                      {pendingFile.file.type.startsWith('image') ? <Image size={14} /> : <FileText size={14} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-medium text-text truncate">{pendingFile.file.name}</div>
                      <div className="text-[10px] text-text3">{(pendingFile.file.size / 1024).toFixed(0)} KB</div>
                    </div>
                    <Button type="button" size="sm" className="h-7 text-[11px] bg-accent text-white" onClick={handleUpload} disabled={isUploading}>
                      {isUploading ? <Loader2 size={12} className="animate-spin" /> : 'Upload'}
                    </Button>
                    <button type="button" onClick={() => setPendingFile(null)} className="p-1 text-red hover:bg-red-light rounded">
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-border rounded-xl text-text3 hover:border-accent hover:text-accent transition-colors text-[12px] font-medium"
                  >
                    <Paperclip size={15} /> Click to attach receipt or invoice
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              <DialogFooter className="pt-4">
                <Button variant="outline" type="button" onClick={handleClose}>Cancel</Button>
                <Button type="submit" disabled={isCreating || isUpdating || isUploading} className="bg-accent text-white">
                  {(isCreating || isUpdating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingRecord ? 'Save Changes' : 'Submit Expense'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

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
                  <th className="px-4 py-3 font-bold uppercase text-text3 whitespace-nowrap">Purpose</th>
                  <th className="px-4 py-3 font-bold uppercase text-text3 whitespace-nowrap">Amount</th>
                  <th className="px-4 py-3 font-bold uppercase text-text3 whitespace-nowrap text-right">Date</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr><td colSpan={4} className="p-8 text-center text-text3">No expenses found.</td></tr>
                ) : expenses.map(e => (
                  <tr key={e._id} className="border-b border-border/50 hover:bg-surface2/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-text">{e.staffId?.name || 'Unknown'}</div>
                      <div className="text-[10px] text-accent font-bold uppercase">{e.category}</div>
                    </td>
                    <td className="px-4 py-3 text-text2">
                       <div className="text-text font-medium">{e.purpose}</div>
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
                ))}
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
