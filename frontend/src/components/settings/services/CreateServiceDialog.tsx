import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import type { CreateServiceData } from '@/types/service';
import { toast } from 'sonner';

const createServiceSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  category: z.enum(['laboratory', 'consultation', 'imaging', 'other']),
  price: z.number().min(0, 'Price must be positive'),
  description: z.string().optional(),
});

interface CreateServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const categories = [
  { value: 'laboratory', label: 'Laboratory' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'imaging', label: 'Imaging' },
  { value: 'other', label: 'Other' },
];

export function CreateServiceDialog({ open, onOpenChange, onSuccess }: CreateServiceDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<CreateServiceData>({
    resolver: zodResolver(createServiceSchema),
    defaultValues: {
      price: 0,
    },
  });

  const onSubmit = async (data: CreateServiceData) => {
    try {
      setIsLoading(true);
      await api.post('/services', data);
      toast.success('Service created successfully');
      form.reset();
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create service');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Create New Service</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Service Name</Label>
              <Input
                id="name"
                {...form.register('name')}
                placeholder="e.g., Complete Blood Count"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                onValueChange={(value) => form.setValue('category', value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.category && (
                <p className="text-sm text-red-500">{form.formState.errors.category.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                {...form.register('price', { valueAsNumber: true })}
              />
              {form.formState.errors.price && (
                <p className="text-sm text-red-500">{form.formState.errors.price.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              {...form.register('description')}
              placeholder="Enter service description"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Service'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 