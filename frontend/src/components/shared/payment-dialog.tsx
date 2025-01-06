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
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency } from "@/lib/utils";
import { PaymentMethodButton } from "./payment-method-button";

interface PaymentMethod {
  id: string;
  label: string;
}

interface PaymentItem {
  name: string;
  quantity: number;
  amount: number;
}

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalAmount: number;
  onSubmit: (data: {
    methods: string[];
    amounts: Record<string, number>;
  }) => void;
  summary?: {
    title: string;
    items: PaymentItem[];
  };
}

const paymentMethods: PaymentMethod[] = [
  { id: "cash", label: "Cash" },
  { id: "card", label: "Card" },
  { id: "mobile", label: "Mobile Money" },
  { id: "insurance", label: "Insurance" },
];

export function PaymentDialog({
  open,
  onOpenChange,
  totalAmount,
  onSubmit,
  summary,
}: PaymentDialogProps) {
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<
    string[]
  >([]);
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, number>>(
    {}
  );

  const handlePaymentMethodChange = (method: string) => {
    setSelectedPaymentMethods((prev) => {
      const isSelected = prev.includes(method);
      const newMethods = isSelected
        ? prev.filter((m) => m !== method)
        : [...prev, method];

      // If only one method selected, automatically assign full amount
      if (newMethods.length === 1) {
        setPaymentAmounts({ [newMethods[0]]: totalAmount });
      }
      // If switching to multiple methods or no methods, reset amounts
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

  const remainingAmount =
    totalAmount -
    Object.values(paymentAmounts).reduce((sum, amount) => sum + amount, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Payment Details</DialogTitle>
          <DialogDescription>
            Total Amount: {formatCurrency(totalAmount)}
          </DialogDescription>
        </DialogHeader>

        {summary && (
          <div className="border rounded-lg p-4 mb-4">
            <h4 className="font-medium mb-2">{summary.title}</h4>
            <div className="space-y-2">
              {summary.items.map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span>
                    {item.name} {item.quantity > 1 && `(${item.quantity})`}
                  </span>
                  <span>{formatCurrency(item.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label className="text-sm font-medium mb-3 block">
              Select Payment Method
            </label>
            <div className="flex flex-row gap-2 justify-center">
              {paymentMethods.map((method) => (
                <PaymentMethodButton
                  key={method.id}
                  id={method.id}
                  label={method.label}
                  selected={selectedPaymentMethods.includes(method.id)}
                  onClick={() => handlePaymentMethodChange(method.id)}
                />
              ))}
            </div>
          </div>

          {/* Only show amount inputs for multiple payment methods */}
          {selectedPaymentMethods.length > 1 && (
            <div className="space-y-4">
              <div className="flex gap-4">
                {selectedPaymentMethods.map((method) => (
                  <div key={method} className="flex-1">
                    <label className="text-sm font-medium block mb-2">
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

              <div className="text-sm text-muted-foreground">
                Remaining: {formatCurrency(remainingAmount)}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onSubmit({
                methods: selectedPaymentMethods,
                amounts: paymentAmounts,
              });
              setSelectedPaymentMethods([]);
              setPaymentAmounts({});
            }}
            disabled={Math.abs(remainingAmount) > 0.01}
          >
            Complete Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
