import express from "express";
import {
  registerPatient,
  getPatientByClinicId,
  searchPatients,
  getLastPatientId,
  searchPatientByClinicId,
  updatePatient,
  deletePatient,
  getPatients,
} from "../controllers/patient.controller";
import { authenticate } from "../middleware/auth";

const router = express.Router();

router.get("/last-id", getLastPatientId);
router.get("/search", authenticate, searchPatients);
router.get("/search-by-id", authenticate, searchPatientByClinicId);
router.post("/register", authenticate, registerPatient);
router.get("/:clinicId", authenticate, getPatientByClinicId);
router.put("/:clinicId", authenticate, updatePatient);
router.delete("/:clinicId", authenticate, deletePatient);
router.get("/", getPatients);

export default router;
