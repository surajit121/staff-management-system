import React, { useState, useMemo } from 'react';
import {
  Wrench, Truck, ShieldAlert, CheckCircle2, AlertTriangle, Plus,
  Search, Filter, User, MapPin, Calendar, IndianRupee,
  Trash2, Edit2, ClipboardList, Info, CalendarDays, Loader2, X,
  Hammer, Laptop, HardHat, Bike, Activity, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAssets, useStaff, useProjects } from '../hooks/useResource';
import { cn, formatDate } from '../lib/utils';
import { Skeleton } from '../components/ui/skeleton';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectLabel,
  SelectGroup,
} from '../components/ui/select';

// ── Schema Definitions ───────────────────────────────────────────────────────
const assetSchema = z.object({
  name: z.string().min(2, "Asset name must be at least 2 characters"),
  assetCode: z.string().min(2, "Asset code is required"),
  category: z.enum(['Vehicle', 'Tool', 'Equipment', 'Electronics', 'Other']),
  brand: z.string().optional().default(''),
  model: z.string().optional().default(''),
  purchaseDate: z.string().optional().default(''),
  purchaseCost: z.coerce.number().min(0).optional().default(0),
  currentCondition: z.enum(['Good', 'Fair', 'Needs Repair', 'Retired']).default('Good'),
  assignedTo: z.string().optional().default(''),
  assignedProject: z.string().optional().default(''),
  lastServiceDate: z.string().optional().default(''),
  nextServiceDue: z.string().optional().default(''),
});

const maintenanceSchema = z.object({
  date: z.string().min(1, "Service date is required"),
  type: z.enum(['Routine Service', 'Repair', 'Inspection', 'Installation', 'Other']),
  cost: z.coerce.number().min(0, "Cost must be a positive number"),
  notes: z.string().optional().default(''),
  performedBy: z.string().optional().default(''),
});

// ── Categories Setup ──────────────────────────────────────────────────────────
const CATEGORIES = [
  { value: 'Vehicle',     label: 'Vehicles',     icon: Bike,      color: '#3B82F6', bg: 'bg-blue-500/10',    text: 'text-blue-500' },
  { value: 'Tool',        label: 'Tools',        icon: Hammer,    color: '#F59E0B', bg: 'bg-amber-500/10',   text: 'text-amber-500' },
  { value: 'Equipment',   label: 'Equipment',    icon: HardHat,   color: '#10B981', bg: 'bg-green-500/10',   text: 'text-green-500' },
  { value: 'Electronics', label: 'Electronics',  icon: Laptop,    color: '#8B5CF6', bg: 'bg-purple-500/10',  text: 'text-purple-500' },
  { value: 'Other',       label: 'Others',       icon: Wrench,     color: '#6B7280', bg: 'bg-slate-500/10',   text: 'text-slate-500' },
];


