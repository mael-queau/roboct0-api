import { Router, Request } from "express";
import { z, ZodError } from "zod";
import { CustomResponse } from "../types/response";
import { FormattedError } from "../types/error";

import {
  createCommand,
  deleteCommand,
  getCommand,
  keywordRegex,
  listCommands,
  toggleCommand,
  updateCommand,
} from "../lib/commands";

const router = Router();
export default router;

router
  .route("/channels/:channelId/commands")
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

      const results = listCommands(channelId, query.page, query.force);

      res.status(200).json({
        success: true,
        data: results,
      });
    } catch (e) {
      if (e instanceof FormattedError) e.send(res);
      if (e instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: e.message,
        });
      }
      console.log(e);
      res.status(500).json({
        success: false,
        message: "An error occurred.",
      });
    }
  })
  .post(async (req: Request, res: CustomResponse) => {
    const { channelId } = req.params;

    try {
      const bodyValidator = z.object({
        keyword: z.string(),
        content: z.string(),
        force: z
          .string()
          .optional()
          .transform((s) => s !== undefined),
      });

      const body = bodyValidator.parse(req.body);

      const result = await createCommand(
        channelId,
        body.keyword,
        body.content,
        body.force
      );

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (e) {
      if (e instanceof FormattedError) e.send(res);
      if (e instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: e.message,
        });
      }
      console.log(e);
      res.status(500).json({
        success: false,
        message: "An error occurred.",
      });
    }
  });

router
  .route("/channels/:channelId/commands/:keyword")
  .all((req: Request, res: CustomResponse, next) => {
    if (!req.params.channelId.match(/^[0-9]+$/)) {
      res.status(400).json({
        success: false,
        message: "Invalid channel ID.",
      });
      return;
    }
    if (!req.params.keyword.match(keywordRegex)) {
      res.status(400).json({
        success: false,
        message: "Invalid keyword.",
      });
      return;
    }
    next();
  })
  .get(async (req: Request, res: CustomResponse) => {
    const { channelId, keyword } = req.params;

    try {
      const queryValidator = z.object({
        force: z

          .string()
          .optional()
          .transform((s) => s !== undefined),
      });

      const query = queryValidator.parse(req.query);

      const result = await getCommand(channelId, keyword, query.force);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (e) {
      if (e instanceof FormattedError) e.send(res);

      console.error(e);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  })
  .put(async (req: Request, res: CustomResponse) => {
    const { channelId, keyword } = req.params;

    try {
      const bodyValidator = z.object({
        content: z.string(),
        force: z
          .string()
          .optional()
          .transform((s) => s !== undefined),
      });

      const body = bodyValidator.parse(req.body);

      const result = await updateCommand(
        channelId,
        keyword,
        body.content,
        body.force
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (e) {
      if (e instanceof FormattedError) e.send(res);

      console.error(e);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  })
  .patch(async (req: Request, res: CustomResponse) => {
    const { channelId, keyword } = req.params;

    try {
      const bodyValidator = z.object({
        enabled: z.boolean().optional(),
        force: z
          .string()
          .optional()
          .transform((s) => s !== undefined),
      });

      const body = bodyValidator.parse(req.body);

      const result = await toggleCommand(
        channelId,
        keyword,
        body.enabled,
        body.force
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (e) {
      if (e instanceof FormattedError) e.send(res);

      console.error(e);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  })
  .delete(async (req: Request, res: CustomResponse) => {
    const { channelId, keyword } = req.params;

    try {
      const bodyValidator = z.object({
        force: z
          .string()
          .optional()
          .transform((s) => s !== undefined),
      });

      const body = bodyValidator.parse(req.body);

      const result = await deleteCommand(channelId, keyword, body.force);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (e) {
      if (e instanceof FormattedError) e.send(res);

      console.error(e);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  });
