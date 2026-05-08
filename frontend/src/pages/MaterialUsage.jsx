import React, { useState, useEffect } from 'react';
import { Box, Recycle, AlertCircle, Edit2, Trash2, Loader2, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMaterials, useProjects } from '../hooks/useResource';
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
  SelectGroup,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

const ITEM_CATEGORIES = [
  {
    label: "CCTV Cameras",
    items: [
      "Dome Camera",
      "Bullet Camera",
      "PTZ Camera",
      "IP / Network Camera",
      "Wireless Camera",
      "Thermal Camera",
    ],
  },
  {
    label: "Fire Extinguishers",
    items: [
      "Water Extinguisher",
      "Foam Extinguisher",
      "Dry Powder Extinguisher",
      "CO2 Extinguisher",
      "Wet Chemical Extinguisher",
    ],
  },
  {
    label: "Construction Materials",
    items: [
      "Cement Bags",
      "Steel Rods",
      "Bricks",
      "Sand (m3)",
      "Gravel (m3)",
    ],
  }
];
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";

const materialSchema = z.object({
  project: z.string().min(1, "Project reference required"),
  items: z.array(z.object({
    item: z.string().min(2, "Item name is required"),
    used: z.coerce.number().min(0, "Used quantity required"),
    wasted: z.coerce.number().min(0, "Wasted quantity required"),
    returned: z.coerce.number().min(0, "Returned quantity required"),
    isCustom: z.boolean().optional(),
  })).min(1, "At least one item is required"),
  date: z.string().min(1, "Date is required"),
  loggedBy: z.string().min(2, "Logged by name required"),
});

