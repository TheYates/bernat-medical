import { useState, ReactNode, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { CreateDrugDialog } from './CreateDrugDialog';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Drug } from '@/types/inventory';

interface Column {
  header: string;
  cell: (drug: Drug) => ReactNode;
}

interface DrugsListProps {
  columns: Column[];
  refetchKey?: number;
}

export function DrugsList({ columns, refetchKey }: DrugsListProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { data: drugs, isLoading, refetch } = useQuery({
    queryKey: ['drugs'],
    queryFn: async () => {
      const response = await api.get('/inventory/drugs');
      return response.data;
    },
  });

  useEffect(() => {
    refetch();
  }, [refetchKey, refetch]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Drugs</h2>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Drug
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column, index) => (
              <TableHead key={index}>{column.header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {drugs?.map((drug: Drug) => (
            <TableRow key={drug.id}>
              {columns.map((column, index) => (
                <TableCell key={index}>{column.cell(drug)}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <CreateDrugDialog 
        open={showCreateDialog} 
        onOpenChange={setShowCreateDialog}
        onSuccess={refetch}
      />
    </div>
  );
} 