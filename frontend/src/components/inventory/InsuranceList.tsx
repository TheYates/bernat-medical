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
import { Input } from '@/components/ui/input';
import { InsuranceDialog } from './InsuranceDialog';

interface InsuranceCompany {
  id: number;
  name: string;
  markup_decimal: string | number;
  contact_person: string;
  phone: string;
  email: string;
  active: boolean;
}

export function InsuranceList() {
  const [filter, setFilter] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingInsurance, setEditingInsurance] = useState<InsuranceCompany | null>(null);

  const { data: insurance, isLoading, refetch } = useQuery({
    queryKey: ['insurance-companies'],
    queryFn: async () => {
      const response = await api.get('/inventory/insurance');
      return response.data;
    },
  });

  const filteredInsurance = insurance?.filter((ins: InsuranceCompany) =>
    ins.name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Input
          placeholder="Filter insurance companies..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Insurance
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Default Markup %</TableHead>
            <TableHead>Contact Person</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredInsurance?.map((insurance: InsuranceCompany) => (
            <TableRow key={insurance.id}>
              <TableCell className="font-medium">{insurance.name}</TableCell>
              <TableCell>{(Number(insurance.markup_decimal) * 100).toFixed(0)}% ({Number(insurance.markup_decimal).toFixed(2)}x)</TableCell>
              <TableCell>{insurance.contact_person || '-'}</TableCell>
              <TableCell>{insurance.phone || '-'}</TableCell>
              <TableCell>{insurance.email || '-'}</TableCell>
              <TableCell>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  insurance.active 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                }`}>
                  {insurance.active ? 'Active' : 'Inactive'}
                </span>
              </TableCell>
              <TableCell>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setEditingInsurance(insurance)}
                >
                  Edit
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <InsuranceDialog
        insurance={editingInsurance}
        open={showAddDialog || !!editingInsurance}
        onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) setEditingInsurance(null);
        }}
        onSuccess={() => {
          refetch();
          setShowAddDialog(false);
          setEditingInsurance(null);
        }}
      />
    </div>
  );
} 