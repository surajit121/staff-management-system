import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Mail, Phone, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStaff } from '../hooks/useResource';
import { cn } from '../lib/utils';
import { Skeleton } from '../components/ui/skeleton';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { useAction } from '../context/ActionContext';
import { useEffect } from 'react';
import { downloadCSV } from '../lib/export';
import ImportModal from '../components/ImportModal';

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

const ROLES = [
  "Site Engineer",
  "Project Manager",
  "Store Manager",
  "Field Supervisor",
  "Accountant",
  "Architect",
  "Quantity Surveyor",
  "Safety Officer",
  "Foreman",
  "HR Manager",
  "Operations Lead",
  "Installation & Maintenance Head",
  "Supply Chain Manager",
  "Logistic Manager",
  "Manager",
  "CCTV Technician",
  "Fire Fighting Staff",
  "Transport Manager",
  "MIS Executive",
  "Marketing Executive",
  "Logistic Co-ordinator",
  "Director"
];

const DEPARTMENTS = [
  "Engineering",
  "Management",
  "Inventory",
  "Operations",
  "Finance",
  "Quality Control",
  "Safety & Security",
  "Human Resources",
  "Procurement"
];

const staffSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  role: z.string().min(1, "Role is required"),
  dept: z.string().min(1, "Department is required"),
  phone: z.string().trim().min(10, "Valid phone number is required"),
  email: z.string().trim().email("Invalid email address"),
  initials: z.string().trim().min(2, "Initials required (e.g. AS)"),
  color: z.string().default("#2C5F8A"),
});

