import React, { useState, useEffect } from 'react';
import { CalendarClock, CheckCircle2, XCircle, Clock, Trash2, Loader2, Plus, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLeave, useStaff } from '../hooks/useResource';
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

const leaveSchema = z.object({
  staffId: z.string().min(1, "Staff selection is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  type: z.enum(['Sick', 'Vacation', 'Unpaid', 'Other']),
  reason: z.string().min(3, "Please provide a reason"),
  status: z.enum(['Pending', 'Approved', 'Rejected']).default('Pending'),
});

export default function LeaveManagement() {
  const { data: leaves, isLoading, create, update, remove, isCreating, isUpdating } = useLeave();
  const { staffList, isLoading: isStaffLoading } = useStaff();
  const { registerAddAction, searchQuery } = useAction();

  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const unregisterAdd = registerAddAction(() => setIsModalOpen(true));
    return () => unregisterAdd();
  }, [registerAddAction]);

  const filteredLeaves = leaves.filter(item => {
    const staffName = item.staffId?.name || '';
    return staffName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           item.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
           item.status.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const form = useForm({
    resolver: zodResolver(leaveSchema),
    defaultValues: {
      staffId: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      type: 'Sick',
      reason: '',
      status: 'Pending',
    },
  });

  const onSubmit = async (values) => {
    try {
      await create(values);
      toast.success("Leave request submitted successfully");
      handleClose();
    } catch (error) {
      toast.error(error.message || "Failed to submit leave request");
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await update({ id, data: { status } });
      toast.success(`Leave request ${status.toLowerCase()}`);
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this leave request?")) {
      try {
        await remove(id);
        toast.success("Request deleted");
      } catch (error) {
        toast.error("Failed to delete request");
      }
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    form.reset();
  };

  const pendingCount = leaves.filter(l => l.status === 'Pending').length;
  const approvedCount = leaves.filter(l => l.status === 'Approved').length;
  const rejectedCount = leaves.filter(l => l.status === 'Rejected').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text">Leave Management</h2>
          <p className="text-sm text-text2">Track and manage staff time off requests.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Pending Approval', value: pendingCount, icon: Clock, color: 'text-amber bg-amber-light' },
          { label: 'Approved', value: approvedCount, icon: CheckCircle2, color: 'text-green bg-green-light' },
          { label: 'Rejected', value: rejectedCount, icon: XCircle, color: 'text-red bg-red-light' },
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
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-text3">Staff Member</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-text3">Dates</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-text3">Type / Reason</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-text3">Status</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-text3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {(isLoading || isStaffLoading) ? (
                  Array(3).fill(0).map((_, i) => (
                    <tr key={i} className="border-b border-border"><td colSpan={5} className="p-4"><Skeleton className="h-12 w-full" /></td></tr>
                  ))
                ) : filteredLeaves.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-text3">No leave requests found.</td>
                  </tr>
                ) : filteredLeaves.map((item) => (
                  <motion.tr
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    key={item._id}
                    className="border-b border-border last:border-0 hover:bg-surface2/30 transition-all group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center text-[10px] font-bold">
                          {item.staffId?.initials || '??'}
                        </div>
                        <div className="text-[14px] font-medium text-text">{item.staffId?.name || 'Unknown'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[13.5px] text-text2">
                      <div className="font-mono">{formatDate(item.startDate?.split('T')[0])}</div>
                      <div className="text-[11px] opacity-70">to {formatDate(item.endDate?.split('T')[0])}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[13px] font-bold text-text">{item.type}</div>
                      <div className="text-[12px] text-text2 truncate max-w-[200px]" title={item.reason}>{item.reason}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide flex items-center gap-1 w-max",
                        item.status === 'Approved' ? "bg-green-light text-green" :
                        item.status === 'Rejected' ? "bg-red-light text-red" : 
                        "bg-amber-light text-amber"
                      )}>
                        {item.status === 'Approved' && <CheckCircle2 size={12} />}
                        {item.status === 'Rejected' && <XCircle size={12} />}
                        {item.status === 'Pending' && <Clock size={12} />}
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-all">
                        {item.status === 'Pending' && (
                          <>
                            <button onClick={() => handleUpdateStatus(item._id, 'Approved')} title="Approve" className="p-2 rounded-lg text-green hover:bg-green-light">
                              <Check size={16} />
                            </button>
                            <button onClick={() => handleUpdateStatus(item._id, 'Rejected')} title="Reject" className="p-2 rounded-lg text-red hover:bg-red-light">
                              <XCircle size={16} />
                            </button>
                          </>
                        )}
                        <button onClick={() => handleDelete(item._id)} className="p-2 rounded-lg text-text3 hover:text-red hover:bg-red-light">
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
              <DialogTitle className="text-lg font-bold tracking-tight text-text">Request Leave</DialogTitle>
              <DialogDescription className="text-xs text-text2">
                Submit a new time-off request for approval.
              </DialogDescription>
            </DialogHeader>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-5 space-y-4">
              <FormField
                control={form.control}
                name="staffId"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Select Staff member</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-surface border-border/60 h-9 text-xs">
                          <SelectValue placeholder="Choose a member" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-surface border-border">
                        {staffList.map(s => (
                          <SelectItem key={s._id} value={s._id}>{s.name} ({s.role})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-[10px] mt-0.5" />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} className="bg-surface border-border/60 h-9 px-3 text-xs focus-visible:ring-accent" />
                      </FormControl>
                      <FormMessage className="text-[10px] mt-0.5" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">End Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} className="bg-surface border-border/60 h-9 px-3 text-xs focus-visible:ring-accent" />
                      </FormControl>
                      <FormMessage className="text-[10px] mt-0.5" />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Leave Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-surface border-border/60 h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-surface border-border">
                        {['Sick', 'Vacation', 'Unpaid', 'Other'].map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-[10px] mt-0.5" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Reason</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g., Medical appointment" {...field} className="bg-surface border-border/60 h-9 px-3 text-xs focus-visible:ring-accent" />
                    </FormControl>
                    <FormMessage className="text-[10px] mt-0.5" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Initial Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-surface border-border/60 h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-surface border-border">
                        {['Pending', 'Approved', 'Rejected'].map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-[10px] mt-0.5" />
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-3 border-t border-border/60 gap-2 sm:gap-0">
                <Button variant="outline" type="button" onClick={handleClose} className="h-9 px-4 border-border/80 text-text2 hover:text-text hover:bg-surface2/30 text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating} className="h-9 px-4 bg-accent hover:bg-accent/90 text-white font-semibold transition-all duration-200 text-xs">
                  {isCreating && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Submit Request
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
