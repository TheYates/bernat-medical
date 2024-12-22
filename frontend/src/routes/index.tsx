import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginPage } from '@/pages/Login';
import { DashboardPage } from '@/pages/Dashboard';
import { SettingsPage } from '@/pages/Settings';
import { InventoryPage } from '@/pages/Inventory';
import { NotFound } from '@/pages/NotFound';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/login',
    element: <LoginPage />,
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
    path: '*',
    element: <NotFound />,
  },
]);