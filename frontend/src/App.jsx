import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { ThemeProvider } from './context/ThemeContext';
import { ActionProvider } from './context/ActionContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import StaffManagement from './pages/StaffManagement';
import Attendance from './pages/Attendance';
import Expenses from './pages/Expenses';
import Performance from './pages/Performance';
import TravelHistory from './pages/TravelHistory';
import Projects from './pages/Projects';
import StockTransfer from './pages/StockTransfer';
import MaterialUsage from './pages/MaterialUsage';
import PendingBilling from './pages/PendingBilling';
import SalaryPayment from './pages/SalaryPayment';
import LeaveManagement from './pages/LeaveManagement';

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null; // Or a loading spinner
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <ActionProvider>
            <Toaster position="top-right" richColors />
            <Router>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/*" element={
                  <ProtectedRoute>
                    <Layout>
                      <Routes>
                        <Route path="/"          element={<Dashboard />} />
                        <Route path="/staff"     element={<StaffManagement />} />
                        <Route path="/attendance" element={<Attendance />} />
                        <Route path="/expenses"  element={<Expenses />} />
                        <Route path="/performance" element={<Performance />} />
                        <Route path="/travel"    element={<TravelHistory />} />
                        <Route path="/projects"  element={<Projects />} />
                        <Route path="/stock"     element={<StockTransfer />} />
                        <Route path="/materials" element={<MaterialUsage />} />
                        <Route path="/billing"   element={<PendingBilling />} />
                        <Route path="/salary"    element={<SalaryPayment />} />
                        <Route path="/leave"     element={<LeaveManagement />} />
                      </Routes>
                    </Layout>
                  </ProtectedRoute>
                } />
              </Routes>
            </Router>
          </ActionProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
