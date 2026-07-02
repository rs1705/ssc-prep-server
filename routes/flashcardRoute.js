import { Router } from "express";
const router = Router();
import { getFilteredCards } from "../controllers/flashcardController.js";
import { verifyToken } from "../middleware/auth.js";

router.get("/getFilteredCards", verifyToken, getFilteredCards);

export default router;
