import { useState, useEffect } from 'react';
import { FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { ConsultationHistory } from './components/consultation-history';

interface ComplaintsTabProps {
  form: any;
  patient: any;
}

export function ComplaintsTab({ form, patient }: ComplaintsTabProps) {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (patient?.id) {
      setIsLoading(true);
      api.get(`/consultations/${patient.id}/complaints/history`)
        .then(response => setHistory(response.data))
        .catch(error => console.error('Error fetching complaints history:', error))
        .finally(() => setIsLoading(false));
    }
  }, [patient?.id]);

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="complaints"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Complaints</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Enter complaints"
                className="min-h-[100px]"
                {...field}
              />
            </FormControl>
          </FormItem>
        )}
      />
      
      {patient && (
        <ConsultationHistory
          title="Complaints"
          items={history}
          isLoading={isLoading}
          patientId={patient.id}
        />
      )}
    </div>
  );
} 