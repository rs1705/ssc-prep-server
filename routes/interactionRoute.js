import { Router } from "express";

const router = Router();

import {
  saveInteractions,
  getInteractions,
} from "../controllers/interactionController.js";

router.post("/saveInteractions", saveInteractions);
router.get("/getInteractions", getInteractions);

export default router;
