import { UseFormReturn } from 'react-hook-form';
import { Textarea } from '@/components/ui/textarea';
import { FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';

interface TreatmentTabProps {
  form: UseFormReturn<any>;
  patient?: any;
  history?: any[];
  isLoadingHistory?: boolean;
}

export function TreatmentTab({
  form,
  patient,
  history = [],
  isLoadingHistory = false
}: TreatmentTabProps) {
  return (
    <div className="space-y-4">
      {/* Treatment Input */}
      <FormField
        control={form.control}
        name="treatment"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Treatment Plan</FormLabel>
            <Textarea
              {...field}
              placeholder="Enter treatment plan..."
              className="min-h-[150px] resize-none"
            />
          </FormItem>
        )}
      />

      {/* Treatment History */}
      <div>
        <h3 className="text-sm font-medium mb-2">Previous Treatments</h3>
        {isLoadingHistory ? (
          <p className="text-sm text-muted-foreground">Loading history...</p>
        ) : history.length > 0 ? (
          <ScrollArea className="h-[300px]">
            <div className="space-y-4">
              {history.map((record) => (
                <Card key={record.id} className="p-3">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium">
                      {format(new Date(record.createdAt), 'MMM d, yyyy')}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(record.createdAt), 'h:mm a')}
                    </span>
                  </div>
                  <Separator className="my-2" />
                  <p className="text-sm whitespace-pre-wrap">{record.treatment}</p>
                  <div className="mt-2 text-xs text-muted-foreground">
                    By: {record.recordedBy.firstName} {record.recordedBy.lastName}
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <p className="text-sm text-muted-foreground">No previous treatments found</p>
        )}
      </div>
    </div>
  );
} 