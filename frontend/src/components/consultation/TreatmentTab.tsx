import { useState, useEffect } from 'react';
import { FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { ConsultationHistory } from './components/consultation-history';

interface TreatmentTabProps {
  form: any;
  patient: any;
}

export function TreatmentTab({ form, patient }: TreatmentTabProps) {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (patient?.id) {
      setIsLoading(true);
      api.get(`/consultations/${patient.id}/treatment/history`)
        .then(response => setHistory(response.data))
        .catch(error => console.error('Error fetching treatment history:', error))
        .finally(() => setIsLoading(false));
    }
  }, [patient?.id]);

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="treatment"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Treatment Plan</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Enter treatment plan"
                className="min-h-[100px]"
                {...field}
              />
            </FormControl>
          </FormItem>
        )}
      />
      
      {patient && (
        <ConsultationHistory
          title="Treatment Plan"
          items={history}
          isLoading={isLoading}
        />
      )}
    </div>
  );
} 