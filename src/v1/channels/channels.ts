import { Router, Request } from "express";
import { z, ZodError } from "zod";
import { CustomResponse } from "../types/response";
import { FormattedError } from "../types/error";

import {
  getChannel,
  searchChannels,
  toggleChannel,
  deleteChannel,
} from "../lib/channels";

const router = Router();
export default router;

router.get("/channels", async (req: Request, res: CustomResponse) => {
  try {
    const queryValidator = z.object({
      search: z.string().default(""),
      page: z
        .string()
        .regex(/^\d+$/)
        .optional()
        .transform((n) => {
          if (n !== undefined) return parseInt(n);
        }),
      force: z
        .string()
        .optional()
        .transform((s) => s !== undefined),
    });

    const query = queryValidator.parse(req.query);

    const results = await searchChannels(query.search, query.page, query.force);

    res.status(200).json({
      success: true,
      data: results,
    });
  } catch (e) {
    if (e instanceof FormattedError) e.send(res);
    else if (e instanceof ZodError) {
      res.status(400).json({
        success: false,
        message: "The query parameters are invalid.",
      });
    } else {
      console.error(e);
      res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  }
});

router
  .route("/channels/:channelId")
  .all((req: Request, res: CustomResponse, next) => {
    if (!req.params.channelId.match(/^[0-9]+$/)) {
      res.status(400).json({
        success: false,
        message: "Invalid channel ID.",
      });
      return;
    }
    next();
  })
  .get(async (req: Request, res: CustomResponse) => {
    const { channelId } = req.params;

    try {
      const queryValidator = z.object({
        force: z
          .string()
          .optional()
          .transform((s) => s !== undefined),
      });

      const query = queryValidator.parse(req.query);

      const result = await getChannel(channelId, query.force);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (e) {
      if (e instanceof FormattedError) e.send(res);
      else {
        console.error(e);
        res.status(500).json({
          success: false,
          message: "Internal server error.",
        });
      }
    }
  })
  .patch(async (req: Request, res: CustomResponse) => {
    const { channelId } = req.params;

    try {
      const bodyValidator = z.object({
        enabled: z.boolean().optional(),
      });

      const parsedBody = bodyValidator.parse(req.body);

      const result = await toggleChannel(channelId, parsedBody.enabled);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (e) {
      if (e instanceof FormattedError) e.send(res);
      else if (e instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: "The request body is invalid.",
        });
      } else {
        console.error(e);
        res.status(500).json({
          success: false,
          message: "Internal server error.",
        });
      }
    }
  })
  .delete(async (req: Request, res: CustomResponse) => {
    const { channelId } = req.params;

    try {
      const result = await deleteChannel(channelId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (e) {
      if (e instanceof FormattedError) e.send(res);
      else {
        console.error(e);
        res.status(500).json({
          success: false,
          message: "Internal server error.",
        });
      }
    }
  });
