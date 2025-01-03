import { Router } from "express";
import { PharmacyController } from "../controllers/pharmacy.controller";
import { authenticate } from "../middleware/auth";
import { getPharmacyWaitingList } from "../controllers/pharmacy.controller";

const router = Router();

router.post(
  "/prescriptions/dispense",
  authenticate,
  PharmacyController.dispensePrescriptions
);
router.get(
  "/prescriptions/waiting-list",
  authenticate,
  PharmacyController.getWaitingList
);
router.get(
  "/prescriptions/history/:patientId",
  authenticate,
  PharmacyController.getPrescriptionHistory
);
router.get("/waiting-list", authenticate, getPharmacyWaitingList);

export default router;
