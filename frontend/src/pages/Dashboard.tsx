import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <DashboardLayout>
      <div>
        <h1 className="text-3xl font-bold mb-6">Welcome, {user?.fullName}</h1>
        {/* Add role-specific dashboard content here */}
      </div>
    </DashboardLayout>
  );
} 