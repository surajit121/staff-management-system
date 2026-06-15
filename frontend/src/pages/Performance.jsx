import React, { useState, useEffect } from 'react';
import { Activity, Star, MessageSquare, Edit2, Trash2, Loader2, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePerformance, useStaff } from '../hooks/useResource';
import { cn } from '../lib/utils';
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

const performanceSchema = z.object({
  staffId: z.string().min(1, "Staff selection is required"),
  period: z.enum(['Daily', 'Weekly', 'Monthly', 'Quarterly']),
  date: z.string().min(1, "Date is required"),
  rating: z.coerce.number().min(1).max(5),
  kpi: z.string().min(2, "KPI description/target is required"),
  comments: z.string().optional(),
  reviewed: z.string().optional(),
});

export default function Performance() {
  const { data: logs, isLoading, create, update, remove, isCreating, isUpdating } = usePerformance();
  const { staffList } = useStaff();
  const { registerAddAction, registerDownloadAction, searchQuery } = useAction();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  const filteredLogs = (logs || []).filter(log => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.staffId?.name?.toLowerCase().includes(q) ||
      log.period?.toLowerCase().includes(q) ||
      log.kpi?.toLowerCase().includes(q) ||
      log.comments?.toLowerCase().includes(q)
    );
  });

  const form = useForm({
    resolver: zodResolver(performanceSchema),
    defaultValues: {
      staffId: '',
      period: 'Monthly',
      date: new Date().toISOString().split('T')[0],
      rating: 5,
      kpi: '',
      comments: '',
      reviewed: 'Admin',
    },
  });

  useEffect(() => {
    const unregisterAdd = registerAddAction(() => {
      setEditingRecord(null);
      form.reset({
        staffId: '',
        period: 'Monthly',
        date: new Date().toISOString().split('T')[0],
        rating: 5,
        kpi: '',
        comments: '',
        reviewed: 'Admin',
      });
      setIsModalOpen(true);
    });
    const unregisterDownload = registerDownloadAction(() => {
      const exportData = filteredLogs.map(l => ({
        StaffName: l.staffId?.name || 'Unknown',
        Period: l.period,
        Date: l.date,
        Rating: l.rating,
        KPI: l.kpi,
        Comments: l.comments,
        ReviewedBy: l.reviewed
      }));
      downloadCSV(exportData, 'Performance_Reviews');
    });
    return () => {
      unregisterAdd();
      unregisterDownload();
    };
  }, [registerAddAction, registerDownloadAction, filteredLogs, form]);

  const onSubmit = async (values) => {
    try {
      if (editingRecord) {
        await update({ id: editingRecord._id, data: values });
        toast.success("Performance record updated");
      } else {
        await create(values);
        toast.success("Performance log added");
      }
      handleClose();
    } catch (error) {
      toast.error(error.message || "Failed to save record");
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    form.reset({
      staffId: record.staffId?._id || record.staffId,
      period: record.period,
      date: record.date,
      rating: record.rating,
      kpi: record.kpi,
      comments: record.comments,
      reviewed: record.reviewed,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this performance record?")) {
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

  const avgRating = logs.length > 0 ? (logs.reduce((acc, curr) => acc + curr.rating, 0) / logs.length).toFixed(1) : '0.0';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { label: 'Avg. Rating', value: `${avgRating} / 5.0`, icon: Star, color: 'text-amber bg-amber-light' },
          { label: 'Reviews Logged', value: logs.length, icon: MessageSquare, color: 'text-purple bg-purple-light' },
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

      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[650px]">
            <thead>
              <tr className="bg-surface2/50 border-b border-border">
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-text3">Staff & Period</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-text3">Rating & KPI</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-text3">Comments</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-text3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="border-b border-border"><td colSpan={4} className="p-4"><Skeleton className="h-12 w-full" /></td></tr>
                  ))
                ) : filteredLogs.map((log, idx) => (
                  <motion.tr 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    key={log._id} 
                    className="border-b border-border last:border-0 hover:bg-surface2/30 transition-all group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center text-[10px] font-bold">
                          {log.staffId?.initials || '??'}
                        </div>
                        <div>
                          <div className="text-[14px] font-medium text-text">{log.staffId?.name || 'Unknown'}</div>
                          <div className="text-[11px] text-purple font-bold uppercase tracking-wide">{log.period}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 mb-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={12} className={cn(i < log.rating ? "fill-amber text-amber" : "text-text3")} />
                        ))}
                      </div>
                      <div className="text-[12.5px] text-text font-medium">{log.kpi}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[12.5px] text-text2 italic max-w-xs truncate">"{log.comments}"</div>
                      <div className="text-[10px] text-text3 mt-1 uppercase tracking-wider">Reviewed by {log.reviewed || 'Admin'}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => handleEdit(log)} className="p-2 rounded-lg text-text2 hover:bg-accent-light hover:text-accent">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(log._id)} className="p-2 rounded-lg text-text2 hover:bg-red-light hover:text-red">
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
        <DialogContent className="sm:max-w-[800px] bg-surface text-text border border-border/80 shadow-2xl rounded-xl overflow-hidden p-0">
          <div className="p-4 px-5 border-b border-border/60 bg-surface2/25">
            <DialogHeader className="space-y-0.5">
              <DialogTitle className="text-lg font-bold tracking-tight text-text">
                {editingRecord ? 'Edit Evaluation' : 'New Performance Log'}
              </DialogTitle>
              <DialogDescription className="text-xs text-text2">
                {editingRecord ? 'Update the rating, KPI, or comments for this performance review.' : 'Log a new performance evaluation for a team member including ratings and target KPIs.'}
              </DialogDescription>
            </DialogHeader>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-5 space-y-4">
              <FormField control={form.control} name="staffId" render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Staff member</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-surface border-border/60 h-9 text-xs">
                        <SelectValue placeholder="Choose a member" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-surface border-border">
                      {staffList.map(s => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-[10px] mt-0.5" />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                 <FormField control={form.control} name="period" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Period</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-surface border-border/60 h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-surface border-border">
                        {['Daily', 'Weekly', 'Monthly', 'Quarterly'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="rating" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Rating (1-5)</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" max="5" {...field} className="bg-surface border-border/60 h-9 px-3 text-xs focus-visible:ring-accent" />
                    </FormControl>
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="kpi" render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">KPI / Achievement Tag</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g. Sales Target, Project Completion" {...field} className="bg-surface border-border/60 h-9 px-3 text-xs focus-visible:ring-accent" />
                  </FormControl>
                  <FormMessage className="text-[10px] mt-0.5" />
                </FormItem>
              )} />
              <FormField control={form.control} name="comments" render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Detailed Comments</FormLabel>
                  <FormControl>
                    <Input {...field} className="bg-surface border-border/60 h-9 px-3 text-xs focus-visible:ring-accent" />
                  </FormControl>
                </FormItem>
              )} />
              <DialogFooter className="pt-3 border-t border-border/60 gap-2 sm:gap-0">
                <Button variant="outline" type="button" onClick={handleClose} className="h-9 px-4 border-border/80 text-text2 hover:text-text hover:bg-surface2/30 text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating || isUpdating} className="h-9 px-4 bg-accent hover:bg-accent/90 text-white font-semibold transition-all duration-200 text-xs">
                  {(isCreating || isUpdating) && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  {editingRecord ? 'Save Changes' : 'Submit Review'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
