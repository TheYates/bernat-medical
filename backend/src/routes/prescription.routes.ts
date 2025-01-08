import express from "express";
import { authenticate } from "../middleware/auth";
import {
  createPrescription,
  getPrescriptionHistory,
  deletePrescription,
  getPendingPrescriptions,
} from "../controllers/prescriptions.controller";

const router = express.Router();

router.get("/:patientId/history", authenticate, getPrescriptionHistory);
router.post("/:patientId", authenticate, createPrescription);
router.delete("/:id", authenticate, deletePrescription);
router.get("/:patientId/pending", authenticate, getPendingPrescriptions);

export default router;
