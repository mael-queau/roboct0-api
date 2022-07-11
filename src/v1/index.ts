import { Router } from "express";

const router = Router();
export default router;

import channels from "./channels/channels";
import quotes from "./channels/quotes";
import commands from "./channels/commands";

router.use(channels);
router.use(quotes);
router.use(commands);
