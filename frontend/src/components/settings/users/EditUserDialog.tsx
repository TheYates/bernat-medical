import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { api } from "@/lib/api";
import type { User, AccessType } from "@/types/user";
import { toast } from "sonner";

const editUserSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  role: z.enum(["admin", "user"]),
  access: z.array(
    z.enum([
      "appointments",
      "consultation",
      "register-patient",
      "service-request",
      "vital-signs",
      "settings",
      "billing",
      "reports",
      "inventory",
      "lab",
      "xray",
      "pharmacy",
    ])
  ),
});

interface EditUserDialogProps {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const accessOptions: { id: AccessType; label: string }[] = [
  { id: "register-patient", label: "Register Patient" },
  { id: "service-request", label: "Service Request" },
  { id: "vital-signs", label: "Vital Signs" },
  { id: "consultation", label: "Consultations" },
  { id: "billing", label: "Billing" },
  { id: "reports", label: "Reports" },
  { id: "inventory", label: "Inventory" },
  { id: "lab", label: "Lab" },
  { id: "xray", label: "X-ray" },
  { id: "pharmacy", label: "Pharmacy" },
];

export function EditUserDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: EditUserDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      fullName: user.fullName,
      role: user.role,
      access: user.access || [],
    },
  });

  const selectedRole = form.watch("role");
  const selectedAccess = form.watch("access");

  const onSubmit = async (data: z.infer<typeof editUserSchema>) => {
    try {
      setIsLoading(true);
      await api.put(`/users/${user.id}`, data);
      toast.success("User updated successfully");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update user");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Edit User: {user.username}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" {...form.register("fullName")} />
              {form.formState.errors.fullName && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.fullName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                defaultValue={user.role}
                onValueChange={(value) =>
                  form.setValue("role", value as "admin" | "user")
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.role && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.role.message}
                </p>
              )}
            </div>
          </div>

          {selectedRole && (
            <div className="space-y-2">
              <Label>Access</Label>
              <div className="grid grid-cols-2 gap-4">
                {accessOptions.map((option) => (
                  <div key={option.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={option.id}
                      checked={selectedAccess?.includes(option.id)}
                      onCheckedChange={(checked) => {
                        const current = selectedAccess || [];
                        const updated = checked
                          ? [...current, option.id as AccessType]
                          : current.filter((id) => id !== option.id);
                        form.setValue("access", updated);
                      }}
                    />
                    <Label htmlFor={option.id}>{option.label}</Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
