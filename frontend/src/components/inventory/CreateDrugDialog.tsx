import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery } from '@tanstack/react-query';
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
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { ChevronRight, ChevronLeft } from 'lucide-react';

// Split schema into two steps
const basicDetailsSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  category: z.string().min(1, 'Category is required'),
  strength: z.string().min(1, 'Strength is required'),
  unit: z.string().min(1, 'Unit is required'),
  minStock: z.number().min(0, 'Minimum stock must be positive'),
  expiryDate: z.string().min(1, 'Expiry date is required'),
});

const pricingDetailsSchema = z.object({
  purchaseFormId: z.number().min(1, 'Purchase form is required'),
  purchasePrice: z.number().min(0, 'Price must be positive'),
  saleFormId: z.number().min(1, 'Sale form is required'),
  unitsPerPurchase: z.number().min(1, 'Must have at least 1 unit'),
  posMarkup: z.number().min(0, 'POS markup must be positive'),
  prescriptionMarkup: z.number().min(0, 'Prescription markup must be positive'),
});

const createDrugSchema = basicDetailsSchema.merge(pricingDetailsSchema);

interface CreateDrugDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const units = ['mg', 'ml', 'g'];
const purchaseForms = ['Box', 'Pack', 'Bottle', 'Tube', 'Container'];
const saleForms = ['Strip', 'Tablet', 'Piece', 'ml', 'g'];

interface CategoryData {
  id: number;
  name: string;
}

interface FormData {
  id: number;
  name: string;
}

export function CreateDrugDialog({ open, onOpenChange, onSuccess }: CreateDrugDialogProps) {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [basicDetails, setBasicDetails] = useState<z.infer<typeof basicDetailsSchema> | null>(null);

  const form = useForm({
    resolver: zodResolver(step === 1 ? basicDetailsSchema : pricingDetailsSchema),
    defaultValues: {
      name: '',
      category: '',
      strength: '',
      unit: '',
      minStock: 10,
      expiryDate: '',
      purchaseFormId: 0,
      purchasePrice: 0,
      saleFormId: 0,
      unitsPerPurchase: 0,
      posMarkup: 0.20,
      prescriptionMarkup: 0.10
    },
  });

  // Watch for price calculations
  const purchasePrice = form.watch('purchasePrice');
  const unitsPerPurchase = form.watch('unitsPerPurchase');
  const posMarkup = form.watch('posMarkup');
  const prescriptionMarkup = form.watch('prescriptionMarkup');
  const [posPrice, setPosPrice] = useState(0);
  const [prescriptionPrice, setPrescriptionPrice] = useState(0);

  useEffect(() => {
    if (purchasePrice && unitsPerPurchase) {
      const unitCost = purchasePrice / unitsPerPurchase;
      setPosPrice(unitCost * (1 + posMarkup));
      setPrescriptionPrice(unitCost * (1 + prescriptionMarkup));
    }
  }, [purchasePrice, unitsPerPurchase, posMarkup, prescriptionMarkup]);

  const onSubmitStep1 = (data: z.infer<typeof basicDetailsSchema>) => {
    setBasicDetails(data);
    setStep(2);
  };

  const onSubmitStep2 = async (data: z.infer<typeof pricingDetailsSchema>) => {
    try {
      setIsLoading(true);
      const fullData = { ...basicDetails, ...data };
      await api.post('/inventory/drugs', fullData);
      toast.success('Drug added successfully');
      form.reset();
      setStep(1);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add drug');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch both categories and forms
  const { data: categories } = useQuery({
    queryKey: ['drug-categories'],
    queryFn: async () => {
      const response = await api.get('/inventory/categories');
      return response.data.data;
    },
  });

  const { data: forms } = useQuery({
    queryKey: ['drug-forms'],
    queryFn: async () => {
      const response = await api.get('/inventory/forms');
      return response.data.data;
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>
            Add New Drug - Step {step} of 2
          </DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <form onSubmit={form.handleSubmit(onSubmitStep1)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Basic Details Form */}
              <div className="space-y-2">
                <Label>Drug Name</Label>
                <Input {...form.register('name')} placeholder="e.g., Paracetamol" />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select onValueChange={(value) => form.setValue('category', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((category: CategoryData) => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Strength</Label>
                <Input {...form.register('strength')} placeholder="500" />
              </div>

              <div className="space-y-2">
                <Label>Unit</Label>
                <Select onValueChange={(value) => form.setValue('unit', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Minimum Stock Level</Label>
                <Input
                  type="number"
                  {...form.register('minStock', { valueAsNumber: true })}
                />
                {form.formState.errors.minStock && (
                  <p className="text-sm text-red-500">{form.formState.errors.minStock.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Expiry Date</Label>
                <Input
                  type="date"
                  {...form.register('expiryDate')}
                />
                {form.formState.errors.expiryDate && (
                  <p className="text-sm text-red-500">{form.formState.errors.expiryDate.message}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmitStep2)} className="space-y-4">
            {/* Purchase Details */}
            <div className="space-y-4">
              <h3 className="font-medium">Purchase Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Purchase Form</Label>
                  <Select 
                    onValueChange={(value) => form.setValue('purchaseFormId', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select form" />
                    </SelectTrigger>
                    <SelectContent>
                      {forms?.map((form: FormData) => (
                        <SelectItem key={form.id} value={form.id.toString()}>
                          {form.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Purchase Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...form.register('purchasePrice', { valueAsNumber: true })}
                  />
                </div>
              </div>
            </div>

            {/* Sale Details */}
            <div className="space-y-4">
              <h3 className="font-medium">Sale Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Sale Form</Label>
                  <Select 
                    onValueChange={(value) => form.setValue('saleFormId', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select form" />
                    </SelectTrigger>
                    <SelectContent>
                      {forms?.map((form: FormData) => (
                        <SelectItem key={form.id} value={form.id.toString()}>
                          {form.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Units Per Purchase Form</Label>
                  <Input
                    type="number"
                    {...form.register('unitsPerPurchase', { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>POS Markup</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...form.register('posMarkup', { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prescription Markup</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...form.register('prescriptionMarkup', { valueAsNumber: true })}
                  />
                </div>
              </div>

              {/* Calculated Values */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <Label>Unit Cost</Label>
                  <div className="text-lg font-mono">
                    ${(purchasePrice / unitsPerPurchase || 0).toFixed(2)}
                  </div>
                </div>
                <div>
                  <Label>POS Price</Label>
                  <div className="text-lg font-mono">${posPrice.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">
                    +{(posMarkup * 100).toFixed(0)}% markup
                  </div>
                </div>
                <div>
                  <Label>Prescription Price</Label>
                  <div className="text-lg font-mono">${prescriptionPrice.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">
                    +{(prescriptionMarkup * 100).toFixed(0)}% markup
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <div className="space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Adding...' : 'Add Drug'}
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
} 