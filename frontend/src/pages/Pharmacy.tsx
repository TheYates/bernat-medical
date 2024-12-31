import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DispensingTab } from '@/components/pharmacy/DispensingTab';
import { POSTab } from '@/components/pharmacy/POSTab';

export function PharmacyPage() {
  return (
    <DashboardLayout>
      <div className="max-w-[900px] mx-auto">
        <div className="mb-2">
          <h1 className="text-lg font-bold tracking-tight">Pharmacy</h1>
          <p className="text-sm text-muted-foreground">
            Manage prescriptions and over-the-counter sales
          </p>
        </div>

        <Tabs defaultValue="dispensing">
          <TabsList>
            <TabsTrigger value="dispensing">Dispensing</TabsTrigger>
            <TabsTrigger value="pos">Point of Sale</TabsTrigger>
          </TabsList>

          <TabsContent value="dispensing" className="space-y-4">
            <DispensingTab />
          </TabsContent>

          <TabsContent value="pos" className="space-y-4">
            <POSTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
} 