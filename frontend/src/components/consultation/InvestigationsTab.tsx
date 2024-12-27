import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Check, ChevronsUpDown, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { investigationsService, type Investigation } from '@/services/investigations.service';
import { api } from '@/lib/api';

interface Service {
  id: string;
  name: string;
  category: string;
  price: number;
}

interface InvestigationsTabProps {
  patient: any;
}

export function InvestigationsTab({ patient }: InvestigationsTabProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [isLoadingInvestigations, setIsLoadingInvestigations] = useState(false);
  const [services, setServices] = useState<Service[]>([]);

  // Fetch services and investigations when patient changes
  useEffect(() => {
    const fetchData = async () => {
      if (!patient?.id) return;

      setIsLoadingInvestigations(true);
      try {
        // Fetch services - make category check case-insensitive
        const servicesResponse = await api.get('/services', {
          params: {
            category: 'laboratory'  // lowercase to match database
          }
        });
        setServices(servicesResponse.data);

        // Fetch investigations
        const investigationsData = await investigationsService.getHistory(patient.id);
        setInvestigations(investigationsData);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to fetch data');
      } finally {
        setIsLoadingInvestigations(false);
      }
    };

    fetchData();
  }, [patient?.id]);

  // Filter services based on search term
  const filteredServices = services.filter(service => 
    service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addService = (service: Service) => {
    if (!selectedServices.some(s => s.id === service.id)) {
      setSelectedServices([...selectedServices, service]);
    }
  };

  const removeService = (serviceId: string) => {
    setSelectedServices(selectedServices.filter(s => s.id !== serviceId));
  };

  const handleInvestigationRequest = async () => {
    if (!patient?.id || selectedServices.length === 0) return;

    try {
      await investigationsService.create(
        patient.id, 
        selectedServices.map(s => s.id)
      );
      
      // Refresh investigations list
      const updatedInvestigations = await investigationsService.getHistory(patient.id);
      setInvestigations(updatedInvestigations);
      
      // Clear selected services
      setSelectedServices([]);
      setOpen(false);
      toast.success('Investigation request created successfully');
    } catch (error) {
      console.error('Error creating investigation request:', error);
      toast.error('Failed to create investigation request');
    }
  };

  const deleteInvestigation = async (investigationId: string) => {
    try {
      await investigationsService.delete(investigationId);
      
      // Refresh investigations list
      const updatedInvestigations = await investigationsService.getHistory(patient.id);
      setInvestigations(updatedInvestigations);
      
      toast.success('Investigation deleted successfully');
    } catch (error) {
      console.error('Error deleting investigation:', error);
      toast.error('Failed to delete investigation');
    }
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        {/* Copy the JSX from your reference code */}
        {/* Service Search */}
        <div className="flex items-center gap-2">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-[300px] justify-between"
                disabled={!patient}
              >
                Search medical tests...
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
              <Command>
                <CommandInput
                  placeholder="Search tests and scans..."
                  value={searchTerm}
                  onValueChange={setSearchTerm}
                />
                <CommandList>
                  <CommandEmpty>No investigation found.</CommandEmpty>
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
                            selectedServices.some((s) => s.id === service.id)
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        <div className="flex-1">
                          <p>{service.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {service.category} - {formatCurrency(service.price)}
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

        {/* Selected Investigations */}
        {selectedServices.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium mb-4">Selected Investigations</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Investigation</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedServices.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell>{service.name}</TableCell>
                      <TableCell>{service.category}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(service.price)}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeService(service.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex justify-end mt-4">
                <Button
                  type="button"
                  onClick={handleInvestigationRequest}
                  className="rounded-lg"
                >
                  Request Investigations
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Investigation Results */}
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium mb-4">Investigation Results</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Investigation</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Performed By</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingInvestigations ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      Loading investigations...
                    </TableCell>
                  </TableRow>
                ) : investigations.length > 0 ? (
                  investigations.map((investigation) => (
                    <TableRow key={investigation.id}>
                      <TableCell>
                        {format(new Date(investigation.createdAt), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>{investigation.service.name}</TableCell>
                      <TableCell>{investigation.service.category}</TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          {investigation.result ? (
                            <span
                              className="truncate block cursor-pointer hover:text-primary"
                              title="Click to view full result"
                              onClick={(e) => {
                                e.stopPropagation();
                                // TODO: Implement view result functionality
                              }}
                            >
                              {investigation.result.length > 50
                                ? `${investigation.result.substring(0, 50)}...`
                                : investigation.result}
                            </span>
                          ) : (
                            "-"
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            investigation.status === "Completed"
                              ? "success"
                              : investigation.status === "In Progress"
                              ? "warning"
                              : investigation.status === "Cancelled"
                              ? "destructive"
                              : "default"
                          }
                        >
                          {investigation.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {investigation.performedBy
                          ? investigation.performedBy.fullName
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {investigation.status === "Pending" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteInvestigation(investigation.id)}
                            className="h-7 w-7 p-0"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground"
                    >
                      No investigations found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
} 