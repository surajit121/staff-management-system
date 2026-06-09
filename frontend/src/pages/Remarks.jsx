import React, { useState, useEffect } from 'react';
import { ClipboardList, MapPin, Clock, Edit2, Trash2, Loader2, Plus, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRemarks, useStaff } from '../hooks/useResource';
import { cn, formatDate } from '../lib/utils';
import { Skeleton } from '../components/ui/skeleton';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { useAction } from '../context/ActionContext';

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
import { TimePicker } from "../components/ui/time-picker";

const remarkSchema = z.object({
  staffId: z.string().min(1, "Staff selection is required"),
  date: z.string().min(1, "Date is required"),
  destination: z.string().min(2, "Destination is required"),
  purpose: z.string().min(3, "Purpose is required"),
  goingTime: z.string().optional(),
  returnTime: z.string().optional(),
});

export default function Remarks() {
  const { data: remarks, isLoading, create, update, remove, isCreating, isUpdating } = useRemarks();
  const { staffList } = useStaff();
  const { registerAddAction, searchQuery, dateFilter, setDateFilter, isFilterOpen } = useAction();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  const filteredRemarks = (remarks || []).filter(remark => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
                          (remark.staffId?.name?.toLowerCase() || '').includes(q) ||
                          (remark.destination?.toLowerCase() || '').includes(q) ||
                          (remark.purpose?.toLowerCase() || '').includes(q);
    const matchesDate = !isFilterOpen || !dateFilter || remark.date === dateFilter;
    return matchesSearch && matchesDate;
  });

  useEffect(() => {
    const unregisterAdd = registerAddAction(() => {
      form.reset({
        staffId: '',
        date: dateFilter || new Date().toISOString().split('T')[0],
        destination: '',
        purpose: '',
        goingTime: '',
        returnTime: '',
      });
      setEditingRecord(null);
      setIsModalOpen(true);
    });
    return () => unregisterAdd();
  }, [registerAddAction, dateFilter]);

  const form = useForm({
    resolver: zodResolver(remarkSchema),
    defaultValues: {
      staffId: '',
      date: dateFilter || new Date().toISOString().split('T')[0],
      destination: '',
      purpose: '',
      goingTime: '',
      returnTime: '',
    },
  });

  const onSubmit = async (values) => {
    try {
      if (editingRecord) {
        await update({ id: editingRecord._id, data: values });
        toast.success("Remark updated");
      } else {
        await create(values);
        toast.success("Remark added successfully");
      }
      handleClose();
    } catch (error) {
      toast.error(error.message || "Failed to save remark");
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    form.reset({
      staffId: record.staffId?._id || record.staffId,
      date: record.date,
      destination: record.destination,
      purpose: record.purpose,
      goingTime: record.goingTime,
      returnTime: record.returnTime,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this remark?")) {
      try {
        await remove(id);
        toast.success("Remark deleted");
      } catch (error) {
        toast.error("Failed to delete remark");
      }
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingRecord(null);
    form.reset();
  };

  return (
    <div className="space-y-6">
      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[650px]">
            <thead>
              <tr className="bg-surface2/50 border-b border-border">
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-text3">Staff</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-text3">Movement</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-text3">Time</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-text3">Date</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-text3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="border-b border-border"><td colSpan={5} className="p-4"><Skeleton className="h-12 w-full" /></td></tr>
                  ))
                ) : filteredRemarks.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-text3">No movements recorded for this period.</td></tr>
                ) : filteredRemarks.map((remark) => (
                  <motion.tr 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    key={remark._id} 
                    className="border-b border-border last:border-0 hover:bg-surface2/30 transition-all group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center text-[10px] font-bold">
                          {remark.staffId?.initials || '??'}
                        </div>
                        <div>
                          <div className="text-[14px] font-medium text-text">{remark.staffId?.name || 'Unknown'}</div>
                          <div className="text-[11px] text-text3">{remark.staffId?.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-[13.5px] font-medium text-text">
                         <MapPin size={12} className="text-accent" /> {remark.destination}
                      </div>
                      <div className="text-[11px] text-text3 mt-1 uppercase tracking-wider">{remark.purpose}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className="text-[10px] text-text3 uppercase font-bold">Out</div>
                          <div className="text-[13px] font-bold text-text">{remark.goingTime || '--:--'}</div>
                        </div>
                        <ArrowRight size={14} className="text-text3" />
                        <div className="text-center">
                          <div className="text-[10px] text-text3 uppercase font-bold">In</div>
                          <div className="text-[13px] font-bold text-text">{remark.returnTime || '--:--'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[12px] font-bold text-text mb-0.5 uppercase tracking-tighter">{formatDate(remark.date)}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => handleEdit(remark)} className="p-2 rounded-lg text-text2 hover:bg-accent-light hover:text-accent">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(remark._id)} className="p-2 rounded-lg text-text2 hover:bg-red-light hover:text-red">
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
              <DialogTitle className="text-lg font-bold tracking-tight text-text flex items-center gap-2">
                <ClipboardList className="text-accent" size={20} />
                {editingRecord ? 'Edit Remark' : 'Add New Remark'}
              </DialogTitle>
              <DialogDescription className="text-xs text-text2">
                Record staff movement details including destination, purpose, and times.
              </DialogDescription>
            </DialogHeader>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-5 space-y-4">
              <FormField control={form.control} name="staffId" render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Staff Member</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-surface border-border/60 h-9 text-xs">
                        <SelectValue placeholder="Select Staff" />
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
                <FormField control={form.control} name="destination" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Where (Destination)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Site A, Bank" {...field} className="bg-surface border-border/60 h-9 px-3 text-xs focus-visible:ring-accent" />
                    </FormControl>
                    <FormMessage className="text-[10px] mt-0.5" />
                  </FormItem>
                )} />
                <FormField control={form.control} name="purpose" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Why (Purpose)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Meeting, Deposit" {...field} className="bg-surface border-border/60 h-9 px-3 text-xs focus-visible:ring-accent" />
                    </FormControl>
                    <FormMessage className="text-[10px] mt-0.5" />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="goingTime" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Going Time</FormLabel>
                    <FormControl><TimePicker value={field.value} onChange={field.onChange} /></FormControl>
                    <FormMessage className="text-[10px] mt-0.5" />
                  </FormItem>
                )} />
                <FormField control={form.control} name="returnTime" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Coming Back Time</FormLabel>
                    <FormControl><TimePicker value={field.value} onChange={field.onChange} /></FormControl>
                    <FormMessage className="text-[10px] mt-0.5" />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} className="bg-surface border-border/60 h-9 px-3 text-xs focus-visible:ring-accent" />
                  </FormControl>
                  <FormMessage className="text-[10px] mt-0.5" />
                </FormItem>
              )} />

              <DialogFooter className="pt-3 border-t border-border/60 gap-2 sm:gap-0">
                <Button variant="outline" type="button" onClick={handleClose} className="h-9 px-4 border-border/80 text-text2 hover:text-text hover:bg-surface2/30 text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating || isUpdating} className="h-9 px-4 bg-accent hover:bg-accent/90 text-white font-semibold transition-all duration-200 text-xs">
                  {(isCreating || isUpdating) && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  {editingRecord ? 'Update Remark' : 'Add Remark'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
