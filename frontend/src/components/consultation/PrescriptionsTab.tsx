import { useState, useEffect, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { Check, ChevronsUpDown, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FormLabel } from '@/components/ui/form';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { prescriptionsService, type Drug, type PrescriptionItem, type Prescription } from '@/services/prescriptions.service';
import { frequencies, routes, calculateQuantity, prescriptionSchema, generateId } from '@/lib/prescription-utils';
import { z } from 'zod';

interface PrescriptionsTabProps {
  patient: any;
  drugs: Drug[];
  selectedDrugs: PrescriptionItem[];
  onAddDrug: (drug: Drug) => void;
  onRemoveDrug: (drugId: string) => void;
  onUpdateDrug: (drugId: string, updates: Partial<PrescriptionItem>) => void;
  onSavePrescription: () => Promise<void>;
  prescriptionHistory: Prescription[];
  isLoadingHistory: boolean;
  deletePrescription?: (prescriptionId: string) => Promise<void>;
  instructions?: string;
  onUpdateInstructions: (instructions: string) => void;
  clearSelectedDrugs: () => void;
  isLoadingDrugs?: boolean;
}

export function PrescriptionsTab({
  patient,
  drugs = [],
  selectedDrugs = [],
  onAddDrug,
  onRemoveDrug,
  onUpdateDrug,
  onSavePrescription,
  prescriptionHistory = [],
  isLoadingHistory = false,
  deletePrescription,
  instructions = "",
  onUpdateInstructions,
  clearSelectedDrugs,
  isLoadingDrugs = false,
}: PrescriptionsTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Instead of using state for filtered drugs, compute them directly
  const filteredDrugs = useMemo(() => {
    // console.log('Filtering drugs:', drugs); // Debug log
    return drugs.filter((drug) => {
      const searchLower = searchTerm.toLowerCase();
      const nameMatches = drug.genericName?.toLowerCase().includes(searchLower);
      // console.log(`Drug ${drug.genericName}: active=${drug.active}, nameMatches=${nameMatches}`);
      return drug.active && nameMatches;
    });
  }, [searchTerm, drugs]);

  // console.log('PrescriptionsTab rendered with drugs:', drugs);
  // console.log('Filtered drugs:', filteredDrugs);

  const handleSave = async () => {
    try {
      // Validate prescription data
      prescriptionSchema.parse({
        drugs: selectedDrugs.map((drug) => ({
          drugId: drug.drugId,
          dosage: drug.dosage,
          frequency: drug.frequency,
          duration: drug.duration,
          route: drug.route,
        })),
        instructions,
      });

      // If validation passes, show confirmation
      setShowConfirmation(true);
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Format and show validation errors
        const errors = error.errors.map((err) => err.message);
        toast.error(errors.join("\n"));
      }
    }
  };

  const confirmSave = async () => {
    try {
      await onSavePrescription();
      toast.success("Prescription saved successfully");
      setShowConfirmation(false);
    } catch (error) {
      // console.error("Failed to save prescription:", error);
      toast.error("Failed to save prescription");
    }
  };

  const handleDelete = async (prescriptionId: string) => {
    try {
      if (deletePrescription) {
        await deletePrescription(prescriptionId);
        toast.success("Prescription deleted successfully");
      }
    } catch (error) {
      // console.error("Failed to delete prescription:", error);
      toast.error("Failed to delete prescription");
    }
  };

  const handleDrugSelect = useCallback(
    (drug: Drug) => {
      const prescriptionItem: PrescriptionItem = {
        id: generateId(),
        drugId: drug.id,
        drug: {
          ...drug,
          salePricePerUnit: Number(drug.salePricePerUnit)
        },
        prescriptionId: '',
        dosage: "1 tablet",
        frequency: "Once daily",
        duration: "1 days",
        route: "Oral",
        quantity: 1,
        salePricePerUnit: Number(drug.salePricePerUnit),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      onAddDrug(drug);
      setOpen(false);
    },
    [onAddDrug, setOpen]
  );

  // Update drug handler
  const handleUpdateDrug = (drugId: string, updates: Partial<PrescriptionItem>) => {
    if (updates.dosage || updates.frequency || updates.duration) {
      const drug = selectedDrugs.find(d => d.drugId === drugId);
      if (!drug) return;

      const newDosage = updates.dosage || drug.dosage;
      const newFrequency = updates.frequency || drug.frequency;
      const newDuration = updates.duration || drug.duration;

      const quantity = calculateQuantity(newDosage, newFrequency, newDuration);
      updates.quantity = quantity;
    }

    onUpdateDrug(drugId, updates);
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        {/* Drug Search */}
        <div className="flex items-center gap-2">
          <Popover 
            open={open} 
            onOpenChange={(isOpen) => {
              console.log('Popover open state changed:', isOpen);
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
                  placeholder={isLoadingDrugs ? "Loading..." : "Search drugs..."}
                  value={searchTerm}
                  onValueChange={setSearchTerm}
                  disabled={isLoadingDrugs}
                />
                <CommandList>
                  <CommandEmpty>
                    {isLoadingDrugs ? "Loading medications..." : "No drugs found."}
                  </CommandEmpty>
                  <CommandGroup>
                    {filteredDrugs.map((drug) => (
                      <CommandItem
                        key={drug.id}
                        value={drug.id}
                        onSelect={() => handleDrugSelect(drug)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedDrugs.find(d => d.drugId === drug.id) ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{drug.genericName}</div>
                          <div className="text-sm text-muted-foreground">
                            {drug.brandName} • {formatCurrency(drug.salePricePerUnit)}
                          </div>
                        </div>
                        <span className={cn(
                          "ml-2",
                          drug.saleQuantity === 0 && "text-destructive",
                          drug.saleQuantity <= drug.minimumStock && "text-yellow-500",
                          drug.saleQuantity > drug.minimumStock && "text-green-500"
                        )}>
                          {drug.saleQuantity}
                        </span>
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
          <Card>
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
                    <TableHead>Unit Price</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedDrugs.map((drug) => (
                    <TableRow key={drug.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{drug.drug.genericName}</p>
                          <p className="text-sm text-muted-foreground">
                            {drug.drug.brandName} • {drug.drug.strength}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className={cn(
                          "text-sm",
                          drug.drug.saleQuantity === 0 && "text-destructive",
                          drug.drug.saleQuantity <= drug.drug.minimumStock && "text-yellow-500",
                          drug.drug.saleQuantity > drug.drug.minimumStock && "text-green-500"
                        )}>
                          {drug.drug.saleQuantity}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="e.g., 1 tablet"
                          value={drug.dosage}
                          onChange={(e) => handleUpdateDrug(drug.drugId, { dosage: e.target.value })}
                          className="w-[120px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={drug.frequency}
                          onValueChange={(value) => handleUpdateDrug(drug.drugId, { frequency: value })}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Select" />
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
                              handleUpdateDrug(drug.drugId, { duration: newDuration });
                            }}
                          />
                          <span className="text-sm text-muted-foreground">days</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={drug.route}
                          onValueChange={(value) => handleUpdateDrug(drug.drugId, { route: value })}
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {routes.map((route) => (
                              <SelectItem key={route} value={route.toLowerCase()}>
                                {route}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          value={drug.quantity}
                          readOnly
                          className="w-[80px]"
                        />
                      </TableCell>
                      <TableCell>{formatCurrency(drug.salePricePerUnit)}</TableCell>
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
                        Total: {formatCurrency(
                          selectedDrugs.reduce((total, drug) => {
                            return total + (drug.salePricePerUnit * drug.quantity);
                          }, 0)
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button variant="outline" onClick={clearSelectedDrugs}>
                      Clear
                    </Button>
                    <Button onClick={handleSave} disabled={selectedDrugs.length === 0}>
                      Save Prescription
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Confirmation Dialog */}
        <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Save Prescription</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to save this prescription?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmSave}>Save</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Prescription History */}
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium mb-4">Prescription History</h4>
            {isLoadingHistory ? (
              <div className="text-center py-4">Loading prescription history...</div>
            ) : prescriptionHistory.length > 0 ? (
              <div className="space-y-2">
                {prescriptionHistory.map((prescription) => (
                  <div key={prescription.id} className="border rounded-lg p-3">
                    <div className="flex justify-between items-center text-sm mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {format(new Date(prescription.prescribedAt), "dd/MM/yyyy")}
                        </span>
                        <Badge variant={prescription.status === "dispensed" ? "success" : "secondary"}>
                          {prescription.status}
                        </Badge>
                      </div>
                      {prescription.status === "pending" && deletePrescription && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(prescription.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Medication</TableHead>
                          <TableHead className="text-xs">Dosage</TableHead>
                          <TableHead className="text-xs">Frequency</TableHead>
                          <TableHead className="text-xs">Duration</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {prescription.items.map((item) => (
                          <TableRow key={item.id} className="text-sm">
                            <TableCell className="py-2">
                              <div>
                                <p>{item.drug.genericName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {item.drug.brandName} • {item.drug.strength}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="py-2">{item.dosage}</TableCell>
                            <TableCell className="py-2">{item.frequency}</TableCell>
                            <TableCell className="py-2">{item.duration}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {prescription.status === "dispensed" && prescription.dispensedAt && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Dispensed by: {prescription.dispensedBy?.fullName || ''} on{" "}
                        {format(new Date(prescription.dispensedAt), "dd/MM/yyyy hh:mm a")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                No prescription history found
              </div>
            )}
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
} 