import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { InfoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { api } from "@/lib/api";
import { toast } from "sonner";

const formSchema = z.object({
  clinicId: z.string(),
  firstName: z.string().min(1, "First name is required"),
  middleName: z.string().min(1, "Middle name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.string().min(1, "Gender is required"),
  contact: z
    .string()
    .min(1, "Contact number is required")
    .refine(
      (value) => /^\d{10}$/.test(value.replace(/\s/g, "")),
      "Contact number must be exactly 10 digits"
    ),
  maritalStatus: z.string().optional(),
  residence: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactNumber: z
    .string()
    .optional()
    .refine(
      (value) => !value || /^\d{10}$/.test(value.replace(/\s/g, "")),
      "Contact number must be exactly 10 digits"
    ),
  emergencyContactRelation: z.string().optional(),
});

export function RegisterPatient() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showServicePrompt, setShowServicePrompt] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clinicId: "CLN0001", // This should be generated
      firstName: "",
      middleName: "",
      lastName: "",
      dateOfBirth: "",
      gender: "",
      contact: "",
      maritalStatus: "",
      residence: "",
      emergencyContactName: "",
      emergencyContactNumber: "",
      emergencyContactRelation: "",
    },
  });

  const [settings, setSettings] = useState({
    idPrefix: "CLN",
    startingNumber: 1,
    digitLength: 6,
    lastNumber: 0,
  });

  useEffect(() => {
    const fetchNextClinicId = async () => {
      try {
        // Get both settings and last ID in one call
        const response = await api.get("/patients/last-id");
        const { settings, lastId } = response.data;

        // Generate next clinic ID
        let nextNumber = 1;
        if (lastId) {
          const numericPart = parseInt(lastId.replace(settings.prefix, ""));
          nextNumber = numericPart + 1;
        }

        const nextClinicId = `${settings.prefix}${String(nextNumber).padStart(
          settings.digitLength,
          "0"
        )}`;
        form.setValue("clinicId", nextClinicId);
      } catch (error) {
        console.error("Failed to generate next clinic ID:", error);
        toast.error("Failed to generate clinic ID");
      }
    };

    fetchNextClinicId();
  }, []);

  const handleSubmit = () => {
    setShowConfirmation(true);
  };

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      await api.post("/patients/register", data);
      toast.success("Patient registered successfully");
      setShowConfirmation(false);
      setShowServicePrompt(true);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to register patient"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleServicePromptResponse = (requestServices: boolean) => {
    setShowServicePrompt(false);
    if (requestServices) {
      // Navigate to service request page with clinicId
      navigate(
        `/dashboard/service-request?clinicId=${form.getValues("clinicId")}`
      );
    } else {
      navigate("/dashboard/patients");
    }
  };

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, "");

    // Take only the first 10 digits
    const truncated = digits.slice(0, 10);

    // Format as XXX XXX XXXX
    if (truncated.length >= 7) {
      return `${truncated.slice(0, 3)} ${truncated.slice(
        3,
        6
      )} ${truncated.slice(6)}`;
    } else if (truncated.length >= 3) {
      return `${truncated.slice(0, 3)} ${truncated.slice(3)}`;
    }
    return truncated;
  };

  return (
    <DashboardLayout>
      <div className="max-w-[960px] mx-auto">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight">
              Patient Registration
            </h1>
            <p className="text-sm text-muted-foreground">
              Register a new patient
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-3">
            <Form {...form}>
              <form className="space-y-3">
                <FormField
                  control={form.control}
                  name="clinicId"
                  render={({ field }) => (
                    <FormItem className="w-[110px]">
                      <FormLabel className="text-sm">Clinic ID</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            disabled
                            className="bg-muted h-10 text-sm"
                          />
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-2  rounded-md p-2">
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Surname*</FormLabel>
                        <FormControl>
                          <Input {...field} className="h-10 text-sm" />
                        </FormControl>
                        <FormMessage className="text-sm" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="middleName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Middle Name*</FormLabel>
                        <FormControl>
                          <Input {...field} className="h-10 text-sm" />
                        </FormControl>
                        <FormMessage className="text-sm" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">First Name*</FormLabel>
                        <FormControl>
                          <Input {...field} className="h-10 text-sm" />
                        </FormControl>
                        <FormMessage className="text-sm" />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 border rounded-md p-2">
                  <FormField
                    control={form.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">
                          Date of Birth*
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            className="h-10 text-sm"
                          />
                        </FormControl>
                        <FormMessage className="text-sm" />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-1">
                    <label className="text-sm">Age</label>
                    <Input
                      value={(() => {
                        const dob = form.watch("dateOfBirth");
                        if (!dob) return "";
                        const birthDate = new Date(dob);
                        const today = new Date();
                        let age = today.getFullYear() - birthDate.getFullYear();
                        const monthDiff =
                          today.getMonth() - birthDate.getMonth();
                        if (
                          monthDiff < 0 ||
                          (monthDiff === 0 &&
                            today.getDate() < birthDate.getDate())
                        ) {
                          age--;
                        }
                        return age || "";
                      })()}
                      disabled
                      className="bg-muted h-10 text-sm"
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Gender*</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-sm" />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 bg-secondary/5 rounded-md p-2">
                  <FormField
                    control={form.control}
                    name="contact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">
                          Contact Number*
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="h-10 text-sm"
                            value={formatPhoneNumber(field.value)}
                            onChange={(e) => {
                              const formatted = formatPhoneNumber(
                                e.target.value
                              );
                              field.onChange(formatted);
                            }}
                            placeholder="02X XXX XXXX"
                          />
                        </FormControl>
                        <FormMessage className="text-sm" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="maritalStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">
                          Marital Status
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Single">Single</SelectItem>
                            <SelectItem value="Married">Married</SelectItem>
                            <SelectItem value="Divorced">Divorced</SelectItem>
                            <SelectItem value="Widowed">Widowed</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-sm" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="residence"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Residence</FormLabel>
                        <FormControl>
                          <Input {...field} className="h-10 text-sm" />
                        </FormControl>
                        <FormMessage className="text-sm" />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-2 border rounded-md p-2">
                  <h3 className="text-sm font-medium">
                    Emergency Contact (Optional)
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    <FormField
                      control={form.control}
                      name="emergencyContactName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">
                            Contact Name
                          </FormLabel>
                          <FormControl>
                            <Input {...field} className="h-10 text-sm" />
                          </FormControl>
                          <FormMessage className="text-sm" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="emergencyContactNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">
                            Contact Number
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              className="h-10 text-sm"
                              value={
                                field.value
                                  ? formatPhoneNumber(field.value)
                                  : ""
                              }
                              onChange={(e) => {
                                const formatted = formatPhoneNumber(
                                  e.target.value
                                );
                                field.onChange(formatted);
                              }}
                              placeholder="02X XXX XXXX"
                            />
                          </FormControl>
                          <FormMessage className="text-sm" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="emergencyContactRelation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">
                            Relationship
                          </FormLabel>
                          <FormControl>
                            <Input {...field} className="h-10 text-sm" />
                          </FormControl>
                          <FormMessage className="text-sm" />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/dashboard/patients")}
                    className="h-10 text-sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    className="h-10 text-sm"
                  >
                    Preview & Submit
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="mt-2">
          <CardContent className="p-2">
            <div className="flex items-start space-x-2">
              <InfoIcon className="h-3 w-3 text-blue-500 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                Fields marked with * are mandatory
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Confirmation Dialog */}
        <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm Patient Registration</DialogTitle>
              <DialogDescription>
                Please review the patient details before submitting
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Clinic ID</label>
                  <p className="text-sm">{form.getValues("clinicId")}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Full Name</label>
                  <p className="text-sm">
                    {form.getValues("firstName")} {form.getValues("middleName")}{" "}
                    {form.getValues("lastName")}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Date of Birth</label>
                  <p className="text-sm">
                    {form.getValues("dateOfBirth")
                      ? format(
                          new Date(form.getValues("dateOfBirth")),
                          "dd/MM/yyyy"
                        )
                      : "-"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Gender</label>
                  <p className="text-sm">{form.getValues("gender")}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Marital Status</label>
                  <p className="text-sm">{form.getValues("maritalStatus")}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Contact</label>
                  <p className="text-sm">{form.getValues("contact")}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium">Residence</label>
                  <p className="text-sm">{form.getValues("residence")}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-2">Emergency Contact</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Name</label>
                    <p className="text-sm">
                      {form.getValues("emergencyContactName")}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Number</label>
                    <p className="text-sm">
                      {form.getValues("emergencyContactNumber")}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Relationship</label>
                    <p className="text-sm">
                      {form.getValues("emergencyContactRelation")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowConfirmation(false)}
              >
                Edit
              </Button>
              <Button
                onClick={form.handleSubmit(onSubmit)}
                disabled={isLoading}
              >
                {isLoading ? "Registering..." : "Confirm & Register"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Service Prompt Dialog */}
        <AlertDialog
          open={showServicePrompt}
          onOpenChange={setShowServicePrompt}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Request Services?</AlertDialogTitle>
              <AlertDialogDescription>
                Would you like to request services for this patient now?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => handleServicePromptResponse(false)}
              >
                No, Later
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleServicePromptResponse(true)}
              >
                Yes, Request Services
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
