import {Router} from "express";
import {analyzeController,validateController,aiStatusController} from "../controllers/analyze.controller.js";
const router=Router();
router.post("/analyze",analyzeController);
router.post("/validate",validateController);
router.get("/ai/status",aiStatusController);
export default router;