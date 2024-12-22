import { useState, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const restockSchema = z.object({
  purchaseQuantity: z.number().min(1, 'Quantity must be positive'),
  batchNumber: z.string().min(1, 'Batch number is required'),
  expiryDate: z.string().min(1, 'Expiry date is required'),
  notes: z.string().optional(),
});

interface RestockDialogProps {
  drug: {
    id: number;
    name: string;
    purchaseForm: string;
    saleForm: string;
    unitsPerPurchase: number;
    strength: string;
    unit: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function RestockDialog({ drug, open, onOpenChange, onSuccess }: RestockDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [saleUnits, setSaleUnits] = useState(0);

  const form = useForm({
    resolver: zodResolver(restockSchema),
    defaultValues: {
      purchaseQuantity: 1,
      batchNumber: '',
      expiryDate: '',
      notes: '',
    },
  });

  // Calculate sale units when purchase quantity changes
  const purchaseQuantity = form.watch('purchaseQuantity');
  useEffect(() => {
    setSaleUnits(purchaseQuantity * drug.unitsPerPurchase);
  }, [purchaseQuantity, drug.unitsPerPurchase]);

  const onSubmit = async (data: z.infer<typeof restockSchema>) => {
    try {
      setIsLoading(true);
      await api.post(`/inventory/drugs/${drug.id}/restock`, {
        ...data,
        saleQuantity: saleUnits,
      });
      toast.success('Stock added successfully');
      form.reset();
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add stock');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Restock {drug.name}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {drug.strength} {drug.unit}
          </p>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Purchase Quantity ({drug.purchaseForm}s)</Label>
            <Input
              type="number"
              {...form.register('purchaseQuantity', { valueAsNumber: true })}
            />
            {form.formState.errors.purchaseQuantity && (
              <p className="text-sm text-red-500">
                {form.formState.errors.purchaseQuantity.message}
              </p>
            )}
          </div>

          <div className="rounded-lg bg-muted p-3">
            <p className="text-sm font-medium">Will add:</p>
            <p className="text-2xl font-bold">{saleUnits} {drug.saleForm}s</p>
          </div>

          <div className="space-y-2">
            <Label>Batch Number</Label>
            <Input {...form.register('batchNumber')} />
            {form.formState.errors.batchNumber && (
              <p className="text-sm text-red-500">
                {form.formState.errors.batchNumber.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Expiry Date</Label>
            <Input type="date" {...form.register('expiryDate')} />
            {form.formState.errors.expiryDate && (
              <p className="text-sm text-red-500">
                {form.formState.errors.expiryDate.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Textarea
              {...form.register('notes')}
              placeholder="Add any additional notes"
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
              {isLoading ? 'Adding...' : 'Add Stock'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 