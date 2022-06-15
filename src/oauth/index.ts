import { Router } from "express";

const router = Router();
export default router;

import { router as router_twitch } from "./twitch";
router.use(router_twitch);
