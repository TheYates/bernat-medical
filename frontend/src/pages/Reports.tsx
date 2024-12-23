import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AuditLogTable } from '@/components/audit/AuditLogTable';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function ReportsPage() {
  const { data: auditData, isLoading: isAuditLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const response = await api.get('/audit');
      return response.data;
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">View system reports and logs</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="audit" className="space-y-4">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="audit" className="flex-1">Audit Log</TabsTrigger>
                <TabsTrigger value="activity" className="flex-1">Activity Report</TabsTrigger>
                <TabsTrigger value="analytics" className="flex-1">Analytics</TabsTrigger>
              </TabsList>
              <TabsContent value="audit" className="space-y-4">
                <AuditLogTable logs={auditData?.data || []} isLoading={isAuditLoading} />
              </TabsContent>
              <TabsContent value="activity">
                {/* Activity report content */}
              </TabsContent>
              <TabsContent value="analytics">
                {/* Analytics content */}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
} 