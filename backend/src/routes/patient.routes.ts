import express from "express";
import {
  registerPatient,
  getPatientByClinicId,
  searchPatients,
  getLastPatientId,
} from "../controllers/patient.controller";
import { authenticate } from "../middleware/auth";

const router = express.Router();

router.get("/last-id", getLastPatientId);
router.get("/search", authenticate, searchPatients);
router.post("/register", authenticate, registerPatient);
router.get("/:clinicId", authenticate, getPatientByClinicId);

export default router;
