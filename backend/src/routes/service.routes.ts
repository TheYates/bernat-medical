import { Router } from "express";
import {
  getServices,
  createServiceRequest,
  getServiceRequestHistory,
  getWaitingList,
  updateServiceRequestStatus,
  cancelServiceRequest,
} from "../controllers/service.controller";
import { authenticate } from "../middleware/auth";

const router = Router();

// Service routes
router.get("/", authenticate, getServices); // GET /api/services
router.post("/request", authenticate, createServiceRequest); // POST /api/services/request

// Service request routes
router.get("/requests/waiting-list", authenticate, getWaitingList);
router.get(
  "/requests/history/:patientId",
  authenticate,
  getServiceRequestHistory
);
router.patch("/requests/:requestId/cancel", authenticate, cancelServiceRequest);
router.put("/requests/:id/status", authenticate, updateServiceRequestStatus);

export default router;
