import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query'; 
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { formatDate } from '@/lib/utils';
import { api } from '@/lib/api';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ViewRestockDialog } from '@/components/inventory/ViewRestockDialog';
import { History } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface PendingRestock {
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
  status: 'pending' | 'approved' | 'rejected';
  purchasePrice: number;
  unitCost: number;
  posPrice: number;
  prescriptionPrice: number;
  posMarkup: number;
  prescriptionMarkup: number;
  approverName: string | null;
  approvedAt: string | null;
  createdAt: string;
}

interface RestockHistoryItem extends PendingRestock {
  createdAt: string;
  approvedAt: string | null;
  approverName: string | null;
}

export function PendingRestocks() {
  const [selectedRestock, setSelectedRestock] = useState<PendingRestock | null>(null);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewRestock, setViewRestock] = useState<PendingRestock | null>(null);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<RestockHistoryItem | null>(null);

  const { data: restocks, isLoading, refetch } = useQuery({
    queryKey: ['pending-restocks'],
    queryFn: async () => {
      const response = await api.get('/inventory/restock/pending');
      return response.data;
    },
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['restock-history'],
    queryFn: async () => {
      const response = await api.get('/inventory/restock/history');
      return response.data;
    },
  });

  const handleAction = async () => {
    if (!selectedRestock || !action) return;
    
    try {
      setIsProcessing(true);
      await api.post(`/inventory/restock/${selectedRestock.id}/approve`, { 
        status: action === 'approve' ? 'approved' : 'rejected' 
      });
      toast.success(`Restock ${action}ed`);
      refetch();
    } catch (error) {
      toast.error(`Failed to ${action} restock`);
    } finally {
      setIsProcessing(false);
      setSelectedRestock(null);
      setAction(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading pending restocks...</div>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">Pending Restocks</h2>
        <Button 
          variant="outline" 
          onClick={() => setShowAllHistory(true)}
        >
          <History className="h-4 w-4 mr-2" />
          View History
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Drug</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Batch #</TableHead>
            <TableHead>Expiry</TableHead>
            <TableHead>Requested By</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!restocks?.length ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                No pending restocks found
              </TableCell>
            </TableRow>
          ) : (
            restocks.map((restock: PendingRestock) => (
              <TableRow 
                key={restock.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => setViewRestock(restock)}
              >
                <TableCell>{restock.drugName}</TableCell>
                <TableCell>{restock.vendorName}</TableCell>
                <TableCell>
                  {restock.purchaseQuantity} {restock.purchaseForm}s
                  ({restock.saleQuantity} {restock.saleForm}s)
                </TableCell>
                <TableCell>{restock.batchNumber}</TableCell>
                <TableCell>{formatDate(restock.expiryDate)}</TableCell>
                <TableCell>{restock.createdBy}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button 
                      size="sm"
                      onClick={() => {
                        setSelectedRestock(restock);
                        setAction('approve');
                      }}
                    >
                      Approve
                    </Button>
                    <Button 
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setSelectedRestock(restock);
                        setAction('reject');
                      }}
                    >
                      Reject
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <ViewRestockDialog
        restock={viewRestock}
        open={!!viewRestock}
        onOpenChange={(open) => !open && setViewRestock(null)}
      />

      <AlertDialog 
        open={!!selectedRestock && !!action} 
        onOpenChange={() => {
          setSelectedRestock(null);
          setAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {action === 'approve' ? 'Approve Restock' : 'Reject Restock'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {action} this restock request for {selectedRestock?.drugName}?
              {action === 'approve' && (
                <div className="mt-2 p-2 bg-muted rounded-md">
                  <p>This will add:</p>
                  <p className="font-semibold">
                    {selectedRestock?.saleQuantity} {selectedRestock?.saleForm}s to stock
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              disabled={isProcessing}
              className={action === 'reject' ? 'bg-destructive hover:bg-destructive/90' : undefined}
            >
              {isProcessing ? 'Processing...' : action === 'approve' ? 'Approve' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showAllHistory} onOpenChange={setShowAllHistory}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Restock History</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Drug</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Approved/Rejected By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historyLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    Loading history...
                  </TableCell>
                </TableRow>
              ) : historyData?.map((item: RestockHistoryItem) => (
                <TableRow 
                  key={item.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedHistoryItem(item)}
                >
                  <TableCell>{formatDate(item.createdAt, 'PPpp')}</TableCell>
                  <TableCell>{item.drugName}</TableCell>
                  <TableCell>
                    {item.purchaseQuantity} {item.purchaseForm}s
                    ({item.saleQuantity} {item.saleForm}s)
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      item.status === 'approved' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                    }`}>
                      {item.status}
                    </span>
                  </TableCell>
                  <TableCell>{item.createdBy}</TableCell>
                  <TableCell>
                    {item.approverName && item.approvedAt
                      ? `${item.approverName} on ${formatDate(item.approvedAt, 'PPp')}` 
                      : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      <Dialog 
        open={!!selectedHistoryItem} 
        onOpenChange={(open) => !open && setSelectedHistoryItem(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restock Details</DialogTitle>
          </DialogHeader>
          {selectedHistoryItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm">Drug</h4>
                  <p>{selectedHistoryItem.drugName}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Vendor</h4>
                  <p>{selectedHistoryItem.vendorName}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Purchase Quantity</h4>
                  <p>{selectedHistoryItem.purchaseQuantity} {selectedHistoryItem.purchaseForm}s</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Sale Quantity</h4>
                  <p>{selectedHistoryItem.saleQuantity} {selectedHistoryItem.saleForm}s</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Batch Number</h4>
                  <p>{selectedHistoryItem.batchNumber}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Expiry Date</h4>
                  <p>{formatDate(selectedHistoryItem.expiryDate)}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-sm">Status Timeline</h4>
                <div className="space-y-1 text-sm">
                  <p>
                    Requested by {selectedHistoryItem.createdBy} on{' '}
                    {formatDate(selectedHistoryItem.createdAt, 'PPpp')}
                  </p>
                  {selectedHistoryItem.approverName && selectedHistoryItem.approvedAt && (
                    <p>
                      {selectedHistoryItem.status === 'approved' ? 'Approved' : 'Rejected'} by{' '}
                      {selectedHistoryItem.approverName} on{' '}
                      {formatDate(selectedHistoryItem.approvedAt, 'PPpp')}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t">
                <h4 className="font-medium text-sm">Pricing Details</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Unit Cost</p>
                    <p className="font-mono">
                      ${Number(selectedHistoryItem.unitCost).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">POS Price</p>
                    <p className="font-mono">
                      ${Number(selectedHistoryItem.posPrice).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Prescription Price</p>
                    <p className="font-mono">
                      ${Number(selectedHistoryItem.prescriptionPrice).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
} 