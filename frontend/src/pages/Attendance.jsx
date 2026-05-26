import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle2, XCircle, Clock, Edit2, Trash2, Loader2, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAttendance, useStaff } from '../hooks/useResource';
import { cn, formatDate } from '../lib/utils';
import { Skeleton } from '../components/ui/skeleton';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { useAction } from '../context/ActionContext';
import StaffCalendar from '../components/StaffCalendar';
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

const attendanceSchema = z.object({
  staffId: z.string().min(1, "Staff selection is required"),
  date: z.string().min(1, "Date is required"),
  status: z.enum(['Present', 'Absent', 'Half Day', 'Work From Home']),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  notes: z.string().optional(),
});

export default function Attendance() {
  const { data: attendance, isLoading, create, update, remove, isCreating, isUpdating } = useAttendance();
  const { staffList, isLoading: isStaffLoading } = useStaff();
  const { registerAddAction, registerDownloadAction, searchQuery, dateFilter } = useAction();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [calendarStaff, setCalendarStaff] = useState(null);

  const displayDate = dateFilter || new Date().toISOString().split('T')[0];

  const mergedAttendance = staffList.map(staff => {
    const record = attendance.find(r => 
      (r.staffId?._id === staff._id || r.staffId === staff._id) && 
      (r.date?.split('T')[0] === displayDate)
    );
    
    return {
      staffId: staff,
      record: record,
      status: record ? record.status : 'Not Marked',
      _id: record?._id || `temp-${staff._id}`,
      isNotMarked: !record
    };
  }).filter(item => {
    const matchesSearch = item.staffId.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.status.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  useEffect(() => {
    const unregisterAdd = registerAddAction(() => setIsModalOpen(true));
    const unregisterDownload = registerDownloadAction(() => {
      const exportData = mergedAttendance.map(a => ({
        StaffName: a.staffId?.name || 'Unknown',
        Date: displayDate,
        Status: a.status,
        CheckIn: a.record?.checkIn || '',
        CheckOut: a.record?.checkOut || '',
        Notes: a.record?.notes || ''
      }));
      downloadCSV(exportData, `Attendance_${displayDate}`);
    });
    return () => {
      unregisterAdd();
      unregisterDownload();
    };
  }, [registerAddAction, registerDownloadAction, mergedAttendance, displayDate]);

  const form = useForm({
    resolver: zodResolver(attendanceSchema),
    defaultValues: {
      staffId: '',
      date: displayDate,
      status: 'Present',
      checkIn: '09:00',
      checkOut: '18:00',
      notes: '',
    },
  });

  const onSubmit = async (values) => {
    try {
      if (editingRecord) {
        await update({ id: editingRecord._id, data: values });
        toast.success("Attendance record updated");
      } else {
        await create(values);
        toast.success("Attendance marked successfully");
      }
      handleClose();
    } catch (error) {
      toast.error(error.message || "Failed to save attendance");
    }
  };

  const handleMark = (staff) => {
    form.reset({
      staffId: staff._id,
      date: displayDate,
      status: 'Present',
      checkIn: '09:00',
      checkOut: '18:00',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const quickMark = async (staffId, status) => {
    try {
      await create({
        staffId: staffId,
        date: displayDate,
        status: status,
        checkIn: '09:00',
        checkOut: '18:00',
        notes: `Quick marked as ${status}`,
      });
      toast.success(`Marked as ${status}`);
    } catch (error) {
      toast.error(error.message || "Failed to mark attendance");
    }
  };

  const handleEdit = (item) => {
    const record = item.record;
    setEditingRecord(record);
    form.reset({
      staffId: record.staffId?._id || record.staffId,
      date: record.date.split('T')[0],
      status: record.status,
      checkIn: record.checkIn,
      checkOut: record.checkOut,
      notes: record.notes,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this attendance record?")) {
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

  const handleCalendarDateClick = async (dateStr, record) => {
    if (!calendarStaff) return;

    try {
      if (!record) {
        await create({
          staffId: calendarStaff._id,
          date: dateStr,
          status: 'Present',
          checkIn: '09:00',
          checkOut: '18:00',
          notes: '',
        });
        toast.success(`Marked Present on ${dateStr}`);
      } else if (record.status === 'Present' || record.status === 'Half Day' || record.status === 'Work From Home') {
        await update({
          id: record._id,
          data: {
            staffId: calendarStaff._id,
            date: dateStr,
            status: 'Absent',
            checkIn: record.checkIn,
            checkOut: record.checkOut,
            notes: record.notes,
          }
        });
        toast.success(`Marked Absent on ${dateStr}`);
      } else if (record.status === 'Absent') {
        await remove(record._id);
        toast.success(`Attendance cleared on ${dateStr}`);
      }
    } catch (error) {
      toast.error(error.message || "Failed to update attendance");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text">Attendance Log</h2>
          <p className="text-sm text-text2">Track and manage daily attendance.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Present Today', value: mergedAttendance.filter(a => a.status === 'Present').length, icon: CheckCircle2, color: 'text-green bg-green-light' },
          { label: 'Absent Today', value: mergedAttendance.filter(a => a.status === 'Absent').length, icon: XCircle, color: 'text-red bg-red-light' },
          { label: 'Not Marked', value: mergedAttendance.filter(a => a.isNotMarked).length, icon: Clock, color: 'text-text3 bg-surface2' },
          { label: 'Total Staff', value: staffList.length, icon: CheckCircle2, color: 'text-accent bg-accent-light' },
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
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-text3">Date</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-text3">Status</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-text3">Log Times</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-text3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {(isLoading || isStaffLoading) ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="border-b border-border"><td colSpan={5} className="p-4"><Skeleton className="h-12 w-full" /></td></tr>
                  ))
                ) : mergedAttendance.map((item, idx) => (
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
                    <td className="px-6 py-4 text-[13.5px] text-text2 font-mono">
                      {formatDate(displayDate)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide",
                        item.status === 'Present' ? "bg-green-light text-green" :
                          item.status === 'Absent' ? "bg-red-light text-red" : 
                          item.isNotMarked ? "bg-surface2 text-text3" : "bg-amber-light text-amber"
                      )}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[12px] text-text2 font-mono">
                        {item.record?.checkIn || '--:--'} → {item.record?.checkOut || '--:--'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => setCalendarStaff(item.staffId)} title="View Monthly Calendar" className="p-2 rounded-lg text-text2 hover:bg-green-light hover:text-green">
                          <Calendar size={16} />
                        </button>
                        {item.isNotMarked ? (
                          <div className="flex gap-2">
                            <button 
                              onClick={() => quickMark(item.staffId._id, 'Present')} 
                              title="Quick Mark Present" 
                              className="w-8 h-8 rounded-full bg-green/10 text-green hover:bg-green hover:text-white flex items-center justify-center transition-all border border-green/20"
                            >
                              <CheckCircle2 size={16} />
                            </button>
                            <button 
                              onClick={() => quickMark(item.staffId._id, 'Absent')} 
                              title="Quick Mark Absent" 
                              className="w-8 h-8 rounded-full bg-red/10 text-red hover:bg-red hover:text-white flex items-center justify-center transition-all border border-red/20"
                            >
                              <XCircle size={16} />
                            </button>
                            <button onClick={() => handleMark(item.staffId)} className="p-2 rounded-lg text-text3 hover:bg-surface2 hover:text-text flex items-center gap-1 text-[11px] font-bold">
                              <Plus size={14} /> MORE
                            </button>
                          </div>
                        ) : (
                          <>
                            <button onClick={() => handleEdit(item)} className="p-2 rounded-lg text-text2 hover:bg-accent-light hover:text-accent">
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleDelete(item.record._id)} className="p-2 rounded-lg text-text2 hover:bg-red-light hover:text-red">
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
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
                {editingRecord ? 'Update Log' : 'Mark Attendance'}
              </DialogTitle>
              <DialogDescription className="text-xs text-text2">
                {editingRecord ? 'Modify the details for this attendance record.' : 'Capture the attendance status for the selected team member.'}
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
                  name="date"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} className="bg-surface border-border/60 h-9 px-3 text-xs focus-visible:ring-accent" />
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
                      <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-surface border-border/60 h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-surface border-border">
                          {['Present', 'Absent', 'Half Day', 'Work From Home'].map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-[10px] mt-0.5" />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="checkIn"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Check-in</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} className="bg-surface border-border/60 h-9 px-3 text-xs focus-visible:ring-accent" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="checkOut"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Check-out</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} className="bg-surface border-border/60 h-9 px-3 text-xs focus-visible:ring-accent" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter className="pt-3 border-t border-border/60 gap-2 sm:gap-0">
                <Button variant="outline" type="button" onClick={handleClose} className="h-9 px-4 border-border/80 text-text2 hover:text-text hover:bg-surface2/30 text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating || isUpdating} className="h-9 px-4 bg-accent hover:bg-accent/90 text-white font-semibold transition-all duration-200 text-xs">
                  {(isCreating || isUpdating) && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  {editingRecord ? 'Save Changes' : 'Submit Log'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!calendarStaff} onOpenChange={(open) => !open && setCalendarStaff(null)}>
        <DialogContent aria-describedby={undefined} className="sm:max-w-[550px] bg-transparent border-0 shadow-none p-0">
          <DialogHeader className="hidden">
            <DialogTitle>Calendar View</DialogTitle>
            <DialogDescription>Monthly attendance overview for the selected staff member.</DialogDescription>
          </DialogHeader>
          <StaffCalendar 
            staff={calendarStaff} 
            attendanceRecords={attendance.filter(r => (r.staffId?._id || r.staffId) === calendarStaff?._id)} 
            onDateClick={handleCalendarDateClick}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
