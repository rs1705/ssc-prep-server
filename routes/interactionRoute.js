import { Router } from "express";
import { verifyToken } from "../middleware/auth.js";
const router = Router();

import {
  saveInteractions,
  getInteractions,
} from "../controllers/interactionController.js";

router.post("/saveInteractions", verifyToken, saveInteractions);
router.get("/getInteractions", verifyToken, getInteractions);

export default router;
