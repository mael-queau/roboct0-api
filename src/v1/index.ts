import { Router } from "express";

const router = Router();
export default router;

import channels from "./channels";
router.use("/channels", channels);
