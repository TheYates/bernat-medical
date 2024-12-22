import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { RestockDialog } from './RestockDialog';

interface Drug {
  id: number;
  name: string;
  category: string;
  form: string;
  strength: string;
  unit: string;
  stock: number;
  batchNumber?: string;
  expiryDate: string;
}

export function RestockList() {
  const [showRestockDialog, setShowRestockDialog] = useState(false);
  const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null);

  const { data: drugs, isLoading, refetch } = useQuery({
    queryKey: ['drugs'],
    queryFn: async () => {
      const response = await api.get('/inventory/drugs');
      return response.data;
    },
  });

  const handleRestock = (drug: Drug) => {
    setSelectedDrug(drug);
    setShowRestockDialog(true);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Restock Inventory</h2>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Form</TableHead>
            <TableHead>Strength</TableHead>
            <TableHead>Current Stock</TableHead>
            <TableHead>Last Batch</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {drugs?.map((drug: Drug) => (
            <TableRow key={drug.id}>
              <TableCell className="font-medium">{drug.name}</TableCell>
              <TableCell>{drug.category}</TableCell>
              <TableCell>{drug.form}</TableCell>
              <TableCell>{drug.strength} {drug.unit}</TableCell>
              <TableCell>{drug.stock}</TableCell>
              <TableCell>
                {drug.batchNumber && (
                  <div className="text-sm">
                    <div>Batch: {drug.batchNumber}</div>
                    <div className="text-muted-foreground">
                      Expires: {formatDate(drug.expiryDate)}
                    </div>
                  </div>
                )}
              </TableCell>
              <TableCell>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRestock(drug)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Restock
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {selectedDrug && (
        <RestockDialog
          drug={selectedDrug}
          open={showRestockDialog}
          onOpenChange={setShowRestockDialog}
          onSuccess={refetch}
        />
      )}
    </div>
  );
} 