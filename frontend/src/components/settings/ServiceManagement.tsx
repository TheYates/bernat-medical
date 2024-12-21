import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ServiceTable } from './ServiceTable';
import { CreateServiceDialog } from './CreateServiceDialog';
import { useServices } from '@/hooks/useServices';

export function ServiceManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { services, isLoading, error, refetch } = useServices();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Services</h2>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Service
        </Button>
      </div>
      
      {error && (
        <div className="text-red-500">Error loading services: {error}</div>
      )}
      
      <ServiceTable services={services} isLoading={isLoading} onServiceUpdated={refetch} />
      
      <CreateServiceDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={refetch}
      />
    </div>
  );
} 