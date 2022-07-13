import { Router, Request } from "express";
import { z, ZodError } from "zod";
import { CustomResponse } from "../types/response";
import { FormattedError } from "../types/error";

import {
  getCommand,
  listCommands,
  createCommand,
  updateCommand,
  toggleCommand,
  deleteCommand,
  keywordRegex,
} from "../lib/commands";
import {
  getVariable,
  listVariables,
  setVariable,
  incrementVariable,
  variableNameRegex,
} from "../lib/variables";

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
          .optional()
          .transform((s) => (s === undefined ? undefined : parseInt(s))),
        force: z
          .string()
          .optional()
          .transform((s) => s !== undefined),
      });

      const query = queryValidator.parse(req.query);

      const results = await listCommands(channelId, query.page, query.force);

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
          message: "Internal server error",
        });
      }
    }
  })
  .post(async (req: Request, res: CustomResponse) => {
    const { channelId } = req.params;

    try {
      const bodyValidator = z.object({
        keyword: z.string(),
        content: z.string(),
        force: z.boolean().default(false),
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
      else if (e instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: "The body parameters are invalid.",
        });
      } else {
        console.error(e);
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
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
      else if (e instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: "The query parameters are invalid.",
        });
      } else {
        console.error(e);
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    }
  })
  .put(async (req: Request, res: CustomResponse) => {
    const { channelId, keyword } = req.params;

    try {
      const bodyValidator = z.object({
        content: z.string(),
        force: z.boolean().default(false),
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
      else if (e instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: "The body parameters are invalid.",
        });
      } else {
        console.error(e);
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    }
  })
  .patch(async (req: Request, res: CustomResponse) => {
    const { channelId, keyword } = req.params;

    try {
      const bodyValidator = z.object({
        enabled: z.boolean().optional(),
        force: z.boolean().default(false),
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
      else if (e instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: "The body parameters are invalid.",
        });
      } else {
        console.error(e);
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    }
  })
  .delete(async (req: Request, res: CustomResponse) => {
    const { channelId, keyword } = req.params;

    try {
      const bodyValidator = z.object({
        force: z.boolean().default(false),
      });

      const body = bodyValidator.parse(req.body);

      const result = await deleteCommand(channelId, keyword, body.force);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (e) {
      if (e instanceof FormattedError) e.send(res);
      else if (e instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: "The body parameters are invalid.",
        });
      } else {
        console.error(e);
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    }
  });

router.get(
  "/channels/:channelId/commands/:keyword/variables",
  async (req: Request, res: CustomResponse) => {
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

    const { channelId, keyword } = req.params;

    try {
      const queryValidator = z.object({
        force: z

          .string()
          .optional()
          .transform((s) => s !== undefined),
      });

      const query = queryValidator.parse(req.query);

      const result = await listVariables(channelId, keyword, query.force);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (e) {
      if (e instanceof FormattedError) e.send(res);
      else if (e instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: "The body parameters are invalid.",
        });
      } else {
        console.error(e);
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    }
  }
);

router
  .route("/channels/:channelId/commands/:keyword/variables/:name")
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
    if (!req.params.name.match(variableNameRegex)) {
      res.status(400).json({
        success: false,
        message: "Invalid variable name.",
      });
      return;
    }
    next();
  })
  .get(async (req: Request, res: CustomResponse) => {
    const { channelId, keyword, name } = req.params;

    try {
      const queryValidator = z.object({
        force: z

          .string()
          .optional()
          .transform((s) => s !== undefined),
      });

      const query = queryValidator.parse(req.query);

      const result = await getVariable(channelId, keyword, name, query.force);

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
          message: "Internal server error",
        });
      }
    }
  })
  .put(async (req: Request, res: CustomResponse) => {
    const { channelId, keyword, name } = req.params;

    try {
      const bodyValidator = z.object({
        value: z.number(),
        force: z.boolean().default(false),
      });

      const body = bodyValidator.parse(req.body);

      const result = await setVariable(
        channelId,
        keyword,
        name,
        body.value,
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
          message: "The body parameters are invalid.",
        });
      } else {
        console.error(e);
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    }
  })
  .patch(async (req: Request, res: CustomResponse) => {
    const { channelId, keyword, name } = req.params;

    try {
      const bodyValidator = z.object({
        value: z.number().optional(),
        force: z.boolean().default(false),
      });

      const body = bodyValidator.parse(req.body);

      const result = await incrementVariable(
        channelId,
        keyword,
        name,
        body.value,
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
          message: "The body parameters are invalid.",
        });
      } else {
        console.error(e);
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    }
  })
  .delete(async (req: Request, res: CustomResponse) => {
    const { channelId, keyword, name } = req.params;

    try {
      const bodyValidator = z.object({
        force: z.boolean().default(false),
      });

      const body = bodyValidator.parse(req.body);

      const result = await setVariable(channelId, keyword, name, 0, body.force);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (e) {
      if (e instanceof FormattedError) e.send(res);
      else if (e instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: "The body parameters are invalid.",
        });
      } else {
        console.error(e);
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    }
  });
