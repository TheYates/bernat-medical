import express from "express";
import { PharmacyController } from "../controllers/pharmacy.controller";
import { authenticate } from "../middleware/auth";

const router = express.Router();

// Add cache control middleware
const noCache = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
};

router.get(
  "/waiting-list",
  authenticate,
  noCache,
  PharmacyController.getWaitingList
);

// Fix the route paths to match the frontend requests
router.get(
  "/prescriptions/history/:patientId",
  authenticate,
  noCache,
  PharmacyController.getPrescriptionHistory
);

router.get(
  "/prescriptions/pending/:patientId",
  authenticate,
  noCache,
  PharmacyController.getPendingPrescriptions
);

router.post(
  "/prescriptions/dispense",
  authenticate,
  PharmacyController.dispensePrescriptions
);

export default router;
