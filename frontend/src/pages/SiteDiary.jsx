import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen, Sun, Cloud, CloudRain, Wind, CloudSnow, Eye,
  Users, Edit2, Trash2, Loader2, Plus, ChevronDown, ChevronUp,
  Wrench, AlertTriangle, CalendarDays, ClipboardCheck, HardHat,
  Image, X, Paperclip, PackageOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSiteDiary, useProjects } from '../hooks/useResource';
import { cn, formatDate } from '../lib/utils';
import { Skeleton } from '../components/ui/skeleton';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { useAction } from '../context/ActionContext';
import { downloadCSV } from '../lib/export';
import AnimatedCounter from '../components/AnimatedCounter';
import { uploadService } from '../services/api';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';

// ── Weather Config ──────────────────────────────────────────────────────────
const WEATHER_OPTIONS = [
  { value: 'Sunny',  label: 'Sunny',  icon: Sun,        color: 'text-amber' },
  { value: 'Cloudy', label: 'Cloudy', icon: Cloud,       color: 'text-text3' },
  { value: 'Rainy',  label: 'Rainy',  icon: CloudRain,   color: 'text-accent' },
  { value: 'Windy',  label: 'Windy',  icon: Wind,        color: 'text-cyan-500' },
  { value: 'Stormy', label: 'Stormy', icon: CloudSnow,   color: 'text-red' },
  { value: 'Foggy',  label: 'Foggy',  icon: Eye,         color: 'text-text2' },
];

const getWeather = (val) => WEATHER_OPTIONS.find(w => w.value === val) || WEATHER_OPTIONS[0];

// ── Zod Schema ───────────────────────────────────────────────────────────────
const siteDiarySchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  date: z.string().min(1, 'Date is required'),
  supervisorName: z.string().min(2, 'Supervisor name is required'),
  workersPresent: z.coerce.number().min(0).default(0),
  weatherCondition: z.enum(['Sunny', 'Cloudy', 'Rainy', 'Windy', 'Stormy', 'Foggy']).default('Sunny'),
  workDone: z.string().min(3, 'Work description is required'),
  materialsUsed: z.array(z.object({
    item: z.string().optional().default(''),
    qty: z.coerce.number().min(0).default(0),
    unit: z.string().optional().default('pcs'),
  })).default([]),
  issues: z.string().optional().default(''),
  nextDayPlan: z.string().optional().default(''),
});

// ── Entry card animations ────────────────────────────────────────────────────
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 90, damping: 16 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.15 } },
};

