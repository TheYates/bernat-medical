import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { api } from '@/lib/api';

const clinicSettingsSchema = z.object({
  idPrefix: z.string()
    .min(2, 'Prefix must be at least 2 characters')
    .max(5, 'Prefix cannot exceed 5 characters')
    .regex(/^[A-Z]+$/, 'Prefix must be uppercase letters only'),
  startingNumber: z.number()
    .int('Must be a whole number')
    .min(1, 'Starting number must be at least 1')
    .max(99999, 'Starting number cannot exceed 99999'),
  digitLength: z.number()
    .int('Must be a whole number')
    .min(4, 'Must be at least 4 digits')
    .max(8, 'Cannot exceed 8 digits'),
});

export function GeneralSettings() {
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm({
    resolver: zodResolver(clinicSettingsSchema),
    defaultValues: {
      idPrefix: 'CLN',
      startingNumber: 1,
      digitLength: 6,
    },
  });

  const onSubmit = async (data: z.infer<typeof clinicSettingsSchema>) => {
    try {
      setIsLoading(true);
      await api.put('/settings/clinic', data);
      toast.success('Clinic settings updated successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update settings');
    } finally {
      setIsLoading(false);
    }
  };

  const previewId = () => {
    const prefix = form.watch('idPrefix') || 'CLN';
    const number = form.watch('startingNumber') || 1;
    const length = form.watch('digitLength') || 6;
    return `${prefix}${String(number).padStart(length, '0')}`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Clinic ID Format</CardTitle>
          <CardDescription>
            Configure how patient IDs are generated
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="idPrefix">ID Prefix</Label>
                <Input
                  id="idPrefix"
                  {...form.register('idPrefix')}
                  placeholder="CLN"
                />
                {form.formState.errors.idPrefix && (
                  <p className="text-sm text-red-500">{form.formState.errors.idPrefix.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="startingNumber">Starting Number</Label>
                <Input
                  id="startingNumber"
                  type="number"
                  {...form.register('startingNumber', { valueAsNumber: true })}
                />
                {form.formState.errors.startingNumber && (
                  <p className="text-sm text-red-500">{form.formState.errors.startingNumber.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="digitLength">Number Length</Label>
                <Input
                  id="digitLength"
                  type="number"
                  {...form.register('digitLength', { valueAsNumber: true })}
                />
                {form.formState.errors.digitLength && (
                  <p className="text-sm text-red-500">{form.formState.errors.digitLength.message}</p>
                )}
              </div>
            </div>

            <div className="pt-2">
              <div className="text-sm text-muted-foreground">Preview:</div>
              <code className="text-lg font-mono">{previewId()}</code>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 