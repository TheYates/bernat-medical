import { Router } from "express";
import { PharmacyController } from "../controllers/pharmacy.controller";
import { authenticate } from "../middleware/auth";

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

export default router;
