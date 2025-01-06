import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { PatientDetails } from "@/components/shared/patient-details";
import { Users2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Patient } from "@/types/patient";
import { format, parseISO } from "date-fns";
import { Loader2 } from "lucide-react";
import { PaymentDialog } from "@/components/shared/payment-dialog";
import { WaitingListItem } from "@/services/waiting-list.service";

interface Prescription {
  id: string;
  drug: {
    id: string;
    genericName: string;
    brandName: string;
    form: string;
    strength: string;
    salePricePerUnit: number;
  };
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  dispensed: boolean;
  payments?: Array<{ method: string }>;
  status?: string;
  createdAt: string;
  dispensedBy?: {
    id: number;
    fullName: string;
  };
  total_amount?: number;
  payment_methods?: string[];
  created_at?: string;
  dispensed_by?: string;
}

const formSchema = z.object({
  clinicId: z.string().min(1, "Clinic ID is required"),
});

export function DispensingTab() {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showWaitingList, setShowWaitingList] = useState(false);
  const [waitingList, setWaitingList] = useState<WaitingListItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [prescriptionHistory, setPrescriptionHistory] = useState<
    Prescription[]
  >([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clinicId: "",
    },
  });

  const totalAmount = prescriptions
    .filter((p) => selectedItems.includes(p.id))
    .reduce((sum, p) => sum + p.drug.salePricePerUnit * p.quantity, 0);

  const onClinicIdChange = async (value: string) => {
    if (!value || value.length < 7) {
      setPatient(null);
      setPrescriptions([]);
      setPrescriptionHistory([]);
      return;
    }

    try {
      const response = await api.get(`/patients/${value}`);
      setPatient(response.data);

      await Promise.all([
        fetchPrescriptions(Number(response.data.id)),
        fetchPrescriptionHistory(Number(response.data.id)),
      ]);
    } catch (error) {
      if (value.length >= 7) {
        setPatient(null);
        setPrescriptions([]);
        setPrescriptionHistory([]);
        toast.error("Patient not found");
      }
    }
  };

  const fetchPrescriptions = async (patientId: number) => {
    try {
      const response = await api.get(`/prescriptions/${patientId}/pending`);
      setPrescriptions(response.data);
    } catch (error) {
      toast.error("Failed to fetch prescriptions");
    }
  };

  const fetchPrescriptionHistory = async (patientId: number) => {
    setIsLoadingHistory(true);
    try {
      const response = await api.get(
        `/pharmacy/prescriptions/history/${patientId}`
      );
      setPrescriptionHistory(response.data);
    } catch (error) {
      toast.error("Failed to fetch prescription history");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleDispense = async () => {
    if (!selectedItems.length) {
      toast.error("Please select items to dispense");
      return;
    }
    setShowPaymentDialog(true);
  };

  const handlePaymentSubmit = async (paymentData: {
    methods: string[];
    amounts: Record<string, number>;
  }) => {
    try {
      await api.post("/pharmacy/prescriptions/dispense", {
        prescriptionIds: selectedItems,
        payments: paymentData.methods.map((method) => ({
          method,
          amount: paymentData.amounts[method],
        })),
      });

      toast.success("Prescriptions dispensed successfully");
      setShowPaymentDialog(false);
      setSelectedItems([]);

      // Refresh all data
      if (patient) {
        await Promise.all([
          fetchPrescriptions(Number(patient.id)),
          fetchPrescriptionHistory(Number(patient.id)),
          fetchWaitingList(),
        ]);
      }
    } catch (error) {
      toast.error("Failed to dispense prescriptions");
    }
  };

  const fetchWaitingList = async () => {
    try {
      const response = await api.get("/pharmacy/waiting-list");
      setWaitingList(response.data);
    } catch (error) {
      toast.error("Failed to fetch waiting list");
    }
  };

  useEffect(() => {
    fetchWaitingList();
  }, []);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "-";
    try {
      return format(parseISO(dateString), "dd/MM/yyyy hh:mm a");
    } catch (error) {
      return "-";
    }
  };

  return (
    <div className="max-w-[960px] mx-auto">
      <Card>
        <CardContent className="p-3">
          <Form {...form}>
            <div className="flex justify-between items-end mb-6">
              <FormField
                control={form.control}
                name="clinicId"
                render={({ field }) => (
                  <FormItem className="w-[200px]">
                    <FormLabel>Clinic ID</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="BP24/0001"
                        className="uppercase"
                        onChange={(e) => {
                          const value = e.target.value.toUpperCase();
                          field.onChange(value);
                          onClinicIdChange(value);
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
          </Form>

          <div className="mb-6">
            <PatientDetails patient={patient} />
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                PRESCRIPTION DETAILS
              </span>
            </div>
          </div>

          <Card className="border rounded-lg">
            <CardContent className="p-6">
              {showHistory ? (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold">Prescription History</h3>
                    <Button
                      variant="ghost"
                      onClick={() => setShowHistory(false)}
                    >
                      ← Back to Prescriptions
                    </Button>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Drug</TableHead>
                        <TableHead>Dosage</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Dispensed By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingHistory ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center h-24">
                            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                          </TableCell>
                        </TableRow>
                      ) : prescriptionHistory.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-center h-24 text-muted-foreground"
                          >
                            No prescription history found
                          </TableCell>
                        </TableRow>
                      ) : (
                        prescriptionHistory.map((prescription) => (
                          <TableRow key={prescription.id}>
                            <TableCell>
                              {formatDate(prescription.created_at)}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">
                                  {prescription.drug?.genericName || "N/A"}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {prescription.drug?.strength || "N/A"}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {prescription.dosage} • {prescription.frequency}
                            </TableCell>
                            <TableCell>{prescription.quantity}</TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex gap-1">
                                  {prescription.payment_methods?.map(
                                    (method: string) => (
                                      <Badge
                                        key={method}
                                        variant="secondary"
                                        className="capitalize"
                                      >
                                        {method}
                                      </Badge>
                                    )
                                  )}
                                </div>
                                {prescription.total_amount && (
                                  <p className="text-sm text-muted-foreground">
                                    {formatCurrency(prescription.total_amount)}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {prescription.dispensed_by || "-"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="font-semibold">Dispense Prescriptions</h3>
                      <p className="text-sm text-muted-foreground">
                        Select prescriptions to dispense
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setShowHistory(true)}
                    >
                      View History
                      {patient && prescriptionHistory.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {prescriptionHistory.length}
                        </Badge>
                      )}
                    </Button>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Drug</TableHead>
                        <TableHead>Dosage</TableHead>
                        <TableHead>Frequency</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {prescriptions.length > 0 ? (
                        prescriptions.map((prescription) => (
                          <TableRow key={prescription.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedItems.includes(
                                  prescription.id
                                )}
                                onCheckedChange={(checked) => {
                                  setSelectedItems((prev) =>
                                    checked
                                      ? [...prev, prescription.id]
                                      : prev.filter(
                                          (id) => id !== prescription.id
                                        )
                                  );
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">
                                  {prescription.drug.genericName}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {prescription.drug.strength}{" "}
                                  {prescription.drug.form}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>{prescription.dosage}</TableCell>
                            <TableCell>{prescription.frequency}</TableCell>
                            <TableCell>{prescription.duration}</TableCell>
                            <TableCell>{prescription.quantity}</TableCell>
                            <TableCell>
                              {formatCurrency(
                                prescription.drug.salePricePerUnit
                              )}
                            </TableCell>
                            <TableCell>
                              {formatCurrency(
                                prescription.drug.salePricePerUnit *
                                  prescription.quantity
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={8}
                            className="text-center py-6 text-muted-foreground"
                          >
                            {patient
                              ? "No pending prescriptions found"
                              : "Enter a clinic ID to view prescriptions"}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>

                  {prescriptions.length > 0 && (
                    <div className="flex justify-end mt-6">
                      <Button onClick={handleDispense}>Process Payment</Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <PaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        totalAmount={totalAmount}
        onSubmit={handlePaymentSubmit}
        summary={{
          title: "Prescription Items",
          items: prescriptions
            .filter((p) => selectedItems.includes(p.id))
            .map((p) => ({
              name: p.drug.genericName,
              quantity: p.quantity,
              amount: p.drug.salePricePerUnit * p.quantity,
            })),
        }}
      />

      <Dialog open={showWaitingList} onOpenChange={setShowWaitingList}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Waiting List</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {waitingList.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Clinic ID</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {waitingList.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        {request.patient.firstName} {request.patient.lastName}
                      </TableCell>
                      <TableCell>{request.patient.clinicId}</TableCell>
                      <TableCell>{request.patient.gender}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => {
                            form.setValue("clinicId", request.patient.clinicId);
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
  );
}
