import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { Users2, Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Patient } from "@/types/patient";
import { PatientDetails } from "@/components/shared/patient-details";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Form schema
const formSchema = z.object({
  clinicId: z.string().min(1, "Clinic ID is required"),
  systolic: z.string().min(1, "Required"),
  diastolic: z.string().min(1, "Required"),
  temperatureC: z.string().min(1, "Required"),
  temperatureF: z.string().min(1, "Required"),
  pulseRate: z.string().min(1, "Required"),
  respiratoryRate: z.string().min(1, "Required"),
  weight: z.string().optional(),
  height: z.string().optional(),
  oxygenSaturation: z.string().optional(),
  fbs: z.string().optional(),
  rbs: z.string().optional(),
  fhr: z.string().optional(),
});

interface WaitingListItem {
  id: number;
  createdAt: string;
  patient: Patient;
  service: {
    id: number;
    name: string;
  };
}

interface VitalSignsRecord {
  id: number;
  createdAt: string;
  systolic: number;
  diastolic: number;
  temperatureC: number;
  temperatureF: number;
  pulseRate: number;
  respiratoryRate: number;
  weight: number | null;
  height: number | null;
  oxygenSaturation: number | null;
  fbs: number | null;
  rbs: number | null;
  fhr: number | null;
  recordedBy: {
    id: number;
    fullName: string;
  };
}

