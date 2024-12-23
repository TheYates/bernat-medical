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
import { Plus, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { AddVendorDialog } from './AddVendorDialog';
import { EditVendorDialog } from './EditVendorDialog';
import { toast } from 'sonner';

interface Vendor {
  id: number;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  active: boolean;
}

export function VendorList() {
  const [filter, setFilter] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const { data: vendors, isLoading, refetch } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const response = await api.get('/inventory/vendors');
      return response.data;
    },
  });

  const filteredVendors = vendors?.filter((vendor: Vendor) => 
    vendor.name.toLowerCase().includes(filter.toLowerCase()) ||
    vendor.contactPerson?.toLowerCase().includes(filter.toLowerCase()) ||
    vendor.phone?.includes(filter)
  );

  const handleEdit = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setShowEditDialog(true);
  };

  const handleToggleActive = async (vendor: Vendor) => {
    try {
      await api.patch(`/inventory/vendors/${vendor.id}/toggle-active`);
      toast.success(`Vendor ${vendor.active ? 'deactivated' : 'activated'} successfully`);
      refetch();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update vendor');
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Input
          placeholder="Search vendors..."
          className="max-w-xs"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Vendor
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Contact Person</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredVendors?.map((vendor: Vendor) => (
            <TableRow key={vendor.id}>
              <TableCell className="font-medium">{vendor.name}</TableCell>
              <TableCell>{vendor.contactPerson || '-'}</TableCell>
              <TableCell>{vendor.phone || '-'}</TableCell>
              <TableCell>{vendor.email || '-'}</TableCell>
              <TableCell>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  vendor.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {vendor.active ? 'Active' : 'Inactive'}
                </span>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(vendor)}>
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className={vendor.active ? 'text-red-600' : 'text-green-600'}
                      onClick={() => handleToggleActive(vendor)}
                    >
                      {vendor.active ? 'Deactivate' : 'Activate'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AddVendorDialog 
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={refetch}
      />

      <EditVendorDialog 
        vendor={selectedVendor}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSuccess={refetch}
      />
    </div>
  );
} 