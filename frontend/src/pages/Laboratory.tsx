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
import {
  Users2,
  Trash2,
  FileText,
  Loader2,
  Banknote,
  CreditCard,
  Upload,
} from "lucide-react";
import { calculateAge, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { api } from "@/lib/api";
import {
  labWaitingListService,
  type LabWaitingListItem,
} from "@/services/lab-waiting-list.service";
import { Investigation } from "@/services/investigations.service";
import { Payment } from "@/services/prescriptions.service";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Patient {
  id: string;
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  clinicId: string;
}

const formSchema = z.object({
  clinicId: z.string().min(1, "Clinic ID is required"),
});

export function LaboratoryPage() {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [waitingList, setWaitingList] = useState<LabWaitingListItem[]>([]);
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

  const onClinicIdChange = async (value: string) => {
    if (!value || value.length < 7) {
      setPatient(null);
      setPatientInvestigations([]);
      return;
    }

    try {
      // First get the patient details
      const patientResponse = await api.get(`/patients/${value}`);
      setPatient(patientResponse.data);

      // Only fetch investigations if we have a patient
      if (patientResponse.data.id) {
        try {
          const historyResponse = await api.get(
            `/lab-requests/${patientResponse.data.id}/history`
          );
          setPatientInvestigations(historyResponse.data);
        } catch (historyError) {
          console.error("Error fetching investigations:", historyError);
          setPatientInvestigations([]);
        }
      }
    } catch (error) {
      setPatient(null);
      setPatientInvestigations([]);
      console.error("Error fetching patient:", error);
      if (value.length >= 7) {
        toast.error("Patient not found");
      }
    }
  };

  const fetchPatientInvestigations = async (patientId: string) => {
    setIsLoadingPatientData(true);
    try {
      const response = await api.get(`/lab-requests/${patientId}/history`);
      setPatientInvestigations(response.data);
    } catch (error) {
      toast.error("Failed to fetch patient investigations");
    } finally {
      setIsLoadingPatientData(false);
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
        `/lab-requests/${selectedInvestigation.id}/result`,
        formData
      );

      toast.success("Result updated successfully");
      setShowResultDialog(false);
      setResult("");
      setResultFile(null);
      fetchPatientInvestigations(patient.id);
      fetchWaitingList();
    } catch (error) {
      toast.error("Failed to update result");
    }
  };

  const confirmDelete = async () => {
    if (!investigationToDelete || !patient) return;

    try {
      await api.delete(`/lab-requests/${investigationToDelete.id}`, {
        data: { reason: deleteReason },
      });

      toast.success("Investigation request deleted");
      setShowDeleteDialog(false);
      setDeleteReason("");
      setInvestigationToDelete(null);
      fetchPatientInvestigations(patient.id);
    } catch (error) {
      toast.error("Failed to delete investigation request");
    }
  };

  const fetchWaitingList = async () => {
    setIsLoadingWaitingList(true);
    try {
      const data = await labWaitingListService.getAll();
      setWaitingList(data);
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
          <h1 className="text-lg font-bold tracking-tight">Laboratory Tests</h1>
          <p className="text-sm text-muted-foreground">
            Process laboratory test requests and manage results
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

                {/* Patient Details Grid */}
                <div className="grid grid-cols-3 gap-2 bg-muted/30 rounded-md p-4">
                  <div className="space-y-1 text-center">
                    <label className="text-sm font-medium text-foreground/70">
                      Name
                    </label>
                    <p className="text-lg font-medium">
                      {patient
                        ? `${patient.firstName} ${patient.middleName} ${patient.lastName}`
                        : "-"}
                    </p>
                  </div>

                  <div className="space-y-1 text-center">
                    <label className="text-sm font-medium text-foreground/70">
                      Age
                    </label>
                    <p className="text-lg font-medium">
                      {patient ? calculateAge(patient.dateOfBirth) : "-"}
                    </p>
                  </div>

                  <div className="space-y-1 text-center">
                    <label className="text-sm font-medium text-foreground/70">
                      Gender
                    </label>
                    <p className="text-lg font-medium">
                      {patient?.gender || "-"}
                    </p>
                  </div>

                  <div className="col-span-3 grid grid-cols-2 gap-4 mt-4">
                    <div className="space-y-1 text-center">
                      <label className="text-sm font-medium text-foreground/70">
                        Date
                      </label>
                      <p className="text-lg font-medium">
                        {format(new Date(), "EEEE, MMMM d, yyyy")}
                      </p>
                    </div>

                    <div className="space-y-1 text-center">
                      <label className="text-sm font-medium text-foreground/70">
                        Time
                      </label>
                      <p className="text-lg font-medium">
                        {format(new Date(), "hh:mm a")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Investigation Results Section Header */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Investigation Results
                    </span>
                  </div>
                </div>

                {/* Results Table */}

                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="font-semibold">
                      {showHistory ? "Investigation History" : "Process Tests"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {showHistory
                        ? "View completed laboratory test results"
                        : "Select test to process"}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowHistory(!showHistory)}
                  >
                    {showHistory ? "← Back to Tests" : "View History →"}
                  </Button>
                </div>

                {showHistory ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Test</TableHead>
                        <TableHead>Result</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Requested By</TableHead>
                        <TableHead>Performed By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!patient ? (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="text-center text-muted-foreground h-24"
                          >
                            Enter clinic ID to view patient's laboratory test
                            history
                          </TableCell>
                        </TableRow>
                      ) : isLoadingPatientData ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center">
                            <div className="flex justify-center items-center h-24">
                              <Loader2 className="h-6 w-6 animate-spin" />
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : patientInvestigations.length > 0 ? (
                        patientInvestigations.map((investigation) => (
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
                              <Badge
                                variant={
                                  investigation.status === "Completed"
                                    ? "success"
                                    : investigation.status === "In Progress"
                                    ? "warning"
                                    : investigation.status === "Cancelled"
                                    ? "destructive"
                                    : "default"
                                }
                              >
                                {investigation.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {investigation.requestedBy.fullName}
                            </TableCell>
                            <TableCell>
                              {investigation.performedBy?.fullName || "-"}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="text-center text-muted-foreground"
                          >
                            No laboratory test history found for this patient
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Investigation</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Result</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Requested By</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!patient ? (
                        <TableRow>
                          <TableCell
                            colSpan={8}
                            className="text-center text-muted-foreground"
                          >
                            Enter clinic ID to view patient's investigations
                          </TableCell>
                        </TableRow>
                      ) : isLoadingPatientData ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center">
                            Loading patient's investigations...
                          </TableCell>
                        </TableRow>
                      ) : patientInvestigations.filter(
                          (inv) => inv.status === "Pending"
                        ).length > 0 ? (
                        patientInvestigations
                          .filter(
                            (investigation) =>
                              investigation.status === "Pending"
                          )
                          .map((investigation) => (
                            <TableRow
                              key={investigation.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => handleRowClick(investigation)}
                            >
                              <TableCell>
                                {format(
                                  new Date(investigation.createdAt),
                                  "dd MMM yyyy"
                                )}
                              </TableCell>
                              <TableCell>
                                {investigation.service.name}
                              </TableCell>
                              <TableCell>
                                {investigation.service.category}
                              </TableCell>
                              <TableCell>
                                {formatCurrency(investigation.service.price)}
                              </TableCell>
                              <TableCell>
                                <span className="text-muted-foreground italic">
                                  Click to update result
                                </span>
                              </TableCell>
                              <TableCell>
                                <Badge variant="default">
                                  {investigation.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {investigation.requestedBy.fullName}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) =>
                                    handleDelete(investigation, e)
                                  }
                                  className="h-8 w-8 p-0"
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={8}
                            className="text-center text-muted-foreground"
                          >
                            No pending investigations found for this patient
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      {/* Result Update Dialog */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Update Test Result</DialogTitle>
            <DialogDescription>
              Manage the result details or upload a document
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Tabs defaultValue="result">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="result">Result</TabsTrigger>
                <TabsTrigger value="upload">Upload Document</TabsTrigger>
              </TabsList>
              <TabsContent value="result">
                <div className="space-y-4">
                  <Label>Result</Label>
                  <Textarea
                    value={result}
                    onChange={(e) => setResult(e.target.value)}
                    placeholder="Enter result"
                    className="min-h-[100px]"
                  />
                </div>
              </TabsContent>
              <TabsContent value="upload">
                <div className="space-y-4">
                  <Label>Upload Result Document</Label>
                  <div className="border-2 border-dashed border-muted-foreground rounded-lg p-6 text-center">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) =>
                        setResultFile(e.target.files?.[0] || null)
                      }
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <div className="flex flex-col items-center justify-center h-full">
                        <Upload className="h-10 w-10 text-muted-foreground" />
                        <p className="mt-2 text-sm text-muted-foreground">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PDF, JPG, JPEG, PNG (Max. 10MB)
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
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
            <DialogTitle>Investigation Result</DialogTitle>
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

                  {selectedResult.fileUrl && (
                    <div className="mt-4 flex items-center gap-2">
                      <a
                        href={`${
                          import.meta.env.VITE_API_URL
                        }/uploads/${selectedResult.fileUrl.split("/").pop()}`}
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
            <DialogTitle>Laboratory Waiting List</DialogTitle>
            <DialogDescription>
              Patients waiting for laboratory tests
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
