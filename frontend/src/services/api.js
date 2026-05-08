import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
});

// Generic service factory to reduce boilerplate
const createService = (endpoint) => ({
  getAll: () => api.get(`/${endpoint}`).then(res => res.data),
  getOne: (id) => api.get(`/${endpoint}/${id}`).then(res => res.data),
  create: (data) => api.post(`/${endpoint}`, data).then(res => res.data),
  bulkCreate: (data) => api.post(`/${endpoint}/bulk`, data).then(res => res.data),
  update: (id, data) => api.put(`/${endpoint}/${id}`, data).then(res => res.data),
  delete: (id) => api.delete(`/${endpoint}/${id}`).then(res => res.data),
});

export const staffService = {
  ...createService('staff'),
  getSmallList: () => api.get('/staff-list').then(res => res.data),
};

export const attendanceService = createService('attendance');
export const expenseService = createService('expenses');
export const performanceService = createService('performance');
export const travelService = createService('travel');
export const projectService = createService('projects');
export const stockService = createService('stock');
export const materialService = createService('materials');
export const billingService = createService('billing');
export const salaryService = createService('salary-payments');
export const leaveService = createService('leave');

export const dashboardService = {
  getStats: () => api.get('/dashboard-stats').then(res => res.data),
};

export const uploadService = {
  upload: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data);
  },
  delete: (filename) => api.delete(`/upload/${filename}`).then(res => res.data),
};

export default api;
