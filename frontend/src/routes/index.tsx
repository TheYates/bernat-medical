import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginPage } from '@/pages/Login';
import { RegisterPage } from '@/pages/Register';
import { DashboardPage } from '@/pages/Dashboard';
import { InventoryPage } from '@/pages/Inventory';
import { SettingsPage } from '@/pages/Settings';
import { ReportsPage } from '@/pages/Reports';
import { NotFound } from '@/pages/NotFound';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { RegisterPatient } from '@/pages/RegisterPatient';
import { ServiceRequest } from '@/pages/ServiceRequest';
import { VitalSigns } from '@/pages/VitalSigns';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/dashboard',
    element: <ProtectedRoute><DashboardPage /></ProtectedRoute>,
  },
  {
    path: '/dashboard/settings',
    element: <ProtectedRoute><SettingsPage /></ProtectedRoute>,
  },
  {
    path: '/dashboard/inventory',
    element: <ProtectedRoute><InventoryPage /></ProtectedRoute>,
  },
  {
    path: '/dashboard/reports',
    element: <ProtectedRoute><ReportsPage /></ProtectedRoute>,
  },
  {
    path: '/dashboard/register-patient',
    element: <ProtectedRoute><RegisterPatient /></ProtectedRoute>,
  },
  {
    path: '/dashboard/service-request',
    element: <ProtectedRoute><ServiceRequest /></ProtectedRoute>,
  },
  {
    path: '/dashboard/vital-signs',
    element: <ProtectedRoute><VitalSigns /></ProtectedRoute>,
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);