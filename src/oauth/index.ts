import { Router } from "express";

const router = Router();
export default router;

import { router as twitch } from "./twitch";
import { router as discord } from "./discord";
router.use(twitch);
router.use(discord);
