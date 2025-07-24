import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { History, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface RestockItem {
  drugId: number;
  drugName: string;
  purchaseUnit: "purchase" | "sale";
  quantity: number;
  batchNumber: string;
  expiryDate: string;
  purchaseForm: string;
  saleForm: string;
  purchasePrice: number;
  unitsPerPurchase: number;
  posMarkup: number;
  prescriptionMarkup: number;
  unitCost: number;
  posPrice: number;
  prescriptionPrice: number;
}

interface Drug {
  id: number;
  name: string;
  purchase: { form: string };
  sale: { form: string };
  purchasePrice: number;
  unitsPerPurchase: number;
  posMarkup: number;
  prescriptionMarkup: number;
  unitCost: number;
  posPrice: number;
  prescriptionPrice: number;
}

interface Vendor {
  id: number;
  name: string;
}

interface Transaction {
  id: number;
  createdAt: string;
  drugName: string;
  vendorName: string;
  purchaseQuantity: number;
  saleQuantity: number;
  purchaseForm: string;
  saleForm: string;
  batchNumber: string;
  expiryDate: string;
  createdBy: string;
}

interface PendingRestock {
  id: number;
  drugName: string;
  vendorName: string;
  purchaseQuantity: number;
  saleQuantity: number;
  purchaseForm: string;
  saleForm: string;
  batchNumber: string;
  expiryDate: string;
  createdBy: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

interface RestockListProps {
  refetchKey?: number;
}

export function RestockList({ refetchKey }: RestockListProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [restockItems, setRestockItems] = useState<RestockItem[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<number>();
  const [referenceNumber, setReferenceNumber] = useState("");
  const [activeTab, setActiveTab] = useState("restock");
  const [selectedDetails, setSelectedDetails] = useState<PendingRestock | null>(
    null
  );

  const { data: drugs } = useQuery({
    queryKey: ["drugs"],
    queryFn: async () => {
      const response = await api.get("/inventory/drugs");
      return response.data;
    },
  });

  const { data: vendors } = useQuery({
    queryKey: ["vendors"],
    queryFn: async () => {
      const response = await api.get("/inventory/vendors");
      return response.data;
    },
  });

  const { data: transactions, refetch } = useQuery({
    queryKey: ["restock-transactions"],
    queryFn: async () => {
      const response = await api.get("/inventory/transactions");
      return response.data;
    },
  });

  const { data: pendingRestocks, refetch: refetchPending } = useQuery({
    queryKey: ["pending-restocks"],
    queryFn: async () => {
      try {
        const response = await api.get(
          "/inventory/restock/history?status=pending"
        );
        console.log("Pending restocks response:", response.data);
        return response.data;
      } catch (error) {
        console.error("Error fetching pending restocks:", error);
        return [];
      }
    },
  });

  const handleDrugSelect = (drugId: number) => {
    const selectedDrug = drugs?.find((d: Drug) => d.id === drugId);
    if (!selectedDrug) return;

    if (restockItems.some((item) => item.drugId === drugId)) {
      console.warn("Drug already added to restock list");
      return;
    }

    setRestockItems([
      ...restockItems,
      {
        drugId: selectedDrug.id,
        drugName: selectedDrug.name,
        purchaseUnit: "purchase",
        quantity: 0,
        batchNumber: "",
        expiryDate: "",
        purchaseForm: selectedDrug.purchase.form,
        saleForm: selectedDrug.sale.form,
        purchasePrice: selectedDrug.purchasePrice,
        unitsPerPurchase: selectedDrug.unitsPerPurchase,
        posMarkup: selectedDrug.posMarkup,
        prescriptionMarkup: selectedDrug.prescriptionMarkup,
        unitCost: selectedDrug.unitCost,
        posPrice: selectedDrug.posPrice,
        prescriptionPrice: selectedDrug.prescriptionPrice,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setRestockItems(restockItems.filter((_, i) => i !== index));
  };

  const handleSubmitRestock = async () => {
    try {
      await api.post("/inventory/restock", {
        vendorId: selectedVendorId,
        referenceNumber,
        items: restockItems,
      });
      setRestockItems([]);
      setReferenceNumber("");
      setSelectedVendorId(undefined);
      refetch(); // Refresh transaction history
      toast.success("Restock completed successfully");
    } catch (error) {
      toast.error("Failed to submit restock");
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    try {
      return format(new Date(dateString), "dd MMM yyyy");
    } catch (error) {
      return "-";
    }
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return "-";
    try {
      return format(new Date(dateString), "hh:mm a");
    } catch (error) {
      return "-";
    }
  };

  const handleUpdateItem = (index: number, updates: Partial<RestockItem>) => {
    setRestockItems((items) =>
      items.map((item, i) => {
        if (i !== index) return item;

        const updatedItem = { ...item, ...updates };

        // Handle unit conversion when purchaseUnit changes
        if (updates.purchaseUnit !== undefined) {
          if (updates.purchaseUnit === "sale") {
            // Converting from purchase to sale unit
            updatedItem.purchasePrice =
              item.purchasePrice / item.unitsPerPurchase;
            updatedItem.quantity = item.quantity * item.unitsPerPurchase;
          } else {
            // Converting from sale to purchase unit
            updatedItem.purchasePrice =
              item.purchasePrice * item.unitsPerPurchase;
            updatedItem.quantity = Math.ceil(
              item.quantity / item.unitsPerPurchase
            );
          }
        }

        // Recalculate prices if purchase price changes
        if (
          updates.purchasePrice !== undefined ||
          updates.purchaseUnit !== undefined
        ) {
          updatedItem.unitCost =
            updatedItem.purchaseUnit === "purchase"
              ? updatedItem.purchasePrice / updatedItem.unitsPerPurchase
              : updatedItem.purchasePrice;
          updatedItem.posPrice =
            updatedItem.unitCost * (1 + updatedItem.posMarkup);
          updatedItem.prescriptionPrice =
            updatedItem.unitCost * (1 + updatedItem.prescriptionMarkup);
        }

        // Recalculate prices if markups change
        if (updates.posMarkup !== undefined) {
          updatedItem.posPrice =
            updatedItem.unitCost * (1 + updatedItem.posMarkup);
        }
        if (updates.prescriptionMarkup !== undefined) {
          updatedItem.prescriptionPrice =
            updatedItem.unitCost * (1 + updatedItem.prescriptionMarkup);
        }

        return updatedItem;
      })
    );
  };

  const totals = restockItems.reduce(
    (acc, item) => {
      const totalUnits =
        item.quantity *
        (item.purchaseUnit === "purchase" ? item.unitsPerPurchase : 1);
      const saleUnits =
        item.purchaseUnit === "purchase"
          ? item.quantity * item.unitsPerPurchase
          : item.quantity;

      return {
        purchasePrice: acc.purchasePrice + item.purchasePrice * item.quantity,
        units: acc.units + totalUnits,
        saleUnits: acc.saleUnits + saleUnits,
        cost: acc.cost + item.unitCost * totalUnits,
        posValue: acc.posValue + item.posPrice * totalUnits,
        prescriptionValue:
          acc.prescriptionValue + item.prescriptionPrice * totalUnits,
      };
    },
    {
      purchasePrice: 0,
      units: 0,
      saleUnits: 0,
      cost: 0,
      posValue: 0,
      prescriptionValue: 0,
    }
  );

  // Add this CSS class to remove arrows from number inputs
  const numberInputClass =
    "w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

  const handleApproveRestock = async (restockId: number) => {
    try {
      await api.post(`/inventory/restock/${restockId}/approve`, {
        status: "approved",
      });
      toast.success("Restock approved successfully");
      refetchPending();
    } catch (error) {
      toast.error("Failed to approve restock");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Restock Management</h2>
        <Button onClick={() => setHistoryOpen(true)} variant="outline">
          <History className="w-4 h-4 mr-2" />
          History
        </Button>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="restock">New Restock</TabsTrigger>
          <TabsTrigger value="pending">Pending Restocks</TabsTrigger>
        </TabsList>

        <TabsContent value="restock">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Add Drug</label>
              <Combobox
                options={
                  drugs?.map((drug: Drug) => ({
                    label: drug.name,
                    value: drug.id,
                  })) || []
                }
                onChange={(value) => handleDrugSelect(Number(value))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Vendor</label>
              <Select
                onValueChange={(value) => setSelectedVendorId(Number(value))}
                value={selectedVendorId?.toString()}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors?.map((vendor: Vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id.toString()}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Batch Number
              </label>
              <Input
                value={restockItems[0]?.batchNumber || ""}
                onChange={(e) => {
                  // Apply the same batch number to all items
                  setRestockItems((items) =>
                    items.map((item) => ({
                      ...item,
                      batchNumber: e.target.value,
                    }))
                  );
                }}
                placeholder="Enter batch number"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Reference Number
              </label>
              <Input
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="Enter reference number"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Drug</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Purchase Price</TableHead>
                <TableHead>POS Markup</TableHead>
                <TableHead>Rx Markup</TableHead>
                <TableHead>Unit Cost</TableHead>
                <TableHead>POS Price</TableHead>
                <TableHead>Rx Price</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {restockItems.map((item, index) => {
                const totalUnits =
                  item.quantity *
                  (item.purchaseUnit === "purchase"
                    ? item.unitsPerPurchase
                    : 1);

                return (
                  <TableRow key={index}>
                    <TableCell>{item.drugName}</TableCell>
                    <TableCell className="min-w-[80px]">
                      <Input
                        type="number"
                        value={item.quantity || ""}
                        onChange={(e) =>
                          handleUpdateItem(index, {
                            quantity: Number(e.target.value),
                          })
                        }
                        className={numberInputClass}
                      />
                    </TableCell>
                    <TableCell>
                      {item.purchaseForm === item.saleForm ? (
                        <div className="w-32 px-3 py-2 border rounded-md">
                          {item.purchaseForm}
                        </div>
                      ) : (
                        <Select
                          value={item.purchaseUnit}
                          onValueChange={(value: "purchase" | "sale") =>
                            handleUpdateItem(index, { purchaseUnit: value })
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="purchase">
                              {item.purchaseForm}
                            </SelectItem>
                            <SelectItem value="sale">
                              {item.saleForm}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell className="min-w-[100px]">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2">
                          ₵
                        </span>
                        <Input
                          type="number"
                          value={item.purchasePrice}
                          onChange={(e) =>
                            handleUpdateItem(index, {
                              purchasePrice: Number(e.target.value),
                            })
                          }
                          className={`pl-7 ${numberInputClass}`}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[80px]">
                      <Input
                        type="number"
                        value={item.posMarkup}
                        onChange={(e) =>
                          handleUpdateItem(index, {
                            posMarkup: Number(e.target.value),
                          })
                        }
                        className={numberInputClass}
                        step="0.01"
                      />
                    </TableCell>
                    <TableCell className="min-w-[80px]">
                      <Input
                        type="number"
                        value={item.prescriptionMarkup}
                        onChange={(e) =>
                          handleUpdateItem(index, {
                            prescriptionMarkup: Number(e.target.value),
                          })
                        }
                        className={numberInputClass}
                        step="0.01"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2">
                          ₵
                        </span>
                        <Input
                          type="number"
                          value={item.unitCost}
                          onChange={(e) =>
                            handleUpdateItem(index, {
                              unitCost: Number(e.target.value),
                              posPrice:
                                Number(e.target.value) * (1 + item.posMarkup),
                              prescriptionPrice:
                                Number(e.target.value) *
                                (1 + item.prescriptionMarkup),
                            })
                          }
                          className="w-24 pl-7"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2">
                          ₵
                        </span>
                        <Input
                          type="number"
                          value={item.posPrice}
                          onChange={(e) =>
                            handleUpdateItem(index, {
                              posPrice: Number(e.target.value),
                              posMarkup:
                                Number(e.target.value) / item.unitCost - 1,
                            })
                          }
                          className="w-24 pl-7"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2">
                          ₵
                        </span>
                        <Input
                          type="number"
                          value={item.prescriptionPrice}
                          onChange={(e) =>
                            handleUpdateItem(index, {
                              prescriptionPrice: Number(e.target.value),
                              prescriptionMarkup:
                                Number(e.target.value) / item.unitCost - 1,
                            })
                          }
                          className="w-24 pl-7"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        value={item.expiryDate}
                        onChange={(e) =>
                          handleUpdateItem(index, {
                            expiryDate: e.target.value,
                          })
                        }
                        className="w-30"
                      />
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleRemoveItem(index)}
                        className="text-destructive hover:text-destructive/80"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!restockItems.length && (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="text-center text-muted-foreground"
                  >
                    No items to restock
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {restockItems.length > 0 && (
            <>
              <Accordion type="single" collapsible className="w-full mt-8">
                <AccordionItem value="summary">
                  <AccordionTrigger className="bg-muted px-4 rounded-t-lg hover:no-underline">
                    <h3 className="font-semibold">Summary</h3>
                  </AccordionTrigger>
                  <AccordionContent className="bg-muted px-4 pb-4 rounded-b-lg space-y-6">
                    {/* Purchase Cost and Values */}
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Total Purchase Cost
                        </p>
                        <p className="text-lg font-semibold">
                          {new Intl.NumberFormat("en-GH", {
                            style: "currency",
                            currency: "GHS",
                          }).format(totals.purchasePrice)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Total Cost Value
                        </p>
                        <p className="text-lg font-semibold">
                          {new Intl.NumberFormat("en-GH", {
                            style: "currency",
                            currency: "GHS",
                          }).format(totals.cost)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Expected POS Value
                        </p>
                        <p className="text-lg font-semibold">
                          {new Intl.NumberFormat("en-GH", {
                            style: "currency",
                            currency: "GHS",
                          }).format(totals.posValue)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Expected Rx Value
                        </p>
                        <p className="text-lg font-semibold">
                          {new Intl.NumberFormat("en-GH", {
                            style: "currency",
                            currency: "GHS",
                          }).format(totals.prescriptionValue)}
                        </p>
                      </div>
                    </div>

                    {/* Units Breakdown */}
                    <div className="space-y-4">
                      <h4 className="font-medium">Units Breakdown</h4>
                      <div className="grid gap-4">
                        {restockItems.map((item, index) => {
                          const purchaseUnits =
                            item.purchaseUnit === "purchase"
                              ? item.quantity
                              : Math.ceil(
                                  item.quantity / item.unitsPerPurchase
                                );
                          const saleUnits =
                            item.purchaseUnit === "purchase"
                              ? item.quantity * item.unitsPerPurchase
                              : item.quantity;

                          return (
                            <div
                              key={index}
                              className="bg-background p-3 rounded-lg"
                            >
                              <p className="font-medium mb-2">
                                {item.drugName}
                              </p>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-sm text-muted-foreground">
                                    Purchase Form
                                  </p>
                                  <p className="font-semibold">
                                    {purchaseUnits} {item.purchaseForm}(s)
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">
                                    Sale Form
                                  </p>
                                  <p className="font-semibold">
                                    {saleUnits} {item.saleForm}(s)
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="flex justify-end">
                <Button
                  onClick={handleSubmitRestock}
                  disabled={!selectedVendorId || !referenceNumber}
                >
                  Submit Restock
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="pending">
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Drug</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRestocks?.map((restock: PendingRestock) => (
                  <TableRow key={restock.id}>
                    <TableCell>
                      <div>{formatDate(restock.createdAt)}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatTime(restock.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell>{restock.drugName}</TableCell>
                    <TableCell>{restock.vendorName}</TableCell>
                    <TableCell>
                      {restock.purchaseQuantity} {restock.purchaseForm}s
                      <div className="text-sm text-muted-foreground">
                        ({restock.saleQuantity} {restock.saleForm}s)
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          restock.status === "approved"
                            ? "success"
                            : "secondary"
                        }
                      >
                        {restock.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {restock.status === "pending" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleApproveRestock(restock.id)}
                        >
                          Approve
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedDetails(restock)}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!pendingRestocks?.length && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground"
                    >
                      No pending restocks
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Restock History</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Drug</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Purchase Qty</TableHead>
                <TableHead>Sale Qty</TableHead>
                <TableHead>Batch #</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Added By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions?.map((transaction: Transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{formatDate(transaction.createdAt)}</TableCell>
                  <TableCell>{transaction.drugName}</TableCell>
                  <TableCell>{transaction.vendorName}</TableCell>
                  <TableCell>
                    {transaction.purchaseQuantity} {transaction.purchaseForm}
                  </TableCell>
                  <TableCell>
                    {transaction.saleQuantity} {transaction.saleForm}
                  </TableCell>
                  <TableCell>{transaction.batchNumber || "-"}</TableCell>
                  <TableCell>{formatDate(transaction.expiryDate)}</TableCell>
                  <TableCell>{transaction.createdBy}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog
        open={!!selectedDetails}
        onOpenChange={() => setSelectedDetails(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restock Details</DialogTitle>
          </DialogHeader>
          {selectedDetails && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm">Drug</h4>
                  <p>{selectedDetails.drugName}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Vendor</h4>
                  <p>{selectedDetails.vendorName}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Purchase Quantity</h4>
                  <p>
                    {selectedDetails.purchaseQuantity}{" "}
                    {selectedDetails.purchaseForm}s
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Sale Quantity</h4>
                  <p>
                    {selectedDetails.saleQuantity} {selectedDetails.saleForm}s
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Batch Number</h4>
                  <p>{selectedDetails.batchNumber || "-"}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Expiry Date</h4>
                  <p>{formatDate(selectedDetails.expiryDate)}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Requested By</h4>
                  <p>{selectedDetails.createdBy}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Status</h4>
                  <Badge
                    variant={
                      selectedDetails.status === "approved"
                        ? "success"
                        : "secondary"
                    }
                  >
                    {selectedDetails.status}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
