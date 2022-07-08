import { Router } from "express";

const router = Router();
export default router;

router.use((req, res, next) => {
  if (req.headers["r0_key"] !== process.env.R0_KEY) {
    res.status(401).json({
      success: false,
      message: "Invalid api key.",
    });
  } else {
    next();
  }
});

import v1 from "./v1";
router.use("/v1", v1);
