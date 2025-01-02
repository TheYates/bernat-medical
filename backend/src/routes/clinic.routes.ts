import { Router } from "express";
import {
  getClinicSettings,
  updateClinicSettings,
} from "../controllers/clinic.controller";
import { authenticate, isAdmin } from "../middleware/auth";

const router = Router();

router.get("/settings", authenticate, getClinicSettings);
router.put("/settings", authenticate, isAdmin, updateClinicSettings);

export default router;
