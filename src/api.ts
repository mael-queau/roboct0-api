import { Router } from "express";

const router = Router();
export default router;

import v1 from "./v1";
router.use("/v1", v1);

router.use((req, res, next) => {
  if (req.headers["r0_key"] !== process.env.R0_KEY) {
    res.status(401).json({
      success: false,
      message: "Invalid r0_key header.",
    });
  } else {
    next();
  }
});
