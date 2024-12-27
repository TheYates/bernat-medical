import { z } from 'zod';

export const frequencies = [
  "Once daily",
  "Twice daily",
  "Three times daily",
  "Four times daily",
  "Every 4 hours",
  "Every 6 hours",
  "Every 8 hours",
  "Every 12 hours",
  "As needed",
];

export const routes = [
  "Oral",
  "Sublingual",
  "Topical",
  "Subcutaneous",
  "Intramuscular",
  "Intravenous",
  "Inhalation",
  "Rectal",
  "Vaginal",
];

export const timings = [
  "Before meals",
  "After meals",
  "With meals",
  "Before breakfast",
  "After breakfast",
  "Before lunch",
  "After lunch",
  "Before dinner",
  "After dinner",
  "Before bed",
  "Empty stomach",
  "Any time",
];

// Prescription validation schema
export const prescriptionSchema = z.object({
  drugs: z
    .array(
      z.object({
        drugId: z.string(),
        dosage: z.string().min(1, "Dosage is required"),
        frequency: z.string().min(1, "Frequency is required"),
        duration: z.string().min(1, "Duration is required"),
        route: z.string().min(1, "Route is required"),
      })
    )
    .min(1, "At least one medication is required"),
  instructions: z.string().optional(),
});

// Calculate quantity based on dosage, frequency and duration
export const calculateQuantity = (dosage: string | number, frequency: string, duration: string): number => {
  // Extract numeric value from dosage string (e.g., "2 tablets" -> 2)
  const dosageNum = typeof dosage === 'string' 
    ? parseFloat(dosage.split(' ')[0]) 
    : dosage;

  if (isNaN(dosageNum) || !frequency || !duration) {
    return 0;
  }

  // Map frequency strings to daily counts
  const frequencyMap: { [key: string]: number } = {
    "Once daily": 1,
    "Twice daily": 2,
    "Three times daily": 3,
    "Four times daily": 4,
    "Every 4 hours": 6,
    "Every 6 hours": 4,
    "Every 8 hours": 3,
    "Every 12 hours": 2,
    "As needed": 1,
  };

  const frequencyPerDay = frequencyMap[frequency] || 0;

  // Extract duration number and unit
  const durationMatch = duration.match(/(\d+)\s*(day|days|week|weeks|month|months)/i);
  if (!durationMatch) return 0;

  const durationNum = parseInt(durationMatch[1]);
  const durationUnit = durationMatch[2].toLowerCase();

  // Convert duration to days
  let durationInDays = durationNum;
  if (durationUnit.includes('week')) {
    durationInDays *= 7;
  } else if (durationUnit.includes('month')) {
    durationInDays *= 30;
  }

  return Math.round(dosageNum * frequencyPerDay * durationInDays);
};

// Generate unique ID
export const generateId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}; 