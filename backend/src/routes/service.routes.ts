import express from "express";
import {
  getServices,
  createServiceRequest,
  getServiceRequestHistory,
  cancelServiceRequest,
  getWaitingList,
  updateServiceRequestStatus,
} from "../controllers/service.controller";
import { authenticate } from "../middleware/auth";

const router = express.Router();

router.get("/requests/waiting-list", authenticate, getWaitingList);
router.get("/services", authenticate, getServices);
router.post("/requests", authenticate, createServiceRequest);
router.get(
  "/requests/history/:patientId",
  authenticate,
  getServiceRequestHistory
);
router.patch("/requests/:requestId/cancel", authenticate, cancelServiceRequest);
router.put("/requests/:id/status", authenticate, updateServiceRequestStatus);

export default router;
