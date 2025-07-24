import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";

interface RestockFormData {
  drugId: number;
  vendorId: number;
  purchaseUnit: "purchase" | "sale"; // Whether buying in purchase or sale units
  quantity: number;
  batchNumber: string;
  expiryDate: string;
  notes?: string;
}

interface RestockItem {
  drugId: number;
  drugName: string;
  vendorId: number;
  vendorName: string;
  purchaseUnit: "purchase" | "sale";
  quantity: number;
  batchNumber: string;
  expiryDate: string;
  purchaseForm: string;
  saleForm: string;
  purchaseQuantity: number;
  saleQuantity: number;
}

interface RestockDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: RestockItem) => void;
}

interface Drug {
  id: number;
  name: string;
  purchase: {
    form: string;
    unitsPerPurchase: number;
  };
  sale: {
    form: string;
  };
}

interface Vendor {
  id: number;
  name: string;
}

export function RestockDialog({ open, onClose, onSubmit }: RestockDialogProps) {
  const [selectedUnit, setSelectedUnit] = useState<"purchase" | "sale">(
    "purchase"
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

  const form = useForm<RestockFormData>();

  const selectedDrug = drugs?.find((d: Drug) => d.id === form.watch("drugId"));

  const handleSubmit = async (data: RestockFormData) => {
    const selectedDrug = drugs?.find((d: Drug) => d.id === data.drugId);
    const selectedVendor = vendors?.find((v: Vendor) => v.id === data.vendorId);

    if (!selectedDrug || !selectedVendor) return;

    const purchaseQuantity =
      selectedUnit === "purchase"
        ? data.quantity
        : Math.ceil(data.quantity / (selectedDrug.unitsPerPurchase || 1));
    const saleQuantity =
      selectedUnit === "sale"
        ? data.quantity
        : data.quantity * (selectedDrug.unitsPerPurchase || 1);

    onSubmit({
      drugId: data.drugId,
      drugName: selectedDrug.name,
      vendorId: data.vendorId,
      vendorName: selectedVendor.name,
      purchaseUnit: data.purchaseUnit,
      quantity: data.quantity,
      batchNumber: data.batchNumber,
      expiryDate: data.expiryDate,
      purchaseForm: selectedDrug.purchase.form,
      saleForm: selectedDrug.sale.form,
      purchaseQuantity,
      saleQuantity,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Restock Drug</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            {/* Drug Selection */}
            <FormField
              control={form.control}
              name="drugId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Drug</FormLabel>
                  <Combobox
                    options={
                      drugs?.map((drug: Drug) => ({
                        label: drug.name,
                        value: drug.id,
                      })) || []
                    }
                    {...field}
                  />
                </FormItem>
              )}
            />

            {/* Vendor Selection */}
            <FormField
              control={form.control}
              name="vendorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vendor</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value?.toString()}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors?.map((vendor: Vendor) => (
                        <SelectItem
                          key={vendor.id}
                          value={vendor.id.toString()}
                        >
                          {vendor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            {/* Unit Selection */}
            <FormField
              control={form.control}
              name="purchaseUnit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Purchase In</FormLabel>
                  <Select
                    onValueChange={(value: "purchase" | "sale") => {
                      setSelectedUnit(value);
                      field.onChange(value);
                    }}
                    value={field.value}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="purchase">
                        {selectedDrug?.purchase.form} (Purchase Unit)
                      </SelectItem>
                      <SelectItem value="sale">
                        {selectedDrug?.sale.form} (Sale Unit)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            {/* Rest of the form fields */}
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="batchNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Batch Number</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expiryDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expiry Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <Button type="submit">Submit</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
