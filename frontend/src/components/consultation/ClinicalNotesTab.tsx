import { useState, useEffect } from 'react';
import { FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { ConsultationHistory } from './components/consultation-history';

interface ClinicalNotesTabProps {
  form: any;
  patient: any;
}

export function ClinicalNotesTab({ form, patient }: ClinicalNotesTabProps) {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (patient?.id) {
      setIsLoading(true);
      api.get(`/consultations/${patient.id}/clinical-notes/history`)
        .then(response => setHistory(response.data))
        .catch(error => console.error('Error fetching clinical notes history:', error))
        .finally(() => setIsLoading(false));
    }
  }, [patient?.id]);

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="clinicalNotes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Clinical Notes</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Enter clinical notes"
                className="min-h-[100px]"
                {...field}
              />
            </FormControl>
          </FormItem>
        )}
      />
      
      {patient && (
        <ConsultationHistory
          title="Clinical Notes"
          items={history}
          isLoading={isLoading}
        />
      )}
    </div>
  );
} 