import { useState, useEffect, useCallback, useMemo } from "react";
import { format } from "date-fns";
import { Check, ChevronsUpDown, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormLabel } from "@/components/ui/form";
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
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import {
  prescriptionsService,
  type Drug,
  type PrescriptionItem,
  type Prescription,
} from "@/services/prescriptions.service";
import {
  frequencies,
  routes,
  calculateQuantity,
  generateId,
} from "@/lib/prescription-utils";
import { z } from "zod";
import { Patient } from "@/types/patient";

interface PrescriptionsTabProps {
  form: any;
  patient: Patient | null;
  onSavePrescriptions: (prescriptions: any[]) => Promise<void>;
  drugs?: Drug[];
  selectedDrugs?: PrescriptionItem[];
  onAddDrug?: (drug: Drug) => void;
  onRemoveDrug?: (drugId: string) => void;
  onUpdateDrug?: (drugId: string, updates: Partial<PrescriptionItem>) => void;
  onSavePrescription?: () => Promise<void>;
  prescriptionHistory?: Prescription[];
  isLoadingHistory?: boolean;
  deletePrescription?: (prescriptionId: string) => Promise<void>;
  instructions?: string;
  onUpdateInstructions?: (value: string) => void;
  clearSelectedDrugs?: () => void;
  isLoadingDrugs?: boolean;
}

const prescriptionColumns = [
  {
    header: "Date",
    cell: (prescription: Prescription) => (
      <div>
        <p>{format(new Date(prescription.createdAt), "dd MMM yyyy")}</p>
        <p className="text-sm text-muted-foreground">
          {format(new Date(prescription.createdAt), "h:mm a")}
        </p>
      </div>
    ),
  },
  {
    header: "Drug",
    cell: (prescription: Prescription) => (
      <div>
        <p className="font-medium">{prescription.drug.genericName}</p>
        <p className="text-sm text-muted-foreground">
          {prescription.drug.strength} •{" "}
          {formatCurrency(prescription.drug.salePricePerUnit || 0)}
        </p>
      </div>
    ),
  },
  {
    header: "Dosage",
    cell: (prescription: Prescription) => prescription.dosage,
  },
  {
    header: "Frequency",
    cell: (prescription: Prescription) => prescription.frequency,
  },
  {
    header: "Duration",
    cell: (prescription: Prescription) => prescription.duration,
  },
  {
    header: "Route",
    cell: (prescription: Prescription) => prescription.route,
  },
  {
    header: "Quantity",
    cell: (prescription: Prescription) => prescription.quantity,
  },
  {
    header: "Status",
    cell: (prescription: Prescription) => (
      <Badge variant={prescription.dispensed ? "success" : "secondary"}>
        {prescription.dispensed ? "Dispensed" : "Pending"}
      </Badge>
    ),
  },
];

