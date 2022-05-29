import { Router } from "express";

const router = Router({ mergeParams: true });

export default router;

import channels from "./channels";
router.use("/channels", channels);
