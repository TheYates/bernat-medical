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

interface Drug {
  id: number;
  name: string;
  category: string;
  form: string;
  stock: number;
  minStock: number;
}

export function LowStockList() {
  const { data: drugs, isLoading } = useQuery({
    queryKey: ['low-stock-drugs'],
    queryFn: async () => {
      try {
        console.log('Making API call to /api/inventory/drugs/low-stock');
        const response = await api.get('/inventory/drugs/low-stock');
        console.log('API Response:', response);
        return response.data;
      } catch (error) {
        console.error('API Error:', error);
        throw error;
      }
    },
  });

  if (isLoading) return <div>Loading...</div>;

  // Always render the table structure
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Form</TableHead>
          <TableHead>Stock</TableHead>
          <TableHead>Min Stock</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {!drugs?.length ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center">
              No low stock items
            </TableCell>
          </TableRow>
        ) : (
          drugs.map((drug: Drug) => (
            <TableRow key={drug.id}>
              <TableCell>{drug.name}</TableCell>
              <TableCell>{drug.category}</TableCell>
              <TableCell>{drug.form}</TableCell>
              <TableCell>{drug.stock}</TableCell>
              <TableCell>{drug.minStock}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
} 