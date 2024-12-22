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
import { Badge } from '@/components/ui/badge';

interface Drug {
  id: number;
  name: string;
  category: string;
  form: string;
  strength: string;
  unit: string;
  stock: number;
  minStock: number;
}

export function LowStockList() {
  const { data: drugs, isLoading } = useQuery({
    queryKey: ['low-stock-drugs'],
    queryFn: async () => {
      const response = await api.get('/inventory/low-stock');
      return response.data;
    },
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Low Stock Alert</h2>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Form</TableHead>
            <TableHead>Strength</TableHead>
            <TableHead>Current Stock</TableHead>
            <TableHead>Min Stock</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {drugs?.map((drug: Drug) => (
            <TableRow key={drug.id}>
              <TableCell className="font-medium">{drug.name}</TableCell>
              <TableCell>{drug.category}</TableCell>
              <TableCell>{drug.form}</TableCell>
              <TableCell>{drug.strength} {drug.unit}</TableCell>
              <TableCell>
                <Badge variant="destructive">
                  {drug.stock}
                </Badge>
              </TableCell>
              <TableCell>{drug.minStock}</TableCell>
            </TableRow>
          ))}
          {!drugs?.length && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                No drugs are running low on stock
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
} 