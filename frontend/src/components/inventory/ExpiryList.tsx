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
import { differenceInDays } from 'date-fns';

interface Drug {
  id: number;
  name: string;
  category: string;
  form: string;
  strength: string;
  unit: string;
  stock: number;
  expiryDate: string;
}

export function ExpiryList() {
  const { data: drugs, isLoading } = useQuery({
    queryKey: ['expiring-drugs'],
    queryFn: async () => {
      console.log('Fetching expiring drugs...');
      try {
        const response = await api.get('/inventory/drugs/expiring');
        console.log('Response:', response.data);
        return response.data;
      } catch (error) {
        console.error('Error fetching expiring drugs:', error);
        throw error;
      }
    },
  });

  const getExpiryStatus = (expiryDate: string) => {
    const daysUntilExpiry = differenceInDays(new Date(expiryDate), new Date());
    if (daysUntilExpiry < 0) return { label: 'Expired', variant: 'destructive' as const };
    if (daysUntilExpiry <= 30) return { label: 'Critical', variant: 'destructive' as const };
    if (daysUntilExpiry <= 90) return { label: 'Warning', variant: 'default' as const };
    return { label: 'Good', variant: 'success' as const };
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Expiring Drugs</h2>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Form</TableHead>
            <TableHead>Strength</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead>Expiry Date</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {drugs?.map((drug: Drug) => {
            const status = getExpiryStatus(drug.expiryDate);
            return (
              <TableRow key={drug.id}>
                <TableCell className="font-medium">{drug.name}</TableCell>
                <TableCell>{drug.category}</TableCell>
                <TableCell>{drug.form}</TableCell>
                <TableCell>{drug.strength} {drug.unit}</TableCell>
                <TableCell>{drug.stock}</TableCell>
                <TableCell>{formatDate(drug.expiryDate)}</TableCell>
                <TableCell>
                  <Badge variant={status.variant}>
                    {status.label}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
          {!drugs?.length && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                No drugs are expiring soon
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
} 