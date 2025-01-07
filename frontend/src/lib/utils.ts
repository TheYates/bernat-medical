import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO, isValid } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatPrice = (price: number | string) => {
  return `$${Number(price).toFixed(2)}`;
};

export function formatDate(
  date: string | Date | null | undefined,
  formatStr: string = "PP"
): string {
  if (!date) return "-";

  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    if (!isValid(dateObj)) return "-";
    return format(dateObj, formatStr);
  } catch (error) {
    console.error("Error formatting date:", error);
    return "-";
  }
}

export function calculateAge(dateOfBirth: string): number {
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
}

export function calculateBMI(
  weight: string | number,
  height: string | number
): number {
  const w = Number(weight);
  const h = Number(height) / 100; // Convert cm to meters
  if (!w || !h) return 0;
  return Number((w / (h * h)).toFixed(1));
}

export const formatCurrency = (amount: number) => {
  return `GH₵${amount.toLocaleString()}`;
};
