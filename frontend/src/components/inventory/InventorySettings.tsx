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
import { Plus, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CategoryActions } from './CategoryActions';
import { FormActions } from './FormActions';
import { AddCategoryDialog } from './AddCategoryDialog';
import { AddFormDialog } from './AddFormDialog';
import { VendorList } from './VendorList';
import { InsuranceList } from './InsuranceList';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface Category {
  id: number;
  name: string;
  description?: string;
}

interface Form {
  id: number;
  name: string;
  description?: string;
}

export function InventorySettings() {
  const [categoryFilter, setCategoryFilter] = useState('');
  const [formFilter, setFormFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const pageSize = 10;

  const { data: categories, isLoading: loadingCategories, refetch: refetchCategories } = useQuery({
    queryKey: ['drug-categories', page],
    queryFn: async () => {
      const response = await api.get(`/inventory/categories?page=${page}&limit=${pageSize}`);
      return response.data;
    },
  });

  const { data: forms, isLoading: loadingForms, refetch: refetchForms } = useQuery({
    queryKey: ['drug-forms', page],
    queryFn: async () => {
      const response = await api.get(`/inventory/forms?page=${page}&limit=${pageSize}`);
      return response.data;
    },
  });

  const filteredCategories = categories?.data?.filter((cat: Category) => 
    cat.name.toLowerCase().includes(categoryFilter.toLowerCase())
  );

  const filteredForms = forms?.data?.filter((form: Form) => 
    form.name.toLowerCase().includes(formFilter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Accordion type="single" collapsible className="space-y-4">
        <AccordionItem value="categories" className="border rounded-lg">
          <AccordionTrigger className="px-4">
            <h3 className="text-lg font-semibold">Categories</h3>
          </AccordionTrigger>
          <AccordionContent className="px-4 pt-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Input
                  placeholder="Filter categories..."
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="max-w-sm"
                />
                <Button onClick={() => setShowAddCategory(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCategories?.map((category: Category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell>{category.description || '-'}</TableCell>
                      <TableCell>
                        <CategoryActions category={category} onSuccess={refetchCategories} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="forms" className="border rounded-lg">
          <AccordionTrigger className="px-4">
            <h3 className="text-lg font-semibold">Forms</h3>
          </AccordionTrigger>
          <AccordionContent className="px-4 pt-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Input
                  placeholder="Filter forms..."
                  value={formFilter}
                  onChange={(e) => setFormFilter(e.target.value)}
                  className="max-w-sm"
                />
                <Button onClick={() => setShowAddForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Form
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredForms?.map((form: Form) => (
                    <TableRow key={form.id}>
                      <TableCell className="font-medium">{form.name}</TableCell>
                      <TableCell>{form.description || '-'}</TableCell>
                      <TableCell>
                        <FormActions form={form} onSuccess={refetchForms} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="vendors" className="border rounded-lg">
          <AccordionTrigger className="px-4">
            <h3 className="text-lg font-semibold">Vendors</h3>
          </AccordionTrigger>
          <AccordionContent className="px-4 pt-4">
            <VendorList />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="insurance" className="border rounded-lg">
          <AccordionTrigger className="px-4">
            <h3 className="text-lg font-semibold">Insurance Companies</h3>
          </AccordionTrigger>
          <AccordionContent className="px-4 pt-4">
            <InsuranceList />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {pageSize} items per page
        </p>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => p + 1)}
            disabled={!categories?.hasMore}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <AddCategoryDialog
        open={showAddCategory}
        onOpenChange={setShowAddCategory}
        onSuccess={refetchCategories}
      />

      <AddFormDialog
        open={showAddForm}
        onOpenChange={setShowAddForm}
        onSuccess={refetchForms}
      />
    </div>
  );
} 