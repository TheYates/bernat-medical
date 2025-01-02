import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { CreditCard, Banknote, Smartphone, Shield } from "lucide-react";

interface PaymentMethod {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const paymentMethods: PaymentMethod[] = [
  { id: "card", label: "Card", icon: <CreditCard className="h-6 w-6" /> },
  { id: "cash", label: "Cash", icon: <Banknote className="h-6 w-6" /> },
  {
    id: "mobile",
    label: "Mobile Money",
    icon: <Smartphone className="h-6 w-6" />,
  },
  {
    id: "insurance",
    label: "Insurance",
    icon: <Shield className="h-6 w-6" />,
  },
];

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalAmount: number;
  onSubmit: (paymentData: {
    methods: string[];
    amounts: Record<string, number>;
  }) => Promise<void>;
  summary?: {
    title: string;
    items: Array<{
      name: string;
      quantity?: number;
      amount: number;
    }>;
  };
}

export function PaymentDialog({
  open,
  onOpenChange,
  totalAmount,
  onSubmit,
  summary,
}: PaymentDialogProps) {
  const [selectedMethods, setSelectedMethods] = useState<string[]>([]);
  const [amounts, setAmounts] = useState<Record<string, number>>({});

  const handleMethodChange = (method: string) => {
    setSelectedMethods((prev) => {
      const isSelected = prev.includes(method);
      const newMethods = isSelected
        ? prev.filter((m) => m !== method)
        : [...prev, method];

      // If only one method selected, set full amount
      if (newMethods.length === 1) {
        setAmounts({ [newMethods[0]]: totalAmount });
      }
      // If switching to multiple methods or no methods, reset amounts
      else {
        setAmounts({});
      }

      return newMethods;
    });
  };

  const handleAmountChange = (method: string, amount: string) => {
    setAmounts((prev) => ({
      ...prev,
      [method]: parseFloat(amount) || 0,
    }));
  };

  const handleSubmit = async () => {
    await onSubmit({
      methods: selectedMethods,
      amounts,
    });
    // Reset form
    setSelectedMethods([]);
    setAmounts({});
  };

  const totalPaid = Object.values(amounts).reduce(
    (sum, amount) => sum + amount,
    0
  );
  const remaining = totalAmount - totalPaid;

  // Round numbers to 2 decimal places for comparison
  const roundedTotalPaid = Math.round(totalPaid * 100) / 100;
  const roundedTotalAmount = Math.round(totalAmount * 100) / 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Payment Method</DialogTitle>
          <DialogDescription>
            Select payment method to complete transaction
          </DialogDescription>
        </DialogHeader>

        {summary && (
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium text-sm">{summary.title}</h4>
            <div className="mt-2">
              {summary.items.map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {item.name}
                    {item.quantity && ` × ${item.quantity}`}
                  </span>
                  <span>{formatCurrency(item.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-4 justify-between">
          {paymentMethods.map((method) => (
            <button
              key={method.id}
              className={`flex-1 flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                selectedMethods.includes(method.id)
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
              onClick={() => handleMethodChange(method.id)}
            >
              {method.icon}
              <span className="mt-2 text-sm font-medium">{method.label}</span>
            </button>
          ))}
        </div>

        {selectedMethods.length > 1 && (
          <div className="mt-4">
            <div className="flex gap-4">
              {selectedMethods.map((methodId) => (
                <div key={methodId} className="flex-1">
                  <span className="block mb-2 text-sm font-medium">
                    {paymentMethods.find((m) => m.id === methodId)?.label}
                  </span>
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={amounts[methodId] || ""}
                    onChange={(e) =>
                      handleAmountChange(methodId, e.target.value)
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedMethods.length > 0 && (
          <div className="mt-4">
            <div className="text-sm">
              Total Paid: {formatCurrency(totalPaid)}
            </div>
            <div className="text-sm">
              Remaining: {formatCurrency(remaining)}
            </div>
          </div>
        )}

        <div className="bg-secondary p-4 rounded-lg flex justify-between items-center">
          <span className="font-medium">Total Amount</span>
          <span className="font-medium">{formatCurrency(totalAmount)}</span>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !selectedMethods.length ||
              roundedTotalPaid !== roundedTotalAmount ||
              Object.keys(amounts).length !== selectedMethods.length
            }
          >
            Process Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
