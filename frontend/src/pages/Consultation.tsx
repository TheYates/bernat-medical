import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users2 } from "lucide-react";
import { consultationService } from "@/services/consultation.service";
import {
  waitingListService,
  WaitingListItem,
} from "@/services/waiting-list.service";
import { format } from "date-fns";
import { calculateAge } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Patient } from "@/types/patient";

// Import tab components
import { ComplaintsTab } from "@/components/consultation/ComplaintsTab";
import { ClinicalNotesTab } from "@/components/consultation/ClinicalNotesTab";
import { DiagnosisTab } from "@/components/consultation/DiagnosisTab";
import { TreatmentTab } from "@/components/consultation/TreatmentTab";
import { VitalSignsTab } from "@/components/consultation/VitalSignsTab";
import { InvestigationsTab } from "@/components/consultation/InvestigationsTab";
import { PrescriptionsTab } from "@/components/consultation/PrescriptionsTab";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PatientDetails } from "@/components/shared/patient-details";
import { TodayVitalSignsDisplay } from "@/components/consultation/components/today-vital-signs-display";
import { ConsultationTabs } from "@/components/consultation/ConsultationTabs";

interface PrescriptionDrug {
  id: string;
  drug: {
    genericName: string;
  };
  dosage: string;
  frequency: string;
  duration: string;
}

const consultationSchema = z.object({
  clinicId: z.string().min(1, "Clinic ID is required"),
  complaints: z.string().min(1, "Complaints are required"),
  clinicalNotes: z.string().optional(),
  diagnosis: z.string().min(1, "Diagnosis is required"),
  treatment: z.string().min(1, "Treatment plan is required"),
  treatmentNotes: z.string().optional(),
  prescriptions: z.array(z.any()).optional(),
});

