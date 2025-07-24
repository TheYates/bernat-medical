import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import type { Service, ServiceCategory } from "@/types/service";
import { toast } from "sonner";

const editServiceSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  category: z.enum([
    "laboratory",
    "consultation",
    "imaging",
    "other",
  ]) as z.ZodType<ServiceCategory>,
  price: z.number().min(0, "Price must be positive"),
  description: z.string().optional(),
});

interface EditServiceDialogProps {
  service: Service;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Category {
  id: number;
  name: string;
}

export function EditServiceDialog({
  service,
  open,
  onOpenChange,
  onSuccess,
}: EditServiceDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const form = useForm({
    resolver: zodResolver(editServiceSchema),
    defaultValues: {
      name: service.name,
      category: service.category,
      price: service.price,
      description: service.description || "",
    },
  });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get("/services/categories");
        setCategories(response.data);
      } catch (error) {
        toast.error("Failed to load categories");
      }
    };
    fetchCategories();
  }, []);

  const onSubmit = async (data: z.infer<typeof editServiceSchema>) => {
    try {
      setIsLoading(true);
      await api.put(`/services/${service.id}`, data);
      toast.success("Service updated successfully");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update service");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Edit Service</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Service Name</Label>
              <Input
                id="name"
                {...form.register("name")}
                placeholder="e.g., Complete Blood Count"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                defaultValue={service.category as string}
                onValueChange={(value: string) =>
                  form.setValue("category", value as ServiceCategory)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem
                      key={`category-${category.name}`}
                      value={category.name}
                    >
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.category && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.category.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                {...form.register("price", { valueAsNumber: true })}
              />
              {form.formState.errors.price && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.price.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              {...form.register("description")}
              placeholder="Enter service description"
            />
          </div>

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
