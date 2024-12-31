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
import { cn } from "@/lib/utils";
import { format } from "date-fns";

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
}

const formSchema = z.object({
  clinicId: z.string().min(1, "Clinic ID is required"),
});

const paymentMethods = [
  { id: "card", label: "Card" },
  { id: "mobile", label: "Mobile Money" },
  { id: "cash", label: "Cash" },
  { id: "insurance", label: "Insurance" },
];

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
  const [waitingList, setWaitingList] = useState<Patient[]>([]);
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
    if (!value || value.length < 3) {
      setPatient(null);
      setPrescriptions([]);
      return;
    }

    try {
      const response = await api.get(`/patients/${value}`);
      setPatient(response.data);
      fetchPrescriptions(response.data.id);
    } catch (error) {
      toast.error("Failed to fetch patient details");
    }
  };

  const fetchPrescriptions = async (patientId: string) => {
    try {
      const response = await api.get(`/prescriptions/${patientId}/pending`);
      setPrescriptions(response.data);
    } catch (error) {
      toast.error("Failed to fetch prescriptions");
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

  const handlePaymentSubmit = async () => {
    const totalPaid = Object.values(paymentAmounts).reduce(
      (sum, amount) => sum + amount,
      0
    );

    if (Math.abs(totalPaid - totalAmount) > 0.01) {
      toast.error("Total payment amount must equal the total price");
      return;
    }

    try {
      const selectedPrescriptions = prescriptions.filter((p) =>
        selectedItems.includes(p.id)
      );

      await api.post("/pharmacy/prescriptions/dispense", {
        items: selectedPrescriptions.map((p) => ({
          prescriptionId: p.id,
          drugId: p.drug.id,
          quantity: p.quantity,
          price: p.drug.salePricePerUnit,
        })),
        payments: Object.entries(paymentAmounts).map(([method, amount]) => ({
          method,
          amount,
        })),
        totalAmount,
      });

      toast.success("Items dispensed successfully");
      setShowPaymentDialog(false);
      setSelectedItems([]);
      setSelectedPaymentMethods([]);
      setPaymentAmounts({});

      // Refresh data
      if (patient) {
        fetchPrescriptions(patient.id.toString());
      }

      // Refresh waiting list
      const response = await api.get("/pharmacy/prescriptions/waiting-list");
      setWaitingList(response.data);

      // Emit an event to refresh inventory
      const event = new CustomEvent("inventory-updated");
      window.dispatchEvent(event);
    } catch (error) {
      toast.error("Failed to process dispensing");
    }
  };

  useEffect(() => {
    const fetchWaitingList = async () => {
      try {
        const response = await api.get("/pharmacy/prescriptions/waiting-list");
        setWaitingList(response.data);
      } catch (error) {
        toast.error("Failed to fetch waiting list");
      }
    };

    fetchWaitingList();
  }, []);

  useEffect(() => {
    const fetchPrescriptionHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const response = await api.get("/pharmacy/prescriptions/history");
        setPrescriptionHistory(response.data);
      } catch (error) {
        toast.error("Failed to fetch prescription history");
      } finally {
        setIsLoadingHistory(false);
      }
    };

    fetchPrescriptionHistory();
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6">
          {showHistory ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold">Dispensing History</h2>
                  <p className="text-sm text-muted-foreground">
                    Past dispensing records
                  </p>
                </div>
                <Button variant="ghost" onClick={() => setShowHistory(false)}>
                  ← Back to Dispensing
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Drug</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingHistory ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : prescriptionHistory.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center h-24 text-muted-foreground"
                      >
                        No dispensing history found
                      </TableCell>
                    </TableRow>
                  ) : (
                    prescriptionHistory.map((prescription) => (
                      <TableRow key={prescription.id}>
                        <TableCell>
                          {format(
                            new Date(prescription.createdAt),
                            "dd MMM yyyy"
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {prescription.drug.genericName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {prescription.drug.strength}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{prescription.quantity}</TableCell>
                        <TableCell>
                          {formatCurrency(
                            prescription.drug.salePricePerUnit *
                              prescription.quantity
                          )}
                        </TableCell>
                        <TableCell>
                          {prescription.payments
                            ?.map((p) => p.method)
                            .join(", ") || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              prescription.status === "dispensed"
                                ? "success"
                                : "secondary"
                            }
                          >
                            {prescription.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </>
          ) : (
            <>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-semibold">
                    Dispense Medications
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Process prescriptions and payments
                  </p>
                </div>
                <Button variant="outline" onClick={() => setShowHistory(true)}>
                  View History
                  {prescriptionHistory.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {prescriptionHistory.length}
                    </Badge>
                  )}
                </Button>
              </div>

              <Form {...form}>
                <form
                  className="space-y-6"
                  onSubmit={(e) => e.preventDefault()}
                >
                  <div className="flex justify-between items-end">
                    <FormField
                      control={form.control}
                      name="clinicId"
                      render={({ field }) => (
                        <FormItem className="w-[200px]">
                          <FormLabel className="text-sm">Clinic ID</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="BP24/0001"
                              className="h-10 text-sm uppercase"
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

                  <PatientDetails patient={patient} />

                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Prescription Details
                      </span>
                    </div>
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
                    <div className="flex justify-between items-center mt-6">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Total Amount
                        </p>
                        <p className="text-2xl font-bold">
                          {formatCurrency(totalAmount)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        onClick={handleDispense}
                        disabled={!selectedItems.length}
                        size="lg"
                        className="px-6"
                      >
                        Dispense Selected
                      </Button>
                    </div>
                  )}
                </form>
              </Form>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
            <DialogDescription>
              Total Amount: {formatCurrency(totalAmount)}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-4 gap-4">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className={cn(
                  "flex flex-col items-center justify-center p-6 border rounded-lg cursor-pointer transition-colors",
                  selectedPaymentMethods.includes(method.id)
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
                onClick={() => handlePaymentMethodChange(method.id)}
              >
                {method.id === "card" && (
                  <svg
                    className="w-8 h-8 mb-2"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="M3 10H21" />
                    <path d="M7 15H9" />
                  </svg>
                )}
                {method.id === "mobile" && (
                  <svg
                    className="w-8 h-8 mb-2"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="7" y="3" width="10" height="18" rx="2" />
                    <path d="M12 18h.01" />
                    <path d="M11 3h2" />
                  </svg>
                )}
                {method.id === "cash" && (
                  <svg
                    className="w-8 h-8 mb-2"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="8" />
                    <path d="M12 8v8" />
                    <path d="M15 12H9" />
                  </svg>
                )}
                {method.id === "insurance" && (
                  <svg
                    className="w-8 h-8 mb-2"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 2L3 7v9c0 4.97 3.588 8.413 9 11 5.412-2.587 9-6.03 9-11V7l-9-5z" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                )}
                <span className="text-sm font-medium">{method.label}</span>
              </div>
            ))}
          </div>

          {selectedPaymentMethods.length > 1 && (
            <div className="mt-6">
              <div className="flex items-center gap-4">
                {selectedPaymentMethods.map((method) => (
                  <div key={method} className="flex-1">
                    <label className="text-sm font-medium mb-2 block">
                      {paymentMethods.find((m) => m.id === method)?.label}
                    </label>
                    <Input
                      type="number"
                      value={paymentAmounts[method] || ""}
                      onChange={(e) =>
                        handlePaymentAmountChange(method, e.target.value)
                      }
                      placeholder="Enter amount"
                    />
                  </div>
                ))}
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                Remaining:{" "}
                {formatCurrency(
                  totalAmount -
                    Object.values(paymentAmounts).reduce(
                      (sum, amount) => sum + amount,
                      0
                    )
                )}
              </div>
            </div>
          )}

          <div className="mt-6">
            <h4 className="text-sm font-medium mb-3">Prescription Summary</h4>
            <div className="border rounded-lg divide-y">
              {prescriptions
                .filter((p) => selectedItems.includes(p.id))
                .map((prescription) => (
                  <div key={prescription.id} className="p-3">
                    <div className="font-medium">
                      {prescription.drug.genericName}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {prescription.drug.strength} • {prescription.quantity}{" "}
                      units •
                      {formatCurrency(
                        prescription.drug.salePricePerUnit *
                          prescription.quantity
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPaymentDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePaymentSubmit}
              disabled={!selectedPaymentMethods.length}
            >
              Complete Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  {waitingList.map((patient) => (
                    <TableRow key={patient.id}>
                      <TableCell>
                        {patient.firstName} {patient.lastName}
                      </TableCell>
                      <TableCell>{patient.clinicId}</TableCell>
                      <TableCell>{patient.gender}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => {
                            form.setValue("clinicId", patient.clinicId);
                            onClinicIdChange(patient.clinicId);
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
