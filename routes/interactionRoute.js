import { Router } from "express";

const router = Router();

import { saveInteraction } from "../controllers/interactionController.js";

router.post("/saveInteraction", saveInteraction);
// router.get("/test", (req, res) => {
//   console.log("route working");
//   res.send("interaction router working fine.");
// });

export default router;
