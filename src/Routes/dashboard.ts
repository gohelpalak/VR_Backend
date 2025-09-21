import { Router } from "express";
import { getDashboard } from "../controllers/dashboard";
// import { getDashboard } from "../controllers/dashboard.controller";

const router = Router();

router.get("/", getDashboard);

export const dashboardRoutes = router;
