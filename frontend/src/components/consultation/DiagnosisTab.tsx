import { useState, useEffect } from 'react';
import { FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { ConsultationHistory } from './components/consultation-history';

interface DiagnosisTabProps {
  form: any;
  patient: any;
}

export function DiagnosisTab({ form, patient }: DiagnosisTabProps) {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (patient?.id) {
      setIsLoading(true);
      api.get(`/consultations/${patient.id}/diagnosis/history`)
        .then(response => setHistory(response.data))
        .catch(error => console.error('Error fetching diagnosis history:', error))
        .finally(() => setIsLoading(false));
    }
  }, [patient?.id]);

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="diagnosis"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Diagnosis</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Enter diagnosis"
                className="min-h-[100px]"
                {...field}
              />
            </FormControl>
          </FormItem>
        )}
      />
      
      {patient && (
        <ConsultationHistory
          title="Diagnosis"
          items={history}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}