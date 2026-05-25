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
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[650px]">
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
      </div>

       <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[620px] bg-surface text-text border border-border/80 shadow-2xl rounded-xl overflow-hidden p-0">
          <div className="p-4 px-5 border-b border-border/60 bg-surface2/25">
            <DialogHeader className="space-y-0.5">
              <DialogTitle className="text-lg font-bold tracking-tight text-text">
                {editingRecord ? 'Update Usage Record' : 'Log Daily Material Usage'}
              </DialogTitle>
              <DialogDescription className="text-xs text-text2">
                {editingRecord 
                  ? 'Modify the material quantities and details for this entry.' 
                  : 'Log the quantities of materials used, wasted, and returned at the site today.'}
              </DialogDescription>
            </DialogHeader>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-5 space-y-4">
              {/* Project Reference Selection */}
              <div className="bg-surface2/10 p-3 border border-border/40 rounded-lg">
                <FormField control={form.control} name="project" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-accent">Project Reference</FormLabel>
                    <FormControl>
                      <Input
                        list="mat-project-codes"
                        placeholder="Type or select project code..."
                        {...field}
                        className="bg-surface border-border/60 h-9 px-3 text-xs focus-visible:ring-accent transition-all duration-200"
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

              {/* Items List Container */}
              <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-1.5 custom-scrollbar">
                {fields.map((field, index) => {
                  const isCustomItem = form.watch(`items.${index}.isCustom`);
                  return (
                    <div 
                      key={field.id} 
                      className="p-3 border border-border/60 rounded-xl bg-surface2/10 transition-all duration-200 hover:border-accent/40"
                    >
                      <div className="grid grid-cols-12 gap-2.5 items-end">
                        {/* Item Name (5 or 6 cols) */}
                        <div className={cn("space-y-1.5", fields.length > 1 && !editingRecord ? "col-span-5" : "col-span-6")}>
                          <FormField control={form.control} name={`items.${index}.item`} render={({ field: itemField }) => (
                            <FormItem className="space-y-1">
                              <div className="flex justify-between items-center">
                                <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Item Name</FormLabel>
                                {isCustomItem && (
                                  <button 
                                    type="button" 
                                    onClick={() => { 
                                      form.setValue(`items.${index}.isCustom`, false); 
                                      form.setValue(`items.${index}.item`, ''); 
                                    }}
                                    className="text-[9px] font-bold text-accent hover:underline flex items-center gap-0.5"
                                  >
                                    <Plus size={8} className="rotate-45" /> Select List
                                  </button>
                                )}
                              </div>
                              {isCustomItem ? (
                                <FormControl>
                                  <Input 
                                    placeholder="Custom item name..." 
                                    {...itemField} 
                                    className="bg-surface border-border/60 h-9 px-2.5 text-xs focus-visible:ring-accent" 
                                    autoFocus 
                                  />
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
                                    <SelectTrigger className="bg-surface border-border/60 h-9 text-xs">
                                      <SelectValue placeholder="Select Item" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="bg-surface border-border max-h-[200px] w-[var(--radix-select-trigger-width)]">
                                    {ITEM_CATEGORIES.map((category, idx) => (
                                      <SelectGroup key={category.label}>
                                        {idx > 0 && <SelectSeparator />}
                                        <SelectLabel className="text-accent text-[9px] uppercase tracking-widest px-2.5 py-1">{category.label}</SelectLabel>
                                        {category.items.map(item => (
                                          <SelectItem key={item} value={item} className="text-xs py-1 pl-6">{item}</SelectItem>
                                        ))}
                                      </SelectGroup>
                                    ))}
                                    <SelectSeparator />
                                    <SelectItem value="___custom___" className="font-bold text-accent focus:text-white text-xs py-1 pl-6">
                                      + Others (Type Manually)
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                              <FormMessage className="text-[10px] mt-0.5" />
                            </FormItem>
                          )} />
                        </div>

                        {/* Quantities (Used, Wasted, Returned) */}
                        <div className="col-span-2 space-y-1">
                          <FormField control={form.control} name={`items.${index}.used`} render={({ field: usedField }) => (
                            <FormItem className="space-y-1">
                              <FormLabel className="text-[9px] font-bold uppercase tracking-wider text-text2 flex items-center gap-1">
                                <span className="w-1 h-1 rounded-full bg-blue" /> Used
                              </FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  {...usedField} 
                                  className="bg-surface border-border/60 h-9 px-2 text-xs focus-visible:ring-accent" 
                                />
                              </FormControl>
                            </FormItem>
                          )} />
                        </div>

                        <div className="col-span-2 space-y-1">
                          <FormField control={form.control} name={`items.${index}.wasted`} render={({ field: wastedField }) => (
                            <FormItem className="space-y-1">
                              <FormLabel className="text-[9px] font-bold uppercase tracking-wider text-text2 flex items-center gap-1">
                                <span className="w-1 h-1 rounded-full bg-red" /> Wasted
                              </FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  {...wastedField} 
                                  className="bg-surface border-border/60 h-9 px-2 text-xs focus-visible:ring-accent" 
                                />
                              </FormControl>
                            </FormItem>
                          )} />
                        </div>

                        <div className="col-span-2 space-y-1">
                          <FormField control={form.control} name={`items.${index}.returned`} render={({ field: returnedField }) => (
                            <FormItem className="space-y-1">
                              <FormLabel className="text-[9px] font-bold uppercase tracking-wider text-text2 flex items-center gap-1">
                                <span className="w-1 h-1 rounded-full bg-green" /> Returned
                              </FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  {...returnedField} 
                                  className="bg-surface border-border/60 h-9 px-2 text-xs focus-visible:ring-accent" 
                                />
                              </FormControl>
                            </FormItem>
                          )} />
                        </div>

                        {/* Delete Button */}
                        {fields.length > 1 && !editingRecord && (
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
                    </div>
                  );
                })}
              </div>

              {/* Add Item Button */}
              {!editingRecord && (
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full border-dashed border-border/80 hover:border-accent hover:text-accent hover:bg-accent-light/10 h-9 transition-all duration-200 text-xs" 
                  onClick={() => append({ item: '', used: 0, wasted: 0, returned: 0, isCustom: false })}
                >
                  <Plus size={14} className="mr-1.5" /> Add Another Item
                </Button>
              )}

              {/* Date & Logged By details */}
              <div className="grid grid-cols-2 gap-4 pt-1">
                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Date</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        className="bg-surface border-border/60 h-9 px-3 text-xs focus-visible:ring-accent" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="loggedBy" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Logged By</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Manager Name" 
                        {...field} 
                        className="bg-surface border-border/60 h-9 px-3 text-xs focus-visible:ring-accent" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Modal Footer Actions */}
              <DialogFooter className="pt-3 border-t border-border/60 gap-2 sm:gap-0">
                <Button 
                  variant="outline" 
                  type="button" 
                  onClick={handleClose}
                  className="h-9 px-4 border-border/80 text-text2 hover:text-text hover:bg-surface2/30 text-xs"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isCreating || isUpdating} 
                  className="h-9 px-4 bg-accent hover:bg-accent/90 text-white font-semibold transition-all duration-200 text-xs"
                >
                  {(isCreating || isUpdating) && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
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
