import { useState, useEffect } from "react";
import { FormField, FormItem, FormControl } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { History, ArrowLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { api } from "@/lib/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";

interface DiagnosisTabProps {
  form: any;
  patient: any;
  showHistory: boolean;
  onToggleHistory: () => void;
}

interface HistoryItem {
  id: number;
  consultationId: number;
  content: string;
  createdAt: string;
  createdBy: {
    fullName: string;
  };
}

export function DiagnosisTab({
  form,
  patient,
  showHistory,
  onToggleHistory,
}: DiagnosisTabProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedConsultation, setSelectedConsultation] =
    useState<HistoryItem | null>(null);
  const [consultationDetails, setConsultationDetails] = useState<{
    complaints: string;
    clinicalNotes: string;
    diagnosis: string;
    treatment: string;
  } | null>(null);

  const fetchHistory = async () => {
    if (!patient?.id) return;

    setIsLoading(true);
    try {
      const response = await api.get(
        `/consultations/${patient.id}/diagnosis/history`
      );
      setHistory(response.data);
    } catch (error) {
      console.error("Error fetching diagnosis history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchConsultationDetails = async (consultationId: number) => {
    try {
      const response = await api.get(
        `/consultations/${patient.id}/details/${consultationId}`
      );
      setConsultationDetails(response.data);
    } catch (error) {
      console.error("Error fetching consultation details:", error);
    }
  };

  useEffect(() => {
    if (showHistory) {
      fetchHistory();
    }
  }, [showHistory, patient?.id]);

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h2 className="text-lg font-semibold">Diagnosis</h2>
            <p className="text-sm text-muted-foreground">
              Record the patient's diagnosis
            </p>
          </div>

          <Button variant="outline" onClick={onToggleHistory}>
            {showHistory ? (
              <>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Diagnosis
              </>
            ) : (
              <>
                <History className="h-4 w-4 mr-2" />
                View History
              </>
            )}
          </Button>
        </div>

        {showHistory ? (
          <div className="border rounded-md">
            {isLoading ? (
              <div className="text-center py-4">Loading history...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Diagnosis</TableHead>
                    <TableHead>Recorded By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((item) => (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setSelectedConsultation(item);
                        fetchConsultationDetails(item.id);
                      }}
                    >
                      <TableCell>
                        {format(new Date(item.createdAt), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell className="whitespace-pre-wrap">
                        {item.content}
                      </TableCell>
                      <TableCell>{item.createdBy.fullName}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        ) : (
          <FormField
            control={form.control}
            name="diagnosis"
            render={({ field }) => (
              <FormItem>
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
        )}

        <Dialog
          open={!!selectedConsultation}
          onOpenChange={() => setSelectedConsultation(null)}
        >
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                Consultation on{" "}
                {selectedConsultation &&
                  format(
                    new Date(selectedConsultation.createdAt),
                    "dd MMM yyyy"
                  )}
              </DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="diagnosis">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="complaints">Complaints</TabsTrigger>
                <TabsTrigger value="notes">Clinical Notes</TabsTrigger>
                <TabsTrigger value="diagnosis">Diagnosis</TabsTrigger>
                <TabsTrigger value="treatment">Treatment</TabsTrigger>
              </TabsList>

              <TabsContent value="complaints" className="mt-4">
                <div className="whitespace-pre-wrap">
                  {consultationDetails?.complaints}
                </div>
              </TabsContent>

              <TabsContent value="notes" className="mt-4">
                <div className="whitespace-pre-wrap">
                  {consultationDetails?.clinicalNotes}
                </div>
              </TabsContent>

              <TabsContent value="diagnosis" className="mt-4">
                <div className="whitespace-pre-wrap">
                  {consultationDetails?.diagnosis}
                </div>
              </TabsContent>

              <TabsContent value="treatment" className="mt-4">
                <div className="whitespace-pre-wrap">
                  {consultationDetails?.treatment}
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
