import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

if (!import.meta.env.VITE_API_BASE_URL && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
  console.error('❌ VITE_API_BASE_URL environment variable is not defined! API requests will fall back to localhost and fail. Please set VITE_API_BASE_URL in your Render static site dashboard.');
}

const api = axios.create({
  baseURL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      // Using window.location to force reload and clear React state
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);


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
export const billingService = {
  ...createService('billing'),
  bulkStatusUpdate: (ids, status) => api.put('/billing/bulk-status', { ids, status }).then(res => res.data),
};
export const salaryService = createService('salary-payments');
export const leaveService = createService('leave');
export const remarkService = createService('remarks');
export const siteDiaryService = createService('site-diary');
export const vendorService = {
  ...createService('vendors'),
  getList: () => api.get('/vendor-list').then(res => res.data),
  getHistory: (id) => api.get(`/vendors/${id}/history`).then(res => res.data),
};
export const assetService = {
  ...createService('assets'),
  logMaintenance: (id, data) => api.post(`/assets/${id}/maintenance`, data).then(res => res.data),
  getDueService: () => api.get('/assets/due-service').then(res => res.data),
};

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
