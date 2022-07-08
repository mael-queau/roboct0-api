import { Router } from "express";

const router = Router();
export default router;

import channels from "./channels";
import quotes from "./quotes";

router.use(channels);
router.use(quotes);
