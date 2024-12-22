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
import { Drug, Form, Category } from '@/types/inventory';

// Use the same schemas as CreateDrugDialog
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

interface EditDrugDialogProps {
  drug: Drug | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditDrugDialog({ drug, open, onOpenChange, onSuccess }: EditDrugDialogProps) {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [basicDetails, setBasicDetails] = useState<z.infer<typeof basicDetailsSchema> | null>(null);
  const [unitCost, setUnitCost] = useState(0);
  const [posPrice, setPosPrice] = useState(0);
  const [prescriptionPrice, setPrescriptionPrice] = useState(0);

  const form = useForm({
    resolver: zodResolver(step === 1 ? basicDetailsSchema : pricingDetailsSchema),
    defaultValues: {
      // Basic details
      name: drug?.name || '',
      category: drug?.category || '',
      strength: drug?.strength || '',
      unit: drug?.unit || '',
      minStock: drug?.minStock || 10,
      expiryDate: drug?.expiryDate || '',
      // Pricing details
      purchaseFormId: drug?.purchaseFormId || 0,
      purchasePrice: drug?.purchasePrice || 0,
      saleFormId: drug?.saleFormId || 0,
      unitsPerPurchase: drug?.unitsPerPurchase || 0,
      posMarkup: drug?.posMarkup || 0.20,
      prescriptionMarkup: drug?.prescriptionMarkup || 0.10,
    },
  });

  // Watch form values for calculations
  const purchasePrice = form.watch('purchasePrice');
  const unitsPerPurchase = form.watch('unitsPerPurchase');
  const posMarkup = form.watch('posMarkup');
  const prescriptionMarkup = form.watch('prescriptionMarkup');

  // Calculate prices
  useEffect(() => {
    if (purchasePrice && unitsPerPurchase) {
      const cost = purchasePrice / unitsPerPurchase;
      setUnitCost(cost);
      setPosPrice(cost * (1 + posMarkup));
      setPrescriptionPrice(cost * (1 + prescriptionMarkup));
    }
  }, [purchasePrice, unitsPerPurchase, posMarkup, prescriptionMarkup]);

  // Set initial form values when drug changes
  useEffect(() => {
    if (drug) {
      form.reset({
        name: drug.name,
        category: drug.category,
        strength: drug.strength,
        unit: drug.unit,
        minStock: drug.minStock,
        expiryDate: drug.expiryDate,
        purchaseFormId: drug.purchaseFormId,
        purchasePrice: drug.purchasePrice,
        saleFormId: drug.saleFormId,
        unitsPerPurchase: drug.unitsPerPurchase,
        posMarkup: drug.posMarkup,
        prescriptionMarkup: drug.prescriptionMarkup,
      });
      // Set initial calculated prices
      setUnitCost(drug.unitCost);
      setPosPrice(drug.posPrice);
      setPrescriptionPrice(drug.prescriptionPrice);
    }
  }, [drug, form]);

  // Fetch categories and forms
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

  const onSubmitStep1 = (data: z.infer<typeof basicDetailsSchema>) => {
    setBasicDetails(data);
    setStep(2);
  };

  const onSubmitStep2 = async (data: z.infer<typeof pricingDetailsSchema>) => {
    if (!drug) return;
    
    try {
      setIsLoading(true);
      const fullData = { ...basicDetails, ...data };
      await api.put(`/inventory/drugs/${drug.id}`, fullData);
      toast.success('Drug updated successfully');
      form.reset();
      setStep(1);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update drug');
    } finally {
      setIsLoading(false);
    }
  };

  // Add this helper function at the top of the file
  const formatDateForInput = (dateString: string) => {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>
            Edit Drug - Step {step} of 2
          </DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <form onSubmit={form.handleSubmit(onSubmitStep1)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Drug Name</Label>
                <Input {...form.register('name')} />
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select 
                  defaultValue={drug?.category}
                  onValueChange={(value) => form.setValue('category', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((category: Category) => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Strength</Label>
                <Input {...form.register('strength')} />
              </div>

              <div className="space-y-2">
                <Label>Unit</Label>
                <Select 
                  defaultValue={drug?.unit}
                  onValueChange={(value) => form.setValue('unit', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {['mg', 'ml', 'g'].map((unit) => (
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
              </div>

              <div className="space-y-2">
                <Label>Expiry Date</Label>
                <Input
                  type="date"
                  defaultValue={drug?.expiryDate ? formatDateForInput(drug.expiryDate) : ''}
                  {...form.register('expiryDate')}
                />
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
            <div className="space-y-4">
              <h3 className="font-medium">Purchase Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Purchase Form</Label>
                  <Select 
                    defaultValue={drug?.purchaseFormId?.toString()}
                    onValueChange={(value) => form.setValue('purchaseFormId', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select form" />
                    </SelectTrigger>
                    <SelectContent>
                      {forms?.map((form: Form) => (
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

            <div className="space-y-4">
              <h3 className="font-medium">Sale Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Sale Form</Label>
                  <Select 
                    defaultValue={drug?.saleFormId?.toString()}
                    onValueChange={(value) => form.setValue('saleFormId', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select form" />
                    </SelectTrigger>
                    <SelectContent>
                      {forms?.map((form: Form) => (
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
            </div>

            <div className="rounded-lg bg-muted p-4 grid grid-cols-3 gap-4">
              <div>
                <Label>Unit Cost</Label>
                <div className="text-lg font-mono">${unitCost.toFixed(2)}</div>
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
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
} 