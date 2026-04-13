import { Router } from "express";
const router = Router();
import { getFilteredCards } from "../controllers/flashcardController.js";

router.get("/getFilteredCards", getFilteredCards);

export default router;
