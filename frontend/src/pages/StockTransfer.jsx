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
    qty: z.coerce.number().min(1, "Qty required")
  })).min(1, "At least one item required"),
  from: z.string().min(2, "Source is required"),
  to: z.string().min(2, "Destination is required"),
  project: z.string().min(1, "Project reference required"),
  date: z.string().min(1, "Date is required"),
  status: z.enum(['In Transit', 'Delivered', 'Reserved', 'Cancelled']).default('In Transit'),
});

export default function StockTransfer() {
  const { data: transfers, isLoading, create, bulkCreate, update, remove, isCreating, isUpdating } = useStock();
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

  useEffect(() => {
    const unregisterAdd = registerAddAction(() => {
      form.reset({
        items: [{ name: '', qty: 0 }],
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
        Items: (t.items || []).map(i => `${i.name} (x${i.qty})`).join(', '),
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
  }, [registerAddAction, registerDownloadAction, filteredTransfers]);

  const form = useForm({
    resolver: zodResolver(stockSchema),
    defaultValues: {
      items: [{ name: '', qty: 0 }],
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
      items: record.items || [{ name: '', qty: 0 }],
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
                ) : filteredTransfers.map((t, idx) => (
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
                        {(t.items || []).map(i => i.name).join(', ')}
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
        <DialogContent className="sm:max-w-[600px] bg-surface text-text">
          <DialogHeader>
            <DialogTitle className="font-bold">{editingRecord ? 'Update Transfer' : 'New Stock Transfer'}</DialogTitle>
            <DialogDescription className="text-xs text-text2">
              {editingRecord ? 'Modify the status or details of an existing stock movement.' : 'Initiate a new stock transfer from source to destination site.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col max-h-[75vh] py-2">
              <div className="flex-1 overflow-y-auto px-1 pr-3 space-y-4 custom-scrollbar">

                <div className="space-y-3 bg-surface2/30 p-3 rounded-xl border border-border">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex gap-3 items-start relative">
                      <FormField control={form.control} name={`items.${index}.name`} render={({ field: inputField }) => (
                        <FormItem className="flex-1">
                          <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Item Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Fire Extinguisher, Dome Camera..." list="item-suggestions" {...inputField} className="bg-surface2 h-9" />
                          </FormControl>
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name={`items.${index}.qty`} render={({ field: inputField }) => (
                        <FormItem className="w-[80px]">
                          <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Qty</FormLabel>
                          <FormControl><Input type="number" {...inputField} className="bg-surface2 h-9 text-center" /></FormControl>
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )} />
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => removeField(index)}
                          className="mt-6 p-1.5 rounded-md text-red hover:bg-red-light transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full h-9 border-2 border-dashed border-accent/20 text-accent hover:bg-accent/5 text-xs font-bold mt-2 rounded-xl transition-all"
                    onClick={() => append({ name: '', qty: 0 })}
                  >
                    <Plus size={14} className="mr-2" /> Add More Items
                  </Button>

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
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="from" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-text2">Source</FormLabel>
                      <FormControl><Input placeholder="Warehouse A" {...field} className="bg-surface2" /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="to" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-text2">Destination Site</FormLabel>
                      <FormControl><Input placeholder="Project X Site" {...field} className="bg-surface2" /></FormControl>
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="project" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-text2">Project Ref</FormLabel>
                      <FormControl>
                        <Input
                          list="project-codes"
                          placeholder="Select or type code..."
                          {...field}
                          className="bg-surface2"
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
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-text2">Date</FormLabel>
                      <FormControl><Input type="date" {...field} className="bg-surface2" /></FormControl>
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-text2">Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="bg-surface2"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent className="bg-surface border-border">
                          {['In Transit', 'Delivered', 'Reserved', 'Cancelled'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>
              </div>

              <DialogFooter className="pt-5 mt-2 border-t border-border shrink-0">
                <Button variant="outline" type="button" onClick={handleClose}>Cancel</Button>
                <Button type="submit" disabled={isCreating || isUpdating} className="bg-accent text-white">
                  {(isCreating || isUpdating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
