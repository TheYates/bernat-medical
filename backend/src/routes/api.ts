import express from "express";
import { authenticate } from "../middleware/auth";
import {
  getNotifications,
  markAsRead,
} from "../controllers/notification.controller";
import {
  getCategories,
  createCategory,
  deleteCategory,
  getForms,
  restockDrug,
  approveRestock,
  getRestockHistory,
  getLowStock,
  getExpiring,
} from "../controllers/inventory.controller";
import vitalRouter from "./vital.routes";
import labRequestRouter from "./lab-request.routes";
import drugRoutes from "./drug.routes";
import consultationRoutes from "./consultation.routes";
import authRoutes from "./auth.routes";
import userRoutes from "./user.routes";
import clinicRoutes from "./clinic.routes";
import inventoryRoutes from "./inventory.routes";
import auditRoutes from "./audit.routes";
import notificationRoutes from "./notification.routes";
import patientRoutes from "./patient.routes";
import serviceRoutes from "./service.routes";
import prescriptionRoutes from "./prescription.routes";
import labRequestRoutes from "./lab-request.routes";
import xrayRequestRoutes from "./xray-request.routes";
import pharmacyRoutes from "./pharmacy.routes";
import billingRoutes from "./billing.routes";
import salesRoutes from "./sales.routes";

const router = express.Router();

// Existing routes
router.get("/inventory/categories", authenticate, getCategories);
router.post("/inventory/categories", authenticate, createCategory);
router.delete("/inventory/categories/:id", authenticate, deleteCategory);
router.get("/inventory/forms", authenticate, getForms);
router.post("/inventory/:id/restock", authenticate, restockDrug);
router.post("/inventory/restock/:id/approve", authenticate, approveRestock);
router.get("/inventory/restock/history", authenticate, getRestockHistory);
router.get("/inventory/low-stock", authenticate, getLowStock);
router.get("/inventory/expiring", authenticate, getExpiring);

// Notification routes
router.get("/notifications", authenticate, getNotifications);
router.post("/notifications/:id/read", authenticate, markAsRead);

// Mount sub-routers
router.use("/vitals", vitalRouter);
router.use("/lab-requests", labRequestRoutes);
router.use("/drugs", drugRoutes);
router.use("/consultations", consultationRoutes);
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/clinic", clinicRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/audit", auditRoutes);
router.use("/notifications", notificationRoutes);
router.use("/patients", patientRoutes);
router.use("/services", serviceRoutes);
router.use("/prescriptions", prescriptionRoutes);
router.use("/xray-requests", xrayRequestRoutes);
router.use("/pharmacy", pharmacyRoutes);
router.use("/billing", billingRoutes);
router.use("/sales", salesRoutes);

export default router;
