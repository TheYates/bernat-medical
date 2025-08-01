import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Check, ChevronsUpDown, Trash2, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import {
  investigationsService,
  type Investigation,
} from "@/services/investigations.service";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { Separator } from "@/components/ui/separator";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [isLoadingInvestigations, setIsLoadingInvestigations] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedResult, setSelectedResult] = useState<Investigation | null>(
    null
  );
  const [showResultDetails, setShowResultDetails] = useState(false);
  const [showDocumentPreview, setShowDocumentPreview] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [investigationHistory, setInvestigationHistory] = useState<
    Investigation[]
  >([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Fetch services and investigations when patient changes
  useEffect(() => {
    const fetchData = async () => {
      if (!patient?.id) return;

      setIsLoadingInvestigations(true);
      try {
        // Fetch services
        const servicesResponse = await api.get("/services");
        const filteredServices = servicesResponse.data.filter(
          (service: Service) =>
            service.category.toLowerCase() !== "consultation"
        );
        setServices(filteredServices);

        // Fetch investigations
        const investigationsResponse = await api.get(
          `/lab-requests/${patient.id}/history`
        );
        setInvestigations(investigationsResponse.data);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load data");
      } finally {
        setIsLoadingInvestigations(false);
      }
    };

    fetchData();
  }, [patient?.id]);

  // Filter services based on search term
  const filteredServices = services.filter(
    (service) =>
      service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addService = (service: Service) => {
    if (!selectedServices.some((s) => s.id === service.id)) {
      setSelectedServices([...selectedServices, service]);
    }
  };

  const removeService = (serviceId: string) => {
    setSelectedServices(selectedServices.filter((s) => s.id !== serviceId));
  };

  const submitInvestigationRequest = async () => {
    try {
      console.log("Sending investigation request:", {
        patientId: patient?.id,
        selectedInvestigations: selectedServices.map((s) => s.id),
      });

      for (const serviceId of selectedServices.map((s) => s.id)) {
        await investigationsService.create({
          patientId: patient?.id,
          serviceId,
        });
      }

      toast.success("Investigation request created");
      setSelectedServices([]);
      setOpen(false);
      setShowConfirmDialog(false);

      // Refresh investigations and history
      const investigationsResponse = await api.get(
        `/lab-requests/${patient.id}/history`
      );
      setInvestigations(investigationsResponse.data);

      const historyResponse = await api.get(
        `/lab-requests/${patient.id}/history`
      );
      setInvestigationHistory(historyResponse.data);
    } catch (error) {
      console.error("Investigation request error:", error);
      toast.error("Failed to create investigation request");
    }
  };

  const handleInvestigationRequest = () => {
    setShowConfirmDialog(true);
  };

  const deleteInvestigation = async (investigationId: string) => {
    try {
      await investigationsService.delete(investigationId);

      // Refresh investigations list
      const updatedInvestigations = await investigationsService.getHistory(
        patient.id
      );
      setInvestigations(updatedInvestigations);

      toast.success("Investigation deleted successfully");
    } catch (error) {
      console.error("Error deleting investigation:", error);
      toast.error("Failed to delete investigation");
    }
  };

  // Helper function to get correct file URL
  const getFileUrl = (fileUrl: string | undefined) => {
    if (!fileUrl) return "";
    const filename = fileUrl.split("/").pop();
    return `${import.meta.env.VITE_API_URL}/uploads/${filename}`;
  };

  // Add this function to handle viewing history
  const handleViewHistory = () => {
    setShowHistory(true);
  };

  // Add this function to fetch history
  const fetchInvestigationHistory = async () => {
    if (!patient?.id) return;
    setIsLoadingHistory(true);
    try {
      const response = await api.get(`/lab-requests/${patient.id}/history`);
      setInvestigationHistory(response.data);
    } catch (error) {
      toast.error("Failed to fetch investigation history");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Add useEffect to fetch history when patient changes
  useEffect(() => {
    if (patient?.id) {
      fetchInvestigationHistory();
    }
  }, [patient]);

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        {showHistory ? (
          <>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-semibold">Investigation History</h2>
                <p className="text-sm text-muted-foreground">
                  View past investigations
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowHistory(false)}
                className="flex items-center gap-2"
              >
                ← Back to Investigations
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Test</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Results</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingHistory ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : investigationHistory.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center h-24 text-muted-foreground"
                    >
                      No investigation history found
                    </TableCell>
                  </TableRow>
                ) : (
                  investigationHistory.map((investigation) => (
                    <TableRow key={investigation.id}>
                      <TableCell>
                        {format(
                          new Date(investigation.createdAt),
                          "dd MMM yyyy"
                        )}
                      </TableCell>
                      <TableCell>{investigation.service.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            investigation.status === "Completed"
                              ? "success"
                              : "secondary"
                          }
                        >
                          {investigation.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {investigation.fileUrl ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              window.open(
                                getFileUrl(investigation.fileUrl),
                                "_blank"
                              )
                            }
                          >
                            View Result
                          </Button>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {investigation.requestedBy?.fullName || "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </>
        ) : (
          <>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-semibold">Add Investigation</h2>
                <p className="text-sm text-muted-foreground">
                  Request lab tests and x-rays
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleViewHistory}
                className="flex items-center gap-2"
              >
                View History →
                {investigationHistory.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {investigationHistory.length}
                  </Badge>
                )}
              </Button>
            </div>

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
                                selectedServices.some(
                                  (s) => s.id === service.id
                                )
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <div className="flex-1">
                              <p>{service.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {service.category} -{" "}
                                {formatCurrency(service.price)}
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
                        <TableRow
                          key={investigation.id}
                          className={
                            investigation.status === "Completed"
                              ? "cursor-pointer hover:bg-muted/50"
                              : ""
                          }
                          onClick={() => {
                            if (investigation.status === "Completed") {
                              setSelectedResult(investigation);
                              setShowResultDetails(true);
                            }
                          }}
                        >
                          <TableCell>
                            {format(
                              new Date(investigation.createdAt),
                              "dd/MM/yyyy"
                            )}
                          </TableCell>
                          <TableCell>{investigation.service.name}</TableCell>
                          <TableCell>
                            {investigation.service.category}
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[200px]">
                              {investigation.result ? (
                                <span
                                  className="truncate block cursor-pointer hover:text-primary"
                                  title="Click to view full result"
                                  onClick={() => {
                                    setSelectedResult(investigation);
                                    setShowResultDetails(true);
                                  }}
                                >
                                  {investigation.result.length > 50
                                    ? `${investigation.result.substring(
                                        0,
                                        50
                                      )}...`
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
                                onClick={() =>
                                  deleteInvestigation(investigation.id)
                                }
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
          </>
        )}
      </CardContent>

      <Dialog open={showResultDetails} onOpenChange={setShowResultDetails}>
        <DialogContent className="max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Investigation Details</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[80vh]">
            {selectedResult && (
              <div className="space-y-6">
                {/* Header Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">
                      Investigation
                    </label>
                    <p className="font-medium">{selectedResult.service.name}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">
                      Category
                    </label>
                    <p className="font-medium">
                      {selectedResult.service.category}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">
                      Date
                    </label>
                    <p className="font-medium">
                      {format(new Date(selectedResult.createdAt), "PPpp")}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">
                      Status
                    </label>
                    <Badge
                      variant={
                        selectedResult.status === "Completed"
                          ? "success"
                          : selectedResult.status === "In Progress"
                          ? "warning"
                          : selectedResult.status === "Cancelled"
                          ? "destructive"
                          : "default"
                      }
                    >
                      {selectedResult.status}
                    </Badge>
                  </div>
                </div>

                {/* Result Section */}
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">
                    Result
                  </label>
                  <div className="bg-muted/50 p-4 rounded-lg whitespace-pre-wrap">
                    {selectedResult.result || "No result recorded"}
                  </div>
                </div>

                {/* Attachments Section */}
                {selectedResult.fileUrl && (
                  <div className="mt-4 flex items-center gap-2">
                    <a
                      href={getFileUrl(selectedResult.fileUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      View Result Document
                    </a>
                  </div>
                )}

                {/* Performed By Section */}
                {selectedResult.performedBy && (
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">
                      Performed By
                    </label>
                    <p className="font-medium">
                      {selectedResult.performedBy.fullName}
                    </p>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={showDocumentPreview} onOpenChange={setShowDocumentPreview}>
        <DialogContent className="max-w-[90vw] h-[90vh]">
          <DialogHeader>
            <DialogTitle>Document Preview</DialogTitle>
            <DialogDescription asChild>
              {selectedResult && (
                <div className="flex items-center justify-between">
                  <span>
                    {selectedResult.service.name} -{" "}
                    {format(new Date(selectedResult.createdAt), "PPP")}
                  </span>
                  <a
                    href={
                      selectedResult?.fileUrl
                        ? getFileUrl(selectedResult.fileUrl)
                        : "#"
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm flex items-center gap-2"
                  >
                    Open in new tab
                  </a>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedResult?.fileUrl && (
            <div className="relative w-full h-full">
              <iframe
                src={
                  selectedResult?.fileUrl
                    ? getFileUrl(selectedResult.fileUrl)
                    : ""
                }
                className="w-full h-[calc(90vh-80px)]"
                title="Document Preview"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Investigation Request</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-4">
                <div>
                  Are you sure you want to request the following investigations?
                </div>

                <div className="bg-muted p-4 rounded-lg space-y-2">
                  {selectedServices.map((service) => (
                    <div
                      key={service.id}
                      className="flex justify-between text-sm"
                    >
                      <span>{service.name}</span>
                      <span className="font-medium">
                        {formatCurrency(service.price)}
                      </span>
                    </div>
                  ))}

                  <Separator className="my-2" />

                  <div className="flex justify-between font-medium">
                    <span>Total</span>
                    <span className="font-medium">
                      {formatCurrency(
                        selectedServices.reduce(
                          (sum, service) => sum + service.price,
                          0
                        )
                      )}
                    </span>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground">
                  This will create investigation requests that need to be
                  processed by the laboratory department.
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={submitInvestigationRequest}>
              Confirm Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