export function VitalSigns() {
  // States
  const [patient, setPatient] = useState<Patient | null>(null);
  const [bmi, setBMI] = useState<string>("");
  const [showWaitingList, setShowWaitingList] = useState(false);
  const [waitingList, setWaitingList] = useState<WaitingListItem[]>([]);
  const [isLoadingWaitingList, setIsLoadingWaitingList] = useState(false);
  const [vitalSignsHistory, setVitalSignsHistory] = useState<
    VitalSignsRecord[]
  >([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingData, setPendingData] = useState<any>(null);

  // Form setup
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clinicId: "",
      systolic: "",
      diastolic: "",
      temperatureC: "",
      temperatureF: "",
      pulseRate: "",
      respiratoryRate: "",
      weight: "",
      height: "",
      oxygenSaturation: "",
      fbs: "",
      rbs: "",
      fhr: "",
    },
  });

  // Helper functions
  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  };

  const calculateBMI = (
    weight: string | undefined,
    height: string | undefined
  ) => {
    if (!weight || !height) return "";
    const w = parseFloat(weight);
    const h = parseFloat(height) / 100; // convert cm to m
    if (w && h) {
      const bmiValue = (w / (h * h)).toFixed(1);
      return bmiValue;
    }
    return "";
  };

  const getBMIClassification = (bmi: number) => {
    if (bmi < 18.5) return "Underweight";
    if (bmi < 25) return "Normal";
    if (bmi < 30) return "Overweight";
    return "Obese";
  };

  // Temperature conversion functions
  const celsiusToFahrenheit = (celsius: string) => {
    if (!celsius) return;
    const c = parseFloat(celsius);
    if (!isNaN(c)) {
      const f = ((c * 9) / 5 + 32).toFixed(1);
      form.setValue("temperatureF", f);
    }
  };

  const fahrenheitToCelsius = (fahrenheit: string) => {
    if (!fahrenheit) return;
    const f = parseFloat(fahrenheit);
    if (!isNaN(f)) {
      const c = (((f - 32) * 5) / 9).toFixed(1);
      form.setValue("temperatureC", c);
    }
  };

  // Event handlers
  const onClinicIdChange = async (value: string) => {
    if (!value || value.length < 7) {
      setPatient(null);
      setVitalSignsHistory([]);
      return;
    }

    try {
      // First get the patient details
      const patientResponse = await api.get(`/patients/${value}`);
      setPatient(patientResponse.data);

      // Only fetch vital signs history if we have a patient
      if (patientResponse.data.id) {
        try {
          const historyResponse = await api.get(
            `/vitals/${patientResponse.data.id}`
          );
          setVitalSignsHistory(historyResponse.data);
        } catch (historyError) {
          console.error("Error fetching vital signs history:", historyError);
          setVitalSignsHistory([]);
        }
      }
    } catch (error) {
      setPatient(null);
      setVitalSignsHistory([]);
      console.error("Error fetching patient:", error);
      if (value.length >= 7) {
        toast.error("Patient not found");
      }
    }
  };

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    if (!patient) return;

    // Store the form data and show confirmation dialog
    setPendingData({
      patientId: patient.id,
      systolic: parseInt(data.systolic),
      diastolic: parseInt(data.diastolic),
      temperatureC: parseFloat(data.temperatureC),
      temperatureF: parseFloat(data.temperatureF),
      pulseRate: parseInt(data.pulseRate),
      respiratoryRate: parseInt(data.respiratoryRate),
      weight: data.weight ? parseFloat(data.weight) : null,
      height: data.height ? parseFloat(data.height) : null,
      oxygenSaturation: data.oxygenSaturation
        ? parseInt(data.oxygenSaturation)
        : null,
      fbs: data.fbs ? parseFloat(data.fbs) : null,
      rbs: data.rbs ? parseFloat(data.rbs) : null,
      fhr: data.fhr ? parseInt(data.fhr) : null,
    });
    setShowConfirmDialog(true);
  };

  // Add this new function to handle the actual submission
  const handleConfirmedSubmit = async () => {
    if (!patient) return;

    try {
      await api.post("/vitals", pendingData);
      toast.success("Vital signs recorded successfully");
      form.reset();
      setBMI("");
      setShowConfirmDialog(false);

      // Refresh history
      const historyResponse = await api.get(`/vitals/${patient.id}`);
      setVitalSignsHistory(historyResponse.data);

      // Refresh waiting list if it's open
      if (showWaitingList) {
        const waitingResponse = await api.get("/vitals/waiting-list");
        setWaitingList(waitingResponse.data);
      }
    } catch (error) {
      console.error("Error recording vital signs:", error);
      toast.error("Failed to record vital signs");
    }
  };

  // Waiting list effect
  useEffect(() => {
    const fetchWaitingList = async () => {
      setIsLoadingWaitingList(true);
      try {
        const response = await api.get("/vitals/waiting-list");
        setWaitingList(response.data);
      } catch (error) {
        console.error("Error fetching waiting list:", error);
        toast.error("Failed to fetch waiting list");
      } finally {
        setIsLoadingWaitingList(false);
      }
    };

    if (showWaitingList) {
      fetchWaitingList();
    }
  }, [showWaitingList]);

  const vitalSignsColumns = [
    {
      header: "Date & Time",
      cell: (record: VitalSignsRecord) =>
        format(new Date(record.createdAt), "dd MMM yyyy hh:mm a"),
    },
    {
      header: "Temperature",
      cell: (record: VitalSignsRecord) =>
        `${record.temperatureC}°C / ${record.temperatureF}°F`,
    },
    {
      header: "Blood Pressure",
      cell: (record: VitalSignsRecord) =>
        `${record.systolic}/${record.diastolic} mmHg`,
    },
    {
      header: "Pulse Rate",
      cell: (record: VitalSignsRecord) => `${record.pulseRate} bpm`,
    },
    {
      header: "SpO2",
      cell: (record: VitalSignsRecord) => `${record.oxygenSaturation}%`,
    },
    {
      header: "Weight",
      cell: (record: VitalSignsRecord) => `${record.weight} kg`,
    },
    {
      header: "Height",
      cell: (record: VitalSignsRecord) => `${record.height} cm`,
    },
    {
      header: "Recorded By",
      cell: (record: VitalSignsRecord) => record.recordedBy.fullName,
    },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-[960px] mx-auto">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight">Vital Signs</h1>
            <p className="text-sm text-muted-foreground">
              Record patient vital signs
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-3">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-3"
              >
                {/* Patient Search Section */}
                <div className="flex justify-between items-end">
                  <FormField
                    control={form.control}
                    name="clinicId"
                    render={({ field }) => (
                      <FormItem className="w-[200px]">
                        <FormLabel className="text-sm">Clinic ID</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="BP24/0001"
                            className="h-10 text-sm uppercase"
                            {...field}
                            value={field.value}
                            onChange={(e) => {
                              const value = e.target.value.toUpperCase();
                              field.onChange(value);
                              if (value.length >= 7) {
                                onClinicIdChange(value);
                              }
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
                    onClick={() => setShowWaitingList(true)}
                    className="h-10"
                  >
                    <Users2 className="h-4 w-4 mr-2" />
                    Waiting List
                    {waitingList.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {waitingList.length}
                      </Badge>
                    )}
                  </Button>
                </div>

                {/* Patient Details Grid */}
                <PatientDetails patient={patient} />

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Vital Signs Details
                    </span>
                  </div>
                </div>

                <Card>
                  <CardContent className="p-6">
                    {showHistory ? (
                      <>
                        <div className="flex items-center justify-between mb-6">
                          <div>
                            <h2 className="text-lg font-semibold">
                              Vital Signs History
                            </h2>
                            <p className="text-sm text-muted-foreground">
                              Past vital signs records
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            onClick={() => setShowHistory(false)}
                          >
                            ← Back to Record
                          </Button>
                        </div>

                        <Table>
                          <TableHeader>
                            <TableRow>
                              {vitalSignsColumns.map((column, index) => (
                                <TableHead key={index}>
                                  {column.header}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {isLoadingHistory ? (
                              <TableRow>
                                <TableCell
                                  colSpan={vitalSignsColumns.length}
                                  className="text-center h-24"
                                >
                                  Loading...
                                </TableCell>
                              </TableRow>
                            ) : vitalSignsHistory.length === 0 ? (
                              <TableRow>
                                <TableCell
                                  colSpan={vitalSignsColumns.length}
                                  className="text-center h-24 text-muted-foreground"
                                >
                                  No vital signs history found
                                </TableCell>
                              </TableRow>
                            ) : (
                              vitalSignsHistory.map((record) => (
                                <TableRow key={record.id}>
                                  {vitalSignsColumns.map((column, colIndex) => (
                                    <TableCell key={colIndex}>
                                      {column.cell(record)}
                                    </TableCell>
                                  ))}
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
                            <h2 className="text-lg font-semibold">
                              Record Vital Signs
                            </h2>
                            <p className="text-sm text-muted-foreground">
                              Enter new vital signs record
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            type="button"
                            onClick={() => setShowHistory(true)}
                          >
                            View History
                            {vitalSignsHistory.length > 0 && (
                              <Badge variant="secondary" className="ml-2">
                                {vitalSignsHistory.length}
                              </Badge>
                            )}
                          </Button>
                        </div>

                        {/* Vital Signs Details Section */}
                        <div className="space-y-6">
                          {" "}
                          {/* Main container for vital signs */}
                          {/* Temperature and Blood Pressure Row */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Blood Pressure */}
                            <div className="space-y-3">
                              <label className="text-sm font-medium">
                                Blood Pressure
                              </label>
                              <div className="flex gap-4 items-start">
                                <FormField
                                  control={form.control}
                                  name="systolic"
                                  render={({ field }) => (
                                    <FormItem className="flex-1">
                                      <FormControl>
                                        <Input
                                          type="number"
                                          placeholder="Systolic"
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <span className="text-sm text-muted-foreground mt-2">
                                  /
                                </span>
                                <FormField
                                  control={form.control}
                                  name="diastolic"
                                  render={({ field }) => (
                                    <FormItem className="flex-1">
                                      <FormControl>
                                        <Input
                                          type="number"
                                          placeholder="Diastolic"
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>

                            {/* Temperature */}
                            <div className="space-y-3">
                              <label className="text-sm font-medium">
                                Temperature
                              </label>
                              <div className="flex gap-4 items-start">
                                <FormField
                                  control={form.control}
                                  name="temperatureC"
                                  render={({ field }) => (
                                    <FormItem className="flex-1">
                                      <FormControl>
                                        <Input
                                          type="number"
                                          step="0.1"
                                          placeholder="°C"
                                          {...field}
                                          onBlur={(e) => {
                                            field.onBlur();
                                            celsiusToFahrenheit(e.target.value);
                                          }}
                                          disabled={!patient}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <span className="text-sm text-muted-foreground mt-2">
                                  /
                                </span>
                                <FormField
                                  control={form.control}
                                  name="temperatureF"
                                  render={({ field }) => (
                                    <FormItem className="flex-1">
                                      <FormControl>
                                        <Input
                                          type="number"
                                          step="0.1"
                                          placeholder="°F"
                                          {...field}
                                          onBlur={(e) => {
                                            field.onBlur();
                                            fahrenheitToCelsius(e.target.value);
                                          }}
                                          disabled={!patient}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                          </div>
                          {/* Other Vital Signs Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Pulse and Respiratory Rate */}
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <FormField
                                  control={form.control}
                                  name="pulseRate"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Pulse Rate</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          placeholder="bpm"
                                          {...field}
                                          disabled={!patient}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={form.control}
                                  name="respiratoryRate"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Resp Rate</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          placeholder="bpm"
                                          {...field}
                                          disabled={!patient}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>

                            {/* Weight and Height */}
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <FormField
                                  control={form.control}
                                  name="weight"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Weight (kg)</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          placeholder="kg"
                                          step="0.1"
                                          {...field}
                                          onChange={(e) => {
                                            field.onChange(e);
                                            const bmi = calculateBMI(
                                              e.target.value || undefined,
                                              form.getValues("height")
                                            );
                                            setBMI(bmi);
                                          }}
                                          disabled={!patient}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={form.control}
                                  name="height"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Height (cm)</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          placeholder="cm"
                                          {...field}
                                          onChange={(e) => {
                                            field.onChange(e);
                                            const bmi = calculateBMI(
                                              form.getValues("weight"),
                                              e.target.value || undefined
                                            );
                                            setBMI(bmi);
                                          }}
                                          disabled={!patient}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>

                            {/* BMI */}
                            <div className="space-y-4">
                              <FormItem>
                                <FormLabel>BMI</FormLabel>
                                <div className="flex items-center gap-2">
                                  <Input
                                    value={bmi}
                                    disabled
                                    className="bg-muted rounded-lg"
                                  />
                                  {bmi && (
                                    <span
                                      className={cn(
                                        "text-sm px-2 py-1 rounded",
                                        parseFloat(bmi) < 18.5 &&
                                          "bg-blue-100 text-blue-700",
                                        parseFloat(bmi) >= 18.5 &&
                                          parseFloat(bmi) < 25 &&
                                          "bg-green-100 text-green-700",
                                        parseFloat(bmi) >= 25 &&
                                          parseFloat(bmi) < 30 &&
                                          "bg-yellow-100 text-yellow-700",
                                        parseFloat(bmi) >= 30 &&
                                          "bg-red-100 text-red-700"
                                      )}
                                    >
                                      {getBMIClassification(parseFloat(bmi))}
                                    </span>
                                  )}
                                </div>
                              </FormItem>
                            </div>
                          </div>
                          {/* Additional Measurements */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* SpO2, FBS/RBS, FHR */}
                            <FormField
                              control={form.control}
                              name="oxygenSaturation"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>SpO2</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      placeholder="%"
                                      {...field}
                                      disabled={!patient}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <FormField
                                  control={form.control}
                                  name="fbs"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>FBS</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          step="0.1"
                                          placeholder="mmol/L"
                                          className="rounded-lg"
                                          {...field}
                                          disabled={!patient}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={form.control}
                                  name="rbs"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>RBS</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          step="0.1"
                                          placeholder="mmol/L"
                                          className="rounded-lg"
                                          {...field}
                                          disabled={!patient}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>

                            {/* FHR */}
                            <FormField
                              control={form.control}
                              name="fhr"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>FHR</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      placeholder="bpm"
                                      className="rounded-lg"
                                      {...field}
                                      disabled={!patient}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          {/* Submit Button */}
                          <div className="flex justify-end mt-6">
                            <Button
                              type="submit"
                              className="rounded-lg"
                              disabled={!patient}
                            >
                              Record Vital Signs
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Waiting List Dialog */}
        <Dialog open={showWaitingList} onOpenChange={setShowWaitingList}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Waiting List</DialogTitle>
              <DialogDescription>
                Patients waiting for vital signs
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {isLoadingWaitingList ? (
                <div className="text-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  <p className="text-sm text-muted-foreground mt-2">
                    Loading waiting list...
                  </p>
                </div>
              ) : waitingList.length > 0 ? (
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Age</TableHead>
                        <TableHead>Gender</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {waitingList.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell>
                            {request.createdAt
                              ? format(new Date(request.createdAt), "hh:mm a")
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {request.patient.firstName}{" "}
                                {request.patient.middleName}{" "}
                                {request.patient.lastName}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {request.patient.clinicId}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {calculateAge(request.patient.dateOfBirth)}y
                          </TableCell>
                          <TableCell>{request.patient.gender}</TableCell>
                          <TableCell>{request.service.name}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => {
                                form.setValue(
                                  "clinicId",
                                  request.patient.clinicId
                                );
                                onClinicIdChange(request.patient.clinicId);
                                setShowWaitingList(false);
                              }}
                            >
                              Select
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users2 className="h-8 w-8 mx-auto mb-4 opacity-50" />
                  <p>No patients in waiting list</p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowWaitingList(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={showConfirmDialog}
          onOpenChange={setShowConfirmDialog}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Vital Signs Record</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to record these vital signs? Please verify
                the values before confirming.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="text-sm">
                <p>
                  <strong>Blood Pressure:</strong> {pendingData?.systolic}/
                  {pendingData?.diastolic} mmHg
                </p>
                <p>
                  <strong>Temperature:</strong> {pendingData?.temperatureC}°C
                </p>
                <p>
                  <strong>Pulse Rate:</strong> {pendingData?.pulseRate} bpm
                </p>
                <p>
                  <strong>Respiratory Rate:</strong>{" "}
                  {pendingData?.respiratoryRate} bpm
                </p>
              </div>
              <div className="text-sm">
                <p>
                  <strong>Weight:</strong> {pendingData?.weight || "-"} kg
                </p>
                <p>
                  <strong>Height:</strong> {pendingData?.height || "-"} cm
                </p>
                <p>
                  <strong>SpO2:</strong> {pendingData?.oxygenSaturation || "-"}%
                </p>
                <p>
                  <strong>FBS:</strong> {pendingData?.fbs || "-"} mmol/L
                </p>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmedSubmit}>
                Confirm Record
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
