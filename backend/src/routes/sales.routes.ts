import express from "express";
import {
  createSale,
  getSales,
  getTodaysSummary,
} from "../controllers/sales.controller";
import { authenticate } from "../middleware/auth";

const router = express.Router();

router.post("/", authenticate, createSale);
router.get("/", authenticate, getSales);
router.get("/today", authenticate, getTodaysSummary);

export default router;
