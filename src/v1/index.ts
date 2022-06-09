import { Router } from "express";

const router = Router({ mergeParams: true });

export default router;

import channels from "./channel";
router.use("/channels", channels);
