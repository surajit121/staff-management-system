import React, { useState, useEffect } from 'react';
import { Truck, Package, CheckCircle, Edit2, Trash2, Loader2, Plus, ArrowRight, XCircle, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStock, useProjects } from '../hooks/useResource';
import { cn, formatDate } from '../lib/utils';
import { Skeleton } from '../components/ui/skeleton';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { useAction } from '../context/ActionContext';
import { downloadCSV } from '../lib/export';
import { generateChallanPDF } from '../lib/pdf';

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

const stockSchema = z.object({
  items: z.array(z.object({
    name: z.string().min(2, "Item name required"),
    qty: z.coerce.number().min(1, "Qty required"),
    quality: z.string().optional().default('')
  })).min(1, "At least one item required"),
  from: z.string().min(2, "Source is required"),
  to: z.string().min(2, "Destination is required"),
  project: z.string().min(1, "Project reference required"),
  date: z.string().min(1, "Date is required"),
  status: z.enum(['In Transit', 'Delivered', 'Reserved', 'Cancelled']).default('In Transit'),
});

export default function StockTransfer() {
  const { data: transfers, isLoading, create, update, remove, isCreating, isUpdating } = useStock();
  const { data: projects } = useProjects();
  const { registerAddAction, registerDownloadAction, searchQuery, dateFilter } = useAction();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  const filteredTransfers = (transfers || []).filter(t => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery ||
      (t.items || []).some(item => item.name?.toLowerCase().includes(q)) ||
      t.from?.toLowerCase().includes(q) ||
      t.to?.toLowerCase().includes(q) ||
      t.project?.toLowerCase().includes(q);
    return matchesSearch;
  });

  const form = useForm({
    resolver: zodResolver(stockSchema),
    defaultValues: {
      items: [{ name: '', qty: 0, quality: '' }],
      from: 'Main Warehouse',
      to: '',
      project: '',
      date: dateFilter,
      status: 'In Transit',
    },
  });

  const { fields, append, remove: removeField } = useFieldArray({
    control: form.control,
    name: "items"
  });

  useEffect(() => {
    const unregisterAdd = registerAddAction(() => {
      form.reset({
        items: [{ name: '', qty: 0, quality: '' }],
        from: 'Main Warehouse',
        to: '',
        project: '',
        date: dateFilter,
        status: 'In Transit',
      });
      setEditingRecord(null);
      setIsModalOpen(true);
    });
    const unregisterDownload = registerDownloadAction(() => {
      const exportData = filteredTransfers.map(t => ({
        Items: (t.items || []).map(i => `${i.name}${i.quality ? ` (${i.quality})` : ''} (x${i.qty})`).join(', '),
        From: t.from,
        To: t.to,
        Project: t.project,
        Date: t.date,
        Status: t.status
      }));
      downloadCSV(exportData, 'Stock_Transfers');
    });
    return () => {
      unregisterAdd();
      unregisterDownload();
    };
  }, [registerAddAction, registerDownloadAction, filteredTransfers, form, dateFilter]);

  // Auto-fill Destination Site from project location when a project code is selected
  const watchedProjectCode = form.watch('project');
  React.useEffect(() => {
    if (!watchedProjectCode || editingRecord) return;
    const matched = projects.find(
      p => p.code?.trim().toLowerCase() === watchedProjectCode.trim().toLowerCase()
    );
    if (matched) {
      if (matched.location) form.setValue('to', matched.location, { shouldValidate: false });
    }
  }, [watchedProjectCode, projects, editingRecord]);

  const onSubmit = async (values) => {
    try {
      if (editingRecord) {
        await update({ id: editingRecord._id, data: values });
        toast.success("Stock transfer updated");
      } else {
        await create(values);
        toast.success(`${values.items.length} item(s) transfer initiated`);
      }
      handleClose();
    } catch (error) {
      toast.error(error.message || "Failed to log transfer");
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    form.reset({
      items: (record.items || []).map(i => ({ name: i.name || '', qty: i.qty || 0, quality: i.quality || '' })),
      from: record.from,
      to: record.to,
      project: record.project,
      date: record.date,
      status: record.status,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this stock transfer log?")) {
      try {
        await remove(id);
        toast.success("Record deleted");
      } catch {
        toast.error("Failed to delete record");
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'In Transit', value: transfers.filter(t => t.status === 'In Transit').length, icon: Truck, color: 'text-amber bg-amber-light' },
          { label: 'Delivered', value: transfers.filter(t => t.status === 'Delivered').length, icon: CheckCircle, color: 'text-green bg-green-light' },
          { label: 'Reserved', value: transfers.filter(t => t.status === 'Reserved').length, icon: Package, color: 'text-accent bg-accent-light' },
          { label: 'Cancelled', value: transfers.filter(t => t.status === 'Cancelled').length, icon: XCircle, color: 'text-red bg-red-light' },
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
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-text3">Item & Project</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-text3">Transfer Path</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-text3">Qty & Status</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-text3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="border-b border-border"><td colSpan={4} className="p-4"><Skeleton className="h-12 w-full" /></td></tr>
                  ))
                ) : filteredTransfers.map((t) => (
                  <motion.tr
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    key={t._id}
                    className="border-b border-border last:border-0 hover:bg-surface2/30 transition-all group"
                  >
                    <td className="px-6 py-4">
                      <div className="text-[14px] font-bold text-text mb-0.5">
                        {(t.items || []).length > 1 ? `${(t.items || []).length} Items` : t.items?.[0]?.name || 'No Items'}
                      </div>
                      <div className="text-[10px] text-text3 truncate max-w-[150px]">
                        {(t.items || []).map(i => `${i.name}${i.quality ? ` (${i.quality})` : ''}`).join(', ')}
                      </div>
                      <div className="text-[11px] font-bold text-accent uppercase tracking-widest mt-1">{t.project}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-[12.5px] font-medium text-text">
                        {t.from} <ArrowRight size={10} className="text-text3" /> {t.to}
                      </div>
                      <div className="text-[11px] text-text3 font-mono mt-1 uppercase tracking-tighter">{formatDate(t.date)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[13px] font-bold text-text mb-1">
                        {(t.items || []).reduce((acc, curr) => acc + (Number(curr.qty) || 0), 0)} Total Units
                      </div>
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest",
                        t.status === 'Delivered' ? "bg-green-light text-green" :
                          t.status === 'Cancelled' ? "bg-red-light text-red" : "bg-amber-light text-amber"
                      )}>{t.status}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-1 justify-end items-center opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => generateChallanPDF(t)} 
                          className="p-2 rounded-lg text-accent hover:bg-accent-light transition-colors"
                          title="Print Challan"
                        >
                          <FileText size={16} />
                        </button>
                        <button onClick={() => handleEdit(t)} className="p-2 rounded-lg text-text2 hover:bg-accent-light hover:text-accent">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(t._id)} className="p-2 rounded-lg text-text2 hover:bg-red-light hover:text-red">
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
                {editingRecord ? 'Update Stock Transfer' : 'New Stock Transfer'}
              </DialogTitle>
              <DialogDescription className="text-xs text-text2">
                {editingRecord ? 'Modify the status or details of an existing stock movement.' : 'Initiate a new stock transfer from source to destination site.'}
              </DialogDescription>
            </DialogHeader>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-5 space-y-4">
              {/* Items List Container */}
              <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-1.5 custom-scrollbar">
                {fields.map((field, index) => (
                  <div 
                    key={field.id} 
                    className="p-3 border border-border/60 rounded-xl bg-surface2/10 transition-all duration-200 hover:border-accent/40"
                  >
                      <div className="grid grid-cols-12 gap-2.5 items-end">
                        <FormField control={form.control} name={`items.${index}.name`} render={({ field: inputField }) => (
                          <FormItem className={cn("space-y-1", fields.length > 1 && !editingRecord ? "col-span-11" : "col-span-12")}>
                            <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Item Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Fire Extinguisher, Dome Camera..." list="item-suggestions" {...inputField} className="bg-surface border-border/60 h-9 px-3 text-xs focus-visible:ring-accent" />
                            </FormControl>
                            <FormMessage className="text-[10px] mt-0.5" />
                          </FormItem>
                        )} />
                        
                        {index > 0 && !editingRecord && (
                          <div className="col-span-1 flex justify-center pb-0.5">
                            <button
                              type="button"
                              onClick={() => removeField(index)}
                              className="p-2 rounded-lg border border-border/60 hover:border-red/40 text-text2 hover:text-red hover:bg-red/10 transition-all duration-200"
                              title="Delete Item"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-12 gap-2.5 mt-2 items-end">
                        <div className="col-span-7">
                          <FormField control={form.control} name={`items.${index}.quality`} render={({ field: inputField }) => (
                            <FormItem className="space-y-1">
                              <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Quality / Grade</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. Premium, Fe500, M20" {...inputField} className="bg-surface border-border/60 h-9 px-3 text-xs focus-visible:ring-accent" />
                              </FormControl>
                            </FormItem>
                          )} />
                        </div>
                        
                        <div className="col-span-5">
                          <FormField control={form.control} name={`items.${index}.qty`} render={({ field: inputField }) => (
                            <FormItem className="space-y-1">
                              <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Qty</FormLabel>
                              <FormControl>
                                <Input type="number" {...inputField} className="bg-surface border-border/60 h-9 px-2 text-center text-xs focus-visible:ring-accent" />
                              </FormControl>
                              <FormMessage className="text-[10px] mt-0.5" />
                            </FormItem>
                          )} />
                        </div>
                      </div>
                    </div>
                ))}
              </div>

              {!editingRecord && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-dashed border-border/80 hover:border-accent hover:text-accent hover:bg-accent-light/10 h-9 transition-all duration-200 text-xs"
                  onClick={() => append({ name: '', qty: 0, quality: '' })}
                >
                  <Plus size={14} className="mr-1.5" /> Add More Items
                </Button>
              )}

              <datalist id="item-suggestions">
                {/* Cameras */}
                <option value="Dome Camera" />
                <option value="Bullet Camera" />
                <option value="PTZ Camera" />
                <option value="IP Camera" />
                <option value="Thermal Camera" />
                <option value="C-Mount Camera" />
                <option value="Wireless CCTV Camera" />
                <option value="HD CCTV Camera" />

                {/* Fire Extinguishers & Safety */}
                <option value="Water Fire Extinguisher" />
                <option value="Foam Fire Extinguisher" />
                <option value="Dry Powder Fire Extinguisher" />
                <option value="CO2 Fire Extinguisher" />
                <option value="Wet Chemical Fire Extinguisher" />
                <option value="Smoke Detector" />
                <option value="Heat Detector" />

                {/* Cables & Wires */}
                <option value="Coaxial Cable RG59" />
                <option value="Siamese CCTV Cable" />
                <option value="Cat5e Ethernet Cable" />
                <option value="Cat6 Ethernet Cable" />
                <option value="Cat7 Ethernet Cable" />
                <option value="Fiber Optic Cable" />
                <option value="Electrical Wire (1.5mm)" />
                <option value="Electrical Wire (2.5mm)" />

                {/* Standard Construction/Other */}
                <option value="Cement Bags" />
                <option value="Steel Rods (TMT)" />
                <option value="Safety Helmet (Hard Hat)" />
              </datalist>

              <div className="grid grid-cols-2 gap-4 pt-1">
                <FormField control={form.control} name="from" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Source</FormLabel>
                    <FormControl>
                      <Input placeholder="Warehouse A" {...field} className="bg-surface border-border/60 h-9 px-3 text-xs focus-visible:ring-accent" />
                    </FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="to" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Destination Site</FormLabel>
                    <FormControl>
                      <Input placeholder="Project X Site" {...field} className="bg-surface border-border/60 h-9 px-3 text-xs focus-visible:ring-accent" />
                    </FormControl>
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="project" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Project Ref</FormLabel>
                    <FormControl>
                      <Input
                        list="project-codes"
                        placeholder="Select or type code..."
                        {...field}
                        className="bg-surface border-border/60 h-9 px-3 text-xs focus-visible:ring-accent"
                      />
                    </FormControl>
                    <datalist id="project-codes">
                      {projects.map(p => (
                        <option key={p._id} value={p.code}>{p.code} – {p.name}</option>
                      ))}
                    </datalist>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} className="bg-surface border-border/60 h-9 px-3 text-xs focus-visible:ring-accent" />
                    </FormControl>
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
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
                        {['In Transit', 'Delivered', 'Reserved', 'Cancelled'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </div>

              <DialogFooter className="pt-3 border-t border-border/60 gap-2 sm:gap-0">
                <Button variant="outline" type="button" onClick={handleClose} className="h-9 px-4 border-border/80 text-text2 hover:text-text hover:bg-surface2/30 text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating || isUpdating} className="h-9 px-4 bg-accent hover:bg-accent/90 text-white font-semibold transition-all duration-200 text-xs">
                  {(isCreating || isUpdating) && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  {editingRecord ? 'Save Changes' : 'Confirm Transfer(s)'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