export function ConsultationPage() {
  const [showPreview, setShowPreview] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [showWaitingList, setShowWaitingList] = useState(false);
  const [waitingList, setWaitingList] = useState<WaitingListItem[]>([]);
  const [isLoadingWaitingList, setIsLoadingWaitingList] = useState(false);
  const [selectedDrugs, setSelectedDrugs] = useState<PrescriptionDrug[]>([]);
  const [activeTab, setActiveTab] = useState("prescriptions");
  const [waitingListCount, setWaitingListCount] = useState(0);

  const form = useForm({
    resolver: zodResolver(consultationSchema),
    defaultValues: {
      clinicId: "",
      complaints: "",
      clinicalNotes: "",
      diagnosis: "",
      treatment: "",
    },
  });

  const onClinicIdChange = async (value: string) => {
    if (!value || value.length < 3) {
      setPatient(null);
      return;
    }

    try {
      const response = await api.get(`/patients/${value}`);
      setPatient(response.data);
    } catch (error) {
      toast.error("Failed to fetch patient details");
    }
  };

  const handleSubmit = async (data: z.infer<typeof consultationSchema>) => {
    if (!patient?.id) return;

    try {
      // Save consultation data
      await consultationService.create(Number(patient.id), {
        ...data,
        prescriptions: selectedDrugs,
        clinicId: patient.clinicId,
      });

      // Update service request status to completed
      if (patient?.serviceRequestId) {
        try {
          await api.put(`/requests/${patient.serviceRequestId}/status`, {
            status: "Completed",
          });
        } catch (error) {
          console.error("Status update error:", error);
        }
      }

      toast.success("Consultation saved successfully", {
        description: `Consultation for ${patient.firstName} ${patient.lastName} has been recorded.`,
        action: {
          label: "View History",
          onClick: () => setActiveTab("history"),
        },
      });

      // Reset form and state
      form.reset();
      setPatient(null);
      setSelectedDrugs([]);
      setShowPreview(false);
      fetchWaitingList(); // Refresh waiting list to show updated status
    } catch (error) {
      toast.error("Failed to save consultation", {
        description:
          "There was an error saving the consultation. Please try again.",
      });
    }
  };

  const fetchWaitingList = async () => {
    setIsLoadingWaitingList(true);
    try {
      const data = await waitingListService.getAll();
      setWaitingList(data);
      setWaitingListCount(data.length);
    } catch (error) {
      toast.error("Failed to fetch waiting list");
    } finally {
      setIsLoadingWaitingList(false);
    }
  };

  const handleSelectPatient = async (request: WaitingListItem) => {
    try {
      await waitingListService.updateStatus(request.id);
      console.log("Selected request:", request); // Debug log

      const clinicId = request.patient.clinicId;
      form.setValue("clinicId", clinicId);

      if (clinicId.length >= 7) {
        const patientResponse = await api.get(`/patients/${clinicId}`);
        const patientWithRequest = {
          ...patientResponse.data,
          serviceRequestId: request.id,
        };
        console.log("Setting patient with request:", patientWithRequest); // Debug log
        setPatient(patientWithRequest);
      }

      setShowWaitingList(false);
      fetchWaitingList();
    } catch (error) {
      console.error("Select patient error:", error); // Debug log
      toast.error("Failed to select patient");
    }
  };

  useEffect(() => {
    fetchWaitingList();

    const interval = setInterval(fetchWaitingList, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleSavePrescriptions = async (prescriptions: any[]) => {
    if (!patient) return;

    try {
      await api.post(`/prescriptions/${patient.id}`, {
        items: prescriptions.map((p) => ({
          drugId: p.drugId,
          dosage: p.dosage,
          frequency: p.frequency,
          duration: p.duration,
          route: p.route,
          quantity: p.quantity,
        })),
        instructions: prescriptions[0]?.instructions, // If you have instructions
      });
      toast.success("Prescriptions saved successfully");
    } catch (error) {
      console.error("Error saving prescriptions:", error);
      toast.error("Failed to save prescriptions");
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-[1100px] mx-auto">
        <div className="mb-2">
          <h1 className="text-lg font-bold tracking-tight">Consultation</h1>
          <p className="text-sm text-muted-foreground">
            Record patient consultation details
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className="space-y-3"
              >
                {/* Patient Search Section */}
                <div className="flex justify-between items-end">
                  <FormField
                    control={form.control}
                    name="clinicId"
                    render={({ field }) => (
                      <FormItem className="w-[200px]">
                        <FormLabel>Clinic ID</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              onClinicIdChange(e.target.value);
                            }}
                            placeholder="Enter clinic ID"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowWaitingList(true)}
                  >
                    <Users2 className="h-4 w-4 mr-2" />
                    Waiting List
                    {waitingListCount > 0 && (
                      <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                        {waitingListCount}
                      </span>
                    )}
                  </Button>
                </div>

                {/* Patient Details - Always show */}
                <div className="mb-4">
                  <PatientDetails patient={patient} />
                </div>

                {/* Today's Vital Signs */}
                <div className="mb-4">
                  <TodayVitalSignsDisplay
                    vitalSigns={patient?.todayVitalSigns}
                  />
                </div>

                {/* Consultation Tabs */}
                <Tabs defaultValue="complaints" className="w-full">
                  <TabsList className="grid w-full grid-cols-7">
                    <TabsTrigger value="complaints">Complaints</TabsTrigger>
                    <TabsTrigger value="notes">Notes</TabsTrigger>
                    <TabsTrigger value="diagnosis">Diagnosis</TabsTrigger>
                    <TabsTrigger value="treatment">Treatment</TabsTrigger>
                    <TabsTrigger value="vitals">Vitals</TabsTrigger>
                    <TabsTrigger value="investigations">
                      Investigations
                    </TabsTrigger>
                    <TabsTrigger value="prescriptions">
                      Prescriptions
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="prescriptions">
                    <PrescriptionsTab
                      form={form}
                      patient={patient}
                      onSavePrescriptions={handleSavePrescriptions}
                    />
                  </TabsContent>

                  <TabsContent value="complaints">
                    <ComplaintsTab form={form} patient={patient} />
                  </TabsContent>

                  <TabsContent value="notes">
                    <ClinicalNotesTab form={form} patient={patient} />
                  </TabsContent>

                  <TabsContent value="diagnosis">
                    <DiagnosisTab form={form} patient={patient} />
                  </TabsContent>

                  <TabsContent value="treatment">
                    <TreatmentTab form={form} patient={patient} />
                  </TabsContent>

                  <TabsContent value="vitals">
                    <VitalSignsTab patient={patient} />
                  </TabsContent>

                  <TabsContent value="investigations">
                    <InvestigationsTab patient={patient} />
                  </TabsContent>
                </Tabs>

                <div className="flex justify-end mt-6">
                  <Button
                    type="button"
                    disabled={!patient}
                    onClick={() => setShowPreview(true)}
                  >
                    Review & Save
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Preview Dialog */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Review Consultation</DialogTitle>
              <DialogDescription>
                Please review the consultation details before saving
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid gap-2">
                <h4 className="font-medium">Patient Details</h4>
                <div className="text-sm">
                  <p>
                    <span className="font-medium">Name:</span>{" "}
                    {patient?.firstName} {patient?.lastName}
                  </p>
                  <p>
                    <span className="font-medium">Clinic ID:</span>{" "}
                    {patient?.clinicId}
                  </p>
                </div>
              </div>

              <div className="grid gap-2">
                <h4 className="font-medium">Consultation Details</h4>
                <div className="text-sm space-y-2">
                  <p>
                    <span className="font-medium">Complaints:</span>{" "}
                    {form.getValues("complaints")}
                  </p>
                  {form.getValues("clinicalNotes") && (
                    <p>
                      <span className="font-medium">Clinical Notes:</span>{" "}
                      {form.getValues("clinicalNotes")}
                    </p>
                  )}
                  <p>
                    <span className="font-medium">Diagnosis:</span>{" "}
                    {form.getValues("diagnosis")}
                  </p>
                  <p>
                    <span className="font-medium">Treatment Plan:</span>{" "}
                    {form.getValues("treatment")}
                  </p>
                </div>
              </div>

              {selectedDrugs.length > 0 && (
                <div className="grid gap-2">
                  <h4 className="font-medium">Prescriptions</h4>
                  <div className="text-sm">
                    {selectedDrugs.map((drug, index) => (
                      <div key={drug.id} className="py-1">
                        {index + 1}. {drug.drug.genericName} - {drug.dosage},{" "}
                        {drug.frequency}, {drug.duration}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowPreview(false);
                  handleSubmit(form.getValues());
                }}
              >
                Confirm & Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showWaitingList} onOpenChange={setShowWaitingList}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Waiting List</DialogTitle>
              <DialogDescription>
                Select a patient from the waiting list
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4">
              {isLoadingWaitingList ? (
                <div className="text-center py-8">Loading waiting list...</div>
              ) : waitingList.length > 0 ? (
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Age</TableHead>
                        <TableHead>Gender</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {waitingList.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell>
                            {request.createdAt
                              ? format(new Date(request.createdAt), "hh:mm a")
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {request.patient.firstName}{" "}
                                {request.patient.middleName}{" "}
                                {request.patient.lastName}
                              </p>
                              <div className="flex items-center gap-2">
                                <p className="text-sm text-muted-foreground">
                                  {request.patient.clinicId}
                                </p>
                                <Badge
                                  variant={
                                    request.status === "In Progress"
                                      ? "secondary"
                                      : "default"
                                  }
                                >
                                  {request.status}
                                </Badge>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {calculateAge(request.patient.dateOfBirth)}y
                          </TableCell>
                          <TableCell>{request.patient.gender}</TableCell>
                          <TableCell>{request.service.name}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => handleSelectPatient(request)}
                            >
                              Select
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users2 className="h-8 w-8 mx-auto mb-4 opacity-50" />
                  <p>No patients in waiting list</p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowWaitingList(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
