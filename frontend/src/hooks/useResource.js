import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  staffService, 
  attendanceService, 
  expenseService, 
  performanceService, 
  travelService, 
  projectService, 
  stockService, 
  materialService, 
  billingService,
  dashboardService,
  salaryService,
  leaveService,
  remarkService
} from '../services/api';

const useGenericResource = (key, service, extraInvalidationKeys = []) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [key],
    queryFn: service.getAll,
  });

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: [key] });
    extraInvalidationKeys.forEach(extra => queryClient.invalidateQueries({ queryKey: [extra] }));
  };

  const createMutation = useMutation({
    mutationFn: service.create,
    onSuccess: handleSuccess,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => service.update(id, data),
    onSuccess: handleSuccess,
  });

  const deleteMutation = useMutation({
    mutationFn: service.delete,
    onSuccess: handleSuccess,
  });

  const bulkCreateMutation = useMutation({
    mutationFn: service.bulkCreate,
    onSuccess: handleSuccess,
  });

  return {
    data: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    create: createMutation.mutateAsync,
    bulkCreate: bulkCreateMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending || bulkCreateMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};

export function useRemarks() {
  return useGenericResource('remarks', remarkService);
}

export const useStaff = () => {
  const resource = useGenericResource('staff', staffService, ['staff-list', 'attendance', 'dashboard-stats']);
  const staffListQuery = useQuery({
    queryKey: ['staff-list'],
    queryFn: staffService.getSmallList,
  });
  return { ...resource, staffList: staffListQuery.data || [] };
};

export const useAttendance = () => useGenericResource('attendance', attendanceService);
export const useExpenses = () => useGenericResource('expenses', expenseService);
export const usePerformance = () => useGenericResource('performance', performanceService);
export const useTravel = () => useGenericResource('travel', travelService);
export const useProjects = () => useGenericResource('projects', projectService);
export const useStock = () => useGenericResource('stock', stockService);
export const useMaterials = () => useGenericResource('materials', materialService);
export const useBilling = () => useGenericResource('billing', billingService);
export const useSalary = () => useGenericResource('salary-payments', salaryService);
export const useLeave = () => useGenericResource('leave', leaveService);
// Remarks hook moved up

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardService.getStats,
    refetchInterval: 30000, // Refetch every 30 seconds for live feel
  });
};