const generateAssetCode = (name, category, assets) => {
  if (!name) return '';
  
  // 1. Get category prefix
  let catPrefix = 'AST';
  if (category === 'Vehicle') catPrefix = 'VEH';
  else if (category === 'Tool') catPrefix = 'TOL';
  else if (category === 'Equipment') catPrefix = 'EQP';
  else if (category === 'Electronics') catPrefix = 'ELE';
  else if (category === 'Other') catPrefix = 'OTH';
  
  // 2. Clean name & get code part
  const cleanName = name.replace(/[^a-zA-Z0-9\s]/g, '').trim().toUpperCase();
  if (!cleanName) return '';
  
  const words = cleanName.split(/\s+/);
  let namePart = '';
  if (words.length >= 2) {
    // Take initials of up to 3 words
    namePart = words.slice(0, 3).map(w => w[0]).join('');
  } else {
    // Take first 3 characters of the single word
    namePart = words[0].slice(0, 3);
  }
  
  // Pad namePart if too short
  while (namePart.length < 3 && namePart.length > 0) {
    namePart += 'X';
  }
  
  // 3. Find next sequential number
  const prefixPattern = `${catPrefix}-${namePart}-`;
  let maxSeq = 0;
  if (assets && Array.isArray(assets)) {
    assets.forEach(asset => {
      if (asset.assetCode && asset.assetCode.toUpperCase().startsWith(prefixPattern)) {
        const parts = asset.assetCode.split('-');
        const seqStr = parts[parts.length - 1];
        const seq = parseInt(seqStr, 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    });
  }
  
  const nextSeq = String(maxSeq + 1).padStart(3, '0');
  return `${prefixPattern}${nextSeq}`;
};

export default function AssetManager() {
  const { data: assets, isLoading, create, update, remove, logMaintenance, dueAssets, isLoggingMaintenance } = useAssets();
  const { data: staff } = useStaff();
  const { data: projects } = useProjects();

  // UX State
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [conditionFilter, setConditionFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'overdue'

  // Modals / Drawer Control
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [isLogMaintenanceOpen, setIsLogMaintenanceOpen] = useState(false);
  const [showCustomBrandInput, setShowCustomBrandInput] = useState(false);
  const [customBrandName, setCustomBrandName] = useState('');

  // Forms Hook Setup
  const form = useForm({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      name: '',
      assetCode: '',
      category: 'Equipment',
      brand: '',
      model: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      purchaseCost: 0,
      currentCondition: 'Good',
      assignedTo: '',
      assignedProject: '',
      lastServiceDate: '',
      nextServiceDue: '',
    }
  });

  const maintenanceForm = useForm({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      type: 'Routine Service',
      cost: 0,
      notes: '',
      performedBy: '',
    }
  });

  const watchedName = form.watch('name');
  const watchedCategory = form.watch('category');
  const watchedBrand = form.watch('brand');

  // Auto-generate asset code when name or category changes in creation mode
  React.useEffect(() => {
    const isCodeDirty = form.formState.dirtyFields.assetCode;
    if (!editingAsset && !isCodeDirty && watchedName && watchedCategory) {
      const code = generateAssetCode(watchedName, watchedCategory, assets);
      form.setValue('assetCode', code, { shouldValidate: true });
    }
  }, [watchedName, watchedCategory, editingAsset, assets, form.formState.dirtyFields.assetCode]);

  // Filters Calculation
  const filteredAssets = useMemo(() => {
    let result = assets || [];

    // Filter by overdue tab
    if (activeTab === 'overdue') {
      const today = new Date().toISOString().split('T')[0];
      result = result.filter(a => a.nextServiceDue && a.nextServiceDue <= today && a.currentCondition !== 'Retired');
    }

    // Category Filter
    if (selectedCategory !== 'All') {
      result = result.filter(a => a.category === selectedCategory);
    }

    // Condition Filter
    if (conditionFilter !== 'All') {
      result = result.filter(a => a.currentCondition === conditionFilter);
    }

    // Text Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.assetCode.toLowerCase().includes(q) ||
        a.brand.toLowerCase().includes(q) ||
        a.model.toLowerCase().includes(q) ||
        (a.assignedTo && (a.assignedTo.name || '').toLowerCase().includes(q)) ||
        (a.assignedProject && (a.assignedProject.name || '').toLowerCase().includes(q))
      );
    }

    return result;
  }, [assets, selectedCategory, conditionFilter, searchQuery, activeTab]);

  // Statistics Summary
  const stats = useMemo(() => {
    const list = assets || [];
    const active = list.filter(a => a.currentCondition !== 'Retired');
    const assigned = active.filter(a => a.assignedTo || a.assignedProject);
    const repair = active.filter(a => a.currentCondition === 'Needs Repair');
    
    return {
      total: list.length,
      active: active.length,
      assigned: assigned.length,
      needsRepair: repair.length,
      overdueServiceCount: (dueAssets || []).length
    };
  }, [assets, dueAssets]);

  // Open asset modal for creation
  const handleNewAsset = () => {
    setEditingAsset(null);
    setShowCustomBrandInput(false);
    setCustomBrandName('');
    form.reset({
      name: '',
      assetCode: '',
      category: 'Equipment',
      brand: '',
      model: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      purchaseCost: 0,
      currentCondition: 'Good',
      assignedTo: '',
      assignedProject: '',
      lastServiceDate: '',
      nextServiceDue: '',
    });
    setIsFormOpen(true);
  };

  // Open asset modal for editing
  const handleEditAsset = (asset, e) => {
    e.stopPropagation();
    setEditingAsset(asset);
    const isCustom = asset.brand && !['Hikvision', 'Dahua', 'CP Plus', 'Honeywell', 'Bosch', 'Uniview', 'Panasonic', 'Ceasefire', 'Kanex', 'Safex', 'Minimax', 'Kidde', 'First Alert', 'Amerex'].includes(asset.brand);
    setShowCustomBrandInput(isCustom);
    if (isCustom) {
      setCustomBrandName(asset.brand);
    } else {
      setCustomBrandName('');
    }
    form.reset({
      name: asset.name,
      assetCode: asset.assetCode,
      category: asset.category,
      brand: isCustom ? '__custom__' : (asset.brand || ''),
      model: asset.model || '',
      purchaseDate: asset.purchaseDate || '',
      purchaseCost: asset.purchaseCost || 0,
      currentCondition: asset.currentCondition || 'Good',
      assignedTo: asset.assignedTo?._id || asset.assignedTo || '',
      assignedProject: asset.assignedProject?._id || asset.assignedProject || '',
      lastServiceDate: asset.lastServiceDate || '',
      nextServiceDue: asset.nextServiceDue || '',
    });
    setIsFormOpen(true);
  };

  const handleBrandChange = (e) => {
    const val = e.target.value;
    if (val === '__custom__') {
      setShowCustomBrandInput(true);
    } else {
      setShowCustomBrandInput(false);
    }
  };

  // Submit asset CRUD form
  const onSubmitAsset = async (values) => {
    try {
      // Parse empty strings to null for ObjectId relations
      const payload = {
        ...values,
        brand: values.brand === '__custom__' ? customBrandName : values.brand,
        assignedTo: values.assignedTo === '' ? null : values.assignedTo,
        assignedProject: values.assignedProject === '' ? null : values.assignedProject,
      };

      if (editingAsset) {
        await update({ id: editingAsset._id, data: payload });
        toast.success("Asset updated successfully");
        if (selectedAsset?._id === editingAsset._id) {
          // Sync detail view drawer if open
          const updated = (assets || []).find(a => a._id === editingAsset._id);
          setSelectedAsset(updated || null);
        }
      } else {
        await create(payload);
        toast.success("Asset registered successfully");
      }
      setIsFormOpen(false);
    } catch (error) {
      toast.error(error.message || "Failed to save asset details");
    }
  };

  // Delete an asset
  const handleDeleteAsset = async (id, e) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this asset?")) {
      try {
        await remove(id);
        toast.success("Asset removed from register");
        if (selectedAsset?._id === id) setSelectedAsset(null);
      } catch (error) {
        toast.error("Failed to delete asset");
      }
    }
  };

  // Log maintenance submit
  const onSubmitMaintenance = async (values) => {
    try {
      const updated = await logMaintenance({ id: selectedAsset._id, data: values });
      toast.success("Maintenance entry logged successfully");
      setSelectedAsset(updated);
      setIsLogMaintenanceOpen(false);
      maintenanceForm.reset({
        date: new Date().toISOString().split('T')[0],
        type: 'Routine Service',
        cost: 0,
        notes: '',
        performedBy: '',
      });
    } catch (error) {
      toast.error(error.message || "Failed to log maintenance event");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      
      {/* Due Service Alert Banner */}
      {stats.overdueServiceCount > 0 && activeTab === 'all' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-500/10 border border-amber-500/20 text-amber-500 p-4 rounded-xl flex items-center justify-between gap-4 flex-wrap"
        >
          <div className="flex items-center gap-3">
            <ShieldAlert size={20} className="text-amber-500 animate-pulse shrink-0" />
            <div className="text-xs">
              <span className="font-bold">Maintenance Reminder:</span> There are <span className="font-bold">{stats.overdueServiceCount} assets</span> whose scheduled services are overdue.
            </div>
          </div>
          <button
            onClick={() => setActiveTab('overdue')}
            className="text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-white py-1 px-3 rounded-lg transition-all cursor-pointer shadow-sm"
          >
            Review Overdue Assets
          </button>
        </motion.div>
      )}

      {/* Overview stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Assets', value: stats.total, icon: ClipboardList, color: 'text-slate-500 bg-slate-500/10' },
          { label: 'Active Assets', value: stats.active, icon: Activity, color: 'text-blue-500 bg-blue-500/10' },
          { label: 'Assigned Out', value: stats.assigned, icon: User, color: 'text-green bg-green/10' },
          { label: 'In Repair', value: stats.needsRepair, icon: AlertTriangle, color: 'text-red bg-red/10' },
          { label: 'Service Alerts', value: stats.overdueServiceCount, icon: Wrench, color: 'text-amber-500 bg-amber-500/10' },
        ].map(stat => (
          <div key={stat.label} className="bg-surface border border-border rounded-xl p-4 shadow-sm flex items-center gap-3">
            <div className={cn("p-2.5 rounded-lg shrink-0", stat.color)}>
              <stat.icon size={16} />
            </div>
            <div>
              <div className="text-[10px] text-text3 font-medium uppercase tracking-wider">{stat.label}</div>
              <div className="text-lg font-bold text-text mt-0.5">{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Control Actions & Tab Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* View mode toggle */}
        <div className="flex bg-surface border border-border rounded-lg p-1 shrink-0 max-w-xs">
          {[
            { id: 'all', label: 'All Registry' },
            { id: 'overdue', label: 'Service Overdue' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "py-1 px-3 rounded text-xs font-semibold transition-all cursor-pointer",
                activeTab === tab.id
                  ? "bg-accent-light text-accent"
                  : "text-text3 hover:text-text"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:flex-initial">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text3" size={13} />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-56 bg-surface border border-border rounded-lg h-9 pl-8 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <select
            value={conditionFilter}
            onChange={(e) => setConditionFilter(e.target.value)}
            className="bg-surface border border-border rounded-lg h-9 px-2.5 text-xs focus:outline-none text-text2 cursor-pointer"
          >
            <option value="All">All Conditions</option>
            <option value="Good">Good</option>
            <option value="Fair">Fair</option>
            <option value="Needs Repair">Needs Repair</option>
            <option value="Retired">Retired</option>
          </select>

          <button
            onClick={handleNewAsset}
            className="bg-accent hover:bg-accent/95 text-white h-9 px-4 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm shadow-accent/15 transition-all ml-auto md:ml-0"
          >
            <Plus size={14} /> Add Asset
          </button>
        </div>
      </div>

      {/* Category selection strips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 max-w-full scrollbar-thin">
        <button
          onClick={() => setSelectedCategory('All')}
          className={cn(
            "h-8 px-4 rounded-full text-xs font-semibold flex items-center transition-all cursor-pointer",
            selectedCategory === 'All'
              ? "bg-accent text-white shadow-sm"
              : "bg-surface border border-border text-text3 hover:text-text"
          )}
        >
          All Categories
        </button>
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={cn(
                "h-8 px-4 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border",
                selectedCategory === cat.value
                  ? "bg-accent border-accent text-white shadow-sm"
                  : "bg-surface border-border text-text3 hover:text-text hover:bg-surface2/30"
              )}
            >
              <Icon size={12} />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Assets Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array(8).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-2xl" />
          ))}
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="p-12 text-center text-text3 border border-dashed border-border rounded-2xl bg-surface">
          <Info className="mx-auto text-text3/50 mb-1.5" size={24} />
          <p className="text-xs font-bold text-text">No Assets Logged</p>
          <p className="text-[10px] mt-0.5">No equipment matching this query is registered in our database.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredAssets.map(asset => {
            const catInfo = CATEGORIES.find(c => c.value === asset.category) || CATEGORIES[4];
            const CatIcon = catInfo.icon;
            
            return (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                key={asset._id}
                onClick={() => setSelectedAsset(asset)}
                className="bg-surface border border-border hover:border-accent/30 rounded-2xl p-4.5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between h-48 group relative"
              >
                {/* Header info */}
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-text3 bg-surface2 px-1.5 py-0.5 rounded tracking-wide font-mono">
                      {asset.assetCode}
                    </span>
                    <span className={cn(
                      "px-1.5 py-0.5 rounded-[5px] text-[9px] font-bold uppercase tracking-widest border",
                      asset.currentCondition === 'Good' ? 'bg-green-light border-green/10 text-green' :
                      asset.currentCondition === 'Fair' ? 'bg-blue-500/10 border-blue-500/10 text-blue-500' :
                      asset.currentCondition === 'Needs Repair' ? 'bg-red-light border-red/10 text-red' :
                      'bg-slate-200 border-slate-300 text-slate-500'
                    )}>
                      {asset.currentCondition}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-text mt-3 truncate group-hover:text-accent transition-colors">
                    {asset.name}
                  </h3>
                  <p className="text-[10px] text-text3 font-medium">
                    {asset.brand} {asset.model ? `• ${asset.model}` : ''}
                  </p>
                </div>

                {/* Assignment detail tags */}
                <div className="space-y-2 mt-4">
                  {/* Assigned To (Staff) */}
                  {asset.assignedTo ? (
                    <div className="flex items-center gap-2 text-[10px] text-text2">
                      <div className="w-4.5 h-4.5 rounded-full bg-accent-light text-accent flex items-center justify-center text-[9px] font-bold border border-accent/10">
                        {asset.assignedTo.initials || asset.assignedTo.name?.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="truncate">{asset.assignedTo.name} ({asset.assignedTo.role})</span>
                    </div>
                  ) : asset.assignedProject ? (
                    /* Assigned To (Project) */
                    <div className="flex items-center gap-2 text-[10px] text-text2">
                      <div className="w-4.5 h-4.5 rounded bg-amber-500/10 text-amber-600 flex items-center justify-center text-[9px] font-mono font-bold">
                        P
                      </div>
                      <span className="truncate">{asset.assignedProject.code} - {asset.assignedProject.name}</span>
                    </div>
                  ) : (
                    /* Idle */
                    <div className="flex items-center gap-1 text-[10px] text-text3 italic">
                      <Info size={11} /> Unassigned (In Storage)
                    </div>
                  )}
                </div>

                {/* Hover actions menu */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-surface border border-border rounded-lg shadow p-1">
                  <button
                    onClick={(e) => handleEditAsset(asset, e)}
                    className="p-1.5 rounded text-text3 hover:text-accent hover:bg-accent/5 transition-all cursor-pointer"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={(e) => handleDeleteAsset(asset._id, e)}
                    className="p-1.5 rounded text-text3 hover:text-red hover:bg-red/5 transition-all cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* DETAILED DRAWERS PANEL */}
      <AnimatePresence>
        {selectedAsset && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => { setSelectedAsset(null); setIsLogMaintenanceOpen(false); }}
              className="fixed inset-0 bg-black z-40"
            />
            {/* Slide-out Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 24, stiffness: 180 }}
              className="fixed inset-y-0 right-0 w-full max-w-[580px] bg-surface z-50 shadow-2xl p-6 overflow-y-auto border-l border-border flex flex-col"
            >
              {/* Drawer header */}
              <div className="flex justify-between items-start pb-4 border-b border-border">
                <div>
                  <span className="text-[10px] font-bold text-text3 bg-surface2 px-1.5 py-0.5 rounded tracking-wide font-mono">
                    {selectedAsset.assetCode}
                  </span>
                  <h2 className="text-base font-extrabold text-text mt-1.5">{selectedAsset.name}</h2>
                  <p className="text-xs text-text3 font-medium">{selectedAsset.brand} {selectedAsset.model}</p>
                </div>
                <button
                  onClick={() => { setSelectedAsset(null); setIsLogMaintenanceOpen(false); }}
                  className="p-1.5 rounded-lg hover:bg-surface2 text-text3 hover:text-text cursor-pointer transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Drawer Body Grid */}
              <div className="space-y-6 mt-6 flex-1">
                {/* Stats / Condition section */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-surface2/40 border border-border rounded-xl p-3 text-center space-y-1">
                    <span className="text-[9px] font-bold text-text3 uppercase tracking-wider block">Condition</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider block border border-transparent",
                      selectedAsset.currentCondition === 'Good' ? 'bg-green-light text-green' :
                      selectedAsset.currentCondition === 'Fair' ? 'bg-blue-500/10 text-blue-500' :
                      selectedAsset.currentCondition === 'Needs Repair' ? 'bg-red-light text-red' :
                      'bg-slate-200 text-slate-500'
                    )}>
                      {selectedAsset.currentCondition}
                    </span>
                  </div>

                  <div className="bg-surface2/40 border border-border rounded-xl p-3 text-center space-y-1">
                    <span className="text-[9px] font-bold text-text3 uppercase tracking-wider block">Purchase Cost</span>
                    <span className="text-xs font-bold text-text block">
                      ₹{(selectedAsset.purchaseCost || 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="bg-surface2/40 border border-border rounded-xl p-3 text-center space-y-1">
                    <span className="text-[9px] font-bold text-text3 uppercase tracking-wider block">Next Service</span>
                    <span className={cn(
                      "text-xs font-bold block",
                      selectedAsset.nextServiceDue && selectedAsset.nextServiceDue <= new Date().toISOString().split('T')[0]
                        ? "text-red animate-pulse"
                        : "text-text"
                    )}>
                      {selectedAsset.nextServiceDue ? formatDate(selectedAsset.nextServiceDue) : 'None'}
                    </span>
                  </div>
                </div>

                {/* Assignment details card */}
                <div className="bg-surface2/25 border border-border/80 rounded-xl p-4.5 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-text border-b border-border/50 pb-1.5">
                    Current Assignment
                  </h3>
                  {selectedAsset.assignedTo ? (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center font-bold text-xs">
                        {selectedAsset.assignedTo.initials || selectedAsset.assignedTo.name?.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-text">{selectedAsset.assignedTo.name}</div>
                        <div className="text-[10px] text-text3">Staff assignment • {selectedAsset.assignedTo.role} ({selectedAsset.assignedTo.dept})</div>
                      </div>
                    </div>
                  ) : selectedAsset.assignedProject ? (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-xs">
                        P
                      </div>
                      <div>
                        <div className="text-xs font-bold text-text">{selectedAsset.assignedProject.name}</div>
                        <div className="text-[10px] text-text3">Project Site • Code: {selectedAsset.assignedProject.code} | Manager: {selectedAsset.assignedProject.manager}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-text3 italic py-1 flex items-center gap-1.5">
                      <Info size={13} /> Unassigned (Currently sitting inactive in warehouse storage)
                    </div>
                  )}
                </div>

                {/* Purchase spec details list */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-0.5 text-xs">
                    <span className="text-[9px] font-bold text-text3 uppercase tracking-wider block">Category</span>
                    <span className="font-semibold text-text">{selectedAsset.category}</span>
                  </div>
                  <div className="space-y-0.5 text-xs">
                    <span className="text-[9px] font-bold text-text3 uppercase tracking-wider block">Purchase Date</span>
                    <span className="font-semibold text-text">
                      {selectedAsset.purchaseDate ? formatDate(selectedAsset.purchaseDate) : 'Not specified'}
                    </span>
                  </div>
                  <div className="space-y-0.5 text-xs">
                    <span className="text-[9px] font-bold text-text3 uppercase tracking-wider block">Last Service Date</span>
                    <span className="font-semibold text-text">
                      {selectedAsset.lastServiceDate ? formatDate(selectedAsset.lastServiceDate) : 'Never serviced'}
                    </span>
                  </div>
                  <div className="space-y-0.5 text-xs">
                    <span className="text-[9px] font-bold text-text3 uppercase tracking-wider block">Lifetime Maintenance Spend</span>
                    <span className="font-semibold text-text">
                      ₹{((selectedAsset.maintenanceLog || []).reduce((sum, log) => sum + (log.cost || 0), 0)).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Maintenance timeline log */}
                <div className="space-y-3 pt-3 border-t border-border">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-text flex items-center gap-1.5">
                      <ClipboardList size={14} className="text-accent" />
                      Maintenance & Repair Log
                    </h3>
                    {!isLogMaintenanceOpen && (
                      <button
                        onClick={() => setIsLogMaintenanceOpen(true)}
                        className="text-[11px] font-bold text-accent hover:text-accent/90 bg-accent/5 hover:bg-accent/10 py-1 px-2.5 rounded-lg transition-all cursor-pointer"
                      >
                        Log Maintenance
                      </button>
                    )}
                  </div>

                  {/* Log Maintenance slide-in panel */}
                  {isLogMaintenanceOpen && (
                    <motion.form
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      onSubmit={maintenanceForm.handleSubmit(onSubmitMaintenance)}
                      className="border border-border/80 bg-surface2/20 rounded-xl p-4.5 space-y-3.5"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-text">Record Maintenance Event</span>
                        <button
                          type="button"
                          onClick={() => setIsLogMaintenanceOpen(false)}
                          className="text-text3 hover:text-text cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-bold uppercase tracking-wider text-text2 block">Date</label>
                          <input
                            type="date"
                            {...maintenanceForm.register('date')}
                            className="w-full bg-surface border border-border/60 rounded-lg h-8 px-2.5 text-xs"
                          />
                        </div>

                        <div className="space-y-0.5">
                          <label className="text-[9px] font-bold uppercase tracking-wider text-text2 block">Service Type</label>
                          <select
                            {...maintenanceForm.register('type')}
                            className="w-full bg-surface border border-border/60 rounded-lg h-8 px-2 text-xs"
                          >
                            <option value="Routine Service">Routine Service</option>
                            <option value="Repair">Repair</option>
                            <option value="Inspection">Inspection</option>
                            <option value="Installation">Installation</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        <div className="space-y-0.5">
                          <label className="text-[9px] font-bold uppercase tracking-wider text-text2 block">Cost (₹)</label>
                          <input
                            type="number"
                            {...maintenanceForm.register('cost')}
                            className="w-full bg-surface border border-border/60 rounded-lg h-8 px-2.5 text-xs"
                          />
                        </div>

                        <div className="space-y-0.5">
                          <label className="text-[9px] font-bold uppercase tracking-wider text-text2 block">Performed By</label>
                          <input
                            type="text"
                            placeholder="e.g. Service Center"
                            {...maintenanceForm.register('performedBy')}
                            className="w-full bg-surface border border-border/60 rounded-lg h-8 px-2.5 text-xs"
                          />
                        </div>

                        <div className="col-span-2 space-y-0.5">
                          <label className="text-[9px] font-bold uppercase tracking-wider text-text2 block">Detailed Notes</label>
                          <textarea
                            rows={2}
                            placeholder="Details of what was done..."
                            {...maintenanceForm.register('notes')}
                            className="w-full bg-surface border border-border/60 rounded-lg p-2 text-xs"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsLogMaintenanceOpen(false)}
                          className="h-8 px-3.5 border border-border rounded-lg text-xs font-semibold text-text2 hover:bg-surface2/30 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isLoggingMaintenance}
                          className="h-8 px-3.5 bg-accent hover:bg-accent/95 disabled:bg-accent/50 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          {isLoggingMaintenance && <Loader2 size={12} className="animate-spin" />}
                          Save Record
                        </button>
                      </div>
                    </motion.form>
                  )}

                  {/* Scrollable logs */}
                  <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1.5 custom-scrollbar">
                    {(!selectedAsset.maintenanceLog || selectedAsset.maintenanceLog.length === 0) ? (
                      <div className="p-6 text-center text-text3 bg-surface2/10 border border-border/50 rounded-xl text-[10px]">
                        No logged maintenance sessions recorded yet.
                      </div>
                    ) : (
                      selectedAsset.maintenanceLog.map((log) => (
                        <div key={log._id} className="border border-border/60 bg-surface rounded-xl p-3 relative flex items-start gap-3">
                          <div className="p-1.5 rounded bg-accent/5 text-accent mt-0.5">
                            <Wrench size={12} />
                          </div>
                          <div className="flex-1 space-y-1 text-xs">
                            <div className="flex justify-between items-center font-bold text-text">
                              <span>{log.type}</span>
                              <span className="text-accent">₹{(log.cost || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-[10px] text-text3">
                              <span>By: {log.performedBy || '—'}</span>
                              <span>Date: {formatDate(log.date)}</span>
                            </div>
                            {log.notes && (
                              <p className="text-[10px] text-text2 pt-1 border-t border-border/30 mt-1 leading-relaxed">
                                {log.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* FORM MODAL: REGISTER / EDIT ASSET */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[700px] bg-surface text-text border border-border/80 shadow-2xl rounded-2xl overflow-hidden p-0 flex flex-col max-h-[90vh]">
          <div className="p-4 px-5 border-b border-border/60 bg-surface2/25 flex justify-between items-center">
            <div>
              <DialogTitle className="text-base font-bold tracking-tight text-text">
                {editingAsset ? 'Modify Asset' : 'Register Asset'}
              </DialogTitle>
              <DialogDescription className="text-[11px] text-text3 mt-0.5">
                {editingAsset ? 'Modify specific metadata details for this asset.' : 'Fill in brand, code, and condition to add a new asset to register.'}
              </DialogDescription>
            </div>
            <button
              onClick={() => setIsFormOpen(false)}
              className="p-1 rounded-md text-text3 hover:text-text hover:bg-surface2 cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={form.handleSubmit(onSubmitAsset)} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[60vh] custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text2 block">Asset Name / Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Drilling Machine Makita"
                    autoComplete="off"
                    {...form.register('name')}
                    className="w-full bg-surface border border-border/60 rounded-lg h-9 px-3 text-xs focus:ring-accent"
                  />
                  {form.formState.errors.name && (
                    <p className="text-[10px] text-red font-semibold">{form.formState.errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text2 block">Asset Code (Unique ID)</label>
                  <input
                    type="text"
                    placeholder="e.g. EQ-MAK-001"
                    disabled={!!editingAsset}
                    autoComplete="off"
                    {...form.register('assetCode')}
                    className="w-full bg-surface border border-border/60 rounded-lg h-9 px-3 text-xs focus:ring-accent disabled:bg-surface2"
                  />
                  {form.formState.errors.assetCode && (
                    <p className="text-[10px] text-red font-semibold">{form.formState.errors.assetCode.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text2 block">Category</label>
                  <select
                    {...form.register('category')}
                    className="w-full bg-surface border border-border/60 rounded-lg h-9 px-2.5 text-xs text-text focus:ring-accent"
                  >
                    <option value="Vehicle">Vehicle</option>
                    <option value="Tool">Tool</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text2 block">Asset Condition</label>
                  <select
                    {...form.register('currentCondition')}
                    className="w-full bg-surface border border-border/60 rounded-lg h-9 px-2.5 text-xs text-text focus:ring-accent"
                  >
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Needs Repair">Needs Repair</option>
                    <option value="Retired">Retired</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text2 block">Brand Name</label>
                  <Select
                    value={watchedBrand}
                    onValueChange={(val) => {
                      form.setValue('brand', val, { shouldValidate: true, shouldDirty: true });
                      handleBrandChange({ target: { value: val } });
                    }}
                  >
                    <SelectTrigger className="w-full bg-surface border border-border/60 rounded-lg h-9 px-3 text-xs text-text focus:ring-accent">
                      <SelectValue placeholder="-- Select Brand --" />
                    </SelectTrigger>
                    <SelectContent className="bg-surface border border-border max-h-60 overflow-y-auto">
                      <SelectGroup>
                        <SelectLabel className="text-[10px] font-bold uppercase tracking-wider text-text3 pl-4">CCTV Camera Brands</SelectLabel>
                        <SelectItem value="Hikvision" className="text-xs">Hikvision</SelectItem>
                        <SelectItem value="Dahua" className="text-xs">Dahua</SelectItem>
                        <SelectItem value="CP Plus" className="text-xs">CP Plus</SelectItem>
                        <SelectItem value="Honeywell" className="text-xs">Honeywell</SelectItem>
                        <SelectItem value="Bosch" className="text-xs">Bosch</SelectItem>
                        <SelectItem value="Uniview" className="text-xs">Uniview</SelectItem>
                        <SelectItem value="Panasonic" className="text-xs">Panasonic</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel className="text-[10px] font-bold uppercase tracking-wider text-text3 pl-4 border-t border-border/40 mt-1 pt-2">Fire Extinguisher Brands</SelectLabel>
                        <SelectItem value="Ceasefire" className="text-xs">Ceasefire</SelectItem>
                        <SelectItem value="Kanex" className="text-xs">Kanex</SelectItem>
                        <SelectItem value="Safex" className="text-xs">Safex</SelectItem>
                        <SelectItem value="Minimax" className="text-xs">Minimax</SelectItem>
                        <SelectItem value="Kidde" className="text-xs">Kidde</SelectItem>
                        <SelectItem value="First Alert" className="text-xs">First Alert</SelectItem>
                        <SelectItem value="Amerex" className="text-xs">Amerex</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectItem value="__custom__" className="text-xs border-t border-border/40 mt-1 pt-2">Other / Custom...</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  
                  {showCustomBrandInput && (
                    <input
                      type="text"
                      placeholder="Enter brand name"
                      value={customBrandName}
                      onChange={(e) => setCustomBrandName(e.target.value)}
                      className="w-full bg-surface border border-border/60 rounded-lg h-9 px-3 mt-1.5 text-xs focus:ring-accent"
                    />
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text2 block">Purchase Date</label>
                  <input
                    type="date"
                    {...form.register('purchaseDate')}
                    className="w-full bg-surface border border-border/60 rounded-lg h-9 px-3 text-xs"
                  />
                </div>

                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text2 block">Purchase Cost (₹)</label>
                  <input
                    type="number"
                    {...form.register('purchaseCost')}
                    className="w-full bg-surface border border-border/60 rounded-lg h-9 px-3 text-xs focus:ring-accent"
                  />
                </div>
              </div>

              {/* Assignment Selectors */}
              <div className="bg-surface2/15 border border-border rounded-xl p-4.5 mt-2 space-y-4">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-accent flex items-center gap-1.5">
                  <User size={13} /> Set Assignments (Mutually Exclusive)
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-text2 block">Assign to Project Site</label>
                    <select
                      {...form.register('assignedProject')}
                      className="w-full bg-surface border border-border/60 rounded-lg h-9 px-2 text-xs text-text"
                    >
                      <option value="">-- No project assigned --</option>
                      {(projects || []).map(p => (
                        <option key={p._id} value={p._id}>{p.code} - {p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-text2 block">Assign to Staff Member</label>
                    <select
                      {...form.register('assignedTo')}
                      className="w-full bg-surface border border-border/60 rounded-lg h-9 px-2 text-xs text-text"
                    >
                      <option value="">-- No staff assigned --</option>
                      {(staff || []).map(s => (
                        <option key={s._id} value={s._id}>{s.name} ({s.role})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Service Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text2 block">Last Service Date</label>
                  <input
                    type="date"
                    {...form.register('lastServiceDate')}
                    className="w-full bg-surface border border-border/60 rounded-lg h-9 px-3 text-xs focus:ring-accent"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text2 block">Next Service Overdue Date</label>
                  <input
                    type="date"
                    {...form.register('nextServiceDue')}
                    className="w-full bg-surface border border-border/60 rounded-lg h-9 px-3 text-xs focus:ring-accent"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border/60 bg-surface2/25 gap-2 sm:gap-0 mt-auto flex justify-end">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="h-9 px-4 border border-border rounded-lg text-text2 hover:text-text hover:bg-surface2/30 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="h-9 px-4 bg-accent hover:bg-accent/95 disabled:bg-accent/50 text-white font-semibold rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-all ml-2"
              >
                {form.formState.isSubmitting && <Loader2 size={13} className="animate-spin" />}
                {editingAsset ? 'Save Changes' : 'Register Asset'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Tiny mock dialog elements wrapper for simple structure */}
      <div className="hidden">
        <Dialog open={false} onOpenChange={() => {}}>
          <div className="bg-white p-4">Dialog Mock</div>
        </Dialog>
      </div>
    </div>
  );
}