export default function StaffManagement() {
  const { data: staff, isLoading, create, bulkCreate, update, remove, isCreating, isUpdating, isDeleting } = useStaff();
  const { registerAddAction, registerImportAction, registerDownloadAction, searchQuery } = useAction();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const filteredStaff = staff.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.dept.toLowerCase().includes(searchQuery.toLowerCase())
  );


  useEffect(() => {
    const unregisterAdd = registerAddAction(() => setIsModalOpen(true));
    const unregisterImport = registerImportAction(() => setIsImportModalOpen(true));
    const unregisterDownload = registerDownloadAction(() => {
      const exportData = filteredStaff.map(s => ({
        Name: s.name,
        Initials: s.initials,
        Role: s.role,
        Department: s.dept,
        Phone: s.phone,
        Email: s.email
      }));
      downloadCSV(exportData, 'Staff_Directory');
    });
    return () => {
      unregisterAdd();
      unregisterImport();
      unregisterDownload();
    };
  }, [registerAddAction, registerImportAction, registerDownloadAction, filteredStaff]);

  const [editingStaff, setEditingStaff] = useState(null);

  const form = useForm({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      name: '',
      role: '',
      dept: '',
      phone: '',
      email: '',
      initials: '',
      color: '#2C5F8A',
    },
  });

  const onSubmit = async (values) => {
    try {
      if (editingStaff) {
        await update({ id: editingStaff._id, data: values });
        toast.success("Staff member updated successfully");
      } else {
        await create(values);
        toast.success("New staff member added");
      }
      handleClose();
    } catch (error) {
      toast.error(error.message || "Something went wrong");
    }
  };

  const handleBulkImport = async (data) => {
    const cleanedData = data.map(row => {
      const findVal = (possibleKeys) => {
        const key = Object.keys(row).find(k => possibleKeys.includes(k.toLowerCase().trim()));
        return key ? String(row[key]) : '';
      };

      const name = findVal(['name', 'full name', 'staff name']);
      
      let initials = findVal(['initials', 'code', 'short name']);
      if (!initials && name) {
        initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
      }

      return {
        name,
        initials: initials || 'ST',
        role: findVal(['role', 'designation', 'position', 'job title']) || 'Site Engineer',
        dept: findVal(['dept', 'department', 'unit', 'team']) || 'Engineering',
        phone: findVal(['phone', 'mobile', 'contact', 'phone number', 'mobile number', 'contact number']).replace(/\s+/g, '') || '0000000000',
        email: findVal(['email', 'mail', 'email address']).trim() || `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        color: '#2C5F8A'
      };
    });

    await bulkCreate(cleanedData);
  };

  const handleEdit = (s) => {
    setEditingStaff(s);
    form.reset({
      name: s.name,
      role: s.role,
      dept: s.dept,
      phone: s.phone,
      email: s.email,
      initials: s.initials,
      color: s.color,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this staff member?")) {
      try {
        await remove(id);
        toast.success("Staff member removed");
      } catch (error) {
        toast.error("Failed to delete staff");
      }
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingStaff(null);
    form.reset();
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text">Team Directory</h2>
          <p className="text-sm text-text2">Manage and view all staff members.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-accent text-white flex items-center gap-2 px-6">
          <Plus size={16} />
          Add Staff
        </Button>
      </div>

      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[650px]">
            <thead>
              <tr className="bg-surface2/50 border-b border-border">
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-text3">Staff Member</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-text3">Role & Dept</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-text3">Contact</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-text3">Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="border-b border-border"><td colSpan={4} className="p-4"><Skeleton className="h-12 w-full" /></td></tr>
                  ))
                ) : filteredStaff.map((s, idx) => (
                  <motion.tr
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    key={s._id}
                    className="border-b border-border last:border-0 hover:bg-surface2/30 transition-all cursor-pointer group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs"
                          style={{ backgroundColor: `${s.color}15`, color: s.color }}
                        >
                          {s.initials}
                        </div>
                        <div>
                          <div className="text-[14px] font-semibold text-text">{s.name}</div>
                          <div className="text-[12px] text-text3">#{s._id.slice(-4)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[13.5px] font-medium text-text">{s.role}</div>
                      <div className="inline-flex mt-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-accent-light text-accent uppercase tracking-wide">
                        {s.dept}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-[12.5px] text-text2">
                          <Phone size={12} className="text-text3" />
                          {s.phone}
                        </div>
                        <div className="flex items-center gap-2 text-[12.5px] text-text2">
                          <Mail size={12} className="text-text3" />
                          {s.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => handleEdit(s)}
                          className="p-2 rounded-lg text-text2 hover:bg-accent-light hover:text-accent transition-all"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(s._id)}
                          className="p-2 rounded-lg text-text2 hover:bg-red-light hover:text-red transition-all"
                        >
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
        <DialogContent className="sm:max-w-[425px] bg-surface text-text">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}</DialogTitle>
            <DialogDescription className="text-sm text-text2">
              {editingStaff ? 'Modify the details of an existing staff member.' : 'Enter the professional details for the new team member.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-text2">Full Name</FormLabel>
                      <FormControl><Input placeholder="John Doe" {...field} className="bg-surface2" /></FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="initials"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-text2">Initials</FormLabel>
                      <FormControl><Input placeholder="JD" {...field} className="bg-surface2" /></FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-text2">Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-surface2">
                            <SelectValue placeholder="Select Role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-surface border-border">
                          {ROLES.map(role => (
                            <SelectItem key={role} value={role}>{role}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dept"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-text2">Department</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-surface2">
                            <SelectValue placeholder="Select Dept" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-surface border-border">
                          {DEPARTMENTS.map(dept => (
                            <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-text2">Email Address</FormLabel>
                    <FormControl><Input placeholder="john@example.com" {...field} className="bg-surface2" /></FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-text2">Phone Number</FormLabel>
                    <FormControl><Input placeholder="9876543210" {...field} className="bg-surface2" /></FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-4">
                <Button variant="outline" type="button" onClick={handleClose}>Cancel</Button>
                <Button type="submit" disabled={isCreating || isUpdating} className="bg-accent text-white">
                  {(isCreating || isUpdating) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {editingStaff ? 'Save Changes' : 'Add Staff'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      <ImportModal 
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleBulkImport}
        title="Import Staff Members"
        requiredFields={['Name', 'Role', 'Department', 'Email', 'Phone']}
        templateData={[
          { Name: 'John Doe', Initials: 'JD', Role: 'Site Engineer', Department: 'Engineering', Email: 'john@example.com', Phone: '9876543210' },
          { Name: 'Jane Smith', Initials: 'JS', Role: 'Store Manager', Department: 'Inventory', Email: 'jane@example.com', Phone: '9123456789' },
        ]}
      />
    </div>
  );
}
