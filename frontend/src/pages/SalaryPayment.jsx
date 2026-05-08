import React, { useState, useEffect, useMemo } from 'react';
import { Wallet, TrendingUp, AlertTriangle, Edit2, Trash2, Loader2, Plus, Clock, Download, Banknote } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSalary, useStaff } from '../hooks/useResource';
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

const salarySchema = z.object({
  staffId: z.string().min(1, "Staff selection is required"),
  month: z.string().min(1, "Month is required"),
  amount: z.coerce.number().min(0, "Valid base amount is required"),
  deductions: z.coerce.number().min(0, "Invalid deductions amount"),
  paymentDate: z.string().min(1, "Payment Date is required"),
  paymentMethod: z.enum(['Bank Transfer', 'Cash', 'Cheque', 'UPI']).default('Bank Transfer'),
  status: z.enum(['Pending', 'Paid']).default('Pending'),
});

export default function SalaryPayment() {
  const { data: salaries, isLoading, create, update, remove, isCreating, isUpdating } = useSalary();
  const { staffList } = useStaff();
  const { registerAddAction, registerDownloadAction, searchQuery, dateFilter } = useAction();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  const filteredSalaries = salaries.filter(s => {
    const q = searchQuery.toLowerCase();
    const staffName = s.staffId?.name || '';
    const month = s.month || '';
    
    return !q || (
      staffName.toLowerCase().includes(q) ||
      month.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    const unregisterAdd = registerAddAction(() => setIsModalOpen(true));
    const unregisterDownload = registerDownloadAction(() => {
      const exportData = salaries.map(s => ({
        StaffName: s.staffId?.name || 'Unknown',
        Month: s.month,
        BaseAmount: s.amount,
        Deductions: s.deductions,
        NetPay: s.netPay,
        PaymentDate: s.paymentDate, // Or properly formatted
        Method: s.paymentMethod,
        Status: s.status
      }));
      downloadCSV(exportData, 'Salary_Payments_Report');
    });
    return () => {
      unregisterAdd();
      unregisterDownload();
    };
  }, [registerAddAction, registerDownloadAction, salaries, dateFilter]);

  const form = useForm({
    resolver: zodResolver(salarySchema),
    defaultValues: {
      staffId: '',
      month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
      amount: 0,
      deductions: 0,
      paymentDate: dateFilter || new Date().toISOString().split('T')[0],
      paymentMethod: 'Bank Transfer',
      status: 'Pending',
    },
  });

  const onSubmit = async (values) => {
    try {
      const payload = { ...values, netPay: Number(values.amount) - Number(values.deductions || 0) };
      if (editingRecord) {
        await update({ id: editingRecord._id, data: payload });
        toast.success("Salary record updated");
      } else {
        await create(payload);
        toast.success("Salary payment logged successfully");
      }
      handleClose();
    } catch (error) {
      toast.error(error.message || "Failed to save salary record");
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    form.reset({
      staffId: record.staffId?._id || record.staffId,
      month: record.month,
      amount: record.amount,
      deductions: record.deductions,
      paymentDate: record.paymentDate,
      paymentMethod: record.paymentMethod,
      status: record.status,
    });
    setIsModalOpen(true);
  };

  const handlePayNow = (staff) => {
    setEditingRecord(null);
    form.reset({
      staffId: staff._id,
      month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
      amount: 0,
      deductions: 0,
      paymentDate: dateFilter || new Date().toISOString().split('T')[0],
      paymentMethod: 'Bank Transfer',
      status: 'Paid',
    });
    setShowUnpaidPopup(false);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this salary record?")) {
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

  const totalPaid = filteredSalaries.filter(s => s.status === 'Paid').reduce((acc, curr) => acc + curr.netPay, 0);
  const pendingAmount = filteredSalaries.filter(s => s.status === 'Pending').reduce((acc, curr) => acc + curr.netPay, 0);

  const currentDate = new Date();
  const isPast15th = currentDate.getDate() > 15;
  const currentMonthStr = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const unpaidStaff = useMemo(() => {
    if (!isPast15th || !staffList.length) return [];
    return staffList.filter(staff => {
      const isPaid = salaries.some(s => 
        (s.staffId?._id === staff._id || s.staffId === staff._id) && 
        s.month.toLowerCase() === currentMonthStr.toLowerCase() && 
        s.status === 'Paid'
      );
      return !isPaid;
    });
  }, [staffList, salaries, isPast15th, currentMonthStr]);

  const [showUnpaidPopup, setShowUnpaidPopup] = useState(false);

  useEffect(() => {
    if (isPast15th && unpaidStaff.length > 0) {
      const hasSeen = sessionStorage.getItem('unpaidPopupSeen');
      if (!hasSeen) {
        setShowUnpaidPopup(true);
        sessionStorage.setItem('unpaidPopupSeen', 'true');
      }
    }
  }, [isPast15th, unpaidStaff.length]);

  return (
    <div className="space-y-6">
      {isPast15th && unpaidStaff.length > 0 && (
        <div className="bg-red-light border border-red text-red p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle size={24} />
            <div>
              <h4 className="font-bold">Overdue Salary Alert</h4>
              <p className="text-sm">It is past the 15th and {unpaidStaff.length} staff member(s) have unpaid salaries for {currentMonthStr}.</p>
            </div>
          </div>
          <Button variant="outline" className="text-red border-red hover:bg-red hover:text-white" onClick={() => setShowUnpaidPopup(true)}>
            View Unpaid Staff
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text">Salary Payments</h2>
          <p className="text-sm text-text2">Manage staff salaries and payouts.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Paid out', value: `₹${totalPaid.toLocaleString()}`, icon: TrendingUp, color: 'text-green bg-green-light' },
          { label: 'Pending Payout', value: `₹${pendingAmount.toLocaleString()}`, icon: AlertTriangle, color: 'text-amber bg-amber-light' },
          { 
            label: 'Total Salary Records', 
            value: filteredSalaries.length, 
            icon: Banknote, 
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
              stat.clickable && "cursor-pointer hover:shadow-md hover:border-accent/30 active:scale-[0.98]"
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

      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface2/50 border-b border-border">
              <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-text3">Staff & Month</th>
              <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-text3">Details</th>
              <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-text3">Net Pay</th>
              <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-text3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="border-b border-border"><td colSpan={4} className="p-4"><Skeleton className="h-12 w-full" /></td></tr>
                ))
              ) : filteredSalaries.map((s, idx) => (
                <motion.tr 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  key={s._id} 
                  className="border-b border-border last:border-0 hover:bg-surface2/30 transition-all group"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center text-[10px] font-bold">
                        {s.staffId?.initials || '??'}
                      </div>
                      <div>
                        <div className="text-[14px] font-medium text-text">{s.staffId?.name || 'Unknown'}</div>
                        <div className="text-[11px] text-accent font-bold uppercase tracking-wide">{s.month}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-[13.5px] font-medium text-text">Base: ₹{s.amount} | Ded: ₹{s.deductions}</div>
                    <div className="text-[11.5px] text-text3 font-mono">{formatDate(s.paymentDate)} • {s.paymentMethod}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-[15px] font-bold text-text">₹{s.netPay?.toLocaleString()}</div>
                    <div className={cn(
                      "inline-flex mt-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      s.status === 'Paid' ? "bg-green-light text-green" : "bg-amber-light text-amber"
                    )}>
                      {s.status}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => handleEdit(s)} className="p-2 rounded-lg text-text2 hover:bg-accent-light hover:text-accent">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(s._id)} className="p-2 rounded-lg text-text2 hover:bg-red-light hover:text-red">
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

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-surface text-text">
          <DialogHeader>
            <DialogTitle className="font-bold">{editingRecord ? 'Edit Salary' : 'Log Salary'}</DialogTitle>
            <DialogDescription className="text-xs text-text3">
              {editingRecord ? 'Update the details of this salary record.' : 'Enter the details for a new salary payment.'}
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
                <FormField control={form.control} name="month" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-text2">Month</FormLabel>
                    <FormControl><Input placeholder="e.g. April 2026" {...field} className="bg-surface2" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="paymentDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-text2">Payment Date</FormLabel>
                    <FormControl><Input type="date" {...field} className="bg-surface2" /></FormControl>
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="amount" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-text2">Base Amount (₹)</FormLabel>
                    <FormControl><Input type="number" {...field} className="bg-surface2" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="deductions" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-text2">Deductions (₹)</FormLabel>
                    <FormControl><Input type="number" {...field} className="bg-surface2" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="paymentMethod" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-text2">Method</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger className="bg-surface2"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent className="bg-surface border-border">
                        {['Bank Transfer', 'Cash', 'Cheque', 'UPI'].map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-text2">Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger className="bg-surface2"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent className="bg-surface border-border">
                        {['Pending', 'Paid'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </div>
              <DialogFooter className="pt-4">
                <Button variant="outline" type="button" onClick={handleClose}>Cancel</Button>
                <Button type="submit" disabled={isCreating || isUpdating} className="bg-accent text-white">
                  {(isCreating || isUpdating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingRecord ? 'Save Changes' : 'Submit Salary'}
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
              <Clock className="text-accent" size={18} /> Detailed Salary History
            </DialogTitle>
            <DialogDescription className="text-[12px] text-text2">Full record of all salaries logged in the system.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto border border-border rounded-lg bg-surface2/20">
            <table className="w-full text-left border-collapse text-[12px]">
              <thead className="sticky top-0 bg-surface border-b border-border z-10">
                <tr>
                  <th className="px-4 py-3 font-bold uppercase text-text3 whitespace-nowrap">Staff & Month</th>
                  <th className="px-4 py-3 font-bold uppercase text-text3 whitespace-nowrap">Net Pay</th>
                  <th className="px-4 py-3 font-bold uppercase text-text3 whitespace-nowrap">Payment Date</th>
                </tr>
              </thead>
              <tbody>
                {salaries.length === 0 ? (
                  <tr><td colSpan={3} className="p-8 text-center text-text3">No salaries found.</td></tr>
                ) : salaries.map(s => (
                  <tr key={s._id} className="border-b border-border/50 hover:bg-surface2/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-text">{s.staffId?.name || 'Unknown'}</div>
                      <div className="text-[10px] text-accent font-bold uppercase">{s.month}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-bold text-text">₹{s.netPay?.toLocaleString()}</div>
                      <div className={cn(
                        "text-[9px] font-bold uppercase",
                        s.status === 'Paid' ? "text-green" : "text-amber"
                      )}>
                        {s.status}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-text2 uppercase tracking-tighter">
                      {formatDate(s.paymentDate, { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')}
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
              onClick={() => {
                const event = new MouseEvent('click', { view: window, bubbles: true, cancelable: true });
                document.querySelector('button[style*="background: var(--color-green)"]')?.dispatchEvent(event);
              }}
            >
              <Download size={14} /> Download Full Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showUnpaidPopup} onOpenChange={setShowUnpaidPopup}>
        <DialogContent className="sm:max-w-[500px] bg-surface text-text flex flex-col max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="font-bold flex items-center gap-2 text-red">
              <AlertTriangle className="text-red" size={20} /> Unpaid Staff Alert
            </DialogTitle>
            <DialogDescription className="text-[12px] text-text3">
              The following staff members have not received their salary for {currentMonthStr}. 
              Please clear their dues.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto border border-red/20 rounded bg-red-light/20 p-2 space-y-2 mt-4">
            {unpaidStaff.map(staff => (
              <div key={staff._id} className="flex justify-between items-center p-3 rounded-lg border border-red/30 bg-surface/50 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-red shrink-0" />
                <div className="flex items-center gap-3 ml-2">
                  <div className="w-8 h-8 rounded-full bg-red/10 text-red flex items-center justify-center text-[10px] font-bold">
                    {staff.initials || '??'}
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-text">{staff.name}</div>
                    <div className="text-[10px] font-medium text-text3 uppercase">{staff.role}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-red font-bold text-[10px] uppercase bg-red/10 px-2 py-1 rounded">
                    Unpaid
                  </div>
                  <Button 
                    size="sm" 
                    className="h-7 text-[10px] bg-red hover:bg-red-dark text-white gap-1 px-2"
                    onClick={() => handlePayNow(staff)}
                  >
                    <Banknote size={12} /> Pay Now
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter className="mt-4">
            <Button className="bg-red hover:bg-red-dark text-white" onClick={() => setShowUnpaidPopup(false)}>Acknowledge</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
