import { Router, Request } from "express";
import { z, ZodError } from "zod";
import { CustomResponse } from "../types/response";
import { FormattedError } from "../types/error";

import {
  getQuote,
  getRandomQuote,
  searchQuotes,
  createQuote,
  updateQuote,
  toggleQuote,
  deleteQuote,
} from "../lib/quotes";

const router = Router();
export default router;

router.get(
  "/channels/:channelId/randomQuote",
  async (req: Request, res: CustomResponse) => {
    if (!req.params.channelId.match(/^[0-9]+$/)) {
      res.status(400).json({
        success: false,
        message: "Invalid channel ID.",
      });
      return;
    }

    const { channelId } = req.params;

    try {
      const result = await getRandomQuote(channelId);

      return result;
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
  }
);

router
  .route("/channels/:channelId/quotes")
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
        search: z.string().optional(),
        page: z
          .string()
          .default("1")
          .refine(
            (s) => /^[0-9]+$/.test(s) && parseInt(s) > 0,
            "Page must be a positive integer"
          )
          .transform((s) => parseInt(s) - 1),
        force: z
          .string()
          .optional()
          .transform((s) => s !== undefined),
      });

      const query = queryValidator.parse(req.query);

      const result = await searchQuotes(
        channelId,
        query.search,
        query.page,
        query.force
      );

      res.status(200).json({
        success: true,
        data: result,
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
          message: "An unknown error occured.",
        });
      }
    }
  })
  .post(async (req: Request, res: CustomResponse) => {
    const { channelId } = req.params;

    try {
      const bodyValidator = z.object({
        force: z.boolean().default(false),
        content: z.string(),
      });

      const body = bodyValidator.parse(req.body);

      const result = await createQuote(channelId, body.content, body.force);

      res.status(201).json({
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
  });

router
  .route("/channels/:channelId/quotes/:quoteId")
  .all((req: Request, res: CustomResponse, next) => {
    if (!req.params.channelId.match(/^[0-9]+$/)) {
      res.status(400).json({
        success: false,
        message: "Invalid channel ID.",
      });
      return;
    }
    if (!req.params.quoteId.match(/^[0-9]+$/)) {
      res.status(400).json({
        success: false,
        message: "Invalid quote ID.",
      });
      return;
    }
    next();
  })
  .get(async (req: Request, res: CustomResponse) => {
    const { channelId, quoteId } = req.params;

    try {
      const result = await getQuote(channelId, parseInt(quoteId));

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
  .put(async (req: Request, res: CustomResponse) => {
    const { channelId, quoteId } = req.params;

    try {
      const bodyValidator = z.object({
        force: z.boolean().default(false),
        content: z.string().optional(),
        date: z.string().optional(),
      });

      const body = bodyValidator.parse(req.body);

      if (body.date) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
        if (!body.date.match(dateRegex)) {
          res.status(400).json({
            success: false,
            message: "The date must be in the ISO8601 format.",
          });
          return;
        }
      }

      const result = await updateQuote(
        channelId,
        parseInt(quoteId),
        body.content,
        body.date ? new Date(body.date) : undefined,
        body.force
      );

      res.status(200).json({
        success: true,
        data: result,
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
  })
  .patch(async (req: Request, res: CustomResponse) => {
    const { channelId, quoteId } = req.params;

    try {
      const bodyValidator = z.object({
        force: z.boolean().default(false),
        enabled: z.boolean().optional(),
      });

      const body = bodyValidator.parse(req.body);

      const result = await toggleQuote(
        channelId,
        parseInt(quoteId),
        body.enabled,
        body.force
      );

      res.status(200).json({
        success: true,
        data: result,
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
  })
  .delete(async (req: Request, res: CustomResponse) => {
    const { channelId, quoteId } = req.params;

    try {
      const result = await deleteQuote(channelId, parseInt(quoteId));

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
