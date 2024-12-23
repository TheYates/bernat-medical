import { PendingRestock } from './PendingRestocks';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { formatDate } from '@/lib/utils';
import { Button } from "@/components/ui/button";
import { History } from "lucide-react";
import { useState } from 'react';

interface ViewRestockDialogProps {
  restock: PendingRestock | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ApprovalHistory {
  status: 'approved' | 'rejected';
  approverName: string;
  approvedAt: string;
}

export function ViewRestockDialog({ restock, open, onOpenChange }: ViewRestockDialogProps) {
  const [showHistory, setShowHistory] = useState(false);

  if (!restock) return null;

  const formatCurrency = (amount: number) => {
    if (!amount || isNaN(amount)) return '₵0.00';
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS'
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <div>
              <DialogTitle>Restock Details</DialogTitle>
              <DialogDescription>
                Review restock request details before approval
              </DialogDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowHistory(true)}
            >
              <History className="h-4 w-4 mr-2" />
              History
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Drug</p>
              <p className="font-medium">{restock.drugName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Vendor</p>
              <p className="font-medium">{restock.vendorName}</p>
            </div>
          </div>

          <div className="bg-muted p-3 rounded-lg space-y-2">
            <p className="text-sm font-medium">Quantity Details</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Purchase Form</p>
                <p className="font-medium">
                  {restock.purchaseQuantity} {restock.purchaseForm}s
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sale Form</p>
                <p className="font-medium">
                  {restock.saleQuantity} {restock.saleForm}s
                </p>
              </div>
            </div>
          </div>

          <div className="bg-muted/50 p-3 rounded-lg space-y-2">
            <p className="text-sm font-medium">Pricing Details</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Purchase Price</p>
                <p className="font-medium">{formatCurrency(restock.purchasePrice)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Unit Cost</p>
                <p className="font-medium">{formatCurrency(restock.unitCost)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <p className="text-sm text-muted-foreground">POS Price</p>
                <p className="font-medium">{formatCurrency(restock.posPrice)}</p>
                <p className="text-xs text-muted-foreground">
                  Markup: {(restock.posMarkup * 100).toFixed(0)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rx Price</p>
                <p className="font-medium">{formatCurrency(restock.prescriptionPrice)}</p>
                <p className="text-xs text-muted-foreground">
                  Markup: {(restock.prescriptionMarkup * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Batch Number</p>
              <p className="font-medium">{restock.batchNumber}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Expiry Date</p>
              <p className="font-medium">{formatDate(restock.expiryDate)}</p>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Requested By</p>
            <p className="font-medium">{restock.createdBy}</p>
          </div>
        </div>

        {restock.approverName && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="font-medium flex items-center gap-2">
              {restock.status === 'approved' ? (
                <span className="text-green-600">Approved</span>
              ) : (
                <span className="text-red-600">Rejected</span>
              )}
              by {restock.approverName} on {formatDate(restock.approvedAt)}
            </p>
          </div>
        )}
      </DialogContent>

      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approval History</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {restock.approverName ? (
              <div className="flex items-center gap-4">
                <div className={`w-2 h-2 rounded-full ${
                  restock.status === 'approved' ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <div>
                  <p className="font-medium">
                    {restock.status === 'approved' ? 'Approved' : 'Rejected'}
                    {' '}by {restock.approverName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(restock.approvedAt)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No approval history yet
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
} 