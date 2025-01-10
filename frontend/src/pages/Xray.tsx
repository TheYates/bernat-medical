import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users2, FileText, Loader2, Banknote, CreditCard } from "lucide-react";
import { calculateAge, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { api } from "@/lib/api";
import { PatientDetails } from "@/components/shared/patient-details";
import { Patient } from "@/types/patient";

interface XrayWaitingListItem {
  id: string;
  patient: {
    clinicId: string;
    firstName: string;
    middleName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
  };
  service: {
    id: string;
    name: string;
    category: string;
    price: number;
  };
  createdAt: string;
}

interface Payment {
  method: string;
  amount: number;
}

interface Investigation {
  id: string;
  patient_id: string;
  status: string;
  createdAt: string;
  result?: string;
  file_url?: string;
  service: {
    id: string;
    name: string;
    category: string;
    price: number;
  };
  payments?: Payment[];
  performedBy?: {
    fullName: string;
  };
}

const formSchema = z.object({
  clinicId: z.string().min(1, "Clinic ID is required"),
});

export function XrayPage() {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [waitingList, setWaitingList] = useState<XrayWaitingListItem[]>([]);
  const [showWaitingList, setShowWaitingList] = useState(false);
  const [isLoadingWaitingList, setIsLoadingWaitingList] = useState(false);
  const [patientInvestigations, setPatientInvestigations] = useState<
    Investigation[]
  >([]);
  const [isLoadingPatientData, setIsLoadingPatientData] = useState(false);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [showResultDetails, setShowResultDetails] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedInvestigation, setSelectedInvestigation] =
    useState<Investigation | null>(null);
  const [selectedResult, setSelectedResult] = useState<Investigation | null>(
    null
  );
  const [result, setResult] = useState("");
  const [resultFile, setResultFile] = useState<File | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [investigationToDelete, setInvestigationToDelete] =
    useState<Investigation | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clinicId: "",
    },
  });

  const fetchPatientInvestigations = async (patientId: string) => {
    setIsLoadingPatientData(true);
    try {
      const response = await api.get(`/xray-requests/${patientId}/history`);
      setPatientInvestigations(response.data);
    } catch (error) {
      toast.error("Failed to fetch patient investigations");
    } finally {
      setIsLoadingPatientData(false);
    }
  };

  const onClinicIdChange = async (value: string) => {
    if (!value || value.length < 3) {
      setPatient(null);
      return;
    }

    try {
      const response = await api.get(`/patients/${value}`);
      setPatient(response.data);
      fetchPatientInvestigations(String(response.data.id));
    } catch (error) {
      toast.error("Failed to fetch patient details");
    }
  };

  const handleDelete = (investigation: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setInvestigationToDelete(investigation);
    setShowDeleteDialog(true);
  };

  const handleResultSubmit = async () => {
    if (!selectedInvestigation || (!result && !resultFile) || !patient) {
      toast.error("Please enter a result or upload a file");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("result", result);
      if (resultFile) {
        formData.append("file", resultFile);
      }

      await api.post(
        `/xray-requests/${selectedInvestigation.id}/result`,
        formData
      );

      toast.success("Result updated successfully");
      setShowResultDialog(false);
      setResult("");
      setResultFile(null);
      fetchPatientInvestigations(String(patient.id));
      fetchWaitingList();
    } catch (error) {
      toast.error("Failed to update result");
    }
  };

  const confirmDelete = async () => {
    if (!investigationToDelete || !patient) return;

    try {
      await api.delete(`/xray-requests/${investigationToDelete.id}`, {
        data: { reason: deleteReason },
      });

      toast.success("Investigation request deleted");
      setShowDeleteDialog(false);
      setDeleteReason("");
      setInvestigationToDelete(null);
      fetchPatientInvestigations(String(patient.id));
    } catch (error) {
      toast.error("Failed to delete investigation request");
    }
  };

  const fetchWaitingList = async () => {
    setIsLoadingWaitingList(true);
    try {
      const response = await api.get("/xray-requests/waiting-list");
      setWaitingList(response.data);
    } catch (error) {
      toast.error("Failed to fetch waiting list");
    } finally {
      setIsLoadingWaitingList(false);
    }
  };

  useEffect(() => {
    fetchWaitingList();

    const interval = setInterval(fetchWaitingList, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRowClick = (investigation: Investigation) => {
    if (investigation.status === "Pending") {
      setSelectedInvestigation(investigation);
      setShowResultDialog(true);
    } else if (investigation.result) {
      setSelectedResult(investigation);
      setShowResultDetails(true);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-[960px] mx-auto">
        <div className="mb-2">
          <h1 className="text-lg font-bold tracking-tight">
            X-ray & Scan Results
          </h1>
          <p className="text-sm text-muted-foreground">
            Process radiology requests and manage results
          </p>
        </div>

        <Card>
          <CardContent className="p-6 space-y-6">
            <Form {...form}>
              <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                {/* Patient Search Section */}
                <div className="flex justify-between items-end">
                  <FormField
                    control={form.control}
                    name="clinicId"
                    render={({ field }) => (
                      <FormItem className="max-w-[200px]">
                        <FormLabel className="text-sm">Clinic ID</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="BP24/0001"
                            className="h-10 text-sm"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              onClinicIdChange(e.target.value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowWaitingList(true)}
                    className="h-10"
                  >
                    <Users2 className="h-4 w-4 mr-2" />
                    Waiting List
                    {waitingList.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {waitingList.length}
                      </Badge>
                    )}
                  </Button>
                </div>

                {/* Replace Patient Details Grid with PatientDetails component */}
                <PatientDetails patient={patient} />

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      INVESTIGATION DETAILS
                    </span>
                  </div>
                </div>

                <Card>
                  <CardContent className="p-6">
                    {showHistory ? (
                      <>
                        <div className="flex items-center justify-between mb-6">
                          <div>
                            <h3 className="font-semibold">
                              Investigation History
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              View completed x-ray and scan results
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => setShowHistory(false)}
                          >
                            ← Back to Requests
                          </Button>
                        </div>

                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Test</TableHead>
                              <TableHead>Details</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Payment</TableHead>
                              <TableHead>Performed By</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {patientInvestigations.map((investigation) => (
                              <TableRow key={investigation.id}>
                                <TableCell>
                                  {format(
                                    new Date(investigation.createdAt),
                                    "dd MMM yyyy"
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">
                                      {investigation.service.name}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {investigation.service.category}
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedResult(investigation);
                                      setShowResultDetails(true);
                                    }}
                                  >
                                    View Details
                                  </Button>
                                </TableCell>
                                <TableCell>
                                  {formatCurrency(investigation.service.price)}
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-2">
                                    {investigation.payments?.map(
                                      (payment: Payment, index: number) => (
                                        <div
                                          key={`payment-${index}`}
                                          className="flex items-center gap-2"
                                        >
                                          {payment.method
                                            .toLowerCase()
                                            .includes("cash") ? (
                                            <Banknote className="h-4 w-4" />
                                          ) : (
                                            <CreditCard className="h-4 w-4" />
                                          )}
                                          <div className="flex flex-col">
                                            <p className="text-sm font-medium">
                                              {payment.method}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                              {formatCurrency(payment.amount)}
                                            </p>
                                          </div>
                                        </div>
                                      )
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {investigation.performedBy?.fullName || "-"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between items-center mb-4">
                          <div>
                            <h3 className="font-semibold">
                              Process Investigations
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Select investigation to process
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => setShowHistory(true)}
                          >
                            View History →
                          </Button>
                        </div>

                        {/* Existing investigation table */}
                      </>
                    )}
                  </CardContent>
                </Card>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      {/* Result Update Dialog */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Update X-ray/Scan Result</DialogTitle>
            <DialogDescription>
              Enter the result or upload a result document
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Result</Label>
              <Textarea
                value={result}
                onChange={(e) => setResult(e.target.value)}
                placeholder="Enter result"
                className="min-h-[100px]"
              />
            </div>
            <div>
              <Label>Upload Result Document</Label>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setResultFile(e.target.files?.[0] || null)}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Accepted formats: PDF, JPG, JPEG, PNG
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => setShowResultDialog(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleResultSubmit}>
              Save Result
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Result Details Dialog */}
      <Dialog open={showResultDetails} onOpenChange={setShowResultDetails}>
        <DialogContent className="max-w-[600px]">
          <DialogHeader>
            <DialogTitle>X-ray/Scan Result</DialogTitle>
            <DialogDescription asChild>
              {selectedResult && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">
                        Investigation:
                      </span>
                      <div className="font-medium">
                        {selectedResult.service.name}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Category:</span>
                      <div className="font-medium">
                        {selectedResult.service.category}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Date:</span>
                      <div className="font-medium">
                        {format(
                          new Date(selectedResult.createdAt),
                          "dd MMM yyyy"
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <div>
                        <Badge
                          variant={
                            selectedResult.status === "Completed"
                              ? "success"
                              : selectedResult.status === "In Progress"
                              ? "warning"
                              : selectedResult.status === "Cancelled"
                              ? "destructive"
                              : "default"
                          }
                        >
                          {selectedResult.status}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <span className="text-muted-foreground block mb-2">
                      Result:
                    </span>
                    <div className="bg-muted p-4 rounded-lg whitespace-pre-wrap">
                      {selectedResult.result}
                    </div>
                  </div>

                  {selectedResult.file_url && (
                    <div className="mt-4 flex items-center gap-2">
                      <a
                        href={`${import.meta.env.VITE_API_URL}${
                          selectedResult.file_url
                        }`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-2"
                      >
                        <FileText className="h-4 w-4" />
                        View Result Document
                      </a>
                    </div>
                  )}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Investigation Request</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  Are you sure you want to delete this investigation request?
                </p>

                {investigationToDelete && (
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Investigation:
                      </span>
                      <span className="font-medium">
                        {investigationToDelete.service.name}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Category:</span>
                      <span className="font-medium">
                        {investigationToDelete.service.category}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Price:</span>
                      <span className="font-medium">
                        {formatCurrency(investigationToDelete.service.price)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Requested on:
                      </span>
                      <span className="font-medium">
                        {format(
                          new Date(investigationToDelete.createdAt),
                          "dd MMM yyyy"
                        )}
                      </span>
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <Label>Reason for Deletion (Optional)</Label>
                  <Textarea
                    placeholder="Enter reason for deletion"
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    className="mt-2"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteReason("");
                setInvestigationToDelete(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Waiting List Dialog */}
      <Dialog open={showWaitingList} onOpenChange={setShowWaitingList}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>X-ray/Scan Waiting List</DialogTitle>
            <DialogDescription>
              Patients waiting for x-ray and scan procedures
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {isLoadingWaitingList ? (
              <div className="text-center py-4">
                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                <p className="text-sm text-muted-foreground mt-2">
                  Loading waiting list...
                </p>
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
                      <TableHead>Test</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {waitingList.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          {format(new Date(request.createdAt), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {request.patient.firstName}{" "}
                              {request.patient.middleName}{" "}
                              {request.patient.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {request.patient.clinicId}
                            </p>
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
                            onClick={() => {
                              form.setValue(
                                "clinicId",
                                request.patient.clinicId
                              );
                              onClinicIdChange(request.patient.clinicId);
                              setShowWaitingList(false);
                            }}
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
    </DashboardLayout>
  );
}
