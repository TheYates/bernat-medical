import { Router } from "express";
import {
  getUsers,
  createUser,
  updateUser,
} from "../controllers/user.controller";
import { authenticate, isAdmin } from "../middleware/auth";

const router = Router();

router.get("/", authenticate, isAdmin, getUsers);
router.post("/", authenticate, isAdmin, createUser);
router.put("/:id", updateUser);

export default router;
