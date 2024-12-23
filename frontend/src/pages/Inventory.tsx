import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DrugsList } from '@/components/inventory/DrugsList';
import { RestockList } from '@/components/inventory/RestockList';
import { LowStockList } from '@/components/inventory/LowStockList';
import { ExpiryList } from '@/components/inventory/ExpiryList';
import { InventorySettings } from '@/components/inventory/InventorySettings';
import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatPrice } from "@/lib/utils";
import { EditDrugDialog } from '@/components/inventory/EditDrugDialog';
import { RestockDrugDialog } from '@/components/inventory/RestockDrugDialog';
import { useState } from 'react';
import { Drug } from '@/types/inventory';
import { PendingRestocks } from '@/components/inventory/PendingRestocks';
import { useAuth } from '@/contexts/AuthContext';

export function InventoryPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showRestockDialog, setShowRestockDialog] = useState(false);

  const handleRestock = (drug: Drug) => {
    setSelectedDrug(drug);
    setShowRestockDialog(true);
  };

  const handleEdit = (drug: Drug) => {
    setSelectedDrug(drug);
    setShowEditDialog(true);
  };

  const handleToggleActive = (drug: Drug) => {
    // Add toggle active logic
    console.log('Toggle active', drug);
  };

  const columns = [
    {
      header: 'Name',
      cell: (drug: Drug) => drug.name,
    },
    {
      header: 'Category',
      cell: (drug: Drug) => drug.category,
    },
    {
      header: 'Form',
      cell: (drug: Drug) => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-sm cursor-help">
                {drug.saleForm}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div>Purchase as: {drug.purchaseForm}</div>
              <div className="text-xs text-muted-foreground">
                {drug.unitsPerPurchase} {drug.saleForm}s per {drug.purchaseForm}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
    },
    {
      header: 'Strength',
      cell: (drug: Drug) => `${drug.strength} ${drug.unit}`,
    },
    {
      header: 'Price',
      cell: (drug: Drug) => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-sm cursor-help">
                {formatPrice(drug.posPrice)}
              </div>
            </TooltipTrigger>
            <TooltipContent className="space-y-1">
              <div>Unit Cost: {formatPrice(drug.unitCost)}</div>
              <div>Rx Price: {formatPrice(drug.prescriptionPrice)}</div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
    },
    {
      header: 'Stock',
      cell: (drug: Drug) => (
        <span className={drug.stock <= drug.minStock ? 'text-red-500' : ''}>
          {drug.stock}
        </span>
      ),
    },
    {
      header: 'Expiry Date',
      cell: (drug: Drug) => new Date(drug.expiryDate).toLocaleDateString(),
    },
    {
      header: 'Status',
      cell: (drug: Drug) => (
        <span className={`px-2 py-1 rounded-full text-xs ${
          drug.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {drug.active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      header: 'Actions',
      cell: (drug: Drug) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleRestock(drug)}>
              Restock
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleEdit(drug)}>
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-red-600"
              onClick={() => handleToggleActive(drug)}
            >
              {drug.active ? 'Deactivate' : 'Activate'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold">Inventory Management</h1>
          <p className="text-muted-foreground">Manage drugs and supplies</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Inventory</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="drugs" className="space-y-4">
              <TabsList>
                <TabsTrigger value="drugs">Drugs</TabsTrigger>
                <TabsTrigger value="restock">Restock</TabsTrigger>
                {isAdmin && <TabsTrigger value="pending">Pending Restocks</TabsTrigger>}
                <TabsTrigger value="low-stock">Low Stock</TabsTrigger>
                <TabsTrigger value="expiry">Expiry</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              <TabsContent value="drugs">
                <DrugsList columns={columns} />
              </TabsContent>
              <TabsContent value="restock">
                <RestockList />
              </TabsContent>
              <TabsContent value="lowstock">
                <LowStockList />
              </TabsContent>
              <TabsContent value="expiry">
                <ExpiryList />
              </TabsContent>
              <TabsContent value="settings">
                <InventorySettings />
              </TabsContent>
              {isAdmin && (
                <TabsContent value="pending">
                  <PendingRestocks />
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <EditDrugDialog 
        drug={selectedDrug}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSuccess={() => {
          setShowEditDialog(false);
          // Refresh the drugs list
          window.location.reload();
        }}
      />

      <RestockDrugDialog
        drug={selectedDrug}
        open={showRestockDialog}
        onOpenChange={setShowRestockDialog}
        onSuccess={() => {
          setShowRestockDialog(false);
          // Refresh the drugs list
          window.location.reload();
        }}
      />
    </DashboardLayout>
  );
} 