import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserManagement } from "@/components/settings/users/UserManagement";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ServiceManagement } from "@/components/settings/services/ServiceManagement";
import { GeneralSettings } from "@/components/settings/GeneralSettings";
import { PatientManagement } from "@/components/settings/patients/PatientManagement";

export function SettingsPage() {
  return (
    <DashboardLayout>
      <div className="max-w-[960px] mx-auto">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your system settings</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>System Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="users" className="space-y-4">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="users" className="flex-1">
                  User Management
                </TabsTrigger>
                <TabsTrigger value="services" className="flex-1">
                  Services
                </TabsTrigger>
                <TabsTrigger value="patients" className="flex-1">
                  Patients
                </TabsTrigger>
                <TabsTrigger value="general" className="flex-1">
                  General
                </TabsTrigger>
              </TabsList>
              <TabsContent value="users" className="space-y-4">
                <UserManagement />
              </TabsContent>
              <TabsContent value="services" className="space-y-4">
                <ServiceManagement />
              </TabsContent>
              <TabsContent value="patients" className="space-y-4">
                <PatientManagement />
              </TabsContent>
              <TabsContent value="general">
                <GeneralSettings />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
