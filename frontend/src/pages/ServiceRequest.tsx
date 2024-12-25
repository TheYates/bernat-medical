import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { 
  ChevronsUpDown, 
  Printer, 
  Check,
  Trash2,
  Filter,
  X
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { debounce } from 'lodash';
import { Select, SelectContent, SelectValue, SelectTrigger, SelectItem } from '@/components/ui/select';
import { PatientIdCard } from "@/components/PatientIdCard";

interface Patient {
  id: number;
  clinicId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  contact: string;
}

interface Service {
  id: number;
  name: string;
  category: string;
  price: number;
}

interface ServiceRequest {
  id: number;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
  createdAt: string;
  services: Array<{
    id: number;
    name: string;
    price: number;
    priceAtTime: number;
  } | null> | null;
}

const formSchema = z.object({
  clinicId: z.string().min(1, 'Clinic ID is required'),
});

export function ServiceRequest() {
  // States
  const [patient, setPatient] = useState<Patient | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchForm, setSearchForm] = useState({
    searchTerm: '',
    gender: 'any',
    maritalStatus: 'any',
    ageRange: 'any',
    lastVisit: 'any'
  });
  const [searchResults, setSearchResults] = useState<Patient[]>([]);

  // Form setup
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clinicId: '',
    },
  });

  // Fetch services on mount
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await api.get('/services');
        setServices(response.data);
      } catch (error) {
        console.error('Error fetching services:', error);
        toast.error('Failed to load services');
      }
    };
    fetchServices();
  }, []);

  // Filter services based on search term
  const filteredServices = services.filter(service => 
    service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Helper functions
  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      currencyDisplay: 'symbol'
    }).format(amount);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), "dd MMM yyyy");
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return '-';
    }
  };

  // Service management functions
  const addService = (service: Service) => {
    if (!selectedServices.some(s => s.id === service.id)) {
      setSelectedServices([...selectedServices, service]);
    }
  };

  const removeService = (serviceId: number) => {
    setSelectedServices(selectedServices.filter(s => s.id !== serviceId));
  };

  // Event handlers
  const onClinicIdChange = async (value: string) => {
    // Clear everything if input is empty or backspaced
    if (!value || value.length < 7) {
      setPatient(null);
      setRequests([]);
      setSelectedServices([]); // Also clear selected services
      return;
    }

    try {
      const response = await api.get(`/patients/${value}`);
      setPatient(response.data);
      
      const historyResponse = await api.get(`/services/requests/${response.data.id}`);
      setRequests(historyResponse.data);
    } catch (error) {
      // Clear everything if patient not found
      setPatient(null);
      setRequests([]);
      setSelectedServices([]); // Also clear selected services
      console.error('Error fetching patient:', error);
      if (value.length >= 6) {
        toast.error('Patient not found');
      }
    }
  };

  const handleCreateRequest = async () => {
    if (!patient || selectedServices.length === 0) {
      toast.error('Please select a patient and at least one service');
      return;
    }

    try {
      const response = await api.post('/services/request', {
        patientId: patient.id,
        services: selectedServices.map(s => s.id)
      });

      toast.success('Service request created successfully');
      
      // Refresh the request history
      const historyResponse = await api.get(`/services/requests/${patient.id}`);
      setRequests(historyResponse.data);
      
      // Clear selected services
      setSelectedServices([]);
      
      // Close the confirmation dialog
      setShowCreateDialog(false);
    } catch (error) {
      console.error('Error creating service request:', error);
      toast.error('Failed to create service request');
    }
  };

  const handleCancelRequest = async (requestId: number) => {
    try {
      await api.patch(`/services/requests/${requestId}/cancel`);
      
      // Update the request status in the UI
      setRequests(requests.map(request => 
        request.id === requestId 
          ? { ...request, status: 'Cancelled' as const }
          : request
      ));
      
      toast.success('Service request cancelled successfully');
      setShowCancelDialog(false);
    } catch (error) {
      console.error('Error cancelling request:', error);
      toast.error('Failed to cancel request');
    }
  };

  const handleAdvancedSearch = async () => {
    try {
      const response = await api.get('/patients/search', { 
        params: {
          ...searchForm,
          // Only include non-empty/non-'any' values
          ...Object.fromEntries(
            Object.entries(searchForm).filter(([_, value]) => 
              value !== '' && value !== 'any'
            )
          )
        }
      });
      setSearchResults(response.data);
    } catch (error) {
      console.error('Error searching patients:', error);
      toast.error('Failed to search patients');
    }
  };

  const handlePatientSelect = (selectedPatient: Patient) => {
    setPatient(selectedPatient);
    form.setValue('clinicId', selectedPatient.clinicId);
    setShowSearchDialog(false);
    
    api.get(`/services/requests/${selectedPatient.id}`)
      .then(response => setRequests(response.data))
      .catch(error => console.error('Error fetching request history:', error));
  };

  // Add debounced search
  const debouncedSearch = debounce((term: string) => {
    if (term.length >= 3) {
      api.get('/patients/search', { 
        params: { searchTerm: term } 
      })
        .then(response => setSearchResults(response.data))
        .catch(error => console.error('Error searching:', error));
    } else {
      setSearchResults([]);
    }
  }, 300);

  const hasSearchCriteria = () => {
    return Object.values(searchForm).some(value => 
      value !== '' && value !== 'any'
    );
  };

  // Update the form submission handler
  const onSubmit = (data: z.infer<typeof formSchema>) => {
    if (selectedServices.length === 0) {
      toast.error('Please select at least one service');
      return;
    }
    setShowCreateDialog(true);
  };

  // Add this debounced function near your other handlers
  const debouncedClinicIdSearch = debounce((value: string) => {
    if (value.length >= 6) {
      onClinicIdChange(value);
    }
  }, 300);

  return (
    <DashboardLayout>
      <div className="max-w-[900px] mx-auto">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight">Service Request</h1>
            <p className="text-sm text-muted-foreground">
              Create a new service request
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-3">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                <div className="flex justify-between items-end">
                  <FormField
                    control={form.control}
                    name="clinicId"
                    render={({ field }) => (
                      <FormItem className="w-[200px]">
                        <FormLabel className="text-sm">Clinic ID</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="BP24/0001"
                            className="h-10 text-sm uppercase"
                            onChange={(e) => {
                              const value = e.target.value.toUpperCase();
                              field.onChange(value);
                              debouncedClinicIdSearch(value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowSearchDialog(true)}
                    className="h-10"
                  >
                    Advanced Search
                  </Button>
                </div>

                {/* Patient Info Display */}
                <div className="grid grid-cols-3 gap-2 bg-muted/30 rounded-md p-4">
                  <div className="space-y-1 text-center">
                    <label className="text-sm font-medium text-foreground/70">
                      Name
                    </label>
                    <p className="text-lg font-medium">
                      {patient
                        ? `${patient.firstName} ${patient.middleName} ${patient.lastName}`
                        : "-"}
                    </p>
                  </div>

                  <div className="space-y-1 text-center">
                    <label className="text-sm font-medium text-foreground/70">
                      Age
                    </label>
                    <p className="text-lg font-medium">
                      {patient ? calculateAge(patient.dateOfBirth) : "-"}
                    </p>
                  </div>

                  <div className="space-y-1 text-center">
                    <label className="text-sm font-medium text-foreground/70">
                      Gender
                    </label>
                    <p className="text-lg font-medium">
                      {patient?.gender || "-"}
                    </p>
                  </div>

                  <div className="col-span-3 grid grid-cols-2 gap-4 mt-4">
                    <div className="space-y-1 text-center">
                      <label className="text-sm font-medium text-foreground/70">
                        Date
                      </label>
                      <p className="text-lg font-medium">
                        {format(new Date(), "EEEE, MMMM d, yyyy")}
                      </p>
                    </div>

                    <div className="space-y-1 text-center">
                      <label className="text-sm font-medium text-foreground/70">
                        Time
                      </label>
                      <p className="text-lg font-medium">
                        {format(new Date(), "hh:mm a")}
                      </p>
                    </div>
                  </div>
                </div>

                {patient && (
                  <>
                    <div className="flex justify-end mb-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs print:hidden"
                        onClick={() => window.print()}
                      >
                        <Printer className="h-3 w-3 mr-1" />
                        Print ID Card
                      </Button>
                    </div>

                    {/* ID Card for printing */}
                    <style type="text/css" media="print">
                      {`
                        @page { size: auto; margin: 20mm; }
                        @media print {
                          body * {
                            visibility: hidden;
                          }
                          #printable-card, #printable-card * {
                            visibility: visible;
                          }
                          #printable-card {
                            position: absolute;
                            left: 0;
                            top: 0;
                          }
                        }
                      `}
                    </style>
                    
                    <PatientIdCard patient={patient} calculateAge={calculateAge} />
                  </>
                )}

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Service Details
                    </span>
                  </div>
                </div>

                <Tabs defaultValue="services" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="services">Select Services</TabsTrigger>
                    <TabsTrigger value="history">Request History</TabsTrigger>
                  </TabsList>

                  <TabsContent value="services" className="space-y-4">
                    <div className="bg-muted/30 rounded-lg p-4">
                      <div className="flex items-center gap-4">
                        <Popover open={open} onOpenChange={setOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={open}
                              className="w-[300px] justify-between h-10 text-sm border-2 hover:border-primary"
                            >
                              Search services...
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[300px] p-0">
                            <Command>
                              <CommandInput
                                placeholder="Search services..."
                                onValueChange={setSearchTerm}
                                className="h-9"
                              />
                              <CommandList>
                                <CommandEmpty>No services found</CommandEmpty>
                                <CommandGroup>
                                  {filteredServices.map((service) => (
                                    <CommandItem
                                      key={service.id}
                                      value={service.name}
                                      onSelect={() => {
                                        addService(service);
                                        setOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          selectedServices.some(
                                            (s) => s.id === service.id
                                          )
                                            ? "opacity-100"
                                            : "opacity-0"
                                        )}
                                      />
                                      <div className="flex-1">
                                        <p className="text-sm">{service.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {service.category} -{" "}
                                          {formatCurrency(Number(service.price))}
                                        </p>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>

                      {selectedServices.length > 0 ? (
                        <div className="mt-4 border rounded-lg bg-card shadow-sm">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">Service</TableHead>
                                <TableHead className="text-xs">Category</TableHead>
                                <TableHead className="text-xs text-right">Price</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {selectedServices.map((service) => (
                                <TableRow key={service.id}>
                                  <TableCell className="text-sm">{service.name}</TableCell>
                                  <TableCell className="text-sm">{service.category}</TableCell>
                                  <TableCell className="text-sm text-right">
                                    {formatCurrency(Number(service.price))}
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeService(service.id)}
                                      className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No services selected
                        </p>
                      )}
                    </div>

                    <div className="p-4 bg-muted/50 border-t">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Amount</p>
                          <p className="text-2xl font-bold">
                            {formatCurrency(
                              selectedServices.reduce(
                                (total, service) => total + Number(service.price),
                                0
                              )
                            )}
                          </p>
                        </div>
                        <Button
                          type="submit"
                          size="lg"
                          className="px-6"
                          disabled={!patient || selectedServices.length === 0}
                        >
                          Create Request
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="history">
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Date</TableHead>
                            <TableHead className="text-xs">Services</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                            <TableHead className="text-xs text-right">Amount</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {requests.length > 0 ? (
                            requests.map((request) => (
                              <TableRow key={request.id}>
                                <TableCell className="text-sm">
                                  {formatDate(request.createdAt)}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {request.services && request.services.length > 0
                                    ? request.services
                                        .filter(s => s && s.name)
                                        .map(s => s!.name)
                                        .join(", ")
                                    : "-"}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      request.status === "Completed"
                                        ? "success"
                                        : request.status === "In Progress"
                                        ? "secondary"
                                        : request.status === "Cancelled"
                                        ? "destructive"
                                        : "default"
                                    }
                                    className="text-xs"
                                  >
                                    {request.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm text-right">
                                  {formatCurrency(
                                    request.services && request.services.length > 0
                                      ? request.services.reduce(
                                          (total, s) => total + (s ? Number(s.priceAtTime) : 0),
                                          0
                                        )
                                      : 0
                                  )}
                                </TableCell>
                                <TableCell>
                                  {request.status !== "Cancelled" &&
                                    request.status !== "Completed" && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setSelectedRequestId(request.id);
                                          setShowCancelDialog(true);
                                        }}
                                        className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    )}
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-8">
                                <p className="text-sm text-muted-foreground">
                                  {patient
                                    ? "No service requests found for this patient"
                                    : "Enter a clinic ID to view service request history"}
                                </p>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>
                </Tabs>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      {/* Create Request Confirmation Dialog */}
      <AlertDialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Service Request</AlertDialogTitle>
            <AlertDialogDescription>
              Please review the service request details:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-lg border p-4 space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="font-medium">Patient:</span>{" "}
                {patient?.firstName} {patient?.lastName}
              </div>
              <div>
                <span className="font-medium">Total Amount:</span>{" "}
                {formatCurrency(
                  selectedServices.reduce(
                    (total, service) => total + Number(service.price),
                    0
                  )
                )}
              </div>
            </div>
            <div className="space-y-1">
              <span className="font-medium">Services:</span>
              <ul className="list-disc list-inside">
                {selectedServices.map((service) => (
                  <li key={service.id} className="text-sm">
                    {service.name} ({formatCurrency(Number(service.price))})
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCreateRequest}>
              Create Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Request Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Service Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this service request? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                selectedRequestId && handleCancelRequest(selectedRequestId)
              }
              className="bg-red-500 hover:bg-red-600"
            >
              Yes, cancel request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Patient Search Dialog */}
      <Dialog open={showSearchDialog} onOpenChange={setShowSearchDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Search Patient</DialogTitle>
            <DialogDescription>
              Quick search or use filters for detailed search
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Quick Search Bar */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  placeholder="Search by name, clinic ID, or contact..."
                  value={searchForm.searchTerm}
                  onChange={(e) => {
                    setSearchForm(prev => ({ ...prev, searchTerm: e.target.value }));
                    if (e.target.value.length >= 3) {
                      handleAdvancedSearch();
                    }
                  }}
                  className="w-full pr-8"
                />
                {searchForm.searchTerm && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => {
                      setSearchForm(prev => ({ ...prev, searchTerm: '' }));
                      setSearchResults([]);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {Object.values(searchForm).some(v => v !== '' && v !== 'any') && (
                  <Badge variant="secondary" className="ml-2">
                    {Object.values(searchForm).filter(v => v !== '' && v !== 'any').length}
                  </Badge>
                )}
              </Button>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <Card>
                <CardContent className="pt-4 grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Gender</label>
                    <Select
                      value={searchForm.gender}
                      onValueChange={(value) => {
                        setSearchForm(prev => ({ ...prev, gender: value }));
                        handleAdvancedSearch();
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Any gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Age Range</label>
                    <Select
                      value={searchForm.ageRange}
                      onValueChange={(value) => {
                        setSearchForm(prev => ({ ...prev, ageRange: value }));
                        handleAdvancedSearch();
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Any age" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="0-17">Under 18</SelectItem>
                        <SelectItem value="18-30">18-30</SelectItem>
                        <SelectItem value="31-50">31-50</SelectItem>
                        <SelectItem value="51+">Over 50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Last Visit</label>
                    <Select
                      value={searchForm.lastVisit}
                      onValueChange={(value) => {
                        setSearchForm(prev => ({ ...prev, lastVisit: value }));
                        handleAdvancedSearch();
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Any time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any time</SelectItem>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="week">This Week</SelectItem>
                        <SelectItem value="month">This Month</SelectItem>
                        <SelectItem value="year">This Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchForm({
                          searchTerm: '',
                          gender: 'any',
                          maritalStatus: 'any',
                          ageRange: 'any',
                          lastVisit: 'any'
                        });
                        setSearchResults([]);
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Search Results */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Clinic ID</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchResults.map((patient) => (
                    <TableRow key={patient.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {patient.firstName} {patient.middleName} {patient.lastName}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{patient.clinicId}</TableCell>
                      <TableCell>{patient.gender}</TableCell>
                      <TableCell>{patient.contact}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => handlePatientSelect(patient)}
                        >
                          Select
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSearchDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
} 