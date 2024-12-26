import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users2 } from 'lucide-react';
import { consultationService } from '@/services/consultation.service';
import { waitingListService, WaitingListItem } from '@/services/waiting-list.service';
import { format } from 'date-fns';
import { calculateAge } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

// Import tab components
import { ComplaintsTab } from '@/components/consultation/ComplaintsTab';
import { ClinicalNotesTab } from '@/components/consultation/ClinicalNotesTab';
import { DiagnosisTab } from '@/components/consultation/DiagnosisTab';
import { TreatmentTab } from '@/components/consultation/TreatmentTab';
import { VitalSignsTab } from '@/components/consultation/VitalSignsTab';
import { InvestigationsTab } from '@/components/consultation/InvestigationsTab';
import { PrescriptionsTab } from '@/components/consultation/PrescriptionsTab';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PatientDetails } from '@/components/shared/patient-details';
import { TodayVitalSignsDisplay } from '@/components/consultation/components/today-vital-signs-display';

const consultationSchema = z.object({
  clinicId: z.string().min(1, 'Clinic ID is required'),
  complaints: z.string().min(1, 'Complaints are required'),
  clinicalNotes: z.string().optional(),
  diagnosis: z.string().min(1, 'Diagnosis is required'),
  treatment: z.string().min(1, 'Treatment plan is required'),
  treatmentNotes: z.string().optional(),
  prescriptions: z.array(z.any()).optional(),
});

export function ConsultationPage() {
  const [showPreview, setShowPreview] = useState(false);
  const [patient, setPatient] = useState(null);
  const { toast } = useToast();
  const [showWaitingList, setShowWaitingList] = useState(false);
  const [waitingList, setWaitingList] = useState<WaitingListItem[]>([]);
  const [isLoadingWaitingList, setIsLoadingWaitingList] = useState(false);
  const [selectedDrugs, setSelectedDrugs] = useState([]);

  const form = useForm({
    resolver: zodResolver(consultationSchema),
    defaultValues: {
      clinicId: '',
      complaints: '',
      clinicalNotes: '',
      diagnosis: '',
      treatment: '',
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
      console.error('Error fetching patient:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch patient details",
      });
    }
  };

  const handleSubmit = async (data: z.infer<typeof consultationSchema>) => {
    if (!patient?.id) return;

    try {
      await consultationService.create(patient.id, {
        ...data,
        prescriptions: selectedDrugs,
        clinicId: patient.clinicId,
      });

      toast({
        title: "Success",
        description: "Consultation saved successfully",
      });

      form.reset();
      setPatient(null);
      setSelectedDrugs([]);
    } catch (error) {
      console.error('Error saving consultation:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save consultation",
      });
    }
  };

  const fetchWaitingList = async () => {
    setIsLoadingWaitingList(true);
    try {
      const data = await waitingListService.getAll();
      setWaitingList(data);
    } catch (error) {
      console.error('Error fetching waiting list:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch waiting list",
      });
    } finally {
      setIsLoadingWaitingList(false);
    }
  };

  const handleSelectPatient = async (request: WaitingListItem) => {
    try {
      await waitingListService.updateStatus(request.id);
      
      // Set clinic ID in form and trigger input change
      const clinicId = request.patient.clinicId;
      form.setValue("clinicId", clinicId);
      
      // Get patient details like in VitalSigns.tsx
      if (clinicId.length >= 7) {
        const patientResponse = await api.get(`/patients/${clinicId}`);
        setPatient(patientResponse.data);
      }
      
      setShowWaitingList(false);
      fetchWaitingList();
    } catch (error) {
      console.error('Error selecting patient:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to select patient",
      });
    }
  };

  useEffect(() => {
    fetchWaitingList();
  }, []);

  return (
    <DashboardLayout>
    <div className="max-w-[900px] mx-auto">
      <div className="mb-2">
        <h1 className="text-lg font-bold tracking-tight">Consultation</h1>
        <p className="text-sm text-muted-foreground">
          Record patient consultation details
        </p>
      </div>

      <Card>
        <CardContent className="p-3">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">
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
                </Button>
              </div>

              {/* Patient Details - Always show */}
              <div className="mb-4">
                <PatientDetails patient={patient} />
              </div>

              {/* Today's Vital Signs */}
              <div className="mb-4">
                <TodayVitalSignsDisplay vitalSigns={patient?.todayVitalSigns} />
              </div>

              {/* Consultation Tabs */}
              <Tabs defaultValue="complaints" className="w-full">
                <TabsList className="grid w-full grid-cols-7">
                  <TabsTrigger value="complaints">Complaints</TabsTrigger>
                  <TabsTrigger value="clinical-notes">Notes</TabsTrigger>
                  <TabsTrigger value="diagnosis">Diagnosis</TabsTrigger>
                  <TabsTrigger value="treatment">Treatment</TabsTrigger>
                  <TabsTrigger value="vital-signs">Vitals</TabsTrigger>
                  <TabsTrigger value="investigations">Labs</TabsTrigger>
                  <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
                </TabsList>

                <TabsContent value="complaints">
                  <ComplaintsTab form={form} />
                </TabsContent>

                <TabsContent value="clinical-notes">
                  <ClinicalNotesTab form={form} patient={patient} />
                </TabsContent>

                <TabsContent value="diagnosis">
                  <DiagnosisTab form={form} patient={patient} />
                </TabsContent>

                <TabsContent value="treatment">
                  <TreatmentTab form={form} patient={patient} />
                </TabsContent>

                <TabsContent value="vital-signs">
                  <VitalSignsTab patient={patient} />
                </TabsContent>

                <TabsContent value="investigations">
                  <InvestigationsTab patient={patient} />
                </TabsContent>

                <TabsContent value="prescriptions">
                  <PrescriptionsTab patient={patient} />
                </TabsContent>
              </Tabs>

              <div className="flex justify-end mt-6">
                <Button type="submit" disabled={!patient}>
                  Save Consultation
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Preview Consultation</DialogTitle>
            <DialogDescription>
              Review the consultation details before saving
            </DialogDescription>
          </DialogHeader>
          {/* Add preview content */}
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
              <div className="text-center py-8">
                Loading waiting list...
              </div>
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
                          {request.createdAt ? format(new Date(request.createdAt), "hh:mm a") : "-"}
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
                              <Badge variant={request.status === 'In Progress' ? 'secondary' : 'default'}>
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
            <Button variant="outline" onClick={() => setShowWaitingList(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </DashboardLayout>
  );
} 