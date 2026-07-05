import { Router } from "express";
const router = Router();
import { getFilteredCards, getStudyDeck } from "../controllers/flashcardController.js";
import { verifyToken } from "../middleware/auth.js";

router.get("/getFilteredCards", getFilteredCards);
router.get("/getStudyDeck", verifyToken, getStudyDeck)
export default router;
