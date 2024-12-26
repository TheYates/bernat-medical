import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DoctorNotesHistory } from "@/types/consultation";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";

interface HistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  history: DoctorNotesHistory | null;
  selectedDate: string | null;
  initialTab: "complaints" | "clinical-notes" | "treatment" | "diagnosis";
}

export function HistoryDialog({
  open,
  onOpenChange,
  history,
  selectedDate,
  initialTab,
}: HistoryDialogProps) {
  // Filter records for the selected date
  const getFilteredHistory = () => {
    if (!history || !selectedDate) return history;

    return {
      complaints: history.complaints.filter(
        (record) => new Date(record.createdAt).toDateString() === selectedDate
      ),
      clinicalNotes: history.clinicalNotes.filter(
        (record) => new Date(record.createdAt).toDateString() === selectedDate
      ),
      treatmentPlans: history.treatmentPlans.filter(
        (record) => new Date(record.createdAt).toDateString() === selectedDate
      ),
      diagnoses: history.diagnoses.filter(
        (record) => new Date(record.createdAt).toDateString() === selectedDate
      ),
    };
  };

  const filteredHistory = getFilteredHistory();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[800px]">
        <DialogHeader>
          <DialogTitle>
            {selectedDate
              ? `Records from ${format(new Date(selectedDate), "MMMM d, yyyy")}`
              : "Patient History"}
          </DialogTitle>
          <DialogDescription>
            View detailed consultation records including complaints, clinical
            notes, diagnoses, and treatment plans. Click on different tabs to
            see specific types of records from this date.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={initialTab} className="w-full">
          <TabsList>
            <TabsTrigger value="complaints">Complaints</TabsTrigger>
            <TabsTrigger value="clinical-notes">Clinical Notes</TabsTrigger>
            <TabsTrigger value="treatment">Treatment Plans</TabsTrigger>
            <TabsTrigger value="diagnosis">Diagnoses</TabsTrigger>
          </TabsList>

          <TabsContent value="complaints">
            {filteredHistory?.complaints.map((record) => (
              <Card key={record.id} className="mb-4">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(record.createdAt), "hh:mm a")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Recorded by: {record.recordedBy.firstName}{" "}
                      {record.recordedBy.lastName}
                    </p>
                  </div>
                  <p className="whitespace-pre-wrap">{record.description}</p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="clinical-notes">
            {filteredHistory?.clinicalNotes.map((record) => (
              <Card key={record.id} className="mb-4">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(record.createdAt), "hh:mm a")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Recorded by: {record.recordedBy.firstName}{" "}
                      {record.recordedBy.lastName}
                    </p>
                  </div>
                  <p className="whitespace-pre-wrap">{record.notes}</p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="treatment">
            {filteredHistory?.treatmentPlans.map((record) => (
              <Card key={record.id} className="mb-4">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(record.createdAt), "hh:mm a")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Recorded by: {record.recordedBy.firstName}{" "}
                      {record.recordedBy.lastName}
                    </p>
                  </div>
                  <p className="whitespace-pre-wrap">{record.plan}</p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="diagnosis">
            {filteredHistory?.diagnoses.map((record) => (
              <Card key={record.id} className="mb-4">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(record.createdAt), "hh:mm a")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Recorded by: {record.recordedBy.firstName}{" "}
                      {record.recordedBy.lastName}
                    </p>
                  </div>
                  <div className="space-y-4">
                    <p className="whitespace-pre-wrap">{record.diagnosis}</p>
                    {record.symptoms.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Symptoms:</p>
                        <div className="flex flex-wrap gap-2">
                          {record.symptoms.map((symptom, index) => (
                            <span
                              key={index}
                              className="bg-muted px-2 py-0.5 rounded-md text-sm"
                            >
                              {symptom}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
