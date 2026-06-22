import React, { useState, useEffect } from 'react';
import { Plane, MapPin, Clock, Edit2, Trash2, Loader2, Plus, ArrowRight, Download, Check, ChevronDown, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTravel, useStaff } from '../hooks/useResource';
import { cn, formatDate } from '../lib/utils';
import { Skeleton } from '../components/ui/skeleton';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { useAction } from '../context/ActionContext';
import { downloadCSV } from '../lib/export';
import AnimatedCounter from '../components/AnimatedCounter';

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

const travelSchema = z.object({
  staffId: z.array(z.string()).min(1, "At least one traveler is required"),
  date: z.string().min(1, "Date is required"),
  from: z.string().min(2, "Origin is required"),
  to: z.string().min(2, "Destination is required"),
  travelDetails: z.array(z.object({
    mode: z.enum(['Car', 'Bike', 'Train', 'Bus', 'Auto', 'Flight', 'Walk']),
    distance: z.coerce.number().min(0, "Valid distance required"),
    duration: z.coerce.number().min(0, "Valid duration required"),
    cost: z.coerce.number().min(0, "Valid cost required"),
  })).min(1, "At least one transport mode is required"),
  purpose: z.string().min(3, "Purpose is required"),
});

const TravelerMultiSelect = ({ staffList, value = [], onChange }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedList = Array.isArray(value) ? value : (value ? [value] : []);

  const toggle = (id) => {
    const updated = selectedList.includes(id)
      ? selectedList.filter(v => v !== id)
      : [...selectedList, id];
    onChange(updated);
  };

  const selected = staffList.filter(s => selectedList.includes(s._id));
  const filteredStaff = staffList.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative" ref={dropdownRef}>
      <div 
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border border-border/60 bg-surface px-3 py-2 text-xs focus-within:ring-2 focus-within:ring-accent cursor-pointer",
          selected.length === 0 && "text-text3"
        )}
        onClick={() => setOpen(o => !o)}
      >
        <span className="truncate flex-1 text-left">
          {selected.length === 0
            ? "Choose traveler(s)..."
            : selected.length === 1
              ? selected[0].name
              : `${selected.length} travelers selected`}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50 text-text2 shrink-0 ml-2" />
      </div>

      {open && (
        <div className="absolute z-50 mt-1 max-h-[220px] w-full overflow-y-auto rounded-md border border-border bg-surface py-1 shadow-md custom-scrollbar flex flex-col">
          <div className="p-1.5 border-b border-border/60 shrink-0">
            <input
              type="text"
              className="w-full bg-surface2 border border-border/60 rounded px-2 py-1 text-xs outline-none text-text placeholder:text-text3"
              placeholder="Search traveler..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div className="overflow-y-auto max-h-[160px] py-1 flex-1">
            {filteredStaff.length > 0 ? filteredStaff.map(s => {
              const checked = selectedList.includes(s._id);
              return (
                <button
                  key={s._id}
                  type="button"
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-1.5 text-xs hover:bg-accent/10 hover:text-accent transition-colors text-left",
                    checked && "bg-accent/5 text-accent"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(s._id);
                  }}
                >
                  <div className={cn(
                    "w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 transition-colors",
                    checked ? "bg-accent border-accent" : "border-border"
                  )}>
                    {checked && <Check size={10} className="text-white" strokeWidth={3} />}
                  </div>
                  <span>{s.name}</span>
                </button>
              );
            }) : (
              <div className="py-2 px-3 text-xs text-text3 text-center">No traveler found</div>
            )}
          </div>
        </div>
      )}

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {selected.map(s => (
            <span
              key={s._id}
              className="inline-flex items-center gap-1 bg-accent/10 text-accent text-[10px] font-semibold px-2 py-0.5 rounded-full"
            >
              {s.name}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); toggle(s._id); }}
                className="hover:text-red ml-0.5 shrink-0"
              >
                <X size={9} strokeWidth={3} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default function TravelHistory() {
  const { data: trips, isLoading, create, update, remove, isCreating, isUpdating } = useTravel();
  const { staffList } = useStaff();
  const { registerAddAction, registerDownloadAction, searchQuery, dateFilter, setDateFilter, isFilterOpen } = useAction();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  const filteredTrips = (trips || []).filter(trip => {
    const q = searchQuery.toLowerCase();
    const members = Array.isArray(trip.staffId) ? trip.staffId : (trip.staffId ? [trip.staffId] : []);
    const staffNames = members.map(m => m?.name || '').join(' ').toLowerCase();
    const matchesSearch = !searchQuery || 
                          staffNames.includes(q) ||
                          (trip.from?.toLowerCase() || '').includes(q) ||
                          (trip.to?.toLowerCase() || '').includes(q) ||
                          (trip.purpose?.toLowerCase() || '').includes(q);
    // Only apply date filter when the filter panel is open
    const matchesDate = !isFilterOpen || !dateFilter || trip.date?.split('T')[0] === dateFilter;
    return matchesSearch && matchesDate;
  });

  const handleDownloadCSV = React.useCallback(() => {
    const exportData = trips.map(t => {
      const details = t.travelDetails || [];
      const totalDistance = details.reduce((acc, curr) => acc + (Number(curr.distance) || 0), 0) || Number(t.distance) || 0;
      const totalDuration = details.reduce((acc, curr) => acc + (Number(curr.duration) || 0), 0) || Number(t.duration) || 0;
      const totalCost = details.reduce((acc, curr) => acc + (Number(curr.cost) || 0), 0) || Number(t.cost) || 0;
      const modes = details.map(d => d.mode).join(', ') || t.mode || '';
      const members = Array.isArray(t.staffId) ? t.staffId : (t.staffId ? [t.staffId] : []);
      const staffNames = members.map(m => m?.name || 'Unknown').join(', ');

      return {
        StaffName: staffNames,
        Date: formatDate(t.date, { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-'),
        Mode: modes,
        From: t.from,
        To: t.to,
        Distance: totalDistance,
        Duration: totalDuration,
        Cost: totalCost,
        Purpose: t.purpose
      };
    });
    downloadCSV(exportData, 'Travel_History_Full_Report');
  }, [trips]);

  const form = useForm({
    resolver: zodResolver(travelSchema),
    defaultValues: {
      staffId: [],
      date: dateFilter,
      from: '',
      to: '',
      travelDetails: [{ mode: 'Car', distance: 0, duration: 0, cost: 0 }],
      purpose: '',
    },
  });
  
  const { fields, append, remove: removeField } = useFieldArray({
    control: form.control,
    name: "travelDetails"
  });

  useEffect(() => {
    const unregisterAdd = registerAddAction(() => {
      form.reset({
        staffId: [],
        date: dateFilter,
        from: '',
        to: '',
        travelDetails: [{ mode: 'Car', distance: 0, duration: 0, cost: 0 }],
        purpose: '',
      });
      setEditingRecord(null);
      setIsModalOpen(true);
    });
    const unregisterDownload = registerDownloadAction(handleDownloadCSV);
    return () => {
      unregisterAdd();
      unregisterDownload();
    };
  }, [registerAddAction, registerDownloadAction, dateFilter, handleDownloadCSV, form]);

  const onSubmit = async (values) => {
    try {
      if (editingRecord) {
        await update({ id: editingRecord._id, data: values });
        setDateFilter(values.date);
        toast.success("Travel log updated");
      } else {
        await create(values);
        setDateFilter(values.date);
        toast.success("Travel successfully logged");
      }
      handleClose();
    } catch (error) {
      toast.error(error.message || "Failed to log travel");
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    const members = Array.isArray(record.staffId)
      ? record.staffId.map(m => m?._id || m).filter(Boolean)
      : record.staffId
        ? [record.staffId?._id || record.staffId]
        : [];

    form.reset({
      staffId: members,
      date: record.date,
      from: record.from,
      to: record.to,
      travelDetails: record.travelDetails && record.travelDetails.length > 0
        ? record.travelDetails
        : [{ mode: record.mode || 'Car', distance: record.distance || 0, duration: record.duration || 0, cost: record.cost || 0 }],
      purpose: record.purpose,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this travel record?")) {
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
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { 
            label: 'Total Trips', 
            value: trips.length, 
            prefix: '',
            suffix: '',
            icon: MapPin, 
            color: 'text-teal bg-teal-light',
            onClick: () => setIsHistoryOpen(true),
            clickable: true
          },
          { 
            label: 'Total Distance', 
            value: trips.reduce((acc, t) => acc + ((t.travelDetails || []).reduce((a, c) => a + (Number(c.distance) || 0), 0) || Number(t.distance) || 0), 0),
            prefix: '',
            suffix: ' km',
            icon: Plane, 
            color: 'text-blue bg-blue-light' 
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
              <div className="text-xl font-bold">
                <AnimatedCounter value={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr className="bg-surface2/50 border-b border-border">
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-text3">Traveler & Mode</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-text3">Route</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-text3">Logistics</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-text3">Date</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-text3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="border-b border-border"><td colSpan={4} className="p-4"><Skeleton className="h-12 w-full" /></td></tr>
                  ))
                ) : filteredTrips.map((trip) => {
                  const members = Array.isArray(trip.staffId) ? trip.staffId.filter(Boolean) : (trip.staffId ? [trip.staffId] : []);
                  return (
                    <motion.tr 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      key={trip._id} 
                      className="border-b border-border last:border-0 hover:bg-surface2/30 transition-all group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {/* Overlapping Avatars */}
                          <div className="flex -space-x-2 shrink-0">
                            {members.slice(0, 3).map((m, i) => (
                              <div
                                key={m._id || i}
                                className="w-7 h-7 rounded-full border-2 border-surface flex items-center justify-center text-[9px] font-bold"
                                style={{
                                  background: (m.color || '#3B6CF6') + '20',
                                  color: m.color || '#3B6CF6'
                                }}
                                title={m.name}
                              >
                                {m.initials || m.name?.slice(0, 2).toUpperCase()}
                              </div>
                            ))}
                            {members.length > 3 && (
                              <div className="w-7 h-7 rounded-full bg-surface2 border-2 border-surface flex items-center justify-center text-[9px] font-bold text-text3">
                                +{members.length - 3}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-[13.5px] font-medium text-text">
                              {members.length === 0
                                ? 'Unknown'
                                : members.length === 1
                                  ? members[0]?.name || 'Unknown'
                                  : `${members[0]?.name || '?'} +${members.length - 1}`}
                            </div>
                            <div className="text-[11px] text-teal font-bold uppercase tracking-wide truncate max-w-[120px]">
                              {(trip.travelDetails || []).map(d => d.mode).join(', ') || trip.mode}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-[13.5px] font-medium text-text">
                          {trip.from} <ArrowRight size={12} className="text-text3" /> {trip.to}
                        </div>
                        <div className="text-[11px] text-text3 mt-1 uppercase tracking-wider">{trip.purpose}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-[13px] font-bold text-text mb-0.5">
                          {(trip.travelDetails || []).reduce((acc, curr) => acc + (curr.distance || 0), 0) || trip.distance} km
                        </div>
                        <div className="text-[11px] text-text2">
                          {(trip.travelDetails || []).reduce((acc, curr) => acc + (curr.duration || 0), 0) || trip.duration} min • ₹{(trip.travelDetails || []).reduce((acc, curr) => acc + (curr.cost || 0), 0) || trip.cost}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-[12px] font-bold text-text mb-0.5 uppercase tracking-tighter">{formatDate(trip.date)}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => handleEdit(trip)} className="p-2 rounded-lg text-text2 hover:bg-accent-light hover:text-accent">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDelete(trip._id)} className="p-2 rounded-lg text-text2 hover:bg-red-light hover:text-red">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[800px] bg-surface text-text border border-border/80 shadow-2xl rounded-xl overflow-hidden p-0 flex flex-col max-h-[90vh]">
          <div className="p-4 px-5 border-b border-border/60 bg-surface2/25 shrink-0">
            <DialogHeader className="space-y-0.5">
              <DialogTitle className="text-lg font-bold tracking-tight text-text">
                {editingRecord ? 'Edit Travel Log' : 'New Travel Request'}
              </DialogTitle>
              <DialogDescription className="text-xs text-text2">
                {editingRecord ? 'Update the route, cost, or purpose of this travel record.' : 'Submit a new travel request including origin, destination, and modes of transport.'}
              </DialogDescription>
            </DialogHeader>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
              <FormField control={form.control} name="staffId" render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Travellers</FormLabel>
                   <FormControl>
                    <TravelerMultiSelect staffList={staffList} value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage className="text-[10px] mt-0.5" />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="from" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">From</FormLabel>
                    <FormControl>
                      <Input list="from-locations" placeholder="Select or type..." {...field} className="bg-surface border-border/60 h-9 px-3 text-xs focus-visible:ring-accent" />
                    </FormControl>
                    <datalist id="from-locations">
                      {['Office', 'Site A', 'Site B', 'Site C', 'Warehouse', 'Client Office'].map(loc => (
                        <option key={loc} value={loc} />
                      ))}
                    </datalist>
                    <FormMessage className="text-[10px] mt-0.5" />
                  </FormItem>
                )} />
                <FormField control={form.control} name="to" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">To</FormLabel>
                    <FormControl>
                      <Input list="to-locations" placeholder="Select or type..." {...field} className="bg-surface border-border/60 h-9 px-3 text-xs focus-visible:ring-accent" />
                    </FormControl>
                    <datalist id="to-locations">
                      {['Office', 'Site A', 'Site B', 'Site C', 'Warehouse', 'Client Office'].map(loc => (
                        <option key={loc} value={loc} />
                      ))}
                    </datalist>
                    <FormMessage className="text-[10px] mt-0.5" />
                  </FormItem>
                )} />
              </div>
              <div className="space-y-3 border border-border rounded-xl p-3 bg-surface2/10">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-accent flex items-center gap-2">
                    <Plus size={14} className="text-accent" /> Travel Legs
                  </h4>
                  <Button type="button" variant="ghost" size="sm" onClick={() => append({ mode: 'Car', distance: 0, duration: 0, cost: 0 })} className="h-7 text-[10px] font-bold text-accent hover:bg-accent-light px-2 rounded-md">
                    <Plus size={12} className="mr-1" /> Add Leg
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-12 gap-2 items-end group relative border-b border-border/50 pb-3 last:border-0 last:pb-0">
                      <div className="col-span-12 md:col-span-4">
                        <FormField control={form.control} name={`travelDetails.${index}.mode`} render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-[9px] font-bold uppercase tracking-tighter text-text2">Transport Mode</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-surface h-9 text-[11px] border-border/60">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-surface border-border">
                                {['Car', 'Bike', 'Train', 'Bus', 'Auto', 'Flight', 'Walk'].map(m => (
                                  <SelectItem key={m} value={m}>{m}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )} />
                      </div>
                      <div className="col-span-3 md:col-span-2">
                         <FormField control={form.control} name={`travelDetails.${index}.distance`} render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-[9px] font-bold uppercase tracking-tighter text-text2">Dist (km)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.1" {...field} className="bg-surface h-9 text-[11px] border-border/60 text-center" />
                            </FormControl>
                            <FormMessage className="text-[9px]" />
                          </FormItem>
                        )} />
                      </div>
                      <div className="col-span-3 md:col-span-2">
                         <FormField control={form.control} name={`travelDetails.${index}.duration`} render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-[9px] font-bold uppercase tracking-tighter text-text2">Dur (min)</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} className="bg-surface h-9 text-[11px] border-border/60 text-center" />
                            </FormControl>
                            <FormMessage className="text-[9px]" />
                          </FormItem>
                        )} />
                      </div>
                      <div className="col-span-3 md:col-span-3">
                         <FormField control={form.control} name={`travelDetails.${index}.cost`} render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-[9px] font-bold uppercase tracking-tighter text-text2">Cost (₹)</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} className="bg-surface h-9 text-[11px] border-border/60 text-center" />
                            </FormControl>
                            <FormMessage className="text-[9px]" />
                          </FormItem>
                        )} />
                      </div>
                      <div className="col-span-3 md:col-span-1 pb-0.5">
                        {fields.length > 1 && (
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeField(index)} className="h-8 w-8 text-red hover:bg-red-light rounded-md">
                            <Trash2 size={14} />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
               <FormField control={form.control} name="purpose" render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Purpose</FormLabel>
                  <FormControl>
                    <Input list="purpose-options" placeholder="Select or type..." {...field} className="bg-surface border-border/60 h-9 px-3 text-xs focus-visible:ring-accent" />
                  </FormControl>
                  <datalist id="purpose-options">
                    {['Client Meeting', 'Site Inspection', 'Material Pickup', 'Maintenance', 'Training', 'Other'].map(p => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                  <FormMessage className="text-[10px] mt-0.5" />
                </FormItem>
              )} />
              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Trip Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} className="bg-surface border-border/60 h-9 px-3 text-xs focus-visible:ring-accent" />
                  </FormControl>
                  <FormMessage className="text-[10px] mt-0.5" />
                </FormItem>
              )} />
              </div>
              <DialogFooter className="p-4 border-t border-border/60 gap-2 sm:gap-0 bg-surface shrink-0">
                <Button variant="outline" type="button" onClick={handleClose} className="h-9 px-4 border-border/80 text-text2 hover:text-text hover:bg-surface2/30 text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating || isUpdating} className="h-9 px-4 bg-accent hover:bg-accent/90 text-white font-semibold transition-all duration-200 text-xs">
                  {(isCreating || isUpdating) && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  {editingRecord ? 'Save Changes' : 'Log Trip'}
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
              <Clock className="text-accent" size={18} /> Detailed Travel History
            </DialogTitle>
            <DialogDescription className="text-[12px] text-text2">Full record of all movements and logistics logged in the system.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto border border-border rounded-lg bg-surface2/20">
            <table className="w-full text-left border-collapse text-[12px] min-w-[550px]">
              <thead className="sticky top-0 bg-surface border-b border-border z-10">
                <tr>
                  <th className="px-4 py-3 font-bold uppercase text-text3 whitespace-nowrap">Staff</th>
                  <th className="px-4 py-3 font-bold uppercase text-text3 whitespace-nowrap">Route & Purpose</th>
                  <th className="px-4 py-3 font-bold uppercase text-text3 whitespace-nowrap">Logistics</th>
                  <th className="px-4 py-3 font-bold uppercase text-text3 whitespace-nowrap text-right">Date</th>
                </tr>
              </thead>
              <tbody>
                {trips.length === 0 ? (
                  <tr><td colSpan={4} className="p-8 text-center text-text3">No trips found.</td></tr>
                ) : trips.map(trip => {
                  const members = Array.isArray(trip.staffId) ? trip.staffId : (trip.staffId ? [trip.staffId] : []);
                  return (
                    <tr key={trip._id} className="border-b border-border/50 hover:bg-surface2/40 transition-colors">
                      <td className="px-4 py-3 font-medium text-text">
                        {members.map(m => m?.name || 'Unknown').join(', ')}
                      </td>
                      <td className="px-4 py-3 text-text2">
                         <div className="flex items-center gap-1.5 font-bold text-text">
                          {trip.from} <ArrowRight size={10} className="text-text3" /> {trip.to}
                        </div>
                        <div className="text-[10px] uppercase font-medium mt-0.5 opacity-70">{trip.purpose}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-bold text-teal">
                          {(trip.travelDetails || []).reduce((a, c) => a + (Number(c.distance) || 0), 0) || Number(trip.distance) || 0} km
                        </div>
                        <div className="text-[11px] text-text3 font-mono">
                          ₹{(trip.travelDetails || []).reduce((a, c) => a + (Number(c.cost) || 0), 0) || Number(trip.cost) || 0}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-text2 uppercase tracking-tighter">
                        {formatDate(trip.date, { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <DialogFooter className="mt-4 pt-3 border-t border-border">
            <Button variant="outline" onClick={() => setIsHistoryOpen(false)}>Close</Button>
            <Button 
              className="bg-green hover:bg-green-dark text-white gap-2"
              onClick={handleDownloadCSV}
            >
              <Download size={14} /> Download CSV Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
