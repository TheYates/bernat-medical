import express from "express";
import { createSale } from "../controllers/sales.controller";
import { authenticate } from "../middleware/auth";

const router = express.Router();

router.post("/", authenticate, createSale);

export default router;