// ── Diary Entry Card ─────────────────────────────────────────────────────────
function DiaryCard({ entry, project, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const weather = getWeather(entry.weatherCondition);
  const WeatherIcon = weather.icon;

  return (
    <motion.div
      variants={cardVariants}
      layout
      className="bg-surface border border-border rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden group"
    >
      {/* Top accent bar by weather */}
      <div className={cn(
        'h-1 w-full',
        entry.weatherCondition === 'Sunny'  ? 'bg-gradient-to-r from-amber/60 to-amber/20' :
        entry.weatherCondition === 'Rainy'  ? 'bg-gradient-to-r from-accent/60 to-accent/20' :
        entry.weatherCondition === 'Stormy' ? 'bg-gradient-to-r from-red/60 to-red/20' :
        'bg-gradient-to-r from-border to-transparent'
      )} />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Date badge */}
            <div className="bg-surface2 border border-border/60 rounded-xl px-3 py-2 text-center shrink-0">
              <div className="text-[10px] font-bold uppercase tracking-widest text-text3">
                {new Date(entry.date).toLocaleDateString('en-IN', { month: 'short' })}
              </div>
              <div className="text-lg font-extrabold text-text leading-none">
                {new Date(entry.date).getDate()}
              </div>
              <div className="text-[9px] text-text3 font-semibold">
                {new Date(entry.date).toLocaleDateString('en-IN', { weekday: 'short' })}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-[11px] font-bold uppercase tracking-widest text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                  {project?.code || '—'}
                </span>
                <span className="text-[11px] font-semibold text-text2 truncate">{project?.name}</span>
              </div>
              <p className="text-[13.5px] font-medium text-text leading-snug line-clamp-2">
                {entry.workDone}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Weather badge */}
            <div className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-lg bg-surface2 border border-border/50 text-[11px] font-semibold',
              weather.color
            )}>
              <WeatherIcon size={13} />
              <span className="hidden sm:inline">{weather.label}</span>
            </div>
            {/* Actions — show on hover */}
            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-all ml-1">
              <button
                onClick={() => onEdit(entry)}
                className="p-1.5 rounded-lg text-text2 hover:bg-accent-light hover:text-accent transition-colors"
              >
                <Edit2 size={14} />
              </button>
              <button
                onClick={() => onDelete(entry._id)}
                className="p-1.5 rounded-lg text-text2 hover:bg-red-light hover:text-red transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="flex items-center gap-1.5 bg-surface2/50 border border-border/40 rounded-lg px-2.5 py-2">
            <HardHat size={12} className="text-text3 shrink-0" />
            <div>
              <div className="text-[9px] text-text3 uppercase font-bold tracking-wider">Workers</div>
              <div className="text-[13px] font-bold text-text">{entry.workersPresent}</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-surface2/50 border border-border/40 rounded-lg px-2.5 py-2">
            <PackageOpen size={12} className="text-text3 shrink-0" />
            <div>
              <div className="text-[9px] text-text3 uppercase font-bold tracking-wider">Materials</div>
              <div className="text-[13px] font-bold text-text">{(entry.materialsUsed || []).length}</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-surface2/50 border border-border/40 rounded-lg px-2.5 py-2">
            <Image size={12} className="text-text3 shrink-0" />
            <div>
              <div className="text-[9px] text-text3 uppercase font-bold tracking-wider">Photos</div>
              <div className="text-[13px] font-bold text-text">{(entry.photos || []).length}</div>
            </div>
          </div>
        </div>

        {/* Issue badge */}
        {entry.issues && (
          <div className="mt-3 flex items-start gap-2 px-2.5 py-2 rounded-lg bg-amber/5 border border-amber/20">
            <AlertTriangle size={12} className="text-amber shrink-0 mt-0.5" />
            <p className="text-[11.5px] text-amber font-medium line-clamp-1">{entry.issues}</p>
          </div>
        )}

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-3 w-full flex items-center justify-between text-[10.5px] font-bold text-text3 hover:text-text transition-colors py-1 border-t border-border/40"
        >
          <span className="uppercase tracking-wider">{expanded ? 'Hide Details' : 'Show Details'}</span>
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-3 space-y-3">
                {/* Supervisor */}
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-widest text-text3 mb-1">Supervisor</div>
                  <div className="text-[12.5px] font-semibold text-text flex items-center gap-1.5">
                    <Users size={11} className="text-accent" /> {entry.supervisorName}
                  </div>
                </div>

                {/* Materials Used */}
                {(entry.materialsUsed || []).length > 0 && (
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-text3 mb-1.5">
                      Materials Used
                    </div>
                    <div className="space-y-1">
                      {entry.materialsUsed.map((m, i) => (
                        <div key={i} className="flex items-center justify-between text-[11px] bg-surface2/50 px-2.5 py-1.5 rounded-lg border border-border/30">
                          <span className="font-medium text-text">{m.item || '—'}</span>
                          <span className="text-text3 font-mono">{m.qty} {m.unit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Next Day Plan */}
                {entry.nextDayPlan && (
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-text3 mb-1">
                      Tomorrow's Plan
                    </div>
                    <p className="text-[12px] text-text2 bg-accent/5 border border-accent/15 rounded-lg px-2.5 py-2">
                      {entry.nextDayPlan}
                    </p>
                  </div>
                )}

                {/* Photos */}
                {(entry.photos || []).length > 0 && (
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-text3 mb-1.5">
                      Site Photos
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {entry.photos.map((photo, i) => (
                        <a
                          key={i}
                          href={photo.url}
                          target="_blank"
                          rel="noreferrer"
                          className="w-16 h-16 rounded-lg overflow-hidden border border-border hover:border-accent transition-colors flex-shrink-0 bg-surface2"
                          title={photo.originalName}
                        >
                          {photo.mimetype?.startsWith('image/') ? (
                            <img
                              src={photo.url}
                              alt={photo.originalName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-accent">
                              <Paperclip size={18} />
                            </div>
                          )}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ── Mini Calendar ────────────────────────────────────────────────────────────
function MiniCalendar({ entries, selectedDate, onSelectDate }) {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();

  const entryDates = new Set(
    entries
      .filter(e => {
        const d = new Date(e.date);
        return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
      })
      .map(e => new Date(e.date).getDate())
  );

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <div className="bg-surface border border-border rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="p-1 rounded-lg hover:bg-surface2 text-text2 transition-colors">
          <ChevronDown size={14} className="rotate-90" />
        </button>
        <span className="text-[12px] font-bold text-text uppercase tracking-wider">
          {monthNames[viewMonth]} {viewYear}
        </span>
        <button onClick={nextMonth} className="p-1 rounded-lg hover:bg-surface2 text-text2 transition-colors">
          <ChevronDown size={14} className="-rotate-90" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={i} className="text-[9px] font-bold text-text3 text-center py-0.5 uppercase">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {Array(firstDay).fill(null).map((_, i) => <div key={`e${i}`} />)}
        {Array(daysInMonth).fill(null).map((_, i) => {
          const day = i + 1;
          const hasEntry = entryDates.has(day);
          const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
          const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isSelected = selectedDate === dateStr;
          return (
            <button
              key={day}
              onClick={() => onSelectDate(isSelected ? null : dateStr)}
              className={cn(
                'relative flex items-center justify-center text-[11px] font-semibold rounded-lg h-7 transition-all',
                isSelected ? 'bg-accent text-white' :
                isToday ? 'bg-accent/15 text-accent' :
                'hover:bg-surface2 text-text'
              )}
            >
              {day}
              {hasEntry && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-green" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function SiteDiary() {
  const { data: allEntries, isLoading, create, update, remove, isCreating, isUpdating } = useSiteDiary();
  const { data: projects } = useProjects();
  const { registerAddAction, registerDownloadAction, searchQuery } = useAction();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedDate, setSelectedDate] = useState(null);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [pendingPhotos, setPendingPhotos] = useState([]);

  const todayStr = new Date().toISOString().split('T')[0];

  // Build project map for fast lookup
  const projectMap = useMemo(() => {
    return (projects || []).reduce((acc, p) => { acc[p._id] = p; return acc; }, {});
  }, [projects]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    return (allEntries || []).filter(e => {
      const matchesProject = selectedProject === 'all' || e.projectId?._id === selectedProject || e.projectId === selectedProject;
      const matchesDate = !selectedDate || e.date === selectedDate;
      const q = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery ||
        e.supervisorName?.toLowerCase().includes(q) ||
        e.workDone?.toLowerCase().includes(q) ||
        projectMap[e.projectId?._id || e.projectId]?.name?.toLowerCase().includes(q);
      return matchesProject && matchesDate && matchesSearch;
    });
  }, [allEntries, selectedProject, selectedDate, searchQuery, projectMap]);

  const form = useForm({
    resolver: zodResolver(siteDiarySchema),
    defaultValues: {
      projectId: '',
      date: todayStr,
      supervisorName: '',
      workersPresent: 0,
      weatherCondition: 'Sunny',
      workDone: '',
      materialsUsed: [{ item: '', qty: 0, unit: 'pcs' }],
      issues: '',
      nextDayPlan: '',
    },
  });

  const { fields: matFields, append: appendMat, remove: removeMat } = useFieldArray({
    control: form.control,
    name: 'materialsUsed',
  });

  useEffect(() => {
    const unregisterAdd = registerAddAction(() => {
      setEditingRecord(null);
      setPendingPhotos([]);
      form.reset({
        projectId: selectedProject !== 'all' ? selectedProject : '',
        date: todayStr,
        supervisorName: '',
        workersPresent: 0,
        weatherCondition: 'Sunny',
        workDone: '',
        materialsUsed: [{ item: '', qty: 0, unit: 'pcs' }],
        issues: '',
        nextDayPlan: '',
      });
      setIsModalOpen(true);
    });

    const unregisterDownload = registerDownloadAction(() => {
      const exportData = filteredEntries.map(e => {
        const proj = projectMap[e.projectId?._id || e.projectId];
        return {
          Date: e.date,
          Project: proj?.name || '',
          ProjectCode: proj?.code || '',
          Supervisor: e.supervisorName,
          WorkersPresent: e.workersPresent,
          Weather: e.weatherCondition,
          WorkDone: e.workDone,
          Issues: e.issues || '',
          NextDayPlan: e.nextDayPlan || '',
          Materials: (e.materialsUsed || []).map(m => `${m.item} (${m.qty} ${m.unit})`).join(', '),
        };
      });
      downloadCSV(exportData, 'Site_Diary');
    });

    return () => {
      unregisterAdd();
      unregisterDownload();
    };
  }, [registerAddAction, registerDownloadAction, filteredEntries, form, todayStr, selectedProject, projectMap]);

  const handlePhotoUpload = async (files) => {
    if (!files.length) return;
    setUploadingPhotos(true);
    try {
      const uploaded = await Promise.all(
        Array.from(files).map(f => uploadService.upload(f))
      );
      setPendingPhotos(prev => [...prev, ...uploaded]);
      toast.success(`${uploaded.length} photo(s) uploaded`);
    } catch {
      toast.error('Failed to upload photos');
    } finally {
      setUploadingPhotos(false);
    }
  };

  const removePendingPhoto = async (idx) => {
    const photo = pendingPhotos[idx];
    if (photo?.filename) {
      try { await uploadService.delete(photo.filename); } catch { /* best effort */ }
    }
    setPendingPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  const onSubmit = async (values) => {
    try {
      const payload = {
        ...values,
        photos: editingRecord
          ? [...(editingRecord.photos || []), ...pendingPhotos]
          : pendingPhotos,
      };
      if (editingRecord) {
        await update({ id: editingRecord._id, data: payload });
        toast.success('Diary entry updated');
      } else {
        await create(payload);
        toast.success('Site diary entry saved!');
      }
      handleClose();
    } catch (error) {
      toast.error(error.message || 'Failed to save entry');
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setPendingPhotos([]);
    form.reset({
      projectId: record.projectId?._id || record.projectId || '',
      date: record.date,
      supervisorName: record.supervisorName || '',
      workersPresent: record.workersPresent || 0,
      weatherCondition: record.weatherCondition || 'Sunny',
      workDone: record.workDone || '',
      materialsUsed: record.materialsUsed?.length > 0
        ? record.materialsUsed.map(m => ({ item: m.item || '', qty: m.qty || 0, unit: m.unit || 'pcs' }))
        : [{ item: '', qty: 0, unit: 'pcs' }],
      issues: record.issues || '',
      nextDayPlan: record.nextDayPlan || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this diary entry?')) {
      try {
        await remove(id);
        toast.success('Entry deleted');
      } catch {
        toast.error('Failed to delete entry');
      }
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingRecord(null);
    setPendingPhotos([]);
    form.reset();
  };

  // Stats
  const totalWorkers = filteredEntries.reduce((a, e) => a + (e.workersPresent || 0), 0);
  const totalMaterials = filteredEntries.reduce((a, e) => a + (e.materialsUsed || []).length, 0);
  const entriesWithIssues = filteredEntries.filter(e => e.issues).length;

  const calendarEntries = selectedProject === 'all'
    ? (allEntries || [])
    : (allEntries || []).filter(e => e.projectId?._id === selectedProject || e.projectId === selectedProject);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-text">Site Daily Work Diary</h2>
        <p className="text-sm text-text2">Track daily progress, workers, materials, and issues per project site.</p>
      </div>

      {/* Project Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedProject('all')}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border',
            selectedProject === 'all'
              ? 'bg-accent text-white border-accent shadow-sm'
              : 'bg-surface border-border text-text2 hover:text-text hover:border-border/80'
          )}
        >
          All Projects
        </button>
        {(projects || []).filter(p => p.status === 'Active').map(p => (
          <button
            key={p._id}
            onClick={() => setSelectedProject(p._id)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border',
              selectedProject === p._id
                ? 'bg-accent text-white border-accent shadow-sm'
                : 'bg-surface border-border text-text2 hover:text-text hover:border-border/80'
            )}
          >
            {p.code} — {p.name}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Entries', value: filteredEntries.length, icon: BookOpen, color: 'text-accent bg-accent-light', decimals: 0 },
          { label: 'Workers Logged', value: totalWorkers, icon: HardHat, color: 'text-green bg-green-light', decimals: 0 },
          { label: 'Material Entries', value: totalMaterials, icon: Wrench, color: 'text-amber bg-amber-light', decimals: 0 },
          { label: 'Issues Raised', value: entriesWithIssues, icon: AlertTriangle, color: 'text-red bg-red-light', decimals: 0 },
        ].map(stat => (
          <div key={stat.label} className="bg-surface border border-border rounded-xl p-4 shadow-sm flex items-center gap-3">
            <div className={cn('p-2.5 rounded-lg shrink-0', stat.color)}>
              <stat.icon size={18} />
            </div>
            <div>
              <div className="text-[11px] text-text2 font-medium">{stat.label}</div>
              <div className="text-xl font-bold text-text">
                <AnimatedCounter value={stat.value} decimals={stat.decimals} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main content: cards + calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-6">
        {/* Entry cards timeline */}
        <div className="space-y-4">
          {isLoading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="bg-surface border border-border rounded-2xl p-5 space-y-3">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))
          ) : filteredEntries.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 text-center text-text3 bg-surface border border-dashed border-border/60 rounded-2xl"
            >
              <BookOpen size={36} className="mb-3 opacity-30" />
              <p className="text-[13px] font-semibold">No diary entries yet</p>
              <p className="text-[11px] mt-1 opacity-70">
                {selectedDate ? `No entries for ${selectedDate}` : 'Click "+ Add Entry" to log the first site diary.'}
              </p>
              {selectedDate && (
                <button
                  onClick={() => setSelectedDate(null)}
                  className="mt-3 text-[11px] text-accent font-semibold hover:underline"
                >
                  Clear date filter
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div
              className="space-y-4"
              variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
              initial="hidden"
              animate="visible"
            >
              <AnimatePresence>
                {filteredEntries.map(entry => (
                  <DiaryCard
                    key={entry._id}
                    entry={entry}
                    project={projectMap[entry.projectId?._id || entry.projectId]}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>

        {/* Sidebar: mini calendar */}
        <div className="space-y-4">
          <MiniCalendar
            entries={calendarEntries}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />

          {selectedDate && (
            <div className="bg-accent/5 border border-accent/20 rounded-xl p-3 text-center">
              <div className="text-[10px] font-bold uppercase tracking-widest text-accent mb-0.5">Showing</div>
              <div className="text-[13px] font-bold text-text">
                {new Date(selectedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
              <button
                onClick={() => setSelectedDate(null)}
                className="mt-1.5 text-[10px] text-text3 hover:text-red transition-colors font-semibold"
              >
                Clear Filter ✕
              </button>
            </div>
          )}

          {/* Quick summary for selected project */}
          {selectedProject !== 'all' && (() => {
            const proj = projectMap[selectedProject];
            if (!proj) return null;
            return (
              <div className="bg-surface border border-border rounded-xl p-4 space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-widest text-text3">Project Info</div>
                <div className="text-[13px] font-bold text-text">{proj.name}</div>
                <div className="flex items-center gap-2 text-[11px] text-text2">
                  <span className="font-mono bg-surface2 px-1.5 py-0.5 rounded text-text3">{proj.code}</span>
                  <span className={cn(
                    'px-1.5 py-0.5 rounded text-[9px] font-bold uppercase',
                    proj.status === 'Active' ? 'bg-green-light text-green' : 'bg-amber-light text-amber'
                  )}>{proj.status}</span>
                </div>
                <div className="text-[11px] text-text3">{proj.location}</div>
                <div className="pt-1 border-t border-border/40">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-text3">Budget</span>
                    <span className="font-bold text-green">₹{(proj.budget / 100000).toFixed(1)}L</span>
                  </div>
                  <div className="flex justify-between text-[11px] mt-0.5">
                    <span className="text-text3">Expense</span>
                    <span className="font-bold text-red">₹{((proj.expense || 0) / 100000).toFixed(1)}L</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── Add / Edit Modal ─────────────────────────────────────────────── */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[860px] bg-surface text-text border border-border/80 shadow-2xl rounded-xl overflow-hidden p-0 flex flex-col max-h-[90vh]">
          <div className="p-4 px-5 border-b border-border/60 bg-surface2/25 shrink-0">
            <DialogHeader className="space-y-0.5">
              <DialogTitle className="text-lg font-bold tracking-tight text-text flex items-center gap-2">
                <BookOpen size={18} className="text-accent" />
                {editingRecord ? 'Update Diary Entry' : 'New Site Diary Entry'}
              </DialogTitle>
              <DialogDescription className="text-xs text-text2">
                Log today's work, worker count, materials used, and any site issues.
              </DialogDescription>
            </DialogHeader>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">

                {/* Project + Date */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="projectId" render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Project Site</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-surface border-border/60 h-9 text-xs">
                            <SelectValue placeholder="Select project..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-surface border-border">
                          {(projects || []).map(p => (
                            <SelectItem key={p._id} value={p._id}>
                              {p.code} — {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="date" render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} className="bg-surface border-border/60 h-9 px-3 text-xs focus-visible:ring-accent" />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )} />
                </div>

                {/* Supervisor + Workers */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="supervisorName" render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Supervisor Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Ramesh Kumar" {...field} className="bg-surface border-border/60 h-9 px-3 text-xs focus-visible:ring-accent" />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="workersPresent" render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Workers Present</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} className="bg-surface border-border/60 h-9 px-3 text-xs focus-visible:ring-accent" />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )} />
                </div>

                {/* Weather Selector */}
                <FormField control={form.control} name="weatherCondition" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Weather Condition</FormLabel>
                    <div className="flex gap-2 flex-wrap">
                      {WEATHER_OPTIONS.map(w => {
                        const WIcon = w.icon;
                        const isSelected = field.value === w.value;
                        return (
                          <button
                            key={w.value}
                            type="button"
                            onClick={() => field.onChange(w.value)}
                            className={cn(
                              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                              isSelected
                                ? `bg-accent/10 border-accent/40 text-accent`
                                : 'bg-surface2/50 border-border/60 text-text2 hover:border-border'
                            )}
                          >
                            <WIcon size={13} className={isSelected ? 'text-accent' : w.color} />
                            {w.label}
                          </button>
                        );
                      })}
                    </div>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )} />

                {/* Work Done */}
                <FormField control={form.control} name="workDone" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2">Work Done Today</FormLabel>
                    <FormControl>
                      <textarea
                        {...field}
                        rows={3}
                        placeholder="Describe what was accomplished today on site..."
                        className="w-full bg-surface border border-border/60 rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-accent resize-none text-text placeholder:text-text3"
                      />
                    </FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )} />

                {/* Materials Used */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-text2">Materials Used</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => appendMat({ item: '', qty: 0, unit: 'pcs' })}
                      className="h-7 text-[11px] font-bold text-accent hover:bg-accent/10 px-2"
                    >
                      <Plus size={12} className="mr-1" /> Add Material
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1 custom-scrollbar">
                    {matFields.map((mf, idx) => (
                      <div key={mf.id} className="grid grid-cols-[3fr_1fr_1.2fr_auto] gap-2 items-center">
                        <FormField control={form.control} name={`materialsUsed.${idx}.item`} render={({ field }) => (
                          <Input {...field} placeholder="Item name" className="bg-surface border-border/60 h-8 px-2.5 text-xs focus-visible:ring-accent" />
                        )} />
                        <FormField control={form.control} name={`materialsUsed.${idx}.qty`} render={({ field }) => (
                          <Input type="number" {...field} placeholder="Qty" className="bg-surface border-border/60 h-8 px-2 text-xs text-center focus-visible:ring-accent no-spinner" />
                        )} />
                        <FormField control={form.control} name={`materialsUsed.${idx}.unit`} render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger className="bg-surface border-border/60 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-surface border-border">
                              {['pcs', 'bags', 'kg', 'L', 'm', 'm²', 'm³', 'rolls', 'sets', 'nos'].map(u => (
                                <SelectItem key={u} value={u}>{u}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )} />
                        {matFields.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeMat(idx)}
                            className="h-8 w-8 flex items-center justify-center rounded-md text-text3 hover:text-red hover:bg-red-light transition-colors border border-border/40"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Issues + Next Day Plan */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="issues" render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2 flex items-center gap-1.5">
                        <AlertTriangle size={10} className="text-amber" /> Issues / Problems
                      </FormLabel>
                      <FormControl>
                        <textarea
                          {...field}
                          rows={2}
                          placeholder="Any problems, delays, or safety issues..."
                          className="w-full bg-surface border border-border/60 rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-accent resize-none text-text placeholder:text-text3"
                        />
                      </FormControl>
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="nextDayPlan" render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-text2 flex items-center gap-1.5">
                        <CalendarDays size={10} className="text-accent" /> Tomorrow's Plan
                      </FormLabel>
                      <FormControl>
                        <textarea
                          {...field}
                          rows={2}
                          placeholder="What is planned for the next working day..."
                          className="w-full bg-surface border border-border/60 rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-accent resize-none text-text placeholder:text-text3"
                        />
                      </FormControl>
                    </FormItem>
                  )} />
                </div>

                {/* Photo Upload */}
                <div className="space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-text2 flex items-center gap-1.5">
                    <Image size={10} /> Site Photos
                  </div>
                  <label className="flex items-center justify-center gap-2 w-full h-12 border-2 border-dashed border-border/60 rounded-xl cursor-pointer hover:border-accent/50 hover:bg-accent/5 transition-all">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => handlePhotoUpload(Array.from(e.target.files || []))}
                    />
                    {uploadingPhotos ? (
                      <Loader2 size={14} className="animate-spin text-accent" />
                    ) : (
                      <Image size={14} className="text-text3" />
                    )}
                    <span className="text-[11px] text-text3 font-medium">
                      {uploadingPhotos ? 'Uploading...' : 'Click to upload site photos'}
                    </span>
                  </label>

                  {pendingPhotos.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {pendingPhotos.map((photo, i) => (
                        <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border group/photo">
                          {photo.mimetype?.startsWith('image/') ? (
                            <img src={photo.url} alt={photo.originalName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-surface2 flex items-center justify-center">
                              <Paperclip size={16} className="text-accent" />
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => removePendingPhoto(i)}
                            className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red text-white flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity"
                          >
                            <X size={9} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Show existing photos in edit mode */}
                  {editingRecord && (editingRecord.photos || []).length > 0 && (
                    <div>
                      <div className="text-[9px] font-bold uppercase tracking-widest text-text3 mb-1.5">Existing Photos</div>
                      <div className="flex flex-wrap gap-2">
                        {editingRecord.photos.map((photo, i) => (
                          <a key={i} href={photo.url} target="_blank" rel="noreferrer"
                            className="w-16 h-16 rounded-lg overflow-hidden border border-border hover:border-accent transition-colors flex-shrink-0 bg-surface2">
                            {photo.mimetype?.startsWith('image/') ? (
                              <img src={photo.url} alt={photo.originalName} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-accent"><Paperclip size={18} /></div>
                            )}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

              </div>

              <DialogFooter className="p-4 border-t border-border/60 bg-surface2/25 gap-2 sm:gap-0 shrink-0">
                <Button variant="outline" type="button" onClick={handleClose}
                  className="h-9 px-4 border-border/80 text-text2 hover:text-text hover:bg-surface2/30 text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating || isUpdating || uploadingPhotos}
                  className="h-9 px-4 bg-accent hover:bg-accent/90 text-white font-semibold transition-all text-xs">
                  {(isCreating || isUpdating) && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  {editingRecord ? 'Save Changes' : 'Save Diary Entry'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
