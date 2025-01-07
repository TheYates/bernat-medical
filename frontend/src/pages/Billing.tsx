import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Users,
  ArrowLeft,
  Banknote,
  CreditCard,
  ArrowRight,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaymentDialog } from "@/components/shared/payment-dialog";
import { PatientDetails } from "@/components/shared/patient-details";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Patient } from "@/types/patient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

interface BillingItem {
  id: number;
  request_type: "service_request" | "lab_request";
  service: string;
  amount: number;
  status: string;
  createdAt: string;
}

const formatDate = (date: string) => {
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

export function BillingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [clinicId, setClinicId] = useState(searchParams.get("id") || "");
  const [patient, setPatient] = useState<Patient | null>(null);
  const [items, setItems] = useState<BillingItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<BillingItem | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showWaitingList, setShowWaitingList] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [view, setView] = useState<"pending" | "history">("pending");
  const [waitingListCount, setWaitingListCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (clinicId) {
      onClinicIdChange(clinicId);
    }
  }, []);

  const onClinicIdChange = async (value: string) => {
    setClinicId(value);

    if (!value || value.length < 7) {
      setPatient(null);
      setItems([]);
      setHistoryItems([]);
      setTotalPages(1);
      setPage(1);
      return;
    }

    try {
      const patientResponse = await api.get("/patients/search", {
        params: { searchTerm: value },
      });

      const patientData = patientResponse.data[0];

      if (!patientData || !patientData.id) {
        setPatient(null);
        setItems([]);
        setHistoryItems([]);
        setTotalPages(1);
        setPage(1);
        return;
      }

      setPatient(patientData);

      const [pendingResponse, historyResponse] = await Promise.all([
        api.get(`/billing/pending/${patientData.id}`),
        api.get(`/billing/history/${patientData.id}`, {
          params: { page: 1 },
        }),
      ]);

      setItems(pendingResponse.data);
      setHistoryItems(historyResponse.data.items);
      setTotalPages(historyResponse.data.meta.totalPages);
      setPage(1);
    } catch (error) {
      setPatient(null);
      setItems([]);
      setHistoryItems([]);
      setTotalPages(1);
      setPage(1);
    }
  };

  const fetchPendingPayments = async (patientId: number) => {
    try {
      const response = await api.get(`/billing/pending/${patientId}`);
      setItems(response.data);
    } catch (error) {
      console.error("Error fetching payments:", error);
      toast.error("Failed to fetch pending payments");
    }
  };

  const handlePayment = async (data: {
    methods: string[];
    amounts: Record<string, number>;
  }) => {
    if (!selectedItem) return;

    try {
      // If processing multiple items
      if (items.length > 1 && selectedItem.service.includes(",")) {
        // Process each payment
        for (const item of items) {
          await api.post(`/billing/${item.id}/payment`, {
            methods: data.methods,
            amounts: {
              [data.methods[0]]: Number(item.amount), // Split amount per item
            },
            requestType: item.request_type,
          });
        }
      } else {
        // Single payment processing
        await api.post(`/billing/${selectedItem.id}/payment`, {
          methods: data.methods,
          amounts: data.amounts,
          requestType: selectedItem.request_type,
        });
      }

      toast.success("Payment(s) processed successfully");
      setShowPayment(false);
      setSelectedItem(null);

      // Refresh the lists
      setTimeout(async () => {
        if (patient) {
          await fetchPendingPayments(Number(patient.id));
          await fetchWaitingListCount();
        }
      }, 500);
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Failed to process payment");
    }
  };

  const handleWaitingListSelect = (item: any) => {
    setClinicId(item.clinicId);
    setShowWaitingList(false);
    onClinicIdChange(item.clinicId);
  };

  const fetchPaymentHistory = async (pageNum = 1) => {
    if (!patient) return;

    try {
      const response = await api.get(`/billing/history/${patient.id}`, {
        params: { page: pageNum },
      });
      setHistoryItems(response.data.items);
      setTotalPages(response.data.meta.totalPages);
      setPage(pageNum);
    } catch (error) {
      toast.error("Failed to fetch payment history");
    }
  };

  const fetchWaitingListCount = async () => {
    try {
      const response = await api.get("/billing/waiting-list");
      setWaitingListCount(response.data.length);
    } catch (error) {
      console.error("Error fetching waiting list count:", error);
    }
  };

  useEffect(() => {
    fetchWaitingListCount();
  }, []);

  return (
    <DashboardLayout>
      <div className="max-w-[960px] mx-auto">
        <div className="mb-2">
          <h3 className="text-2xl font-semibold tracking-tight">Billing</h3>
          <p className="text-sm text-muted-foreground">
            Process payments for services and investigations
          </p>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="w-[180px]">
                  <Label className="mb-2">Clinic ID</Label>
                  <Input
                    placeholder="BP24/0001"
                    value={clinicId}
                    onChange={(e) => onClinicIdChange(e.target.value)}
                  />
                </div>

                <Button
                  variant="outline"
                  onClick={() => {
                    setShowWaitingList(true);
                    fetchWaitingListCount();
                  }}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Waiting List
                  {waitingListCount > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {waitingListCount}
                    </Badge>
                  )}
                </Button>
              </div>

              <div className="mb-6">
                <PatientDetails patient={patient} />
              </div>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Pending Payments
                  </span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="font-semibold">Pending Payments</h3>
                    <p className="text-sm text-muted-foreground">
                      Select payments to receive
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (view === "pending") {
                        fetchPaymentHistory(1);
                        setView("history");
                      } else {
                        setView("pending");
                      }
                    }}
                  >
                    {view === "pending" ? (
                      <>
                        View History
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    ) : (
                      <>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        View Pending
                        {patient && items && items.length > 0 && (
                          <Badge variant="secondary" className="ml-2">
                            {items.length}
                          </Badge>
                        )}
                      </>
                    )}
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Processed By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!patient ? (
                      <TableRow>
                        <TableCell
                          colSpan={view === "pending" ? 5 : 5}
                          className="text-center text-muted-foreground"
                        >
                          Enter clinic ID to view patient's payments
                        </TableCell>
                      </TableRow>
                    ) : view === "pending" ? (
                      items.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-center text-muted-foreground"
                          >
                            No pending payments found
                          </TableCell>
                        </TableRow>
                      ) : (
                        items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{formatDate(item.createdAt)}</TableCell>
                            <TableCell>{item.service}</TableCell>
                            <TableCell>
                              {formatCurrency(Number(item.amount))}
                            </TableCell>
                            <TableCell>{item.status}</TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedItem(item);
                                  setShowPayment(true);
                                }}
                              >
                                Receive Payment
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )
                    ) : historyItems.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center text-muted-foreground"
                        >
                          No payment history found
                        </TableCell>
                      </TableRow>
                    ) : (
                      historyItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{formatDate(item.createdAt)}</TableCell>
                          <TableCell>{item.service}</TableCell>
                          <TableCell>
                            {formatCurrency(Number(item.amount))}
                          </TableCell>
                          <TableCell className="capitalize">
                            <div className="flex flex-wrap gap-4">
                              {item.payment_methods
                                .split(",")
                                .map((method: string, index: number) => {
                                  const [methodName, amount] = method
                                    .trim()
                                    .split(":");
                                  return (
                                    <div
                                      key={index}
                                      className="flex items-center gap-2"
                                    >
                                      {methodName
                                        .toLowerCase()
                                        .includes("cash") ? (
                                        <Banknote className="h-4 w-4" />
                                      ) : (
                                        <CreditCard className="h-4 w-4" />
                                      )}

                                      <div className="flex flex-col">
                                        <p className="text-sm font-medium">
                                          {methodName.trim()}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                          {amount.trim()}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          </TableCell>
                          <TableCell>{item.processedBy}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                {view === "pending" && items.length > 0 && (
                  <div className="mt-4 flex justify-end">
                    <Button
                      onClick={() => {
                        setSelectedItem({
                          ...items[0],
                          amount: items.reduce(
                            (sum, item) => sum + Number(item.amount),
                            0
                          ),
                          service: items.map((item) => item.service).join(", "),
                        });
                        setShowPayment(true);
                      }}
                    >
                      Process All ({items.length})
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <PaymentDialog
          open={showPayment}
          onOpenChange={setShowPayment}
          totalAmount={Number(selectedItem?.amount) || 0}
          onSubmit={handlePayment}
          summary={{
            title: "Service Details",
            items: selectedItem
              ? [
                  {
                    name: selectedItem.service,
                    quantity: 1,
                    amount: selectedItem.amount,
                  },
                ]
              : [],
          }}
        />

        {showWaitingList && (
          <WaitingList
            onClose={() => setShowWaitingList(false)}
            onSelect={handleWaitingListSelect}
          />
        )}

        {view === "history" && totalPages > 1 && (
          <div className="mt-4 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchPaymentHistory(page - 1)}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchPaymentHistory(page + 1)}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function WaitingList({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (item: any) => void;
}) {
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWaitingList = async () => {
      try {
        setIsLoading(true);
        const response = await api.get("/billing/waiting-list");
        setItems(response.data);
      } catch (error) {
        toast.error("Failed to fetch waiting list");
      } finally {
        setIsLoading(false);
      }
    };

    fetchWaitingList();
  }, []);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Waiting List</DialogTitle>
          <DialogDescription>
            Select a patient to process payment
          </DialogDescription>
        </DialogHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground h-24"
                >
                  Loading...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground"
                >
                  No pending payments found
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={`${item.clinicId}-${item.service}`}>
                  <TableCell>{item.clinicId}</TableCell>
                  <TableCell>
                    {item.firstName} {item.lastName}
                  </TableCell>
                  <TableCell>{item.service}</TableCell>
                  <TableCell>{formatCurrency(Number(item.amount))}</TableCell>
                  <TableCell>{formatDate(item.createdAt)}</TableCell>
                  <TableCell>
                    <Button size="sm" onClick={() => onSelect(item)}>
                      Select
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}
