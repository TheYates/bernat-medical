import { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { ClinicalNote } from '@/services/clinical-notes.service';

interface ClinicalNotesTabProps {
  form: UseFormReturn<any>;
  patient?: any;
  history?: ClinicalNote[];
  isLoadingHistory?: boolean;
}

export function ClinicalNotesTab({
  form,
  patient,
  history = [],
  isLoadingHistory = false
}: ClinicalNotesTabProps) {
  return (
    <div className="space-y-4">
      {/* Clinical Notes Input */}
      <FormField
        control={form.control}
        name="clinicalNotes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Clinical Notes</FormLabel>
            <Textarea
              {...field}
              placeholder="Enter clinical notes..."
              className="min-h-[150px] resize-none"
            />
          </FormItem>
        )}
      />

      {/* Clinical Notes History */}
      <div>
        <h3 className="text-sm font-medium mb-2">Previous Notes</h3>
        {isLoadingHistory ? (
          <p className="text-sm text-muted-foreground">Loading history...</p>
        ) : history.length > 0 ? (
          <ScrollArea className="h-[300px]">
            <div className="space-y-4">
              {history.map((note) => (
                <Card key={note.id} className="p-3">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium">
                      {format(new Date(note.createdAt), 'MMM d, yyyy')}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(note.createdAt), 'h:mm a')}
                    </span>
                  </div>
                  <Separator className="my-2" />
                  <p className="text-sm whitespace-pre-wrap">{note.notes}</p>
                  <div className="mt-2 text-xs text-muted-foreground">
                    By: {note.recordedBy.firstName} {note.recordedBy.lastName}
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <p className="text-sm text-muted-foreground">No previous notes found</p>
        )}
      </div>
    </div>
  );
} 