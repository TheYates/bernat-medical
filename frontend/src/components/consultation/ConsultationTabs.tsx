import { useState, useCallback, useEffect } from "react";
import { PrescriptionsTab } from "./PrescriptionsTab";
import {
  prescriptionsService,
  type Drug,
  type PrescriptionItem,
} from "@/services/prescriptions.service";
import { generateId } from "@/lib/prescription-utils";
import { toast } from "sonner";
import { drugsService } from "@/services/drugs.service";

interface ConsultationTabsProps {
  patient: any;
  form: any;
}

export function ConsultationTabs({ patient, form }: ConsultationTabsProps) {
  // Prescription state
  const [selectedDrugs, setSelectedDrugs] = useState<PrescriptionItem[]>([]);
  const [prescriptionHistory, setPrescriptionHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [availableDrugs, setAvailableDrugs] = useState<Drug[]>([]);
  const [isLoadingDrugs, setIsLoadingDrugs] = useState(false);

  // Load prescription history when patient changes
  useEffect(() => {
    if (patient?.id) {
      loadPrescriptionHistory();
    }
  }, [patient?.id]);

  // Load prescription history
  const loadPrescriptionHistory = useCallback(async () => {
    if (!patient?.id) return;

    setIsLoadingHistory(true);
    try {
      const history = await prescriptionsService.getHistory(patient.id);
      setPrescriptionHistory(history);
    } catch (error) {
      // console.error('Error loading prescription history:', error);
      toast.error("Failed to load prescription history");
    } finally {
      setIsLoadingHistory(false);
    }
  }, [patient?.id]);

  // Load active drugs
  useEffect(() => {
    const loadDrugs = async () => {
      setIsLoadingDrugs(true);
      try {
        const token = localStorage.getItem("token");

        const activeDrugs = await drugsService.getActive();
        setAvailableDrugs(activeDrugs);
      } catch (error) {
      } finally {
        setIsLoadingDrugs(false);
      }
    };

    loadDrugs();
  }, []);

  // Add drug to prescription
  const handleAddDrug = useCallback((drug: Drug) => {
    const prescriptionItem: PrescriptionItem = {
      id: generateId(),
      drugId: drug.id.toString(),
      drug,
      prescriptionId: "",
      dosage: "1 tablet",
      frequency: "Once daily",
      duration: "1 days",
      route: "Oral",
      quantity: 1,
      salePricePerUnit: Number(drug.salePricePerUnit),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setSelectedDrugs((prev) => [...prev, prescriptionItem]);
  }, []);

  // Remove drug from prescription
  const handleRemoveDrug = useCallback((drugId: string) => {
    setSelectedDrugs((prev) => prev.filter((drug) => drug.drugId !== drugId));
  }, []);

  // Update drug details
  const handleUpdateDrug = useCallback(
    (drugId: string, updates: Partial<PrescriptionItem>) => {
      setSelectedDrugs((prev) =>
        prev.map((drug) =>
          drug.drugId === drugId ? { ...drug, ...updates } : drug
        )
      );
    },
    []
  );

  // Save prescription
  const handleSavePrescription = useCallback(async () => {
    if (!patient?.id) return;
    try {
      await prescriptionsService.createPrescriptionOnly(patient.id, {
        items: selectedDrugs.map((drug) => ({
          drugId: drug.drugId,
          dosage: drug.dosage,
          frequency: drug.frequency,
          duration: drug.duration,
          route: drug.route,
          quantity: parseInt(drug.quantity.toString(), 10),
        })),
        instructions,
      });

      // Show success toast only here
      toast.success("Prescriptions saved successfully");

      // Reset form
      setSelectedDrugs([]);
      setInstructions("");

      // Reload history
      await loadPrescriptionHistory();
    } catch (error) {
      throw error; // Let PrescriptionsTab handle the error toast
    }
  }, [patient?.id, selectedDrugs, instructions, loadPrescriptionHistory]);

  // Delete prescription
  const handleDeletePrescription = useCallback(
    async (prescriptionId: string) => {
      try {
        await prescriptionsService.delete(prescriptionId);
        await loadPrescriptionHistory();
      } catch (error) {
        // console.error('Error deleting prescription:', error);
        throw error;
      }
    },
    [loadPrescriptionHistory]
  );

  return (
    <div className="space-y-4">
      <PrescriptionsTab
        form={form}
        patient={patient}
        drugs={availableDrugs}
        selectedDrugs={selectedDrugs}
        onAddDrug={handleAddDrug}
        onRemoveDrug={handleRemoveDrug}
        onUpdateDrug={handleUpdateDrug}
        onSavePrescriptions={handleSavePrescription}
        prescriptionHistory={prescriptionHistory}
        isLoadingHistory={isLoadingHistory}
        deletePrescription={handleDeletePrescription}
        instructions={instructions}
        onUpdateInstructions={setInstructions}
        clearSelectedDrugs={() => setSelectedDrugs([])}
        isLoadingDrugs={isLoadingDrugs}
      />
    </div>
  );
}
