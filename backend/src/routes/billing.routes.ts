import express from "express";
import { authenticate } from "../middleware/auth";
import {
  getPendingPayments,
  getPaymentHistory,
  processPayment,
  getWaitingList,
} from "../controllers/billing.controller";

const router = express.Router();

router.get("/pending/:patientId", authenticate, getPendingPayments);
router.get("/history/:patientId", authenticate, getPaymentHistory);
router.post("/:id/payment", authenticate, processPayment);
router.get("/waiting-list", authenticate, getWaitingList);

export default router;
