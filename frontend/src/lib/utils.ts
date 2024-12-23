import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, parseISO, isValid } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatPrice = (price: number | string) => {
  return `$${Number(price).toFixed(2)}`;
};

export function formatDate(date: string | Date | null | undefined, formatStr: string = 'PP'): string {
  if (!date) return '-';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '-';
    return format(dateObj, formatStr);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '-';
  }
}
