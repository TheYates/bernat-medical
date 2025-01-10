import { useState, useEffect, Fragment } from "react";
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
import { Banknote, CreditCard } from "lucide-react";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import type { Prescription, Payment } from "@/services/prescriptions.service";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const formSchema = z.object({
  clinicId: z.string().min(1, "Clinic ID is required"),
});

const paymentMethods = [
  { id: "card", label: "Card" },
  { id: "mobile", label: "Mobile Money" },
  { id: "cash", label: "Cash" },
  { id: "insurance", label: "Insurance" },
];

const formatDate = (date: string) => {
  if (!date) return "-";

  const d = new Date(date);

  // Function to add ordinal suffix
  const getOrdinalSuffix = (day: number) => {
    if (day > 3 && day < 21) return "th";
    switch (day % 10) {
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
      default:
        return "th";
    }
  };

  const day = d.getDate();
  const suffix = getOrdinalSuffix(day);

  return (
    <>
      {`${day}${suffix} ${d
        .toLocaleString("en-GB", {
          month: "short",
          year: "numeric",
        })
        .toUpperCase()}`}
      <div className="text-xs text-muted-foreground">
        {d
          .toLocaleString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })
          .toUpperCase()}
      </div>
    </>
  );
};

export function DispensingTab() {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<
    string[]
  >([]);
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, number>>(
    {}
  );
  const [showWaitingList, setShowWaitingList] = useState(false);
  const [waitingList, setWaitingList] = useState<WaitingListItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [prescriptionHistory, setPrescriptionHistory] = useState<
    Prescription[]
  >([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

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
      // First get the patient details
      const patientResponse = await api.get(`/patients/${value}`);
      setPatient(patientResponse.data);

      // Only fetch prescriptions if we have a patient
      if (patientResponse.data.id) {
        try {
          const [pendingResponse, historyResponse] = await Promise.all([
            api.get(
              `/pharmacy/prescriptions/pending/${patientResponse.data.id}`
            ),
            api.get(
              `/pharmacy/prescriptions/history/${patientResponse.data.id}`
            ),
          ]);
          setPrescriptions(pendingResponse.data);
          setPrescriptionHistory(historyResponse.data);
        } catch (historyError) {
          console.error("Error fetching prescriptions:", historyError);
          setPrescriptions([]);
          setPrescriptionHistory([]);
        }
      }
    } catch (error) {
      setPatient(null);
      setPrescriptions([]);
      setPrescriptionHistory([]);
      console.error("Error fetching patient:", error);
      if (value.length >= 7) {
        toast.error("Patient not found");
      }
    }
  };

  const fetchPendingPrescriptions = async () => {
    if (!patient?.id) return;

    try {
      const response = await api.get(
        `/pharmacy/prescriptions/pending/${patient.id}`
      );
      setPrescriptions(response.data);
    } catch (error) {
      toast.error("Failed to fetch prescriptions");
    }
  };

  const fetchPrescriptionHistory = async () => {
    if (!patient?.id) return;

    try {
      const response = await api.get(
        `/pharmacy/prescriptions/history/${patient.id}`
      );
      console.log("Prescription history response:", response.data);
      setPrescriptionHistory(response.data);
    } catch (error) {
      toast.error("Failed to fetch prescription history");
    }
  };

  const handlePaymentMethodChange = (method: string) => {
    setSelectedPaymentMethods((prev) => {
      const isSelected = prev.includes(method);
      const newMethods = isSelected
        ? prev.filter((m) => m !== method)
        : [...prev, method];

      // If only one method selected, set full amount
      if (newMethods.length === 1) {
        setPaymentAmounts({ [newMethods[0]]: totalAmount });
      }
      // If switching to multiple methods, reset amounts
      else if (newMethods.length > 1) {
        setPaymentAmounts({});
      }
      // If no methods selected, reset amounts
      else {
        setPaymentAmounts({});
      }

      return newMethods;
    });
  };

  const handlePaymentAmountChange = (method: string, amount: string) => {
    setPaymentAmounts((prev) => ({
      ...prev,
      [method]: parseFloat(amount) || 0,
    }));
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
          fetchPendingPrescriptions(),
          fetchPrescriptionHistory(),
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

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  useEffect(() => {
    if (patient?.id) {
      Promise.all([
        fetchPendingPrescriptions(),
        fetchPrescriptionHistory(),
      ]).catch((error) => {
        console.error("Error fetching patient data:", error);
      });
    }
  }, [patient]);

  return (
    <div className="max-w-[1000px] mx-auto">
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
                    <div>
                      <h3 className="font-semibold">Prescription History</h3>

                      <p className="text-sm text-muted-foreground">
                        View prescriptions that have been dispensed
                      </p>
                    </div>
                    <Button
                      variant="outline"
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
                        <TableHead>Details</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Dispensed By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {prescriptionHistory.map((prescription) => {
                        // Deduplicate prescriptions array
                        const uniquePrescriptions =
                          prescription.prescriptions?.reduce(
                            (acc: any[], curr: any) => {
                              if (!acc.find((p) => p.id === curr.id)) {
                                acc.push(curr);
                              }
                              return acc;
                            },
                            []
                          ) || [];

                        return (
                          <TableRow key={prescription.session_id}>
                            <TableCell>
                              {formatDate(prescription.created_at)}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-2">
                                {uniquePrescriptions.map((drug: any) => (
                                  <div key={drug.id}>
                                    <p className="font-medium">
                                      {drug.drug.genericName}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {drug.drug.strength} {drug.drug.form}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col space-y-2">
                                {uniquePrescriptions.map((drug: any) => (
                                  <DropdownMenu
                                    key={`${prescription.session_id}-${drug.id}-details`}
                                  >
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-2 w-fit"
                                      >
                                        Details
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                      align="start"
                                      className="w-72"
                                    >
                                      <DropdownMenuLabel>
                                        Prescription Details
                                      </DropdownMenuLabel>
                                      <DropdownMenuSeparator />
                                      <div className="p-2 space-y-2">
                                        <div className="grid grid-cols-2 gap-4">
                                          <div className="space-y-1">
                                            <p className="text-sm font-medium">
                                              Dosage
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                              {drug.dosage}
                                            </p>
                                          </div>
                                          <div className="space-y-1">
                                            <p className="text-sm font-medium">
                                              Frequency
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                              {drug.frequency}
                                            </p>
                                          </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                          <div className="space-y-1">
                                            <p className="text-sm font-medium">
                                              Duration
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                              {drug.duration}
                                            </p>
                                          </div>
                                          <div className="space-y-1">
                                            <p className="text-sm font-medium">
                                              Route
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                              {drug.route || "-"}
                                            </p>
                                          </div>
                                        </div>
                                        <div className="space-y-1">
                                          <p className="text-sm font-medium">
                                            Quantity
                                          </p>
                                          <p className="text-sm text-muted-foreground">
                                            {drug.quantity}
                                          </p>
                                        </div>
                                      </div>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              {formatCurrency(
                                Number(prescription.total_amount || 0)
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-2">
                                {prescription.payments?.map(
                                  (payment: Payment, index) => (
                                    <div
                                      key={`${prescription.session_id}-payment-${index}`}
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
                                          {formatCurrency(
                                            Number(payment.amount)
                                          )}
                                        </p>
                                      </div>
                                    </div>
                                  )
                                ) || (
                                  <span className="text-muted-foreground">
                                    -
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {prescription.dispensed_by || "-"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
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
                      View History →
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
                        <TableHead>Route</TableHead>
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
                            <TableCell>{prescription.route || "-"}</TableCell>
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
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Waiting List</DialogTitle>
            <DialogDescription>
              Select a patient from the pharmacy waiting list to dispense their
              prescriptions
            </DialogDescription>
          </DialogHeader>
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
              {waitingList.length > 0 ? (
                waitingList.map((request) => (
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
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center py-8 text-muted-foreground"
                  >
                    <Users2 className="h-8 w-8 mx-auto mb-4 opacity-50" />
                    <p>No patients in waiting list</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
}
