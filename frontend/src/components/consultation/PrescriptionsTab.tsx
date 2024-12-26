import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Plus, Trash2, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { prescriptionsService, Drug, Prescription } from '@/services/prescriptions.service';

interface PrescriptionDrug {
  drug: Drug;
  dosage: string;
  frequency: string;
  duration: number;
  route: string;
  quantity: number;
}

interface PrescriptionsTabProps {
  patient: any;
}

export function PrescriptionsTab({ patient }: PrescriptionsTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Drug[]>([]);
  const [selectedDrugs, setSelectedDrugs] = useState<PrescriptionDrug[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Load prescription history
  useEffect(() => {
    if (!patient?.id) return;

    const fetchPrescriptions = async () => {
      setIsLoading(true);
      try {
        const data = await prescriptionsService.getHistory(patient.id);
        setPrescriptions(data);
      } catch (error) {
        console.error('Error fetching prescriptions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrescriptions();
  }, [patient?.id]);

  // Search drugs
  useEffect(() => {
    if (!searchTerm) return;

    const searchDrugs = async () => {
      setIsSearching(true);
      try {
        const data = await prescriptionsService.searchDrugs(searchTerm);
        setSearchResults(data);
      } catch (error) {
        console.error('Error searching drugs:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchDrugs, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleAddDrug = (drug: Drug) => {
    setSelectedDrugs([
      ...selectedDrugs,
      {
        drug,
        dosage: '',
        frequency: '',
        duration: 0,
        route: '',
        quantity: 0
      }
    ]);
    setSearchTerm('');
  };

  const handleRemoveDrug = (index: number) => {
    setSelectedDrugs(selectedDrugs.filter((_, i) => i !== index));
  };

  const handleUpdateDrug = (index: number, field: keyof PrescriptionDrug, value: any) => {
    const updated = [...selectedDrugs];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedDrugs(updated);
  };

  return (
    <div className="space-y-4">
      {/* Drug Search */}
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Drug
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0">
            <Command>
              <CommandInput 
                placeholder="Search drugs..." 
                value={searchTerm}
                onValueChange={setSearchTerm}
              />
              <CommandEmpty>
                {isSearching ? 'Searching...' : 'No drugs found.'}
              </CommandEmpty>
              <CommandGroup>
                {searchResults.map((drug) => (
                  <CommandItem
                    key={drug.id}
                    value={drug.name}
                    onSelect={() => handleAddDrug(drug)}
                  >
                    {drug.name} - {drug.form} {drug.strength}
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Selected Drugs */}
      {selectedDrugs.length > 0 && (
        <Card className="p-4">
          <div className="space-y-4">
            {selectedDrugs.map((item, index) => (
              <div key={index} className="flex items-start gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between">
                    <Badge>{item.drug.name}</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveDrug(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Dosage</Label>
                      <Input
                        value={item.dosage}
                        onChange={(e) => handleUpdateDrug(index, 'dosage', e.target.value)}
                        placeholder="e.g., 1 tablet"
                      />
                    </div>
                    <div>
                      <Label>Frequency</Label>
                      <Input
                        value={item.frequency}
                        onChange={(e) => handleUpdateDrug(index, 'frequency', e.target.value)}
                        placeholder="e.g., twice daily"
                      />
                    </div>
                    <div>
                      <Label>Duration (days)</Label>
                      <Input
                        type="number"
                        value={item.duration}
                        onChange={(e) => handleUpdateDrug(index, 'duration', parseInt(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label>Route</Label>
                      <Input
                        value={item.route}
                        onChange={(e) => handleUpdateDrug(index, 'route', e.target.value)}
                        placeholder="e.g., oral"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Prescription History */}
      <div>
        <h3 className="text-sm font-medium mb-2">Previous Prescriptions</h3>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading prescriptions...</p>
        ) : prescriptions.length > 0 ? (
          <ScrollArea className="h-[300px]">
            <div className="space-y-4">
              {prescriptions.map((prescription) => (
                <Card key={prescription.id} className="p-3">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium">
                      {format(new Date(prescription.prescribedAt), 'MMM d, yyyy')}
                    </span>
                    <Badge variant={prescription.status === 'dispensed' ? 'default' : 'secondary'}>
                      {prescription.status}
                    </Badge>
                  </div>
                  <Separator className="my-2" />
                  <div className="space-y-2">
                    {prescription.drugs.map((drug, index) => (
                      <div key={index} className="text-sm">
                        <p className="font-medium">{drug.drug.name}</p>
                        <p className="text-muted-foreground">
                          {drug.dosage} - {drug.frequency} - {drug.duration} days
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    By: {prescription.prescribedBy.firstName} {prescription.prescribedBy.lastName}
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <p className="text-sm text-muted-foreground">No previous prescriptions found</p>
        )}
      </div>
    </div>
  );
} 