export default function MaterialUsage() {
  const { data: usage, isLoading, create, bulkCreate, update, remove, isCreating, isUpdating } = useMaterials();
  const { data: projects } = useProjects();
  const { registerAddAction, registerDownloadAction, searchQuery, dateFilter } = useAction();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  const flatItems = ITEM_CATEGORIES.flatMap(c => c.items);

  const filteredUsage = (usage || []).filter(u => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
                          u.item?.toLowerCase().includes(q) ||
                          u.project?.toLowerCase().includes(q) ||
                          u.loggedBy?.toLowerCase().includes(q);
    return matchesSearch;
  });

  useEffect(() => {
    const unregisterAdd = registerAddAction(() => setIsModalOpen(true));
    const unregisterDownload = registerDownloadAction(() => {
      const exportData = filteredUsage.map(u => ({
        Project: u.project,
        Item: u.item,
        Used: u.used,
        Wasted: u.wasted,
        Returned: u.returned,
        Date: u.date,
        LoggedBy: u.loggedBy
      }));
      downloadCSV(exportData, 'Material_Usage');
    });
    return () => {
      unregisterAdd();
      unregisterDownload();
    };
  }, [registerAddAction, registerDownloadAction, filteredUsage]);

  const form = useForm({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      project: '',
      items: [{ item: '', used: 0, wasted: 0, returned: 0, isCustom: false }],
      date: dateFilter,
      loggedBy: 'Site Manager',
    },
  });

  const { fields, append, remove: removeField } = useFieldArray({
    control: form.control,
    name: "items"
  });

  // Auto-fill loggedBy from project manager when a project code is selected
  const watchedProjectCode = form.watch('project');
  React.useEffect(() => {
    if (!watchedProjectCode || editingRecord) return;
    const matched = projects.find(
      p => p.code?.trim().toLowerCase() === watchedProjectCode.trim().toLowerCase()
    );
    if (matched?.manager) {
      form.setValue('loggedBy', matched.manager, { shouldValidate: false });
    }
  }, [watchedProjectCode, projects, editingRecord]);

  const onSubmit = async (values) => {
    try {
      if (editingRecord) {
        const updatedData = {
          project: values.project,
          date: values.date,
          loggedBy: values.loggedBy,
          item: values.items[0].item,
          used: values.items[0].used,
          wasted: values.items[0].wasted,
          returned: values.items[0].returned,
        };
        await update({ id: editingRecord._id, data: updatedData });
        toast.success("Usage record updated");
      } else {
        const bulkData = values.items.map(i => ({
          project: values.project,
          date: values.date,
          loggedBy: values.loggedBy,
          item: i.item,
          used: i.used,
          wasted: i.wasted,
          returned: i.returned,
        }));
        await bulkCreate(bulkData);
        toast.success("Usage logged successfully");
      }
      handleClose();
    } catch (error) {
      toast.error(error.message || "Failed to log usage");
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    const isCustom = record.item && !flatItems.includes(record.item);
    form.reset({
      project: record.project,
      items: [{
        item: record.item,
        used: record.used,
        wasted: record.wasted,
        returned: record.returned,
        isCustom: isCustom
      }],
      date: record.date,
      loggedBy: record.loggedBy,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this material usage record?")) {
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
    form.reset({
      project: '',
      items: [{ item: '', used: 0, wasted: 0, returned: 0, isCustom: false }],
      date: dateFilter,
      loggedBy: 'Site Manager',
    });
  };

  const totalUsed = usage.reduce((acc, curr) => acc + curr.used, 0);
  const totalWasted = usage.reduce((acc, curr) => acc + curr.wasted, 0);
  const efficiency = totalUsed > 0 ? ((totalUsed / (totalUsed + totalWasted)) * 100).toFixed(0) : '0';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { label: 'Avg. Efficiency', value: `${efficiency}%`, icon: Recycle, color: 'text-green bg-green-light' },
          { label: 'High Wastage Alerts', value: usage.filter(u => u.wasted > (u.used * 0.1)).length, icon: AlertCircle, color: 'text-red bg-red-light' },
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
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface2/50 border-b border-border">
              <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-text3">Item & Project</th>
              <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-text3">Consumption Details</th>
              <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-text3">Logistics</th>
              <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-text3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="border-b border-border"><td colSpan={4} className="p-4"><Skeleton className="h-12 w-full" /></td></tr>
                ))
              ) : filteredUsage.map((u, idx) => (
                <motion.tr 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  key={u._id} 
                  className="border-b border-border last:border-0 hover:bg-surface2/30 transition-all group"
                >
                  <td className="px-6 py-4">
                    <div className="text-[14px] font-bold text-text mb-0.5">{u.item}</div>
                    <div className="text-[11px] font-bold text-accent uppercase tracking-widest">{u.project}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="text-[13px] font-medium text-text flex justify-between items-center pr-10">
                        <span>Used:</span> <span className="font-bold">{u.used} Units</span>
                      </div>
                      <div className="text-[11px] text-red flex justify-between items-center pr-10">
                        <span>Wasted:</span> <span>{u.wasted} Units</span>
                      </div>
                      <div className="text-[11px] text-green flex justify-between items-center pr-10">
                        <span>Returned:</span> <span>{u.returned} Units</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-[12px] font-bold text-text mb-0.5">By {u.loggedBy}</div>
                    <div className="text-[11px] text-text3 font-mono uppercase tracking-tighter">{formatDate(u.date)}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => handleEdit(u)} className="p-2 rounded-lg text-text2 hover:bg-accent-light hover:text-accent">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(u._id)} className="p-2 rounded-lg text-text2 hover:bg-red-light hover:text-red">
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
        <DialogContent className="sm:max-w-[480px] bg-surface text-text">
          <DialogHeader>
            <DialogTitle className="font-bold">{editingRecord ? 'Update Usage' : 'Log Daily Usage'}</DialogTitle>
            <DialogDescription className="text-xs text-text2">
              {editingRecord ? 'Modify the usage, wastage, and return quantities for this entry.' : 'Log the quantities of materials used, wasted, and returned at the site today.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                 <FormField control={form.control} name="project" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-text2">Project Reference</FormLabel>
                    <FormControl>
                      <Input
                        list="mat-project-codes"
                        placeholder="Select or type code..."
                        {...field}
                        className="bg-surface2"
                      />
                    </FormControl>
                    <datalist id="mat-project-codes">
                      {projects.map(p => (
                        <option key={p._id} value={p.code}>{p.code} – {p.name}</option>
                      ))}
                    </datalist>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>


              <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                {fields.map((field, index) => {
                  const isCustomItem = form.watch(`items.${index}.isCustom`);
                  return (
                    <div key={field.id} className="p-4 border border-border rounded-lg bg-surface2/30 space-y-4 relative">
                      {fields.length > 1 && !editingRecord && (
                        <button type="button" onClick={() => removeField(index)} className="absolute top-2 right-2 text-text2 hover:text-red">
                          <Trash2 size={16} />
                        </button>
                      )}
                      
                      <FormField control={form.control} name={`items.${index}.item`} render={({ field: itemField }) => (
                        <FormItem>
                          <div className="flex justify-between items-center mb-1">
                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-text2">Item Name</FormLabel>
                            {isCustomItem && (
                              <button 
                                type="button" 
                                onClick={() => { 
                                  form.setValue(`items.${index}.isCustom`, false); 
                                  itemField.onChange(''); 
                                }}
                                className="text-[10px] font-bold text-accent hover:underline flex items-center gap-1"
                              >
                                <Plus size={10} className="rotate-45" /> Back to Selection
                              </button>
                            )}
                          </div>
                          {isCustomItem ? (
                            <FormControl>
                              <Input placeholder="Enter custom item name" {...itemField} className="bg-surface2" autoFocus />
                            </FormControl>
                          ) : (
                            <Select 
                              onValueChange={(val) => {
                                if (val === "___custom___") {
                                  form.setValue(`items.${index}.isCustom`, true);
                                  itemField.onChange("");
                                } else {
                                  itemField.onChange(val);
                                }
                              }} 
                              value={itemField.value}
                            >
                              <FormControl>
                                <SelectTrigger className="bg-surface2">
                                  <SelectValue placeholder="Select Item" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-surface border-border max-h-[280px] w-[var(--radix-select-trigger-width)]">
                                {ITEM_CATEGORIES.map((category, idx) => (
                                  <SelectGroup key={category.label}>
                                    {idx > 0 && <SelectSeparator />}
                                    <SelectLabel className="text-accent text-[10px] uppercase tracking-widest">{category.label}</SelectLabel>
                                    {category.items.map(item => (
                                      <SelectItem key={item} value={item}>{item}</SelectItem>
                                    ))}
                                  </SelectGroup>
                                ))}
                                <SelectSeparator />
                                <SelectItem value="___custom___" className="font-bold text-accent focus:text-white">
                                  + Others (Type Manually)
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          <FormMessage />
                        </FormItem>
                      )} />

                      <div className="grid grid-cols-3 gap-2">
                        <FormField control={form.control} name={`items.${index}.used`} render={({ field: usedField }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase tracking-tighter text-text2">Used</FormLabel>
                            <FormControl><Input type="number" {...usedField} className="bg-surface2" /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name={`items.${index}.wasted`} render={({ field: wastedField }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase tracking-tighter text-text2">Wasted</FormLabel>
                            <FormControl><Input type="number" {...wastedField} className="bg-surface2" /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name={`items.${index}.returned`} render={({ field: returnedField }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase tracking-tighter text-text2">Returned</FormLabel>
                            <FormControl><Input type="number" {...returnedField} className="bg-surface2" /></FormControl>
                          </FormItem>
                        )} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {!editingRecord && (
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full border-dashed border-border" 
                  onClick={() => append({ item: '', used: 0, wasted: 0, returned: 0, isCustom: false })}
                >
                  <Plus size={16} className="mr-2" /> Add Another Item
                </Button>
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-text2">Date</FormLabel>
                    <FormControl><Input type="date" {...field} className="bg-surface2" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="loggedBy" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-text2">Logged By</FormLabel>
                    <FormControl><Input placeholder="Manager Name" {...field} className="bg-surface2" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <DialogFooter className="pt-4">
                <Button variant="outline" type="button" onClick={handleClose}>Cancel</Button>
                <Button type="submit" disabled={isCreating || isUpdating} className="bg-accent text-white">
                  {(isCreating || isUpdating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingRecord ? 'Save Changes' : 'Confirm Usage'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