// Add validation schemas
const prescriptionItemSchema = z.object({
  drugId: z.string().min(1, "Drug is required"),
  dosage: z.string().min(1, "Dosage is required"),
  frequency: z.string().min(1, "Frequency is required"),
  duration: z.string().min(1, "Duration is required"),
  route: z.string().min(1, "Route is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
});

const prescriptionsSchema = z.array(prescriptionItemSchema);

export function PrescriptionsTab({
  form,
  patient,
  onSavePrescriptions,
}: PrescriptionsTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [selectedDrugs, setSelectedDrugs] = useState<PrescriptionItem[]>([]);
  const [instructions, setInstructions] = useState("");
  const [isLoadingDrugs, setIsLoadingDrugs] = useState(false);
  const [prescriptionHistory, setPrescriptionHistory] = useState<
    Prescription[]
  >([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Instead of using state for filtered drugs, compute them directly
  const filteredDrugs = useMemo(() => {
    if (!searchTerm) return drugs; // Show all drugs if no search term
    const searchLower = searchTerm.toLowerCase();
    return drugs.filter((drug) =>
      drug.name.toLowerCase().includes(searchLower)
    );
  }, [searchTerm, drugs]);

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!selectedDrugs.length) {
      toast.error("No prescriptions to save");
      return;
    }

    // Validate all prescriptions
    try {
      const validationResult = prescriptionsSchema.safeParse(
        selectedDrugs.map((drug) => ({
          drugId: drug.drugId,
          dosage: drug.dosage,
          frequency: drug.frequency,
          duration: drug.duration,
          route: drug.route,
          quantity: drug.quantity,
        }))
      );

      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(
          (err) => `${err.path.join(".")} - ${err.message}`
        );
        toast.error(
          <div>
            <p>Please fix the following errors:</p>
            <ul className="list-disc pl-4 mt-2">
              {errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        );
        return;
      }

      // If validation passes, show confirmation dialog
      setShowConfirmation(true);
    } catch (error) {
      console.error("Validation error:", error);
      toast.error("Please check all prescription details are filled correctly");
    }
  };

  const fetchPrescriptionHistory = async () => {
    if (!patient?.id) return;
    setIsLoadingHistory(true);
    try {
      const response = await prescriptionsService.getHistory(
        patient.id.toString()
      );
      setPrescriptionHistory(response);
    } catch (error) {
      console.error("Error fetching prescription history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const confirmSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await onSavePrescriptions(selectedDrugs);
      await fetchPrescriptionHistory();
      setShowConfirmation(false);
      clearSelectedDrugs();
      setShowHistory(true);
    } catch (error) {
      toast.error("Failed to save prescriptions");
    }
  };

  const onAddDrug = (drug: Drug) => {
    const prescriptionItem: PrescriptionItem = {
      id: generateId(),
      drugId: drug.id.toString(),
      drug,
      prescriptionId: "",
      dosage: "",
      frequency: "Once daily",
      duration: "1 days",
      route: "Oral",
      stock: drug.stock,
      min_stock: drug.min_stock,
      quantity: 0,
      prescription_price: Number(drug.prescription_price),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSelectedDrugs((prev) => [...prev, prescriptionItem]);
    setOpen(false);
    setSearchTerm("");
  };

  const handleDrugSelect = (drug: Drug) => {
    onAddDrug(drug);
    setOpen(false); // Close the combobox after selection
    setSearchTerm(""); // Optional: clear the search term
  };

  const handleDrugToggle = useCallback(
    (drug: Drug) => {
      const isSelected = selectedDrugs.some(
        (selected) => selected.drugId === drug.id.toString()
      );

      if (isSelected) {
        // Remove drug
        setSelectedDrugs((prev) =>
          prev.filter((item) => item.drugId !== drug.id.toString())
        );
      } else {
        // Add drug
        onAddDrug(drug);
      }
      setOpen(true); // Keep popover open
    },
    [selectedDrugs, onAddDrug]
  );

  // Update drug handler
  const handleUpdateDrug = (
    drugId: string,
    updates: Partial<PrescriptionItem>
  ) => {
    setSelectedDrugs((prev) => {
      return prev.map((drug) => {
        if (drug.drugId !== drugId) return drug;

        const updatedDrug = { ...drug, ...updates };

        // Calculate quantity if dosage-related fields are updated AND frequency is not "As needed"
        if (
          (updates.dosage || updates.frequency || updates.duration) &&
          updatedDrug.frequency !== "As needed"
        ) {
          try {
            const quantity = calculateQuantity(
              updatedDrug.dosage,
              updatedDrug.frequency,
              updatedDrug.duration
            );
            updatedDrug.quantity = Number(quantity);
          } catch (error) {
            console.error("Error calculating quantity:", error);
            toast.error("Invalid dosage, frequency, or duration");
          }
        }

        return updatedDrug;
      });
    });
  };

  // Add useEffect to fetch drugs
  useEffect(() => {
    const fetchDrugs = async () => {
      setIsLoadingDrugs(true);
      try {
        const response = await prescriptionsService.getDrugs();
        console.log("Fetched drugs:", response); // Debug log
        setDrugs(response);
      } catch (error) {
        console.error("Error fetching drugs:", error);
      } finally {
        setIsLoadingDrugs(false);
      }
    };
    fetchDrugs();
  }, []);

  const onRemoveDrug = (drugId: string) => {
    setSelectedDrugs((prev) => prev.filter((drug) => drug.drugId !== drugId));
  };

  const onUpdateInstructions = (value: string) => {
    setInstructions(value);
  };

  const clearSelectedDrugs = () => {
    setSelectedDrugs([]);
    setInstructions("");
  };

  // Add useEffect to fetch history when patient changes
  useEffect(() => {
    const fetchHistory = async () => {
      if (!patient) return;
      setIsLoadingHistory(true);
      try {
        const history = await prescriptionsService.getHistory(
          patient.id.toString()
        );
        setPrescriptionHistory(history);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    fetchHistory();
  }, [patient]);

  const onUpdateDrug = (drugId: string, updates: Partial<PrescriptionItem>) => {
    setSelectedDrugs((prev) =>
      prev.map((drug) =>
        drug.drugId === drugId ? { ...drug, ...updates } : drug
      )
    );
  };

  const handleViewHistory = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowHistory(true);
  };

  return (
    <Card>
      <CardContent className="p-6">
        {showHistory ? (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold">Prescription History</h2>
                <p className="text-sm text-muted-foreground">
                  View past prescriptions
                </p>
              </div>
              <Button
                variant="outline"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowHistory(false);
                }}
              >
                ← Back to Prescribing
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  {prescriptionColumns.map((column, index) => (
                    <TableHead key={index}>{column.header}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingHistory ? (
                  <TableRow>
                    <TableCell
                      colSpan={prescriptionColumns.length}
                      className="text-center h-24"
                    >
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : prescriptionHistory.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={prescriptionColumns.length}
                      className="text-center h-24 text-muted-foreground"
                    >
                      No prescription history found
                    </TableCell>
                  </TableRow>
                ) : (
                  prescriptionHistory.map((prescription) => (
                    <TableRow key={prescription.id}>
                      {prescriptionColumns.map((column, index) => (
                        <TableCell key={index}>
                          {column.cell(prescription)}
                        </TableCell>
                      ))}
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
                <h2 className="text-lg font-semibold">Add Prescription</h2>
                <p className="text-sm text-muted-foreground">
                  Search and add medications
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleViewHistory}
                className="flex items-center gap-2"
              >
                View History →
                {/* {prescriptionHistory.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {prescriptionHistory.length}
                  </Badge>
                )} */}
              </Button>
            </div>

            {/* Drug Search */}
            <div className="flex items-center gap-2">
              <Popover
                open={open}
                onOpenChange={(isOpen) => {
                  setOpen(isOpen);
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-[300px] justify-between"
                    disabled={!patient || isLoadingDrugs}
                  >
                    {isLoadingDrugs ? (
                      "Loading medications..."
                    ) : (
                      <>
                        Search medications...
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <Command>
                    <CommandInput
                      placeholder={
                        isLoadingDrugs ? "Loading..." : "Search drugs..."
                      }
                      value={searchTerm}
                      onValueChange={setSearchTerm}
                      disabled={isLoadingDrugs}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {isLoadingDrugs
                          ? "Loading medications..."
                          : "No drugs found."}
                      </CommandEmpty>
                      <CommandGroup>
                        {filteredDrugs.map((drug) => (
                          <CommandItem
                            key={drug.id}
                            value={drug.id}
                            onSelect={() => handleDrugSelect(drug)}
                            className="cursor-pointer"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedDrugs.some(
                                  (d) => d.drugId === drug.id.toString()
                                )
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <div className="flex-1">
                              <div className="font-medium">{drug.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {drug.strength}
                                {drug.unit} •{" "}
                                {formatCurrency(drug.prescription_price)}
                              </div>
                            </div>
                            <div className="text-right">
                              <p
                                className={cn(
                                  "text-sm",
                                  drug.stock === 0 ? "text-destructive" : "",
                                  drug.stock > 0 && drug.stock <= drug.min_stock
                                    ? "text-yellow-500"
                                    : "",
                                  drug.stock > drug.min_stock
                                    ? "text-green-500"
                                    : ""
                                )}
                              >
                                {drug.stock}
                              </p>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Selected Drugs Table */}
            {selectedDrugs.length > 0 && (
              <Card className="mt-4">
                <CardContent className="p-4">
                  <h4 className="font-medium mb-4">Prescription Details</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Medication</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Dosage</TableHead>
                        <TableHead>Frequency</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Route</TableHead>
                        <TableHead>Quantity</TableHead>
                        {/* <TableHead>Unit Price</TableHead> */}
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedDrugs.map((drug) => (
                        <TableRow key={drug.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{drug.drug.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {drug.drug.strength} {drug.drug.unit} •{" "}
                                {formatCurrency(drug.drug.prescription_price)}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-right">
                              <p
                                className={cn(
                                  "text-sm",
                                  drug.stock === 0 ? "text-destructive" : "",
                                  drug.stock > 0 && drug.stock <= drug.min_stock
                                    ? "text-yellow-500"
                                    : "",
                                  drug.stock > drug.min_stock
                                    ? "text-green-500"
                                    : ""
                                )}
                              >
                                {drug.stock}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="text"
                              placeholder="e.g., 1 tablet"
                              value={drug.dosage}
                              onChange={(e) =>
                                handleUpdateDrug(drug.drugId, {
                                  dosage: e.target.value,
                                })
                              }
                              className={cn(
                                "w-24",
                                !drug.dosage &&
                                  "border-red-500 focus-visible:ring-red-500"
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={drug.frequency}
                              onValueChange={(value) =>
                                handleUpdateDrug(drug.drugId, {
                                  frequency: value,
                                })
                              }
                            >
                              <SelectTrigger
                                className={cn(
                                  "w-[160px]",
                                  !drug.frequency &&
                                    "border-red-500 focus-visible:ring-red-500"
                                )}
                              >
                                <SelectValue placeholder="Select frequency" />
                              </SelectTrigger>
                              <SelectContent>
                                {frequencies.map((freq) => (
                                  <SelectItem key={freq} value={freq}>
                                    {freq}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2 items-center">
                              <Input
                                type="number"
                                min="1"
                                className="w-16"
                                value={drug.duration.split(" ")[0]}
                                onChange={(e) => {
                                  const newDuration = `${e.target.value} days`;
                                  handleUpdateDrug(drug.drugId, {
                                    duration: newDuration,
                                  });
                                }}
                              />
                              <span className="text-sm text-muted-foreground">
                                days
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={drug.route}
                              onValueChange={(value) =>
                                handleUpdateDrug(drug.drugId, {
                                  route: value,
                                })
                              }
                            >
                              <SelectTrigger
                                className={cn(
                                  "w-[120px]",
                                  !drug.route &&
                                    "border-red-500 focus-visible:ring-red-500"
                                )}
                              >
                                <SelectValue placeholder="Select route" />
                              </SelectTrigger>
                              <SelectContent>
                                {routes.map((route) => (
                                  <SelectItem key={route} value={route}>
                                    {route}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            {drug.frequency === "As needed" ? (
                              <Input
                                type="number"
                                min="1"
                                className="w-20"
                                value={drug.quantity}
                                onChange={(e) =>
                                  handleUpdateDrug(drug.drugId, {
                                    quantity: parseInt(e.target.value) || 0,
                                  })
                                }
                              />
                            ) : (
                              <span className="text-muted-foreground">
                                {drug.quantity}
                              </span>
                            )}
                          </TableCell>
                          {/* <TableCell>
                            {formatCurrency(drug.salePricePerUnit)}
                          </TableCell> */}
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onRemoveDrug(drug.drugId)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Instructions and Buttons */}
                  <div className="mt-6 space-y-4">
                    <div>
                      <FormLabel>General Instructions</FormLabel>
                      <Textarea
                        placeholder="Enter any general instructions for this prescription"
                        value={instructions}
                        onChange={(e) => onUpdateInstructions(e.target.value)}
                        className="mt-1.5"
                      />
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <div className="flex items-center gap-8">
                          <div className="text-sm text-muted-foreground">
                            Total Items: {selectedDrugs.length}
                          </div>
                          <div className="text-lg font-semibold">
                            Total:{" "}
                            {formatCurrency(
                              selectedDrugs.reduce((total, drug) => {
                                return (
                                  total +
                                  drug.prescription_price * drug.quantity
                                );
                              }, 0)
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <Button variant="outline" onClick={clearSelectedDrugs}>
                          Clear
                        </Button>
                        <Button
                          onClick={handleSave}
                          disabled={selectedDrugs.length === 0}
                        >
                          Save Prescriptions
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Confirmation Dialog */}
            <AlertDialog
              open={showConfirmation}
              onOpenChange={setShowConfirmation}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Save Prescriptions</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to save these prescriptions?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmSave}>
                    Save
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </CardContent>
    </Card>
  );
}
