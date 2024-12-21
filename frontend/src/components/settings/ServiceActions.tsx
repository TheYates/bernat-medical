import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit, Trash, Power } from 'lucide-react';
import type { Service } from '@/types/service';
import { useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, 
    AlertDialogCancel, AlertDialogContent, 
    AlertDialogDescription, AlertDialogFooter, 
    AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { EditServiceDialog } from './EditServiceDialog';

interface ServiceActionsProps {
  service: Service;
  onServiceUpdated: () => void;
}

export function ServiceActions({ service, onServiceUpdated }: ServiceActionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'toggle' | 'delete' | null>(null);

  const handleAction = async () => {
    if (!confirmAction) return;

    try {
      setIsLoading(true);
      if (confirmAction === 'toggle') {
        await api.patch(`/services/${service.id}/toggle-status`);
        toast.success(`Service ${service.active ? 'deactivated' : 'activated'} successfully`);
      } else {
        await api.delete(`/services/${service.id}`);
        toast.success('Service deleted successfully');
      }
      onServiceUpdated();
    } catch (error) {
      toast.error(`Failed to ${confirmAction} service`);
    } finally {
      setIsLoading(false);
      setShowConfirmDialog(false);
      setConfirmAction(null);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => {
              setConfirmAction('toggle');
              setShowConfirmDialog(true);
            }}
          >
            <Power className="mr-2 h-4 w-4" />
            {service.active ? 'Deactivate' : 'Activate'}
          </DropdownMenuItem>
          <DropdownMenuItem 
            className="text-red-600"
            onClick={() => {
              setConfirmAction('delete');
              setShowConfirmDialog(true);
            }}
          >
            <Trash className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditServiceDialog
        service={service}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSuccess={onServiceUpdated}
      />

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'delete' 
                ? 'This will permanently delete the service.'
                : `This will ${service.active ? 'deactivate' : 'activate'} the service.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAction} disabled={isLoading}>
              {isLoading ? 'Processing...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 