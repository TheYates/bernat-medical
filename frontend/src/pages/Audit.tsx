import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AuditLogTable } from '@/components/audit/AuditLogTable';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function AuditPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page],
    queryFn: async () => {
      const response = await api.get(`/audit?page=${page}&limit=50`);
      return response.data;
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold">Audit Log</h1>
          <p className="text-muted-foreground">System activity history</p>
        </div>

        <AuditLogTable logs={data?.data || []} isLoading={isLoading} />
      </div>
    </DashboardLayout>
  );
} 