import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ServiceActions } from './ServiceActions';
import type { Service } from '@/types/service';

interface ServiceTableProps {
  services: Service[];
  isLoading: boolean;
  onServiceUpdated: () => void;
}

export function ServiceTable({ services, isLoading, onServiceUpdated }: ServiceTableProps) {
  if (isLoading) {
    return <div>Loading...</div>;
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(price);
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Price</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-[100px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {services.map((service) => (
          <TableRow key={service.id}>
            <TableCell className="font-medium">{service.name}</TableCell>
            <TableCell>
              <Badge variant="secondary" className="capitalize">
                {service.category}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {service.description || 'No description'}
            </TableCell>
            <TableCell>{formatPrice(service.price)}</TableCell>
            <TableCell>
              <Badge variant={service.active ? "success" : "secondary"}>
                {service.active ? "Active" : "Inactive"}
              </Badge>
            </TableCell>
            <TableCell>
              <ServiceActions service={service} onServiceUpdated={onServiceUpdated} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
} 